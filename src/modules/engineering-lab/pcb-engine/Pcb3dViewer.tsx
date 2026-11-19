'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { PcbLayout } from '../types';

export interface Pcb3dViewerProps {
  pcb: PcbLayout;
  solderMaskColor?: string; // e.g. '#065F46' (Green), '#0F172A' (Black), '#1E40AF' (Blue), '#991B1B' (Red)
  cameraPreset?: 'iso' | 'top' | 'bot' | 'front' | 'reset' | null;
}

export function Pcb3dViewer({
  pcb,
  solderMaskColor = '#065F46',
  cameraPreset,
}: Pcb3dViewerProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const thickness = pcb.boardThicknessMm || 1.6;
  const halfW = pcb.widthMm / 2;
  const halfH = pcb.heightMm / 2;

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

    // Outer border silkscreen
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

    // Board branding & metadata
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('EI HOUSE ENG LAB', 18, 28);
    ctx.font = '13px monospace';
    ctx.fillText(`REV 1.0 (${pcb.widthMm}x${pcb.heightMm}mm)`, 18, canvas.height - 16);

    // Component Silkscreen reference designators & outlines
    pcb.components?.forEach((comp) => {
      const cx = comp.x * scale;
      const cy = comp.y * scale;

      ctx.save();
      ctx.translate(cx, cy);
      if (comp.rotation) {
        ctx.rotate(((comp.rotation || 0) * Math.PI) / 180);
      }

      ctx.strokeStyle = '#FFFFFF';
      ctx.fillStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.font = 'bold 15px monospace';

      if (comp.type.includes('LED') || comp.type === 'DIODE') {
        // LED circular rim with cathode flat bar
        ctx.beginPath();
        ctx.arc(0, 0, 4.0 * scale, -0.6 * Math.PI, 0.6 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(4.0 * scale * Math.cos(0.6 * Math.PI), 4.0 * scale * Math.sin(0.6 * Math.PI));
        ctx.lineTo(4.0 * scale * Math.cos(-0.6 * Math.PI), 4.0 * scale * Math.sin(-0.6 * Math.PI));
        ctx.stroke();
        ctx.fillText(comp.designator, -12, 6 * scale);
      } else if (comp.type.includes('RESISTOR')) {
        // Axial resistor bounding box
        ctx.strokeRect(-6 * scale, -2.5 * scale, 12 * scale, 5 * scale);
        ctx.fillText(comp.designator, -12, -4 * scale);
      } else if (comp.type.includes('CAPACITOR')) {
        // Polarized capacitor circle with + indicator
        ctx.beginPath();
        ctx.arc(0, 0, 4.5 * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillText('+', -7 * scale, -1 * scale);
        ctx.fillText(comp.designator, -10, 7 * scale);
      } else if (comp.type.includes('IC') || comp.type.includes('TIMER') || comp.footprint?.includes('DIP')) {
        // DIP package outline matching physical package orientation and dimensions
        const isDip14Or16 = comp.footprint?.includes('DIP-14') || comp.footprint?.includes('DIP-16');
        const bLen = (isDip14Or16 ? 19.5 : 10.0) * scale;
        const bWid = 6.8 * scale;
        ctx.strokeRect(-bLen / 2, -bWid / 2, bLen, bWid);
        // Semicircular notch on the left (-X) side where Pin 1 is
        ctx.beginPath();
        ctx.arc(-bLen / 2, 0, 1.8 * scale, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        // Pin 1 dot at top-left
        ctx.beginPath();
        ctx.arc(-bLen / 2 + 1.8 * scale, -bWid / 2 + 1.6 * scale, 1.0 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText(comp.designator, -10, 2);
      } else if (comp.type.includes('BATTERY') || comp.type.includes('VOLTAGE')) {
        ctx.strokeRect(-8 * scale, -5 * scale, 16 * scale, 10 * scale);
        ctx.fillText(comp.designator, -12, -7 * scale);
      } else {
        ctx.strokeRect(-5 * scale, -5 * scale, 10 * scale, 10 * scale);
        ctx.fillText(comp.designator, -12, -7 * scale);
      }
      ctx.restore();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [pcb]);

  const materials = useMemo(() => {
    return {
      fr4Core: new THREE.MeshPhysicalMaterial({
        color: solderMaskColor === '#065F46' ? '#04442A' : solderMaskColor,
        roughness: 0.22,
        metalness: 0.08,
        clearcoat: 0.35,
        clearcoatRoughness: 0.25,
      }),
      copperTop: new THREE.MeshPhysicalMaterial({
        color: '#DC2626',
        metalness: 0.88,
        roughness: 0.22,
        clearcoat: 0.3,
      }),
      copperBottom: new THREE.MeshPhysicalMaterial({
        color: '#2563EB',
        metalness: 0.88,
        roughness: 0.22,
        clearcoat: 0.3,
      }),
      goldPad: new THREE.MeshStandardMaterial({
        color: '#F59E0B',
        metalness: 0.94,
        roughness: 0.16,
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
  }, [solderMaskColor]);

  return (
    <div className="relative w-full h-full bg-[#070D18] select-none overflow-hidden">
      {/* Three.js Canvas */}
      <Canvas
        shadows
        camera={{ position: [0, 80, 100], fov: 40, near: 0.1, far: 2000 }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <color attach="background" args={['#070E1A']} />

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
          const yPos = isTop ? thickness / 2 + 0.03 : -thickness / 2 - 0.03;

          return (
            <mesh
              key={track.id}
              position={[midX, yPos, midZ]}
              rotation={[0, -angle, 0]}
              material={isTop ? materials.copperTop : materials.copperBottom}
            >
              <boxGeometry args={[len, 0.04, track.widthMm || 0.35]} />
            </mesh>
          );
        })}

        {/* Authentic 3D Component Models (NO Generic Black Boxes) */}
        {pcb.components?.map((pComp) => {
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
    </div>
  );
}
