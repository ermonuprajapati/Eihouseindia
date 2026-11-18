'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface Ldr3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isSelected?: boolean;
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

export function Ldr3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isSelected = false,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: Ldr3DProps) {
  const materials = useMemo(() => {
    return {
      disc: new THREE.MeshStandardMaterial({
        color: isSelected ? '#38BDF8' : '#EA580C', // Orange/tan ceramic photocell substrate
        roughness: 0.5,
      }),
      track: new THREE.MeshBasicMaterial({
        color: '#18181B', // Dark CdS serpentine track
      }),
      pinSilver: new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        metalness: 0.9,
      }),
      pinHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
    };
  }, [isSelected]);

  const pins = [
    { name: '1', x: -2.54 },
    { name: '2', x: 2.54 },
  ];

  return (
    <group position={position} rotation={rotation}>
      {/* 5mm Ceramic Disc Body */}
      <mesh position={[0, 5.0, 0]} material={materials.disc}>
        <cylinderGeometry args={[2.8, 2.8, 1.2, 24]} />
      </mesh>

      {/* Serpentine Photocell Track on Face */}
      <mesh position={[0, 5.65, 0]}>
        <ringGeometry args={[1.0, 2.4, 16]} />
        <meshBasicMaterial color="#78350F" side={THREE.DoubleSide} />
      </mesh>

      {/* 2 Leads */}
      {pins.map((p) => {
        const isHovered = hoveredPin === p.name;
        return (
          <group key={p.name} position={[p.x, 0, 0]}>
            <mesh position={[0, 2.0, 0]} material={materials.pinSilver}>
              <cylinderGeometry args={[0.3, 0.3, 6.0, 8]} />
            </mesh>
            <mesh
              position={[0, -1.0, 0]}
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
