'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { Box, Layers, Hand } from 'lucide-react';
import { PcbLayout, CircuitComponent } from '../types';
import { SharedComponent3D } from '../studio-3d/SharedComponent3D';
import { isVirtualSchematicSymbol } from './pcb-generator';
import { resolvePhysicalSpec } from '../circuit-engine/component-physical-registry';

export interface SolderMaskTheme {
  name: string;
  board: string;
  trackTop: string;
  trackBottom: string;
  silkscreen: string;
  metalness: number;
  roughness: number;
}

/**
 * Standard IPC / Manufacturing Solder Mask and Copper Track Themes
 * In real PCBs, traces run beneath the solder mask and match its resin tint
 */
export function getSolderMaskTheme(solderMaskColor: string): SolderMaskTheme {
  const c = (solderMaskColor || '').toLowerCase();
  if (c.includes('black') || c === '#0f172a' || c === '#141619') {
    return {
      name: 'Matte Black',
      board: '#141619',
      trackTop: '#2A2E35',
      trackBottom: '#22262C',
      silkscreen: '#E2E8F0',
      metalness: 0.35,
      roughness: 0.35,
    };
  }
  if (c.includes('blue') || c === '#1e40af' || c === '#0e3a75') {
    return {
      name: 'Royal Blue',
      board: '#0E3A75',
      trackTop: '#1D5BB0',
      trackBottom: '#17498C',
      silkscreen: '#FFFFFF',
      metalness: 0.35,
      roughness: 0.35,
    };
  }
  if (c.includes('red') || c === '#991b1b' || c === '#7a1216') {
    return {
      name: 'Signal Red',
      board: '#7A1216',
      trackTop: '#A82026',
      trackBottom: '#8A171D',
      silkscreen: '#FFFFFF',
      metalness: 0.35,
      roughness: 0.35,
    };
  }
  if (c.includes('white') || c === '#eaecef' || c === '#ffffff') {
    return {
      name: 'Gloss White',
      board: '#EAECEF',
      trackTop: '#D2D6DC',
      trackBottom: '#C5C9D0',
      silkscreen: '#1E293B',
      metalness: 0.35,
      roughness: 0.35,
    };
  }
  // Default: Official Emerald-Green FR-4 Solder Mask
  return {
    name: 'FR-4 Green',
    board: '#115E32', // Deep emerald PCB green (#115e32 / #146c3a)
    trackTop: '#1F8A4C', // authentic slightly raised lighter emerald-green copper-under-mask relief
    trackBottom: '#176B3C',
    silkscreen: '#F8FAFC',
    metalness: 0.08,
    roughness: 0.36,
  };
}

export interface Pcb3dViewerProps {
  pcb: PcbLayout;
  components?: CircuitComponent[];
  solderMaskColor?: string; // e.g. '#0B4F28' (Green), '#141619' (Black), '#0E3A75' (Blue), '#7A1216' (Red), '#EAECEF' (White)
  cameraPreset?: 'iso' | 'top' | 'bot' | 'front' | 'reset' | null;
  show3dComponents?: boolean;
  isSimulating?: boolean;
  simulationStates?: Record<
    string,
    {
      voltage?: number;
      current?: number;
      on?: boolean;
      brightness?: number;
      status?: 'NORMAL' | 'WARNING' | 'BURNED';
      burned?: boolean;
      onRed?: boolean;
      onGreen?: boolean;
      onBlue?: boolean;
      redBrightness?: number;
      greenBrightness?: number;
      blueBrightness?: number;
      rLevel?: number;
      gLevel?: number;
      bLevel?: number;
    }
  >;
}

function WebGlResourceDisposer() {
  const { gl, scene } = useThree();
  useEffect(() => {
    return () => {
      scene.traverse((obj) => {
        const mesh = obj as unknown as {
          geometry?: { dispose: () => void };
          material?:
            | {
                dispose: () => void;
                map?: { dispose: () => void };
                normalMap?: { dispose: () => void };
                roughnessMap?: { dispose: () => void };
                metalnessMap?: { dispose: () => void };
                emissiveMap?: { dispose: () => void };
                alphaMap?: { dispose: () => void };
              }
            | {
                dispose: () => void;
                map?: { dispose: () => void };
                normalMap?: { dispose: () => void };
                roughnessMap?: { dispose: () => void };
                metalnessMap?: { dispose: () => void };
                emissiveMap?: { dispose: () => void };
                alphaMap?: { dispose: () => void };
              }[];
        };
        if (mesh.geometry) {
          try {
            mesh.geometry.dispose();
          } catch {}
        }
        if (mesh.material) {
          try {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((mat) => {
              mat.map?.dispose?.();
              mat.normalMap?.dispose?.();
              mat.roughnessMap?.dispose?.();
              mat.metalnessMap?.dispose?.();
              mat.emissiveMap?.dispose?.();
              mat.alphaMap?.dispose?.();
              mat.dispose();
            });
          } catch {}
        }
      });
      try {
        gl.dispose();
      } catch {}
    };
  }, [gl, scene]);
  return null;
}

