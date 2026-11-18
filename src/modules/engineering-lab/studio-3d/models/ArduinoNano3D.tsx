'use client';

import React, { useMemo, useState } from 'react';
import * as THREE from 'three';

export interface ArduinoNano3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isSelected?: boolean;
  isUsbPlugged?: boolean;
  onToggleUsb?: () => void;
  isPowered?: boolean;
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}

// 30 DIP pins for Arduino Nano V3
export const NANO_PINS: { name: string; localPos: [number, number, number] }[] = [
  // Left Row (Pins 1..15: D1/TX, D0/RX, RST, GND, D2, D3, D4, D5, D6, D7, D8, D9, D10, D11, D12)
  ...[
    'D1', 'D0', 'RESET', 'GND_1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12'
  ].map((name, i) => ({
    name,
    localPos: [-17.78 + i * 2.54, -2.5, -7.62] as [number, number, number],
  })),
  // Right Row (Pins 16..30: D13, 3V3, AREF, A0, A1, A2, A3, A4, A5, A6, A7, 5V, RST, GND, VIN)
  ...[
    'VIN', 'GND_2', 'RESET_2', '5V', 'A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'A1', 'A0', 'AREF', '3V3', 'D13'
  ].map((name, i) => ({
    name,
    localPos: [17.78 - i * 2.54, -2.5, 7.62] as [number, number, number],
  })),
];

export function ArduinoNano3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isSelected = false,
  isUsbPlugged = true,
  onToggleUsb,
  isPowered = true,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: ArduinoNano3DProps) {
  const [usbHovered, setUsbHovered] = useState(false);

  const materials = useMemo(() => {
    return {
      pcb: new THREE.MeshStandardMaterial({
        color: isSelected ? '#00A896' : '#007AA6', // Classic Nano blue
        roughness: 0.3,
        metalness: 0.1,
      }),
      usbMetal: new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        metalness: 0.9,
        roughness: 0.2,
      }),
      usbCablePvc: new THREE.MeshStandardMaterial({
        color: usbHovered ? '#38BDF8' : '#0284C7',
        roughness: 0.4,
      }),
      icPlastic: new THREE.MeshStandardMaterial({
        color: '#1E293B',
        roughness: 0.5,
      }),
      pinSilver: new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        metalness: 0.9,
        roughness: 0.2,
      }),
      pinHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
      ledOnActive: new THREE.MeshStandardMaterial({
        color: '#22C55E',
        emissive: new THREE.Color('#22C55E'),
        emissiveIntensity: 0.9,
      }),
      ledOnInactive: new THREE.MeshStandardMaterial({
        color: '#14532D',
        roughness: 0.8,
      }),
      ledLActive: new THREE.MeshStandardMaterial({
        color: '#F59E0B',
        emissive: new THREE.Color('#F59E0B'),
        emissiveIntensity: 0.8,
      }),
    };
  }, [isSelected, usbHovered]);

  const activePowered = isUsbPlugged || isPowered;

  return (
    <group position={position} rotation={rotation}>
      {/* PCB Substrate (43.2mm x 17.8mm x 1.6mm) */}
      <mesh position={[0, 0.8, 0]} material={materials.pcb} castShadow receiveShadow>
        <boxGeometry args={[43.2, 1.6, 17.8]} />
      </mesh>

      {/* Mini-USB Port */}
      <mesh
        position={[-20, 2.5, 0]}
        material={materials.usbMetal}
        onClick={(e) => {
          e.stopPropagation();
          onToggleUsb?.();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setUsbHovered(true);
        }}
        onPointerOut={() => setUsbHovered(false)}
      >
        <boxGeometry args={[7.5, 4.0, 7.8]} />
      </mesh>

      {/* Wokwi-Style USB Cable Plug */}
      {isUsbPlugged ? (
        <group
          position={[-20, 2.5, 0]}
          onClick={(e) => {
            e.stopPropagation();
            onToggleUsb?.();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setUsbHovered(true);
          }}
          onPointerOut={() => setUsbHovered(false)}
        >
          <mesh position={[-6, 0, 0]} material={materials.usbMetal}>
            <boxGeometry args={[5, 3.8, 7.2]} />
          </mesh>
          <mesh position={[-14, 0, 0]} material={materials.usbCablePvc}>
            <boxGeometry args={[11, 6.0, 9.0]} />
          </mesh>
          <mesh position={[-25, -1, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.usbCablePvc}>
            <cylinderGeometry args={[2.0, 2.0, 14, 16]} />
          </mesh>
        </group>
      ) : (
        <mesh
          position={[-32, 1.5, 0]}
          material={materials.usbCablePvc}
          onClick={(e) => {
            e.stopPropagation();
            onToggleUsb?.();
          }}
        >
          <boxGeometry args={[8, 5.0, 8.0]} />
        </mesh>
      )}

      {/* ATmega328P QFP-32 square IC */}
      <mesh position={[3, 1.8, 0]} material={materials.icPlastic}>
        <boxGeometry args={[7.5, 1.2, 7.5]} />
      </mesh>

      {/* 16MHz Crystal */}
      <mesh position={[-8, 1.6, 0]} material={materials.usbMetal}>
        <boxGeometry args={[4.5, 1.0, 3.0]} />
      </mesh>

      {/* Reset button in middle */}
      <mesh position={[14, 2.2, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 1.2, 16]} />
        <meshStandardMaterial color="#EF4444" />
      </mesh>

      {/* Power & Pin 13 LEDs */}
      <mesh position={[-5, 1.7, 4.5]} material={activePowered ? materials.ledOnActive : materials.ledOnInactive}>
        <boxGeometry args={[1.2, 0.4, 0.8]} />
      </mesh>
      {activePowered && (
        <pointLight position={[-5, 2.5, 4.5]} color="#22C55E" intensity={0.5} distance={15} />
      )}
      <mesh position={[-5, 1.7, -4.5]} material={activePowered ? materials.ledLActive : materials.ledOnInactive}>
        <boxGeometry args={[1.2, 0.4, 0.8]} />
      </mesh>

      {/* 30 DIP Header Pins extending downwards */}
      {NANO_PINS.map((pin) => {
        const isHovered = hoveredPin === pin.name;
        return (
          <group key={pin.name} position={pin.localPos}>
            {/* Square pin base */}
            <mesh position={[0, 1.5, 0]}>
              <boxGeometry args={[2.0, 2.0, 2.0]} />
              <meshStandardMaterial color="#0F172A" />
            </mesh>
            {/* Pin leg */}
            <mesh position={[0, -1.5, 0]} material={materials.pinSilver}>
              <boxGeometry args={[0.6, 5.0, 0.6]} />
            </mesh>
            {/* Click target sphere */}
            <mesh
              position={[0, 1.8, 0]}
              material={isHovered ? materials.pinHover : materials.pinSilver}
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
              <sphereGeometry args={[isHovered ? 1.4 : 0.8, 10, 10]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
