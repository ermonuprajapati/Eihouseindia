'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface Buzzer3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isSelected?: boolean;
  isSounding?: boolean;
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

export function Buzzer3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isSelected = false,
  isSounding = false,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: Buzzer3DProps) {
  const materials = useMemo(() => {
    return {
      body: new THREE.MeshStandardMaterial({
        color: isSelected ? '#38BDF8' : '#18181B', // Black cylindrical housing
        roughness: 0.35,
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
      pinSilver: new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        metalness: 0.9,
        roughness: 0.2,
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
      pinHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
    };
  }, [isSelected]);

  return (
    <group position={position} rotation={rotation}>
      {/* Black Piezo Transducer Cylinder Body (12mm dia x 9.5mm height) */}
      <mesh position={[0, 4.75, 0]} material={materials.body} castShadow>
        <cylinderGeometry args={[6.0, 6.0, 9.5, 32]} />
      </mesh>

      {/* Top Acoustic Hole Aperture */}
      <mesh position={[0, 9.55, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 0.2, 16]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Plus (+) Polarity Mark */}
      <mesh position={[-3.5, 9.55, 0]}>
        <boxGeometry args={[1.6, 0.1, 0.4]} />
        <meshBasicMaterial color="#EF4444" />
      </mesh>
      <mesh position={[-3.5, 9.55, 0]}>
        <boxGeometry args={[0.4, 0.1, 1.6]} />
        <meshBasicMaterial color="#EF4444" />
      </mesh>

      {/* Visual Sound Wave Pulse Indicator */}
      {isSounding && (
        <mesh position={[0, 12.0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.5, 4.0, 24]} />
          <meshBasicMaterial color="#38BDF8" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 2 Pins: + (Positive) at -2.54, - (Negative/GND) at 2.54 */}
      {[
        { name: '+', x: -2.54 },
        { name: '-', x: 2.54 },
      ].map((p) => {
        const isHovered = hoveredPin === p.name;
        return (
          <group key={p.name} position={[p.x, 0, 0]}>
            <mesh position={[0, -2.5, 0]} material={materials.pinSilver}>
              <cylinderGeometry args={[0.35, 0.35, 6.0, 8]} />
            </mesh>
            <mesh
              position={[0, 0, 0]}
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
