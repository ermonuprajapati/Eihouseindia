'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface Diode3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isSelected?: boolean;
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

export function Diode3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isSelected = false,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: Diode3DProps) {
  const materials = useMemo(() => {
    return {
      body: new THREE.MeshStandardMaterial({
        color: isSelected ? '#38BDF8' : '#18181B', // Black molded DO-41 body
        roughness: 0.4,
      }),
      cathodeBand: new THREE.MeshStandardMaterial({
        color: '#E2E8F0', // Silver cathode band
        roughness: 0.3,
        metalness: 0.8,
      }),
      lead: new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        metalness: 0.9,
      }),
      pinHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
    };
  }, [isSelected]);

  // Anode at -5.08, Cathode at 5.08
  const pins = [
    { name: '1', label: 'Anode (+)', x: -5.08 },
    { name: '2', label: 'Cathode (-)', x: 5.08 },
  ];

  return (
    <group position={position} rotation={rotation}>
      {/* Cylindrical DO-41 Body (approx 4.5mm length x 2.6mm dia) */}
      <mesh position={[0, 4.0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.body}>
        <cylinderGeometry args={[1.3, 1.3, 5.0, 24]} />
      </mesh>

      {/* Cathode Polarity Stripe on the positive X side */}
      <mesh position={[1.6, 4.0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.cathodeBand}>
        <cylinderGeometry args={[1.32, 1.32, 1.0, 24]} />
      </mesh>

      {/* Bent Wire Leads */}
      {pins.map((p) => {
        const isHovered = hoveredPin === p.name;
        return (
          <group key={p.name}>
            {/* Horizontal lead segment */}
            <mesh position={[p.x / 2, 4.0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.lead}>
              <cylinderGeometry args={[0.3, 0.3, Math.abs(p.x), 8]} />
            </mesh>
            {/* Vertical lead leg */}
            <mesh position={[p.x, 1.5, 0]} material={materials.lead}>
              <cylinderGeometry args={[0.3, 0.3, 5.0, 8]} />
            </mesh>
            {/* Click target */}
            <mesh
              position={[p.x, -1.0, 0]}
              material={isHovered ? materials.pinHover : materials.lead}
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
