'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface SlideSwitch3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isSelected?: boolean;
  isOn?: boolean;
  onToggle?: () => void;
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

export function SlideSwitch3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isSelected = false,
  isOn = false,
  onToggle,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: SlideSwitch3DProps) {
  const materials = useMemo(() => {
    return {
      bodyMetal: new THREE.MeshStandardMaterial({
        color: isSelected ? '#38BDF8' : '#D1D5DB', // Silver metal switch bracket
        metalness: 0.8,
        roughness: 0.3,
      }),
      sliderPlastic: new THREE.MeshStandardMaterial({
        color: '#18181B', // Black molded slider knob
        roughness: 0.4,
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

  // 3 Pins: Pin 1 (at -2.54), Common Pin 2 (at 0), Pin 3 (at 2.54)
  const pins = [
    { name: '1', x: -2.54 },
    { name: '2', x: 0 },
    { name: '3', x: 2.54 },
  ];

  const sliderOffset = isOn ? 1.8 : -1.8;

  return (
    <group position={position} rotation={rotation}>
      {/* Silver Metal Bracket Housing (8.5mm x 4.0mm x 4.0mm) */}
      <mesh position={[0, 4.0, 0]} material={materials.bodyMetal} castShadow>
        <boxGeometry args={[8.5, 4.0, 4.0]} />
      </mesh>

      {/* Interactive Sliding Lever */}
      <mesh
        position={[sliderOffset, 7.0, 0]}
        material={materials.sliderPlastic}
        onClick={(e) => {
          e.stopPropagation();
          onToggle?.();
        }}
      >
        <boxGeometry args={[2.0, 3.0, 2.0]} />
      </mesh>

      {/* 3 Pins */}
      {pins.map((p) => {
        const isHovered = hoveredPin === p.name;
        return (
          <group key={p.name} position={[p.x, 0, 0]}>
            <mesh position={[0, 1.0, 0]} material={materials.pinSilver}>
              <cylinderGeometry args={[0.3, 0.3, 4.0, 8]} />
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
