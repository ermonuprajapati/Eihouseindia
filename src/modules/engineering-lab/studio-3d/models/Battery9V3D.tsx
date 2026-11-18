'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface Battery9V3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isSelected?: boolean;
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

export function Battery9V3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isSelected = false,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: Battery9V3DProps) {
  const materials = useMemo(() => {
    return {
      body: new THREE.MeshStandardMaterial({
        color: '#1E293B',
        roughness: 0.4,
      }),
      goldLabel: new THREE.MeshStandardMaterial({
        color: '#D97706',
        roughness: 0.3,
        metalness: 0.3,
      }),
      snapMetal: new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        metalness: 0.95,
        roughness: 0.15,
      }),
      pinHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
    };
  }, []);

  const P_POS: [number, number, number] = [-6.5, 27, 0];
  const P_NEG: [number, number, number] = [6.5, 27, 0];

  return (
    <group position={position} rotation={rotation}>
      {/* Selection Box */}
      {isSelected && (
        <mesh position={[0, 12, 0]}>
          <boxGeometry args={[28, 52, 20]} />
          <meshBasicMaterial color="#38BDF8" wireframe />
        </mesh>
      )}

      {/* Main 9V Rectangular Block Casing */}
      <mesh position={[0, 12, 0]} material={materials.body} castShadow>
        <boxGeometry args={[25, 46, 17]} />
      </mesh>

      {/* Golden Front Label Accent */}
      <mesh position={[0, 12, 8.6]} material={materials.goldLabel}>
        <planeGeometry args={[22, 40]} />
      </mesh>

      {/* Top Insulator Cap */}
      <mesh position={[0, 25.2, 0]} material={materials.body}>
        <boxGeometry args={[24, 0.6, 16]} />
      </mesh>

      {/* Positive Terminal (+) Octagonal Snap Socket */}
      <mesh position={[-6.5, 26, 0]} material={materials.snapMetal}>
        <cylinderGeometry args={[2.5, 2.5, 2, 8]} />
      </mesh>

      {/* Negative Terminal (-) Circular Stud */}
      <mesh position={[6.5, 26, 0]} material={materials.snapMetal}>
        <cylinderGeometry args={[2.0, 2.0, 2.4, 16]} />
      </mesh>

      {/* Positive Pin Anchor Target */}
      <mesh
        position={P_POS}
        material={hoveredPin === '+' ? materials.pinHover : materials.snapMetal}
        onClick={(e) => {
          e.stopPropagation();
          const w = new THREE.Vector3();
          e.object.getWorldPosition(w);
          onPinClick?.('+', w);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverPin?.('+');
        }}
        onPointerOut={() => onHoverPin?.(null)}
      >
        <sphereGeometry args={[1.2, 12, 12]} />
      </mesh>

      {/* Negative Pin Anchor Target */}
      <mesh
        position={P_NEG}
        material={hoveredPin === '-' ? materials.pinHover : materials.snapMetal}
        onClick={(e) => {
          e.stopPropagation();
          const w = new THREE.Vector3();
          e.object.getWorldPosition(w);
          onPinClick?.('-', w);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverPin?.('-');
        }}
        onPointerOut={() => onHoverPin?.(null)}
      >
        <sphereGeometry args={[1.2, 12, 12]} />
      </mesh>
    </group>
  );
}
