'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface TerminalBlock3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  pinsCount?: number;
  isSelected?: boolean;
  renderContext?: 'studio' | '3d-view';
}

/**
 * Hardware-grade Screw Terminal Block 3D Model (5.08mm pitch)
 * Industrial green polycarbonate housing, brass terminal clamping screws,
 * wire entry apertures, and solid metallic pins with solder fillets.
 */
export function TerminalBlock3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pinsCount = 2,
  isSelected = false,
}: TerminalBlock3DProps) {
  const materials = useMemo(() => {
    return {
      housing: new THREE.MeshStandardMaterial({
        color: isSelected ? '#38BDF8' : '#15803D',
        roughness: 0.35,
        metalness: 0.1,
      }),
      screwBrass: new THREE.MeshStandardMaterial({
        color: '#EAB308',
        metalness: 0.9,
        roughness: 0.25,
      }),
      screwSlot: new THREE.MeshBasicMaterial({
        color: '#713F12',
      }),
      apertureDark: new THREE.MeshBasicMaterial({
        color: '#0F172A',
      }),
      pinMetal: new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        metalness: 0.95,
        roughness: 0.18,
      }),
      solderFillet: new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        metalness: 0.95,
        roughness: 0.18,
      }),
    };
  }, [isSelected]);

  const count = Math.max(2, pinsCount);
  const totalW = count * 5.08;
  const pinOffsets = Array.from({ length: count }, (_, i) => -((count - 1) * 5.08) / 2 + i * 5.08);

  return (
    <group position={position} rotation={rotation}>
      {/* Green Housing (Height 10mm, Depth 8.5mm) */}
      <mesh position={[0, 5.0, 0]} material={materials.housing} castShadow>
        <boxGeometry args={[totalW, 10.0, 8.5]} />
      </mesh>

      {/* Wire Entry Front Apertures */}
      {pinOffsets.map((px, idx) => (
        <group key={`front_${idx}`} position={[px, 4.0, 4.26]}>
          <mesh material={materials.apertureDark}>
            <boxGeometry args={[3.0, 3.2, 0.1]} />
          </mesh>
        </group>
      ))}

      {/* Top Clamping Screws */}
      {pinOffsets.map((px, idx) => (
        <group key={`screw_${idx}`} position={[px, 10.05, 0]}>
          <mesh material={materials.screwBrass}>
            <cylinderGeometry args={[1.5, 1.5, 0.4, 16]} />
          </mesh>
          {/* Screwdriver slot */}
          <mesh position={[0, 0.22, 0]} material={materials.screwSlot}>
            <boxGeometry args={[2.2, 0.05, 0.5]} />
          </mesh>
        </group>
      ))}

      {/* Solid Metallic Pins through PCB pads */}
      {pinOffsets.map((px, idx) => (
        <group key={`pin_${idx}`}>
          <mesh position={[px, -1.8, 0]} material={materials.pinMetal}>
            <cylinderGeometry args={[0.45, 0.45, 6.0, 10]} />
          </mesh>
          <mesh position={[px, 0.15, 0]} material={materials.solderFillet}>
            <cylinderGeometry args={[0.65, 0.95, 0.3, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
