'use client';

import React, { useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { PcbLayout } from '../types';
import { Compass } from 'lucide-react';

export interface Pcb3dViewerProps {
  pcb: PcbLayout;
  solderMaskColor?: string; // e.g. '#065F46' (Green), '#0F172A' (Black), '#1E40AF' (Blue), '#991B1B' (Red)
}

export function Pcb3dViewer({
  pcb,
  solderMaskColor = '#065F46',
}: Pcb3dViewerProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const thickness = pcb.boardThicknessMm || 1.6;
  const halfW = pcb.widthMm / 2;
  const halfH = pcb.heightMm / 2;

  const materials = useMemo(() => {
    return {
      fr4Core: new THREE.MeshStandardMaterial({
        color: solderMaskColor,
        roughness: 0.4,
        metalness: 0.1,
      }),
      copperTop: new THREE.MeshStandardMaterial({
        color: '#F59E0B',
        metalness: 0.85,
        roughness: 0.25,
      }),
      copperBottom: new THREE.MeshStandardMaterial({
        color: '#3B82F6',
        metalness: 0.85,
        roughness: 0.25,
      }),
      goldPad: new THREE.MeshStandardMaterial({
        color: '#EAB308',
        metalness: 0.9,
        roughness: 0.2,
      }),
      drillHole: new THREE.MeshBasicMaterial({
        color: '#0A0F1D',
      }),
      icPlastic: new THREE.MeshStandardMaterial({
        color: '#1E293B',
        roughness: 0.4,
      }),
      resistorBody: new THREE.MeshStandardMaterial({
        color: '#D4A373',
        roughness: 0.5,
      }),
      leadMetal: new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        metalness: 0.9,
        roughness: 0.2,
      }),
    };
  }, [solderMaskColor]);

  // Camera presets
  const setCameraView = (view: 'iso' | 'top' | 'bot' | 'side') => {
    if (!controlsRef.current) return;
    const ctrl = controlsRef.current;
    if (view === 'iso') {
      ctrl.object.position.set(0, 80, 100);
      ctrl.target.set(0, 0, 0);
    } else if (view === 'top') {
      ctrl.object.position.set(0, 120, 0.1);
      ctrl.target.set(0, 0, 0);
    } else if (view === 'bot') {
      ctrl.object.position.set(0, -120, 0.1);
      ctrl.target.set(0, 0, 0);
    } else if (view === 'side') {
      ctrl.object.position.set(120, 10, 0);
      ctrl.target.set(0, 0, 0);
    }
    ctrl.update();
  };

  return (
    <div className="relative w-full h-full bg-[#070D18] select-none overflow-hidden">
      {/* Three.js Canvas */}
      <Canvas
        shadows
        camera={{ position: [0, 90, 110], fov: 40, near: 0.1, far: 2000 }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <color attach="background" args={['#070E1A']} />

        <ambientLight intensity={1.2} />
        <directionalLight position={[60, 120, 80]} intensity={2.0} castShadow />
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

        {/* Copper Pads */}
        {pcb.pads.map((pad) => {
          const px = pad.x - halfW;
          const pz = pad.y - halfH;
          const r = pad.diameterMm / 2;

          return (
            <group key={pad.id} position={[px, 0, pz]}>
              {/* Top Pad Disc */}
              <mesh position={[0, thickness / 2 + 0.02, 0]} material={materials.goldPad}>
                <cylinderGeometry args={[r, r, 0.04, 16]} />
              </mesh>
              {/* Bottom Pad Disc */}
              <mesh position={[0, -thickness / 2 - 0.02, 0]} material={materials.goldPad}>
                <cylinderGeometry args={[r, r, 0.04, 16]} />
              </mesh>
              {/* Plated Through Hole */}
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

        {/* 3D Component Footprint Bodies */}
        {pcb.components?.map((pComp) => {
          const cx = pComp.x - halfW;
          const cz = pComp.y - halfH;
          const rotY = (pComp.rotation * Math.PI) / 180;

          // Render package representation
          if (pComp.type.includes('RESISTOR')) {
            return (
              <group key={pComp.componentId} position={[cx, thickness / 2 + 2, cz]} rotation={[0, -rotY, 0]}>
                <mesh material={materials.resistorBody} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[1.2, 1.2, 5.5, 16]} />
                </mesh>
              </group>
            );
          }

          if (pComp.type.includes('IC') || pComp.type.includes('DIP') || pComp.footprint.includes('DIP')) {
            return (
              <group key={pComp.componentId} position={[cx, thickness / 2 + 2.5, cz]} rotation={[0, -rotY, 0]}>
                <mesh material={materials.icPlastic}>
                  <boxGeometry args={[12, 3.5, 7.6]} />
                </mesh>
              </group>
            );
          }

          // Default surface/through-hole block
          return (
            <group key={pComp.componentId} position={[cx, thickness / 2 + 1.5, cz]} rotation={[0, -rotY, 0]}>
              <mesh material={materials.icPlastic}>
                <boxGeometry args={[6, 2.5, 6]} />
              </mesh>
            </group>
          );
        })}
      </Canvas>

      {/* Top Floating View HUD */}
      <div className="absolute top-3 left-4 flex items-center gap-1.5 bg-slate-900/90 border border-slate-700 rounded-lg p-1.5 shadow-xl backdrop-blur font-mono text-xs z-20">
        <button
          onClick={() => setCameraView('iso')}
          className="px-2 py-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded flex items-center gap-1 cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>Iso</span>
        </button>
        <button
          onClick={() => setCameraView('top')}
          className="px-2 py-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer"
        >
          Top (F.Cu)
        </button>
        <button
          onClick={() => setCameraView('bot')}
          className="px-2 py-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer"
        >
          Bottom (B.Cu)
        </button>
        <button
          onClick={() => setCameraView('side')}
          className="px-2 py-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer"
        >
          Edge
        </button>

        <div className="h-4 w-px bg-slate-700 mx-1" />

        <div className="text-[10px] text-slate-400">
          Board: <span className="text-cyan-400 font-bold">{pcb.widthMm}x{pcb.heightMm} mm</span> ({thickness}mm FR-4)
        </div>
      </div>
    </div>
  );
}
