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
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
      sliderPlastic: new THREE.MeshStandardMaterial({
        color: '#18181B', // Black molded slider knob
        roughness: 0.4,
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
      pinSilver: new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
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
            {/* Metallic Lead Leg extending down into breadboard */}
            <mesh position={[0, -0.5, 0]} material={materials.pinSilver}>
              <cylinderGeometry args={[0.3, 0.3, 5.0, 8]} />
            </mesh>
            {/* Terminal Sphere with Generous Hit-Sphere & Hover Ring */}
            <mesh
              position={[0, 0, 0]}
              material={isHovered ? materials.pinHover : materials.pinSilver}
            >
              <sphereGeometry args={[isHovered ? 0.9 : 0.6, 12, 12]} />
            </mesh>
            {isHovered && (
              <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.5, 1.3, 24]} />
                <meshBasicMaterial color="#38BDF8" side={THREE.DoubleSide} />
              </mesh>
            )}
            <mesh
              position={[0, 0, 0]}
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
              <sphereGeometry args={[1.8, 12, 12]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
