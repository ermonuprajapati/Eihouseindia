'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { Box, Layers } from 'lucide-react';
import { PcbLayout } from '../types';

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
  // Default: Official FR-4 Green
  return {
    name: 'FR-4 Green',
    board: '#0B4F28',
    trackTop: '#1A7A42',
    trackBottom: '#146335',
    silkscreen: '#FFFFFF',
    metalness: 0.35,
    roughness: 0.35,
  };
}

export interface Pcb3dViewerProps {
  pcb: PcbLayout;
  solderMaskColor?: string; // e.g. '#0B4F28' (Green), '#141619' (Black), '#0E3A75' (Blue), '#7A1216' (Red), '#EAECEF' (White)
  cameraPreset?: 'iso' | 'top' | 'bot' | 'front' | 'reset' | null;
  show3dComponents?: boolean;
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

const icTextureCache = new Map<string, THREE.CanvasTexture>();

function getIcLaserTexture(partName: string, isDip14Or16: boolean): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const key = `${partName}_${isDip14Or16 ? 'long' : 'std'}`;
  if (icTextureCache.has(key)) return icTextureCache.get(key)!;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = isDip14Or16 ? 512 : 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Matte black epoxy package background
    ctx.fillStyle = '#18181B';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle laser micro-texture noise
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < 350; i++) {
      const rx = Math.random() * canvas.width;
      const ry = Math.random() * canvas.height;
      ctx.fillRect(rx, ry, 1.5, 1.5);
    }

    // Pin 1 Index Dimple on top-left
    ctx.beginPath();
    ctx.arc(28, 30, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#0F0F12';
    ctx.fill();
    ctx.strokeStyle = '#27272A';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pin 1 laser dot
    ctx.beginPath();
    ctx.arc(28, 30, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#A1A1AA';
    ctx.fill();

    // Laser-etched Part Number
    ctx.fillStyle = '#E4E4E7';
    ctx.font = 'bold 36px "Courier New", Courier, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(partName.toUpperCase(), canvas.width / 2 + 10, 48);

    // Laser-etched Manufacturer, Date Code & RoHS Badge
    ctx.fillStyle = '#A1A1AA';
    ctx.font = 'bold 18px "Courier New", Courier, monospace';
    ctx.fillText('TI 2418   e4   [Pb-Free]', canvas.width / 2 + 10, 88);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    icTextureCache.set(key, texture);
    return texture;
  } catch {
    return null;
  }
}

