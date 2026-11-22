'use client';

import React, { useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

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
        emissiveIntensity: 2.5,
      }),
      ledOnInactive: new THREE.MeshStandardMaterial({
        color: '#14532D',
        roughness: 0.8,
      }),
      ledLActive: new THREE.MeshStandardMaterial({
        color: '#F59E0B',
        emissive: new THREE.Color('#F59E0B'),
        emissiveIntensity: 2.0,
      }),
    };
  }, [isSelected, usbHovered]);

  const silkscreenTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 864;
    canvas.height = 356;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 864, 356);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Center branding
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('NANO V3', 520, 160);
    ctx.font = '16px monospace';
    ctx.fillText('ATmega328P', 520, 195);
    ctx.font = 'bold 13px monospace';
    ctx.fillText('PWR', 330, 160);

    const toCanvasX = (lx: number) => Math.round(((lx + 21.59) / 43.18) * 864);

    ctx.font = 'bold 15px monospace';
    NANO_PINS.forEach((pin) => {
      const cx = toCanvasX(pin.localPos[0]);
      let display = pin.name;
      if (pin.name === 'D1') display = 'TX1';
      else if (pin.name === 'D0') display = 'RX0';
      else if (pin.name.startsWith('RESET')) display = 'RST';
      else if (pin.name.startsWith('GND')) display = 'GND';

      if (pin.localPos[2] < 0) {
        // Top/Left row
        ctx.fillText(display, cx, 52);
      } else {
        // Bottom/Right row
        ctx.fillText(display, cx, 304);
      }
    });

    // Silkscreen outline rectangles around header pins
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 24, 784, 56);
    ctx.strokeRect(40, 276, 784, 56);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  useEffect(() => {
    return () => {
      silkscreenTexture?.dispose();
    };
  }, [silkscreenTexture]);

  const activePowered = isUsbPlugged || isPowered;

  return (
    <group position={position} rotation={rotation}>
      {/* PCB Substrate (43.2mm x 17.8mm x 1.6mm) */}
      <mesh position={[0, 0.8, 0]} material={materials.pcb} castShadow receiveShadow>
        <boxGeometry args={[43.2, 1.6, 17.8]} />
      </mesh>

      {/* Silkscreen Pin Labels Texture Overlay */}
      {silkscreenTexture && (
        <mesh position={[0, 1.62, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[43.0, 17.6]} />
          <meshBasicMaterial map={silkscreenTexture} transparent opacity={0.92} />
        </mesh>
      )}

      {/* Mini-USB Port */}
      <mesh
        position={[-20, 2.5, 0]}
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
        <boxGeometry args={[7.5, 4.0, 7.8]} />
      </mesh>

      {/* EI House Interactive USB Cable Plug */}
      {isUsbPlugged ? (
        <group
          position={[-20, 2.5, 0]}
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
        <pointLight position={[-5, 2.5, 4.5]} color="#22C55E" intensity={1.8} distance={25} />
      )}
      <mesh position={[-5, 1.7, -4.5]} material={activePowered ? materials.ledLActive : materials.ledOnInactive}>
        <boxGeometry args={[1.2, 0.4, 0.8]} />
      </mesh>
      {activePowered && (
        <pointLight position={[-5, 2.5, -4.5]} color="#F59E0B" intensity={1.2} distance={20} />
      )}

      {/* 30 DIP Header Pins with Recessed Sockets & Cyan Hover */}
      {NANO_PINS.map((pin) => {
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
            {/* Downward Silver Pin Leg into Breadboard Hole (extended 5.5mm length) */}
            <mesh position={[0, -2.5, 0]} material={materials.pinSilver}>
              <boxGeometry args={[0.6, 5.5, 0.6]} />
            </mesh>
            {/* Interactive Click & Hover Target with Generous Hitbox & Hover Ring */}
            {isHovered && (
              <>
                <mesh position={[0, 2.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.6, 1.4, 24]} />
                  <meshBasicMaterial color="#00F0FF" side={THREE.DoubleSide} />
                </mesh>
                <Html
                  position={[0, 6.0, 0]}
                  center
                  distanceFactor={75}
                  style={{ pointerEvents: 'none', userSelect: 'none', zIndex: 9999 }}
                >
                  <div className="px-2 py-0.5 rounded bg-slate-950/95 text-amber-300 border border-amber-400 font-mono font-bold text-[11px] shadow-2xl tracking-wider uppercase ring-1 ring-white/60 backdrop-blur-sm pointer-events-none whitespace-nowrap">
                    {pin.name}
                  </div>
                </Html>
              </>
            )}
            <mesh
              position={[0, 0.5, 0]}
              renderOrder={100}
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
              <sphereGeometry args={[1.8, 12, 12]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
