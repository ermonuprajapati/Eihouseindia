'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Canvas, ThreeEvent, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import {
  Trash2,
  Plus,
  X,
  Compass,
  Search,
  Cpu,
  RotateCw,
  Unplug,
  MoveLeft,
  MoveRight,
  MoveUp,
  MoveDown,
  MousePointer,
  Cable,
} from 'lucide-react';
import { toast } from 'sonner';
import { Component3D, Wire3D } from '@/modules/engineering-lab/types';
import { Breadboard3D } from './Breadboard3D';
import {
  BreadboardHole3D,
  HOLE_BY_ID,
  findNearestHole830,
  findNearestFreeHole830,
  findNearestUnoccupiedHole,
  START_X,
  PITCH_X,
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
import { Wire3DTube } from './Wire3DTube';

interface Library3DItem {
  type: string;
  label: string;
  category: 'boards' | 'passive' | 'semiconductors' | 'sensors';
  value: string;
  desc: string;
  defaultPos: [number, number, number];
  params: Record<string, number | string | boolean>;
}

const LIBRARY_3D_COMPONENTS: Library3DItem[] = [
  // Microcontrollers & Power
  {
    type: 'ARDUINO_MEGA',
    label: 'Arduino Mega 2560 R3',
    category: 'boards',
    value: 'ATmega2560',
    desc: 'High-performance MCU with 54 Digital I/O, 16 Analog Inputs, 4 UARTs, and 16MHz clock',
    defaultPos: [0, 0, 75] as [number, number, number],
    params: { mcu: 'ATmega2560', clock: '16MHz', logicVoltage: 5 },
  },
  {
    type: 'ARDUINO_UNO',
    label: 'Arduino Uno R3',
    category: 'boards',
    value: 'ATmega328P',
    desc: 'Classic dev board with ATmega328P, 16MHz, USB, and digital/analog headers',
    defaultPos: [0, 0, 65] as [number, number, number],
    params: { mcu: 'ATmega328P', clock: '16MHz', logicVoltage: 5 },
  },
  {
    type: 'ARDUINO_NANO',
    label: 'Arduino Nano V3',
    category: 'boards',
    value: 'ATmega328P',
    desc: 'Breadboard-friendly compact MCU with 30-pin DIP footprint',
    defaultPos: [0, 5, 0] as [number, number, number],
    params: { mcu: 'ATmega328P', clock: '16MHz', logicVoltage: 5 },
  },
  {
    type: 'ESP32_DEVKIT',
    label: 'ESP32 DevKit V1',
    category: 'boards',
    value: 'ESP32-WROOM-32',
    desc: 'Dual-core 240MHz Wi-Fi & Bluetooth microcontroller with 30-pin header',
    defaultPos: [0, 0, -65] as [number, number, number],
    params: { mcu: 'ESP32', clock: '240MHz', logicVoltage: 3.3 },
  },
  {
    type: 'RASPBERRY_PI_PICO',
    label: 'Raspberry Pi Pico (RP2040)',
    category: 'boards',
    value: 'RP2040',
    desc: 'Dual ARM Cortex-M0+ 133MHz microcontroller with 40-pin breadboard-friendly layout',
    defaultPos: [0, 5, -50] as [number, number, number],
    params: { mcu: 'RP2040', clock: '133MHz', logicVoltage: 3.3 },
  },
  {
    type: 'BATTERY_9V',
    label: '9V Alkaline Battery',
    category: 'boards',
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
    value: '1kΩ',
    desc: 'Axial ceramic body with 4-band EIA color coding and bent wire leads',
    defaultPos: [10, 5, -3.34] as [number, number, number],
    params: { resistance: 1000, powerRating: 0.25 },
  },
  {
    type: 'POTENTIOMETER',
    label: 'Rotary Potentiometer 10k',
    category: 'passive',
    value: '10kΩ',
    desc: '3-pin breadboard-mountable trimmer with rotating control dial',
    defaultPos: [-30, 5, -3.34] as [number, number, number],
    params: { totalResistance: 10000, wiperPosition: 0.5 },
  },
  {
    type: 'CAPACITOR',
    label: 'Ceramic Disc Capacitor',
    category: 'passive',
    value: '100nF',
    desc: '100nF (0.1µF) decoupling ceramic disc capacitor (Code 104)',
    defaultPos: [25, 5, -3.34] as [number, number, number],
    params: { capacitance: 1e-7, maxVoltage: 50 },
  },
  {
    type: 'CAPACITOR_ELECTROLYTIC',
    label: 'Electrolytic Capacitor 10µF',
    category: 'passive',
    value: '10µF',
    desc: 'Radial aluminum electrolytic can with white negative polarity stripe',
    defaultPos: [35, 5, -3.34] as [number, number, number],
    params: { capacitance: 1e-5, maxVoltage: 25 },
  },
  {
    type: 'PUSHBUTTON',
    label: 'Tactile Pushbutton 6mm',
    category: 'passive',
    value: 'NO',
    desc: '4-pin SPST momentary tactile switch straddling breadboard center',
    defaultPos: [-15, 5, 0] as [number, number, number],
    params: { switchState: false },
  },

  // Semiconductors & ICs
  {
    type: 'LED',
    label: '5mm LED (Diffused Red)',
    category: 'semiconductors',
    value: 'Red',
    desc: '5mm diffused domed lens with live brightness and color emission',
    defaultPos: [0, 5, -3.34] as [number, number, number],
    params: { color: '#EF4444', forwardVoltage: 2.0, forwardCurrent: 0.02 },
  },
  {
    type: 'LED_RGB',
    label: 'RGB LED (Common Cathode)',
    category: 'semiconductors',
    value: 'RGB',
    desc: '4-lead RGB through-hole LED with independent Red, Green, Blue control',
    defaultPos: [50, 5, -3.34] as [number, number, number],
    params: { color: 'RGB', type: 'common_cathode' },
  },
  {
    type: 'TIMER_555',
    label: 'NE555 Timer IC (DIP-8)',
    category: 'semiconductors',
    value: 'NE555',
    desc: 'Classic 8-pin precision bipolar timer IC for astable & monostable pulses',
    defaultPos: [-45, 5, 0] as [number, number, number],
    params: { ic: 'NE555', supplyMin: 4.5, supplyMax: 16 },
  },

  // Sensors & Actuators
  {
    type: 'HC_SR04',
    label: 'HC-SR04 Ultrasonic Sonar',
    category: 'sensors',
    value: '2-400cm',
    desc: 'Distance sensor with Transmitter & Receiver transducers and 4-pin header',
    defaultPos: [95, 0, 0] as [number, number, number],
    params: { minRangeCm: 2, maxRangeCm: 400 },
  },
  {
    type: 'SERVO_SG90',
    label: 'SG90 Micro Servo 9g',
    category: 'sensors',
    value: '180°',
    desc: 'Miniature 9-gram servo motor with geared rotating horn and 3-pin cable',
    defaultPos: [95, 0, -45] as [number, number, number],
    params: { minAngle: 0, maxAngle: 180, currentAngle: 90 },
  },
  {
    type: 'LCD_1602',
    label: 'LCD 16x2 Character Display',
    category: 'sensors',
    value: '16x2 HD44780',
    desc: '16-character by 2-line alphanumeric LCD module with LED backlight',
    defaultPos: [0, 0, -100] as [number, number, number],
    params: { rows: 2, cols: 16, controller: 'HD44780' },
  },
  {
    type: 'BUZZER_ACTIVE',
    label: 'Active Piezo Buzzer 5V',
    category: 'sensors',
    value: '5V Piezo',
    desc: 'Continuous tone piezo sound transducer with top acoustic aperture',
    defaultPos: [-60, 5, -3.34] as [number, number, number],
    params: { frequencyHz: 2300, ratedVoltage: 5 },
  },
  {
    type: 'DIODE',
    label: '1N4007 Rectifier Diode',
    category: 'semiconductors',
    value: '1000V 1A',
    desc: 'Standard silicon rectifier diode in DO-41 package with cathode band',
    defaultPos: [15, 5, 8.42] as [number, number, number],
    params: { forwardV: 0.7, maxCurrent: 1.0 },
  },
  {
    type: 'SENSOR_LDR',
    label: 'Photoresistor (LDR GL5528)',
    category: 'sensors',
    value: '10k-1MΩ',
    desc: 'Light-dependent resistor with serpentine cadmium-sulfide photoconductive track',
    defaultPos: [-20, 5, 8.42] as [number, number, number],
    params: { darkResistance: 1000000, lightResistance: 10000 },
  },
  {
    type: 'SLIDE_SWITCH',
    label: 'Mini Slide Switch (SPDT)',
    category: 'passive',
    value: 'SPDT',
    desc: '3-pin breadboard-friendly slide switch for DC power and signal routing',
    defaultPos: [-5, 5, 8.42] as [number, number, number],
    params: { closed: false },
  },
];

interface DragFrameControllerProps {
  draggingCompId: string | null;
  components3d: Component3D[];
  occupiedHoleIds: Set<string>;
  hasBreadboard: boolean;
  onUpdateComponent3D: (comp: Component3D) => void;
}

function DragFrameController({
  draggingCompId,
  components3d,
  occupiedHoleIds,
  hasBreadboard,
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
      ].includes(comp.type) || comp.type.includes('DIP') || comp.type.includes('555') || comp.type.includes('328');

      const isThroughHole = isDipPackage || [
        'RESISTOR',
        'LED',
        'LED_RGB',
        'CAPACITOR',
        'CAPACITOR_ELECTROLYTIC',
        'DIODE',
        'SENSOR_LDR',
        'PUSHBUTTON',
      ].includes(comp.type);

      if (hasBreadboard && isDipPackage && Math.abs(targetX) <= 80 && Math.abs(targetZ) <= 22) {
        // Automatic IC Snapping straddling center DIP notch (top pins in Row E, bottom pins in Row F)
        // For even-pin DIP packages (like DIP-8), offset by 0.5 pitch so pins land centered on integer columns
        const isEvenDip = comp.type === 'TIMER_555' || comp.type === 'DIP_IC';
        if (isEvenDip) {
          const nearestCol = Math.max(2, Math.min(61, Math.round((targetX - START_X) / PITCH_X - 0.5) + 1));
          targetX = START_X + (nearestCol - 0.5) * PITCH_X;
        } else {
          const nearestCol = Math.max(2, Math.min(62, Math.round((targetX - START_X) / PITCH_X) + 1));
          targetX = START_X + (nearestCol - 1) * PITCH_X;
        }
        targetZ = 0;   // Straddle center DIP ravine
        targetY = 8.5; // Resting flush on breadboard
      } else if (hasBreadboard && isThroughHole && Math.abs(targetX) <= 85 && Math.abs(targetZ) <= 30) {
        const freeHole = findNearestFreeHole830(targetX, targetZ, occupiedHoleIds);
        if (freeHole) {
          targetX = freeHole.x;
          targetZ = freeHole.z;
          targetY = 8.5; // Breadboard surface elevation
        }
      } else {
        targetX = Math.round(targetX / 2.54) * 2.54;
        targetZ = Math.round(targetZ / 2.54) * 2.54;
        if (!isThroughHole) {
          targetY = 0; // Table surface elevation
        }
      }

      targetX = Math.round(targetX * 100) / 100;
      targetY = Math.round(targetY * 100) / 100;
      targetZ = Math.round(targetZ * 100) / 100;

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
    return () => {
      scene.traverse((obj) => {
        const mesh = obj as unknown as {
          geometry?: { dispose: () => void };
          material?: { dispose: () => void } | { dispose: () => void }[];
        };
        if (mesh.geometry) {
          try {
            mesh.geometry.dispose();
          } catch {}
        }
        if (mesh.material) {
          try {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else {
              mesh.material.dispose();
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
}

export function Studio3DCanvas({
  hasBreadboard = true,
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
  isSimulating = false,
  simulationStates = {},
  wireCurrents = {},
}: Studio3DCanvasProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [libSearch, setLibSearch] = useState('');
  const [libCategory, setLibCategory] = useState<'all' | 'boards' | 'passive' | 'semiconductors' | 'sensors'>('all');
  const [toolMode3D, setToolMode3D] = useState<'inspect' | 'wire'>('inspect');
  const [editingWireEndpoint, setEditingWireEndpoint] = useState<{ wireId: string; end: 'from' | 'to' } | null>(null);
  const [activeWireStart, setActiveWireStart] = useState<{
    compId: string;
    pinId: string;
    pos: THREE.Vector3;
  } | null>(null);
  const [activeWireColor, setActiveWireColor] = useState('#EF4444');
  const [hoveredHole, setHoveredHole] = useState<BreadboardHole3D | null>(null);
  const [hoveredPinInfo, setHoveredPinInfo] = useState<{ compId: string; pinName: string } | null>(null);
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
      parameters: { ...comp.parameters, usbPlugged: nextState },
    };
    onUpdateComponent3D(updated);
    toast.success(
      nextState
        ? `🔌 Connected USB Power to ${comp.label} (5.0V Active)`
        : `⚡ Unplugged USB Cable from ${comp.label}`
    );
  }, [components3d, onToggleMcuUsb, onUpdateComponent3D]);

  const filteredLibrary = useMemo(() => {
    return LIBRARY_3D_COMPONENTS.filter((item) => {
      const matchCat = libCategory === 'all' || item.category === libCategory;
      const matchSearch =
        !libSearch ||
        item.label.toLowerCase().includes(libSearch.toLowerCase()) ||
        item.type.toLowerCase().includes(libSearch.toLowerCase()) ||
        item.desc.toLowerCase().includes(libSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [libCategory, libSearch]);

  // Keyboard shortcut listener (R to rotate, Arrows to nudge, Delete to remove, Esc to cancel wire)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'r' || e.key === 'R') {
        if (selectedCompId) {
          const comp = components3d.find((c) => c.id === selectedCompId);
          if (comp) {
            e.preventDefault();
            onUpdateComponent3D({
              ...comp,
              rotY: ((comp.rotY || 0) + 90) % 360,
            });
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
      } else if (e.key === 'Escape') {
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
  }, [selectedCompId, selectedWireId, components3d, onUpdateComponent3D, onDeleteWire3D, onDeleteComponent3D, onSelectWire, onSelectComponent]);

  // Camera presets
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

  // Helper to compute world position for any pin
  const getPinWorld3D = useCallback((compId: string, pinId: string): THREE.Vector3 => {
    if (compId === 'breadboard') {
      const hole = HOLE_BY_ID.get(pinId);
      if (hole) return new THREE.Vector3(hole.x, hole.y + 0.5, hole.z);
      return new THREE.Vector3(0, 0, 0);
    }

    const comp = components3d.find((c) => c.id === compId);
    if (!comp) return new THREE.Vector3(0, 0, 0);

    const rad = ((comp.rotY || 0) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

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
    } else if (comp.type === 'LED_RGB') {
      if (pinId === 'R' || pinId === '1') lx = -3.81;
      else if (pinId === 'C' || pinId === 'GND' || pinId === '2') lx = -1.27;
      else if (pinId === 'G' || pinId === '3') lx = 1.27;
      else lx = 3.81;
      ly = 0;
      lz = 0;
    } else if (comp.type === 'BUZZER_ACTIVE') {
      if (pinId === '+' || pinId === '1') lx = -2.54;
      else lx = 2.54;
      ly = 0;
      lz = 0;
    } else if (comp.type === 'DIODE' || comp.type === 'DIODE_1N4007') {
      if (pinId === '1' || pinId === 'anode') lx = -5.08;
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
    } else if (comp.type === 'TIMER_555' || comp.type === 'DIP_IC') {
      const pNum = parseInt(pinId) || 1;
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
      ly = -4;
    } else if (comp.type === 'HC_SR04') {
      if (pinId === 'VCC') lx = -3.81;
      else if (pinId === 'TRIG') lx = -1.27;
      else if (pinId === 'ECHO') lx = 1.27;
      else lx = 3.81;
      ly = -8;
    } else if (comp.type === 'SERVO_SG90') {
      if (pinId === 'GND') lx = -16.0;
      else if (pinId === 'VCC') lx = -16.0;
      else lx = -16.0;
      ly = 5;
      lz = pinId === 'GND' ? -2.54 : pinId === 'VCC' ? 0 : 2.54;
    } else if (comp.type === 'LCD_1602') {
      const pIdx = parseInt(pinId.replace(/\D/g, '')) || 1;
      lx = -25.0 + (-19.05 + (pIdx - 1) * 2.54);
      ly = 34.0;
      lz = 0;
    }

    const rx = lx * cos - lz * sin;
    const rz = lx * sin + lz * cos;

    return new THREE.Vector3(comp.x3d + rx, comp.y3d + ly, comp.z3d + rz);
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

    // In Inspect mode: Clicking a component pin or body selects the component, does not draw wires
    if (toolMode3D !== 'wire' && !activeWireStart) {
      if (compId !== 'breadboard') {
        onSelectComponent(compId);
        onSelectWire(null);
      }
      return;
    }

    // In Wire mode:
    if (!activeWireStart) {
      setActiveWireStart({ compId, pinId, pos: worldPos });
    } else {
      // Prevent connecting to self pin
      if (activeWireStart.compId === compId && activeWireStart.pinId === pinId) {
        setActiveWireStart(null);
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
    }
  };

  const selectedWire = wires3d.find((w) => w.id === selectedWireId);
  const selectedComp = components3d.find((c) => c.id === selectedCompId);

  return (
    <div
      className="relative w-full h-full bg-[#050B14] select-none overflow-hidden touch-none"
      onContextMenu={(e) => {
        e.preventDefault();
        if (activeWireStart) setActiveWireStart(null);
      }}
    >
      {/* 3D WebGL Canvas */}
      <Canvas
        id="virtual-3d-webgl-canvas"
        shadows
        gl={{ preserveDrawingBuffer: true, logarithmicDepthBuffer: true }}
        camera={{ position: [0, 130, 150], fov: 45, near: 0.5, far: 500 }}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
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
          enableRotate={true}
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
          onUpdateComponent3D={onUpdateComponent3D}
        />

        {/* 830-Point Solderless Breadboard */}
        {hasBreadboard && (
          <Breadboard3D
            position={[0, 0, 0]}
            hoveredHole={hoveredHole}
            onHoverHole={setHoveredHole}
            onHoleClick={(hole, wPos) => {
              handlePinClick('breadboard', hole.id, wPos);
            }}
          />
        )}

        {/* 3D Components */}
        {components3d.map((comp) => {
          const isSelected = selectedCompId === comp.id;
          const pos: [number, number, number] = [comp.x3d, comp.y3d, comp.z3d];
          const rot: [number, number, number] = [0, ((comp.rotY || 0) * Math.PI) / 180, 0];
          const simState = simulationStates[comp.id];

          const handleCompPointerDown = (e: ThreeEvent<PointerEvent>) => {
            if (e.button !== 0) return;
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
                {[-2.54, 0, 2.54].map((px, i) => (
                  <mesh
                    key={i}
                    position={[px, -1.5, i === 1 ? 2.54 : 0]}
                    onClick={(e) => {
                      e.stopPropagation();
                      const pinId = i === 0 ? '1' : i === 1 ? '2' : '3';
                      const pPos = getPinWorld3D(comp.id, pinId);
                      handlePinClick(comp.id, pinId, pPos);
                    }}
                  >
                    <cylinderGeometry args={[0.35, 0.35, 4.0, 8]} />
                    <meshStandardMaterial color="#CBD5E1" metalness={0.9} />
                  </mesh>
                ))}
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
                {/* 1. Positive Anode Lead (+) at x = -2.54, extending down to y = -5.5mm */}
                <mesh position={[-1.77, 1.0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.38, 0.38, 1.54, 12]} />
                  <meshStandardMaterial color={isBurned ? '#71717A' : '#CBD5E1'} metalness={isBurned ? 0.4 : 0.9} />
                </mesh>
                <mesh position={[-2.54, -2.0, 0]}>
                  <cylinderGeometry args={[0.38, 0.38, 6.4, 12]} />
                  <meshStandardMaterial color={isBurned ? '#71717A' : '#CBD5E1'} metalness={isBurned ? 0.4 : 0.9} />
                </mesh>

                {/* 2. Negative Cathode Lead (-) at x = 2.54, extending down to y = -4.5mm */}
                <mesh position={[1.77, 1.0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.38, 0.38, 1.54, 12]} />
                  <meshStandardMaterial color={isBurned ? '#71717A' : '#CBD5E1'} metalness={isBurned ? 0.4 : 0.9} />
                </mesh>
                <mesh position={[2.54, -1.6, 0]}>
                  <cylinderGeometry args={[0.38, 0.38, 5.6, 12]} />
                  <meshStandardMaterial color={isBurned ? '#71717A' : '#CBD5E1'} metalness={isBurned ? 0.4 : 0.9} />
                </mesh>

                {/* Interactive Click & Hover Terminals at Breadboard Surface (y = 0) */}
                {[-2.54, 2.54].map((px, i) => {
                  const pinId = i === 0 ? '+' : '-';
                  const isHovered = hoveredPinInfo?.compId === comp.id && hoveredPinInfo?.pinName === pinId;
                  return (
                    <mesh
                      key={pinId}
                      position={[px, 0, 0]}
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
                      <cylinderGeometry args={[isHovered ? 0.55 : 0.4, 0.4, 1.2, 12]} />
                      <meshBasicMaterial color={isHovered ? (i === 0 ? '#10B981' : '#38BDF8') : (isBurned ? '#71717A' : '#CBD5E1')} />
                    </mesh>
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

                {/* Tan Ceramic Disc Body (Charred dark if burned) */}
                <mesh position={[0, 4.5, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[3.0, 3.0, 1.2, 24]} />
                  <meshStandardMaterial color={isBurned ? '#18181B' : (isSelected ? '#38BDF8' : '#D97706')} roughness={isBurned ? 0.95 : 0.6} />
                </mesh>

                {/* Ceramic Disc Lead Stems and Legs Firmly Seated Into Breadboard Holes (radius 0.38mm) */}
                {/* Pin 1 at x = -2.54 */}
                <mesh position={[-1.67, 2.0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.38, 0.38, 1.74, 12]} />
                  <meshStandardMaterial color={isBurned ? '#71717A' : '#CBD5E1'} metalness={isBurned ? 0.4 : 0.9} />
                </mesh>
                <mesh position={[-2.54, -1.5, 0]}>
                  <cylinderGeometry args={[0.38, 0.38, 7.2, 12]} />
                  <meshStandardMaterial color={isBurned ? '#71717A' : '#CBD5E1'} metalness={isBurned ? 0.4 : 0.9} />
                </mesh>

                {/* Pin 2 at x = 2.54 */}
                <mesh position={[1.67, 2.0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.38, 0.38, 1.74, 12]} />
                  <meshStandardMaterial color={isBurned ? '#71717A' : '#CBD5E1'} metalness={isBurned ? 0.4 : 0.9} />
                </mesh>
                <mesh position={[2.54, -1.5, 0]}>
                  <cylinderGeometry args={[0.38, 0.38, 7.2, 12]} />
                  <meshStandardMaterial color={isBurned ? '#71717A' : '#CBD5E1'} metalness={isBurned ? 0.4 : 0.9} />
                </mesh>

                {/* Interactive Click & Hover Terminals at Breadboard Surface (y = 0) */}
                {[-2.54, 2.54].map((px, i) => {
                  const pinId = i === 0 ? '1' : '2';
                  const isHovered = hoveredPinInfo?.compId === comp.id && hoveredPinInfo?.pinName === pinId;
                  return (
                    <mesh
                      key={pinId}
                      position={[px, 0, 0]}
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
                      <cylinderGeometry args={[isHovered ? 0.55 : 0.4, 0.4, 1.2, 12]} />
                      <meshBasicMaterial color={isHovered ? '#38BDF8' : (isBurned ? '#71717A' : '#CBD5E1')} />
                    </mesh>
                  );
                })}
              </group>
            );
          }

          if (comp.type === 'TIMER_555' || comp.type === 'DIP_IC') {
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
                  pinCount={8}
                  partName={String(comp.parameters?.ic || comp.value || 'NE555P')}
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

          if (comp.type === 'HC_SR04') {
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
                {/* Blue PCB */}
                <mesh position={[0, 8.0, 0]}>
                  <boxGeometry args={[45.0, 20.0, 1.6]} />
                  <meshStandardMaterial color={isSelected ? '#38BDF8' : '#0284C7'} roughness={0.4} />
                </mesh>
                {/* Ultrasonic Transducers T and R */}
                <mesh position={[-12.0, 10.0, 6.0]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[7.5, 7.5, 12.0, 24]} />
                  <meshStandardMaterial color="#CBD5E1" metalness={0.9} roughness={0.2} />
                </mesh>
                <mesh position={[12.0, 10.0, 6.0]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[7.5, 7.5, 12.0, 24]} />
                  <meshStandardMaterial color="#CBD5E1" metalness={0.9} roughness={0.2} />
                </mesh>
                {/* 4 Header Pins: VCC, TRIG, ECHO, GND */}
                {['VCC', 'TRIG', 'ECHO', 'GND'].map((pinName, i) => (
                  <mesh
                    key={pinName}
                    position={[-3.81 + i * 2.54, -1.0, 0]}
                    onClick={(e) => {
                      e.stopPropagation();
                      const pPos = getPinWorld3D(comp.id, pinName);
                      handlePinClick(comp.id, pinName, pPos);
                    }}
                  >
                    <cylinderGeometry args={[0.35, 0.35, 3.5, 8]} />
                    <meshStandardMaterial color="#EAB308" metalness={0.9} />
                  </mesh>
                ))}
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

          if (comp.type === 'SERVO_SG90') {
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

          if (comp.type === 'LCD_1602') {
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

          if (comp.type === 'LED_RGB') {
            const isPowered = Boolean(simState?.on || isSimulating);
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
                <RgbLed3D
                  position={pos}
                  rotation={rot}
                  isSelected={isSelected}
                  isPowered={isPowered}
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

          if (comp.type === 'BUZZER_ACTIVE') {
            const isBurned = Boolean(simState?.status === 'BURNED' || simState?.burned);
            const isSounding = !isBurned && Boolean(simState?.on || (simState?.current && Math.abs(simState.current) > 0.001));
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

          return null;
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
              onClick={(id) => {
                onSelectWire(id);
                onSelectComponent(null);
              }}
            />
          );
        })}
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

        <button
          onClick={() => setCameraView('iso')}
          className="px-2 py-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded text-xs font-mono flex items-center gap-1 cursor-pointer"
          title="Isometric View"
        >
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>Iso</span>
        </button>
        <button
          onClick={() => setCameraView('top')}
          className="px-2 py-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded text-xs font-mono cursor-pointer"
          title="Top Down View"
        >
          Top
        </button>
        <button
          onClick={() => setCameraView('front')}
          className="px-2 py-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded text-xs font-mono cursor-pointer hidden sm:inline"
          title="Front View"
        >
          Front
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

          {/* Category Filter Pills Matching Schematic Categories */}
          <div className="flex flex-wrap gap-1 text-[10px]">
            {[
              { id: 'all', label: 'All' },
              { id: 'boards', label: 'MCUs & Power' },
              { id: 'passive', label: 'Passives' },
              { id: 'semiconductors', label: 'Active & ICs' },
              { id: 'sensors', label: 'Sensors' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLibCategory(tab.id as typeof libCategory)}
                className={`px-2 py-0.5 rounded-full transition-colors ${
                  libCategory === tab.id
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 2-Column Compact Component-Type Grid with Click-to-Place */}
          <div className="max-h-80 overflow-y-auto grid grid-cols-2 gap-2 pr-1">
            {filteredLibrary.map((item) => (
              <button
                key={item.type}
                onClick={() => {
                  const countOfType = components3d.filter((c) => c.type === item.type).length;
                  const offsetX = countOfType > 0 ? (countOfType % 2 === 1 ? countOfType * 35 : -countOfType * 35) : 0;
                  const offsetZ = countOfType > 0 ? countOfType * 15 : 0;
                  const newComp: Component3D = {
                    id: `comp3d_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                    type: item.type,
                    label: countOfType > 0 ? `${item.label} #${countOfType + 1}` : item.label,
                    value: item.value,
                    parameters: item.params ? { ...item.params } : {},
                    x3d: item.defaultPos[0] + offsetX,
                    y3d: item.defaultPos[1],
                    z3d: item.defaultPos[2] + offsetZ,
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
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-950 text-cyan-400 font-mono">
                      {item.value}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-200 group-hover:text-cyan-300 text-[11px] leading-tight">
                    {item.label}
                  </div>
                </div>
                <div className="text-[9px] text-slate-400 mt-1 line-clamp-1">
                  {item.desc}
                </div>
              </button>
            ))}
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

      {/* Floating Component Action Bar when a component is selected */}
      {selectedComp && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-cyan-500/80 rounded-xl px-4 py-2.5 shadow-2xl z-30 font-mono text-xs flex items-center gap-3 text-slate-200 backdrop-blur animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold uppercase text-[10px]">Part:</span>
            <span className="text-white font-semibold">{selectedComp.label}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">
              {selectedComp.value || selectedComp.type}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Rotate 90 deg */}
          <button
            onClick={() => {
              onUpdateComponent3D({
                ...selectedComp,
                rotY: ((selectedComp.rotY || 0) + 90) % 360,
              });
            }}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer transition-colors"
            title="Rotate 90° Clockwise [R]"
          >
            <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Rotate [R]</span>
          </button>

          {/* Position Nudge Controls (2.54mm breadboard pitch) */}
          <div className="flex items-center gap-1 bg-slate-800/80 px-1 py-0.5 rounded border border-slate-700/60" title="Nudge component on workbench [Arrow Keys]">
            <span className="text-[10px] text-slate-400 font-bold px-0.5">Nudge:</span>
            <button
              onClick={() => {
                onUpdateComponent3D({
                  ...selectedComp,
                  x3d: Math.round((selectedComp.x3d - 2.54) * 100) / 100,
                });
              }}
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded cursor-pointer transition-colors"
              title="Nudge Left -2.54mm [Left Arrow]"
            >
              <MoveLeft className="w-3 h-3 text-cyan-400" />
            </button>
            <button
              onClick={() => {
                onUpdateComponent3D({
                  ...selectedComp,
                  x3d: Math.round((selectedComp.x3d + 2.54) * 100) / 100,
                });
              }}
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded cursor-pointer transition-colors"
              title="Nudge Right +2.54mm [Right Arrow]"
            >
              <MoveRight className="w-3 h-3 text-cyan-400" />
            </button>
            <button
              onClick={() => {
                onUpdateComponent3D({
                  ...selectedComp,
                  z3d: Math.round((selectedComp.z3d - 2.54) * 100) / 100,
                });
              }}
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded cursor-pointer transition-colors"
              title="Nudge Forward -2.54mm [Up Arrow]"
            >
              <MoveUp className="w-3 h-3 text-cyan-400" />
            </button>
            <button
              onClick={() => {
                onUpdateComponent3D({
                  ...selectedComp,
                  z3d: Math.round((selectedComp.z3d + 2.54) * 100) / 100,
                });
              }}
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded cursor-pointer transition-colors"
              title="Nudge Backward +2.54mm [Down Arrow]"
            >
              <MoveDown className="w-3 h-3 text-cyan-400" />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Delete Component Button */}
          <button
            onClick={() => {
              onDeleteComponent3D(selectedComp.id);
              onSelectComponent(null);
            }}
            className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-950/80 border border-rose-800/60 font-semibold cursor-pointer transition-colors"
            title="Delete this component and attached wires [Delete]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete [Del]</span>
          </button>
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
