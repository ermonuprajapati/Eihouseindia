'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface RgbLed3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isSelected?: boolean;
  isPowered?: boolean;
  color?: string; // e.g. '#EF4444', '#10B981', '#3B82F6', or '#A855F7'
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

export function RgbLed3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isSelected = false,
  isPowered = true,
  color = '#EC4899', // Default magenta mix
  onPinClick,
  hoveredPin,
  onHoverPin,
}: RgbLed3DProps) {
  const materials = useMemo(() => {
    return {
      lensActive: new THREE.MeshStandardMaterial({
        color: color,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.9,
        transparent: true,
        opacity: 0.85,
        roughness: 0.15,
      }),
      lensOff: new THREE.MeshStandardMaterial({
        color: isSelected ? '#BAE6FD' : '#E2E8F0',
        transparent: true,
        opacity: 0.5,
        roughness: 0.2,
      }),
      pinSilver: new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        metalness: 0.9,
      }),
      pinHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
    };
  }, [color, isSelected]);

  // 4 Pins: R (Anode 1), C (Common Cathode / GND), G (Anode 2), B (Anode 3)
  const pins = [
    { name: 'R', x: -3.81, label: 'Red Anode' },
    { name: 'C', x: -1.27, label: 'Cathode (GND)' },
    { name: 'G', x: 1.27, label: 'Green Anode' },
    { name: 'B', x: 3.81, label: 'Blue Anode' },
  ];

  return (
    <group position={position} rotation={rotation}>
      {/* 5mm Domed Epoxy Lens */}
      <mesh position={[0, 4.5, 0]} material={isPowered ? materials.lensActive : materials.lensOff}>
        <cylinderGeometry args={[2.5, 2.5, 5.0, 24]} />
      </mesh>
      <mesh position={[0, 7.0, 0]} material={isPowered ? materials.lensActive : materials.lensOff}>
        <sphereGeometry args={[2.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>

      {/* Flange Collar at Base */}
      <mesh position={[0, 1.8, 0]} material={isPowered ? materials.lensActive : materials.lensOff}>
        <cylinderGeometry args={[2.9, 2.9, 0.6, 24]} />
      </mesh>

      {/* Emissive Point Light */}
      {isPowered && (
        <pointLight position={[0, 6.0, 0]} color={color} intensity={0.8} distance={25} />
      )}

      {/* 4 Silver Lead Wires with Pin Targets */}
      {pins.map((p) => {
        const isHovered = hoveredPin === p.name;
        return (
          <group key={p.name} position={[p.x, 0, 0]}>
            <mesh position={[0, -1.8, 0]} material={materials.pinSilver}>
              <cylinderGeometry args={[0.3, 0.3, 4.5, 8]} />
            </mesh>
            <mesh
              position={[0, -3.8, 0]}
              material={isHovered ? materials.pinHover : materials.pinSilver}
              onClick={(e) => {
                e.stopPropagation();
                const worldPos = new THREE.Vector3();
                e.object.getWorldPosition(worldPos);
                onPinClick?.(p.name, worldPos);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                onHoverPin?.(p.name);
              }}
              onPointerOut={() => onHoverPin?.(null)}
            >
              <sphereGeometry args={[isHovered ? 1.4 : 0.8, 8, 8]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
