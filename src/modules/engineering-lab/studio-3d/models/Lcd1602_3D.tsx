'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface Lcd1602_3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isSelected?: boolean;
  isPowered?: boolean;
  displayText?: string;
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

// 16 Standard HD44780 Pins
export const LCD_PINS = [
  'VSS', 'VDD', 'V0', 'RS', 'RW', 'E',
  'D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7',
  'A', 'K'
];

export function Lcd1602_3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isSelected = false,
  isPowered = true,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: Lcd1602_3DProps) {
  const materials = useMemo(() => {
    return {
      pcb: new THREE.MeshStandardMaterial({
        color: isSelected ? '#059669' : '#14532D', // Industrial green PCB
        roughness: 0.4,
      }),
      bezel: new THREE.MeshStandardMaterial({
        color: '#0F172A', // Matte black stamped metal bezel
        roughness: 0.3,
        metalness: 0.6,
      }),
      lcdBacklightActive: new THREE.MeshStandardMaterial({
        color: '#0284C7', // Vivid blue 1602 LCD backlight
        emissive: new THREE.Color('#0284C7'),
        emissiveIntensity: 0.7,
        roughness: 0.1,
      }),
      lcdBacklightOff: new THREE.MeshStandardMaterial({
        color: '#0C4A6E',
        roughness: 0.8,
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

  return (
    <group position={position} rotation={rotation}>
      {/* PCB (80mm x 36mm x 1.6mm) */}
      <mesh position={[0, 18.0, 0]} material={materials.pcb} castShadow receiveShadow>
        <boxGeometry args={[80.0, 36.0, 1.6]} />
      </mesh>

      {/* Metal Bezel Frame */}
      <mesh position={[0, 18.0, 2.5]} material={materials.bezel}>
        <boxGeometry args={[71.0, 24.0, 3.5]} />
      </mesh>

      {/* Glowing 16x2 Backlit Display Glass */}
      <mesh position={[0, 18.0, 4.3]} material={isPowered ? materials.lcdBacklightActive : materials.lcdBacklightOff}>
        <boxGeometry args={[64.5, 16.0, 0.4]} />
      </mesh>

      {/* Backlight glow */}
      {isPowered && (
        <pointLight position={[0, 18.0, 8.0]} color="#38BDF8" intensity={0.4} distance={30} />
      )}

      {/* 16-Pin Header at Top Edge */}
      <group position={[-25, 34, 0]}>
        {LCD_PINS.map((pinName, i) => {
          const isHovered = hoveredPin === pinName;
          const px = -19.05 + i * 2.54;
          return (
            <group key={pinName} position={[px, 0, 0]}>
              <mesh material={materials.pinSilver}>
                <cylinderGeometry args={[0.35, 0.35, 4.0, 8]} />
              </mesh>
              <mesh
                position={[0, 2.5, 0]}
                material={isHovered ? materials.pinHover : materials.pinSilver}
                onClick={(e) => {
                  e.stopPropagation();
                  const worldPos = new THREE.Vector3();
                  e.object.getWorldPosition(worldPos);
                  onPinClick?.(pinName, worldPos);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  onHoverPin?.(pinName);
                }}
                onPointerOut={() => onHoverPin?.(null)}
              >
                <sphereGeometry args={[isHovered ? 1.4 : 0.8, 8, 8]} />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}
