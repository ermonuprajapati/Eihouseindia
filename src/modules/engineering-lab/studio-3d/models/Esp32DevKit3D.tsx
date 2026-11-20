'use client';

import React, { useMemo, useState } from 'react';
import * as THREE from 'three';

export interface Esp32DevKit3DProps {
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

export const ESP32_PINS: { name: string; localPos: [number, number, number] }[] = [
  // Left Header (15 pins: EN, VP, VN, D34, D35, D32, D33, D25, D26, D27, D14, D12, D13, GND_1, VIN)
  ...[
    'EN', 'VP', 'VN', 'D34', 'D35', 'D32', 'D33', 'D25', 'D26', 'D27', 'D14', 'D12', 'D13', 'GND_1', 'VIN'
  ].map((name, i) => ({
    name,
    localPos: [-17.78 + i * 2.54, -2.5, -11.43] as [number, number, number],
  })),
  // Right Header (15 pins: 3V3, GND_2, D15, D2, D4, RX2, TX2, D5, D18, D19, D21, RX0, TX0, D22, D23)
  ...[
    'D23', 'D22', 'TX0', 'RX0', 'D21', 'D19', 'D18', 'D5', 'TX2', 'RX2', 'D4', 'D2', 'D15', 'GND_2', '3V3'
  ].map((name, i) => ({
    name,
    localPos: [17.78 - i * 2.54, -2.5, 11.43] as [number, number, number],
  })),
];

export function Esp32DevKit3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isSelected = false,
  isUsbPlugged = true,
  onToggleUsb,
  isPowered = true,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: Esp32DevKit3DProps) {
  const [usbHovered, setUsbHovered] = useState(false);

  const materials = useMemo(() => {
    return {
      pcb: new THREE.MeshStandardMaterial({
        color: isSelected ? '#1E293B' : '#0F172A', // Sleek ESP32 Matte Black
        roughness: 0.35,
        metalness: 0.1,
      }),
      rfShield: new THREE.MeshStandardMaterial({
        color: '#D1D5DB', // Silver metal can RF cover
        metalness: 0.85,
        roughness: 0.25,
      }),
      antenna: new THREE.MeshStandardMaterial({
        color: '#991B1B', // Red serpentine PCB trace
        roughness: 0.5,
      }),
      usbMetal: new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        metalness: 0.9,
        roughness: 0.2,
      }),
      usbCablePvc: new THREE.MeshStandardMaterial({
        color: usbHovered ? '#38BDF8' : '#1E293B',
        roughness: 0.4,
      }),
      pinSilver: new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        metalness: 0.9,
        roughness: 0.2,
      }),
      pinHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
      ledPwrActive: new THREE.MeshStandardMaterial({
        color: '#EF4444', // Red power LED on ESP32
        emissive: new THREE.Color('#EF4444'),
        emissiveIntensity: 2.5,
      }),
      ledInactive: new THREE.MeshStandardMaterial({
        color: '#7F1D1D',
        roughness: 0.8,
      }),
    };
  }, [isSelected, usbHovered]);

  const silkscreenTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 570;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 1024, 570);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Branding
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('ESP32 DEVKIT V1', 400, 260);
    ctx.font = '16px monospace';
    ctx.fillText('DOIT / NodeMCU 30-Pin', 400, 300);

    // Left row pin labels
    ctx.font = 'bold 15px monospace';
    const leftLabels = ['EN', 'VP', 'VN', '34', '35', '32', '33', '25', '26', '27', '14', '12', '13', 'GND', 'VIN'];
    leftLabels.forEach((lbl, i) => {
      const x = 70 + i * 62;
      ctx.fillText(lbl, x, 40);
    });

    // Right row pin labels
    const rightLabels = ['3V3', 'GND', 'D15', 'D2', 'D4', 'RX2', 'TX2', 'D5', 'D18', 'D19', 'D21', 'RX0', 'TX0', 'D22', 'D23'];
    rightLabels.forEach((lbl, i) => {
      const x = 70 + i * 62;
      ctx.fillText(lbl, x, 530);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  const activePowered = isUsbPlugged || isPowered;

  return (
    <group position={position} rotation={rotation}>
      {/* ESP32 Board PCB (51.5mm x 28.5mm x 1.6mm) */}
      <mesh position={[0, 0.8, 0]} material={materials.pcb} castShadow receiveShadow>
        <boxGeometry args={[51.5, 1.6, 28.5]} />
      </mesh>

      {/* Silkscreen Pin Labels Texture Overlay */}
      {silkscreenTexture && (
        <mesh position={[0, 1.62, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[51.2, 28.2]} />
          <meshBasicMaterial map={silkscreenTexture} transparent opacity={0.92} />
        </mesh>
      )}

      {/* ESP-WROOM-32 Metallic RF Shield */}
      <mesh position={[8, 2.5, 0]} material={materials.rfShield} castShadow>
        <boxGeometry args={[18.0, 3.0, 16.0]} />
      </mesh>
      {/* Onboard PCB Meandered Inverted-F Antenna (MIFA) */}
      <mesh position={[21, 1.0, 0]} material={materials.antenna}>
        <boxGeometry args={[6.5, 0.4, 16.0]} />
      </mesh>

      {/* Micro-USB Port */}
      <mesh
        position={[-23, 2.5, 0]}
        material={materials.usbMetal}
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
        <boxGeometry args={[6.0, 3.2, 7.5]} />
      </mesh>

      {/* EI House Interactive USB Micro Cable Plug */}
      {isUsbPlugged ? (
        <group
          position={[-23, 2.5, 0]}
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
          <mesh position={[-5, 0, 0]} material={materials.usbMetal}>
            <boxGeometry args={[4.5, 2.8, 6.8]} />
          </mesh>
          <mesh position={[-14, 0, 0]} material={materials.usbCablePvc}>
            <boxGeometry args={[13, 6.0, 10.0]} />
          </mesh>
          <mesh position={[-25, -1, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.usbCablePvc}>
            <cylinderGeometry args={[2.0, 2.0, 14, 16]} />
          </mesh>
        </group>
      ) : (
        <mesh
          position={[-35, 1.5, 0]}
          material={materials.usbCablePvc}
          onClick={(e) => {
            e.stopPropagation();
            onToggleUsb?.();
          }}
        >
          <boxGeometry args={[8, 5.0, 8.0]} />
        </mesh>
      )}

      {/* EN & BOOT Tactile Buttons */}
      <mesh position={[-20, 2.2, -8]}>
        <boxGeometry args={[3.5, 1.8, 3.0]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.8} />
      </mesh>
      <mesh position={[-20, 2.2, 8]}>
        <boxGeometry args={[3.5, 1.8, 3.0]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.8} />
      </mesh>

      {/* Red Power LED */}
      <mesh position={[-12, 1.8, -5]} material={activePowered ? materials.ledPwrActive : materials.ledInactive}>
        <boxGeometry args={[1.2, 0.4, 0.8]} />
      </mesh>
      {activePowered && (
        <pointLight position={[-12, 2.8, -5]} color="#EF4444" intensity={1.8} distance={25} />
      )}

      {/* 30 Header Pins with Recessed Sockets & Cyan Hover */}
      {ESP32_PINS.map((pin) => {
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
            <mesh position={[0, -1.8, 0]} material={materials.pinSilver}>
              <boxGeometry args={[0.6, 4.0, 0.6]} />
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