export function Pcb3dViewer({
  pcb,
  solderMaskColor = '#0B4F28',
  cameraPreset,
  show3dComponents = true,
}: Pcb3dViewerProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const thickness = pcb.boardThicknessMm || 1.6;
  const halfW = pcb.widthMm / 2;
  const halfH = pcb.heightMm / 2;

  // Populated vs Bare PCB State
  const [showComponents, setShowComponents] = useState<boolean>(show3dComponents);
  const ledMaterialsRef = useRef<Map<string, THREE.MeshPhysicalMaterial>>(new Map());

  useEffect(() => {
    const map = ledMaterialsRef.current;
    return () => {
      map.forEach((mat) => {
        try {
          mat.dispose();
        } catch {}
      });
      map.clear();
    };
  }, []);

  const getLedMaterial = (color: string) => {
    let mat = ledMaterialsRef.current.get(color);
    if (!mat) {
      mat = new THREE.MeshPhysicalMaterial({
        color,
        transmission: 0.55,
        opacity: 0.88,
        transparent: true,
        roughness: 0.15,
        emissive: color,
        emissiveIntensity: 0.25,
      });
      ledMaterialsRef.current.set(color, mat);
    }
    return mat;
  };
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

  // Camera preset handler triggered from toolbar
  useEffect(() => {
    if (!cameraPreset || !controlsRef.current) return;
    const ctrl = controlsRef.current;
    if (cameraPreset === 'iso' || cameraPreset === 'reset') {
      ctrl.object.position.set(0, 80, 100);
      ctrl.target.set(0, 0, 0);
    } else if (cameraPreset === 'top') {
      ctrl.object.position.set(0, 130, 0.1);
      ctrl.target.set(0, 0, 0);
    } else if (cameraPreset === 'bot') {
      ctrl.object.position.set(0, -130, 0.1);
      ctrl.target.set(0, 0, 0);
    } else if (cameraPreset === 'front') {
      ctrl.object.position.set(0, 0, 120);
      ctrl.target.set(0, 0, 0);
    }
    ctrl.update();
  }, [cameraPreset]);

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
      } else if (upperType.includes('RESISTOR') || upperType.includes('POTENTIOMETER') || upperType.includes('LDR')) {
        // Axial resistor body with lead lines
        const bw = 9.0 * scale;
        const bh = 3.8 * scale;
        ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
        ctx.beginPath();
        ctx.moveTo(-bw / 2, 0);
        ctx.lineTo(-bw / 2 - 2.8 * scale, 0);
        ctx.moveTo(bw / 2, 0);
        ctx.lineTo(bw / 2 + 2.8 * scale, 0);
        ctx.stroke();
        ctx.fillText(comp.designator, -12, -3.5 * scale);
      } else if (upperType.includes('IC') || upperType.includes('TIMER') || comp.footprint?.includes('DIP') || upperType.includes('555')) {
        // DIP IC with Pin 1 notch and Pin 1 dot
        const isDip14Or16 = comp.footprint?.includes('DIP-14') || comp.footprint?.includes('DIP-16');
        const bLen = (isDip14Or16 ? 19.5 : 10.0) * scale;
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
        ctx.fillText(comp.designator, -10, 2);
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
        ctx.strokeRect(-5 * scale, -5 * scale, 10 * scale, 10 * scale);
        ctx.fillText(comp.designator, -12, -7 * scale);
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
        roughness: 0.28,
        metalness: 0.08,
        clearcoat: 0.35,
        clearcoatRoughness: 0.25,
      }),
      copperTop: new THREE.MeshPhysicalMaterial({
        color: theme.trackTop,
        metalness: theme.metalness,
        roughness: theme.roughness,
        clearcoat: 0.3,
      }),
      copperBottom: new THREE.MeshPhysicalMaterial({
        color: theme.trackBottom,
        metalness: theme.metalness,
        roughness: theme.roughness,
        clearcoat: 0.3,
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
    <div className="relative w-full h-full bg-[#070D18] select-none overflow-hidden touch-none">
      {/* Three.js Canvas */}
      <Canvas
        id="pcb-3d-webgl-canvas"
        shadows
        gl={{ preserveDrawingBuffer: true }}
        camera={{ position: [0, 80, 100], fov: 40, near: 0.1, far: 2000 }}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
      >
        <color attach="background" args={['#070E1A']} />
        <WebGlResourceDisposer />

        <ambientLight intensity={1.3} />
        <directionalLight position={[60, 120, 80]} intensity={2.2} castShadow />
        <directionalLight position={[-60, -80, -60]} intensity={1.0} color="#93C5FD" />

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
        />

        {/* FR-4 Substrate Slab */}
        <mesh position={[0, 0, 0]} material={materials.fr4Core} castShadow receiveShadow>
          <boxGeometry args={[pcb.widthMm, thickness, pcb.heightMm]} />
        </mesh>

        {/* Crisp Visible Silkscreen Layer Overlay Decal */}
        {silkscreenTexture && (
          <mesh position={[0, thickness / 2 + 0.022, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[pcb.widthMm, pcb.heightMm]} />
            <meshBasicMaterial map={silkscreenTexture} transparent opacity={0.95} depthWrite={false} />
          </mesh>
        )}

        {/* Copper Pads & Plated Through Holes / Vias */}
        {pcb.pads.map((pad) => {
          const px = pad.x - halfW;
          const pz = pad.y - halfH;
          const r = pad.diameterMm / 2;
          const isRect = pad.shape === 'rect';
          const isVia = pad.componentId === 'VIA' || pad.id.startsWith('via_');
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
              {/* Top Pad / Annular Ring */}
              <mesh position={[0, thickness / 2 + 0.02, 0]} material={materials.goldPad}>
                {isRect ? (
                  <boxGeometry args={[pad.diameterMm, 0.04, pad.diameterMm]} />
                ) : (
                  <cylinderGeometry args={[r, r, 0.04, 20]} />
                )}
              </mesh>
              {/* Bottom Pad / Annular Ring */}
              <mesh position={[0, -thickness / 2 - 0.02, 0]} material={materials.goldPad}>
                {isRect ? (
                  <boxGeometry args={[pad.diameterMm, 0.04, pad.diameterMm]} />
                ) : (
                  <cylinderGeometry args={[r, r, 0.04, 20]} />
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

        {/* Top & Bottom Copper Traces with Rounded Joint Caps */}
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
          const yPos = isTop ? thickness / 2 + 0.015 : -thickness / 2 - 0.015;
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
                <boxGeometry args={[len, 0.025, trackWidth]} />
              </mesh>
              {/* Rounded vertex joint cylinders at endpoints to eliminate 45°/90° gaps */}
              <mesh position={[x1, yPos, z1]} material={trackMat}>
                <cylinderGeometry args={[trackRadius, trackRadius, 0.025, 12]} />
              </mesh>
              <mesh position={[x2, yPos, z2]} material={trackMat}>
                <cylinderGeometry args={[trackRadius, trackRadius, 0.025, 12]} />
              </mesh>
            </group>
          );
        })}

        {/* Authentic 3D Component Models with Solder Fillets & Laser-Etched IC Packages */}
        {showComponents && pcb.components?.map((pComp) => {
          const cx = pComp.x - halfW;
          const cz = pComp.y - halfH;
          const rotY = ((pComp.rotation || 0) * Math.PI) / 180;
          const upperType = pComp.type.toUpperCase();
          const upperFootprint = (pComp.footprint || '').toUpperCase();
          const isBottom =
            (pComp as { layer?: string; side?: string }).layer === 'bottom' ||
            (pComp as { layer?: string; side?: string }).side === 'bottom' ||
            pComp.parameters?.layer === 'bottom' ||
            pComp.parameters?.side === 'bottom';
          const compY = isBottom ? -thickness / 2 : thickness / 2;
          const compRot: [number, number, number] = isBottom ? [Math.PI, -rotY, 0] : [0, -rotY, 0];

          // 0. RGB LED (5mm 4-Pin Clear/Diffused Epoxy Dome with R, COM, G, B Leads, Solder Fillets & Multi-Channel Emission)
          if (
            upperType.includes('RGB') ||
            upperType === 'ACTUATOR_RGB_LED' ||
            upperFootprint.includes('THT-5MM-4PIN') ||
            upperFootprint.includes('LED_D5.0MM-4') ||
            (pComp as unknown as { model3d?: string }).model3d === 'led_rgb_5mm' ||
            pComp.parameters?.model3d === 'led_rgb_5mm'
          ) {
            const rL = (pComp.parameters?.rLevel as number) ?? (pComp.parameters?.r as number) ?? 0.85;
            const gL = (pComp.parameters?.gLevel as number) ?? (pComp.parameters?.g as number) ?? 0.25;
            const bL = (pComp.parameters?.bLevel as number) ?? (pComp.parameters?.b as number) ?? 0.95;
            const rgbColor = new THREE.Color(rL, gL, bL);
            const rgbMaterial = new THREE.MeshPhysicalMaterial({
              color: rgbColor,
              emissive: rgbColor,
              emissiveIntensity: 0.9,
              transparent: true,
              opacity: 0.88,
              roughness: 0.15,
            });

            return (
              <group key={pComp.componentId} position={[cx, compY, cz]} rotation={compRot}>
                {/* 4 Straight Leads at 2.54mm pitch (x = -3.81, -1.27, 1.27, 3.81) */}
                {[-3.81, -1.27, 1.27, 3.81].map((lx, idx) => {
                  const isCommon = idx === 1;
                  const len = isCommon ? 3.4 : 2.8;
                  return (
                    <group key={idx}>
                      <mesh position={[lx, 1.2, 0]} material={materials.leadMetal}>
                        <cylinderGeometry args={[0.25, 0.25, len, 8]} />
                      </mesh>
                      <mesh position={[lx, 0.15, 0]} material={materials.solderFillet}>
                        <cylinderGeometry args={[0.5, 0.75, 0.3, 12]} />
                      </mesh>
                    </group>
                  );
                })}
                {/* Base collar flange */}
                <mesh position={[0, 2.8, 0]} material={rgbMaterial}>
                  <cylinderGeometry args={[2.9, 2.9, 0.7, 24]} />
                </mesh>
                {/* Main cylinder body */}
                <mesh position={[0, 5.0, 0]} material={rgbMaterial}>
                  <cylinderGeometry args={[2.5, 2.5, 3.8, 24]} />
                </mesh>
                {/* Hemisphere dome top */}
                <mesh position={[0, 6.9, 0]} material={rgbMaterial}>
                  <sphereGeometry args={[2.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                </mesh>
                <pointLight position={[0, 6.0, 0]} color={rgbColor} intensity={1.5} distance={25} />
              </group>
            );
          }

          // 0b. HC-SR04 Ultrasonic Sonar Module (Blue FR4 PCB, 2 Ultrasonic Canisters, Crystal, Header Pins)
          if (
            upperType.includes('SR04') ||
            upperType.includes('ULTRASONIC') ||
            upperFootprint.includes('MODULE-HCSR04') ||
            upperFootprint.includes('HCSR04') ||
            (pComp as unknown as { model3d?: string }).model3d === 'hcsr04_ultrasonic' ||
            (pComp as unknown as { model3d?: string }).model3d === 'sensor_ultrasonic_hc_sr04' ||
            pComp.parameters?.model3d === 'hcsr04_ultrasonic'
          ) {
            return (
              <group key={pComp.componentId} position={[cx, compY, cz]} rotation={compRot}>
                {/* Blue FR4 Sensor PCB (45mm x 20mm x 1.6mm) elevated on header pins */}
                <mesh position={[0, 8.0, 0]} material={materials.mcuBoardBlue}>
                  <boxGeometry args={[45.0, 1.6, 20.0]} />
                </mesh>
                {/* 4 Header pins with solder fillets entering PCB pads */}
                {[-3.81, -1.27, 1.27, 3.81].map((lx, idx) => (
                  <group key={idx}>
                    <mesh position={[lx, 3.5, 8.5]} material={materials.leadMetal}>
                      <cylinderGeometry args={[0.32, 0.32, 7.0, 8]} />
                    </mesh>
                    <mesh position={[lx, 0.15, 8.5]} material={materials.solderFillet}>
                      <cylinderGeometry args={[0.55, 0.85, 0.3, 12]} />
                    </mesh>
                  </group>
                ))}
                {/* Left Transmitter Canister (T) */}
                <mesh position={[-12.0, 15.0, 0]} rotation={[0, 0, 0]} material={materials.usbMetal}>
                  <cylinderGeometry args={[8.0, 8.0, 12.0, 24]} />
                </mesh>
                <mesh position={[-12.0, 21.02, 0]} material={materials.icPlastic}>
                  <cylinderGeometry args={[6.8, 6.8, 0.1, 24]} />
                </mesh>
                {/* Right Receiver Canister (R) */}
                <mesh position={[12.0, 15.0, 0]} rotation={[0, 0, 0]} material={materials.usbMetal}>
                  <cylinderGeometry args={[8.0, 8.0, 12.0, 24]} />
                </mesh>
                <mesh position={[12.0, 21.02, 0]} material={materials.icPlastic}>
                  <cylinderGeometry args={[6.8, 6.8, 0.1, 24]} />
                </mesh>
                {/* Quartz Crystal Canister (HC-49S) */}
                <mesh position={[0, 9.5, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.usbMetal}>
                  <boxGeometry args={[3.2, 9.5, 4.5]} />
                </mesh>
              </group>
            );
          }

          // 1. LED (5mm Translucent Domed Lens with Flange, Leads & Solder Fillets)
          if (upperType.includes('LED') || upperFootprint.includes('LED')) {
            const ledParamColor = (pComp.parameters?.color as string) || '';
            const ledColor =
              ledParamColor.startsWith('#')
                ? ledParamColor
                : pComp.label?.toLowerCase().includes('green')
                ? '#10B981'
                : pComp.label?.toLowerCase().includes('blue')
                ? '#3B82F6'
                : pComp.label?.toLowerCase().includes('yellow')
                ? '#F59E0B'
                : pComp.label?.toLowerCase().includes('white')
                ? '#F8FAFC'
                : '#EF4444';

            const ledMaterial = getLedMaterial(ledColor);

            return (
              <group key={pComp.componentId} position={[cx, compY, cz]} rotation={compRot}>
                {/* Silver Anode / Cathode leads entering pads */}
                <mesh position={[-1.27, 1.2, 0]} material={materials.leadMetal}>
                  <cylinderGeometry args={[0.25, 0.25, 2.8, 8]} />
                </mesh>
                <mesh position={[1.27, 1.2, 0]} material={materials.leadMetal}>
                  <cylinderGeometry args={[0.25, 0.25, 2.8, 8]} />
                </mesh>
                {/* Solder Fillets at Pad entry */}
                <mesh position={[-1.27, 0.15, 0]} material={materials.solderFillet}>
                  <cylinderGeometry args={[0.5, 0.75, 0.3, 12]} />
                </mesh>
                <mesh position={[1.27, 0.15, 0]} material={materials.solderFillet}>
                  <cylinderGeometry args={[0.5, 0.75, 0.3, 12]} />
                </mesh>
                {/* Base rim collar (with flat cathode side on +X) */}
                <mesh position={[0, 2.8, 0]} material={ledMaterial}>
                  <cylinderGeometry args={[2.8, 2.8, 0.8, 24]} />
                </mesh>
                {/* Main cylinder body */}
                <mesh position={[0, 5.0, 0]} material={ledMaterial}>
                  <cylinderGeometry args={[2.5, 2.5, 3.8, 24]} />
                </mesh>
                {/* Hemisphere dome top */}
                <mesh position={[0, 6.9, 0]} material={ledMaterial}>
                  <sphereGeometry args={[2.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                </mesh>
              </group>
            );
          }

          // 2. Axial Through-Hole Resistor with Color Bands, Bent Leads & Solder Fillets
          if (upperType.includes('RESISTOR') || upperFootprint.includes('AXIAL')) {
            return (
              <group key={pComp.componentId} position={[cx, compY, cz]} rotation={compRot}>
                {/* Vertical leads penetrating PCB pads down to -0.4mm */}
                <mesh position={[-3.81, 0.8, 0]} material={materials.leadMetal}>
                  <cylinderGeometry args={[0.3, 0.3, 2.4, 8]} />
                </mesh>
                <mesh position={[3.81, 0.8, 0]} material={materials.leadMetal}>
                  <cylinderGeometry args={[0.3, 0.3, 2.4, 8]} />
                </mesh>
                {/* Solder Fillets on Pads */}
                <mesh position={[-3.81, 0.15, 0]} material={materials.solderFillet}>
                  <cylinderGeometry args={[0.55, 0.85, 0.3, 12]} />
                </mesh>
                <mesh position={[3.81, 0.15, 0]} material={materials.solderFillet}>
                  <cylinderGeometry args={[0.55, 0.85, 0.3, 12]} />
                </mesh>
                {/* Horizontal lead span */}
                <mesh position={[0, 2.0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.leadMetal}>
                  <cylinderGeometry args={[0.3, 0.3, 7.62, 8]} />
                </mesh>
                {/* Resistor ceramic body */}
                <mesh position={[0, 2.0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.resistorBody}>
                  <cylinderGeometry args={[1.2, 1.2, 4.8, 16]} />
                </mesh>
                {/* 4 Standard Color Bands */}
                <mesh position={[-1.4, 2.0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.resistorBandBrown}>
                  <cylinderGeometry args={[1.22, 1.22, 0.4, 16]} />
                </mesh>
                <mesh position={[-0.5, 2.0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.resistorBandBlack}>
                  <cylinderGeometry args={[1.22, 1.22, 0.4, 16]} />
                </mesh>
                <mesh position={[0.4, 2.0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.resistorBandRed}>
                  <cylinderGeometry args={[1.22, 1.22, 0.4, 16]} />
                </mesh>
                <mesh position={[1.4, 2.0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.resistorBandGold}>
                  <cylinderGeometry args={[1.22, 1.22, 0.4, 16]} />
                </mesh>
              </group>
            );
          }

          // 3. Diode (1N4007 / 1N4148 DO-41 Package with Silver Polarity Band)
          if (upperType.includes('DIODE')) {
            return (
              <group key={pComp.componentId} position={[cx, compY, cz]} rotation={compRot}>
                <mesh position={[-3.81, 0.8, 0]} material={materials.leadMetal}>
                  <cylinderGeometry args={[0.3, 0.3, 2.4, 8]} />
                </mesh>
                <mesh position={[3.81, 0.8, 0]} material={materials.leadMetal}>
                  <cylinderGeometry args={[0.3, 0.3, 2.4, 8]} />
                </mesh>
                <mesh position={[-3.81, 0.15, 0]} material={materials.solderFillet}>
                  <cylinderGeometry args={[0.55, 0.85, 0.3, 12]} />
                </mesh>
                <mesh position={[3.81, 0.15, 0]} material={materials.solderFillet}>
                  <cylinderGeometry args={[0.55, 0.85, 0.3, 12]} />
                </mesh>
                <mesh position={[0, 1.8, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.leadMetal}>
                  <cylinderGeometry args={[0.3, 0.3, 7.62, 8]} />
                </mesh>
                {/* Diode body */}
                <mesh position={[0, 1.8, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.diodeGlass}>
                  <cylinderGeometry args={[1.3, 1.3, 4.4, 16]} />
                </mesh>
                {/* Cathode silver band on +X side */}
                <mesh position={[1.4, 1.8, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.diodeBandSilver}>
                  <cylinderGeometry args={[1.32, 1.32, 0.6, 16]} />
                </mesh>
              </group>
            );
          }

          // 4. Radial Electrolytic Capacitor (Aluminum Can with Negative Stripe & Solder Fillets)
          if (
            upperType.includes('ELECTROLYTIC') ||
            (upperType.includes('CAPACITOR') && (upperFootprint.includes('RADIAL') || upperFootprint.includes('CP_')))
          ) {
            return (
              <group key={pComp.componentId} position={[cx, compY, cz]} rotation={compRot}>
                {/* Two leads penetrating into pads */}
                <mesh position={[-1.25, 0.8, 0]} material={materials.leadMetal}>
                  <cylinderGeometry args={[0.3, 0.3, 2.2, 8]} />
                </mesh>
                <mesh position={[1.25, 0.8, 0]} material={materials.leadMetal}>
                  <cylinderGeometry args={[0.3, 0.3, 2.2, 8]} />
                </mesh>
                {/* Solder Fillets on Pads */}
                <mesh position={[-1.25, 0.15, 0]} material={materials.solderFillet}>
                  <cylinderGeometry args={[0.55, 0.85, 0.3, 12]} />
                </mesh>
                <mesh position={[1.25, 0.15, 0]} material={materials.solderFillet}>
                  <cylinderGeometry args={[0.55, 0.85, 0.3, 12]} />
                </mesh>
                {/* Blue PVC body */}
                <mesh position={[0, 5.2, 0]} material={materials.capRadialBlue}>
                  <cylinderGeometry args={[3.0, 3.0, 7.5, 24]} />
                </mesh>
                {/* Negative polarity stripe */}
                <mesh position={[-2.95, 5.2, 0]} material={materials.capStripeWhite}>
                  <boxGeometry args={[0.2, 7.5, 1.2]} />
                </mesh>
                {/* Top silver vent cap with cross relief score */}
                <mesh position={[0, 9.0, 0]} material={materials.usbMetal}>
                  <cylinderGeometry args={[2.9, 2.9, 0.2, 24]} />
                </mesh>
              </group>
            );
          }

          // 5. Ceramic Disc Capacitor
          if (upperType.includes('CAPACITOR')) {
            return (
              <group key={pComp.componentId} position={[cx, compY, cz]} rotation={compRot}>
                <mesh position={[-1.27, 1.15, 0]} material={materials.leadMetal}>
                  <cylinderGeometry args={[0.22, 0.22, 2.5, 10]} />
                </mesh>
                <mesh position={[1.27, 1.15, 0]} material={materials.leadMetal}>
                  <cylinderGeometry args={[0.22, 0.22, 2.5, 10]} />
                </mesh>
                <mesh position={[-1.27, 0.15, 0]} material={materials.solderFillet}>
                  <cylinderGeometry args={[0.5, 0.75, 0.3, 12]} />
                </mesh>
                <mesh position={[1.27, 0.15, 0]} material={materials.solderFillet}>
                  <cylinderGeometry args={[0.5, 0.75, 0.3, 12]} />
                </mesh>
                <mesh position={[0, 3.25, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.capCeramicTan}>
                  <cylinderGeometry args={[1.85, 1.85, 1.1, 28]} />
                </mesh>
              </group>
            );
          }

          // 6. Transistor (TO-92 Package with 3 Splayed Leads & Laser Text)
          if (upperType.includes('TRANSISTOR') || upperType.includes('BJT') || upperFootprint.includes('TO-92')) {
            return (
              <group key={pComp.componentId} position={[cx, compY, cz]} rotation={compRot}>
                {/* 3 metallic leads */}
                {[-1.27, 0, 1.27].map((lx, idx) => (
                  <group key={idx}>
                    <mesh position={[lx, 1.0, 0]} material={materials.leadMetal}>
                      <cylinderGeometry args={[0.25, 0.25, 2.4, 8]} />
                    </mesh>
                    <mesh position={[lx, 0.15, 0]} material={materials.solderFillet}>
                      <cylinderGeometry args={[0.5, 0.75, 0.3, 12]} />
                    </mesh>
                  </group>
                ))}
                {/* TO-92 D-shaped body (flat front at z = -1.0, rounded back) */}
                <mesh position={[0, 4.0, 0]} material={materials.transistorPlastic}>
                  <cylinderGeometry args={[2.2, 2.2, 4.5, 16, 1, false, -Math.PI / 2, Math.PI]} />
                </mesh>
                <mesh position={[0, 4.0, -0.6]} material={materials.transistorPlastic}>
                  <boxGeometry args={[4.4, 4.5, 1.2]} />
                </mesh>
              </group>
            );
          }

          // 7. DIP IC (NE555, LM358, ATmega, DIP-8, DIP-14, DIP-16) with Pin 1 Notch, Laser Detailing & Shoulder-to-Pad Leads
          if (upperType.includes('IC') || upperType.includes('TIMER') || upperFootprint.includes('DIP') || upperType.includes('555')) {
            const isDip14Or16 = upperFootprint.includes('DIP-14') || upperFootprint.includes('DIP-16');
            const bodyLen = isDip14Or16 ? 19.5 : 9.8;
            const pinCount = isDip14Or16 ? 14 : 8;
            const pinsPerSide = pinCount / 2;
            const partName = (pComp.value || pComp.label || (upperType.includes('555') ? 'NE555P' : 'DIP-IC')).toUpperCase();
            const laserTexture = typeof document !== 'undefined' ? getIcLaserTexture(partName, isDip14Or16) : null;

            return (
              <group key={pComp.componentId} position={[cx, compY, cz]} rotation={compRot}>
                {/* Black Epoxy Plastic Package Body (Elevated 0.6mm above board on standoffs) */}
                <mesh position={[0, 2.2, 0]} material={materials.icPlastic}>
                  <boxGeometry args={[bodyLen, 3.2, 6.2]} />
                </mesh>

                {/* Laser-Etched Markings & Pin 1 Dimple Top Plane */}
                {laserTexture && (
                  <mesh position={[0, 3.81, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[bodyLen - 0.4, 5.8]} />
                    <meshBasicMaterial map={laserTexture} />
                  </mesh>
                )}

                {/* Pin 1 Semicircular End Notch (-X edge) */}
                <mesh position={[-bodyLen / 2 + 0.1, 3.2, 0]} material={materials.drillHole}>
                  <cylinderGeometry args={[0.9, 0.9, 1.4, 16]} />
                </mesh>

                {/* Proper Shoulder-to-Pad Lead Connections */}
                {Array.from({ length: pinsPerSide }).map((_, i) => {
                  const px = -((pinsPerSide - 1) * 2.54) / 2 + i * 2.54;
                  return (
                    <group key={i}>
                      {/* === SIDE A (Row 1, z = -3.81mm) === */}
                      {/* Horizontal Lead Shoulder exiting package side (z: -3.1 to -3.81) */}
                      <mesh position={[px, 1.85, -3.45]} material={materials.icLead}>
                        <boxGeometry args={[0.9, 0.28, 0.8]} />
                      </mesh>
                      {/* Lead Knee transition */}
                      <mesh position={[px, 1.85, -3.81]} material={materials.icLead}>
                        <boxGeometry args={[0.65, 0.28, 0.35]} />
                      </mesh>
                      {/* Vertical Pin Leg extending into PCB pad hole */}
                      <mesh position={[px, 0.7, -3.81]} material={materials.icLead}>
                        <boxGeometry args={[0.48, 2.3, 0.28]} />
                      </mesh>
                      {/* Shiny Solder Fillet at Pad entry */}
                      <mesh position={[px, 0.15, -3.81]} material={materials.solderFillet}>
                        <cylinderGeometry args={[0.65, 0.85, 0.3, 12]} />
                      </mesh>

                      {/* === SIDE B (Row 2, z = +3.81mm) === */}
                      {/* Horizontal Lead Shoulder exiting package side (z: +3.1 to +3.81) */}
                      <mesh position={[px, 1.85, 3.45]} material={materials.icLead}>
                        <boxGeometry args={[0.9, 0.28, 0.8]} />
                      </mesh>
                      {/* Lead Knee transition */}
                      <mesh position={[px, 1.85, 3.81]} material={materials.icLead}>
                        <boxGeometry args={[0.65, 0.28, 0.35]} />
                      </mesh>
                      {/* Vertical Pin Leg extending into PCB pad hole */}
                      <mesh position={[px, 0.7, 3.81]} material={materials.icLead}>
                        <boxGeometry args={[0.48, 2.3, 0.28]} />
                      </mesh>
                      {/* Shiny Solder Fillet at Pad entry */}
                      <mesh position={[px, 0.15, 3.81]} material={materials.solderFillet}>
                        <cylinderGeometry args={[0.65, 0.85, 0.3, 12]} />
                      </mesh>
                    </group>
                  );
                })}
              </group>
            );
          }

          // 8. Terminal Block / Battery Connector with Screw Terminals & Solder Fillets
          if (upperType.includes('BATTERY') || upperType.includes('VOLTAGE') || upperFootprint.includes('TERMINALBLOCK')) {
            return (
              <group key={pComp.componentId} position={[cx, compY, cz]} rotation={compRot}>
                {/* Solder Fillets at bottom pin entry */}
                <mesh position={[-2.54, 0.15, 0]} material={materials.solderFillet}>
                  <cylinderGeometry args={[0.65, 0.95, 0.3, 12]} />
                </mesh>
                <mesh position={[2.54, 0.15, 0]} material={materials.solderFillet}>
                  <cylinderGeometry args={[0.65, 0.95, 0.3, 12]} />
                </mesh>
                {/* Green terminal block plastic housing */}
                <mesh position={[0, 4.5, 0]} material={materials.terminalGreen}>
                  <boxGeometry args={[10.0, 9.0, 8.0]} />
                </mesh>
                {/* Two brass screws on top */}
                <mesh position={[-2.54, 9.05, 0]} material={materials.screwBrass}>
                  <cylinderGeometry args={[1.2, 1.2, 0.4, 16]} />
                </mesh>
                <mesh position={[2.54, 9.05, 0]} material={materials.screwBrass}>
                  <cylinderGeometry args={[1.2, 1.2, 0.4, 16]} />
                </mesh>
              </group>
            );
          }

          // 9. Microcontroller Dev Board (Arduino Uno / Nano / ESP32)
          if (upperType.includes('MCU') || upperFootprint.includes('ARDUINO') || upperFootprint.includes('ESP32')) {
            return (
              <group key={pComp.componentId} position={[cx, compY, cz]} rotation={compRot}>
                {/* Dev board blue substrate */}
                <mesh position={[0, 1.0, 0]} material={materials.mcuBoardBlue}>
                  <boxGeometry args={[26.0, 1.6, 18.0]} />
                </mesh>
                {/* USB Connector (Metallic Box) */}
                <mesh position={[-12.0, 3.0, 0]} material={materials.usbMetal}>
                  <boxGeometry args={[6.0, 4.0, 7.0]} />
                </mesh>
                {/* Main MCU IC on board with laser markings */}
                <mesh position={[2.0, 2.2, 0]} material={materials.icPlastic}>
                  <boxGeometry args={[7.0, 1.2, 7.0]} />
                </mesh>
              </group>
            );
          }

          // 10. Buzzer (Piezo Sounder Cylindrical Housing & Pins)
          if (upperType.includes('BUZZER') || upperFootprint.includes('BUZZER')) {
            return (
              <group key={pComp.componentId} position={[cx, compY, cz]} rotation={compRot}>
                {[-2.54, 2.54].map((lx, idx) => (
                  <group key={idx}>
                    <mesh position={[lx, 1.2, 0]} material={materials.leadMetal}>
                      <cylinderGeometry args={[0.3, 0.3, 2.6, 8]} />
                    </mesh>
                    <mesh position={[lx, 0.15, 0]} material={materials.solderFillet}>
                      <cylinderGeometry args={[0.55, 0.85, 0.3, 12]} />
                    </mesh>
                  </group>
                ))}
                {/* Black cylinder body */}
                <mesh position={[0, 5.0, 0]} material={materials.icPlastic}>
                  <cylinderGeometry args={[6.0, 6.0, 7.5, 24]} />
                </mesh>
                {/* Top sound aperture hole */}
                <mesh position={[0, 8.8, 0]} material={materials.drillHole}>
                  <cylinderGeometry args={[1.5, 1.5, 0.2, 16]} />
                </mesh>
              </group>
            );
          }

          // 11. Pushbutton (6x6mm Tactile Switch with 4 Corner Pins)
          if (upperType.includes('PUSH') || upperType.includes('BUTTON') || upperFootprint.includes('SW_PUSH')) {
            return (
              <group key={pComp.componentId} position={[cx, compY, cz]} rotation={compRot}>
                {[-2.54, 2.54].flatMap((lx) =>
                  [-2.54, 2.54].map((lz) => (
                    <group key={`${lx}_${lz}`}>
                      <mesh position={[lx, 1.0, lz]} material={materials.leadMetal}>
                        <cylinderGeometry args={[0.25, 0.25, 2.2, 8]} />
                      </mesh>
                      <mesh position={[lx, 0.15, lz]} material={materials.solderFillet}>
                        <cylinderGeometry args={[0.5, 0.75, 0.3, 12]} />
                      </mesh>
                    </group>
                  ))
                )}
                {/* Switch plastic base body */}
                <mesh position={[0, 2.5, 0]} material={materials.icPlastic}>
                  <boxGeometry args={[6.0, 3.0, 6.0]} />
                </mesh>
                {/* Top metal retaining bracket */}
                <mesh position={[0, 4.1, 0]} material={materials.leadMetal}>
                  <boxGeometry args={[6.1, 0.3, 6.1]} />
                </mesh>
                {/* Round button plunger */}
                <mesh position={[0, 5.0, 0]} material={materials.capRadialBlue}>
                  <cylinderGeometry args={[1.6, 1.6, 1.8, 16]} />
                </mesh>
              </group>
            );
          }

          // 12. Slide Switch
          if (upperType.includes('SWITCH') || upperFootprint.includes('SLIDE')) {
            return (
              <group key={pComp.componentId} position={[cx, compY, cz]} rotation={compRot}>
                {[-2.54, 0, 2.54].map((lx, idx) => (
                  <group key={idx}>
                    <mesh position={[lx, 1.0, 0]} material={materials.leadMetal}>
                      <cylinderGeometry args={[0.25, 0.25, 2.2, 8]} />
                    </mesh>
                    <mesh position={[lx, 0.15, 0]} material={materials.solderFillet}>
                      <cylinderGeometry args={[0.5, 0.75, 0.3, 12]} />
                    </mesh>
                  </group>
                ))}
                {/* Metal housing */}
                <mesh position={[0, 3.0, 0]} material={materials.leadMetal}>
                  <boxGeometry args={[8.5, 4.0, 4.0]} />
                </mesh>
                {/* Black slide knob */}
                <mesh position={[0, 5.8, 0]} material={materials.icPlastic}>
                  <boxGeometry args={[2.0, 2.0, 2.0]} />
                </mesh>
              </group>
            );
          }

          // 13. LDR / Photoresistor
          if (upperType.includes('LDR') || upperFootprint.includes('LDR')) {
            return (
              <group key={pComp.componentId} position={[cx, compY, cz]} rotation={compRot}>
                {[-1.27, 1.27].map((lx, idx) => (
                  <group key={idx}>
                    <mesh position={[lx, 1.2, 0]} material={materials.leadMetal}>
                      <cylinderGeometry args={[0.25, 0.25, 2.6, 8]} />
                    </mesh>
                    <mesh position={[lx, 0.15, 0]} material={materials.solderFillet}>
                      <cylinderGeometry args={[0.5, 0.75, 0.3, 12]} />
                    </mesh>
                  </group>
                ))}
                {/* 5mm round ceramic disk */}
                <mesh position={[0, 3.2, 0]} material={materials.capCeramicTan}>
                  <cylinderGeometry args={[2.5, 2.5, 1.5, 20]} />
                </mesh>
                {/* Red optical track face */}
                <mesh position={[0, 4.0, 0]} material={materials.resistorBandRed}>
                  <cylinderGeometry args={[2.2, 2.2, 0.1, 20]} />
                </mesh>
              </group>
            );
          }

          // 14. Inductor (Through-Hole Axial / Toroid)
          if (upperType.includes('INDUCTOR') || upperFootprint.includes('INDUCTOR')) {
            return (
              <group key={pComp.componentId} position={[cx, compY, cz]} rotation={compRot}>
                {[-3.81, 3.81].map((lx, idx) => (
                  <group key={idx}>
                    <mesh position={[lx, 0.8, 0]} material={materials.leadMetal}>
                      <cylinderGeometry args={[0.3, 0.3, 2.2, 8]} />
                    </mesh>
                    <mesh position={[lx, 0.15, 0]} material={materials.solderFillet}>
                      <cylinderGeometry args={[0.55, 0.85, 0.3, 12]} />
                    </mesh>
                  </group>
                ))}
                {/* Green molded inductor body */}
                <mesh position={[0, 2.2, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.terminalGreen}>
                  <cylinderGeometry args={[1.6, 1.6, 5.0, 16]} />
                </mesh>
              </group>
            );
          }

          // 15. Potentiometer / Trimmer
          if (upperType.includes('POTENTIOMETER') || upperFootprint.includes('POTENTIOMETER')) {
            return (
              <group key={pComp.componentId} position={[cx, compY, cz]} rotation={compRot}>
                {[-2.54, 0, 2.54].map((lx, idx) => (
                  <group key={idx}>
                    <mesh position={[lx, 1.0, idx === 1 ? 2.54 : 0]} material={materials.leadMetal}>
                      <cylinderGeometry args={[0.3, 0.3, 2.2, 8]} />
                    </mesh>
                    <mesh position={[lx, 0.15, idx === 1 ? 2.54 : 0]} material={materials.solderFillet}>
                      <cylinderGeometry args={[0.55, 0.85, 0.3, 12]} />
                    </mesh>
                  </group>
                ))}
                {/* Blue square trimmer body */}
                <mesh position={[0, 4.5, 1.0]} material={materials.capRadialBlue}>
                  <boxGeometry args={[9.5, 7.0, 4.5]} />
                </mesh>
                {/* Brass adjustment rotor on top */}
                <mesh position={[0, 8.2, 1.0]} material={materials.screwBrass}>
                  <cylinderGeometry args={[1.5, 1.5, 0.6, 16]} />
                </mesh>
              </group>
            );
          }

          // Default SMD/Through-hole component body
          return (
            <group key={pComp.componentId} position={[cx, compY + (isBottom ? -1.2 : 1.2), cz]} rotation={compRot}>
              <mesh material={materials.icPlastic}>
                <boxGeometry args={[5.0, 2.2, 5.0]} />
              </mesh>
            </group>
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
      </div>
    </div>
  );
}
