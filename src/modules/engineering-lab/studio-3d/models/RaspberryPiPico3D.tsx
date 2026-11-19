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
        emissiveIntensity: 2.5,
      }),
      ledOnInactive: new THREE.MeshStandardMaterial({
        color: '#14532D',
        roughness: 0.8,
      }),
    };
  }, [isSelected, usbHovered]);

  const silkscreenTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 420;
    canvas.height = 1020;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 420, 1020);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Board Branding
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('Raspberry Pi', 210, 510);
    ctx.font = 'bold 22px monospace';
    ctx.fillText('Pico (RP2040)', 210, 545);

    // Left row pin labels (from top to bottom)
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    const leftNames = [
      'GP0', 'GP1', 'GND', 'GP2', 'GP3', 'GP4', 'GP5', 'GND',
      'GP6', 'GP7', 'GP8', 'GP9', 'GND', 'GP10', 'GP11', 'GP12',
      'GP13', 'GND', 'GP14', 'GP15'
    ];
    leftNames.forEach((name, i) => {
      const y = 50 + i * 48;
      ctx.fillText(name, 35, y);
    });

    // Right row pin labels (from bottom to top)
    ctx.textAlign = 'right';
    const rightNames = [
      'GP16', 'GP17', 'GND', 'GP18', 'GP19', 'GP20', 'GP21', 'GND',
      'GP22', 'RUN', 'GP26', 'GP27', 'GND', 'GP28', 'ADC_REF', '3V3',
      '3V3_EN', 'GND', 'VSYS', 'VBUS'
    ];
    rightNames.forEach((name, i) => {
      const y = 962 - i * 48;
      ctx.fillText(name, 385, y);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

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

      {/* Silkscreen Pin Labels Texture Overlay */}
      {silkscreenTexture && (
        <mesh position={[0, 1.52, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[20.8, 50.8]} />
          <meshBasicMaterial map={silkscreenTexture} transparent opacity={0.92} />
        </mesh>
      )}

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
        onPointerDown={(e) => e.stopPropagation()}
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
          onPointerDown={(e) => e.stopPropagation()}
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
        <pointLight position={[-5, 2.5, -21]} color="#22C55E" intensity={1.8} distance={25} />
      )}

      {/* Header Receptacles with Recessed Sockets & Cyan Hover (2 x 20 pins) */}
      {PICO_PINS.map((pin) => {
        const isHovered = hoveredPin === pin.name;
        return (
          <group key={pin.name} position={pin.localPos}>
            {/* Black Plastic Header Housing */}
            <mesh position={[0, 1.2, 0]}>
              <boxGeometry args={[2.4, 2.2, 2.4]} />
              <meshStandardMaterial color="#0B0F19" roughness={0.6} metalness={0.1} />
            </mesh>
            {/* Recessed Square Socket Opening */}
            <mesh position={[0, 2.25, 0]}>
              <boxGeometry args={[1.2, 0.4, 1.2]} />
              <meshBasicMaterial color="#09090B" />
            </mesh>
            {/* Glowing Cyan Hover Rim Indicator */}
            {isHovered && (
              <mesh position={[0, 2.35, 0]}>
                <boxGeometry args={[2.3, 0.15, 2.3]} />
                <meshBasicMaterial color="#00F0FF" />
              </mesh>
            )}
            {/* Downward Silver Pin Leg into Breadboard Hole */}
            <mesh position={[0, -1.8, 0]}>
              <boxGeometry args={[0.6, 4.0, 0.6]} />
              <meshStandardMaterial color="#CBD5E1" metalness={0.9} roughness={0.2} />
            </mesh>
            {/* Interactive Click & Hover Target */}
            <mesh
              position={[0, 0.5, 0]}
              onPointerDown={(e) => e.stopPropagation()}
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
              <boxGeometry args={[2.4, 6.0, 2.4]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
