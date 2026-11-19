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
import { BreadboardHole3D, HOLE_BY_ID, findNearestHole830, findNearestFreeHole830 } from './breadboard-topology';
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

      const isThroughHole = [
        'RESISTOR',
        'LED',
        'LED_RGB',
        'CAPACITOR',
        'CAPACITOR_ELECTROLYTIC',
        'TIMER_555',
        'DIP_IC',
        'DIODE',
        'SENSOR_LDR',
        'PUSHBUTTON',
        'ARDUINO_NANO',
        'ESP32_DEVKIT',
        'RASPBERRY_PI_PICO',
      ].includes(comp.type);

      if (hasBreadboard && isThroughHole && Math.abs(targetX) <= 85 && Math.abs(targetZ) <= 30) {
        const freeHole = findNearestFreeHole830(targetX, targetZ, occupiedHoleIds);
        if (freeHole) {
          targetX = freeHole.x;
          targetZ = freeHole.z;
          targetY = 5.0; // Breadboard surface elevation
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
  simulationStates?: Record<string, { voltage: number; current: number; on?: boolean }>;
}

export function Studio3DCanvas({
  hasBreadboard = true,
  onToggleBreadboard: _onToggleBreadboard,
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

  // Compute occupied breadboard hole IDs for collision-free snapping (1 hole = 1 pin)
  const occupiedHoleIds = useMemo(() => {
    const set = new Set<string>();
    wires3d.forEach((w) => {
      if (w.fromPin.compId === 'breadboard') set.add(w.fromPin.pinId);
      if (w.toPin.compId === 'breadboard') set.add(w.toPin.pinId);
    });
    components3d.forEach((c) => {
      if (c.id !== draggingCompId && Math.abs(c.x3d) <= 85 && Math.abs(c.z3d) <= 30 && c.y3d >= 4.0) {
        const nearest = findNearestHole830(c.x3d, c.z3d);
        if (nearest) set.add(nearest.id);
      }
    });
    return set;
  }, [wires3d, components3d, draggingCompId]);

  // Window pointerup listener guarantees OrbitControls are always re-enabled after drag
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (draggingCompRef.current) {
        draggingCompRef.current = null;
        setDraggingCompId(null);
        if (controlsRef.current) controlsRef.current.enabled = true;
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, []);

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
      if (p === 'anode' || p === 'a' || p === '1' || p === '+') lx = -1.27;
      else lx = 1.27;
      ly = -5;
    } else if (comp.type === 'LED_RGB') {
      if (pinId === 'R' || pinId === '1') lx = -3.81;
      else if (pinId === 'C' || pinId === 'GND' || pinId === '2') lx = -1.27;
      else if (pinId === 'G' || pinId === '3') lx = 1.27;
      else lx = 3.81;
      ly = -3.8;
    } else if (comp.type === 'BUZZER_ACTIVE') {
      if (pinId === '+' || pinId === '1') lx = -2.54;
      else lx = 2.54;
      ly = -3.8;
    } else if (comp.type === 'DIODE' || comp.type === 'DIODE_1N4007') {
      if (pinId === '1' || pinId === 'anode') lx = -5.08;
      else lx = 5.08;
      ly = -1.0;
    } else if (comp.type === 'SENSOR_LDR') {
      if (pinId === '1') lx = -2.54;
      else lx = 2.54;
      ly = -1.0;
    } else if (comp.type === 'SLIDE_SWITCH') {
      if (pinId === '1') lx = -2.54;
      else if (pinId === '2') lx = 0;
      else lx = 2.54;
      ly = -1.0;
    } else if (comp.type === 'RESISTOR') {
      if (pinId === '1') lx = -5.08;
      else lx = 5.08;
      ly = -5;
    } else if (comp.type === 'POTENTIOMETER') {
      if (pinId === '1') { lx = -2.54; lz = 0; }
      else if (pinId === '2' || pinId === 'wiper') { lx = 0; lz = 2.54; }
      else { lx = 2.54; lz = 0; }
      ly = -4;
    } else if (comp.type === 'CAPACITOR' || comp.type === 'CAPACITOR_ELECTROLYTIC') {
      if (pinId === '1' || pinId === '+') lx = -1.27;
      else lx = 1.27;
      ly = -5;
    } else if (comp.type === 'TIMER_555' || comp.type === 'DIP_IC') {
      const pNum = parseInt(pinId) || 1;
      if (pNum >= 1 && pNum <= 4) {
        lx = -3.81 + (pNum - 1) * 2.54;
        lz = -3.34;
      } else {
        lx = 3.81 - (pNum - 5) * 2.54;
        lz = 3.34;
      }
      ly = -3;
    } else if (comp.type === 'BATTERY_9V' || comp.type === 'BATTERY') {
      const p = (pinId || '').toLowerCase();
      if (p === '+' || p === 'p' || p === 'pos' || p === '1') lx = -6.5;
      else lx = 6.5;
      ly = 27;
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
      // Start wire - detect power/ground pin
      const p = pinId.toLowerCase();
      if (p.includes('gnd') || p === '-' || p === 'cathode') {
        setActiveWireColor('#1E293B'); // Black
      } else if (p.includes('vcc') || p.includes('5v') || p.includes('3v3') || p.includes('vin') || p === '+' || p === 'anode' || p === 'raw') {
        setActiveWireColor('#EF4444'); // Red
      }
      setActiveWireStart({ compId, pinId, pos: worldPos });
    } else {
      // Prevent connecting to self pin
      if (activeWireStart.compId === compId && activeWireStart.pinId === pinId) {
        setActiveWireStart(null);
        return;
      }

      // Check pin polarity for auto-coloring
      let wireColor = activeWireColor;
      const sp = activeWireStart.pinId.toLowerCase();
      const ep = pinId.toLowerCase();
      if (sp.includes('gnd') || ep.includes('gnd') || sp === '-' || ep === '-') {
        wireColor = '#1E293B';
      } else if (
        sp.includes('vcc') || ep.includes('vcc') ||
        sp.includes('5v') || ep.includes('5v') ||
        sp.includes('3v3') || ep.includes('3v3') ||
        sp.includes('vin') || ep.includes('vin') ||
        sp === '+' || ep === '+'
      ) {
        wireColor = '#EF4444';
      }

      // Complete wire connection
      const newWire: Wire3D = {
        id: `wire3d_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        fromPin: { compId: activeWireStart.compId, pinId: activeWireStart.pinId },
        toPin: { compId, pinId },
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
      className="relative w-full h-full bg-[#050B14] select-none overflow-hidden"
      onContextMenu={(e) => {
        e.preventDefault();
        if (activeWireStart) setActiveWireStart(null);
      }}
    >
      {/* 3D WebGL Canvas */}
      <Canvas
        shadows
        camera={{ position: [0, 130, 150], fov: 45, near: 0.1, far: 2000 }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onContextMenu={(e) => {
          e.preventDefault();
          if (activeWireStart) {
            setActiveWireStart(null);
          }
        }}
      >
        <color attach="background" args={['#070E1A']} />

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

        {/* Workbench Grid Plane */}
        <Grid
          infiniteGrid
          position={[0, -0.05, 0]}
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
          enablePan={true}
          screenSpacePanning={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2 - 0.02}
          minDistance={15}
          maxDistance={500}
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
            if (controlsRef.current) controlsRef.current.enabled = false;
            draggingCompRef.current = { id: comp.id, startPos: [comp.x3d, comp.y3d, comp.z3d] };
            setDraggingCompId(comp.id);
          };

          if (comp.type === 'ARDUINO_MEGA') {
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
                <ArduinoMega3D
                  position={pos}
                  rotation={rot}
                  isSelected={isSelected}
                  isUsbPlugged={comp.parameters?.usbPlugged !== false}
                  isDcJackPlugged={comp.parameters?.dcJackPlugged === true}
                  onToggleUsb={() => toggleUsb(comp.id)}
                  isPowered={comp.parameters?.usbPlugged !== false || comp.parameters?.dcJackPlugged === true}
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
                <ArduinoUno3D
                  position={pos}
                  rotation={rot}
                  isSelected={isSelected}
                  isUsbPlugged={comp.parameters?.usbPlugged !== false}
                  isDcJackPlugged={comp.parameters?.dcJackPlugged === true}
                  onToggleUsb={() => toggleUsb(comp.id)}
                  isPowered={comp.parameters?.usbPlugged !== false || comp.parameters?.dcJackPlugged === true}
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
            const isPowered = Boolean(isSimulating && (simState?.on || (simState?.current && Math.abs(simState.current) > 0.001)));
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
                {/* Blue can body */}
                <mesh position={[0, 5.0, 0]}>
                  <cylinderGeometry args={[3.2, 3.2, 8.5, 24]} />
                  <meshStandardMaterial color={isSelected ? '#38BDF8' : '#1E3A8A'} roughness={0.3} />
                </mesh>
                {/* White polarity stripe */}
                <mesh position={[-3.15, 5.0, 0]}>
                  <boxGeometry args={[0.2, 8.5, 1.2]} />
                  <meshStandardMaterial color="#F8FAFC" />
                </mesh>
                {/* Silver cap */}
                <mesh position={[0, 9.3, 0]}>
                  <cylinderGeometry args={[3.1, 3.1, 0.2, 24]} />
                  <meshStandardMaterial color="#CBD5E1" metalness={0.9} />
                </mesh>
                {/* Two pins */}
                {[-1.27, 1.27].map((px, i) => (
                  <mesh
                    key={i}
                    position={[px, -1.5, 0]}
                    onClick={(e) => {
                      e.stopPropagation();
                      const pinId = i === 0 ? '+' : '-';
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

          if (comp.type === 'CAPACITOR') {
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
                {/* Tan ceramic disc */}
                <mesh position={[0, 4.5, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[3.0, 3.0, 1.2, 24]} />
                  <meshStandardMaterial color={isSelected ? '#38BDF8' : '#D97706'} roughness={0.6} />
                </mesh>
                {/* Two leads */}
                {[-1.27, 1.27].map((px, i) => (
                  <mesh
                    key={i}
                    position={[px, -1.5, 0]}
                    onClick={(e) => {
                      e.stopPropagation();
                      const pinId = i === 0 ? '1' : '2';
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
                <ArduinoNano3D
                  position={pos}
                  rotation={rot}
                  isSelected={isSelected}
                  isUsbPlugged={comp.parameters?.usbPlugged !== false}
                  onToggleUsb={() => toggleUsb(comp.id)}
                  isPowered={comp.parameters?.usbPlugged !== false}
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
                <Esp32DevKit3D
                  position={pos}
                  rotation={rot}
                  isSelected={isSelected}
                  isUsbPlugged={comp.parameters?.usbPlugged !== false}
                  onToggleUsb={() => toggleUsb(comp.id)}
                  isPowered={comp.parameters?.usbPlugged !== false}
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
                <RaspberryPiPico3D
                  position={pos}
                  rotation={rot}
                  isSelected={isSelected}
                  isUsbPlugged={comp.parameters?.usbPlugged !== false}
                  onToggleUsb={() => toggleUsb(comp.id)}
                  isPowered={comp.parameters?.usbPlugged !== false}
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
            const isSounding = Boolean(simState?.on || (simState?.current && Math.abs(simState.current) > 0.001));
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

          return (
            <Wire3DTube
              key={w.id}
              id={w.id}
              start={p1}
              end={p2}
              color={w.color}
              isSelected={isSelected}
              isSimulating={isSimulating}
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
            { hex: '#F59E0B', label: 'Yellow' },
            { hex: '#F8FAFC', label: 'White' },
          ].map((c) => (
            <button
              key={c.hex}
              onClick={() => setActiveWireColor(c.hex)}
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border transition-all cursor-pointer ${
                activeWireColor === c.hex
                  ? 'ring-2 ring-cyan-400 scale-110 border-white'
                  : 'border-slate-600 hover:scale-105'
              }`}
              style={{ backgroundColor: c.hex }}
              title={`Wire Color: ${c.label}`}
            />
          ))}
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
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-amber-500/80 rounded-xl px-4 py-2.5 shadow-2xl z-30 font-mono text-xs flex items-center gap-3 text-slate-200 backdrop-blur animate-in fade-in slide-in-from-bottom-2 duration-150">
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

      {/* Breadboard Hole Hover Overlay */}
      {hoveredHole && (
        <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-slate-700 rounded px-2.5 py-1 text-[11px] font-mono text-cyan-300 pointer-events-none z-20">
          📍 {hoveredHole.name} ({hoveredHole.tieGroup})
        </div>
      )}
    </div>
  );
}
