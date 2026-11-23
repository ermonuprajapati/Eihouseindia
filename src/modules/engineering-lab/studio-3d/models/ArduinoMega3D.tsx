'use client';

import React, { useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

export interface ArduinoMega3DProps {
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

export interface MegaPinDef {
  name: string;
  localPos: [number, number, number];
  group: 'power' | 'analog' | 'digital' | 'comm' | 'extended';
  altNames?: string[];
}

export const MEGA_PINS: MegaPinDef[] = [
  // Top Digital Header (Left to Right along Z = -23)
  // Comm UART0
  { name: 'D0', altNames: ['RX0', '0'], localPos: [-36.8, 5, -23], group: 'digital' },
  { name: 'D1', altNames: ['TX0', '1'], localPos: [-34.26, 5, -23], group: 'digital' },
  { name: 'D2', altNames: ['2'], localPos: [-31.72, 5, -23], group: 'digital' },
  { name: 'D3', altNames: ['3'], localPos: [-29.18, 5, -23], group: 'digital' },
  { name: 'D4', altNames: ['4'], localPos: [-26.64, 5, -23], group: 'digital' },
  { name: 'D5', altNames: ['5'], localPos: [-24.1, 5, -23], group: 'digital' },
  { name: 'D6', altNames: ['6'], localPos: [-21.56, 5, -23], group: 'digital' },
  { name: 'D7', altNames: ['7'], localPos: [-19.02, 5, -23], group: 'digital' },

  // Digital 8-13
  { name: 'D8', altNames: ['8'], localPos: [-14.5, 5, -23], group: 'digital' },
  { name: 'D9', altNames: ['9'], localPos: [-11.96, 5, -23], group: 'digital' },
  { name: 'D10', altNames: ['10'], localPos: [-9.42, 5, -23], group: 'digital' },
  { name: 'D11', altNames: ['11'], localPos: [-6.88, 5, -23], group: 'digital' },
  { name: 'D12', altNames: ['12'], localPos: [-4.34, 5, -23], group: 'digital' },
  { name: 'D13', altNames: ['13'], localPos: [-1.8, 5, -23], group: 'digital' },
  { name: 'GND_TOP', altNames: ['GND'], localPos: [0.74, 5, -23], group: 'power' },
  { name: 'AREF', localPos: [3.28, 5, -23], group: 'digital' },
  { name: 'D20', altNames: ['SDA'], localPos: [5.82, 5, -23], group: 'comm' },
  { name: 'D21', altNames: ['SCL'], localPos: [8.36, 5, -23], group: 'comm' },

  // Communication Headers TX1-3, RX1-3 (Along Z = -23 further right)
  { name: 'D14', altNames: ['TX3'], localPos: [14.0, 5, -23], group: 'comm' },
  { name: 'D15', altNames: ['RX3'], localPos: [16.54, 5, -23], group: 'comm' },
  { name: 'D16', altNames: ['TX2'], localPos: [19.08, 5, -23], group: 'comm' },
  { name: 'D17', altNames: ['RX2'], localPos: [21.62, 5, -23], group: 'comm' },
  { name: 'D18', altNames: ['TX1'], localPos: [24.16, 5, -23], group: 'comm' },
  { name: 'D19', altNames: ['RX1'], localPos: [26.7, 5, -23], group: 'comm' },

  // Bottom Power Header (Along Z = 23)
  { name: 'IOREF', localPos: [-33.0, 5, 23], group: 'power' },
  { name: 'RESET', localPos: [-30.46, 5, 23], group: 'power' },
  { name: '3V3', altNames: ['3.3V'], localPos: [-27.92, 5, 23], group: 'power' },
  { name: '5V', localPos: [-25.38, 5, 23], group: 'power' },
  { name: 'GND', altNames: ['GND_1'], localPos: [-22.84, 5, 23], group: 'power' },
  { name: 'GND_2', localPos: [-20.3, 5, 23], group: 'power' },
  { name: 'VIN', localPos: [-17.76, 5, 23], group: 'power' },

  // Bottom Analog Low Header A0 - A7 (Along Z = 23)
  { name: 'A0', localPos: [-10.5, 5, 23], group: 'analog' },
  { name: 'A1', localPos: [-7.96, 5, 23], group: 'analog' },
  { name: 'A2', localPos: [-5.42, 5, 23], group: 'analog' },
  { name: 'A3', localPos: [-2.88, 5, 23], group: 'analog' },
  { name: 'A4', localPos: [-0.34, 5, 23], group: 'analog' },
  { name: 'A5', localPos: [2.2, 5, 23], group: 'analog' },
  { name: 'A6', localPos: [4.74, 5, 23], group: 'analog' },
  { name: 'A7', localPos: [7.28, 5, 23], group: 'analog' },

  // Bottom Analog High Header A8 - A15 (Along Z = 23)
  { name: 'A8', localPos: [12.0, 5, 23], group: 'analog' },
  { name: 'A9', localPos: [14.54, 5, 23], group: 'analog' },
  { name: 'A10', localPos: [17.08, 5, 23], group: 'analog' },
  { name: 'A11', localPos: [19.62, 5, 23], group: 'analog' },
  { name: 'A12', localPos: [22.16, 5, 23], group: 'analog' },
  { name: 'A13', localPos: [24.7, 5, 23], group: 'analog' },
  { name: 'A14', localPos: [27.24, 5, 23], group: 'analog' },
  { name: 'A15', localPos: [29.78, 5, 23], group: 'analog' },

  // Extended Double-Row Digital I/O Header D22 - D53 on Right Edge
  // Inner row (X = 43.5, Z from -20.32 to 20.32): D23, D25, D27, D29, D31, D33, D35, D37, D39, D41, D43, D45, D47, D49, D51, D53, GND_EXT
  { name: 'D23', localPos: [43.5, 5, -20.32], group: 'extended' },
  { name: 'D25', localPos: [43.5, 5, -17.78], group: 'extended' },
  { name: 'D27', localPos: [43.5, 5, -15.24], group: 'extended' },
  { name: 'D29', localPos: [43.5, 5, -12.7], group: 'extended' },
  { name: 'D31', localPos: [43.5, 5, -10.16], group: 'extended' },
  { name: 'D33', localPos: [43.5, 5, -7.62], group: 'extended' },
  { name: 'D35', localPos: [43.5, 5, -5.08], group: 'extended' },
  { name: 'D37', localPos: [43.5, 5, -2.54], group: 'extended' },
  { name: 'D39', localPos: [43.5, 5, 0], group: 'extended' },
  { name: 'D41', localPos: [43.5, 5, 2.54], group: 'extended' },
  { name: 'D43', localPos: [43.5, 5, 5.08], group: 'extended' },
  { name: 'D45', localPos: [43.5, 5, 7.62], group: 'extended' },
  { name: 'D47', localPos: [43.5, 5, 10.16], group: 'extended' },
  { name: 'D49', localPos: [43.5, 5, 12.7], group: 'extended' },
  { name: 'D51', localPos: [43.5, 5, 15.24], group: 'extended' },
  { name: 'D53', localPos: [43.5, 5, 17.78], group: 'extended' },
  { name: 'GND_EXT', altNames: ['GND'], localPos: [43.5, 5, 20.32], group: 'power' },

  // Outer row (X = 46.5, Z from -20.32 to 20.32): D22, D24, D26, D28, D30, D32, D34, D36, D38, D40, D42, D44, D46, D48, D50, D52, 5V_EXT
  { name: 'D22', localPos: [46.5, 5, -20.32], group: 'extended' },
  { name: 'D24', localPos: [46.5, 5, -17.78], group: 'extended' },
  { name: 'D26', localPos: [46.5, 5, -15.24], group: 'extended' },
  { name: 'D28', localPos: [46.5, 5, -12.7], group: 'extended' },
  { name: 'D30', localPos: [46.5, 5, -10.16], group: 'extended' },
  { name: 'D32', localPos: [46.5, 5, -7.62], group: 'extended' },
  { name: 'D34', localPos: [46.5, 5, -5.08], group: 'extended' },
  { name: 'D36', localPos: [46.5, 5, -2.54], group: 'extended' },
  { name: 'D38', localPos: [46.5, 5, 0], group: 'extended' },
  { name: 'D40', localPos: [46.5, 5, 2.54], group: 'extended' },
  { name: 'D42', localPos: [46.5, 5, 5.08], group: 'extended' },
  { name: 'D44', localPos: [46.5, 5, 7.62], group: 'extended' },
  { name: 'D46', localPos: [46.5, 5, 10.16], group: 'extended' },
  { name: 'D48', localPos: [46.5, 5, 12.7], group: 'extended' },
  { name: 'D50', localPos: [46.5, 5, 15.24], group: 'extended' },
  { name: 'D52', localPos: [46.5, 5, 17.78], group: 'extended' },
  { name: '5V_EXT', altNames: ['5V'], localPos: [46.5, 5, 20.32], group: 'power' },
];

export function ArduinoMega3D({
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
}: ArduinoMega3DProps) {
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

  const materials = useMemo(() => {
    return {
      pcb: new THREE.MeshStandardMaterial({
        color: isSelected ? '#00A896' : '#008184', // Darker authentic Mega teal
        roughness: 0.35,
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
        color: usbHovered ? '#38BDF8' : '#0284C7',
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
        emissiveIntensity: 2.0,
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
    canvas.width = 1600;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 1600, 800);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Board branding
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText('ARDUINO', 680, 360);
    ctx.font = 'bold 32px monospace';
    ctx.fillText('MEGA 2560 R3', 680, 415);
    ctx.font = 'bold 18px monospace';
    ctx.fillText('ATmega2560 - 16MHz', 680, 460);

    const toCanvasX = (lx: number) => Math.round(((lx + 50.8) / 101.6) * 1600);
    const toCanvasY = (lz: number) => Math.round(((lz + 26.7) / 53.4) * 800);

    // Section Headers
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('DIGITAL (PWM~)', 450, 40);
    ctx.fillText('COMMUNICATION', 1080, 40);
    ctx.fillText('POWER', 410, 755);
    ctx.fillText('ANALOG IN', 920, 755);
    ctx.fillText('DIGITAL 22-53', 1470, 755);
    ctx.fillText('ON', 340, 310);

    // Individual Pin Labels beside headers
    ctx.font = 'bold 15px monospace';

    MEGA_PINS.forEach((pin) => {
      const cx = toCanvasX(pin.localPos[0]);
      if (pin.group === 'digital' || pin.group === 'comm') {
        const display = pin.name.startsWith('D') ? pin.name.slice(1) : pin.name;
        ctx.fillText(display, cx, 100);
      } else if (pin.group === 'power') {
        if (pin.localPos[0] < 40) {
          const display = pin.name === '3V3' ? '3.3V' : pin.name === 'GND_2' ? 'GND' : pin.name;
          ctx.fillText(display, cx, 700);
        }
      } else if (pin.group === 'analog') {
        ctx.fillText(pin.name, cx, 700);
      } else if (pin.group === 'extended') {
        const cy = toCanvasY(pin.localPos[2]);
        const isOuter = pin.localPos[0] > 45;
        const display = pin.name.startsWith('D') ? pin.name.slice(1) : pin.name;
        ctx.fillText(display, isOuter ? 1545 : 1395, cy);
      }
    });

    // Pin header box outlines
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(210, 58, 620, 68);
    ctx.strokeRect(845, 58, 410, 68);
    ctx.strokeRect(270, 674, 300, 68);
    ctx.strokeRect(585, 674, 670, 68);
    ctx.strokeRect(1415, 140, 160, 580);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  useEffect(() => {
    return () => {
      silkscreenTexture?.dispose();
    };
  }, [silkscreenTexture]);

  const activePowered = isUsbPlugged || isDcJackPlugged || isPowered;

  return (
    <group position={position} rotation={rotation}>
      {/* Selection Glow Indicator */}
      {isSelected && (
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[104, 1, 56]} />
          <meshBasicMaterial color="#38BDF8" wireframe />
        </mesh>
      )}

      {/* Main PCB Substrate (101.6mm x 53.4mm x 1.6mm) */}
      <mesh position={[0, 0.8, 0]} material={materials.pcb} castShadow receiveShadow>
        <boxGeometry args={[101.6, 1.6, 53.4]} />
      </mesh>

      {/* High-Resolution White Silkscreen Face Overlay */}
      {silkscreenTexture && (
        <mesh position={[0, 1.63, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[101.0, 52.8]} />
          <meshBasicMaterial
            map={silkscreenTexture}
            transparent
            opacity={0.95}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      )}

      {/* USB Type-B Port on Board (Metallic silver block) */}
      <mesh
        position={[-44, 5.5, -14]}
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
        <boxGeometry args={[14, 11, 12]} />
      </mesh>

      {/* EI House Interactive USB Type-B Cable Plug */}
      {isUsbPlugged ? (
        <group
          position={[-44, 5.5, -14]}
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
          {/* Metal USB Plug Shell */}
          <mesh position={[-4, 0, 0]} material={materials.usbPlugMetal} castShadow>
            <boxGeometry args={[7, 10.5, 11.5]} />
          </mesh>
          {/* Blue Molded Strain Relief Boot */}
          <mesh position={[-11, 0, 0]} material={materials.usbCablePvc} castShadow>
            <boxGeometry args={[10, 11.5, 13]} />
          </mesh>
          <mesh position={[-16, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.usbCablePvc}>
            <cylinderGeometry args={[3.2, 4.2, 4, 16]} />
          </mesh>
          {/* Continuous Flexible Blue USB Cable trailing off workbench */}
          <mesh geometry={usbCableTubeGeo} material={materials.usbCablePvc} castShadow />
        </group>
      ) : (
        /* Unplugged Disconnected Indicator - click to plug in */
        <group
          position={[-64, 5.5, -14]}
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
          <mesh position={[0, 0, 0]} material={materials.usbPlugMetal}>
            <boxGeometry args={[6, 9.5, 10.5]} />
          </mesh>
          <mesh position={[-9, 0, 0]} material={materials.usbCablePvc}>
            <boxGeometry args={[12, 11, 12]} />
          </mesh>
        </group>
      )}

      {/* DC Power Barrel Jack (Black cylindrical body with metal pin) */}
      <mesh position={[-38, 5.5, 15]} material={materials.barrelPlastic} castShadow>
        <boxGeometry args={[14, 11, 9]} />
      </mesh>
      <mesh position={[-45, 5.5, 15]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[4.2, 4.2, 2, 24]} />
        <meshStandardMaterial color="#0A0A0A" />
      </mesh>
      {/* DC Barrel Jack Cable Plug when active */}
      {isDcJackPlugged && (
        <group position={[-38, 5.5, 15]}>
          <mesh position={[-10, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.usbPlugMetal}>
            <cylinderGeometry args={[2.7, 2.7, 8, 16]} />
          </mesh>
          <mesh position={[-18, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[4.5, 4.5, 12, 16]} />
            <meshStandardMaterial color="#111827" roughness={0.5} />
          </mesh>
          <mesh position={[-34, -4, 0]} rotation={[0, 0, Math.PI / 3]}>
            <cylinderGeometry args={[2.2, 2.2, 24, 12]} />
            <meshStandardMaterial color="#111827" roughness={0.4} />
          </mesh>
        </group>
      )}

      {/* ATmega2560 TQFP-100 MCU Chip (Rotated 45 degrees like real Mega 2560) */}
      <mesh
        position={[-4, 2.0, 0]}
        rotation={[0, Math.PI / 4, 0]}
        material={materials.icPlastic}
        castShadow
      >
        <boxGeometry args={[14, 1.4, 14]} />
      </mesh>
      {/* ATmega2560 Pin 1 Dot */}
      <mesh position={[-11, 2.8, -7]}>
        <cylinderGeometry args={[0.6, 0.6, 0.2, 12]} />
        <meshBasicMaterial color="#94A3B8" />
      </mesh>

      {/* ATmega16U2 USB Controller IC near port */}
      <mesh position={[-30, 1.8, -10]} material={materials.icPlastic} castShadow>
        <boxGeometry args={[6, 1.2, 6]} />
      </mesh>

      {/* 16.000 MHz Silver Crystal Oscillator */}
      <mesh position={[-20, 2.0, -14]}>
        <boxGeometry args={[11, 2.5, 4.5]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* 5V Voltage Regulator (DPAK with heat sink) */}
      <mesh position={[-24, 2.2, 14]} material={materials.icPlastic} castShadow>
        <boxGeometry args={[7, 1.8, 6.5]} />
      </mesh>
      <mesh position={[-27.5, 1.7, 14]}>
        <boxGeometry args={[2.5, 0.8, 5.5]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.8} />
      </mesh>

      {/* Status LEDs */}
      {/* 1. ON Green Power LED */}
      <mesh position={[-16, 1.8, 12]} material={activePowered ? materials.ledOnActive : materials.ledOnInactive}>
        <boxGeometry args={[1.6, 0.6, 0.8]} />
      </mesh>
      {activePowered && (
        <pointLight position={[-16, 3.0, 12]} color="#22C55E" intensity={1.8} distance={30} />
      )}

      {/* 2. L (Pin 13) Builtin Amber LED */}
      <mesh position={[1, 1.8, -16]} material={activePowered ? materials.ledLActive : materials.ledLInactive}>
        <boxGeometry args={[1.6, 0.6, 0.8]} />
      </mesh>
      {activePowered && (
        <pointLight position={[1, 3.0, -16]} color="#F59E0B" intensity={1.2} distance={25} />
      )}

      {/* TX / RX SMD LEDs */}
      <mesh position={[-20, 1.8, -8]} material={materials.ledLInactive}>
        <boxGeometry args={[1.2, 0.5, 0.8]} />
      </mesh>
      <mesh position={[-20, 1.8, -10]} material={materials.ledLInactive}>
        <boxGeometry args={[1.2, 0.5, 0.8]} />
      </mesh>

      {/* Reset Pushbutton */}
      <mesh position={[-44, 3, -2]} material={materials.headerPlastic}>
        <boxGeometry args={[6, 4, 6]} />
      </mesh>
      <mesh position={[-44, 5.2, -2]}>
        <cylinderGeometry args={[1.5, 1.5, 1, 16]} />
        <meshStandardMaterial color="#EF4444" />
      </mesh>

      {/* Female Pin Header Plastic Strips */}
      {/* Top Digital Header 1 & 2 */}
      <mesh position={[-28, 4.5, -23]} material={materials.headerPlastic} castShadow>
        <boxGeometry args={[24, 8, 3]} />
      </mesh>
      <mesh position={[-2, 4.5, -23]} material={materials.headerPlastic} castShadow>
        <boxGeometry args={[28, 8, 3]} />
      </mesh>
      <mesh position={[20, 4.5, -23]} material={materials.headerPlastic} castShadow>
        <boxGeometry args={[18, 8, 3]} />
      </mesh>

      {/* Bottom Power & Analog Headers */}
      <mesh position={[-25, 4.5, 23]} material={materials.headerPlastic} castShadow>
        <boxGeometry args={[20, 8, 3]} />
      </mesh>
      <mesh position={[-2, 4.5, 23]} material={materials.headerPlastic} castShadow>
        <boxGeometry args={[24, 8, 3]} />
      </mesh>
      <mesh position={[21, 4.5, 23]} material={materials.headerPlastic} castShadow>
        <boxGeometry args={[24, 8, 3]} />
      </mesh>

      {/* Extended Double-Row Header (Right Edge) */}
      <mesh position={[45, 4.5, 0]} material={materials.headerPlastic} castShadow>
        <boxGeometry args={[6, 8, 45]} />
      </mesh>

      {/* Clickable 3D Pin Anchors with Authentic Female Receptacle Sockets */}
      {MEGA_PINS.map((pin) => {
        const isHovered = hoveredPin === pin.name || pin.altNames?.includes(hoveredPin || '');
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
              <boxGeometry args={[2.4, 6.0, 2.4]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
