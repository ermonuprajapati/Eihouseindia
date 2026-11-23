'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Canvas, ThreeEvent, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Html } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import {
  Trash2,
  Plus,
  X,
  Compass,
  Search,
  Cpu,
  RotateCcw,
  Unplug,
  MoveLeft,
  MoveRight,
  MoveUp,
  MoveDown,
  MousePointer,
  Cable,
  Tag,
  ChevronUp,
  ChevronDown,
  ArrowDownToLine,
  FlipHorizontal,
  Focus,
  Maximize2,
  Minimize2,
  Hand,
} from 'lucide-react';
import { toast } from 'sonner';
import { Component3D, Wire3D, CircuitComponent, CircuitWire } from '@/modules/engineering-lab/types';

declare module '@/modules/engineering-lab/types' {
  interface Component3D {
    rotX?: number;
    rotZ?: number;
  }
}
import { COMPONENT_CATALOG } from '../circuit-engine/component-catalog';
import {
  MASTER_25_CATEGORIES,
  getCategory25ForComponent,
  getSimulationBadgeInfo,
} from '../circuit-engine/component-categories-25';
import { Breadboard3D } from './Breadboard3D';
import {
  BreadboardHole3D,
  HOLE_BY_ID,
  findNearestHole830,
  findNearestFreeHole830,
  findNearestUnoccupiedHole,
  START_X,
  PITCH_X,
  getComponentElevationSpec,
  computeComponentGroundElevation,
  stepAngle45,
  nudgeComponent3D,
  rotateComponent45,
  resetComponentOrientation,
  snapComponentToSurface,
  flipComponent3D,
} from './breadboard-topology';
import { ArduinoMega3D, MEGA_PINS } from './models/ArduinoMega3D';
import { ArduinoUno3D, ARDUINO_PINS } from './models/ArduinoUno3D';
import { ArduinoNano3D, NANO_PINS } from './models/ArduinoNano3D';
import { Esp32DevKit3D, ESP32_PINS } from './models/Esp32DevKit3D';
import { RaspberryPiPico3D, PICO_PINS } from './models/RaspberryPiPico3D';
import { Led3D } from './models/Led3D';
import { Resistor3D } from './models/Resistor3D';
import { Battery9V3D } from './models/Battery9V3D';
import { Pushbutton3D } from './models/Pushbutton3D';
import { ServoSG903D } from './models/ServoSG903D';
import { Lcd1602_3D } from './models/Lcd1602_3D';
import { RgbLed3D } from './models/RgbLed3D';
import { Buzzer3D } from './models/Buzzer3D';
import { Diode3D } from './models/Diode3D';
import { Ldr3D } from './models/Ldr3D';
import { SlideSwitch3D } from './models/SlideSwitch3D';
import { DipPackage3D } from './models/DipPackage3D';
import { BurnSmokeFX } from './models/BurnSmokeFX';
import { TransistorTO92_3D } from './models/TransistorTO92_3D';
import { TransistorTO220_3D } from './models/TransistorTO220_3D';
import { Inductor3D } from './models/Inductor3D';
import { HcSr04_3D } from './models/HcSr04_3D';
import { Wire3DTube } from './Wire3DTube';


