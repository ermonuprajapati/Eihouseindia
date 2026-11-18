'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface ArduinoUno3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isSelected?: boolean;
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

export const ARDUINO_PINS: { name: string; localPos: [number, number, number]; group: 'power' | 'digital' | 'analog' }[] = [
  // Digital Header (Top)
  { name: 'D13', localPos: [16, 5, -23], group: 'digital' },
  { name: 'D12', localPos: [13.46, 5, -23], group: 'digital' },
  { name: 'D11', localPos: [10.92, 5, -23], group: 'digital' },
  { name: 'D10', localPos: [8.38, 5, -23], group: 'digital' },
  { name: 'D9', localPos: [5.84, 5, -23], group: 'digital' },
  { name: 'D8', localPos: [3.3, 5, -23], group: 'digital' },
  { name: 'D7', localPos: [-1.3, 5, -23], group: 'digital' },
  { name: 'D6', localPos: [-3.84, 5, -23], group: 'digital' },
  { name: 'D5', localPos: [-6.38, 5, -23], group: 'digital' },
  { name: 'D4', localPos: [-8.92, 5, -23], group: 'digital' },
  { name: 'D3', localPos: [-11.46, 5, -23], group: 'digital' },
  { name: 'D2', localPos: [-14.0, 5, -23], group: 'digital' },
  { name: 'TX', localPos: [-16.54, 5, -23], group: 'digital' },
  { name: 'RX', localPos: [-19.08, 5, -23], group: 'digital' },

  // Power Header (Bottom Left)
  { name: 'RESET', localPos: [-16.54, 5, 23], group: 'power' },
  { name: '3V3', localPos: [-14.0, 5, 23], group: 'power' },
  { name: '5V', localPos: [-11.46, 5, 23], group: 'power' },
  { name: 'GND_1', localPos: [-8.92, 5, 23], group: 'power' },
  { name: 'GND_2', localPos: [-6.38, 5, 23], group: 'power' },
  { name: 'VIN', localPos: [-3.84, 5, 23], group: 'power' },

  // Analog Header (Bottom Right)
  { name: 'A0', localPos: [3.3, 5, 23], group: 'analog' },
  { name: 'A1', localPos: [5.84, 5, 23], group: 'analog' },
  { name: 'A2', localPos: [8.38, 5, 23], group: 'analog' },
  { name: 'A3', localPos: [10.92, 5, 23], group: 'analog' },
  { name: 'A4', localPos: [13.46, 5, 23], group: 'analog' },
  { name: 'A5', localPos: [16.0, 5, 23], group: 'analog' },
];

export function ArduinoUno3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isSelected = false,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: ArduinoUno3DProps) {
  // Common materials
  const materials = useMemo(() => {
    return {
      pcb: new THREE.MeshStandardMaterial({
        color: isSelected ? '#00A896' : '#00979D', // Arduino turquoise
        roughness: 0.3,
        metalness: 0.1,
      }),
      usbMetal: new THREE.MeshStandardMaterial({
        color: '#D1D5DB',
        metalness: 0.85,
        roughness: 0.2,
      }),
      barrelPlastic: new THREE.MeshStandardMaterial({
        color: '#111827',
        roughness: 0.6,
      }),
      icPlastic: new THREE.MeshStandardMaterial({
        color: '#1F2937',
        roughness: 0.4,
      }),
      headerPlastic: new THREE.MeshStandardMaterial({
        color: '#0F172A',
        roughness: 0.5,
      }),
      goldPin: new THREE.MeshStandardMaterial({
        color: '#F59E0B',
        metalness: 0.9,
        roughness: 0.1,
      }),
      pinHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
    };
  }, [isSelected]);

  return (
    <group position={position} rotation={rotation}>
      {/* Selection Glow Indicator */}
      {isSelected && (
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[72, 1, 56]} />
          <meshBasicMaterial color="#38BDF8" wireframe />
        </mesh>
      )}

      {/* Main PCB Substrate (68.6mm x 53.4mm x 1.6mm) */}
      <mesh position={[0, 0.8, 0]} material={materials.pcb} castShadow receiveShadow>
        <boxGeometry args={[68.6, 1.6, 53.4]} />
      </mesh>

      {/* USB Type-B Port (Metallic silver block) */}
      <mesh position={[-28, 5.5, -14]} material={materials.usbMetal} castShadow>
        <boxGeometry args={[14, 11, 12]} />
      </mesh>

      {/* DC Barrel Jack */}
      <mesh position={[-27, 5.5, 15]} material={materials.barrelPlastic} castShadow>
        <boxGeometry args={[14, 10, 10]} />
      </mesh>

      {/* ATmega328P DIP-28 IC Package */}
      <mesh position={[8, 3.2, 8]} material={materials.icPlastic} castShadow>
        <boxGeometry args={[35, 3.5, 8.5]} />
      </mesh>

      {/* 16MHz Quartz Crystal Oscillator */}
      <mesh position={[-10, 2.5, -5]} rotation={[0, 0, Math.PI / 2]} material={materials.usbMetal}>
        <cylinderGeometry args={[2.5, 2.5, 8, 16]} />
      </mesh>

      {/* Reset Pushbutton */}
      <mesh position={[-25, 3, -2]} material={materials.headerPlastic}>
        <boxGeometry args={[6, 4, 6]} />
      </mesh>
      <mesh position={[-25, 5.2, -2]}>
        <cylinderGeometry args={[1.5, 1.5, 1, 16]} />
        <meshStandardMaterial color="#EF4444" />
      </mesh>

      {/* Female Pin Header Strips */}
      {/* Top Header Block */}
      <mesh position={[-2, 4.5, -23]} material={materials.headerPlastic} castShadow>
        <boxGeometry args={[48, 8, 3]} />
      </mesh>
      {/* Bottom Header Block */}
      <mesh position={[-1, 4.5, 23]} material={materials.headerPlastic} castShadow>
        <boxGeometry args={[46, 8, 3]} />
      </mesh>

      {/* Clickable 3D Pin Anchors with interactive hit-spheres */}
      {ARDUINO_PINS.map((pin) => {
        const isHovered = hoveredPin === pin.name;
        return (
          <group key={pin.name} position={pin.localPos}>
            {/* Header socket receptacle hole */}
            <mesh position={[0, 3.8, 0]}>
              <boxGeometry args={[1.2, 0.4, 1.2]} />
              <meshBasicMaterial color="#000000" />
            </mesh>

            {/* Clickable Pin Target Sphere */}
            <mesh
              position={[0, 4.2, 0]}
              material={isHovered ? materials.pinHover : materials.goldPin}
              onClick={(e) => {
                e.stopPropagation();
                const worldPos = new THREE.Vector3();
                e.object.getWorldPosition(worldPos);
                onPinClick?.(pin.name, worldPos);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                onHoverPin?.(pin.name);
              }}
              onPointerOut={() => onHoverPin?.(null)}
            >
              <sphereGeometry args={[isHovered ? 1.6 : 1.0, 12, 12]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
