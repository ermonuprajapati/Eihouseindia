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
          material?: { dispose: () => void } | { dispose: () => void }[];
        };
        if (mesh.geometry) {
          try {
            mesh.geometry.dispose();
          } catch {}
        }
        if (mesh.material) {
          try {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else {
              mesh.material.dispose();
            }
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

      if (upperType.includes('LED')) {
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
    };
  }, [theme]);

  return (
    <div className="relative w-full h-full bg-[#070D18] select-none overflow-hidden">
      {/* Three.js Canvas */}
      <Canvas
        id="pcb-3d-webgl-canvas"
        shadows
        gl={{ preserveDrawingBuffer: true }}
        camera={{ position: [0, 80, 100], fov: 40, near: 0.1, far: 2000 }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
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

        {/* Copper Pads & Plated Through Holes */}
        {pcb.pads.map((pad) => {
          const px = pad.x - halfW;
          const pz = pad.y - halfH;
          const r = pad.diameterMm / 2;
          const isRect = pad.shape === 'rect';

          return (
            <group key={pad.id} position={[px, 0, pz]}>
              {/* Top Pad (Square for Pin 1, Circular for others) */}
              <mesh position={[0, thickness / 2 + 0.02, 0]} material={materials.goldPad}>
                {isRect ? (
                  <boxGeometry args={[pad.diameterMm, 0.04, pad.diameterMm]} />
                ) : (
                  <cylinderGeometry args={[r, r, 0.04, 16]} />
                )}
              </mesh>
              {/* Bottom Pad */}
              <mesh position={[0, -thickness / 2 - 0.02, 0]} material={materials.goldPad}>
                {isRect ? (
                  <boxGeometry args={[pad.diameterMm, 0.04, pad.diameterMm]} />
                ) : (
                  <cylinderGeometry args={[r, r, 0.04, 16]} />
                )}
              </mesh>
              {/* Plated Through Hole Barrel */}
              <mesh position={[0, 0, 0]} material={materials.goldPad}>
                <cylinderGeometry args={[pad.holeMm / 2 + 0.06, pad.holeMm / 2 + 0.06, thickness + 0.04, 16]} />
              </mesh>
              {/* Hollow Drill Hole Center */}
              <mesh position={[0, 0, 0]} material={materials.drillHole}>
                <cylinderGeometry args={[pad.holeMm / 2, pad.holeMm / 2, thickness + 0.1, 16]} />
              </mesh>
            </group>
          );
        })}

        {/* Top & Bottom Copper Traces */}
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

          return (
            <mesh
              key={track.id}
              position={[midX, yPos, midZ]}
              rotation={[0, -angle, 0]}
              material={isTop ? materials.copperTop : materials.copperBottom}
            >
              <boxGeometry args={[len, 0.025, track.widthMm || 0.35]} />
            </mesh>
          );
        })}

        {/* Authentic 3D Component Models (NO Generic Black Boxes) */}
        {showComponents && pcb.components?.map((pComp) => {
          const cx = pComp.x - halfW;
          const cz = pComp.y - halfH;
          const rotY = ((pComp.rotation || 0) * Math.PI) / 180;

          // 1. LED (5mm Translucent Domed Lens with Metallic Leads)
          if (pComp.type.includes('LED') || pComp.footprint?.includes('LED')) {
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

            const ledMaterial = new THREE.MeshPhysicalMaterial({
              color: ledColor,
              transmission: 0.55,
              opacity: 0.88,
              transparent: true,
              roughness: 0.15,
              emissive: ledColor,
              emissiveIntensity: 0.25,
            });

            return (
              <group key={pComp.componentId} position={[cx, thickness / 2, cz]} rotation={[0, -rotY, 0]}>
                {/* Silver Anode / Cathode leads entering pads */}
                <mesh position={[-1.27, 1.5, 0]} material={materials.leadMetal}>
                  <cylinderGeometry args={[0.25, 0.25, 3.0, 8]} />
                </mesh>
                <mesh position={[1.27, 1.5, 0]} material={materials.leadMetal}>
                  <cylinderGeometry args={[0.25, 0.25, 3.0, 8]} />
                </mesh>
                {/* Base rim collar */}
                <mesh position={[0, 3.2, 0]} material={ledMaterial}>
                  <cylinderGeometry args={[2.8, 2.8, 0.8, 24]} />
                </mesh>
                {/* Main cylinder body */}
                <mesh position={[0, 5.5, 0]} material={ledMaterial}>
                  <cylinderGeometry args={[2.5, 2.5, 4.0, 24]} />
                </mesh>
                {/* Hemisphere dome top */}
                <mesh position={[0, 7.5, 0]} material={ledMaterial}>
                  <sphereGeometry args={[2.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                </mesh>
              </group>
            );
          }

          // 2. Axial Through-Hole Resistor with Color Bands and Bent Leads
          if (pComp.type.includes('RESISTOR') || pComp.footprint?.includes('Axial')) {
            return (
              <group key={pComp.componentId} position={[cx, thickness / 2, cz]} rotation={[0, -rotY, 0]}>
                {/* Leads bending down into PCB pads at +/- 3.81mm */}
                <mesh position={[-3.81, 1.0, 0]} material={materials.leadMetal}>
                  <cylinderGeometry args={[0.3, 0.3, 2.0, 8]} />
                </mesh>
                <mesh position={[3.81, 1.0, 0]} material={materials.leadMetal}>
                  <cylinderGeometry args={[0.3, 0.3, 2.0, 8]} />
                </mesh>
                <mesh position={[0, 2.0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.leadMetal}>
                  <cylinderGeometry args={[0.3, 0.3, 7.6, 8]} />
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

          // 3. Radial Electrolytic Capacitor (Aluminum Can with Negative Stripe)
          if (pComp.type.includes('CAPACITOR') && (pComp.footprint?.includes('Radial') || pComp.footprint?.includes('CP_'))) {
            return (
              <group key={pComp.componentId} position={[cx, thickness / 2, cz]} rotation={[0, -rotY, 0]}>
                {/* Two leads */}
                <mesh position={[-1.25, 1.0, 0]} material={materials.leadMetal}>
                  <cylinderGeometry args={[0.3, 0.3, 2.0, 8]} />
                </mesh>
                <mesh position={[1.25, 1.0, 0]} material={materials.leadMetal}>
                  <cylinderGeometry args={[0.3, 0.3, 2.0, 8]} />
                </mesh>
                {/* Blue PVC body */}
                <mesh position={[0, 5.5, 0]} material={materials.capRadialBlue}>
                  <cylinderGeometry args={[3.0, 3.0, 7.5, 24]} />
                </mesh>
                {/* Polarity stripe */}
                <mesh position={[-2.95, 5.5, 0]} material={materials.capStripeWhite}>
                  <boxGeometry args={[0.2, 7.5, 1.2]} />
                </mesh>
                {/* Top silver vent cap */}
                <mesh position={[0, 9.3, 0]} material={materials.usbMetal}>
                  <cylinderGeometry args={[2.9, 2.9, 0.2, 24]} />
                </mesh>
              </group>
            );
          }

          // 4. Ceramic Disc Capacitor
          if (pComp.type.includes('CAPACITOR')) {
            return (
              <group key={pComp.componentId} position={[cx, thickness / 2, cz]} rotation={[0, -rotY, 0]}>
                <mesh position={[-1.25, 1.2, 0]} material={materials.leadMetal}>
                  <cylinderGeometry args={[0.25, 0.25, 2.4, 8]} />
                </mesh>
                <mesh position={[1.25, 1.2, 0]} material={materials.leadMetal}>
                  <cylinderGeometry args={[0.25, 0.25, 2.4, 8]} />
                </mesh>
                <mesh position={[0, 4.5, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.capCeramicTan}>
                  <cylinderGeometry args={[2.5, 2.5, 1.2, 24]} />
                </mesh>
              </group>
            );
          }

          // 5. DIP IC (NE555, ATmega, DIP-8, DIP-14, DIP-16) with Pin 1 Notch & Silver Legs
          if (pComp.type.includes('IC') || pComp.type.includes('TIMER') || pComp.footprint?.includes('DIP')) {
            const isDip14Or16 = pComp.footprint?.includes('DIP-14') || pComp.footprint?.includes('DIP-16');
            const bodyLen = isDip14Or16 ? 19.0 : 9.5;
            const pinCount = isDip14Or16 ? 14 : 8;
            const pinsPerSide = pinCount / 2;

            return (
              <group key={pComp.componentId} position={[cx, thickness / 2, cz]} rotation={[0, -rotY, 0]}>
                {/* Black Epoxy Plastic Package */}
                <mesh position={[0, 2.4, 0]} material={materials.icPlastic}>
                  <boxGeometry args={[bodyLen, 3.2, 6.2]} />
                </mesh>
                {/* Pin 1 semicircular notch on top left */}
                <mesh position={[-bodyLen / 2 + 0.2, 3.4, 0]} material={materials.drillHole}>
                  <cylinderGeometry args={[1.0, 1.0, 0.8, 16]} />
                </mesh>
                {/* Silver IC Pins extending from sides into pads */}
                {Array.from({ length: pinsPerSide }).map((_, i) => {
                  const px = -((pinsPerSide - 1) * 2.54) / 2 + i * 2.54;
                  return (
                    <group key={i}>
                      {/* Top row pin */}
                      <mesh position={[px, 1.2, -3.81]} material={materials.icLead}>
                        <boxGeometry args={[0.5, 2.4, 0.4]} />
                      </mesh>
                      {/* Bottom row pin */}
                      <mesh position={[px, 1.2, 3.81]} material={materials.icLead}>
                        <boxGeometry args={[0.5, 2.4, 0.4]} />
                      </mesh>
                    </group>
                  );
                })}
              </group>
            );
          }

          // 6. Terminal Block / Battery Connector
          if (pComp.type.includes('BATTERY') || pComp.type.includes('VOLTAGE') || pComp.footprint?.includes('TerminalBlock')) {
            return (
              <group key={pComp.componentId} position={[cx, thickness / 2, cz]} rotation={[0, -rotY, 0]}>
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

          // 7. Microcontroller Dev Board (Arduino Uno / Nano / ESP32)
          if (pComp.type.includes('MCU') || pComp.footprint?.includes('Arduino') || pComp.footprint?.includes('ESP32')) {
            return (
              <group key={pComp.componentId} position={[cx, thickness / 2, cz]} rotation={[0, -rotY, 0]}>
                {/* Dev board blue substrate */}
                <mesh position={[0, 1.0, 0]} material={materials.mcuBoardBlue}>
                  <boxGeometry args={[26.0, 1.6, 18.0]} />
                </mesh>
                {/* USB Connector (Metallic Box) */}
                <mesh position={[-12.0, 3.0, 0]} material={materials.usbMetal}>
                  <boxGeometry args={[6.0, 4.0, 7.0]} />
                </mesh>
                {/* Main MCU IC on board */}
                <mesh position={[2.0, 2.2, 0]} material={materials.icPlastic}>
                  <boxGeometry args={[7.0, 1.2, 7.0]} />
                </mesh>
              </group>
            );
          }

          // Default SMD/Through-hole component body
          return (
            <group key={pComp.componentId} position={[cx, thickness / 2 + 1.2, cz]} rotation={[0, -rotY, 0]}>
              <mesh material={materials.icPlastic}>
                <boxGeometry args={[5.0, 2.2, 5.0]} />
              </mesh>
            </group>
          );
        })}
      </Canvas>

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