export function Pcb3dViewer({
  pcb,
  components = [],
  solderMaskColor = '#0B4F28',
  cameraPreset,
  show3dComponents = true,
  isSimulating: _isSimulating = false,
  simulationStates: _simulationStates = {},
}: Pcb3dViewerProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const thickness = pcb.boardThicknessMm || 1.6;
  const halfW = pcb.widthMm / 2;
  const halfH = pcb.heightMm / 2;

  // Populated vs Bare PCB State
  const [showComponents, setShowComponents] = useState<boolean>(show3dComponents);
  const [isPanMode, setIsPanMode] = useState<boolean>(false);
  const [hoveredItem, setHoveredItem] = useState<{
    designator: string;
    pin: string;
    name: string;
    net: string;
    x: number;
    y: number;
    layer: string;
    drill: number;
    diameter: number;
  } | null>(null);

  useEffect(() => {
    if (show3dComponents !== undefined) {
      setShowComponents(show3dComponents);
    }
  }, [show3dComponents]);

  // Solder mask theme
  const theme = useMemo(() => getSolderMaskTheme(solderMaskColor), [solderMaskColor]);

  // Keyboard shortcut listener for Pan Tool (H / Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'h' || e.key === 'H') {
        setIsPanMode((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsPanMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Camera preset handler triggered from toolbar
  useEffect(() => {
    if (!cameraPreset || !controlsRef.current) return;
    const ctrl = controlsRef.current;
    const maxDim = Math.max(pcb.widthMm, pcb.heightMm);
    const topDist = Math.max(130, maxDim * 1.55);
    const isoDist = Math.max(100, maxDim * 1.35);
    if (cameraPreset === 'iso' || cameraPreset === 'reset') {
      ctrl.object.position.set(0, isoDist * 0.8, isoDist);
      ctrl.target.set(0, 0, 0);
    } else if (cameraPreset === 'top') {
      ctrl.object.position.set(0, topDist, 0.1);
      ctrl.target.set(0, 0, 0);
    } else if (cameraPreset === 'bot') {
      ctrl.object.position.set(0, -topDist, 0.1);
      ctrl.target.set(0, 0, 0);
    } else if (cameraPreset === 'front') {
      ctrl.object.position.set(0, 0, topDist);
      ctrl.target.set(0, 0, 0);
    }
    ctrl.update();
  }, [cameraPreset, pcb.widthMm, pcb.heightMm]);

  // High-Resolution Crisp Silkscreen Texture Decal
  const silkscreenTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = Math.round((1024 * pcb.heightMm) / pcb.widthMm);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = canvas.width / pcb.widthMm;
    const silkColor = theme.silkscreen;

    // Outer border silkscreen
    ctx.strokeStyle = silkColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

    // Board branding & metadata
    ctx.fillStyle = silkColor;
    ctx.font = 'bold 16px monospace';
    ctx.fillText('EI HOUSE ENG LAB', 18, 28);
    ctx.font = '13px monospace';
    ctx.fillText(`REV 1.0 (${pcb.widthMm}x${pcb.heightMm}mm)`, 18, canvas.height - 16);

    // Component Silkscreen reference designators & IPC-7351 outlines
    pcb.components?.forEach((comp) => {
      const cx = comp.x * scale;
      const cy = comp.y * scale;

      ctx.save();
      ctx.translate(cx, cy);
      if (comp.rotation) {
        ctx.rotate(((comp.rotation || 0) * Math.PI) / 180);
      }

      ctx.strokeStyle = silkColor;
      ctx.fillStyle = silkColor;
      ctx.lineWidth = 2;
      ctx.font = 'bold 14px monospace';

      const upperType = comp.type.toUpperCase();
      const upperVal = (comp.value || '').toUpperCase();

      if (
        upperType.includes('RGB') ||
        upperType === 'ACTUATOR_RGB_LED' ||
        comp.footprint?.includes('THT-5MM-4PIN') ||
        comp.footprint?.includes('LED_D5.0mm-4')
      ) {
        // RGB LED 4-pin outline with 4 pads & Pin 1 marker
        const r = 4.0 * scale;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        // 4 in-line pin pads
        const pins = [-3.81, -1.27, 1.27, 3.81];
        const labels = ['R', 'C', 'G', 'B'];
        pins.forEach((px, i) => {
          const sx = (px / 2.54) * 2.5 * scale;
          ctx.beginPath();
          ctx.arc(sx, 0, 1.0 * scale, 0, Math.PI * 2);
          ctx.stroke();
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText(labels[i], sx - 3, -2.5 * scale);
        });
        ctx.font = 'bold 12px monospace';
        ctx.fillText(comp.designator, -12, 6 * scale);
      } else if (
        upperType.includes('SR04') ||
        upperType.includes('ULTRASONIC') ||
        comp.footprint?.includes('MODULE-HCSR04') ||
        comp.footprint?.includes('HCSR04')
      ) {
        // HC-SR04 Ultrasonic Module outline (45mm x 20mm)
        const mw = 26.0 * scale;
        const mh = 14.0 * scale;
        ctx.strokeRect(-mw / 2, -mh / 2, mw, mh);
        // Transducers T and R
        ctx.beginPath();
        ctx.arc(-7.0 * scale, 0, 4.5 * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(7.0 * scale, 0, 4.5 * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('T', -7.0 * scale - 3, 3);
        ctx.fillText('R', 7.0 * scale - 3, 3);
        ctx.font = 'bold 11px monospace';
        ctx.fillText('HC-SR04', -18, -mh / 2 - 2);
        ctx.fillText(comp.designator, -12, mh / 2 + 8 * scale);
      } else if (upperType.includes('LED')) {
        // LED circular rim with cathode flat bar & 'K' marker
        const r = 4.0 * scale;
        ctx.beginPath();
        ctx.arc(0, 0, r, -0.6 * Math.PI, 0.6 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(r * Math.cos(0.6 * Math.PI), r * Math.sin(0.6 * Math.PI));
        ctx.lineTo(r * Math.cos(-0.6 * Math.PI), r * Math.sin(-0.6 * Math.PI));
        ctx.stroke();
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('K', r - 2, 2.5 * scale);
        ctx.font = 'bold 13px monospace';
        ctx.fillText(comp.designator, -12, 6 * scale);
      } else if (upperType.includes('DIODE')) {
        // Rectifier diode body with cathode bar
        ctx.strokeRect(-4.0 * scale, -2.0 * scale, 8.0 * scale, 4.0 * scale);
        ctx.fillRect(2.0 * scale, -2.0 * scale, 1.6 * scale, 4.0 * scale);
        ctx.fillText(comp.designator, -12, -3.5 * scale);
      } else if (
        upperType.includes('ELECTROLYTIC') ||
        upperType.includes('RADIAL') ||
        (upperType.includes('CAPACITOR') && (upperVal.includes('UF') || upperVal.includes('µF') || upperVal.includes('MF')))
      ) {
        // Polarized electrolytic capacitor circle with + mark & shaded crescent
        const r = 4.2 * scale;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText('+', -r + 2, -r / 2 + 1);
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI / 3, Math.PI / 3);
        ctx.arc(r * 0.45, 0, r * 0.65, Math.PI / 2, -Math.PI / 2, true);
        ctx.fillStyle = silkColor === '#FFFFFF' ? 'rgba(255, 255, 255, 0.35)' : 'rgba(30, 41, 59, 0.35)';
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = silkColor;
        ctx.font = 'bold 13px monospace';
        ctx.fillText(comp.designator, -12, 7 * scale);
      } else if (upperType.includes('CAPACITOR')) {
        // Ceramic disc / SMD capacitor rounded pill
        const pw = 7.0 * scale;
        const ph = 3.6 * scale;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(-pw / 2, -ph / 2, pw, ph, 1.8 * scale);
        } else {
          ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);
        }
        ctx.stroke();
        ctx.fillText(comp.designator, -12, -3.5 * scale);
      } else if (upperType.includes('RESISTOR') || upperType.includes('DIODE') || upperType.includes('INDUCTOR')) {
        // Axial resistor/diode body with lead lines (10.16mm pitch)
        const bw = 10.16 * scale;
        const bh = 3.8 * scale;
        ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
        ctx.beginPath();
        ctx.moveTo(-bw / 2, 0);
        ctx.lineTo(-bw / 2 - 2.8 * scale, 0);
        ctx.moveTo(bw / 2, 0);
        ctx.lineTo(bw / 2 + 2.8 * scale, 0);
        ctx.stroke();
        ctx.fillText(comp.designator, -12, -3.5 * scale);
      } else if (
        upperType.includes('IC') ||
        upperType.includes('TIMER') ||
        comp.footprint?.includes('DIP') ||
        upperType.includes('555') ||
        upperType.includes('74HC') ||
        upperType.includes('358') ||
        upperType.includes('324')
      ) {
        // DIP IC with Pin 1 notch and Pin 1 dot
        const isDip28 = comp.footprint?.includes('DIP-28') || upperType.includes('ATMEGA');
        const isDip14Or16 = comp.footprint?.includes('DIP-14') || comp.footprint?.includes('DIP-16') || upperType.includes('74HC') || upperType.includes('324') || upperType.includes('595') || upperType.includes('4017') || upperType.includes('2003') || upperType.includes('293');
        const bLen = (isDip28 ? 35.5 : isDip14Or16 ? 19.5 : 10.0) * scale;
        const bWid = 6.8 * scale;
        ctx.strokeRect(-bLen / 2, -bWid / 2, bLen, bWid);
        // Semicircular notch on the left (-X) side
        ctx.beginPath();
        ctx.arc(-bLen / 2, 0, 1.8 * scale, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        // Pin 1 dot at top-left
        ctx.beginPath();
        ctx.arc(-bLen / 2 + 1.8 * scale, -bWid / 2 + 1.6 * scale, 1.0 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = 'bold 8px monospace';
        ctx.fillText('1', -bLen / 2 + 1.8 * scale, -bWid / 2 + 3.4 * scale);
        ctx.fillText(comp.designator, -10, 2);
      } else if (
        upperType.includes('UNO') ||
        upperType.includes('NANO') ||
        upperType.includes('MEGA') ||
        upperType.includes('ESP32') ||
        upperType.includes('PICO') ||
        comp.footprint?.includes('BOARD')
      ) {
        const spec = resolvePhysicalSpec(comp.type, comp.footprint);
        const bw = (spec.bodyDimensionsMm?.width || 68.6) * scale;
        const bh = (spec.bodyDimensionsMm?.depth || 53.4) * scale;
        ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
        // USB port indicator at top-left edge
        ctx.strokeRect(-bw / 2, -5 * scale, 9 * scale, 10 * scale);
        ctx.font = 'bold 11px monospace';
        ctx.fillText(comp.designator, -bw / 2 + 12 * scale, 3 * scale);
      } else if (
        upperType.includes('MODULE') ||
        upperType.includes('LCD1602') ||
        upperType.includes('OLED') ||
        upperType.includes('SERVO')
      ) {
        const spec = resolvePhysicalSpec(comp.type, comp.footprint);
        const bw = (spec.bodyDimensionsMm?.width || 30) * scale;
        const bh = (spec.bodyDimensionsMm?.depth || 20) * scale;
        ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
        ctx.font = 'bold 10px monospace';
        ctx.fillText(comp.designator, -bw / 2 + 4 * scale, 2 * scale);
      } else if (upperType.includes('TO220') || upperType.includes('IRLZ44N') || upperType.includes('7805')) {
        const bw = 10.4 * scale;
        const bh = 4.6 * scale;
        ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
        ctx.beginPath();
        ctx.moveTo(-bw / 2, -bh / 2 + 1.2 * scale);
        ctx.lineTo(bw / 2, -bh / 2 + 1.2 * scale);
        ctx.stroke();
        ctx.font = 'bold 9px monospace';
        ctx.fillText(comp.designator, -bw / 2, bh / 2 + 7 * scale);
      } else if (
        upperType.includes('HEADER') ||
        upperType.includes('CONNECTOR') ||
        upperType.includes('TERMINAL') ||
        upperType.includes('BATTERY')
      ) {
        const hw = 12.0 * scale;
        const hh = 7.0 * scale;
        ctx.strokeRect(-hw / 2, -hh / 2, hw, hh);
        ctx.strokeRect(-hw / 2 + 1.0 * scale, -hh / 2 + 1.0 * scale, 2.2 * scale, 2.2 * scale);
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('+', -hw / 2 + 1.2 * scale, hh / 2 - 1.2 * scale);
        ctx.fillText('-', hw / 2 - 3.5 * scale, hh / 2 - 1.2 * scale);
        ctx.font = 'bold 13px monospace';
        ctx.fillText(comp.designator, -12, -5.5 * scale);
      } else {
        const spec = resolvePhysicalSpec(comp.type, comp.footprint);
        const bw = (spec.bodyDimensionsMm?.width || 10) * scale;
        const bh = (spec.bodyDimensionsMm?.depth || 8) * scale;
        ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
        ctx.fillText(comp.designator, -bw / 2, -bh / 2 - 2 * scale);
      }
      ctx.restore();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [pcb, theme]);

  useEffect(() => {
    return () => {
      silkscreenTexture?.dispose();
    };
  }, [silkscreenTexture]);

  const materials = useMemo(() => {
    return {
      fr4Core: new THREE.MeshPhysicalMaterial({
        color: theme.board,
        roughness: 0.36,
        metalness: 0.08,
        clearcoat: 0.25,
        clearcoatRoughness: 0.3,
      }),
      solderMaskTop: new THREE.MeshPhysicalMaterial({
        color: theme.board,
        roughness: 0.36,
        metalness: 0.08,
        clearcoat: 0.25,
        clearcoatRoughness: 0.3,
      }),
      solderMaskBottom: new THREE.MeshPhysicalMaterial({
        color: theme.board,
        roughness: 0.36,
        metalness: 0.08,
        clearcoat: 0.25,
        clearcoatRoughness: 0.3,
      }),
      fr4Edge: new THREE.MeshStandardMaterial({
        color: '#9E9368', // realistic tan FR-4 fiberglass core board edge thickness
        roughness: 0.75,
        metalness: 0.05,
      }),
      copperTop: new THREE.MeshPhysicalMaterial({
        color: theme.trackTop, // #1F8A4C slightly raised lighter emerald-green copper-under-mask relief
        metalness: 0.15,
        roughness: 0.32,
        clearcoat: 0.35,
      }),
      copperBottom: new THREE.MeshPhysicalMaterial({
        color: theme.trackBottom, // #176B3C
        metalness: 0.15,
        roughness: 0.32,
        clearcoat: 0.35,
      }),
      bottomGroundPour: new THREE.MeshStandardMaterial({
        color: '#135831', // bottom copper-under-green-mask relief
        metalness: 0.2,
        roughness: 0.34,
      }),
      copperPour: new THREE.MeshStandardMaterial({
        color: '#135831',
        metalness: 0.2,
        roughness: 0.34,
      }),
      goldPad: new THREE.MeshStandardMaterial({
        color: '#D4AF37', // Official ENIG Gold (Electroless Nickel Immersion Gold)
        metalness: 0.85,
        roughness: 0.2,
      }),
      copperBarrel: new THREE.MeshStandardMaterial({
        color: '#C87D55', // Authentic Copper Barrel Plating
        metalness: 0.88,
        roughness: 0.25,
      }),
      drillHole: new THREE.MeshBasicMaterial({
        color: '#020617',
      }),
      icPlastic: new THREE.MeshStandardMaterial({
        color: '#18181B',
        roughness: 0.5,
        metalness: 0.1,
      }),
      icLead: new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        metalness: 0.95,
        roughness: 0.15,
      }),
      resistorBody: new THREE.MeshStandardMaterial({
        color: '#D4A373',
        roughness: 0.45,
      }),
      resistorBandBrown: new THREE.MeshStandardMaterial({ color: '#78350F' }),
      resistorBandBlack: new THREE.MeshStandardMaterial({ color: '#09090B' }),
      resistorBandRed: new THREE.MeshStandardMaterial({ color: '#DC2626' }),
      resistorBandGold: new THREE.MeshStandardMaterial({ color: '#F59E0B', metalness: 0.8 }),
      capRadialBlue: new THREE.MeshStandardMaterial({
        color: '#1E3A8A',
        roughness: 0.3,
      }),
      capCeramicTan: new THREE.MeshStandardMaterial({
        color: '#D97706',
        roughness: 0.6,
      }),
      capStripeWhite: new THREE.MeshStandardMaterial({
        color: '#F8FAFC',
      }),
      terminalGreen: new THREE.MeshStandardMaterial({
        color: '#15803D',
        roughness: 0.4,
      }),
      screwBrass: new THREE.MeshStandardMaterial({
        color: '#EAB308',
        metalness: 0.9,
        roughness: 0.2,
      }),
      mcuBoardBlue: new THREE.MeshStandardMaterial({
        color: '#005C8A',
        roughness: 0.4,
      }),
      usbMetal: new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        metalness: 0.95,
        roughness: 0.15,
      }),
      leadMetal: new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        metalness: 0.9,
        roughness: 0.2,
      }),
      solderFillet: new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        metalness: 0.95,
        roughness: 0.18,
      }),
      diodeGlass: new THREE.MeshPhysicalMaterial({
        color: '#1C1917',
        roughness: 0.2,
        clearcoat: 0.8,
      }),
      diodeBandSilver: new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        metalness: 0.85,
        roughness: 0.2,
      }),
      transistorPlastic: new THREE.MeshStandardMaterial({
        color: '#18181B',
        roughness: 0.45,
        metalness: 0.1,
      }),
    };
  }, [theme]);

  return (
    <div className={`relative w-full h-full bg-[#070D18] select-none overflow-hidden touch-none ${isPanMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}>
      {/* Three.js Canvas */}
      <Canvas
        id="pcb-3d-webgl-canvas"
        shadows
        gl={{
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
          preserveDrawingBuffer: true,
          logarithmicDepthBuffer: true,
          antialias: true,
        }}
        camera={{ position: [0, 80, 100], fov: 40, near: 0.1, far: 2000 }}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
      >
        <color attach="background" args={['#070E1A']} />
        <WebGlResourceDisposer />

        {/* Balanced Key, Fill, Rim & Specular Environment Lighting */}
        <ambientLight intensity={1.2} />
        <directionalLight
          position={[60, 150, 80]}
          intensity={2.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.0001}
        />
        <directionalLight position={[-80, 80, -60]} intensity={0.9} color="#94A3B8" />
        <directionalLight position={[0, -50, 50]} intensity={0.5} color="#CBD5E1" />
        <hemisphereLight args={['#F8FAFC', '#0F172A', 0.6]} />

        <Grid
          infiniteGrid
          position={[0, -20, 0]}
          cellSize={10}
          sectionSize={50}
          fadeDistance={300}
          cellColor="#1E293B"
          sectionColor="#334155"
        />

        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.05}
          minDistance={10}
          maxDistance={500}
          enableRotate={!isPanMode}
          enablePan={true}
          screenSpacePanning={true}
          mouseButtons={
            isPanMode
              ? {
                  LEFT: THREE.MOUSE.PAN,
                  MIDDLE: THREE.MOUSE.DOLLY,
                  RIGHT: THREE.MOUSE.ROTATE,
                }
              : {
                  LEFT: THREE.MOUSE.ROTATE,
                  MIDDLE: THREE.MOUSE.DOLLY,
                  RIGHT: THREE.MOUSE.PAN,
                }
          }
        />

        {/* 1. FR-4 Substrate Core Slab with Realistic Tan Fiberglass Edges and Emerald Green Faces */}
        <mesh
          position={[0, 0, 0]}
          material={[
            materials.fr4Edge,
            materials.fr4Edge,
            materials.solderMaskTop,
            materials.solderMaskBottom,
            materials.fr4Edge,
            materials.fr4Edge,
          ]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[pcb.widthMm, thickness, pcb.heightMm]} />
        </mesh>

        {/* 2. Bottom Face (B.Cu) Ground Pour & Ground Plane (Top Face stays clean emerald-green FR-4) */}
        <mesh position={[0, -thickness / 2 - 0.008, 0]} material={materials.bottomGroundPour} receiveShadow>
          <boxGeometry args={[pcb.widthMm - 3, 0.008, pcb.heightMm - 3]} />
        </mesh>

        {/* 3. Top (F.Cu) & Bottom (B.Cu) Copper Traces with Rounded Joint Caps */}
        {pcb.tracks.map((track) => {
          const x1 = track.from.x - halfW;
          const z1 = track.from.y - halfH;
          const x2 = track.to.x - halfW;
          const z2 = track.to.y - halfH;

          const dx = x2 - x1;
          const dz = z2 - z1;
          const len = Math.hypot(dx, dz);
          const angle = Math.atan2(dz, dx);
          const midX = (x1 + x2) / 2;
          const midZ = (z1 + z2) / 2;
          const isTop = track.layer === 'top_copper';
          // Top traces are slightly raised lighter emerald-green copper-under-mask relief (#1F8A4C)
          const yPos = isTop ? thickness / 2 + 0.012 : -thickness / 2 - 0.014;
          const trackWidth = track.widthMm || 0.35;
          const trackRadius = trackWidth / 2;
          const trackMat = isTop ? materials.copperTop : materials.copperBottom;

          return (
            <group key={track.id}>
              {/* Main trace segment */}
              <mesh
                position={[midX, yPos, midZ]}
                rotation={[0, -angle, 0]}
                material={trackMat}
              >
                <boxGeometry args={[len, 0.016, trackWidth]} />
              </mesh>
              {/* Rounded vertex joint cylinders at endpoints to eliminate 45°/90° gaps */}
              <mesh position={[x1, yPos, z1]} material={trackMat}>
                <cylinderGeometry args={[trackRadius, trackRadius, 0.016, 12]} />
              </mesh>
              <mesh position={[x2, yPos, z2]} material={trackMat}>
                <cylinderGeometry args={[trackRadius, trackRadius, 0.016, 12]} />
              </mesh>
            </group>
          );
        })}

        {/* 4. Crisp White Silkscreen Layer (F.SilkS) strictly ABOVE top copper tracks & solder mask */}
        {silkscreenTexture && (
          <mesh position={[0, thickness / 2 + 0.030, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}>
            <planeGeometry args={[pcb.widthMm, pcb.heightMm]} />
            <meshBasicMaterial map={silkscreenTexture} transparent opacity={0.98} depthWrite={false} polygonOffset polygonOffsetFactor={-1} />
          </mesh>
        )}

        {/* 5. Exposed Metallic Pads, Thermal Relief Spokes & Plated Through Holes / Vias */}
        {pcb.pads.map((pad) => {
          const px = pad.x - halfW;
          const pz = pad.y - halfH;
          const r = pad.diameterMm / 2;
          const isRect = pad.shape === 'rect';
          const isVia = pad.componentId === 'VIA' || pad.id.startsWith('via_');
          const isGnd = pad.netId === 'GND' || pad.pinId.toLowerCase().includes('gnd');
          const matchingComp = pcb.components?.find((c) => c.componentId === pad.componentId);

          return (
            <group
              key={pad.id}
              position={[px, 0, pz]}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredItem({
                  designator: isVia ? 'Through-Hole Via' : (matchingComp?.designator || pad.componentId),
                  pin: isVia ? 'N/A' : pad.pinId,
                  name: isVia ? 'Layer Transition' : pad.pinId,
                  net: pad.netId || 'Connected Net',
                  x: pad.x,
                  y: pad.y,
                  layer: isVia
                    ? 'Through-Hole (All Layers)'
                    : pad.layer === 'all'
                    ? 'Through-Hole (Multi-Layer)'
                    : pad.layer === 'top'
                    ? 'F.Cu (Top)'
                    : 'B.Cu (Bottom)',
                  drill: pad.holeMm,
                  diameter: pad.diameterMm,
                });
              }}
              onPointerOut={() => setHoveredItem(null)}
            >
              {/* Bottom Thermal Relief 4-Spoke Cross for GND Pads connecting to B.Cu Ground Pour */}
              {isGnd && (
                <group position={[0, -thickness / 2 - 0.016, 0]}>
                  {/* Horizontal spoke */}
                  <mesh material={materials.copperBottom}>
                    <boxGeometry args={[pad.diameterMm + 1.8, 0.016, 0.45]} />
                  </mesh>
                  {/* Vertical spoke */}
                  <mesh material={materials.copperBottom}>
                    <boxGeometry args={[0.45, 0.016, pad.diameterMm + 1.8]} />
                  </mesh>
                </group>
              )}

              {/* Top Pad / Annular Ring */}
              <mesh position={[0, thickness / 2 + 0.035, 0]} material={materials.goldPad} renderOrder={10}>
                {isRect ? (
                  <boxGeometry args={[pad.diameterMm, 0.028, pad.diameterMm]} />
                ) : (
                  <cylinderGeometry args={[r, r, 0.028, 20]} />
                )}
              </mesh>
              {/* Silver Solder Fillet Ring around through-hole pin (omitted on bare vias) */}
              {!isVia && (
                <mesh position={[0, thickness / 2 + 0.045, 0]} material={materials.solderFillet} renderOrder={11}>
                  <torusGeometry args={[r * 0.65, 0.12, 8, 20]} />
                </mesh>
              )}
              {/* Bottom Pad / Annular Ring */}
              <mesh position={[0, -thickness / 2 - 0.025, 0]} material={materials.goldPad} renderOrder={10}>
                {isRect ? (
                  <boxGeometry args={[pad.diameterMm, 0.028, pad.diameterMm]} />
                ) : (
                  <cylinderGeometry args={[r, r, 0.028, 20]} />
                )}
              </mesh>
              {/* Plated Through Hole Copper Inner Barrel */}
              <mesh position={[0, 0, 0]} material={materials.copperBarrel}>
                <cylinderGeometry args={[pad.holeMm / 2 + 0.04, pad.holeMm / 2 + 0.04, thickness + 0.04, 16]} />
              </mesh>
              {/* Hollow Drill Hole Center */}
              <mesh position={[0, 0, 0]} material={materials.drillHole}>
                <cylinderGeometry args={[pad.holeMm / 2, pad.holeMm / 2, thickness + 0.1, 16]} />
              </mesh>
            </group>
          );
        })}

        {/* 5.1 Plated M3 Corner Mounting Holes (ENIG Gold Ring, Plated Barrel, Bore) */}
        {(pcb.mountingHoles || [
          { x: 4.0, y: 4.0, diameterMm: 3.2 },
          { x: pcb.widthMm - 4.0, y: 4.0, diameterMm: 3.2 },
          { x: 4.0, y: pcb.heightMm - 4.0, diameterMm: 3.2 },
          { x: pcb.widthMm - 4.0, y: pcb.heightMm - 4.0, diameterMm: 3.2 },
        ]).map((hole, hIdx) => {
          const hx = hole.x - halfW;
          const hz = hole.y - halfH;
          const holeR = (hole.diameterMm || 3.2) / 2;
          const padR = holeR + 1.4; // 6.0mm annular ring
          return (
            <group key={`m3_mount_${hIdx}`} position={[hx, 0, hz]}>
              {/* Top Gold Annular Ring */}
              <mesh position={[0, thickness / 2 + 0.035, 0]} material={materials.goldPad} renderOrder={10}>
                <cylinderGeometry args={[padR, padR, 0.028, 24]} />
              </mesh>
              {/* Bottom Gold Annular Ring */}
              <mesh position={[0, -thickness / 2 - 0.025, 0]} material={materials.goldPad} renderOrder={10}>
                <cylinderGeometry args={[padR, padR, 0.028, 24]} />
              </mesh>
              {/* Plated Through Hole Copper Inner Barrel */}
              <mesh position={[0, 0, 0]} material={materials.copperBarrel}>
                <cylinderGeometry args={[holeR + 0.05, holeR + 0.05, thickness + 0.04, 20]} />
              </mesh>
              {/* Hollow Drill Hole Bore */}
              <mesh position={[0, 0, 0]} material={materials.drillHole}>
                <cylinderGeometry args={[holeR, holeR, thickness + 0.1, 20]} />
              </mesh>
            </group>
          );
        })}

        {/* Authentic 3D CAD Component Models Shared from Studio-3D (Virtual power/GND symbols filtered out) */}
        {showComponents && pcb.components?.filter((c) => !isVirtualSchematicSymbol(c.type)).map((pComp) => {
          const cx = pComp.x - halfW;
          const cz = pComp.y - halfH;
          const rotY = ((pComp.rotation || 0) * Math.PI) / 180;
          const isBottom =
            (pComp as { layer?: string; side?: string }).layer === 'bottom' ||
            (pComp as { layer?: string; side?: string }).side === 'bottom' ||
            pComp.parameters?.layer === 'bottom' ||
            pComp.parameters?.side === 'bottom';
          const compY = isBottom ? -thickness / 2 : thickness / 2;
          const compRot: [number, number, number] = isBottom ? [Math.PI, -rotY, 0] : [0, -rotY, 0];

          // Lookup matching circuit component for telemetry and values if available
          const circuitComp = components?.find((c) => c.id === pComp.componentId);

          return (
            <SharedComponent3D
              key={pComp.componentId}
              componentId={pComp.componentId}
              type={circuitComp?.type || pComp.type}
              footprint={pComp.footprint}
              position={[cx, compY, cz]}
              rotation={compRot}
              value={circuitComp?.value || pComp.value}
              label={circuitComp?.label || pComp.label || pComp.designator}
              parameters={{
                ...circuitComp?.parameters,
                ...pComp.parameters,
                rLevel: 0,
                gLevel: 0,
                bLevel: 0,
                r: 0,
                g: 0,
                b: 0,
              }}
              renderContext="3d-view"
              isSelected={false}
              isSimulating={true}
              simState={{
                on: false,
                brightness: 0,
                current: 0,
                voltage: 0,
                onRed: false,
                onGreen: false,
                onBlue: false,
                redBrightness: 0,
                greenBrightness: 0,
                blueBrightness: 0,
                rLevel: 0,
                gLevel: 0,
                bLevel: 0,
                status: 'NORMAL',
                burned: false,
              }}
            />
          );
        })}
      </Canvas>

      {/* 3D Interactive Hover HUD Tooltip for Pads / Vias */}
      {hoveredItem && (
        <div className="pointer-events-none absolute top-4 right-4 z-30 bg-[#0B1528]/95 backdrop-blur-md border border-cyan-500/70 rounded-xl p-3 shadow-2xl font-mono text-xs min-w-[220px] animate-in fade-in duration-100">
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-700/80">
            <span className="font-bold text-cyan-400 text-[13px]">{hoveredItem.designator}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-600/70 text-amber-300 font-bold">
              {hoveredItem.layer}
            </span>
          </div>
          <div className="space-y-1 text-[11px] text-slate-300">
            {hoveredItem.pin && hoveredItem.pin !== 'N/A' && (
              <div className="flex justify-between text-slate-400">
                <span>Pin:</span>
                <span className="text-white font-semibold">Pin {hoveredItem.pin}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-400">
              <span>Net:</span>
              <span className="text-emerald-400 font-bold">{hoveredItem.net}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Position:</span>
              <span className="text-slate-200">{hoveredItem.x.toFixed(2)}, {hoveredItem.y.toFixed(2)} mm</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Pad / Drill:</span>
              <span className="text-cyan-300">Ø {hoveredItem.diameter} mm / Ø {hoveredItem.drill} mm</span>
            </div>
          </div>
        </div>
      )}

      {/* Populated vs Bare Board Floating Mode Switcher */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 bg-[#0B1528]/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-1 shadow-2xl font-mono text-[11px] pointer-events-auto">
        <button
          type="button"
          onClick={() => setShowComponents(true)}
          className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-all cursor-pointer ${
            showComponents
              ? 'bg-emerald-600 text-white font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Display board with all 3D components placed"
        >
          <Box className="w-3.5 h-3.5" />
          <span>Populated (With 3D Parts)</span>
        </button>
        <button
          type="button"
          onClick={() => setShowComponents(false)}
          className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-all cursor-pointer ${
            !showComponents
              ? 'bg-cyan-600 text-white font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Display bare manufactured PCB (tracks, pads and silkscreen only)"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Bare PCB (Tracks &amp; Pads Only)</span>
        </button>

        <div className="h-4 w-px bg-slate-700 mx-0.5" />

        {/* Pan Tool Toggle Button */}
        <button
          type="button"
          onClick={() => setIsPanMode((prev) => !prev)}
          className={`w-7 h-7 flex items-center justify-center rounded transition-all cursor-pointer ${
            isPanMode
              ? 'bg-amber-600 text-white font-bold shadow'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title={isPanMode ? "Pan Tool Active (H) — Left-drag to pan 3D PCB" : "Pan Tool (H) — Left-drag to pan 3D PCB"}
        >
          <Hand className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
