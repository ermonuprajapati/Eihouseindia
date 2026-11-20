'use client';

import React, { useMemo, useState } from 'react';
import * as THREE from 'three';

export interface ArduinoUno3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isSelected?: boolean;
  isUsbPlugged?: boolean;
  isDcJackPlugged?: boolean;
  onToggleUsb?: () => void;
  isPowered?: boolean;
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
  isUsbPlugged = true,
  isDcJackPlugged = false,
  onToggleUsb,
  isPowered = true,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: ArduinoUno3DProps) {
  const [usbHovered, setUsbHovered] = useState(false);

  // Smooth continuous CatmullRomCurve3 USB Cable Tube
  const usbCableTubeGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-14, 0, 0),
      new THREE.Vector3(-22, -0.5, -0.5),
      new THREE.Vector3(-36, -2.0, -2.0),
      new THREE.Vector3(-52, -4.0, -6.0),
      new THREE.Vector3(-75, -5.2, -15.0),
      new THREE.Vector3(-105, -5.2, -30.0),
    ]);
    return new THREE.TubeGeometry(curve, 32, 2.2, 12, false);
  }, []);

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
      usbPlugMetal: new THREE.MeshStandardMaterial({
        color: '#E2E8F0',
        metalness: 0.9,
        roughness: 0.15,
      }),
      usbCablePvc: new THREE.MeshStandardMaterial({
        color: usbHovered ? '#38BDF8' : '#0284C7', // Arduino blue cable jacket
        roughness: 0.4,
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
        emissiveIntensity: 0.8,
      }),
      ledLInactive: new THREE.MeshStandardMaterial({
        color: '#78350F',
        roughness: 0.8,
      }),
    };
  }, [isSelected, usbHovered]);

  const silkscreenTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 1024, 768);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Board branding
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText('ARDUINO', 512, 280);
    ctx.font = 'bold 30px monospace';
    ctx.fillText('UNO R3', 512, 330);

    // Top Header Labels (AREF..RX<0)
    ctx.font = 'bold 22px monospace';
    const topPins = [
      { text: 'SCL', x: 235 },
      { text: 'SDA', x: 275 },
      { text: 'AREF', x: 315 },
      { text: 'GND', x: 355 },
      { text: '13', x: 395 },
      { text: '12', x: 435 },
      { text: '~11', x: 475 },
      { text: '~10', x: 515 },
      { text: '~9', x: 555 },
      { text: '8', x: 595 },
      { text: '7', x: 655 },
      { text: '~6', x: 695 },
      { text: '~5', x: 735 },
      { text: '4', x: 775 },
      { text: '~3', x: 815 },
      { text: '2', x: 855 },
      { text: 'TX>1', x: 895 },
      { text: 'RX<0', x: 940 },
    ];
    topPins.forEach((p) => ctx.fillText(p.text, p.x, 85));

    // Bottom Header Labels (IOREF..A5)
    const btmPins = [
      { text: 'IOREF', x: 235 },
      { text: 'RESET', x: 285 },
      { text: '3.3V', x: 335 },
      { text: '5V', x: 385 },
      { text: 'GND', x: 435 },
      { text: 'GND', x: 485 },
      { text: 'VIN', x: 535 },
      { text: 'A0', x: 645 },
      { text: 'A1', x: 695 },
      { text: 'A2', x: 745 },
      { text: 'A3', x: 795 },
      { text: 'A4', x: 845 },
      { text: 'A5', x: 895 },
    ];
    btmPins.forEach((p) => ctx.fillText(p.text, p.x, 680));

    // Pin header box outlines
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.strokeRect(210, 45, 750, 75);
    ctx.strokeRect(210, 645, 710, 75);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  const activePowered = isUsbPlugged || isDcJackPlugged || isPowered;

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

      {/* High-Resolution White Silkscreen Face Overlay */}
      {silkscreenTexture && (
        <mesh position={[0, 1.62, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[68.0, 52.8]} />
          <meshBasicMaterial map={silkscreenTexture} transparent opacity={0.92} />
        </mesh>
      )}

      {/* USB Type-B Port on Board (Metallic silver block) */}
      <mesh
        position={[-28, 5.5, -14]}
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
        <boxGeometry args={[14, 11, 12]} />
      </mesh>

      {/* EI House Interactive USB Type-B Cable Plug */}
      {isUsbPlugged ? (
        <group
          position={[-28, 5.5, -14]}
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
          {/* Nickel Shroud Plug entering socket */}
          <mesh position={[-3, 0, 0]} material={materials.usbPlugMetal}>
            <boxGeometry args={[6, 9.5, 10.5]} />
          </mesh>
          {/* Molded Blue PVC Plug Body */}
          <mesh position={[-10, 0, 0]} material={materials.usbCablePvc} castShadow>
            <boxGeometry args={[10, 11, 12]} />
          </mesh>
          {/* Strain Relief Boot Collar */}
          <mesh position={[-15, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.usbCablePvc}>
            <cylinderGeometry args={[3.2, 4.2, 4, 16]} />
          </mesh>
          {/* Continuous Flexible Blue USB Cable trailing across workbench */}
          <mesh geometry={usbCableTubeGeo} material={materials.usbCablePvc} castShadow />
        </group>
      ) : (
        /* Unplugged USB cable resting near socket - click to plug in */
        <group
          position={[-50, 2.5, -14]}
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
          <mesh position={[0, 0, 0]} material={materials.usbPlugMetal}>
            <boxGeometry args={[6, 9.5, 10.5]} />
          </mesh>
          <mesh position={[-9, 0, 0]} material={materials.usbCablePvc}>
            <boxGeometry args={[12, 11, 12]} />
          </mesh>
        </group>
      )}

      {/* DC Barrel Jack */}
      <mesh position={[-27, 5.5, 15]} material={materials.barrelPlastic} castShadow>
        <boxGeometry args={[14, 10, 10]} />
      </mesh>
      <mesh position={[-34.1, 5.5, 15]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[4.2, 4.2, 0.4, 24]} />
        <meshStandardMaterial color="#0A0A0A" />
      </mesh>
      {/* DC Barrel Jack Cable Plug when active */}
      {isDcJackPlugged && (
        <group position={[-27, 5.5, 15]}>
          <mesh position={[-8, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.usbPlugMetal}>
            <cylinderGeometry args={[2.7, 2.7, 7, 16]} />
          </mesh>
          <mesh position={[-16, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[4.5, 4.5, 12, 16]} />
            <meshStandardMaterial color="#111827" roughness={0.5} />
          </mesh>
          <mesh position={[-32, -3, 0]} rotation={[0, 0, Math.PI / 3]}>
            <cylinderGeometry args={[2.2, 2.2, 24, 12]} />
            <meshStandardMaterial color="#111827" roughness={0.4} />
          </mesh>
        </group>
      )}

      {/* ATmega328P DIP-28 IC Package */}
      <mesh position={[8, 3.2, 8]} material={materials.icPlastic} castShadow>
        <boxGeometry args={[35, 3.5, 8.5]} />
      </mesh>

      {/* 16MHz Quartz Crystal Oscillator */}
      <mesh position={[-10, 2.5, -5]} rotation={[0, 0, Math.PI / 2]} material={materials.usbMetal}>
        <cylinderGeometry args={[2.5, 2.5, 8, 16]} />
      </mesh>

      {/* Surface Mount LEDs */}
      {/* 1. ON (Power) LED at [-14, 2.0, -8] */}
      <mesh position={[-14, 1.8, -8]} material={activePowered ? materials.ledOnActive : materials.ledOnInactive}>
        <boxGeometry args={[1.6, 0.6, 0.8]} />
      </mesh>
      {activePowered && (
        <pointLight position={[-14, 3.0, -8]} color="#22C55E" intensity={1.8} distance={30} />
      )}

      {/* 2. L (Pin 13) Builtin Amber LED at [12, 1.8, -16] */}
      <mesh position={[12, 1.8, -16]} material={activePowered ? materials.ledLActive : materials.ledLInactive}>
        <boxGeometry args={[1.6, 0.6, 0.8]} />
      </mesh>
      {activePowered && (
        <pointLight position={[12, 3.0, -16]} color="#F59E0B" intensity={0.4} distance={20} />
      )}

      {/* TX / RX SMD LEDs */}
      <mesh position={[-14, 1.8, -13]} material={materials.ledLInactive}>
        <boxGeometry args={[1.2, 0.5, 0.8]} />
      </mesh>
      <mesh position={[-14, 1.8, -15]} material={materials.ledLInactive}>
        <boxGeometry args={[1.2, 0.5, 0.8]} />
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

      {/* Clickable 3D Pin Anchors with Authentic Female Receptacle Sockets */}
      {ARDUINO_PINS.map((pin) => {
        const isHovered = hoveredPin === pin.name;
        return (
          <group key={pin.name} position={pin.localPos}>
            {/* Dark recessed female header receptacle socket */}
            <mesh position={[0, 4.0, 0]}>
              <boxGeometry args={[1.3, 0.4, 1.3]} />
              <meshBasicMaterial color={isHovered ? '#0284C7' : '#0B0F19'} />
            </mesh>

            {/* Glowing cyan hover border on header rim */}
            {isHovered && (
              <mesh position={[0, 4.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.7, 1.25, 4]} />
                <meshBasicMaterial color="#38BDF8" side={THREE.DoubleSide} />
              </mesh>
            )}

            {/* Invisible Responsive Click & Hover Target */}
            <mesh
              position={[0, 4.0, 0]}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
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
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {/* Live Hover Tooltip Badge above pin */}
            {isHovered && (
              <mesh position={[0, 9, 0]}>
                <boxGeometry args={[Math.max(10, pin.name.length * 2.4 + 4), 3.2, 0.4]} />
                <meshBasicMaterial color="#0284C7" />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
