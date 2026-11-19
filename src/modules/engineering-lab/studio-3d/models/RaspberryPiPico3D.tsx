'use client';

import React, { useMemo, useState } from 'react';
import * as THREE from 'three';

export interface RaspberryPiPico3DProps {
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

export const PICO_PINS: { name: string; localPos: [number, number, number]; altNames?: string[] }[] = [
  // Left 20 pins (x = -8.89, Z from -24.13 to 24.13)
  { name: 'GP0', localPos: [-8.89, 4.3, -24.13] },
  { name: 'GP1', localPos: [-8.89, 4.3, -21.59] },
  { name: 'GND_1', localPos: [-8.89, 4.3, -19.05] },
  { name: 'GP2', localPos: [-8.89, 4.3, -16.51] },
  { name: 'GP3', localPos: [-8.89, 4.3, -13.97] },
  { name: 'GP4', localPos: [-8.89, 4.3, -11.43] },
  { name: 'GP5', localPos: [-8.89, 4.3, -8.89] },
  { name: 'GND_2', localPos: [-8.89, 4.3, -6.35] },
  { name: 'GP6', localPos: [-8.89, 4.3, -3.81] },
  { name: 'GP7', localPos: [-8.89, 4.3, -1.27] },
  { name: 'GP8', localPos: [-8.89, 4.3, 1.27] },
  { name: 'GP9', localPos: [-8.89, 4.3, 3.81] },
  { name: 'GND_3', localPos: [-8.89, 4.3, 6.35] },
  { name: 'GP10', localPos: [-8.89, 4.3, 8.89] },
  { name: 'GP11', localPos: [-8.89, 4.3, 11.43] },
  { name: 'GP12', localPos: [-8.89, 4.3, 13.97] },
  { name: 'GP13', localPos: [-8.89, 4.3, 16.51] },
  { name: 'GND_4', localPos: [-8.89, 4.3, 19.05] },
  { name: 'GP14', localPos: [-8.89, 4.3, 21.59] },
  { name: 'GP15', localPos: [-8.89, 4.3, 24.13] },

  // Right 20 pins (x = 8.89, Z from 24.13 to -24.13)
  { name: 'GP16', localPos: [8.89, 4.3, 24.13] },
  { name: 'GP17', localPos: [8.89, 4.3, 21.59] },
  { name: 'GND_5', localPos: [8.89, 4.3, 19.05] },
  { name: 'GP18', localPos: [8.89, 4.3, 16.51] },
  { name: 'GP19', localPos: [8.89, 4.3, 13.97] },
  { name: 'GP20', localPos: [8.89, 4.3, 11.43] },
  { name: 'GP21', localPos: [8.89, 4.3, 8.89] },
  { name: 'GND_6', localPos: [8.89, 4.3, 6.35] },
  { name: 'GP22', localPos: [8.89, 4.3, 3.81] },
  { name: 'RUN', localPos: [8.89, 4.3, 1.27] },
  { name: 'GP26', localPos: [8.89, 4.3, -1.27] },
  { name: 'GP27', localPos: [8.89, 4.3, -3.81] },
  { name: 'GND_7', localPos: [8.89, 4.3, -6.35] },
  { name: 'GP28', localPos: [8.89, 4.3, -8.89] },
  { name: 'ADC_VREF', localPos: [8.89, 4.3, -11.43] },
  { name: '3V3_OUT', localPos: [8.89, 4.3, -13.97] },
  { name: '3V3_EN', localPos: [8.89, 4.3, -16.51] },
  { name: 'GND_8', localPos: [8.89, 4.3, -19.05] },
  { name: 'VSYS', localPos: [8.89, 4.3, -21.59] },
  { name: 'VBUS', localPos: [8.89, 4.3, -24.13] },
];

export function RaspberryPiPico3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isSelected = false,
  isUsbPlugged = true,
  onToggleUsb,
  isPowered = true,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: RaspberryPiPico3DProps) {
  const [usbHovered, setUsbHovered] = useState(false);

  const materials = useMemo(() => {
    return {
      pcb: new THREE.MeshStandardMaterial({
        color: isSelected ? '#15803D' : '#166534', // Authentic Raspberry Pi Green
        roughness: 0.35,
        metalness: 0.1,
      }),
      usbMetal: new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        metalness: 0.9,
        roughness: 0.2,
      }),
      usbCablePvc: new THREE.MeshStandardMaterial({
        color: usbHovered ? '#38BDF8' : '#0F172A',
        roughness: 0.4,
      }),
      rp2040: new THREE.MeshStandardMaterial({
        color: '#1E293B',
        roughness: 0.3,
      }),
      goldPin: new THREE.MeshStandardMaterial({
        color: '#EAB308',
        metalness: 0.9,
        roughness: 0.1,
      }),
      pinHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
      ledOnActive: new THREE.MeshStandardMaterial({
        color: '#22C55E',
        emissive: new THREE.Color('#22C55E'),
        emissiveIntensity: 1.0,
      }),
      ledOnInactive: new THREE.MeshStandardMaterial({
        color: '#14532D',
        roughness: 0.8,
      }),
    };
  }, [isSelected, usbHovered]);

  const activePowered = isUsbPlugged || isPowered;

  return (
    <group position={position} rotation={rotation}>
      {/* Selection Glow */}
      {isSelected && (
        <mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[23, 2, 53]} />
          <meshBasicMaterial color="#38BDF8" wireframe />
        </mesh>
      )}

      {/* Main PCB Substrate (21mm x 51mm x 1.0mm) */}
      <mesh position={[0, 1.0, 0]} material={materials.pcb} castShadow receiveShadow>
        <boxGeometry args={[21, 1.0, 51]} />
      </mesh>

      {/* RP2040 Dual-Core MCU (7mm x 7mm QFN-56) */}
      <mesh position={[0, 1.8, 3]} material={materials.rp2040} castShadow>
        <boxGeometry args={[7, 0.8, 7]} />
      </mesh>

      {/* SPI Flash Memory IC */}
      <mesh position={[0, 1.7, -7]} material={materials.rp2040} castShadow>
        <boxGeometry args={[5, 0.7, 5]} />
      </mesh>

      {/* Micro-USB Port on Top Edge */}
      <mesh
        position={[0, 2.2, -24.5]}
        material={materials.usbMetal}
        castShadow
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
        <boxGeometry args={[7.5, 3.0, 6]} />
      </mesh>

      {/* Interactive Micro-USB Cable Plug */}
      {isUsbPlugged && (
        <group
          position={[0, 2.2, -27]}
          onClick={(e) => {
            e.stopPropagation();
            onToggleUsb?.();
          }}
        >
          <mesh position={[0, 0, -3]} material={materials.usbMetal}>
            <boxGeometry args={[6.5, 2.2, 5]} />
          </mesh>
          <mesh position={[0, 0, -8]} material={materials.usbCablePvc}>
            <boxGeometry args={[9, 4, 8]} />
          </mesh>
          <mesh position={[0, 0, -18]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1.8, 1.8, 16, 12]} />
            <primitive object={materials.usbCablePvc} attach="material" />
          </mesh>
        </group>
      )}

      {/* BOOTSEL Tactile Switch */}
      <mesh position={[-4, 2.0, -14]}>
        <boxGeometry args={[3, 1.2, 3]} />
        <meshStandardMaterial color="#CBD5E1" />
      </mesh>
      <mesh position={[-4, 2.7, -14]}>
        <cylinderGeometry args={[0.8, 0.8, 0.4, 12]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>

      {/* Onboard User LED (GP25) */}
      <mesh position={[-5, 1.7, -21]} material={activePowered ? materials.ledOnActive : materials.ledOnInactive}>
        <boxGeometry args={[1.2, 0.5, 0.8]} />
      </mesh>
      {activePowered && (
        <pointLight position={[-5, 2.5, -21]} color="#22C55E" intensity={0.4} distance={15} />
      )}

      {/* Male Pin Header Strips & Receptacles (2 x 20 pins) */}
      {PICO_PINS.map((pin) => {
        const isHovered = hoveredPin === pin.name;
        return (
          <group key={pin.name} position={pin.localPos}>
            {/* Header Pin Body */}
            <mesh position={[0, -2.5, 0]} material={materials.goldPin}>
              <cylinderGeometry args={[0.32, 0.32, 6, 8]} />
            </mesh>
            {/* Pin Clickable Target Sphere */}
            <mesh
              position={[0, 0.5, 0]}
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
              <sphereGeometry args={[isHovered ? 1.4 : 0.85, 12, 12]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