// =========================================================================
// Hardware-Grade HC-05 Serial Bluetooth SPP Module 3D Model
// =========================================================================
export function BluetoothHC05_3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isSelected = false,
  isPowered = true,
  onPinClick,
  hoveredPin,
  onHoverPin,
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isSelected?: boolean;
  isPowered?: boolean;
  onPinClick?: (pinName: string, worldPos: THREE.Vector3) => void;
  hoveredPin?: string | null;
  onHoverPin?: (pinName: string | null) => void;
}) {
  const materials = useMemo(() => {
    return {
      pcbCarrier: new THREE.MeshStandardMaterial({
        color: isSelected ? '#38BDF8' : '#0284C7', // Deep blue breakout PCB
        roughness: 0.35,
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
      daughterBoard: new THREE.MeshStandardMaterial({
        color: '#0369A1',
        roughness: 0.4,
      }),
      rfShield: new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        metalness: 0.95,
        roughness: 0.15,
      }),
      ledBlue: new THREE.MeshStandardMaterial({
        color: isPowered ? '#38BDF8' : '#64748B',
        emissive: isPowered ? new THREE.Color('#38BDF8') : new THREE.Color('#000000'),
        emissiveIntensity: isPowered ? 1.5 : 0,
      }),
      headerBlack: new THREE.MeshStandardMaterial({
        color: '#18181B',
        roughness: 0.8,
      }),
      pinGold: new THREE.MeshStandardMaterial({
        color: '#F59E0B',
        metalness: 0.9,
        roughness: 0.15,
      }),
      pinHover: new THREE.MeshBasicMaterial({
        color: '#38BDF8',
      }),
    };
  }, [isSelected, isPowered]);

  // Silkscreen texture with "HC-05", pin labels "STATE RXD TXD GND VCC EN"
  const silkscreenTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 512, 1024);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 32px monospace';
    ctx.fillText('HC-05 BLUETOOTH', 256, 540);
    ctx.font = '24px monospace';
    ctx.fillText('V2.0+EDR SPP', 256, 580);

    // 6 Pin Labels at bottom edge
    const pinLabels = ['STATE', 'RXD', 'TXD', 'GND', 'VCC', 'EN'];
    ctx.font = 'bold 26px monospace';
    pinLabels.forEach((label, i) => {
      const px = ((-6.35 + i * 2.54 + 8.0) / 16.0) * 512;
      ctx.save();
      ctx.translate(px, 940);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  const pins = [
    { name: 'STATE', aliases: ['state', '1'], x: -6.35, label: 'STATE' },
    { name: 'RXD', aliases: ['rxd', 'rx', '2'], x: -3.81, label: 'RXD' },
    { name: 'TXD', aliases: ['txd', 'tx', '3'], x: -1.27, label: 'TXD' },
    { name: 'GND', aliases: ['gnd', 'ground', '4', '-'], x: 1.27, label: 'GND' },
    { name: 'VCC', aliases: ['vcc', 'power', '5v', '5', '+'], x: 3.81, label: 'VCC' },
    { name: 'EN', aliases: ['en', 'key', '6'], x: 6.35, label: 'EN' },
  ];

  return (
    <group position={position} rotation={rotation}>
      {/* 1. Carrier Breakout Blue PCB (16mm x 36mm x 1.6mm) lying flat on XZ plane */}
      <mesh position={[0, 0.8, 0]} material={materials.pcbCarrier} castShadow receiveShadow>
        <boxGeometry args={[16.0, 1.6, 36.0]} />
      </mesh>

      {/* 2. Top Silkscreen Overlay */}
      {silkscreenTexture && (
        <mesh position={[0, 1.62, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[15.6, 35.6]} />
          <meshBasicMaterial map={silkscreenTexture} transparent />
        </mesh>
      )}

      {/* 3. Surface-Mounted Bluetooth Daughterboard */}
      <mesh position={[0, 2.0, -4.5]} material={materials.daughterBoard}>
        <boxGeometry args={[13.5, 0.8, 25.0]} />
      </mesh>

      {/* 4. Golden Meander Trace Antenna at top edge */}
      <group position={[0, 2.42, -13.5]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[11.0, 5.0]} />
          <meshStandardMaterial color="#F59E0B" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* 5. Metal RF Shielding Can with stamped markings */}
      <mesh position={[0, 2.7, -3.5]} material={materials.rfShield} castShadow>
        <boxGeometry args={[12.5, 1.4, 13.0]} />
      </mesh>

      {/* 6. Onboard Status LED (0805 SMD) */}
      <mesh position={[-4.5, 2.5, 5.5]} material={materials.ledBlue}>
        <boxGeometry args={[1.2, 0.6, 2.0]} />
      </mesh>
      {isPowered && (
        <pointLight position={[-4.5, 3.5, 5.5]} color="#38BDF8" intensity={0.5} distance={15} />
      )}

      {/* 7. Key Pushbutton Switch */}
      <mesh position={[4.5, 2.5, 5.5]} material={materials.headerBlack}>
        <boxGeometry args={[2.5, 1.0, 2.5]} />
      </mesh>

      {/* 8. 6-Pin Header at Bottom Edge (z = 16.0) */}
      <group position={[0, 2.05, 16.0]}>
        <mesh material={materials.headerBlack}>
          <boxGeometry args={[15.5, 2.5, 2.5]} />
        </mesh>

        {pins.map((p) => {
          const isHovered =
            hoveredPin === p.name ||
            (hoveredPin && (hoveredPin.toUpperCase() === p.name || p.aliases.includes(hoveredPin.toLowerCase())));
          return (
            <group key={p.name} position={[p.x, 0, 0]}>
              <mesh position={[0, -3.0, 0]} material={materials.pinGold}>
                <boxGeometry args={[0.64, 7.0, 0.64]} />
              </mesh>
              {/* Terminal Target with Generous Hitbox & Hover Ring */}
              <mesh
                position={[0, 0.5, 0]}
                material={isHovered ? materials.pinHover : materials.pinGold}
              >
                <sphereGeometry args={[isHovered ? 0.9 : 0.6, 12, 12]} />
              </mesh>
              {isHovered && (
                <mesh position={[0, 0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.5, 1.3, 24]} />
                  <meshBasicMaterial color="#38BDF8" side={THREE.DoubleSide} />
                </mesh>
              )}
              <mesh
                position={[0, 0.5, 0]}
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
    </group>
  );
}

interface Library3DItem {
  type: string;
  label: string;
  category: 'boards' | 'passive' | 'semiconductors' | 'sensors';
  subCategory?: string;
  is3DReady?: boolean;
  value: string;
  desc: string;
  defaultPos: [number, number, number];
  params: Record<string, number | string | boolean>;
}

export const LIBRARY_3D_COMPONENTS: Library3DItem[] = [
  // Microcontrollers & Power
  {
    type: 'ARDUINO_MEGA',
    label: 'Arduino Mega 2560 R3',
    category: 'boards',
    subCategory: 'mcu',
    is3DReady: true,
    value: 'ATmega2560',
    desc: 'High-performance MCU with 54 Digital I/O, 16 Analog Inputs, 4 UARTs, and 16MHz clock',
    defaultPos: [0, 0, 75] as [number, number, number],
    params: { mcu: 'ATmega2560', clock: '16MHz', logicVoltage: 5 },
  },
  {
    type: 'ARDUINO_UNO',
    label: 'Arduino Uno R3',
    category: 'boards',
    subCategory: 'mcu',
    is3DReady: true,
    value: 'ATmega328P',
    desc: 'Classic dev board with ATmega328P, 16MHz, USB, and digital/analog headers',
    defaultPos: [0, 0, 65] as [number, number, number],
    params: { mcu: 'ATmega328P', clock: '16MHz', logicVoltage: 5 },
  },
  {
    type: 'ARDUINO_NANO',
    label: 'Arduino Nano V3',
    category: 'boards',
    subCategory: 'mcu',
    is3DReady: true,
    value: 'ATmega328P',
    desc: 'Breadboard-friendly compact MCU with 30-pin DIP footprint',
    defaultPos: [0, 8.5, 0] as [number, number, number],
    params: { mcu: 'ATmega328P', clock: '16MHz', logicVoltage: 5 },
  },
  {
    type: 'ESP32_DEVKIT',
    label: 'ESP32 DevKit V1',
    category: 'boards',
    subCategory: 'mcu',
    is3DReady: true,
    value: 'ESP32-WROOM-32',
    desc: 'Dual-core 240MHz Wi-Fi & Bluetooth microcontroller with 30-pin header',
    defaultPos: [0, 0, -65] as [number, number, number],
    params: { mcu: 'ESP32', clock: '240MHz', logicVoltage: 3.3 },
  },
  {
    type: 'RASPBERRY_PI_PICO',
    label: 'Raspberry Pi Pico (RP2040)',
    category: 'boards',
    subCategory: 'mcu',
    is3DReady: true,
    value: 'RP2040',
    desc: 'Dual ARM Cortex-M0+ 133MHz microcontroller with 40-pin breadboard-friendly layout',
    defaultPos: [0, 8.5, -50] as [number, number, number],
    params: { mcu: 'RP2040', clock: '133MHz', logicVoltage: 3.3 },
  },
  {
    type: 'BATTERY_9V',
    label: '9V Alkaline Battery',
    category: 'boards',
    subCategory: 'power',
    is3DReady: true,
    value: '9V',
    desc: 'Standard 9V block battery with top positive & negative snap terminals',
    defaultPos: [-95, 0, 0] as [number, number, number],
    params: { voltage: 9, capacityMah: 550 },
  },

  // Passive
  {
    type: 'RESISTOR',
    label: 'Resistor 1/4W (Axial)',
    category: 'passive',
    subCategory: 'resistive',
    is3DReady: true,
    value: '1kΩ',
    desc: 'Axial ceramic body with 4-band EIA color coding and bent wire leads',
    defaultPos: [10, 8.5, -3.34] as [number, number, number],
    params: { resistance: 1000, powerRating: 0.25 },
  },
  {
    type: 'POTENTIOMETER',
    label: 'Rotary Potentiometer 10k',
    category: 'passive',
    subCategory: 'resistive',
    is3DReady: true,
    value: '10kΩ',
    desc: '3-pin breadboard-mountable trimmer with rotating control dial',
    defaultPos: [-30, 8.5, -3.34] as [number, number, number],
    params: { totalResistance: 10000, wiperPosition: 0.5 },
  },
  {
    type: 'CAPACITOR',
    label: 'Ceramic Disc Capacitor',
    category: 'passive',
    subCategory: 'capacitive',
    is3DReady: true,
    value: '100nF',
    desc: '100nF (0.1µF) decoupling ceramic disc capacitor (Code 104)',
    defaultPos: [25, 8.5, -3.34] as [number, number, number],
    params: { capacitance: 1e-7, maxVoltage: 50 },
  },
  {
    type: 'CAPACITOR_ELECTROLYTIC',
    label: 'Electrolytic Capacitor 10µF',
    category: 'passive',
    subCategory: 'capacitive',
    is3DReady: true,
    value: '10µF',
    desc: 'Radial aluminum electrolytic can with white negative polarity stripe',
    defaultPos: [35, 8.5, -3.34] as [number, number, number],
    params: { capacitance: 1e-5, maxVoltage: 25 },
  },
  {
    type: 'PUSHBUTTON',
    label: 'Tactile Pushbutton 6mm',
    category: 'passive',
    subCategory: 'switches',
    is3DReady: true,
    value: 'NO',
    desc: '4-pin SPST momentary tactile switch straddling breadboard center',
    defaultPos: [-15, 8.5, 0] as [number, number, number],
    params: { switchState: false },
  },

  // Semiconductors & ICs
  {
    type: 'LED',
    label: '5mm LED (Diffused Red)',
    category: 'semiconductors',
    subCategory: 'diodes',
    is3DReady: true,
    value: 'Red',
    desc: '5mm diffused domed lens with live brightness and color emission',
    defaultPos: [0, 8.5, -3.34] as [number, number, number],
    params: { color: '#EF4444', forwardVoltage: 2.0, forwardCurrent: 0.02 },
  },
  {
    type: 'LED_RGB',
    label: 'RGB LED (Common Cathode)',
    category: 'semiconductors',
    subCategory: 'diodes',
    is3DReady: true,
    value: 'RGB',
    desc: '4-lead RGB through-hole LED with independent Red, Green, Blue control',
    defaultPos: [50, 8.5, -3.34] as [number, number, number],
    params: { color: 'RGB', type: 'common_cathode' },
  },
  {
    type: 'TIMER_555',
    label: 'NE555 Timer IC (DIP-8)',
    category: 'semiconductors',
    subCategory: 'ics',
    is3DReady: true,
    value: 'NE555',
    desc: 'Classic 8-pin precision bipolar timer IC for astable & monostable pulses',
    defaultPos: [-45, 8.5, 0] as [number, number, number],
    params: { ic: 'NE555', supplyMin: 4.5, supplyMax: 16 },
  },

  // Sensors & Actuators
  {
    type: 'MODULE_BLUETOOTH_HC05',
    label: 'HC-05 Bluetooth Module',
    category: 'sensors',
    subCategory: 'communication',
    is3DReady: true,
    value: 'Bluetooth 2.0+EDR',
    desc: 'Serial SPP Bluetooth transceiver breakout module with 6-pin header and PCB antenna',
    defaultPos: [95, 0, 45] as [number, number, number],
    params: { baudRate: 9600 },
  },
  {
    type: 'HC_SR04',
    label: 'HC-SR04 Ultrasonic Sonar',
    category: 'sensors',
    subCategory: 'sensors',
    is3DReady: true,
    value: '2-400cm',
    desc: 'Distance sensor with Transmitter & Receiver transducers and 4-pin header',
    defaultPos: [95, 0, 0] as [number, number, number],
    params: { minRangeCm: 2, maxRangeCm: 400 },
  },
  {
    type: 'SERVO_SG90',
    label: 'SG90 Micro Servo 9g',
    category: 'sensors',
    subCategory: 'actuators',
    is3DReady: true,
    value: '180°',
    desc: 'Miniature 9-gram servo motor with geared rotating horn and 3-pin cable',
    defaultPos: [95, 0, -45] as [number, number, number],
    params: { minAngle: 0, maxAngle: 180, currentAngle: 90 },
  },
  {
    type: 'LCD_1602',
    label: 'LCD 16x2 Character Display',
    category: 'sensors',
    subCategory: 'displays',
    is3DReady: true,
    value: '16x2 HD44780',
    desc: '16-character by 2-line alphanumeric LCD module with LED backlight',
    defaultPos: [0, 0, -100] as [number, number, number],
    params: { rows: 2, cols: 16, controller: 'HD44780' },
  },
  {
    type: 'BUZZER_ACTIVE',
    label: 'Active Piezo Buzzer 5V',
    category: 'sensors',
    subCategory: 'actuators',
    is3DReady: true,
    value: '5V Piezo',
    desc: 'Continuous tone piezo sound transducer with top acoustic aperture',
    defaultPos: [-60, 8.5, -3.34] as [number, number, number],
    params: { frequencyHz: 2300, ratedVoltage: 5 },
  },
  {
    type: 'DIODE',
    label: '1N4007 Rectifier Diode',
    category: 'semiconductors',
    subCategory: 'diodes',
    is3DReady: true,
    value: '1000V 1A',
    desc: 'Standard silicon rectifier diode in DO-41 package with cathode band',
    defaultPos: [15, 8.5, 8.42] as [number, number, number],
    params: { forwardV: 0.7, maxCurrent: 1.0 },
  },
  {
    type: 'SENSOR_LDR',
    label: 'Photoresistor (LDR GL5528)',
    category: 'sensors',
    subCategory: 'sensors',
    is3DReady: true,
    value: '10k-1MΩ',
    desc: 'Light-dependent resistor with serpentine cadmium-sulfide photoconductive track',
    defaultPos: [-20, 8.5, 8.42] as [number, number, number],
    params: { darkResistance: 1000000, lightResistance: 10000 },
  },
  {
    type: 'SLIDE_SWITCH',
    label: 'Mini Slide Switch (SPDT)',
    category: 'passive',
    subCategory: 'switches',
    is3DReady: true,
    value: 'SPDT',
    desc: '3-pin breadboard-friendly slide switch for DC power and signal routing',
    defaultPos: [-5, 8.5, 8.42] as [number, number, number],
    params: { closed: false },
  },
  {
    type: 'INDUCTOR',
    label: 'Fixed Inductor 10mH (Axial)',
    category: 'passive',
    subCategory: 'inductive',
    is3DReady: true,
    value: '10mH',
    desc: 'Axial molded RF choke with color code rings and tinned wire leads',
    defaultPos: [45, 8.5, 8.42] as [number, number, number],
    params: { inductance: 0.01 },
  },
  {
    type: 'BJT_NPN',
    label: 'NPN Transistor (2N2222A / TO-92)',
    category: 'semiconductors',
    subCategory: 'transistors',
    is3DReady: true,
    value: '2N2222A',
    desc: 'Bipolar NPN transistor in TO-92 plastic package with E-B-C pinout',
    defaultPos: [20, 8.5, 0] as [number, number, number],
    params: { beta: 100 },
  },
  {
    type: 'BJT_PNP',
    label: 'PNP Transistor (2N2907A / TO-92)',
    category: 'semiconductors',
    subCategory: 'transistors',
    is3DReady: true,
    value: '2N2907A',
    desc: 'Bipolar PNP transistor in TO-92 plastic package with E-B-C pinout',
    defaultPos: [30, 8.5, 0] as [number, number, number],
    params: { beta: 100 },
  },
  {
    type: 'MOSFET_N',
    label: 'N-Channel Power MOSFET (IRF540N / TO-220)',
    category: 'semiconductors',
    subCategory: 'transistors',
    is3DReady: true,
    value: 'IRF540N',
    desc: '100V 33A N-channel power MOSFET with TO-220 metal tab heatsink',
    defaultPos: [-45, 8.5, -8.42] as [number, number, number],
    params: { vgsTh: 3.0, rdsOn: 0.044 },
  },
  {
    type: 'MOSFET_P',
    label: 'P-Channel Power MOSFET (IRF9540N / TO-220)',
    category: 'semiconductors',
    subCategory: 'transistors',
    is3DReady: true,
    value: 'IRF9540N',
    desc: '-100V 23A P-channel power MOSFET with TO-220 metal tab heatsink',
    defaultPos: [-35, 8.5, -8.42] as [number, number, number],
    params: { vgsTh: -3.0, rdsOn: 0.117 },
  },
  {
    type: 'OPAMP_LM358',
    label: 'LM358 Dual Op-Amp (DIP-8)',
    category: 'semiconductors',
    subCategory: 'ics',
    is3DReady: true,
    value: 'LM358',
    desc: 'Dual low-power operational amplifier in standard 8-pin DIP package',
    defaultPos: [-25, 8.5, 0] as [number, number, number],
    params: { ic: 'LM358' },
  },
  {
    type: 'OPAMP_LM741',
    label: 'LM741 Single Op-Amp (DIP-8)',
    category: 'semiconductors',
    subCategory: 'ics',
    is3DReady: true,
    value: 'LM741',
    desc: 'Classic general purpose operational amplifier in 8-pin DIP package',
    defaultPos: [-10, 8.5, 0] as [number, number, number],
    params: { ic: 'LM741' },
  },
  {
    type: 'REGULATOR_7805',
    label: 'LM7805 5V Voltage Regulator (TO-220)',
    category: 'semiconductors',
    subCategory: 'power',
    is3DReady: true,
    value: 'LM7805',
    desc: '3-terminal 1.5A positive voltage regulator in TO-220 package',
    defaultPos: [5, 8.5, -8.42] as [number, number, number],
    params: { vOut: 5.0 },
  },
];

interface DragFrameControllerProps {
  draggingCompId: string | null;
  components3d: Component3D[];
  occupiedHoleIds: Set<string>;
  hasBreadboard: boolean;
  breadboardCount?: number;
  onUpdateComponent3D: (comp: Component3D) => void;
}

function getComponentFootprint(type: string): { halfW: number; halfD: number } {
  switch (type) {
    case 'ARDUINO_UNO':
      return { halfW: 34.0, halfD: 26.5 };
    case 'ARDUINO_MEGA':
      return { halfW: 50.5, halfD: 26.5 };
    case 'ARDUINO_NANO':
      return { halfW: 21.5, halfD: 9.0 };
    case 'ESP32_DEVKIT':
    case 'ESP32_S3':
    case 'ESP32_C3':
      return { halfW: 27.5, halfD: 14.0 };
    case 'RASPBERRY_PI_PICO':
    case 'RASPBERRY_PI_PICO2':
      return { halfW: 25.5, halfD: 10.5 };
    case 'LCD_1602':
    case 'DISPLAY_LCD1602':
      return { halfW: 40.0, halfD: 18.0 };
    case 'DISPLAY_OLED_SSD1306':
      return { halfW: 15.0, halfD: 14.0 };
    case 'MODULE_BLUETOOTH_HC05':
    case 'BLUETOOTH':
    case 'HC05':
    case 'HC06':
    case 'RF_BLUETOOTH':
      return { halfW: 9.0, halfD: 19.0 };
    case 'HC_SR04':
    case 'SENSOR_ULTRASONIC':
      return { halfW: 22.5, halfD: 10.0 };
    case 'SERVO_SG90':
    case 'ACTUATOR_SERVO_SG90':
      return { halfW: 16.0, halfD: 12.0 };
    case 'BATTERY_9V':
    case 'BATTERY':
    case 'DC_VOLTAGE':
      return { halfW: 13.0, halfD: 8.5 };
    case 'POTENTIOMETER':
      return { halfW: 5.0, halfD: 5.0 };
    case 'PUSHBUTTON':
    case 'PUSHBUTTON_NO':
    case 'PUSHBUTTON_NC':
    case 'EMERGENCY_STOP':
      return { halfW: 4.0, halfD: 4.0 };
    case 'SLIDE_SWITCH':
    case 'SWITCH_SPST':
      return { halfW: 4.5, halfD: 2.5 };
    case 'BUZZER_ACTIVE':
    case 'ACTUATOR_BUZZER_ACTIVE':
      return { halfW: 6.0, halfD: 6.0 };
    case 'TIMER_555':
    case 'DIP_IC':
    case 'ATMEGA328P':
    case 'OPAMP_LM358':
    case 'OPAMP_LM741':
    case 'COMPARATOR_LM393':
      return { halfW: 5.5, halfD: 4.0 };
    case 'LED_RGB':
    case 'ACTUATOR_RGB_LED':
      return { halfW: 3.0, halfD: 3.0 };
    case 'LED':
      return { halfW: 2.8, halfD: 2.8 };
    case 'RESISTOR':
      return { halfW: 6.0, halfD: 2.0 };
    case 'INDUCTOR':
      return { halfW: 6.0, halfD: 2.2 };
    case 'DIODE':
    case 'DIODE_1N4007':
      return { halfW: 5.5, halfD: 2.0 };
    case 'BJT_NPN':
    case 'BJT_PNP':
    case 'TRANSISTOR_NPN':
    case 'TRANSISTOR_PNP':
      return { halfW: 3.5, halfD: 2.5 };
    case 'MOSFET_N':
    case 'MOSFET_P':
    case 'REGULATOR_7805':
    case 'REGULATOR_LM317':
      return { halfW: 5.5, halfD: 3.0 };
    case 'SENSOR_LDR':
      return { halfW: 3.0, halfD: 3.0 };
    case 'CAPACITOR':
    case 'CAPACITOR_ELECTROLYTIC':
      return { halfW: 3.5, halfD: 3.5 };
    default:
      return { halfW: 3.5, halfD: 3.5 };
  }
}

export interface PinLabelItem {
  id: string;
  label: string;
  localPos: [number, number, number];
}

export function getComponentPinLabels(comp: Component3D): PinLabelItem[] {
  const t = comp.type || '';
  if (t === 'ARDUINO_UNO') {
    return ARDUINO_PINS.map((p) => ({ id: p.name, label: p.name, localPos: p.localPos }));
  }
  if (t === 'ARDUINO_MEGA') {
    return MEGA_PINS.map((p) => ({ id: p.name, label: p.name, localPos: p.localPos }));
  }
  if (t === 'ARDUINO_NANO') {
    return NANO_PINS.map((p) => ({ id: p.name, label: p.name, localPos: p.localPos }));
  }
  if (t === 'ESP32_DEVKIT' || t === 'ESP32_S3' || t === 'ESP32_C3' || t === 'ESP8266_NODEMCU') {
    return ESP32_PINS.map((p) => ({ id: p.name, label: p.name, localPos: p.localPos }));
  }
  if (t === 'RASPBERRY_PI_PICO' || t === 'RASPBERRY_PI_PICO2') {
    return PICO_PINS.map((p) => ({ id: p.name, label: p.name, localPos: p.localPos }));
  }
  if (t === 'TIMER_555' || t === 'DIP_IC' || (t.includes('OPAMP') && !t.includes('324')) || t.includes('COMPARATOR')) {
    const pinNames = t.includes('358')
      ? ['OUT1', 'IN1-', 'IN1+', 'GND', 'IN2+', 'IN2-', 'OUT2', 'VCC']
      : ['GND', 'TRIG', 'OUT', 'RESET', 'CTRL', 'THRES', 'DISCH', 'VCC'];
    return [1, 2, 3, 4, 5, 6, 7, 8].map((num, i) => {
      const lx = (i < 4) ? -3.81 + i * 2.54 : 3.81 - (i - 4) * 2.54;
      const lz = (i < 4) ? -3.34 : 3.34;
      return { id: String(num), label: `${num}:${pinNames[i]}`, localPos: [lx, 0, lz] as [number, number, number] };
    });
  }
  if (t === 'IC_74HC14' || t.includes('74HC') || t.includes('DIP14') || t.includes('DIP_14') || t.includes('LM324')) {
    let pinNames = ['1A', '1Y', '2A', '2Y', '3A', '3Y', 'GND', '4Y', '4A', '5Y', '5A', '6Y', '6A', 'VCC'];
    if (t.includes('74HC00') || t.includes('74HC08') || t.includes('74HC32') || t.includes('74HC86')) {
      pinNames = ['1A', '1B', '1Y', '2A', '2B', '2Y', 'GND', '3Y', '3A', '3B', '4Y', '4A', '4B', 'VCC'];
    } else if (t.includes('LM324')) {
      pinNames = ['1OUT', '1IN-', '1IN+', 'VCC', '2IN+', '2IN-', '2OUT', '3OUT', '3IN-', '3IN+', 'GND', '4IN+', '4IN-', '4OUT'];
    }
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((num, i) => {
      const lx = (i < 7) ? -7.62 + i * 2.54 : 7.62 - (i - 7) * 2.54;
      const lz = (i < 7) ? -3.34 : 3.34;
      return { id: String(num), label: `${num}:${pinNames[i]}`, localPos: [lx, 0, lz] as [number, number, number] };
    });
  }
  if (t.includes('595') || t.includes('4017') || t.includes('2003') || t.includes('293') || t.includes('DIP16') || t.includes('DIP_16')) {
    let pinNames = [
      '1', '2', '3', '4', '5', '6', '7', '8',
      '9', '10', '11', '12', '13', '14', '15', '16'
    ];
    if (t.includes('595')) {
      pinNames = ['QB', 'QC', 'QD', 'QE', 'QF', 'QG', 'QH', 'GND', "QH'", '~SRCLR', 'SRCLK', 'RCLK', '~OE', 'SER', 'QA', 'VCC'];
    } else if (t.includes('4017')) {
      pinNames = ['Q5', 'Q1', 'Q0', 'Q2', 'Q6', 'Q7', 'Q3', 'GND', 'Q8', 'Q4', 'Q9', 'CO', '~EN', 'CLK', 'RST', 'VDD'];
    } else if (t.includes('2003')) {
      pinNames = ['1B', '2B', '3B', '4B', '5B', '6B', '7B', 'COM_E', 'COM_K', '7C', '6C', '5C', '4C', '3C', '2C', '1C'];
    } else if (t.includes('293')) {
      pinNames = ['1,2EN', '1A', '1Y', 'GND', 'GND', '2Y', '2A', 'VCC2', '3,4EN', '3A', '3Y', 'GND', 'GND', '4Y', '4A', 'VCC1'];
    }
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((num, i) => {
      const lx = (i < 8) ? -8.89 + i * 2.54 : 8.89 - (i - 8) * 2.54;
      const lz = (i < 8) ? -3.34 : 3.34;
      return { id: String(num), label: `${num}:${pinNames[i]}`, localPos: [lx, 0, lz] as [number, number, number] };
    });
  }
  if (t === 'HC_SR04' || t === 'SENSOR_ULTRASONIC') {
    return [
      { id: 'VCC', label: 'VCC', localPos: [-3.81, 1.25, 0] },
      { id: 'TRIG', label: 'TRIG', localPos: [-1.27, 1.25, 0] },
      { id: 'ECHO', label: 'ECHO', localPos: [1.27, 1.25, 0] },
      { id: 'GND', label: 'GND', localPos: [3.81, 1.25, 0] },
    ];
  }
  if (t === 'MODULE_BLUETOOTH_HC05' || t.includes('BLUETOOTH') || t.includes('HC05')) {
    return [
      { id: 'STATE', label: 'STATE', localPos: [-6.35, 2.05, 16.0] },
      { id: 'RXD', label: 'RXD', localPos: [-3.81, 2.05, 16.0] },
      { id: 'TXD', label: 'TXD', localPos: [-1.27, 2.05, 16.0] },
      { id: 'GND', label: 'GND', localPos: [1.27, 2.05, 16.0] },
      { id: 'VCC', label: 'VCC', localPos: [3.81, 2.05, 16.0] },
      { id: 'EN', label: 'EN', localPos: [6.35, 2.05, 16.0] },
    ];
  }
  if (t === 'LED_RGB' || t === 'ACTUATOR_RGB_LED') {
    return [
      { id: 'r', label: 'R', localPos: [-3.81, 0, 0] },
      { id: 'cc', label: 'GND', localPos: [-1.27, 0, 0] },
      { id: 'g', label: 'G', localPos: [1.27, 0, 0] },
      { id: 'b', label: 'B', localPos: [3.81, 0, 0] },
    ];
  }
  if (t === 'LED') {
    return [
      { id: 'anode', label: 'A (+)', localPos: [-2.54, 0, 0] },
      { id: 'cathode', label: 'K (-)', localPos: [2.54, 0, 0] },
    ];
  }
  if (t === 'DIODE' || t === 'DIODE_1N4007') {
    return [
      { id: '1', label: 'A (+)', localPos: [-5.08, 0, 0] },
      { id: '2', label: 'K (-)', localPos: [5.08, 0, 0] },
    ];
  }
  if (t === 'RESISTOR' || t === 'INDUCTOR') {
    return [
      { id: '1', label: '1', localPos: [-5.08, 0, 0] },
      { id: '2', label: '2', localPos: [5.08, 0, 0] },
    ];
  }
  if (t === 'CAPACITOR_ELECTROLYTIC') {
    return [
      { id: '+', label: '+', localPos: [-2.54, 0, 0] },
      { id: '-', label: '-', localPos: [2.54, 0, 0] },
    ];
  }
  if (t === 'CAPACITOR') {
    return [
      { id: '1', label: '1', localPos: [-2.54, 0, 0] },
      { id: '2', label: '2', localPos: [2.54, 0, 0] },
    ];
  }
  if (t.includes('TRANSISTOR') || t.includes('BJT')) {
    return [
      { id: 'e', label: 'E', localPos: [-2.54, 0, 0] },
      { id: 'b', label: 'B', localPos: [0, 0, 0] },
      { id: 'c', label: 'C', localPos: [2.54, 0, 0] },
    ];
  }
  if (t.includes('MOSFET') || t.includes('REGULATOR') || t.includes('7805') || t.includes('LM317')) {
    const isReg = t.includes('REGULATOR') || t.includes('7805') || t.includes('LM317');
    return [
      { id: '1', label: isReg ? 'IN' : 'G', localPos: [-2.54, 0, 0.6] },
      { id: '2', label: isReg ? 'GND' : 'D', localPos: [0, 0, 0.6] },
      { id: '3', label: isReg ? 'OUT' : 'S', localPos: [2.54, 0, 0.6] },
    ];
  }
  if (t === 'POTENTIOMETER') {
    return [
      { id: '1', label: '1', localPos: [-2.54, 0, 0] },
      { id: '2', label: 'W', localPos: [0, 0, 2.54] },
      { id: '3', label: '3', localPos: [2.54, 0, 0] },
    ];
  }
  if (t === 'BUZZER_ACTIVE' || t === 'ACTUATOR_BUZZER_ACTIVE' || t === 'BUZZER') {
    return [
      { id: '+', label: '+', localPos: [-2.54, 0, 0] },
      { id: '-', label: '-', localPos: [2.54, 0, 0] },
    ];
  }
  if (t === 'PUSHBUTTON') {
    return [
      { id: '1A', label: '1A', localPos: [-2.54, 0, -2.54] },
      { id: '1B', label: '1B', localPos: [2.54, 0, -2.54] },
      { id: '2A', label: '2A', localPos: [-2.54, 0, 2.54] },
      { id: '2B', label: '2B', localPos: [2.54, 0, 2.54] },
    ];
  }
  if (t === 'SLIDE_SWITCH') {
    return [
      { id: '1', label: '1', localPos: [-2.54, 0, 0] },
      { id: '2', label: 'COM', localPos: [0, 0, 0] },
      { id: '3', label: '2', localPos: [2.54, 0, 0] },
    ];
  }
  if (t === 'SENSOR_LDR') {
    return [
      { id: '1', label: '1', localPos: [-2.54, 0, 0] },
      { id: '2', label: '2', localPos: [2.54, 0, 0] },
    ];
  }
  if (t === 'SERVO_SG90' || t === 'ACTUATOR_SERVO_SG90' || t === 'SERVO') {
    return [
      { id: 'GND', label: 'GND', localPos: [-16.0, 5, -2.54] },
      { id: 'VCC', label: '5V', localPos: [-16.0, 5, 0] },
      { id: 'PWM', label: 'PWM', localPos: [-16.0, 5, 2.54] },
    ];
  }
  if (t === 'LCD_1602' || t === 'DISPLAY_LCD1602') {
    const LCD_PIN_NAMES = [
      'VSS', 'VDD', 'V0', 'RS', 'RW', 'E',
      'D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7',
      'A', 'K'
    ];
    return LCD_PIN_NAMES.map((name, i) => ({
      id: name,
      label: name,
      localPos: [-16.0 + (-19.05 + i * 2.54), 7.8, -14.0] as [number, number, number],
    }));
  }
  if (t.includes('OLED') || t === 'DISPLAY_OLED_SSD1306' || t === 'MODULE_OLED_I2C') {
    return [
      { id: 'GND', label: 'GND', localPos: [-3.81, 3.5, -12] },
      { id: 'VCC', label: 'VCC', localPos: [-1.27, 3.5, -12] },
      { id: 'SCL', label: 'SCL', localPos: [1.27, 3.5, -12] },
      { id: 'SDA', label: 'SDA', localPos: [3.81, 3.5, -12] },
    ];
  }
  if (t.includes('RELAY')) {
    return [
      { id: 'VCC', label: 'VCC', localPos: [-5.08, 3.5, 10] },
      { id: 'GND', label: 'GND', localPos: [-2.54, 3.5, 10] },
      { id: 'IN', label: 'IN', localPos: [0, 3.5, 10] },
      { id: 'NO', label: 'NO', localPos: [-5.08, 5.0, -10] },
      { id: 'COM', label: 'COM', localPos: [0, 5.0, -10] },
      { id: 'NC', label: 'NC', localPos: [5.08, 5.0, -10] },
    ];
  }
  if (t === 'MOTOR_DRIVER_L298N') {
    return [
      { id: '12V', label: '12V', localPos: [-14, 5, 14] },
      { id: 'GND', label: 'GND', localPos: [-10, 5, 14] },
      { id: '5V', label: '5V', localPos: [-6, 5, 14] },
      { id: 'ENA', label: 'ENA', localPos: [0, 4, 14] },
      { id: 'IN1', label: 'IN1', localPos: [2.54, 4, 14] },
      { id: 'IN2', label: 'IN2', localPos: [5.08, 4, 14] },
      { id: 'IN3', label: 'IN3', localPos: [7.62, 4, 14] },
      { id: 'IN4', label: 'IN4', localPos: [10.16, 4, 14] },
      { id: 'ENB', label: 'ENB', localPos: [12.7, 4, 14] },
    ];
  }
  if (t === 'MODULE_NRF24L01') {
    return [
      { id: 'GND', label: 'GND', localPos: [-3.81, 3, 10] },
      { id: 'VCC', label: 'VCC', localPos: [-1.27, 3, 10] },
      { id: 'CE', label: 'CE', localPos: [1.27, 3, 10] },
      { id: 'CSN', label: 'CSN', localPos: [3.81, 3, 10] },
      { id: 'SCK', label: 'SCK', localPos: [-3.81, 3, 12.54] },
      { id: 'MOSI', label: 'MOSI', localPos: [-1.27, 3, 12.54] },
      { id: 'MISO', label: 'MISO', localPos: [1.27, 3, 12.54] },
      { id: 'IRQ', label: 'IRQ', localPos: [3.81, 3, 12.54] },
    ];
  }
  if (t === 'MODULE_ESP01') {
    return [
      { id: 'TXD', label: 'TXD', localPos: [-3.81, 3, 8] },
      { id: 'CH_PD', label: 'CH_PD', localPos: [-1.27, 3, 8] },
      { id: 'RST', label: 'RST', localPos: [1.27, 3, 8] },
      { id: 'VCC', label: 'VCC', localPos: [3.81, 3, 8] },
      { id: 'GND', label: 'GND', localPos: [-3.81, 3, 10.54] },
      { id: 'GPIO2', label: 'GPIO2', localPos: [-1.27, 3, 10.54] },
      { id: 'GPIO0', label: 'GPIO0', localPos: [1.27, 3, 10.54] },
      { id: 'RXD', label: 'RXD', localPos: [3.81, 3, 10.54] },
    ];
  }
  if (t.includes('STM32')) {
    const stmPins = ['B12', 'B13', 'B14', 'B15', 'A8', 'A9', 'A10', 'A11', 'A12', 'A15', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', '5V', 'GND', '3V3'];
    return stmPins.map((p, i) => ({
      id: p,
      label: p,
      localPos: [-15 + i * 1.5, 4.0, 10] as [number, number, number],
    }));
  }

  // Universal Fallback: Check COMPONENT_CATALOG for any board / sensor / module pins!
  const catItem = COMPONENT_CATALOG.find((c) => {
    const ct = (c.type || '').toUpperCase();
    if (ct === t) return true;
    const normCt = ct.replace(/^(MCU_|MODULE_|SENSOR_|DISPLAY_|ACTUATOR_)/, '');
    const normT = t.replace(/^(MCU_|MODULE_|SENSOR_|DISPLAY_|ACTUATOR_)/, '');
    if (normCt === normT) return true;
    if (normT.includes(normCt) || normCt.includes(normT)) return true;
    return false;
  });
  if (catItem?.pins && catItem.pins.length > 0) {
    const pinCount = catItem.pins.length;
    const startX = -((pinCount - 1) * 2.54) / 2;
    return catItem.pins.map((p, i) => ({
      id: p.id,
      label: p.name || (p as unknown as { label?: string }).label || p.id,
      localPos: [startX + i * 2.54, 4.0, 0] as [number, number, number],
    }));
  }

  // Fallback: If component itself carries a pins array
  if ((comp as unknown as { pins?: { id: string; name?: string; label?: string }[] }).pins?.length) {
    const compPins = (comp as unknown as { pins: { id: string; name?: string; label?: string }[] }).pins;
    const pinCount = compPins.length;
    const startX = -((pinCount - 1) * 2.54) / 2;
    return compPins.map((p, i) => ({
      id: p.id,
      label: p.name || p.label || p.id,
      localPos: [startX + i * 2.54, 4.0, 0] as [number, number, number],
    }));
  }

  return [];
}

export function ComponentPinLabelsOverlay({
  comp,
  hoveredPinName,
  showAll,
}: {
  comp: Component3D;
  isSelected?: boolean;
  hoveredPinName: string | null;
  showAll: boolean;
}) {
  const pinLabels = useMemo(() => getComponentPinLabels(comp), [comp]);

  // Render tooltip badge on hovered pin or all badges when user toggles [L]
  if (!showAll && !hoveredPinName) return null;

  const pinsToRender = showAll
    ? pinLabels
    : pinLabels.filter(
        (p) =>
          p.id === hoveredPinName ||
          p.id.toLowerCase() === hoveredPinName?.toLowerCase() ||
          p.label.toLowerCase() === hoveredPinName?.toLowerCase() ||
          (p as unknown as { name?: string }).name?.toLowerCase() === hoveredPinName?.toLowerCase() ||
          (hoveredPinName && (
            (p.id.startsWith('GND') && hoveredPinName.startsWith('GND')) ||
            (p.id.startsWith('RESET') && hoveredPinName.startsWith('RESET')) ||
            (p.id.startsWith('5V') && hoveredPinName.startsWith('5V')) ||
            (p.id.startsWith('3V3') && (hoveredPinName.startsWith('3V3') || hoveredPinName.startsWith('3.3V')))
          ))
      );

  if (pinsToRender.length === 0) return null;

  const rotEuler = new THREE.Euler(
    THREE.MathUtils.degToRad(comp.rotX || 0),
    THREE.MathUtils.degToRad(comp.rotY || 0),
    THREE.MathUtils.degToRad(comp.rotZ || 0)
  );

  return (
    <group position={[comp.x3d, comp.y3d, comp.z3d]} rotation={rotEuler}>
      {pinsToRender.map((p, idx) => {
        const isHovered =
          hoveredPinName === p.id ||
          hoveredPinName?.toLowerCase() === p.id.toLowerCase() ||
          hoveredPinName?.toLowerCase() === p.label.toLowerCase();

        // Staggered Y elevation to prevent overlap on tight header rows
        const elevationY = isHovered ? 4.2 : 3.0 + (idx % 2) * 2.0;
        const labelText = p.label || (p as unknown as { name?: string }).name || p.id;

        return (
          <Html
            key={p.id}
            position={[p.localPos[0], p.localPos[1] + elevationY, p.localPos[2]]}
            center
            distanceFactor={85}
            style={{ pointerEvents: 'none', userSelect: 'none', zIndex: 9999 }}
          >
            <div
              className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] tracking-wide whitespace-nowrap shadow-2xl border transition-all ${
                isHovered
                  ? 'bg-slate-950 text-amber-300 border-amber-400 ring-2 ring-white/90 shadow-amber-500/60 scale-110 z-50'
                  : 'bg-slate-900/95 text-cyan-300 border-cyan-500/70 shadow-black/90'
              }`}
            >
              {labelText}
            </div>
          </Html>
        );
      })}
    </group>
  );
}

function DragFrameController({
  draggingCompId,
  components3d,
  occupiedHoleIds,
  hasBreadboard,
  breadboardCount = 1,
  onUpdateComponent3D,
}: DragFrameControllerProps) {
  const { camera, raycaster, pointer } = useThree();
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hitPoint = useMemo(() => new THREE.Vector3(), []);
  const lastTargetRef = useRef<{ x: number; y: number; z: number } | null>(null);

  useFrame(() => {
    if (!draggingCompId) {
      lastTargetRef.current = null;
      return;
    }
    const comp = components3d.find((c) => c.id === draggingCompId);
    if (!comp) return;

    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(plane, hitPoint)) {
      let targetX = hitPoint.x;
      let targetZ = hitPoint.z;
      let targetY = comp.y3d;

      const isDipPackage = [
        'TIMER_555',
        'DIP_IC',
        'ATMEGA328P',
        'ARDUINO_NANO',
        'ESP32_DEVKIT',
        'RASPBERRY_PI_PICO',
        'OPAMP_LM358',
        'OPAMP_LM741',
        'COMPARATOR_LM393',
      ].includes(comp.type) || comp.type.includes('DIP') || comp.type.includes('555') || comp.type.includes('328') || comp.type.includes('OPAMP');

      const isThroughHole = isDipPackage || [
        'RESISTOR',
        'LED',
        'LED_RGB',
        'ACTUATOR_RGB_LED',
        'HC_SR04',
        'SENSOR_ULTRASONIC',
        'CAPACITOR',
        'CAPACITOR_ELECTROLYTIC',
        'DIODE',
        'DIODE_1N4007',
        'INDUCTOR',
        'BJT_NPN',
        'BJT_PNP',
        'TRANSISTOR_NPN',
        'TRANSISTOR_PNP',
        'MOSFET_N',
        'MOSFET_P',
        'REGULATOR_7805',
        'REGULATOR_LM317',
        'SENSOR_LDR',
        'PUSHBUTTON',
        'BUZZER_ACTIVE',
        'ACTUATOR_BUZZER_ACTIVE',
        'POTENTIOMETER',
        'SLIDE_SWITCH',
      ].includes(comp.type);

      const isEvenPinPart = [
        'TIMER_555',
        'DIP_IC',
        'LED_RGB',
        'ACTUATOR_RGB_LED',
        'HC_SR04',
        'SENSOR_ULTRASONIC',
        'OPAMP_LM358',
      ].includes(comp.type) || (comp.type.includes('DIP') && !comp.type.includes('14') && !comp.type.includes('74HC'));

      // Check which breadboard is closest
      let bestBoard = 0;
      let minBoardDist = Infinity;
      for (let b = 0; b < breadboardCount; b++) {
        const bZ = -b * 60.0;
        const dist = Math.abs(targetZ - bZ);
        if (dist < minBoardDist) {
          minBoardDist = dist;
          bestBoard = b;
        }
      }
      const boardCenterZ = -bestBoard * 60.0;
      const isOverBoard = hasBreadboard && Math.abs(targetX) <= 85 && minBoardDist <= 30;

      if (isOverBoard && isDipPackage && minBoardDist <= 22) {
        // Automatic IC Snapping straddling center DIP notch
        if (isEvenPinPart) {
          const nearestCol = Math.max(2, Math.min(61, Math.round((targetX - START_X) / PITCH_X - 0.5) + 1));
          targetX = START_X + (nearestCol - 0.5) * PITCH_X;
        } else {
          const nearestCol = Math.max(2, Math.min(62, Math.round((targetX - START_X) / PITCH_X) + 1));
          targetX = START_X + (nearestCol - 1) * PITCH_X;
        }
        targetZ = boardCenterZ;   // Straddle center DIP ravine
        targetY = computeComponentGroundElevation(comp.type, targetX, targetZ, true, 0, breadboardCount);
      } else if (isOverBoard && isThroughHole) {
        if (isEvenPinPart) {
          const nearestCol = Math.max(2, Math.min(61, Math.round((targetX - START_X) / PITCH_X - 0.5) + 1));
          targetX = START_X + (nearestCol - 0.5) * PITCH_X;
          const relZ = targetZ - boardCenterZ;
          targetZ = boardCenterZ + (relZ <= 0 ? -8.42 : 8.42);
        } else {
          const freeHole = findNearestFreeHole830(targetX, targetZ - boardCenterZ, occupiedHoleIds);
          if (freeHole) {
            targetX = freeHole.x;
            targetZ = freeHole.z + boardCenterZ;
          }
        }
        targetY = computeComponentGroundElevation(comp.type, targetX, targetZ, true, 0, breadboardCount);
      } else {
        targetX = Math.round(targetX / 2.54) * 2.54;
        targetZ = Math.round(targetZ / 2.54) * 2.54;
        targetY = computeComponentGroundElevation(comp.type, targetX, targetZ, false, 0, breadboardCount);
      }

      targetX = Math.round(targetX * 100) / 100;
      targetY = Math.round(targetY * 100) / 100;
      targetZ = Math.round(targetZ * 100) / 100;

      // Smooth Sliding 2D AABB Footprint Collision & Stacking Guard
      const myFp = getComponentFootprint(comp.type);

      const checkCollisionAt = (tx: number, tz: number) => {
        const cMinX = tx - myFp.halfW;
        const cMaxX = tx + myFp.halfW;
        const cMinZ = tz - myFp.halfD;
        const cMaxZ = tz + myFp.halfD;

        return components3d.some((other) => {
          if (other.id === comp.id) return false;
          if (Math.abs(other.y3d - targetY) >= 4) return false;
          const otherFp = getComponentFootprint(other.type);
          const oMinX = other.x3d - otherFp.halfW;
          const oMaxX = other.x3d + otherFp.halfW;
          const oMinZ = other.z3d - otherFp.halfD;
          const oMaxZ = other.z3d + otherFp.halfD;

          return cMinX + 0.2 < oMaxX && cMaxX - 0.2 > oMinX && cMinZ + 0.2 < oMaxZ && cMaxZ - 0.2 > oMinZ;
        });
      };

      if (checkCollisionAt(targetX, targetZ)) {
        // Try sliding along X-only (preserve previous Z)
        const prevZ = lastTargetRef.current ? lastTargetRef.current.z : comp.z3d;
        if (!checkCollisionAt(targetX, prevZ)) {
          targetZ = prevZ;
        } else {
          // Try sliding along Z-only (preserve previous X)
          const prevX = lastTargetRef.current ? lastTargetRef.current.x : comp.x3d;
          if (!checkCollisionAt(prevX, targetZ)) {
            targetX = prevX;
          } else {
            // Clean stacking prevention: lift cleanly onto top surface so components do not clip inside each other
            const collidingOthers = components3d.filter((other) => {
              if (other.id === comp.id) return false;
              const otherFp = getComponentFootprint(other.type);
              const oMinX = other.x3d - otherFp.halfW;
              const oMaxX = other.x3d + otherFp.halfW;
              const oMinZ = other.z3d - otherFp.halfD;
              const oMaxZ = other.z3d + otherFp.halfD;
              const cMinX = targetX - myFp.halfW;
              const cMaxX = targetX + myFp.halfW;
              const cMinZ = targetZ - myFp.halfD;
              const cMaxZ = targetZ + myFp.halfD;
              return cMinX + 0.2 < oMaxX && cMaxX - 0.2 > oMinX && cMinZ + 0.2 < oMaxZ && cMaxZ - 0.2 > oMinZ;
            });
            if (collidingOthers.length > 0) {
              const maxTopY = Math.max(...collidingOthers.map((o) => {
                const spec = getComponentElevationSpec(o.type);
                return o.y3d + (spec.packageHeight || 8.0);
              }));
              targetY = Math.max(targetY, maxTopY + 0.5);
            }
          }
        }
      }

      if (
        !lastTargetRef.current ||
        lastTargetRef.current.x !== targetX ||
        lastTargetRef.current.y !== targetY ||
        lastTargetRef.current.z !== targetZ
      ) {
        lastTargetRef.current = { x: targetX, y: targetY, z: targetZ };
        onUpdateComponent3D({
          ...comp,
          x3d: targetX,
          y3d: targetY,
          z3d: targetZ,
        });
      }
    }
  });

  return null;
}

function WebGlResourceDisposer() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const disposeMaterial = (m: THREE.Material) => {
      const std = m as unknown as Record<string, { dispose?: () => void } | undefined>;
      ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'alphaMap'].forEach((k) => {
        try { std[k]?.dispose?.(); } catch {}
      });
      try { m.dispose(); } catch {}
    };

    return () => {
      scene.traverse((obj) => {
        const mesh = obj as unknown as {
          geometry?: { dispose: () => void };
          material?: THREE.Material | THREE.Material[];
        };
        if (mesh.geometry) {
          try {
            mesh.geometry.dispose();
          } catch {}
        }
        if (mesh.material) {
          try {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => disposeMaterial(m));
            } else {
              disposeMaterial(mesh.material);
            }
          } catch {}
        }
      });
      try {
        gl.dispose();
      } catch {}
    };
  }, [gl, scene]);
  return null;
}

export interface Studio3DCanvasProps {
  hasBreadboard?: boolean;
  breadboardCount?: number;
  onToggleBreadboard?: () => void;
  onToggleMcuUsb?: (compId: string) => void;
  components3d: Component3D[];
  wires3d: Wire3D[];
  selectedCompId: string | null;
  selectedWireId: string | null;
  onSelectComponent: (id: string | null) => void;
  onSelectWire: (id: string | null) => void;
  onAddComponent3D: (comp: Component3D) => void;
  onUpdateComponent3D: (comp: Component3D) => void;
  onDeleteComponent3D: (id: string) => void;
  onAddWire3D: (wire: Wire3D) => void;
  onDeleteWire3D: (id: string) => void;
  onUpdateWire3D: (wire: Wire3D) => void;
  isSimulating?: boolean;
  simulationStates?: Record<
    string,
    {
      voltage: number;
      current: number;
      on?: boolean;
      brightness?: number;
      status?: 'NORMAL' | 'WARNING' | 'BURNED';
      burned?: boolean;
      fault?: string;
    }
  >;
  wireCurrents?: Record<string, number>;
  circuitWires?: CircuitWire[];
  circuitComponents?: CircuitComponent[];
  onMirrorComponent?: (id: string) => void;
}

export function Studio3DCanvas({
  hasBreadboard = true,
  breadboardCount = 1,
  onToggleMcuUsb,
  components3d,
  wires3d,
  selectedCompId,
  selectedWireId,
  onSelectComponent,
  onSelectWire,
  onAddComponent3D,
  onUpdateComponent3D,
  onDeleteComponent3D,
  onAddWire3D,
  onDeleteWire3D,
  onUpdateWire3D,
  onMirrorComponent,
  isSimulating = false,
  simulationStates = {},
  wireCurrents = {},
  circuitWires = [],
}: Studio3DCanvasProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [libSearch, setLibSearch] = useState('');
  const [libTier, setLibTier] = useState<'all' | 'generic' | 'real' | 'industrial'>('all');
  const [libCategory25, setLibCategory25] = useState<string>('all');
  const [libSubCategory, setLibSubCategory] = useState<string>('all');
  const [toolMode3D, setToolMode3D] = useState<'inspect' | 'wire'>('inspect');
  const [isPanMode, setIsPanMode] = useState<boolean>(false);
  const [editingWireEndpoint, setEditingWireEndpoint] = useState<{ wireId: string; end: 'from' | 'to' } | null>(null);
  const [activeWireStart, setActiveWireStart] = useState<{
    compId: string;
    pinId: string;
    pos: THREE.Vector3;
  } | null>(null);
  const [activeWireColor, setActiveWireColor] = useState('#EF4444');
  const [hoveredHole, setHoveredHole] = useState<BreadboardHole3D | null>(null);
  const [hoveredPinInfo, setHoveredPinInfo] = useState<{ compId: string; pinName: string } | null>(null);
  const [showPinLabels, setShowPinLabels] = useState(false);
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const draggingCompRef = useRef<{ id: string; startPos: [number, number, number] } | null>(null);
  const pointerDownPosRef = useRef<{ clientX: number; clientY: number; compId: string } | null>(null);

  // Window pointer listeners enforce 6px drag threshold and re-enable OrbitControls after drag
  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (pointerDownPosRef.current && !draggingCompRef.current) {
        const dx = e.clientX - pointerDownPosRef.current.clientX;
        const dy = e.clientY - pointerDownPosRef.current.clientY;
        if (Math.hypot(dx, dy) >= 6) {
          const compId = pointerDownPosRef.current.compId;
          const comp = components3d.find((c) => c.id === compId);
          if (comp) {
            if (controlsRef.current) controlsRef.current.enabled = false;
            draggingCompRef.current = { id: compId, startPos: [comp.x3d, comp.y3d, comp.z3d] };
            setDraggingCompId(compId);
          }
        }
      }
    };

    const handleGlobalPointerUp = () => {
      pointerDownPosRef.current = null;
      if (draggingCompRef.current) {
        draggingCompRef.current = null;
        setDraggingCompId(null);
        if (controlsRef.current) controlsRef.current.enabled = true;
      }
    };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [components3d]);

  const toggleUsb = useCallback((compId: string) => {
    if (onToggleMcuUsb) {
      onToggleMcuUsb(compId);
      return;
    }
    const comp = components3d.find((c) => c.id === compId);
    if (!comp) return;
    const isPlugged = comp.parameters?.usbPlugged !== false;
    const nextState = !isPlugged;
    const updated: Component3D = {
      ...comp,
      parameters: { ...comp.parameters, usbPlugged: nextState, dcJackPlugged: false },
    };
    onUpdateComponent3D(updated);
    toast.success(
      nextState
        ? `🔌 Connected USB Power to ${comp.label} (5.0V Active)`
        : `⚡ Unplugged USB Cable from ${comp.label}`
    );
  }, [components3d, onToggleMcuUsb, onUpdateComponent3D]);

  const available3DSubCategories = useMemo(() => {
    const subs = new Set<string>();
    COMPONENT_CATALOG.forEach((item) => {
      const cat25 = getCategory25ForComponent(item);
      const matchCat = libCategory25 === 'all' || cat25.id === libCategory25;
      const matchTier = libTier === 'all' || (item.libraryTier || 'generic') === libTier;
      const q = libSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.partNumber && item.partNumber.toLowerCase().includes(q)) ||
        (item.manufacturer && item.manufacturer.toLowerCase().includes(q)) ||
        (item.physicalSpec?.packageCode && item.physicalSpec.packageCode.toLowerCase().includes(q));
      if (matchCat && matchTier && matchSearch && item.subCategory) {
        subs.add(item.subCategory);
      }
    });
    return Array.from(subs).sort();
  }, [libCategory25, libTier, libSearch]);

  const filteredLibrary = useMemo(() => {
    const q = libSearch.toLowerCase().trim();
    return COMPONENT_CATALOG.filter((item) => {
      const cat25 = getCategory25ForComponent(item);
      const matchCat = libCategory25 === 'all' || cat25.id === libCategory25;
      const matchTier = libTier === 'all' || (item.libraryTier || 'generic') === libTier;
      const matchSub = libSubCategory === 'all' || item.subCategory === libSubCategory;
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.partNumber && item.partNumber.toLowerCase().includes(q)) ||
        (item.manufacturer && item.manufacturer.toLowerCase().includes(q)) ||
        (item.physicalSpec?.packageCode && item.physicalSpec.packageCode.toLowerCase().includes(q));
      return matchCat && matchTier && matchSub && matchSearch;
    });
  }, [libCategory25, libTier, libSubCategory, libSearch]);

  // Keyboard shortcut listener (R to rotate 45°, Arrows/Page to nudge, Delete to remove, Esc to cancel wire)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'r' || e.key === 'R') {
        if (selectedCompId) {
          const comp = components3d.find((c) => c.id === selectedCompId);
          if (comp) {
            e.preventDefault();
            const step = e.shiftKey ? -45 : 45;
            const curY = comp.rotY || 0;
            const nextY = stepAngle45(curY, step);
            onUpdateComponent3D({
              ...comp,
              rotY: nextY,
            });
            toast.info(`Rotated ${comp.label} Yaw to ${nextY}°`);
          }
        }
      } else if (e.key === 'f' || e.key === 'F') {
        if (selectedCompId) {
          const comp = components3d.find((c) => c.id === selectedCompId);
          if (comp) {
            e.preventDefault();
            const flipped = flipComponent3D(comp);
            onUpdateComponent3D(flipped);
            onMirrorComponent?.(selectedCompId);
            toast.info(`Flipped ${comp.label} 180° (Yaw: ${flipped.rotY}°) [F]`);
          }
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (selectedCompId) {
          const comp = components3d.find((c) => c.id === selectedCompId);
          if (comp) {
            e.preventDefault();
            const step = e.shiftKey ? 5.08 : 2.54;
            let dx = 0;
            let dz = 0;
            if (e.key === 'ArrowLeft') dx = -step;
            if (e.key === 'ArrowRight') dx = step;
            if (e.key === 'ArrowUp') dz = -step;
            if (e.key === 'ArrowDown') dz = step;
            onUpdateComponent3D({
              ...comp,
              x3d: Math.round((comp.x3d + dx) * 100) / 100,
              z3d: Math.round((comp.z3d + dz) * 100) / 100,
            });
          }
        }
      } else if (e.key === 'PageUp' || e.key === 'PageDown' || e.key === 'q' || e.key === 'Q' || e.key === 'e' || e.key === 'E') {
        if (selectedCompId) {
          const comp = components3d.find((c) => c.id === selectedCompId);
          if (comp) {
            e.preventDefault();
            const isUp = e.key === 'PageUp' || e.key === 'e' || e.key === 'E';
            const dy = isUp ? 2.54 : -2.54;
            const minGroundY = computeComponentGroundElevation(comp.type, comp.x3d, comp.z3d, false);
            const nextY = Math.max(minGroundY, Math.round((comp.y3d + dy) * 100) / 100);
            onUpdateComponent3D({
              ...comp,
              y3d: nextY,
            });
          }
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedWireId) {
          e.preventDefault();
          onDeleteWire3D(selectedWireId);
          onSelectWire(null);
        } else if (selectedCompId) {
          e.preventDefault();
          onDeleteComponent3D(selectedCompId);
          onSelectComponent(null);
        }
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setToolMode3D('wire');
        toast.info('Wire Tool Active [W]');
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        setToolMode3D('inspect');
        setActiveWireStart(null);
        setEditingWireEndpoint(null);
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        setShowPinLabels((v) => !v);
        toast.info(!showPinLabels ? 'Pin Labels Shown [L]' : 'Pin Labels Hidden [L]');
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setIsPanMode((v) => !v);
      } else if (e.key === 'Escape') {
        setIsPanMode(false);
        setActiveWireStart(null);
        setEditingWireEndpoint(null);
        setToolMode3D('inspect');
        setActiveWireStart(null);
        onSelectWire(null);
        onSelectComponent(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCompId, selectedWireId, components3d, onUpdateComponent3D, onDeleteWire3D, onDeleteComponent3D, onSelectWire, onSelectComponent, showPinLabels, onMirrorComponent]);

  // CAD Viewport Camera Presets & Navigation
  const setCameraView = (view: 'iso' | 'top' | 'front' | 'side') => {
    if (!controlsRef.current) return;
    const ctrl = controlsRef.current;
    if (view === 'iso') {
      ctrl.object.position.set(0, 140, 160);
      ctrl.target.set(0, 0, 0);
    } else if (view === 'top') {
      ctrl.object.position.set(0, 200, 0.1);
      ctrl.target.set(0, 0, 0);
    } else if (view === 'front') {
      ctrl.object.position.set(0, 20, 180);
      ctrl.target.set(0, 0, 0);
    } else if (view === 'side') {
      ctrl.object.position.set(200, 20, 0);
      ctrl.target.set(0, 0, 0);
    }
    ctrl.update();
  };

  const focusSelectedOrBreadboard = useCallback(() => {
    if (!controlsRef.current) return;
    const ctrl = controlsRef.current;
    if (selectedCompId) {
      const comp = components3d.find((c) => c.id === selectedCompId);
      if (comp) {
        ctrl.target.set(comp.x3d, comp.y3d, comp.z3d);
        ctrl.object.position.set(comp.x3d, comp.y3d + 55, comp.z3d + 65);
        ctrl.update();
        toast.info(`Framed view on ${comp.label}`);
        return;
      }
    }
    // Default: Center on breadboard
    ctrl.target.set(0, 8.5, 0);
    ctrl.object.position.set(0, 130, 150);
    ctrl.update();
    toast.info('Centered view on breadboard');
  }, [selectedCompId, components3d]);

  const zoomCamera = useCallback((direction: 'in' | 'out') => {
    if (!controlsRef.current) return;
    const ctrl = controlsRef.current;
    const dir = new THREE.Vector3().subVectors(ctrl.object.position, ctrl.target);
    const factor = direction === 'in' ? 0.8 : 1.25;
    ctrl.object.position.copy(ctrl.target).add(dir.multiplyScalar(factor));
    ctrl.update();
  }, []);

  const resetCamera = useCallback(() => {
    if (!controlsRef.current) return;
    const ctrl = controlsRef.current;
    ctrl.target.set(0, 0, 0);
    ctrl.object.position.set(0, 140, 160);
    ctrl.update();
    toast.info('Reset camera to home isometric view');
  }, []);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {
          setIsFullscreen((prev) => !prev);
        });
      } else {
        setIsFullscreen((prev) => !prev);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {
          setIsFullscreen(false);
        });
      } else {
        setIsFullscreen(false);
      }
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Helper to compute world position for any pin
  const getPinWorld3D = useCallback((compId: string, pinId: string): THREE.Vector3 => {
    if (compId === 'breadboard') {
      let baseId = pinId;
      let boardZ = 0;
      if (pinId.startsWith('bb2_')) {
        baseId = 'bb_' + pinId.slice(4);
        boardZ = -60.0;
      } else if (pinId.startsWith('bb3_')) {
        baseId = 'bb_' + pinId.slice(4);
        boardZ = -120.0;
      }
      const hole = HOLE_BY_ID.get(baseId);
      if (hole) return new THREE.Vector3(hole.x, hole.y + 0.5, hole.z + boardZ);
      return new THREE.Vector3(0, 0, 0);
    }

    const comp = components3d.find((c) => c.id === compId);
    if (!comp) return new THREE.Vector3(0, 0, 0);

    let lx = 0;
    let ly = 0;
    let lz = 0;

    if (comp.type === 'ARDUINO_MEGA') {
      const mp = MEGA_PINS.find((p) => p.name === pinId || p.altNames?.includes(pinId));
      if (mp) {
        lx = mp.localPos[0];
        ly = mp.localPos[1] + 4.2;
        lz = mp.localPos[2];
      }
    } else if (comp.type === 'ARDUINO_UNO') {
      const ap = ARDUINO_PINS.find((p) => p.name === pinId);
      if (ap) {
        lx = ap.localPos[0];
        ly = ap.localPos[1] + 4.2;
        lz = ap.localPos[2];
      }
    } else if (comp.type === 'ARDUINO_NANO') {
      const np = NANO_PINS.find((p) => p.name === pinId);
      if (np) {
        lx = np.localPos[0];
        ly = np.localPos[1] + 4.3;
        lz = np.localPos[2];
      }
    } else if (comp.type === 'ESP32_DEVKIT') {
      const ep = ESP32_PINS.find((p) => p.name === pinId);
      if (ep) {
        lx = ep.localPos[0];
        ly = ep.localPos[1] + 4.3;
        lz = ep.localPos[2];
      }
    } else if (comp.type === 'RASPBERRY_PI_PICO') {
      const pp = PICO_PINS.find((p) => p.name === pinId || p.altNames?.includes(pinId));
      if (pp) {
        lx = pp.localPos[0];
        ly = pp.localPos[1] + 4.3;
        lz = pp.localPos[2];
      }
    } else if (comp.type === 'LED') {
      const p = (pinId || '').toLowerCase();
      if (p === 'anode' || p === 'a' || p === '1' || p === '+') lx = -2.54;
      else lx = 2.54;
      ly = 0;
      lz = 0;
    } else if (comp.type === 'LED_RGB' || comp.type === 'ACTUATOR_RGB_LED') {
      const p = (pinId || '').trim().toLowerCase();
      if (p === 'r' || p === '1' || p === 'red') lx = -3.81;
      else if (p === 'c' || p === 'cc' || p === 'com' || p === 'gnd' || p === 'cathode' || p === '2') lx = -1.27;
      else if (p === 'g' || p === '3' || p === 'green') lx = 1.27;
      else lx = 3.81; // 'b', '4', 'blue'
      ly = 0;
      lz = 0;
    } else if (comp.type === 'BUZZER_ACTIVE' || comp.type === 'ACTUATOR_BUZZER_ACTIVE' || comp.type === 'BUZZER') {
      const p = (pinId || '').toLowerCase();
      if (p === '+' || p === '1' || p === 'pos' || p === 'p') lx = -2.54;
      else lx = 2.54;
      ly = 0;
      lz = 0;
    } else if (comp.type === 'DIODE' || comp.type === 'DIODE_1N4007') {
      const p = (pinId || '').toLowerCase();
      if (p === '1' || p === 'anode' || p === 'a') lx = -5.08;
      else lx = 5.08;
      ly = 0;
      lz = 0;
    } else if (comp.type === 'SENSOR_LDR') {
      if (pinId === '1') lx = -2.54;
      else lx = 2.54;
      ly = 0;
      lz = 0;
    } else if (comp.type === 'SLIDE_SWITCH') {
      if (pinId === '1') lx = -2.54;
      else if (pinId === '2') lx = 0;
      else lx = 2.54;
      ly = 0;
      lz = 0;
    } else if (comp.type === 'RESISTOR') {
      if (pinId === '1') lx = -5.08;
      else lx = 5.08;
      ly = 0;
      lz = 0;
    } else if (comp.type === 'INDUCTOR') {
      if (pinId === '1') lx = -5.08;
      else lx = 5.08;
      ly = 0;
      lz = 0;
    } else if (comp.type === 'BJT_NPN' || comp.type === 'BJT_PNP' || comp.type === 'TRANSISTOR_NPN' || comp.type === 'TRANSISTOR_PNP') {
      const p = (pinId || '').toLowerCase();
      if (p === 'e' || p === 'emitter' || p === '1') lx = -2.54;
      else if (p === 'b' || p === 'base' || p === '2') lx = 0;
      else lx = 2.54; // 'c', 'collector', '3'
      ly = 0;
      lz = 0;
    } else if (comp.type === 'MOSFET_N' || comp.type === 'MOSFET_P' || comp.type === 'REGULATOR_7805' || comp.type === 'REGULATOR_LM317') {
      const p = (pinId || '').toLowerCase();
      if (p === 'g' || p === 'gate' || p === 'in' || p === '1') lx = -2.54;
      else if (p === 'd' || p === 'drain' || p === 'gnd' || p === 'ground' || p === '2') lx = 0;
      else lx = 2.54; // 's', 'source', 'out', '3'
      ly = 0;
      lz = 0.6;
    } else if (comp.type === 'POTENTIOMETER') {
      if (pinId === '1') { lx = -2.54; lz = 0; }
      else if (pinId === '2' || pinId === 'wiper') { lx = 0; lz = 2.54; }
      else { lx = 2.54; lz = 0; }
      ly = 0;
    } else if (comp.type === 'CAPACITOR' || comp.type === 'CAPACITOR_ELECTROLYTIC') {
      if (pinId === '1' || pinId === '+') lx = -2.54;
      else lx = 2.54;
      ly = 0;
      lz = 0;
    } else if (comp.type === 'TIMER_555' || comp.type === 'DIP_IC' || comp.type === 'OPAMP_LM358' || comp.type === 'OPAMP_LM741') {
      let pNum = parseInt(pinId);
      if (isNaN(pNum)) {
        const nameMap: Record<string, number> = {
          gnd: 1, vss: 1, out1: 1, ofst1: 1,
          trig: 2, trigger: 2, in1_minus: 2, in_minus: 2,
          out: 3, output: 3, in1_plus: 3, in_plus: 3,
          reset: 4, rst: 4, 'v-': 4,
          ctrl: 5, control: 5, cv: 5, in2_plus: 5, ofst2: 5,
          thres: 6, thresh: 6, threshold: 6, in2_minus: 6,
          disch: 7, discharge: 7, dis: 7, out2: 7, 'v+': 7,
          vcc: 8, vdd: 8, '+v': 8, nc: 8,
        };
        pNum = nameMap[pinId.toLowerCase()] || 1;
      }
      if (pNum >= 1 && pNum <= 4) {
        lx = -3.81 + (pNum - 1) * 2.54;
        lz = -3.34; // Row E for pins 1..4
      } else {
        lx = 3.81 - (pNum - 5) * 2.54;
        lz = 3.34;  // Row F for pins 5..8
      }
      ly = 0;
    } else if (comp.type === 'BATTERY_9V' || comp.type === 'BATTERY') {
      const p = (pinId || '').toLowerCase();
      if (p === '+' || p === 'p' || p === 'pos' || p === '1') lx = -6.5;
      else lx = 6.5;
      ly = 48;
    } else if (comp.type === 'PUSHBUTTON') {
      if (pinId === '1A' || pinId === '1') { lx = -2.54; lz = -2.54; }
      else if (pinId === '1B' || pinId === '2') { lx = 2.54; lz = -2.54; }
      else if (pinId === '2A' || pinId === '3') { lx = -2.54; lz = 2.54; }
      else { lx = 2.54; lz = 2.54; }
      ly = 0;
    } else if (
      comp.type === 'MODULE_BLUETOOTH_HC05' ||
      comp.type === 'BLUETOOTH' ||
      comp.type === 'HC05' ||
      comp.type === 'HC06' ||
      comp.type === 'RF_BLUETOOTH' ||
      comp.type.includes('BLUETOOTH') ||
      comp.parameters?.model3d === 'module_bluetooth_hc05'
    ) {
      const p = (pinId || '').toUpperCase();
      if (p === 'STATE' || p === '1') lx = -6.35;
      else if (p === 'RXD' || p === 'RX' || p === '2') lx = -3.81;
      else if (p === 'TXD' || p === 'TX' || p === '3') lx = -1.27;
      else if (p === 'GND' || p === '4') lx = 1.27;
      else if (p === 'VCC' || p === '5V' || p === '5') lx = 3.81;
      else if (p === 'EN' || p === 'KEY' || p === '6') lx = 6.35;
      ly = 2.5;
      lz = 16.0;
    } else if (comp.type === 'HC_SR04' || comp.type === 'SENSOR_ULTRASONIC') {
      const p = (pinId || '').trim().toUpperCase();
      if (p === 'VCC' || p === '1' || p === '5V') lx = -3.81;
      else if (p === 'TRIG' || p === '2' || p === 'TRIGGER') lx = -1.27;
      else if (p === 'ECHO' || p === '3') lx = 1.27;
      else lx = 3.81; // 'GND', '4', 'GROUND', '-'
      ly = 1.25;
      lz = 0;
    } else if (comp.type === 'SERVO_SG90' || comp.type === 'ACTUATOR_SERVO_SG90' || comp.type === 'SERVO') {
      const p = (pinId || '').toUpperCase();
      lx = -16.0;
      ly = 5;
      lz = (p === 'GND' || p === '1') ? -2.54 : (p === 'VCC' || p === '5V' || p === '2') ? 0 : 2.54;
    } else if (comp.type === 'LCD_1602' || comp.type === 'DISPLAY_LCD1602') {
      const LCD_PIN_NAMES = [
        'VSS', 'VDD', 'V0', 'RS', 'RW', 'E',
        'D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7',
        'A', 'K'
      ];
      const pClean = (pinId || '').trim();
      const pUpper = pClean.toUpperCase();
      let pIdx = LCD_PIN_NAMES.indexOf(pUpper) + 1;
      if (pIdx === 0) {
        const num = parseInt(pClean.replace(/\D/g, ''), 10);
        if (num >= 1 && num <= 16) {
          pIdx = num;
        } else {
          const aliasMap: Record<string, number> = {
            'GND': 1, 'GROUND': 1, 'VCC': 2, '5V': 2, 'CONTRAST': 3,
            'EN': 6, 'ENABLE': 6, 'LED+': 15, 'LEDA': 15, 'LED-': 16, 'LEDK': 16
          };
          pIdx = aliasMap[pUpper] || 1;
        }
      }
      lx = -16.0 + (-19.05 + (pIdx - 1) * 2.54);
      ly = 7.8;
      lz = -14.0;
    }

    // Fallback pin resolution for any custom or catalog component
    if (lx === 0 && ly === 0 && lz === 0) {
      const pNum = parseInt(pinId, 10);
      if (!isNaN(pNum)) {
        lx = -2.54 + (pNum - 1) * 2.54;
        ly = 0;
        lz = 0;
      }
    }

    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(comp.rotX || 0),
      THREE.MathUtils.degToRad(comp.rotY || 0),
      THREE.MathUtils.degToRad(comp.rotZ || 0),
      'XYZ'
    );
    const localVec = new THREE.Vector3(lx, ly, lz);
    localVec.applyEuler(euler);

    return new THREE.Vector3(comp.x3d + localVec.x, comp.y3d + localVec.y, comp.z3d + localVec.z);
  }, [components3d]);

  // Strictly maintain Map<holeId, occupiedBy> for all 830 breadboard holes (1 hole = 1 pin, zero stacking)
  const occupiedHoleMap = useMemo(() => {
    const map = new Map<string, string>();
    wires3d.forEach((w) => {
      if (w.fromPin.compId === 'breadboard') map.set(w.fromPin.pinId, `wire:${w.id}:from`);
      if (w.toPin.compId === 'breadboard') map.set(w.toPin.pinId, `wire:${w.id}:to`);
    });
    components3d.forEach((c) => {
      if (c.id !== draggingCompId && Math.abs(c.x3d) <= 85 && Math.abs(c.z3d) <= 30 && c.y3d >= 4.0) {
        if (c.type === 'TIMER_555' || c.type === 'DIP_IC') {
          for (let p = 1; p <= 8; p++) {
            const pw = getPinWorld3D(c.id, String(p));
            const h = findNearestHole830(pw.x, pw.z);
            if (h) map.set(h.id, `${c.id}:${p}`);
          }
        } else if (c.type === 'RESISTOR') {
          ['1', '2'].forEach((p) => {
            const pw = getPinWorld3D(c.id, p);
            const h = findNearestHole830(pw.x, pw.z);
            if (h) map.set(h.id, `${c.id}:${p}`);
          });
        } else if (c.type === 'LED') {
          ['anode', 'cathode'].forEach((p) => {
            const pw = getPinWorld3D(c.id, p);
            const h = findNearestHole830(pw.x, pw.z);
            if (h) map.set(h.id, `${c.id}:${p}`);
          });
        } else if (c.type === 'CAPACITOR' || c.type === 'CAPACITOR_ELECTROLYTIC') {
          ['1', '2', '+', '-'].forEach((p) => {
            const pw = getPinWorld3D(c.id, p);
            const h = findNearestHole830(pw.x, pw.z);
            if (h) map.set(h.id, `${c.id}:${p}`);
          });
        } else if (c.type === 'LED_RGB' || c.type === 'ACTUATOR_RGB_LED') {
          ['r', 'cc', 'g', 'b'].forEach((p) => {
            const pw = getPinWorld3D(c.id, p);
            const h = findNearestHole830(pw.x, pw.z);
            if (h) map.set(h.id, `${c.id}:${p}`);
          });
        } else if (c.type === 'BUZZER_ACTIVE' || c.type === 'ACTUATOR_BUZZER_ACTIVE' || c.type === 'BUZZER') {
          ['+', '-'].forEach((p) => {
            const pw = getPinWorld3D(c.id, p);
            const h = findNearestHole830(pw.x, pw.z);
            if (h) map.set(h.id, `${c.id}:${p}`);
          });
        } else if (c.type === 'HC_SR04' || c.type === 'SENSOR_ULTRASONIC') {
          ['VCC', 'TRIG', 'ECHO', 'GND'].forEach((p) => {
            const pw = getPinWorld3D(c.id, p);
            const h = findNearestHole830(pw.x, pw.z);
            if (h) map.set(h.id, `${c.id}:${p}`);
          });
        } else if (
          c.type === 'MODULE_BLUETOOTH_HC05' ||
          c.type === 'BLUETOOTH' ||
          c.type === 'HC05' ||
          c.type.includes('BLUETOOTH')
        ) {
          ['STATE', 'RXD', 'TXD', 'GND', 'VCC', 'EN'].forEach((p) => {
            const pw = getPinWorld3D(c.id, p);
            const h = findNearestHole830(pw.x, pw.z);
            if (h) map.set(h.id, `${c.id}:${p}`);
          });
        } else {
          const nearest = findNearestHole830(c.x3d, c.z3d);
          if (nearest) map.set(nearest.id, c.id);
        }
      }
    });
    return map;
  }, [wires3d, components3d, draggingCompId, getPinWorld3D]);

  const occupiedHoleIds = useMemo(() => new Set(occupiedHoleMap.keys()), [occupiedHoleMap]);

  // Terminal Pin Click Handler (Respects tool mode & wire endpoint editing)
  const handlePinClick = (compId: string, pinId: string, worldPos: THREE.Vector3) => {
    if (isPanMode) return;
    // If currently editing an existing wire endpoint:
    if (editingWireEndpoint) {
      const targetWire = wires3d.find((w) => w.id === editingWireEndpoint.wireId);
      if (targetWire) {
        const updated: Wire3D = {
          ...targetWire,
          [editingWireEndpoint.end === 'from' ? 'fromPin' : 'toPin']: { compId, pinId },
        };
        onUpdateWire3D(updated);
        toast.success(`Connected wire endpoint to ${compId === 'breadboard' ? pinId : `${compId}:${pinId}`}`);
        setEditingWireEndpoint(null);
        return;
      }
    }

    // Start wire routing if no wire is currently being drawn (works seamlessly across all tool modes):
    if (!activeWireStart) {
      setActiveWireStart({ compId, pinId, pos: worldPos });
      if (toolMode3D !== 'wire') {
        setToolMode3D('wire');
      }
      toast.info(`Started wire from ${compId === 'breadboard' ? pinId : `${compId}:${pinId}`}. Click target pin or hole.`);
      return;
    }

    // If activeWireStart is present:
    // Prevent connecting to self pin: cancel routing if clicked again
    if (activeWireStart.compId === compId && activeWireStart.pinId === pinId) {
      setActiveWireStart(null);
      toast.info('Cancelled wire routing');
      return;
    }

    // Use user-selected wire color
    const wireColor = activeWireColor;

    // Prevent wire stacking in the same breadboard/rail hole:
    let finalToPin = pinId;
    if (compId === 'breadboard' && occupiedHoleIds.has(pinId)) {
      finalToPin = findNearestUnoccupiedHole(pinId, occupiedHoleIds);
    }
    let finalFromPin = activeWireStart.pinId;
    if (activeWireStart.compId === 'breadboard' && occupiedHoleIds.has(activeWireStart.pinId)) {
      finalFromPin = findNearestUnoccupiedHole(activeWireStart.pinId, occupiedHoleIds);
    }

    // Complete wire connection
    const newWire: Wire3D = {
      id: `wire3d_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      fromPin: { compId: activeWireStart.compId, pinId: finalFromPin },
      toPin: { compId, pinId: finalToPin },
      color: wireColor,
    };

    onAddWire3D(newWire);
    setActiveWireStart(null);
    toast.success(`Connected jumper wire from ${activeWireStart.pinId} to ${pinId}`);
  };

  const selectedWire = wires3d.find((w) => w.id === selectedWireId);
  const selectedComp = components3d.find((c) => c.id === selectedCompId);

  // Silkscreen "104" stamp for ceramic disc capacitors
  const ceramic104Texture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 140;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, 256, 140);
    ctx.fillStyle = '#78350F';
    ctx.font = 'bold 54px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('104', 128, 55);
    ctx.font = 'bold 24px monospace';
    ctx.fillText('50V Z5U', 128, 105);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-[#050B14] select-none overflow-hidden touch-none ${
        isPanMode ? 'cursor-grab active:cursor-grabbing' : ''
      } ${
        isFullscreen ? 'fixed inset-0 z-50 w-screen h-screen' : ''
      }`}
      onContextMenu={(e) => {
        e.preventDefault();
        if (activeWireStart) setActiveWireStart(null);
      }}
    >
      {/* 3D WebGL Canvas */}
      <Canvas
        id="virtual-3d-webgl-canvas"
        shadows
        gl={{
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
          preserveDrawingBuffer: true,
          logarithmicDepthBuffer: true,
        }}
        camera={{ position: [0, 130, 150], fov: 45, near: 0.5, far: 500 }}
        className={`w-full h-full touch-none ${
          hoveredPinInfo || hoveredHole
            ? toolMode3D === 'wire' || activeWireStart
              ? 'cursor-crosshair'
              : 'cursor-pointer'
            : 'cursor-grab active:cursor-grabbing'
        }`}
        onContextMenu={(e) => {
          e.preventDefault();
          if (activeWireStart) {
            setActiveWireStart(null);
          }
        }}
        onPointerMissed={() => {
          onSelectComponent(null);
          onSelectWire(null);
          setActiveWireStart(null);
          setEditingWireEndpoint(null);
        }}
      >
        <color attach="background" args={['#070E1A']} />
        <WebGlResourceDisposer />

        {/* Ambient & Studio Directional Lights */}
        <ambientLight intensity={1.2} />
        <directionalLight
          position={[60, 150, 80]}
          intensity={2.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-80, 80, -60]} intensity={0.8} color="#94A3B8" />

        {/* Grounded ESD Antistatic Workbench Mat (Layered at y = -0.08 to prevent any Z-fighting) */}
        <group position={[0, -0.08, 0]}>
          {/* Main ESD Mat Body */}
          <mesh
            receiveShadow
            position={[0, -0.02, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectComponent(null);
              onSelectWire(null);
              setActiveWireStart(null);
              setEditingWireEndpoint(null);
            }}
          >
            <boxGeometry args={[440, 0.04, 280]} />
            <meshStandardMaterial
              color="#0f172a"
              roughness={0.85}
              metalness={0.08}
            />
          </mesh>
          {/* Mat Bevel Outer Rim */}
          <mesh receiveShadow position={[0, -0.04, 0]}>
            <boxGeometry args={[444, 0.04, 284]} />
            <meshStandardMaterial color="#090d16" roughness={0.9} />
          </mesh>
          {/* Brass Grounding Snap Stud in Corner */}
          <mesh position={[205, 0.01, -125]}>
            <cylinderGeometry args={[4, 4, 0.02, 24]} />
            <meshStandardMaterial color="#d97706" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[205, 0.03, -125]}>
            <cylinderGeometry args={[2, 2, 0.02, 16]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>

        {/* Workbench Grid Plane (Layered at y = -0.04 to eliminate planar flickering) */}
        <Grid
          infiniteGrid
          position={[0, -0.04, 0]}
          cellSize={10}
          sectionSize={50}
          fadeDistance={400}
          cellColor="#1E293B"
          sectionColor="#334155"
        />

        {/* Orbit Camera Controls with Smooth Damped Camera Freedom & Stable Panning */}
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.55}
          panSpeed={0.75}
          zoomSpeed={0.85}
          enablePan={true}
          screenSpacePanning={true}
          enableZoom={true}
          enableRotate={!isPanMode}
          mouseButtons={
            isPanMode
              ? {
                  LEFT: THREE.MOUSE.PAN,
                  MIDDLE: THREE.MOUSE.DOLLY,
                  RIGHT: THREE.MOUSE.ROTATE,
                }
              : {
                  LEFT: THREE.MOUSE.ROTATE,
                  MIDDLE: THREE.MOUSE.DOLLY,
                  RIGHT: THREE.MOUSE.PAN,
                }
          }
          maxPolarAngle={Math.PI / 2 - 0.04}
          minDistance={15}
          maxDistance={350}
        />

        {/* Stable Frame Drag Controller */}
        <DragFrameController
          draggingCompId={draggingCompId}
          components3d={components3d}
          occupiedHoleIds={occupiedHoleIds}
          hasBreadboard={hasBreadboard}
          breadboardCount={breadboardCount}
          onUpdateComponent3D={onUpdateComponent3D}
        />

        {/* 830-Point Solderless Breadboards */}
        {hasBreadboard &&
          Array.from({ length: breadboardCount }).map((_, b) => (
            <Breadboard3D
              key={b}
              position={[0, 0, -b * 60.0]}
              hoveredHole={hoveredHole}
              onHoverHole={setHoveredHole}
              onHoleClick={(hole, wPos) => {
                const holeId = b === 0 ? hole.id : `bb${b + 1}_` + hole.id.replace(/^bb_/, '');
                handlePinClick('breadboard', holeId, wPos);
              }}
            />
          ))}

        {/* 3D Components */}
        {components3d.map((comp) => {
          const isSelected = selectedCompId === comp.id;
          const isDraggingThis = draggingCompId === comp.id;
          // Pick-and-Place dynamic elevation clearance: lifts 3.5mm while dragging, seats flush on release
          const pos: [number, number, number] = [comp.x3d, isDraggingThis ? comp.y3d + 3.5 : comp.y3d, comp.z3d];
          const rot: [number, number, number] = [
            THREE.MathUtils.degToRad(comp.rotX || 0),
            THREE.MathUtils.degToRad(comp.rotY || 0),
            THREE.MathUtils.degToRad(comp.rotZ || 0),
          ];
          const myFp = getComponentFootprint(comp.type);
          const simState = simulationStates[comp.id];

          const handleCompPointerDown = (e: ThreeEvent<PointerEvent>) => {
            if (e.button !== 0 || isPanMode) return;
            e.stopPropagation();
            onSelectComponent(comp.id);
            onSelectWire(null);
            pointerDownPosRef.current = {
              clientX: e.nativeEvent.clientX,
              clientY: e.nativeEvent.clientY,
              compId: comp.id,
            };
          };

          if (comp.type === 'ARDUINO_MEGA') {
            const isBurned = Boolean(simState?.status === 'BURNED' || simState?.burned);
            return (
              <group
                key={comp.id}
                onPointerDown={handleCompPointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                {isBurned && <BurnSmokeFX position={[0, 6, 0]} heightOffset={2} />}
                <ArduinoMega3D
                  position={pos}
                  rotation={rot}
                  isSelected={isSelected}
                  isUsbPlugged={comp.parameters?.usbPlugged !== false}
                  isDcJackPlugged={comp.parameters?.dcJackPlugged === true}
                  onToggleUsb={() => toggleUsb(comp.id)}
                  isPowered={!isBurned && (comp.parameters?.usbPlugged !== false || comp.parameters?.dcJackPlugged === true)}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          if (comp.type === 'ARDUINO_UNO') {
            const isBurned = Boolean(simState?.status === 'BURNED' || simState?.burned);
            return (
              <group
                key={comp.id}
                onPointerDown={handleCompPointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                {isBurned && <BurnSmokeFX position={[0, 6, 0]} heightOffset={2} />}
                <ArduinoUno3D
                  position={pos}
                  rotation={rot}
                  isSelected={isSelected}
                  isUsbPlugged={comp.parameters?.usbPlugged !== false}
                  isDcJackPlugged={comp.parameters?.dcJackPlugged === true}
                  onToggleUsb={() => toggleUsb(comp.id)}
                  isPowered={!isBurned && (comp.parameters?.usbPlugged !== false || comp.parameters?.dcJackPlugged === true)}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          if (comp.type === 'LED') {
            const isBurned = Boolean(simState?.status === 'BURNED' || simState?.burned);
            const isPowered = Boolean(isSimulating && (simState?.on || (simState?.current && Math.abs(simState.current) > 0.001)));
            const brightness = isSimulating && isPowered ? (simState?.brightness ?? 1.0) : 0;
            return (
              <group
                key={comp.id}
                onPointerDown={handleCompPointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                <Led3D
                  position={pos}
                  rotation={rot}
                  color={String(comp.parameters?.color || comp.value || '#EF4444')}
                  isPowered={isPowered}
                  brightness={brightness}
                  isBurned={isBurned}
                  isSelected={isSelected}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          if (comp.type === 'RESISTOR') {
            const isBurned = Boolean(simState?.status === 'BURNED' || simState?.burned);
            return (
              <group
                key={comp.id}
                onPointerDown={handleCompPointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                <Resistor3D
                  position={pos}
                  rotation={rot}
                  value={comp.value || '1kΩ'}
                  isBurned={isBurned}
                  isSelected={isSelected}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          if (comp.type === 'BATTERY_9V' || comp.type === 'BATTERY' || comp.type === 'DC_VOLTAGE') {
            return (
              <group
                key={comp.id}
                onPointerDown={handleCompPointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                <Battery9V3D
                  position={pos}
                  rotation={rot}
                  isSelected={isSelected}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          if (comp.type === 'PUSHBUTTON') {
            return (
              <group
                key={comp.id}
                onPointerDown={handleCompPointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                <Pushbutton3D
                  position={pos}
                  rotation={rot}
                  isSelected={isSelected}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          if (comp.type === 'POTENTIOMETER') {
            return (
              <group
                key={comp.id}
                position={pos}
                rotation={rot}
                onPointerDown={handleCompPointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                {/* Blue housing */}
                <mesh position={[0, 4.5, 0]}>
                  <boxGeometry args={[9.5, 9.5, 9.5]} />
                  <meshStandardMaterial color={isSelected ? '#38BDF8' : '#1E40AF'} roughness={0.4} />
                </mesh>
                {/* Brass shaft */}
                <mesh position={[0, 11.0, 0]}>
                  <cylinderGeometry args={[2.5, 2.5, 5.0, 16]} />
                  <meshStandardMaterial color="#EAB308" metalness={0.9} roughness={0.2} />
                </mesh>
                {/* Blue knob cap */}
                <mesh position={[0, 14.0, 0]}>
                  <cylinderGeometry args={[5.0, 5.0, 3.5, 24]} />
                  <meshStandardMaterial color="#2563EB" roughness={0.4} />
                </mesh>
                {/* Pins 1, wiper (2), 3 */}
                {[-2.54, 0, 2.54].map((px, i) => {
                  const pinId = i === 0 ? '1' : i === 1 ? '2' : '3';
                  const isHovered = hoveredPinInfo?.compId === comp.id && hoveredPinInfo?.pinName === pinId;
                  const zPos = i === 1 ? 2.54 : 0;
                  return (
                    <group key={i} position={[px, 0, zPos]}>
                      {/* Metallic Pin Lead extending down into breadboard */}
                      <mesh position={[0, -1.0, 0]}>
                        <cylinderGeometry args={[0.35, 0.35, 6.0, 8]} />
                        <meshStandardMaterial color="#CBD5E1" metalness={0.9} />
                      </mesh>
                      {/* Terminal Sphere with Generous Hitbox & Hover Ring */}
                      <mesh material={new THREE.MeshBasicMaterial({ color: isHovered ? '#38BDF8' : '#CBD5E1' })}>
                        <sphereGeometry args={[isHovered ? 0.9 : 0.6, 12, 12]} />
                      </mesh>
                      {isHovered && (
                        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                          <ringGeometry args={[0.5, 1.3, 24]} />
                          <meshBasicMaterial color="#38BDF8" side={THREE.DoubleSide} />
                        </mesh>
                      )}
                      <mesh
                        renderOrder={100}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const pPos = getPinWorld3D(comp.id, pinId);
                          handlePinClick(comp.id, pinId, pPos);
                        }}
                        onPointerOver={(e) => {
                          e.stopPropagation();
                          setHoveredPinInfo({ compId: comp.id, pinName: pinId });
                        }}
                        onPointerOut={() => setHoveredPinInfo(null)}
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

          if (comp.type === 'CAPACITOR_ELECTROLYTIC') {
            const isBurned = Boolean(simState?.status === 'BURNED' || simState?.burned);
            return (
              <group
                key={comp.id}
                position={pos}
                rotation={rot}
                onPointerDown={handleCompPointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                {/* 3D Burnout Overheat FX & Smoke Particles */}
                {isBurned && <BurnSmokeFX position={[0, 9.3, 0]} heightOffset={1} />}

                {/* Blue Aluminum Electrolytic Can Body (Charred dark if burned) */}
                <mesh position={[0, 5.0, 0]}>
                  <cylinderGeometry args={[3.2, 3.2, 8.5, 24]} />
                  <meshStandardMaterial color={isBurned ? '#18181B' : (isSelected ? '#38BDF8' : '#1E3A8A')} roughness={isBurned ? 0.95 : 0.3} />
                </mesh>

                {/* Silver Metal Safety Vent Top */}
                <mesh position={[0, 9.3, 0]}>
                  <cylinderGeometry args={[3.1, 3.1, 0.2, 24]} />
                  <meshStandardMaterial color={isBurned ? '#52525B' : '#CBD5E1'} metalness={isBurned ? 0.4 : 0.9} />
                </mesh>

                {/* Negative Polarity Stripe on the - lead side (+X: x = 3.18) */}
                <group position={[3.15, 5.0, 0]}>
                  <mesh>
                    <boxGeometry args={[0.2, 8.5, 1.6]} />
                    <meshStandardMaterial color={isBurned ? '#3F3F46' : '#F1F5F9'} roughness={0.4} />
                  </mesh>
                  {/* Minus "-" Polarity Symbols */}
                  {[-2.5, 0, 2.5].map((yOff, mi) => (
                    <mesh key={mi} position={[0.12, yOff, 0]}>
                      <boxGeometry args={[0.05, 0.35, 1.0]} />
                      <meshBasicMaterial color={isBurned ? '#18181B' : '#0F172A'} />
                    </mesh>
                  ))}
                </group>

                {/* Positive "+" Polarity Symbol on Anode side (-X: x = -3.18) */}
                <group position={[-3.15, 5.0, 0]}>
                  <mesh position={[-0.12, 0, 0]}>
                    <boxGeometry args={[0.05, 0.3, 0.9]} />
                    <meshBasicMaterial color={isBurned ? '#52525B' : '#10B981'} />
                  </mesh>
                  <mesh position={[-0.12, 0, 0]}>
                    <boxGeometry args={[0.05, 0.9, 0.3]} />
                    <meshBasicMaterial color={isBurned ? '#52525B' : '#10B981'} />
                  </mesh>
                </group>

                {/* Realistic Radial Bent Metallic Wire Leads Seated Into Breadboard Holes (radius 0.38mm) */}
                {/* 1. Positive Anode Lead (+) at x = -2.54, extending down to y = -8.2mm */}
                <mesh position={[-1.77, 1.0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.38, 0.38, 1.54, 12]} />
                  <meshStandardMaterial color={isBurned ? '#71717A' : '#CBD5E1'} metalness={isBurned ? 0.4 : 0.9} />
                </mesh>
                <mesh position={[-2.54, -3.5, 0]}>
                  <cylinderGeometry args={[0.38, 0.38, 9.4, 12]} />
                  <meshStandardMaterial color={isBurned ? '#71717A' : '#CBD5E1'} metalness={isBurned ? 0.4 : 0.9} />
                </mesh>

                {/* 2. Negative Cathode Lead (-) at x = 2.54, extending down to y = -7.4mm */}
                <mesh position={[1.77, 1.0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.38, 0.38, 1.54, 12]} />
                  <meshStandardMaterial color={isBurned ? '#71717A' : '#CBD5E1'} metalness={isBurned ? 0.4 : 0.9} />
                </mesh>
                <mesh position={[2.54, -3.1, 0]}>
                  <cylinderGeometry args={[0.38, 0.38, 8.6, 12]} />
                  <meshStandardMaterial color={isBurned ? '#71717A' : '#CBD5E1'} metalness={isBurned ? 0.4 : 0.9} />
                </mesh>

                {/* Interactive Click & Hover Terminals with Generous Hitbox & Hover Ring */}
                {[-2.54, 2.54].map((px, i) => {
                  const pinId = i === 0 ? '+' : '-';
                  const isHovered = hoveredPinInfo?.compId === comp.id && hoveredPinInfo?.pinName === pinId;
                  return (
                    <group key={pinId} position={[px, 0, 0]}>
                      <mesh>
                        <cylinderGeometry args={[isHovered ? 0.55 : 0.4, 0.4, 1.2, 12]} />
                        <meshBasicMaterial color={isHovered ? (i === 0 ? '#10B981' : '#38BDF8') : (isBurned ? '#71717A' : '#CBD5E1')} />
                      </mesh>
                      {isHovered && (
                        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                          <ringGeometry args={[0.5, 1.3, 24]} />
                          <meshBasicMaterial color={i === 0 ? '#10B981' : '#38BDF8'} side={THREE.DoubleSide} />
                        </mesh>
                      )}
                      <mesh
                        renderOrder={100}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const pPos = getPinWorld3D(comp.id, pinId);
                          handlePinClick(comp.id, pinId, pPos);
                        }}
                        onPointerOver={(e) => {
                          e.stopPropagation();
                          setHoveredPinInfo({ compId: comp.id, pinName: pinId });
                        }}
                        onPointerOut={() => setHoveredPinInfo(null)}
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

          if (comp.type === 'CAPACITOR') {
            const isBurned = Boolean(simState?.status === 'BURNED' || simState?.burned);
            return (
              <group
                key={comp.id}
                position={pos}
                rotation={rot}
                onPointerDown={handleCompPointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                {/* 3D Burnout Overheat FX & Smoke Particles */}
                {isBurned && <BurnSmokeFX position={[0, 4.5, 0]} heightOffset={1} />}

                {/* Tan Ceramic Disc Body (Upright orientation with flat circular faces towards Z) */}
                <mesh position={[0, 5.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[3.2, 3.2, 1.4, 32]} />
                  <meshStandardMaterial color={isBurned ? '#18181B' : (isSelected ? '#38BDF8' : '#D97706')} roughness={isBurned ? 0.95 : 0.6} />
                </mesh>

                {/* Laser-etched "104" stamp on front face */}
                {ceramic104Texture && (
                  <mesh position={[0, 5.0, 0.72]}>
                    <planeGeometry args={[3.6, 2.0]} />
                    <meshBasicMaterial map={ceramic104Texture} transparent />
                  </mesh>
                )}

                {/* Ceramic Disc Lead Stems and Legs Firmly Seated Into Disc Body (radius 0.38mm) */}
                {/* Pin 1 at x = -2.54: Upper angled stem emerging from inside disc [x = -1.27, y = 3.2] down to [x = -2.54, y = 1.6] */}
                <mesh position={[-1.905, 2.4, 0]} rotation={[0, 0, -Math.atan2(1.27, 1.6)]}>
                  <cylinderGeometry args={[0.38, 0.38, 2.04, 12]} />
                  <meshStandardMaterial color={isBurned ? '#71717A' : '#CBD5E1'} metalness={isBurned ? 0.4 : 0.9} />
                </mesh>
                <mesh position={[-2.54, 1.6, 0]}>
                  <sphereGeometry args={[0.38, 10, 10]} />
                  <meshStandardMaterial color={isBurned ? '#71717A' : '#CBD5E1'} metalness={isBurned ? 0.4 : 0.9} />
                </mesh>
                {/* Pin 1 vertical leg extending into breadboard down to y = -7.5mm */}
                <mesh position={[-2.54, -2.95, 0]}>
                  <cylinderGeometry args={[0.38, 0.38, 9.1, 12]} />
                  <meshStandardMaterial color={isBurned ? '#71717A' : '#CBD5E1'} metalness={isBurned ? 0.4 : 0.9} />
                </mesh>

                {/* Pin 2 at x = 2.54: Upper angled stem emerging from inside disc [x = 1.27, y = 3.2] down to [x = 2.54, y = 1.6] */}
                <mesh position={[1.905, 2.4, 0]} rotation={[0, 0, Math.atan2(1.27, 1.6)]}>
                  <cylinderGeometry args={[0.38, 0.38, 2.04, 12]} />
                  <meshStandardMaterial color={isBurned ? '#71717A' : '#CBD5E1'} metalness={isBurned ? 0.4 : 0.9} />
                </mesh>
                <mesh position={[2.54, 1.6, 0]}>
                  <sphereGeometry args={[0.38, 10, 10]} />
                  <meshStandardMaterial color={isBurned ? '#71717A' : '#CBD5E1'} metalness={isBurned ? 0.4 : 0.9} />
                </mesh>
                {/* Pin 2 vertical leg extending into breadboard down to y = -7.5mm */}
                <mesh position={[2.54, -2.95, 0]}>
                  <cylinderGeometry args={[0.38, 0.38, 9.1, 12]} />
                  <meshStandardMaterial color={isBurned ? '#71717A' : '#CBD5E1'} metalness={isBurned ? 0.4 : 0.9} />
                </mesh>

                {/* Interactive Click & Hover Terminals with Generous Hitbox & Hover Ring */}
                {[-2.54, 2.54].map((px, i) => {
                  const pinId = i === 0 ? '1' : '2';
                  const isHovered = hoveredPinInfo?.compId === comp.id && hoveredPinInfo?.pinName === pinId;
                  return (
                    <group key={pinId} position={[px, 0, 0]}>
                      <mesh>
                        <cylinderGeometry args={[isHovered ? 0.55 : 0.4, 0.4, 1.2, 12]} />
                        <meshBasicMaterial color={isHovered ? '#38BDF8' : (isBurned ? '#71717A' : '#CBD5E1')} />
                      </mesh>
                      {isHovered && (
                        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                          <ringGeometry args={[0.5, 1.3, 24]} />
                          <meshBasicMaterial color="#38BDF8" side={THREE.DoubleSide} />
                        </mesh>
                      )}
                      <mesh
                        renderOrder={100}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const pPos = getPinWorld3D(comp.id, pinId);
                          handlePinClick(comp.id, pinId, pPos);
                        }}
                        onPointerOver={(e) => {
                          e.stopPropagation();
                          setHoveredPinInfo({ compId: comp.id, pinName: pinId });
                        }}
                        onPointerOut={() => setHoveredPinInfo(null)}
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

          if (
            comp.type === 'TIMER_555' ||
            comp.type === 'DIP_IC' ||
            comp.type.includes('OPAMP') ||
            comp.type.includes('74HC') ||
            comp.type.includes('595') ||
            comp.type.includes('4017') ||
            comp.type.includes('2003') ||
            comp.type.includes('293') ||
            comp.type.includes('DIP')
          ) {
            const is16Pin = comp.type.includes('16') || comp.type.includes('595') || comp.type.includes('4017') || comp.type.includes('2003') || comp.type.includes('293');
            const is14Pin = !is16Pin && (comp.type.includes('14') || comp.type.includes('74HC') || comp.type.includes('324'));
            const is28Pin = comp.type.includes('28') || comp.type.includes('ATMEGA');
            const pinCount = is28Pin ? 28 : is16Pin ? 16 : is14Pin ? 14 : 8;

            const part =
              comp.type.includes('555') ? 'NE555P' :
              comp.type.includes('358') ? 'LM358' :
              comp.type.includes('324') ? 'LM324' :
              comp.type.includes('741') ? 'LM741' :
              comp.type.includes('74HC14') ? '74HC14' :
              comp.type.includes('74HC04') ? '74HC04' :
              comp.type.includes('74HC00') ? '74HC00' :
              comp.type.includes('74HC08') ? '74HC08' :
              comp.type.includes('74HC32') ? '74HC32' :
              comp.type.includes('74HC86') ? '74HC86' :
              comp.type.includes('595') ? '74HC595' :
              comp.type.includes('4017') ? 'CD4017' :
              comp.type.includes('2003') ? 'ULN2003A' :
              comp.type.includes('293') ? 'L293D' :
              String(comp.parameters?.ic || comp.value || 'IC');

            let customPins: Record<number, string> | undefined;
            if (is16Pin) {
              if (comp.type.includes('595')) {
                customPins = { 1: 'QB', 2: 'QC', 3: 'QD', 4: 'QE', 5: 'QF', 6: 'QG', 7: 'QH', 8: 'GND', 9: "QH'", 10: '~SRCLR', 11: 'SRCLK', 12: 'RCLK', 13: '~OE', 14: 'SER', 15: 'QA', 16: 'VCC' };
              } else if (comp.type.includes('4017')) {
                customPins = { 1: 'Q5', 2: 'Q1', 3: 'Q0', 4: 'Q2', 5: 'Q6', 6: 'Q7', 7: 'Q3', 8: 'GND', 9: 'Q8', 10: 'Q4', 11: 'Q9', 12: 'CO', 13: '~EN', 14: 'CLK', 15: 'RST', 16: 'VDD' };
              } else if (comp.type.includes('2003')) {
                customPins = { 1: '1B', 2: '2B', 3: '3B', 4: '4B', 5: '5B', 6: '6B', 7: '7B', 8: 'COM_E', 9: 'COM_K', 10: '7C', 11: '6C', 12: '5C', 13: '4C', 14: '3C', 15: '2C', 16: '1C' };
              } else if (comp.type.includes('293')) {
                customPins = { 1: '1,2EN', 2: '1A', 3: '1Y', 4: 'GND', 5: 'GND', 6: '2Y', 7: '2A', 8: 'VCC2', 9: '3,4EN', 10: '3A', 11: '3Y', 12: 'GND', 13: 'GND', 14: '4Y', 15: '4A', 16: 'VCC1' };
              }
            } else if (is14Pin) {
              if (comp.type.includes('74HC00') || comp.type.includes('74HC08') || comp.type.includes('74HC32') || comp.type.includes('74HC86')) {
                customPins = { 1: '1A', 2: '1B', 3: '1Y', 4: '2A', 5: '2B', 6: '2Y', 7: 'GND', 8: '3Y', 9: '3A', 10: '3B', 11: '4Y', 12: '4A', 13: '4B', 14: 'VCC' };
              } else if (comp.type.includes('LM324')) {
                customPins = { 1: '1OUT', 2: '1IN-', 3: '1IN+', 4: 'VCC', 5: '2IN+', 6: '2IN-', 7: '2OUT', 8: '3OUT', 9: '3IN-', 10: '3IN+', 11: 'GND', 12: '4IN+', 13: '4IN-', 14: '4OUT' };
              } else {
                customPins = { 1: '1A', 2: '1Y', 3: '2A', 4: '2Y', 5: '3A', 6: '3Y', 7: 'GND', 8: '4Y', 9: '4A', 10: '5Y', 11: '5A', 12: '6Y', 13: '6A', 14: 'VCC' };
              }
            } else if (comp.type.includes('358')) {
              customPins = { 1: 'OUT1', 2: 'IN1-', 3: 'IN1+', 4: 'GND', 5: 'IN2+', 6: 'IN2-', 7: 'OUT2', 8: 'VCC' };
            } else if (comp.type.includes('741')) {
              customPins = { 1: 'OFST1', 2: 'IN-', 3: 'IN+', 4: 'V-', 5: 'OFST2', 6: 'OUT', 7: 'V+', 8: 'NC' };
            }
            return (
              <group
                key={comp.id}
                onPointerDown={handleCompPointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                <DipPackage3D
                  position={pos}
                  rotation={rot}
                  pinCount={pinCount}
                  partName={part}
                  pinNames={customPins}
                  isBurned={Boolean(simState?.status === 'BURNED' || simState?.burned)}
                  isSelected={isSelected}
                  onPinClick={(pinId, wPos) => handlePinClick(comp.id, pinId, wPos)}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                />
              </group>
            );
          }

          if (comp.type === 'INDUCTOR') {
            return (
              <group
                key={comp.id}
                onPointerDown={handleCompPointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                <Inductor3D
                  position={pos}
                  rotation={rot}
                  value={comp.value || '10mH'}
                  isSelected={isSelected}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          if (comp.type === 'BJT_NPN' || comp.type === 'BJT_PNP' || comp.type === 'TRANSISTOR_NPN' || comp.type === 'TRANSISTOR_PNP') {
            const isNpn = comp.type.includes('NPN');
            return (
              <group
                key={comp.id}
                onPointerDown={handleCompPointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                <TransistorTO92_3D
                  position={pos}
                  rotation={rot}
                  partName={String(comp.parameters?.transistor || comp.value || (isNpn ? '2N2222' : '2N2907'))}
                  isNpn={isNpn}
                  isSelected={isSelected}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          if (comp.type === 'MOSFET_N' || comp.type === 'MOSFET_P' || comp.type === 'REGULATOR_7805' || comp.type === 'REGULATOR_LM317') {
            const isRegulator = comp.type.startsWith('REGULATOR');
            const pinLabels: [string, string, string] = isRegulator ? ['IN', 'GND', 'OUT'] : ['G', 'D', 'S'];
            return (
              <group
                key={comp.id}
                onPointerDown={handleCompPointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                <TransistorTO220_3D
                  position={pos}
                  rotation={rot}
                  partName={String(comp.parameters?.part || comp.value || (isRegulator ? 'LM7805' : comp.type.includes('N') ? 'IRF540N' : 'IRF9540N'))}
                  pinLabels={pinLabels}
                  isSelected={isSelected}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          if (comp.type === 'HC_SR04' || comp.type === 'SENSOR_ULTRASONIC') {
            return (
              <group
                key={comp.id}
                onPointerDown={handleCompPointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                <HcSr04_3D
                  position={pos}
                  rotation={rot}
                  isSelected={isSelected}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          if (comp.type === 'ARDUINO_NANO') {
            const isBurned = Boolean(simState?.status === 'BURNED' || simState?.burned);
            return (
              <group
                key={comp.id}
                onPointerDown={handleCompPointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                {isBurned && <BurnSmokeFX position={[0, 6, 0]} heightOffset={2} />}
                <ArduinoNano3D
                  position={pos}
                  rotation={rot}
                  isSelected={isSelected}
                  isUsbPlugged={comp.parameters?.usbPlugged !== false}
                  onToggleUsb={() => toggleUsb(comp.id)}
                  isPowered={!isBurned && comp.parameters?.usbPlugged !== false}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          if (comp.type === 'ESP32_DEVKIT') {
            const isBurned = Boolean(simState?.status === 'BURNED' || simState?.burned);
            return (
              <group
                key={comp.id}
                onPointerDown={handleCompPointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                {isBurned && <BurnSmokeFX position={[0, 6, 0]} heightOffset={2} />}
                <Esp32DevKit3D
                  position={pos}
                  rotation={rot}
                  isSelected={isSelected}
                  isUsbPlugged={comp.parameters?.usbPlugged !== false}
                  onToggleUsb={() => toggleUsb(comp.id)}
                  isPowered={!isBurned && comp.parameters?.usbPlugged !== false}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          if (comp.type === 'RASPBERRY_PI_PICO') {
            const isBurned = Boolean(simState?.status === 'BURNED' || simState?.burned);
            return (
              <group
                key={comp.id}
                onPointerDown={handleCompPointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                {isBurned && <BurnSmokeFX position={[0, 6, 0]} heightOffset={2} />}
                <RaspberryPiPico3D
                  position={pos}
                  rotation={rot}
                  isSelected={isSelected}
                  isUsbPlugged={comp.parameters?.usbPlugged !== false}
                  onToggleUsb={() => toggleUsb(comp.id)}
                  isPowered={!isBurned && comp.parameters?.usbPlugged !== false}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          if (comp.type === 'SERVO_SG90' || comp.type === 'ACTUATOR_SERVO_SG90' || comp.type === 'SERVO') {
            return (
              <group
                key={comp.id}
                onPointerDown={handleCompPointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                <ServoSG903D
                  position={pos}
                  rotation={rot}
                  isSelected={isSelected}
                  angle={Number(comp.parameters?.currentAngle ?? 90)}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          if (comp.type === 'LCD_1602' || comp.type === 'DISPLAY_LCD1602') {
            return (
              <group
                key={comp.id}
                onPointerDown={handleCompPointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                <Lcd1602_3D
                  position={pos}
                  rotation={rot}
                  isSelected={isSelected}
                  isPowered={isSimulating}
                  displayText={String(comp.parameters?.text || 'EI HOUSE LAB 16x2\nSYSTEM READY OK')}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          // Bluetooth Breakout Module 3D
          if (
            comp.type === 'MODULE_BLUETOOTH_HC05' ||
            comp.type === 'BLUETOOTH' ||
            comp.type === 'HC05' ||
            comp.type === 'HC06' ||
            comp.type === 'RF_BLUETOOTH' ||
            comp.type.includes('BLUETOOTH') ||
            comp.parameters?.model3d === 'module_bluetooth_hc05'
          ) {
            const isPowered = isSimulating ? Boolean(simState?.on || (simState?.voltage && Math.abs(simState.voltage) > 2.0)) : true;
            return (
              <group
                key={comp.id}
                onPointerDown={handleCompPointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                <BluetoothHC05_3D
                  position={pos}
                  rotation={rot}
                  isSelected={isSelected}
                  isPowered={isPowered}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          if (comp.type === 'LED_RGB' || comp.type === 'ACTUATOR_RGB_LED' || comp.parameters?.model3d === 'led_rgb_5mm') {
            const isBurned = Boolean(simState?.status === 'BURNED' || simState?.burned);
            
            // 1. Compute independent 3-channel levels (rLevel, gLevel, bLevel in 0..1)
            let rLevel = 0;
            let gLevel = 0;
            let bLevel = 0;

            // Direct simulation telemetry from MNA / SPICE engine
            if (simState && typeof simState === 'object') {
              const sAny = simState as Record<string, unknown>;
              if (sAny.onRed) rLevel = Math.max(rLevel, typeof sAny.redBrightness === 'number' ? sAny.redBrightness : 1.0);
              if (sAny.onGreen) gLevel = Math.max(gLevel, typeof sAny.greenBrightness === 'number' ? sAny.greenBrightness : 1.0);
              if (sAny.onBlue) bLevel = Math.max(bLevel, typeof sAny.blueBrightness === 'number' ? sAny.blueBrightness : 1.0);
              if (typeof sAny.rLevel === 'number') rLevel = Math.max(rLevel, sAny.rLevel);
              if (typeof sAny.gLevel === 'number') gLevel = Math.max(gLevel, sAny.gLevel);
              if (typeof sAny.bLevel === 'number') bLevel = Math.max(bLevel, sAny.bLevel);
              if (typeof sAny.redBrightness === 'number' && sAny.redBrightness > 0) rLevel = Math.max(rLevel, sAny.redBrightness);
              if (typeof sAny.greenBrightness === 'number' && sAny.greenBrightness > 0) gLevel = Math.max(gLevel, sAny.greenBrightness);
              if (typeof sAny.blueBrightness === 'number' && sAny.blueBrightness > 0) bLevel = Math.max(bLevel, sAny.blueBrightness);
              if (sAny.channels && typeof sAny.channels === 'object') {
                const ch = sAny.channels as Record<string, number>;
                if (typeof ch.r === 'number') rLevel = Math.max(rLevel, ch.r);
                if (typeof ch.g === 'number') gLevel = Math.max(gLevel, ch.g);
                if (typeof ch.b === 'number') bLevel = Math.max(bLevel, ch.b);
              }
            }

            const isComPin = (p: string) => {
              const pl = (p || '').trim().toLowerCase();
              return pl === 'cc' || pl === 'com' || pl === 'cathode' || pl === 'anode' || pl === 'gnd' || pl === '-' || pl === '2' || pl === 'c';
            };

            const hasComCircuitWire = Boolean(
              circuitWires?.some(
                (cw) =>
                  (cw.fromCompId === comp.id && isComPin(cw.fromPinId)) ||
                  (cw.toCompId === comp.id && isComPin(cw.toPinId))
              )
            );

            const hasCom3dWire = Boolean(
              wires3d.some(
                (w) =>
                  (w.fromPin.compId === comp.id && isComPin(w.fromPin.pinId)) ||
                  (w.toPin.compId === comp.id && isComPin(w.toPin.pinId))
              )
            );

            // Breadboard/return tie check: true if COM has a wire OR if solver solved a closed loop (on with current >= 0.5mA)
            const isComConnected = hasComCircuitWire || hasCom3dWire || Boolean(simState?.on && ((simState as Record<string, unknown>).current as number) >= 0.0005);

            // Circuit Schematic Wires conduction tracing (ONLY if COM has a closed return path)
            if (isSimulating && isComConnected) {
              circuitWires?.forEach((cw) => {
                let pin = '';
                if (cw.fromCompId === comp.id) {
                  pin = cw.fromPinId || '';
                } else if (cw.toCompId === comp.id) {
                  pin = cw.toPinId || '';
                }
                if (!pin) return;

                const pLower = pin.toLowerCase();
                const currentA = wireCurrents?.[cw.id] ?? cw.current ?? 0;
                // Forward conduction current must be >= 0.5mA
                if (Math.abs(currentA) >= 0.0005) {
                  const channelLevel = Math.min(1.0, Math.max(0.7, Math.abs(currentA) / 0.02));
                  if (pLower === 'r' || pLower === '1' || pLower === 'red') rLevel = Math.max(rLevel, channelLevel);
                  else if (pLower === 'g' || pLower === '3' || pLower === 'green') gLevel = Math.max(gLevel, channelLevel);
                  else if (pLower === 'b' || pLower === '4' || pLower === 'blue') bLevel = Math.max(bLevel, channelLevel);
                }
              });

              // 3D Wire connection conduction tracing (ONLY if COM has a return connection)
              wires3d.forEach((w) => {
                let pin = '';
                if (w.fromPin.compId === comp.id) {
                  pin = w.fromPin.pinId;
                } else if (w.toPin.compId === comp.id) {
                  pin = w.toPin.pinId;
                }
                if (!pin) return;

                const pLower = pin.toLowerCase();
                const currentA = wireCurrents?.[w.id] ?? w.current ?? 0;
                if (Math.abs(currentA) >= 0.0005) {
                  if (pLower === 'r' || pLower === '1' || pLower === 'red') rLevel = Math.max(rLevel, 1.0);
                  else if (pLower === 'g' || pLower === '3' || pLower === 'green') gLevel = Math.max(gLevel, 1.0);
                  else if (pLower === 'b' || pLower === '4' || pLower === 'blue') bLevel = Math.max(bLevel, 1.0);
                }
              });
            }

            // Inspector explicit parameters override (ONLY if COM is connected)
            if (isSimulating && isComConnected) {
              if (comp.parameters?.r !== undefined) rLevel = Number(comp.parameters.r);
              if (comp.parameters?.g !== undefined) gLevel = Number(comp.parameters.g);
              if (comp.parameters?.b !== undefined) bLevel = Number(comp.parameters.b);
            }

            // STRICT OPEN-CIRCUIT ENFORCEMENT: If COM is NOT connected, clamp all channels strictly to 0
            if (isSimulating && !isComConnected) {
              rLevel = 0;
              gLevel = 0;
              bLevel = 0;
            }

            // Fallback for static hex color ONLY when NOT simulating
            if (!isSimulating && rLevel === 0 && gLevel === 0 && bLevel === 0 && comp.parameters?.color) {
              const c = new THREE.Color(String(comp.parameters.color));
              rLevel = c.r;
              gLevel = c.g;
              bLevel = c.b;
            }

            const isPowered = !isBurned && isSimulating && isComConnected && (rLevel > 0.01 || gLevel > 0.01 || bLevel > 0.01);

            return (
              <group
                key={comp.id}
                onPointerDown={handleCompPointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                {isBurned && <BurnSmokeFX position={[0, 4, 0]} heightOffset={1} />}
                <RgbLed3D
                  position={pos}
                  rotation={rot}
                  isSelected={isSelected}
                  isPowered={isPowered}
                  rLevel={rLevel}
                  gLevel={gLevel}
                  bLevel={bLevel}
                  color={String(comp.parameters?.color || '#EC4899')}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          if (comp.type === 'BUZZER_ACTIVE' || comp.type === 'ACTUATOR_BUZZER_ACTIVE' || comp.type === 'BUZZER' || comp.parameters?.model3d === 'buzzer_active_piezo') {
            const isBurned = Boolean(simState?.status === 'BURNED' || simState?.burned);
            let isSounding = isSimulating && !isBurned && Boolean(
              simState?.on ||
              (simState?.current && Math.abs(simState.current) > 0.0005) ||
              (simState?.voltage && Math.abs(simState.voltage) > 1.8)
            );

            // Conduction tracing from circuit wires and 3d wires
            if (!isSounding && isSimulating && !isBurned) {
              circuitWires?.forEach((cw) => {
                if (cw.fromCompId === comp.id || cw.toCompId === comp.id) {
                  const cur = wireCurrents?.[cw.id] ?? cw.current ?? 0;
                  if (Math.abs(cur) > 0.0005) isSounding = true;
                  const otherId = cw.fromCompId === comp.id ? cw.toCompId : cw.fromCompId;
                  const otherSim = simulationStates[otherId];
                  if (otherSim?.on || (otherSim?.voltage && Math.abs(otherSim.voltage) > 2.0)) isSounding = true;
                }
              });
              wires3d.forEach((w) => {
                if (w.fromPin.compId === comp.id || w.toPin.compId === comp.id) {
                  const cur = wireCurrents?.[w.id] ?? w.current ?? 0;
                  if (Math.abs(cur) > 0.0005) isSounding = true;
                }
              });
            }

            const frequency = Number(comp.parameters?.frequencyHz || comp.parameters?.frequency || 2300);
            return (
              <group
                key={comp.id}
                onPointerDown={handleCompPointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                {isBurned && <BurnSmokeFX position={[0, 4, 0]} heightOffset={1} />}
                <Buzzer3D
                  position={pos}
                  rotation={rot}
                  isSelected={isSelected}
                  isSounding={isSounding}
                  frequency={frequency}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          if (comp.type === 'DIODE' || comp.type === 'DIODE_1N4007') {
            const isBurned = Boolean(simState?.status === 'BURNED' || simState?.burned);
            return (
              <group
                key={comp.id}
                onPointerDown={handleCompPointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                {isBurned && <BurnSmokeFX position={[0, 4, 0]} heightOffset={1} />}
                <Diode3D
                  position={pos}
                  rotation={rot}
                  isSelected={isSelected}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          if (comp.type === 'SENSOR_LDR') {
            const isBurned = Boolean(simState?.status === 'BURNED' || simState?.burned);
            return (
              <group
                key={comp.id}
                onPointerDown={handleCompPointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                {isBurned && <BurnSmokeFX position={[0, 4, 0]} heightOffset={1} />}
                <Ldr3D
                  position={pos}
                  rotation={rot}
                  isSelected={isSelected}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          if (comp.type === 'SLIDE_SWITCH') {
            return (
              <group
                key={comp.id}
                onPointerDown={handleCompPointerDown}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  onSelectWire(null);
                }}
              >
                <SlideSwitch3D
                  position={pos}
                  rotation={rot}
                  isSelected={isSelected}
                  isOn={comp.parameters?.closed === true}
                  onToggle={() => {
                    const nextClosed = !comp.parameters?.closed;
                    onUpdateComponent3D({
                      ...comp,
                      parameters: { ...comp.parameters, closed: nextClosed },
                    });
                    toast.info(`Switched ${comp.label} ${nextClosed ? 'ON (Closed)' : 'OFF (Open)'}`);
                  }}
                  hoveredPin={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
                  onHoverPin={(pinName) =>
                    setHoveredPinInfo(pinName ? { compId: comp.id, pinName } : null)
                  }
                  onPinClick={(pinName, wPos) => handlePinClick(comp.id, pinName, wPos)}
                />
              </group>
            );
          }

          // 100% Physical Representation Package-Aware Hardware Fallback Renderer
          const catalogItem = COMPONENT_CATALOG.find((t) => t.type === comp.type);
          const pinCount = catalogItem?.pins?.length || 2;
          const isDipFallback = pinCount >= 4 && pinCount <= 28;
          const is3PinTht = pinCount === 3;
          const is2PinTht = pinCount <= 2;
          const isModulePackage = !isDipFallback && !is3PinTht && !is2PinTht;

          return (
            <group
              key={comp.id}
              position={pos}
              rotation={rot}
              onPointerDown={handleCompPointerDown}
              onClick={(e) => {
                e.stopPropagation();
                onSelectComponent(comp.id);
                onSelectWire(null);
              }}
            >
              {/* Invisible Grab Hit Mesh for Effortless Pick-and-Place Acquisition */}
              <mesh position={[0, 4.0, 0]} visible={false}>
                <boxGeometry args={[Math.max(14, myFp.halfW * 2 + 4), 16, Math.max(12, myFp.halfD * 2 + 4)]} />
                <meshBasicMaterial transparent opacity={0} />
              </mesh>

              {/* Selection Highlight Reticle */}
              {isSelected && (
                <mesh position={[0, 4.0, 0]}>
                  <boxGeometry args={[Math.max(14, myFp.halfW * 2 + 1), 8.5, Math.max(12, myFp.halfD * 2 + 1)]} />
                  <meshBasicMaterial color="#38BDF8" wireframe />
                </mesh>
              )}

              {/* Dynamic Pick-and-Place Elevation Ground Reticle */}
              {isDraggingThis && (
                <mesh position={[0, -3.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[myFp.halfW * 0.8, myFp.halfW + 2.0, 32]} />
                  <meshBasicMaterial color="#38BDF8" transparent opacity={0.6} side={THREE.DoubleSide} />
                </mesh>
              )}

              {/* Sub-Branch A: 2-Pin THT (Axial/Radial Cylindrical Component) */}
              {is2PinTht && (
                <group position={[0, 4.5, 0]}>
                  <mesh rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[2.2, 2.2, 6.0, 24]} />
                    <meshStandardMaterial color={isSelected ? '#38BDF8' : '#334155'} roughness={0.4} />
                  </mesh>
                  {/* Leads */}
                  {[-3.81, 3.81].map((px, pi) => (
                    <group key={pi} position={[px, 0, 0]}>
                      <mesh position={[0, -4.5, 0]}>
                        <cylinderGeometry args={[0.35, 0.35, 9.0, 12]} />
                        <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.18} />
                      </mesh>
                      <mesh
                        position={[0, -4.5, 0]}
                        renderOrder={100}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const pId = String(pi + 1);
                          handlePinClick(comp.id, pId, getPinWorld3D(comp.id, pId));
                        }}
                      >
                        <sphereGeometry args={[0.8, 8, 8]} />
                        <meshBasicMaterial color="#38BDF8" />
                      </mesh>
                    </group>
                  ))}
                </group>
              )}

              {/* Sub-Branch B: 3-Pin THT (TO-92 / Transistor Package) */}
              {is3PinTht && (
                <group position={[0, 3.5, 0]}>
                  <mesh>
                    <cylinderGeometry args={[2.5, 2.5, 5.0, 24, 1, false, -Math.PI / 2, Math.PI]} />
                    <meshStandardMaterial color={isSelected ? '#38BDF8' : '#18181B'} roughness={0.6} />
                  </mesh>
                  {[-2.54, 0, 2.54].map((px, pi) => (
                    <group key={pi} position={[px, -3.5, 0]}>
                      <mesh>
                        <boxGeometry args={[0.45, 7.0, 0.45]} />
                        <meshStandardMaterial color="#CBD5E1" metalness={0.95} roughness={0.18} />
                      </mesh>
                      <mesh
                        renderOrder={100}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const pId = String(pi + 1);
                          handlePinClick(comp.id, pId, getPinWorld3D(comp.id, pId));
                        }}
                      >
                        <sphereGeometry args={[0.8, 8, 8]} />
                        <meshBasicMaterial color="#38BDF8" />
                      </mesh>
                    </group>
                  ))}
                </group>
              )}

              {/* Sub-Branch C: 4..28 Pin DIP IC Package */}
              {isDipFallback && (
                <group position={[0, 2.5, 0]}>
                  <mesh>
                    <boxGeometry args={[Math.max(9.5, Math.ceil(pinCount / 2) * 2.54 + 2), 3.5, 6.4]} />
                    <meshStandardMaterial color={isSelected ? '#38BDF8' : '#18181B'} roughness={0.6} />
                  </mesh>
                  {/* Notch on left edge */}
                  <mesh position={[-Math.max(9.5, Math.ceil(pinCount / 2) * 2.54 + 2) / 2 + 0.3, 1.8, 0]}>
                    <cylinderGeometry args={[0.8, 0.8, 0.4, 16, 1, false, -Math.PI / 2, Math.PI]} />
                    <meshBasicMaterial color="#09090B" />
                  </mesh>
                  {/* Solid metallic pin rows on both sides with authentic DIP shank length */}
                  {Array.from({ length: Math.ceil(pinCount / 2) }).map((_, i) => {
                    const startX = -((Math.ceil(pinCount / 2) - 1) * 2.54) / 2;
                    const px = startX + i * 2.54;
                    return (
                      <group key={i}>
                        {/* Row E pin */}
                        <mesh position={[px, -2.0, -3.34]}>
                          <boxGeometry args={[0.65, 6.2, 0.45]} />
                          <meshStandardMaterial color="#E2E8F0" metalness={0.95} roughness={0.18} />
                        </mesh>
                        {/* Row F pin */}
                        <mesh position={[px, -2.0, 3.34]}>
                          <boxGeometry args={[0.65, 6.2, 0.45]} />
                          <meshStandardMaterial color="#E2E8F0" metalness={0.95} roughness={0.18} />
                        </mesh>
                      </group>
                    );
                  })}
                </group>
              )}

              {/* Sub-Branch D: Module / Sensor / Breakout / Industrial Board */}
              {isModulePackage && (
                <group position={[0, 0.8, 0]}>
                  {/* Flat FR-4 PCB */}
                  <mesh material={new THREE.MeshStandardMaterial({ color: isSelected ? '#059669' : '#0F766E', roughness: 0.35 })}>
                    <boxGeometry args={[Math.max(30, myFp.halfW * 2), 1.6, Math.max(20, myFp.halfD * 2)]} />
                  </mesh>
                  {/* Black Header Strip */}
                  <mesh position={[0, 2.0, -Math.max(20, myFp.halfD * 2) / 2 + 2.5]}>
                    <boxGeometry args={[Math.max(16, pinCount * 2.54), 2.5, 2.5]} />
                    <meshStandardMaterial color="#18181B" roughness={0.8} />
                  </mesh>
                  {/* Solid Metallic Square Pins (Downward Insertion Legs + Upward Terminals) */}
                  {Array.from({ length: Math.min(pinCount, 16) }).map((_, pi) => {
                    const startX = -((Math.min(pinCount, 16) - 1) * 2.54) / 2;
                    const px = startX + pi * 2.54;
                    const pinItem = catalogItem?.pins?.[pi];
                    const pinName = pinItem?.name || pinItem?.id || String(pi + 1);
                    const isHovered = hoveredPinInfo?.compId === comp.id && (hoveredPinInfo.pinName === pinName || hoveredPinInfo.pinName === pinItem?.id);
                    return (
                      <group key={pi} position={[px, 0, -Math.max(20, myFp.halfD * 2) / 2 + 2.5]}>
                        {/* Downward solid metallic pin into breadboard spring clips */}
                        <mesh position={[0, -2.5, 0]}>
                          <boxGeometry args={[0.64, 6.5, 0.64]} />
                          <meshStandardMaterial color="#F59E0B" metalness={0.92} roughness={0.18} />
                        </mesh>
                        {/* Upward header pin terminal */}
                        <mesh position={[0, 4.0, 0]}>
                          <boxGeometry args={[0.64, 4.0, 0.64]} />
                          <meshStandardMaterial color={isHovered ? '#FDE047' : '#F59E0B'} metalness={0.92} roughness={0.18} />
                        </mesh>
                        {/* Solder fillet cone on carrier pad */}
                        <mesh position={[0, 0.85, 0]}>
                          <cylinderGeometry args={[0.55, 0.85, 0.3, 12]} />
                          <meshStandardMaterial color="#E2E8F0" metalness={0.95} roughness={0.18} />
                        </mesh>
                        {/* Raycast hit target & hover sphere */}
                        <mesh
                          position={[0, 2.5, 0]}
                          renderOrder={100}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePinClick(comp.id, pinName, getPinWorld3D(comp.id, pinName));
                          }}
                          onPointerOver={(e) => {
                            e.stopPropagation();
                            setHoveredPinInfo({ compId: comp.id, pinName });
                          }}
                          onPointerOut={() => setHoveredPinInfo(null)}
                        >
                          <sphereGeometry args={[isHovered ? 1.4 : 0.8, 8, 8]} />
                          <meshBasicMaterial color={isHovered ? '#FDE047' : '#38BDF8'} transparent opacity={isHovered ? 0.9 : 0} />
                        </mesh>
                      </group>
                    );
                  })}
                </group>
              )}
            </group>
          );
        })}

        {/* 3D Jumper Wires */}
        {wires3d.map((w) => {
          const p1 = getPinWorld3D(w.fromPin.compId, w.fromPin.pinId);
          const p2 = getPinWorld3D(w.toPin.compId, w.toPin.pinId);
          const isSelected = selectedWireId === w.id;
          const isConnectedToHoveredPin = Boolean(
            hoveredPinInfo &&
              ((w.fromPin.compId === hoveredPinInfo.compId && w.fromPin.pinId === hoveredPinInfo.pinName) ||
                (w.toPin.compId === hoveredPinInfo.compId && w.toPin.pinId === hoveredPinInfo.pinName))
          );

          // Obstacle-aware clearance: detect any component body between p1 and p2
          let maxObstacleTopY = 0;
          const wireLineA = new THREE.Vector2(p1.x, p1.z);
          const wireLineB = new THREE.Vector2(p2.x, p2.z);
          const wireLineLenSq = wireLineA.distanceToSquared(wireLineB);

          if (wireLineLenSq > 9.0) {
            for (const c of components3d) {
              // Skip the source and target components themselves
              if (c.id === w.fromPin.compId || c.id === w.toPin.compId) continue;
              const fp = getComponentFootprint(c.type);
              const cPos = new THREE.Vector2(c.x3d, c.z3d);

              // Distance from component center to wire line segment in 2D
              const tVal = Math.max(0, Math.min(1, ((cPos.x - wireLineA.x) * (wireLineB.x - wireLineA.x) + (cPos.y - wireLineA.y) * (wireLineB.y - wireLineA.y)) / wireLineLenSq));
              const proj = new THREE.Vector2(
                wireLineA.x + tVal * (wireLineB.x - wireLineA.x),
                wireLineA.y + tVal * (wireLineB.y - wireLineA.y)
              );
              const distSq = cPos.distanceToSquared(proj);
              const collisionRadius = Math.max(fp.halfW, fp.halfD) + 1.5;

              if (distSq < collisionRadius * collisionRadius) {
                const elevSpec = getComponentElevationSpec(c.type);
                const compTop = c.y3d + (elevSpec.packageHeight || 8.0);
                if (compTop > maxObstacleTopY) {
                  maxObstacleTopY = compTop;
                }
              }
            }
          }

          const obstacleApexY = maxObstacleTopY > 0 ? maxObstacleTopY + 4.5 : undefined;

          return (
            <Wire3DTube
              key={w.id}
              id={w.id}
              start={p1}
              end={p2}
              color={w.color}
              isSelected={isSelected}
              isHighlighted={isConnectedToHoveredPin}
              isSimulating={isSimulating}
              current={wireCurrents?.[w.id] ?? w.current}
              obstacleApexY={obstacleApexY}
              onClick={(id) => {
                onSelectWire(id);
                onSelectComponent(null);
              }}
            />
          );
        })}
        {/* Floating Pin Markings & Silkscreen Overlay with Staggered Non-Overlapping Offsets */}
        {components3d.map((comp) => (
          <ComponentPinLabelsOverlay
            key={`labels_${comp.id}`}
            comp={comp}
            isSelected={selectedCompId === comp.id}
            hoveredPinName={hoveredPinInfo?.compId === comp.id ? hoveredPinInfo.pinName : null}
            showAll={showPinLabels}
          />
        ))}
      </Canvas>

      {/* Top Floating View Controls, Tool Mode & Wire Colors */}
      <div className="absolute top-3 left-4 flex items-center gap-1.5 bg-slate-900/95 border border-slate-700/80 rounded-xl p-1 shadow-2xl backdrop-blur z-20 font-mono text-xs max-w-[calc(100vw-150px)] overflow-x-auto">
        {/* Tool Mode: Inspect (V) vs Wire Tool (W) */}
        <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
          <button
            onClick={() => {
              setToolMode3D('inspect');
              setActiveWireStart(null);
              setEditingWireEndpoint(null);
            }}
            className={`px-2 py-1 rounded flex items-center gap-1 font-semibold text-xs transition-colors cursor-pointer ${
              toolMode3D === 'inspect'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Inspect / Select Mode [V] — Click to select parts, move components or view connections without drawing wires"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Select (V)</span>
          </button>

          <button
            onClick={() => {
              setToolMode3D('wire');
              setEditingWireEndpoint(null);
              toast.info('Wire Tool Active (W) — Click first pin/hole, then click second pin/hole');
            }}
            className={`px-2 py-1 rounded flex items-center gap-1 font-semibold text-xs transition-colors cursor-pointer ${
              toolMode3D === 'wire'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Jumper Wire Tool [W] — Click two terminals or breadboard holes to route wires"
          >
            <Cable className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Wire (W)</span>
          </button>
        </div>

        <div className="h-4 w-px bg-slate-700 mx-0.5" />

        {/* Viewport Camera CAD Presets & Navigation */}
        <div className="flex items-center gap-0.5 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setCameraView('top')}
            className="h-7 px-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded text-xs font-mono flex items-center justify-center cursor-pointer transition-colors"
            title="Top-Down Plan View [CAD Top]"
          >
            Top
          </button>
          <button
            onClick={() => setCameraView('front')}
            className="h-7 px-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded text-xs font-mono flex items-center justify-center cursor-pointer hidden sm:flex transition-colors"
            title="Front Elevation View [CAD Front]"
          >
            Front
          </button>
          <button
            onClick={() => setCameraView('iso')}
            className="h-7 px-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded text-xs font-mono flex items-center gap-1 justify-center cursor-pointer transition-colors"
            title="Isometric 3D CAD View"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Iso (3D)</span>
          </button>

          <div className="h-3.5 w-px bg-slate-800 mx-0.5" />

          {/* Focus Selected */}
          <button
            onClick={focusSelectedOrBreadboard}
            className="h-7 px-2 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 rounded text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors"
            title={selectedCompId ? "Focus View on Selected Component" : "Focus / Center Breadboard View"}
          >
            <Focus className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Focus Selected</span>
          </button>

          {/* Reset View */}
          <button
            onClick={resetCamera}
            className="h-7 px-2 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 rounded text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors"
            title="Reset Camera to Home Isometric View"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Reset View</span>
          </button>

          {/* Pan Tool Toggle Button */}
          <button
            type="button"
            onClick={() => setIsPanMode((prev) => !prev)}
            className={`w-7 h-7 flex items-center justify-center rounded cursor-pointer transition-colors ${
              isPanMode
                ? 'bg-amber-600 text-white font-bold shadow'
                : 'hover:bg-slate-800 text-slate-300 hover:text-cyan-300'
            }`}
            title={isPanMode ? "Pan Tool Active (H) — Left-drag to pan 3D viewport" : "Pan Tool (H) — Left-drag to pan 3D viewport"}
          >
            <Hand className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-px bg-slate-800 mx-0.5" />

          {/* Zoom Out (-) */}
          <button
            onClick={() => zoomCamera('out')}
            className="w-7 h-7 flex items-center justify-center hover:bg-slate-800 text-slate-300 hover:text-cyan-300 rounded cursor-pointer transition-colors"
            title="Zoom Out (- key / Scroll)"
          >
            <span className="font-bold text-xs">−</span>
          </button>

          {/* Zoom In (+) */}
          <button
            onClick={() => zoomCamera('in')}
            className="w-7 h-7 flex items-center justify-center hover:bg-slate-800 text-slate-300 hover:text-cyan-300 rounded cursor-pointer transition-colors"
            title="Zoom In (+ key / Scroll)"
          >
            <span className="font-bold text-xs">+</span>
          </button>

          <div className="h-3.5 w-px bg-slate-800 mx-0.5" />

          {/* Full Console Screen Viewport */}
          <button
            onClick={toggleFullscreen}
            className={`w-7 h-7 flex items-center justify-center rounded cursor-pointer transition-colors ${
              isFullscreen ? 'bg-cyan-600 text-white' : 'hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
            title={isFullscreen ? "Exit Full Console Screen (Esc)" : "Full Console Screen Viewport"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="h-4 w-px bg-slate-700 mx-0.5" />

        {/* Toggle Pin Labels */}
        <button
          onClick={() => setShowPinLabels((v) => !v)}
          className={`px-2 py-1 rounded text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors ${
            showPinLabels
              ? 'bg-cyan-600 text-white font-bold shadow-sm'
              : 'hover:bg-slate-800 text-slate-300 hover:text-white'
          }`}
          title="Toggle Floating Pin Markings & Silkscreen Labels [L]"
        >
          <Tag className="w-3.5 h-3.5 text-cyan-400" />
          <span>Labels</span>
        </button>

        <div className="h-4 w-px bg-slate-700 mx-0.5" />

        {/* Wire Color Chooser */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400 uppercase font-mono hidden sm:inline">Wire:</span>
          {[
            { hex: '#EF4444', label: 'Red' },
            { hex: '#1E293B', label: 'Black' },
            { hex: '#3B82F6', label: 'Blue' },
            { hex: '#10B981', label: 'Green' },
            { hex: '#F97316', label: 'Orange' },
            { hex: '#F8FAFC', label: 'White' },
          ].map((c) => {
            const isDotActive = selectedWire ? (selectedWire.color === c.hex || (c.hex === '#F97316' && selectedWire.color === '#F59E0B')) : (activeWireColor === c.hex || (c.hex === '#F97316' && activeWireColor === '#F59E0B'));
            return (
              <button
                key={c.hex}
                type="button"
                onClick={() => {
                  setActiveWireColor(c.hex);
                  if (selectedWireId && onUpdateWire3D) {
                    const selWire = wires3d.find((w) => w.id === selectedWireId);
                    if (selWire) {
                      onUpdateWire3D({ ...selWire, color: c.hex });
                    }
                  }
                }}
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border transition-all cursor-pointer ${
                  isDotActive
                    ? 'ring-2 ring-cyan-400 scale-110 border-white'
                    : 'border-slate-600 hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
                title={`Wire Color: ${c.label}`}
              />
            );
          })}
        </div>
      </div>

      {/* Top Right Add Component Drawer Trigger */}
      <div className="absolute top-3 right-4 flex items-center gap-2 z-20">
        <button
          onClick={() => setIsAddDrawerOpen((o) => !o)}
          className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-lg shadow-lg cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>3D Library</span>
        </button>
      </div>

      {/* Expanded Pro 3D Component Library Grid Drawer */}
      {isAddDrawerOpen && (
        <div className="absolute top-14 right-4 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-slate-900/98 border border-slate-700/80 rounded-xl p-3.5 shadow-2xl z-30 font-mono text-xs space-y-3 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-200 font-bold uppercase text-[11px]">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Cpu className="w-4 h-4" />
              3D Component Palette
            </span>
            <button onClick={() => setIsAddDrawerOpen(false)} className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Real-time Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={libSearch}
              onChange={(e) => setLibSearch(e.target.value)}
              placeholder="Search 3D components..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* 3-Tier Database Filter Pills */}
          <div className="grid grid-cols-4 gap-1 bg-slate-950/70 p-0.5 rounded border border-slate-800">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'generic', label: 'Generic' },
                { id: 'real', label: 'Real Parts' },
                { id: 'industrial', label: 'Industrial' },
              ] as const
            ).map((tier) => {
              const active = libTier === tier.id;
              return (
                <button
                  key={tier.id}
                  onClick={() => {
                    setLibTier(tier.id);
                    setLibSubCategory('all');
                  }}
                  className={`py-0.5 px-1 rounded text-[10px] font-mono font-medium transition-all text-center truncate ${
                    active
                      ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/60 font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                  title={`Filter by ${tier.label} library tier`}
                >
                  {tier.label}
                </button>
              );
            })}
          </div>

          {/* 25 Master Engineering Categories Dropdown */}
          <div className="relative">
            <select
              value={libCategory25}
              onChange={(e) => {
                setLibCategory25(e.target.value);
                setLibSubCategory('all');
              }}
              className="w-full appearance-none bg-slate-950 border border-slate-700 hover:border-slate-600 rounded-md px-2 py-1.5 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer pr-6 truncate"
              title="Filter by 25 Master Engineering Categories"
            >
              <option value="all">⚡ All Categories (25)</option>
              {MASTER_25_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Subcategory Filter Pills when options exist */}
          {available3DSubCategories.length > 1 && (
            <div className="flex flex-wrap gap-1 text-[9px] pt-0.5 border-t border-slate-800/60 max-h-16 overflow-y-auto">
              <button
                onClick={() => setLibSubCategory('all')}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  libSubCategory === 'all'
                    ? 'bg-slate-700 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              {available3DSubCategories.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setLibSubCategory(sub)}
                  className={`px-1.5 py-0.5 rounded transition-colors capitalize ${
                    libSubCategory === sub
                      ? 'bg-cyan-700 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {sub.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          )}

          {/* 2-Column Compact Component-Type Grid with Click-to-Place */}
          <div className="max-h-72 overflow-y-auto grid grid-cols-2 gap-2 pr-1">
            {filteredLibrary.map((item) => {
              const simInfo = getSimulationBadgeInfo(item.simulationStatus);
              const pkgCode = item.physicalSpec?.packageCode || item.packageType || 'THT';
              const shortName = item.name
                .replace(/\(ATmega2560\)/gi, '')
                .replace(/\(ATmega328P\)/gi, '')
                .replace(/R3|V3/gi, '')
                .replace(/\s+/g, ' ')
                .trim();

              return (
                <button
                  key={item.type + item.name}
                  onClick={() => {
                    const countOfType = components3d.filter((c) => c.type === item.type).length;
                    const offsetX = countOfType > 0 ? (countOfType % 2 === 1 ? countOfType * 35 : -countOfType * 35) : 0;
                    const offsetZ = countOfType > 0 ? countOfType * 15 : 0;

                    let defPos: [number, number, number] = [0, 8.5, 0];
                    if (item.type.includes('MEGA') || item.type === 'ARDUINO_UNO') defPos = [0, 0, 65];
                    else if (item.type.includes('BATTERY')) defPos = [-95, 0, 0];
                    else if (item.type === 'TIMER_555' || item.type.includes('74HC') || item.type.includes('DIP')) defPos = [-3.81, 8.5, 0];
                    else if (item.type.includes('PICO') || item.type.includes('NANO') || item.type.includes('ESP32')) defPos = [-5.08, 8.5, 0];
                    else if (item.type === 'RESISTOR' || item.type === 'DIODE' || item.type === 'LED' || item.type.includes('CAPACITOR')) defPos = [10, 8.5, -3.34];

                    const newComp: Component3D = {
                      id: `comp3d_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                      type: item.type,
                      label: countOfType > 0 ? `${shortName.split(' ')[0]} #${countOfType + 1}` : (shortName.split(' ')[0] || item.type),
                      value: item.defaultValue || '',
                      parameters: item.defaultParams ? { ...item.defaultParams } : {},
                      x3d: defPos[0] + offsetX,
                      y3d: defPos[1],
                      z3d: defPos[2] + offsetZ,
                      rotY: 0,
                    };
                    onAddComponent3D(newComp);
                    setIsAddDrawerOpen(false);
                    onSelectComponent(newComp.id);
                  }}
                  className="text-left p-2 rounded-lg bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 hover:border-cyan-500/50 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-950 text-cyan-400 font-mono truncate max-w-[55px]" title={item.defaultValue}>
                        {item.defaultValue}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-[8px] font-mono px-1 py-0.2 rounded font-semibold uppercase ${simInfo.badgeClass}`}>
                          {simInfo.label}
                        </span>
                        <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800 uppercase" title={pkgCode}>
                          {pkgCode}
                        </span>
                      </div>
                    </div>
                    <div className="font-semibold text-slate-200 group-hover:text-cyan-300 text-[11px] leading-tight line-clamp-1" title={item.name}>
                      {shortName}
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1 line-clamp-1" title={item.description || item.partNumber}>
                    {item.partNumber || item.description || item.category}
                  </div>
                </button>
              );
            })}
            {filteredLibrary.length === 0 && (
              <div className="col-span-2 text-center py-6 text-slate-500 text-xs">
                No matching 3D components found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Wire HUD when wire is selected: Single Disconnect Button + Color Swatches */}
      {selectedWire && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-amber-500/80 rounded-xl px-4 py-2.5 shadow-2xl z-30 font-mono text-xs flex items-center gap-3 text-slate-200 backdrop-blur animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold uppercase text-[10px]">3D Jumper:</span>
            <span className="text-[11px] text-slate-300">
              {selectedWire.fromPin.compId} [{selectedWire.fromPin.pinId}] ➔ {selectedWire.toPin.compId} [{selectedWire.toPin.pinId}]
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Color picker swatches */}
          <div className="flex items-center gap-1.5" title="Change wire color">
            {['#EF4444', '#3B82F6', '#10B981', '#EAB308', '#1E293B', '#F8FAFC'].map((hex) => (
              <button
                key={hex}
                onClick={() => onUpdateWire3D({ ...selectedWire, color: hex })}
                className="w-4 h-4 rounded-full border border-slate-600 hover:scale-125 transition-transform cursor-pointer"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Move / Reroute Endpoints to another hole or pin */}
          <button
            onClick={() => {
              setEditingWireEndpoint({ wireId: selectedWire.id, end: 'from' });
              toast.info(`Click any breadboard hole to move Start pin [${selectedWire.fromPin.pinId}]`);
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
              editingWireEndpoint?.wireId === selectedWire.id && editingWireEndpoint.end === 'from'
                ? 'bg-amber-500 text-slate-950 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
            }`}
            title="Move Start Pin to another breadboard hole or pin"
          >
            Move Start
          </button>

          <button
            onClick={() => {
              setEditingWireEndpoint({ wireId: selectedWire.id, end: 'to' });
              toast.info(`Click any breadboard hole to move End pin [${selectedWire.toPin.pinId}]`);
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
              editingWireEndpoint?.wireId === selectedWire.id && editingWireEndpoint.end === 'to'
                ? 'bg-amber-500 text-slate-950 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
            }`}
            title="Move End Pin to another breadboard hole or pin"
          >
            Move End
          </button>

          <div className="h-4 w-px bg-slate-700" />

          {/* Single Disconnect Wire Button */}
          <button
            onClick={() => {
              onDeleteWire3D(selectedWire.id);
              onSelectWire(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-rose-950/60 border border-rose-600/80 text-rose-300 hover:bg-rose-900 rounded text-[11px] font-bold cursor-pointer transition-colors"
            title="Cleanly disconnect this jumper wire from breadboard / terminals"
          >
            <Unplug className="w-3.5 h-3.5" />
            <span>Disconnect</span>
          </button>
        </div>
      )}

      {/* Floating CAD Component Manipulation Toolbar (Slim, Collapsible, 28px-32px buttons) */}
      {selectedComp && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-cyan-500/70 rounded-xl px-3 py-1.5 shadow-2xl z-30 font-mono text-xs flex flex-col gap-1.5 text-slate-200 backdrop-blur animate-in fade-in slide-in-from-bottom-2 duration-150 max-w-[96vw] select-none pointer-events-auto">
          {/* Collapsed Mini-Dock State */}
          {isPanelCollapsed ? (
            <div className="flex items-center gap-2 h-7">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-cyan-400 font-bold uppercase text-[9px]">Part:</span>
                <span className="text-white font-semibold text-xs">{selectedComp.label}</span>
                <span className="text-[9px] px-1 py-0.5 rounded bg-slate-800 text-cyan-300">
                  {selectedComp.value || selectedComp.type}
                </span>
              </div>

              <div className="h-4 w-px bg-slate-800" />

              {/* Quick Snap */}
              <button
                type="button"
                onClick={() => {
                  onUpdateComponent3D(snapComponentToSurface(selectedComp, hasBreadboard));
                  toast.success(`Dropped ${selectedComp.label} to surface`);
                }}
                className="w-7 h-7 flex items-center justify-center rounded bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/60 text-cyan-300 hover:text-white transition-colors cursor-pointer"
                title="Snap / Drop to Surface"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 text-cyan-400" />
              </button>

              {/* Quick Flip 180° */}
              <button
                type="button"
                onClick={() => {
                  const updated = flipComponent3D(selectedComp);
                  onUpdateComponent3D(updated);
                  if (onMirrorComponent) onMirrorComponent(selectedComp.id);
                  toast.info(`Flipped ${selectedComp.label} 180° [F]`);
                }}
                className="w-7 h-7 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 hover:text-amber-200 transition-colors cursor-pointer"
                title="Flip / Invert Orientation 180° [F]"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
              </button>

              {/* Quick Yaw +45° */}
              <button
                type="button"
                onClick={() => {
                  const updated = rotateComponent45(selectedComp, 'yaw', 1);
                  onUpdateComponent3D(updated);
                  toast.info(`Rotated ${selectedComp.label} Yaw to ${updated.rotY}° [R]`);
                }}
                className="w-7 h-7 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 transition-colors cursor-pointer text-[10px] font-bold"
                title="Rotate +45° Yaw [R]"
              >
                +45°
              </button>

              {/* Quick Delete */}
              <button
                type="button"
                onClick={() => {
                  onDeleteComponent3D(selectedComp.id);
                  onSelectComponent(null);
                }}
                className="w-7 h-7 flex items-center justify-center text-rose-400 hover:text-rose-200 rounded bg-rose-950/40 hover:bg-rose-950/80 border border-rose-800/60 cursor-pointer transition-colors"
                title="Delete component [Del]"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-slate-800" />

              {/* Expand Toggle */}
              <button
                type="button"
                onClick={() => setIsPanelCollapsed(false)}
                className="w-7 h-7 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Expand full 3D manipulation toolbar"
              >
                <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            </div>
          ) : (
            <>
              {/* Row 1: Header & Primary Actions */}
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-cyan-400 font-bold uppercase text-[9px]">Part:</span>
                  <span className="text-white font-semibold text-xs">{selectedComp.label}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">
                    {selectedComp.value || selectedComp.type}
                  </span>
                </div>

                <div className="flex items-center gap-1 ml-auto">
                  {/* Snap / Drop to Surface */}
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateComponent3D(snapComponentToSurface(selectedComp, hasBreadboard));
                      toast.success(`Dropped ${selectedComp.label} to surface`);
                    }}
                    className="h-7 px-2 flex items-center gap-1 rounded bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/60 text-cyan-300 hover:text-white transition-colors cursor-pointer text-[11px]"
                    title="Snap lowest pins/base flush to breadboard or workbench surface"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Snap</span>
                  </button>

                  {/* Single Genuine Flip / Invert Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const updated = flipComponent3D(selectedComp);
                      onUpdateComponent3D(updated);
                      if (onMirrorComponent) onMirrorComponent(selectedComp.id);
                      toast.info(`Flipped ${selectedComp.label} 180° [F]`);
                    }}
                    className="h-7 px-2 flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 hover:text-amber-200 transition-colors cursor-pointer text-[11px]"
                    title="Invert / Mirror component pinout orientation 180° [F]"
                  >
                    <FlipHorizontal className="w-3.5 h-3.5 text-amber-400" />
                    <span>Flip [F]</span>
                  </button>

                  {/* Reset Orientation */}
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateComponent3D(resetComponentOrientation(selectedComp));
                      toast.info(`Reset orientation for ${selectedComp.label}`);
                    }}
                    className="h-7 px-2 flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-[11px]"
                    title="Reset Yaw, Pitch, Roll angles back to 0°"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>

                  {/* Delete Component Button */}
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteComponent3D(selectedComp.id);
                      onSelectComponent(null);
                    }}
                    className="h-7 px-2 flex items-center gap-1 text-rose-400 hover:text-rose-200 rounded bg-rose-950/40 hover:bg-rose-950/80 border border-rose-800/60 font-semibold cursor-pointer transition-colors text-[11px]"
                    title="Delete this component and attached wires [Delete]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Del</span>
                  </button>

                  {/* Collapse to mini-dock */}
                  <button
                    type="button"
                    onClick={() => setIsPanelCollapsed(true)}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer ml-0.5"
                    title="Collapse toolbar into mini-dock"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Row 2: 3D Directional Nudge & 45° Step Rotations (All 28px-32px Compact Buttons) */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800 text-[11px]">
                {/* Position Nudge: X, Z, Y */}
                <div className="flex items-center gap-1 bg-slate-950/70 p-0.5 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider px-1">Move:</span>

                  {/* X Axis */}
                  <div className="flex items-center gap-0.5 bg-slate-900 px-0.5 py-0.5 rounded border border-slate-800">
                    <span className="text-[9px] text-slate-400 font-bold px-0.5">X:</span>
                    <button
                      type="button"
                      onClick={() => onUpdateComponent3D(nudgeComponent3D(selectedComp, 'x', -2.54))}
                      className="w-7 h-7 flex items-center justify-center hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer transition-colors"
                      title="Move Left -2.54mm [-X / Left Arrow]"
                    >
                      <MoveLeft className="w-3 h-3 text-cyan-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateComponent3D(nudgeComponent3D(selectedComp, 'x', 2.54))}
                      className="w-7 h-7 flex items-center justify-center hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer transition-colors"
                      title="Move Right +2.54mm [+X / Right Arrow]"
                    >
                      <MoveRight className="w-3 h-3 text-cyan-400" />
                    </button>
                  </div>

                  {/* Z Axis */}
                  <div className="flex items-center gap-0.5 bg-slate-900 px-0.5 py-0.5 rounded border border-slate-800">
                    <span className="text-[9px] text-slate-400 font-bold px-0.5">Z:</span>
                    <button
                      type="button"
                      onClick={() => onUpdateComponent3D(nudgeComponent3D(selectedComp, 'z', -2.54))}
                      className="w-7 h-7 flex items-center justify-center hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer transition-colors"
                      title="Move Forward -2.54mm [-Z / Up Arrow]"
                    >
                      <MoveUp className="w-3 h-3 text-cyan-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateComponent3D(nudgeComponent3D(selectedComp, 'z', 2.54))}
                      className="w-7 h-7 flex items-center justify-center hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer transition-colors"
                      title="Move Back +2.54mm [+Z / Down Arrow]"
                    >
                      <MoveDown className="w-3 h-3 text-cyan-400" />
                    </button>
                  </div>

                  {/* Y Axis: Up / Down (clamped) */}
                  <div className="flex items-center gap-0.5 bg-slate-900 px-0.5 py-0.5 rounded border border-slate-800">
                    <span className="text-[9px] text-emerald-400 font-bold px-0.5">Y:</span>
                    <button
                      type="button"
                      onClick={() => onUpdateComponent3D(nudgeComponent3D(selectedComp, 'y', 2.54))}
                      className="w-7 h-7 flex items-center justify-center hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer transition-colors"
                      title="Elevate Up +2.54mm [+Y / E / PgUp]"
                    >
                      <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateComponent3D(nudgeComponent3D(selectedComp, 'y', -2.54))}
                      className="w-7 h-7 flex items-center justify-center hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer transition-colors"
                      title="Lower Down -2.54mm [-Y / Q / PgDn] (Clamped above workbench surface)"
                    >
                      <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                    </button>
                  </div>
                </div>

                <div className="h-4 w-px bg-slate-800" />

                {/* 45° Step Rotations: Yaw (Y), Pitch (X), Roll (Z) */}
                <div className="flex items-center gap-1 bg-slate-950/70 p-0.5 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider px-1">45° Steps:</span>

                  {/* Yaw (Y-axis horizontal spin) */}
                  <div className="flex items-center gap-0.5 bg-slate-900 px-0.5 py-0.5 rounded border border-slate-800">
                    <span className="text-[9px] text-cyan-300 font-bold px-0.5">Yaw:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = rotateComponent45(selectedComp, 'yaw', -1);
                        onUpdateComponent3D(updated);
                        toast.info(`Rotated Yaw to ${updated.rotY}° [Shift+R]`);
                      }}
                      className="w-7 h-7 flex items-center justify-center hover:bg-slate-800 text-cyan-300 font-medium text-[10px] rounded cursor-pointer transition-colors"
                      title="Rotate -45° Yaw counter-clockwise around Y [Shift+R]"
                    >
                      -45°
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = rotateComponent45(selectedComp, 'yaw', 1);
                        onUpdateComponent3D(updated);
                        toast.info(`Rotated Yaw to ${updated.rotY}° [R]`);
                      }}
                      className="w-7 h-7 flex items-center justify-center hover:bg-slate-800 text-cyan-300 font-medium text-[10px] rounded cursor-pointer transition-colors"
                      title="Rotate +45° Yaw clockwise around Y [R] (Two clicks = 90°)"
                    >
                      +45°
                    </button>
                  </div>

                  {/* Pitch (X-axis tilt forward/back) */}
                  <div className="flex items-center gap-0.5 bg-slate-900 px-0.5 py-0.5 rounded border border-slate-800">
                    <span className="text-[9px] text-amber-300 font-bold px-0.5">Pitch:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = rotateComponent45(selectedComp, 'pitch', -1);
                        onUpdateComponent3D(updated);
                        toast.info(`Tilted Pitch to ${updated.rotX}°`);
                      }}
                      className="w-7 h-7 flex items-center justify-center hover:bg-slate-800 text-amber-300 font-medium text-[10px] rounded cursor-pointer transition-colors"
                      title="Tilt -45° Pitch forward around X"
                    >
                      -45°
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = rotateComponent45(selectedComp, 'pitch', 1);
                        onUpdateComponent3D(updated);
                        toast.info(`Tilted Pitch to ${updated.rotX}°`);
                      }}
                      className="w-7 h-7 flex items-center justify-center hover:bg-slate-800 text-amber-300 font-medium text-[10px] rounded cursor-pointer transition-colors"
                      title="Tilt +45° Pitch backward around X"
                    >
                      +45°
                    </button>
                  </div>

                  {/* Roll (Z-axis tilt left/right) */}
                  <div className="flex items-center gap-0.5 bg-slate-900 px-0.5 py-0.5 rounded border border-slate-800">
                    <span className="text-[9px] text-purple-300 font-bold px-0.5">Roll:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = rotateComponent45(selectedComp, 'roll', -1);
                        onUpdateComponent3D(updated);
                        toast.info(`Rolled to ${updated.rotZ}°`);
                      }}
                      className="w-7 h-7 flex items-center justify-center hover:bg-slate-800 text-purple-300 font-medium text-[10px] rounded cursor-pointer transition-colors"
                      title="Roll -45° left around Z"
                    >
                      -45°
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = rotateComponent45(selectedComp, 'roll', 1);
                        onUpdateComponent3D(updated);
                        toast.info(`Rolled to ${updated.rotZ}°`);
                      }}
                      className="w-7 h-7 flex items-center justify-center hover:bg-slate-800 text-purple-300 font-medium text-[10px] rounded cursor-pointer transition-colors"
                      title="Roll +45° right around Z"
                    >
                      +45°
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Wire in progress helper tooltip */}
      {activeWireStart && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-amber-500/90 text-slate-950 font-mono font-bold text-xs px-3.5 py-1.5 rounded-full shadow-lg z-30 flex items-center gap-2 animate-bounce">
          <span>Routing Wire from {activeWireStart.compId} [{activeWireStart.pinId}] ➔ Click destination pin/hole (Esc to cancel)</span>
        </div>
      )}

      {/* Editing Wire Endpoint tooltip */}
      {editingWireEndpoint && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-cyan-500 text-slate-950 font-mono font-bold text-xs px-3.5 py-1.5 rounded-full shadow-lg z-30 flex items-center gap-2 animate-pulse">
          <span>Move {editingWireEndpoint.end === 'from' ? 'Start' : 'Far'} Endpoint ➔ Click any breadboard hole to connect (Esc to cancel)</span>
        </div>
      )}

      {/* MCU / Component Pin Interactive Inspection HUD Badge */}
      {hoveredPinInfo && (() => {
        const comp = components3d.find((c) => c.id === hoveredPinInfo.compId);
        const simState = simulationStates[hoveredPinInfo.compId];
        const pin = hoveredPinInfo.pinName;
        const pLower = pin.toLowerCase();

        // 1. Resolve Pin Role / Functional Name:
        let pinLabel = `Pin: ${pin}`;
        if (comp?.type === 'TIMER_555' || comp?.type === 'DIP_IC') {
          const pinNames555: Record<string, string> = {
            '1': 'Pin 1 · GND (Ground 0V)',
            '2': 'Pin 2 · TRIG (Trigger Comparator Input)',
            '3': 'Pin 3 · OUT (Square Wave Output)',
            '4': 'Pin 4 · RESET (Active-Low Hardware Reset)',
            '5': 'Pin 5 · CTRL (Control Voltage 2/3 VCC)',
            '6': 'Pin 6 · THRESH (Threshold Comparator Input)',
            '7': 'Pin 7 · DISCH (Discharge Open-Collector)',
            '8': 'Pin 8 · VCC (Supply Voltage 4.5V - 16V)',
          };
          pinLabel = pinNames555[pin] || `Pin ${pin}`;
        } else if (comp?.type.startsWith('ARDUINO') || comp?.type === 'ESP32_DEVKIT') {
          const pinRoles: Record<string, string> = {
            'D13': 'Pin D13 · SCK / Onboard Amber LED',
            'D12': 'Pin D12 · MISO (Master In Slave Out)',
            'D11': 'Pin D11 · MOSI / Hardware PWM',
            'D10': 'Pin D10 · SS (Slave Select) / PWM',
            'D9': 'Pin D9 · Hardware 8-bit Timer PWM',
            'D6': 'Pin D6 · Hardware Timer PWM',
            'D5': 'Pin D5 · Hardware Timer PWM',
            'D3': 'Pin D3 · External INT1 / PWM',
            'D2': 'Pin D2 · External INT0',
            'TX': 'Pin TX · UART Serial Transmit',
            'RX': 'Pin RX · UART Serial Receive',
            '5V': '5.0V · Regulated Logic Supply Rail',
            '3V3': '3.3V · Low-Dropout Linear Regulator',
            'GND': 'GND · Power & Logic System Ground',
            'GND_1': 'GND · Power Ground Reference',
            'GND_2': 'GND · Digital Ground Reference',
            'VIN': 'VIN · Unregulated DC Input (7-12V)',
            'RESET': 'RESET · Active-Low Microcontroller Reset',
            'A0': 'Pin A0 · 10-bit ADC Analog In 0',
            'A1': 'Pin A1 · 10-bit ADC Analog In 1',
            'A2': 'Pin A2 · 10-bit ADC Analog In 2',
            'A3': 'Pin A3 · 10-bit ADC Analog In 3',
            'A4': 'Pin A4 · Analog In 4 / I2C SDA',
            'A5': 'Pin A5 · Analog In 5 / I2C SCL',
          };
          pinLabel = pinRoles[pin] || `Pin ${pin}`;
        } else if (comp?.type === 'MODULE_BLUETOOTH_HC05' || comp?.type === 'BLUETOOTH' || comp?.type.includes('BLUETOOTH')) {
          const btRoles: Record<string, string> = {
            'STATE': 'STATE · Connection Status Output (High when paired)',
            'RXD': 'RXD · Serial UART Data Input (3.3V logic)',
            'TXD': 'TXD · Serial UART Data Output (3.3V logic)',
            'GND': 'GND · Power Ground Reference (0V)',
            'VCC': 'VCC · Power Supply Input (+3.6V to 6.0V DC)',
            'EN': 'EN / KEY · AT Command Mode Switch (High for AT commands)',
          };
          pinLabel = btRoles[pin.toUpperCase()] || `Pin ${pin}`;
        } else if (comp?.type === 'HC_SR04' || comp?.type === 'SENSOR_ULTRASONIC') {
          const sonarRoles: Record<string, string> = {
            'VCC': 'VCC · Ultrasonic Sensor Supply (+5V DC)',
            'TRIG': 'TRIG · 10µs TTL Ultrasonic Trigger Input',
            'ECHO': 'ECHO · Distance Proportional Pulse Width Output',
            'GND': 'GND · Power Ground Reference (0V)',
          };
          pinLabel = sonarRoles[pin.toUpperCase()] || `Pin ${pin}`;
        } else if (comp?.type === 'LED') {
          pinLabel = pLower.includes('a') || pLower === '1' || pLower === '+'
            ? 'Anode (+) · Positive Forward Bias Lead'
            : 'Cathode (-) · Negative Ground Lead (Flat Rim Side)';
        } else if (comp?.type === 'RESISTOR') {
          pinLabel = pin === '1' ? 'Lead 1 · Axial Terminal (-5.08mm)' : 'Lead 2 · Axial Terminal (+5.08mm)';
        } else if (comp?.type === 'CAPACITOR_ELECTROLYTIC') {
          pinLabel = pin === '+' || pin === '1'
            ? 'Positive (+) · Long Anode Terminal'
            : 'Negative (-) · Cathode Ground Terminal (Stripe Side)';
        } else if (comp?.type === 'CAPACITOR') {
          pinLabel = pin === '1' ? 'Lead 1 · Ceramic Disc Terminal' : 'Lead 2 · Ceramic Disc Terminal';
        } else if (comp?.type === 'DIODE' || comp?.type === 'DIODE_1N4007') {
          pinLabel = pin === '1' || pLower.includes('anode')
            ? 'Anode (+) · P-Type Terminal'
            : 'Cathode (-) · N-Type Silver Stripe Terminal';
        } else if (comp?.type === 'BUZZER_ACTIVE') {
          pinLabel = pin === '+' || pin === '1'
            ? 'Positive (+) · DC VCC Terminal'
            : 'Negative (-) · GND Ground Terminal';
        } else if (comp?.type === 'BATTERY_9V' || comp?.type === 'BATTERY') {
          pinLabel = pin === '+' || pLower.includes('pos') || pin === '1'
            ? '+9V · High-Potential Positive Rail Terminal'
            : '0V · System Ground (GND) Negative Terminal';
        } else if (comp?.type === 'SENSOR_LDR') {
          pinLabel = pin === '1' ? 'Lead 1 · Photocell Terminal' : 'Lead 2 · Photocell Terminal';
        } else if (comp?.type === 'PUSHBUTTON') {
          pinLabel = `Terminal ${pin} · SPST Momentary Contact`;
        }

        // 2. Resolve Breadboard Hole Placement:
        const pinPos = getPinWorld3D(hoveredPinInfo.compId, hoveredPinInfo.pinName);
        const nearestHole = findNearestHole830(pinPos.x, pinPos.z);
        const seatedHoleName = nearestHole && Math.abs(pinPos.x) <= 85 && Math.abs(pinPos.z) <= 26
          ? nearestHole.name
          : null;

        // 3. Resolve Live Electrical State (Voltage & Current):
        let liveState = isSimulating ? 'HIGH-Z / Floating' : 'Standby / Simulation Paused';
        let stateColor = 'text-slate-400';
        let bgPulse = 'bg-slate-400';

        if (pLower.includes('gnd') || pLower === '-' || pLower === 'cathode' || (pin === '1' && comp?.type === 'TIMER_555')) {
          liveState = 'LOW 0.00V (Ground Reference)';
          stateColor = 'text-cyan-400';
          bgPulse = 'bg-cyan-400';
        } else if (pLower.includes('vcc') || pLower.includes('5v') || (pin === '8' && comp?.type === 'TIMER_555') || (pLower === '+' && comp?.type?.includes('BAT'))) {
          const v = simState?.voltage && simState.voltage > 0 ? simState.voltage : 9.0;
          liveState = `HIGH ${v.toFixed(2)}V (Active Power Rail)`;
          stateColor = 'text-emerald-400';
          bgPulse = 'bg-emerald-400';
        } else if (pLower === '3v3') {
          liveState = 'HIGH 3.30V (Regulated 3V3 Rail)';
          stateColor = 'text-emerald-400';
          bgPulse = 'bg-emerald-400';
        } else if (simState && isSimulating) {
          const v = simState.voltage ?? 0;
          const i = Math.abs(simState.current ?? 0) * 1000;
          if (comp?.type === 'CAPACITOR' || comp?.type === 'CAPACITOR_ELECTROLYTIC') {
            liveState = `CHARGED ${v.toFixed(2)}V · Exponential Ramp`;
            stateColor = v >= 3.0 ? 'text-emerald-400' : 'text-amber-400';
            bgPulse = v >= 3.0 ? 'bg-emerald-400' : 'bg-amber-400';
          } else if (v > 2.0) {
            liveState = `HIGH ${v.toFixed(2)}V | ${i.toFixed(1)} mA`;
            stateColor = 'text-emerald-400';
            bgPulse = 'bg-emerald-400';
          } else if (v > 0.05) {
            liveState = `ACTIVE ${v.toFixed(2)}V | ${i.toFixed(1)} mA`;
            stateColor = 'text-amber-400';
            bgPulse = 'bg-amber-400';
          } else {
            liveState = `LOW ${v.toFixed(2)}V | 0.0 mA`;
            stateColor = 'text-slate-300';
            bgPulse = 'bg-slate-300';
          }
        }

        // Find connected wires to this exact pin
        const connectedWires = wires3d.filter(
          (w) =>
            (w.fromPin.compId === hoveredPinInfo.compId && w.fromPin.pinId === hoveredPinInfo.pinName) ||
            (w.toPin.compId === hoveredPinInfo.compId && w.toPin.pinId === hoveredPinInfo.pinName)
        );

        return (
          <div className="absolute bottom-5 left-5 bg-slate-900/98 border border-cyan-500/90 rounded-xl px-4 py-2.5 text-xs font-mono text-white pointer-events-none z-30 shadow-2xl flex flex-col gap-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 max-w-sm">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${bgPulse} animate-pulse`} />
              <span className="text-white font-bold text-xs truncate">
                {comp?.label || hoveredPinInfo.compId}
              </span>
              <span className="text-[10px] text-cyan-400 uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                {comp?.value || comp?.type}
              </span>
              {seatedHoleName && (
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                  📍 {seatedHoleName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 pt-0.5 border-t border-slate-800">
              <span className="text-amber-300 font-bold text-[11px]">{pinLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[11px] pt-0.5">
              <span className={`font-semibold ${stateColor}`}>
                ⚡ {liveState}
              </span>
              {connectedWires.length > 0 && (
                <span className="text-[10px] text-cyan-300 font-mono flex items-center gap-1">
                  <span>🔗</span> {connectedWires.length} net wire{connectedWires.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        );
      })()}

      {/* Breadboard Hole Hover Overlay */}
      {hoveredHole && !hoveredPinInfo && (
        <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-slate-700 rounded px-2.5 py-1 text-[11px] font-mono text-cyan-300 pointer-events-none z-20">
          📍 {hoveredHole.name} ({hoveredHole.tieGroup})
        </div>
      )}
    </div>
  );
}
