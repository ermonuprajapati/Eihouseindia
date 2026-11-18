'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { CircuitComponent, CircuitWire } from '@/modules/engineering-lab/types';
import {
  COMPONENT_CATALOG,
  ComponentTemplate,
  createComponentInstance,
} from '@/modules/engineering-lab/circuit-engine/component-catalog';
import {
  Maximize2,
  Palette,
  Sparkles,
  Layers,
  Check,
  Plus,
  Trash2,
  RotateCw,
  Scissors,
  Unplug,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  findNearestBreadboardHole,
  getBreadboardHoleCoords,
  getResistorColorBands,
  drawBox3D,
  BB_DEFAULT_X,
  BB_DEFAULT_Z,
  BB_WIDTH,
  BB_HEIGHT,
  BB_DEPTH,
  BB_ROWS,
  BB_START_X,
  BB_STEP_X,
  BB_COL_Z,
} from '@/modules/engineering-lab/virtual3d-engine/breadboard-model';

interface Virtual3dStudioProps {
  components: CircuitComponent[];
  wires: CircuitWire[];
  selectedCompId: string | null;
  selectedWireId?: string | null;
  onSelectComponent?: (id: string | null) => void;
  onSelectWire?: (id: string | null) => void;
  onAddComponent: (comp: CircuitComponent) => void;
  onUpdateComponent?: (updated: CircuitComponent) => void;
  onUpdateComponentPosition?: (id: string, x: number, y: number) => void;
  onUpdateComponent3DPosition?: (id: string, x3d: number, y3d: number, z3d: number) => void;
  onDeleteComponent?: (id: string) => void;
  onAddWire: (wire: Omit<CircuitWire, 'id'>) => void;
  onDeleteWire?: (wireId: string) => void;
  onDisconnectWire?: (wireId: string) => void;
  isSimulating: boolean;
  simulationStates: Record<string, { voltage: number; current: number; on?: boolean; onRed?: boolean; onGreen?: boolean; onBlue?: boolean }>;
  wireCurrents?: Record<string, number>;
  gpioStates?: Record<number | string, { mode: 'INPUT' | 'OUTPUT'; value: 0 | 1; analogVal: number }>;
}

const WIRE_COLORS = [
  { name: 'Red (+5V / VCC)', hex: '#EF4444' },
  { name: 'Black (GND / 0V)', hex: '#1E293B' },
  { name: 'Blue (Signal / Digital)', hex: '#3B82F6' },
  { name: 'Green (Data / GPIO)', hex: '#10B981' },
  { name: 'Yellow (Clock / PWM)', hex: '#F59E0B' },
  { name: 'Orange (Analog)', hex: '#F97316' },
  { name: 'Purple (Serial / Comm)', hex: '#A855F7' },
  { name: 'White (Neutral)', hex: '#F8FAFC' },
];

export function Virtual3dStudio({
  components,
  wires,
  selectedCompId,
  selectedWireId,
  onSelectComponent,
  onSelectWire,
  onAddComponent,
  onUpdateComponent,
  onUpdateComponentPosition,
  onUpdateComponent3DPosition,
  onDeleteComponent,
  onAddWire,
  onDeleteWire,
  onDisconnectWire,
  isSimulating,
  simulationStates,
  wireCurrents,
  gpioStates,
}: Virtual3dStudioProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 3D Camera Orbit & Pan State
  const [rotX, setRotX] = useState<number>(0.65); // Tilt ~37 degrees
  const [rotY, setRotY] = useState<number>(-0.45); // Yaw ~-25 degrees
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1.0);

  // Mouse drag tracking (Orbit & Pan)
  const [isOrbiting, setIsOrbiting] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Direct 3D Component Dragging & Positioning State
  const [isDraggingComp, setIsDraggingComp] = useState<boolean>(false);
  const [dragCompId, setDragCompId] = useState<string | null>(null);

  // Wiring State in 3D
  const [activeWireColor, setActiveWireColor] = useState<string>('#EF4444');
  const [activeWireStart, setActiveWireStart] = useState<{
    compId: string;
    pinId: string;
    pinName: string;
    x3d: number;
    y3d: number;
    z3d: number;
  } | null>(null);
  const [hoveredPin, setHoveredPin] = useState<{
    compId: string;
    pinId: string;
    pinName: string;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Interactive Breadboard Hole Snap State
  const [hoveredHole, setHoveredHole] = useState<{
    id: string;
    name: string;
    x3d: number;
    y3d: number;
    z3d: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Animation pulse offset for current flow
  const [animTick, setAnimTick] = useState<number>(0);

  // 3D Quick Add Drawer State
  const [isTrayOpen, setIsTrayOpen] = useState<boolean>(false);
  const [trayCategory, setTrayCategory] = useState<string>('all');

  // Breadboard visual presence state
  const [hasBreadboard, setHasBreadboard] = useState<boolean>(true);

  // 3D Wire Context Menu State
  const [wireContextMenu, setWireContextMenu] = useState<{
    wireId: string;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Dynamic animation loop for 3D current flow and animated actuators
  useEffect(() => {
    if (!isSimulating) return;
    let animId: number;
    const loop = () => {
      setAnimTick((t) => (t + 1) % 100);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isSimulating]);

  // --------------------------------------------------------------------------
  // 3D Matrix Projection Engine
  // --------------------------------------------------------------------------
  const project3D = useCallback(
    (
      x: number,
      y: number,
      z: number,
      canvasWidth: number,
      canvasHeight: number
    ): { px: number; py: number; depth: number } => {
      const centerX = canvasWidth / 2 + pan.x;
      const centerY = canvasHeight / 2 + pan.y;
      const scale = 2.4 * zoom;

      // Rotate around Y axis (Yaw)
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const x1 = x * cosY + z * sinY;
      const z1 = -x * sinY + z * cosY;

      // Rotate around X axis (Pitch)
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const y2 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;

      // Perspective projection
      const cameraDistance = 350;
      const fov = cameraDistance / Math.max(cameraDistance + z2, 20);

      return {
        px: centerX + x1 * scale * fov,
        py: centerY + y2 * scale * fov,
        depth: z2,
      };
    },
    [pan, zoom, rotX, rotY]
  );

  // --------------------------------------------------------------------------
  // Pin World 3D Coordinate Calculation
  // --------------------------------------------------------------------------
  const getComponentPinWorld3D = useCallback(
    (comp: CircuitComponent, pinId: string): { x: number; y: number; z: number; name: string } => {
      // Direct Solderless Breadboard Hole Support
      if (comp.id === 'BREADBOARD' || comp.type === 'BREADBOARD') {
        return getBreadboardHoleCoords(pinId, BB_DEFAULT_X, BB_DEFAULT_Z);
      }

      const pin = comp.pins.find((p) => p.id === pinId);
      const pinName = pin ? pin.name : pinId;

      // Component 3D origin on workbench / breadboard (independent 3D coordinates preferred)
      const compX = comp.x3d !== undefined ? comp.x3d : (comp.x - 400) * 0.7;
      const compZ = comp.z3d !== undefined ? comp.z3d : (comp.y - 300) * 0.7;
      const compY = 0; // Surface level

      // Board / IC specific pin layout offsets
      let ox = (pin?.x || 0) * 0.7;
      let oz = (pin?.y || 0) * 0.7;
      let oy = -6; // Height above board

      if (comp.type.includes('ARDUINO_UNO')) {
        oy = -14; // Header socket top
        // Top Digital Header (Z = -31)
        if (pinId === 'D0' || pinId === '0' || pinId.includes('RX')) { ox = 36; oz = -31; }
        else if (pinId === 'D1' || pinId === '1' || pinId.includes('TX')) { ox = 30; oz = -31; }
        else if (pinId === 'D2' || pinId === '2') { ox = 24; oz = -31; }
        else if (pinId === 'D3' || pinId === '3') { ox = 18; oz = -31; }
        else if (pinId === 'D4' || pinId === '4') { ox = 12; oz = -31; }
        else if (pinId === 'D5' || pinId === '5') { ox = 6; oz = -31; }
        else if (pinId === 'D6' || pinId === '6') { ox = 0; oz = -31; }
        else if (pinId === 'D7' || pinId === '7') { ox = -6; oz = -31; }
        else if (pinId === 'D8' || pinId === '8') { ox = -12; oz = -31; }
        else if (pinId === 'D9' || pinId === '9') { ox = -17; oz = -31; }
        else if (pinId === 'D10' || pinId === '10') { ox = -22; oz = -31; }
        else if (pinId === 'D11' || pinId === '11') { ox = -27; oz = -31; }
        else if (pinId === 'D12' || pinId === '12') { ox = -32; oz = -31; }
        else if (pinId === 'D13' || pinId === '13') { ox = -37; oz = -31; }
        else if (pinId === 'GND' && (pin?.y ?? 0) < 0) { ox = -42; oz = -31; }
        else if (pinId === 'AREF') { ox = -47; oz = -31; }
        else if (pinId === 'SDA') { ox = -52; oz = -31; }
        else if (pinId === 'SCL') { ox = -57; oz = -31; }
        // Bottom Power & Analog Headers (Z = 31)
        else if (pinId === 'IOREF') { ox = -42; oz = 31; }
        else if (pinId === 'RESET' || pinId === 'RST') { ox = -36; oz = 31; }
        else if (pinId === '3V3' || pinId === '3.3V') { ox = -30; oz = 31; }
        else if (pinId === '5V') { ox = -24; oz = 31; }
        else if (pinId === 'GND' || pinId === 'GND1' || pinId === 'GND2') { ox = -18; oz = 31; }
        else if (pinId === 'VIN') { ox = -6; oz = 31; }
        else if (pinId === 'A0') { ox = 12; oz = 31; }
        else if (pinId === 'A1') { ox = 18; oz = 31; }
        else if (pinId === 'A2') { ox = 24; oz = 31; }
        else if (pinId === 'A3') { ox = 30; oz = 31; }
        else if (pinId === 'A4') { ox = 36; oz = 31; }
        else if (pinId === 'A5') { ox = 42; oz = 31; }
        else { ox = 0; oz = 0; }
      } else if (comp.type.includes('NANO')) {
        oy = -10;
        // Dual row 15-pin DIP headers
        if (['D1', 'D0', 'RESET', 'GND', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12'].includes(pinId)) {
          const idx = ['D1', 'D0', 'RESET', 'GND', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12'].indexOf(pinId);
          ox = -14;
          oz = -35 + idx * 5;
        } else {
          const rPins = ['D13', '3V3', 'AREF', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', '5V', 'RESET2', 'GND2', 'VIN'];
          const idx = Math.max(0, rPins.indexOf(pinId));
          ox = 14;
          oz = -35 + idx * 5;
        }
      } else if (comp.type.includes('ESP32')) {
        oy = -12;
        const leftPins = ['3V3', 'EN', 'VP', 'VN', 'D34', 'D35', 'D32', 'D33', 'D25', 'D26', 'D27', 'D14', 'D12', 'GND', 'D13'];
        const rightPins = ['D23', 'D22', 'TX', 'RX', 'D21', 'D19', 'D18', 'D5', 'TX2', 'RX2', 'D4', 'D2', 'D15', 'GND2', '3V3_2'];
        if (leftPins.includes(pinId)) {
          ox = -26;
          oz = -35 + leftPins.indexOf(pinId) * 5;
        } else if (rightPins.includes(pinId)) {
          ox = 26;
          oz = -35 + rightPins.indexOf(pinId) * 5;
        } else {
          ox = pinId.includes('3V') ? -26 : 26;
          oz = 0;
        }
      } else if (comp.type.includes('PICO')) {
        oy = -10;
        const leftP = ['GP0', 'GP1', 'GND', 'GP2', 'GP3', 'GP4', 'GP5', 'GND2', 'GP6', 'GP7', 'GP8', 'GP9', 'GND3', 'GP10', 'GP11', 'GP12', 'GP13', 'GND4', 'GP14', 'GP15'];
        if (leftP.includes(pinId)) {
          ox = -22;
          oz = -45 + leftP.indexOf(pinId) * 4.6;
        } else {
          ox = 22;
          oz = 0;
        }
      } else if (comp.type === 'POTENTIOMETER') {
        oy = 0;
        if (pinId === '1' || pinId === 'a' || pinId === 'A') { ox = -14; oz = 8; }
        else if (pinId === '2' || pinId === 'wiper' || pinId === 'w' || pinId === 'W') { ox = 0; oz = 14; }
        else if (pinId === '3' || pinId === 'b' || pinId === 'B') { ox = 14; oz = 8; }
      } else if (comp.type === 'LED' || comp.type === 'ACTUATOR_RGB_LED') {
        oy = -16;
        ox = (pinId === 'a' || pinId === '1') ? -6 : 6;
        oz = 0;
      } else if (comp.type === 'RESISTOR') {
        oy = 0;
        ox = pinId === '1' ? -22 : 22;
        oz = 0;
      } else if (comp.type === 'CAPACITOR') {
        oy = 0;
        ox = pinId === '1' ? -8 : 8;
        oz = 0;
      } else if (comp.type === 'PUSHBUTTON') {
        oy = 0;
        if (pinId === '1') { ox = -12; oz = -8; }
        else if (pinId === '2') { ox = 12; oz = -8; }
        else if (pinId === '3') { ox = -12; oz = 8; }
        else if (pinId === '4') { ox = 12; oz = 8; }
      } else if (comp.type === 'TIMER_555' || comp.type.startsWith('LOGIC_') || comp.type.includes('DIP8')) {
        oy = 0;
        if (['1', '2', '3', '4'].includes(pinId)) {
          ox = -14;
          oz = -9 + (parseInt(pinId, 10) - 1) * 6;
        } else {
          const pNum = parseInt(pinId, 10) || 8;
          ox = 14;
          oz = -9 + (8 - pNum) * 6;
        }
      } else if (comp.type.includes('7805') || comp.type.includes('MOSFET') || comp.type.includes('TRANSISTOR') || comp.type.includes('TO220')) {
        oy = 0;
        if (pinId === '1' || pinId === 'in' || pinId === 'g' || pinId === 'b') { ox = -8; oz = 0; }
        else if (pinId === '2' || pinId === 'gnd' || pinId === 'd' || pinId === 'c') { ox = 0; oz = 0; }
        else if (pinId === '3' || pinId === 'out' || pinId === 's' || pinId === 'e') { ox = 8; oz = 0; }
      }

      return {
        x: compX + ox,
        y: compY + oy,
        z: compZ + oz,
        name: pinName,
      };
    },
    []
  );

  // --------------------------------------------------------------------------
  // Exact 3D Ray-Plane Unprojection onto Workbench Surface (Y = 0)
  // --------------------------------------------------------------------------
  const unprojectToWorkbench = useCallback(
    (mx: number, my: number, canvasWidth: number, canvasHeight: number) => {
      const centerX = canvasWidth / 2 + pan.x;
      const centerY = canvasHeight / 2 + pan.y;
      const scale = 2.4 * zoom;
      const camDist = 350;

      const u = (mx - centerX) / scale;
      const v = (my - centerY) / scale;

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      // Camera position in rotated space
      const cy1 = -camDist * sinX;
      const cz1 = -camDist * cosX;
      const camOriginX = -cz1 * sinY;
      const camOriginY = cy1;
      const camOriginZ = cz1 * cosY;

      // Ray direction
      const ry1 = v * cosX + camDist * sinX;
      const rz1 = -v * sinX + camDist * cosX;
      const dirX = u * cosY - rz1 * sinY;
      const dirY = ry1;
      const dirZ = u * sinY + rz1 * cosY;

      if (Math.abs(dirY) < 1e-4) return null;
      const t = -camOriginY / dirY;
      if (t < 0) return null;

      const worldX = camOriginX + t * dirX;
      const worldZ = camOriginZ + t * dirZ;

      return {
        world3dX: Math.round(worldX),
        world3dZ: Math.round(worldZ),
        schematicX: Math.round(worldX / 0.7 + 400),
        schematicY: Math.round(worldZ / 0.7 + 300),
      };
    },
    [pan, zoom, rotX, rotY]
  );

  // Quadratic Bezier distance helper for wire hit-testing
  const distanceToCurve = (
    mx: number,
    my: number,
    p1: { px: number; py: number },
    pm: { px: number; py: number },
    p2: { px: number; py: number }
  ) => {
    let minDist = Infinity;
    for (let t = 0.05; t <= 0.95; t += 0.1) {
      const bx = (1 - t) * (1 - t) * p1.px + 2 * (1 - t) * t * pm.px + t * t * p2.px;
      const by = (1 - t) * (1 - t) * p1.py + 2 * (1 - t) * t * pm.py + t * t * p2.py;
      const d = Math.hypot(mx - bx, my - by);
      if (d < minDist) minDist = d;
    }
    return minDist;
  };

  // Disconnect start pin and immediately start re-wiring from end pin
  const handleDisconnectStart = (wire: CircuitWire) => {
    if (onDeleteWire) onDeleteWire(wire.id);

    if (wire.toCompId === 'BREADBOARD' || wire.toCompId === 'bb') {
      const h3d = getBreadboardHoleCoords(wire.toPinId, BB_DEFAULT_X, BB_DEFAULT_Z);
      setActiveWireStart({
        compId: 'BREADBOARD',
        pinId: wire.toPinId,
        pinName: h3d.name,
        x3d: h3d.x,
        y3d: h3d.y,
        z3d: h3d.z,
      });
      setActiveWireColor(wire.color || '#3B82F6');
      onSelectWire?.(null);
      toast.info(`Disconnected start pin. Click any pin or breadboard hole to re-connect from ${h3d.name}.`);
      return;
    }

    const toComp = components.find((c) => c.id === wire.toCompId);
    const toPin = toComp?.pins.find((p) => p.id === wire.toPinId);
    if (toComp) {
      const p3d = getComponentPinWorld3D(toComp, wire.toPinId);
      setActiveWireStart({
        compId: toComp.id,
        pinId: wire.toPinId,
        pinName: toPin?.name || wire.toPinId,
        x3d: p3d.x,
        y3d: p3d.y,
        z3d: p3d.z,
      });
      setActiveWireColor(wire.color || '#3B82F6');
      onSelectWire?.(null);
      toast.info(`Disconnected start pin. Click any pin or hole in 3D to re-connect from ${toComp.label} [${toPin?.name || wire.toPinId}].`);
    }
  };

  // Disconnect end pin and immediately start re-wiring from start pin
  const handleDisconnectEnd = (wire: CircuitWire) => {
    if (onDeleteWire) onDeleteWire(wire.id);

    if (wire.fromCompId === 'BREADBOARD' || wire.fromCompId === 'bb') {
      const h3d = getBreadboardHoleCoords(wire.fromPinId, BB_DEFAULT_X, BB_DEFAULT_Z);
      setActiveWireStart({
        compId: 'BREADBOARD',
        pinId: wire.fromPinId,
        pinName: h3d.name,
        x3d: h3d.x,
        y3d: h3d.y,
        z3d: h3d.z,
      });
      setActiveWireColor(wire.color || '#3B82F6');
      onSelectWire?.(null);
      toast.info(`Disconnected end pin. Click any pin or breadboard hole to re-connect from ${h3d.name}.`);
      return;
    }

    const fromComp = components.find((c) => c.id === wire.fromCompId);
    const fromPin = fromComp?.pins.find((p) => p.id === wire.fromPinId);
    if (fromComp) {
      const p3d = getComponentPinWorld3D(fromComp, wire.fromPinId);
      setActiveWireStart({
        compId: fromComp.id,
        pinId: wire.fromPinId,
        pinName: fromPin?.name || wire.fromPinId,
        x3d: p3d.x,
        y3d: p3d.y,
        z3d: p3d.z,
      });
      setActiveWireColor(wire.color || '#3B82F6');
      onSelectWire?.(null);
      toast.info(`Disconnected end pin. Click any pin or hole in 3D to re-connect from ${fromComp.label} [${fromPin?.name || wire.fromPinId}].`);
    }
  };

  // Disconnect / Unplug wire completely
  const handleUnplugWire = (wireId: string) => {
    if (onDisconnectWire) {
      onDisconnectWire(wireId);
    } else if (onDeleteWire) {
      onDeleteWire(wireId);
    }
    onSelectWire?.(null);
    toast.success('Disconnected jumper wire in 3D');
  };

  // Keyboard shortcut listener for deletion and rotation in 3D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedWireId && onDeleteWire) {
          e.preventDefault();
          onDeleteWire(selectedWireId);
          toast.success('Deleted wire in 3D [Del]');
        } else if (selectedCompId && onDeleteComponent) {
          e.preventDefault();
          onDeleteComponent(selectedCompId);
          toast.success('Deleted component in 3D [Del]');
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (selectedCompId && onUpdateComponent) {
          e.preventDefault();
          const comp = components.find((c) => c.id === selectedCompId);
          if (comp) {
            onUpdateComponent({
              ...comp,
              rotation: (((comp.rotation || 0) + 90) % 360) as 0 | 90 | 180 | 270,
            });
            toast.info(`Rotated ${comp.label} in 3D`);
          }
        }
      } else if (e.key === 'Escape') {
        setActiveWireStart(null);
        onSelectWire?.(null);
        onSelectComponent?.(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWireId, selectedCompId, onDeleteWire, onDeleteComponent, onUpdateComponent, components, onSelectWire, onSelectComponent]);

  // --------------------------------------------------------------------------
  // Canvas Mouse & Interaction Handlers
  // --------------------------------------------------------------------------
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (e.button === 1 || e.shiftKey) {
      // Pan
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button === 0) {
      // 1. Check if clicked on selected wire's Delete Badge [✕]
      if (selectedWireId && onDeleteWire) {
        const wire = wires.find((w) => w.id === selectedWireId);
        if (wire) {
          const fromComp = components.find((c) => c.id === wire.fromCompId);
          const toComp = components.find((c) => c.id === wire.toCompId);
          if (fromComp && toComp) {
            const p1_3d = getComponentPinWorld3D(fromComp, wire.fromPinId);
            const p2_3d = getComponentPinWorld3D(toComp, wire.toPinId);
            const midX = (p1_3d.x + p2_3d.x) / 2;
            const midY = Math.min(p1_3d.y, p2_3d.y) - 35;
            const midZ = (p1_3d.z + p2_3d.z) / 2;
            const ptMid = project3D(midX, midY, midZ, canvas.width, canvas.height);
            if (Math.hypot(mx - ptMid.px, my - ptMid.py) <= 20) {
              onDeleteWire(selectedWireId);
              toast.success('Deleted wire in 3D');
              return;
            }
          }
        }
      }

      // 2. Check if clicked on a pin (wiring)
      if (hoveredPin) {
        if (!activeWireStart) {
          // Start 3D wire
          const comp = components.find((c) => c.id === hoveredPin.compId);
          if (comp) {
            const p3d = getComponentPinWorld3D(comp, hoveredPin.pinId);
            setActiveWireStart({
              compId: hoveredPin.compId,
              pinId: hoveredPin.pinId,
              pinName: hoveredPin.pinName,
              x3d: p3d.x,
              y3d: p3d.y,
              z3d: p3d.z,
            });
            toast.info(`Wiring from ${comp.label} [${hoveredPin.pinName}]... Click another pin or breadboard hole.`);
          }
        } else {
          // Complete 3D wire
          if (activeWireStart.compId !== hoveredPin.compId || activeWireStart.pinId !== hoveredPin.pinId) {
            onAddWire({
              fromCompId: activeWireStart.compId,
              fromPinId: activeWireStart.pinId,
              toCompId: hoveredPin.compId,
              toPinId: hoveredPin.pinId,
              color: activeWireColor,
            });
            toast.success(`Connected jumper wire (${activeWireStart.pinName} ➔ ${hoveredPin.pinName})`);
          }
          setActiveWireStart(null);
        }
        return;
      }

      // 2b. Check if clicked on an interactive breadboard hole
      if (hoveredHole) {
        if (!activeWireStart) {
          setActiveWireStart({
            compId: 'BREADBOARD',
            pinId: hoveredHole.id,
            pinName: hoveredHole.name,
            x3d: hoveredHole.x3d,
            y3d: hoveredHole.y3d,
            z3d: hoveredHole.z3d,
          });
          toast.info(`Wiring from ${hoveredHole.name}... Click any pin or hole to complete.`);
        } else {
          if (activeWireStart.compId !== 'BREADBOARD' || activeWireStart.pinId !== hoveredHole.id) {
            onAddWire({
              fromCompId: activeWireStart.compId,
              fromPinId: activeWireStart.pinId,
              toCompId: 'BREADBOARD',
              toPinId: hoveredHole.id,
              color: activeWireColor,
            });
            toast.success(`Connected jumper wire (${activeWireStart.pinName} ➔ ${hoveredHole.name})`);
          }
          setActiveWireStart(null);
        }
        return;
      }

      // 3. Check if clicked on a wire to select it
      for (const wire of wires) {
        let p1_3d: { x: number; y: number; z: number } | null = null;
        let p2_3d: { x: number; y: number; z: number } | null = null;

        if (wire.fromCompId === 'BREADBOARD' || wire.fromCompId === 'bb') {
          p1_3d = getBreadboardHoleCoords(wire.fromPinId, BB_DEFAULT_X, BB_DEFAULT_Z);
        } else {
          const fromComp = components.find((c) => c.id === wire.fromCompId);
          if (fromComp) p1_3d = getComponentPinWorld3D(fromComp, wire.fromPinId);
        }

        if (wire.toCompId === 'BREADBOARD' || wire.toCompId === 'bb') {
          p2_3d = getBreadboardHoleCoords(wire.toPinId, BB_DEFAULT_X, BB_DEFAULT_Z);
        } else {
          const toComp = components.find((c) => c.id === wire.toCompId);
          if (toComp) p2_3d = getComponentPinWorld3D(toComp, wire.toPinId);
        }

        if (!p1_3d || !p2_3d) continue;

        const pt1 = project3D(p1_3d.x, p1_3d.y, p1_3d.z, canvas.width, canvas.height);
        const pt2 = project3D(p2_3d.x, p2_3d.y, p2_3d.z, canvas.width, canvas.height);
        const midX = (p1_3d.x + p2_3d.x) / 2;
        const midY = Math.min(p1_3d.y, p2_3d.y) - 35;
        const midZ = (p1_3d.z + p2_3d.z) / 2;
        const ptMid = project3D(midX, midY, midZ, canvas.width, canvas.height);

        const dist = distanceToCurve(mx, my, pt1, ptMid, pt2);
        if (dist <= 14) {
          onSelectWire?.(wire.id);
          onSelectComponent?.(null);
          return;
        }
      }

      // 4. Check if clicked on a component body to select and drag it
      let clickedCompId: string | null = null;
      for (const comp of components) {
        const cx = (comp.x - 400) * 0.7;
        const cz = (comp.y - 300) * 0.7;
        const proj = project3D(cx, 0, cz, canvas.width, canvas.height);
        const hitRadius = comp.type.includes('ARDUINO') || comp.type.includes('MEGA') ? 50 : 35;
        if (Math.hypot(proj.px - mx, proj.py - my) < hitRadius) {
          clickedCompId = comp.id;
          break;
        }
      }

      if (clickedCompId) {
        onSelectComponent?.(clickedCompId);
        onSelectWire?.(null);
        if (onUpdateComponentPosition) {
          setIsDraggingComp(true);
          setDragCompId(clickedCompId);
        }
        return;
      }

      // 5. If clicked on canvas background, deselect and start 3D Orbit
      onSelectComponent?.(null);
      onSelectWire?.(null);
      setIsOrbiting(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }

    if (isDraggingComp && dragCompId) {
      const pos = unprojectToWorkbench(mouseX, mouseY, canvas.width, canvas.height);
      if (pos) {
        if (onUpdateComponent3DPosition) {
          onUpdateComponent3DPosition(dragCompId, pos.world3dX, 0, pos.world3dZ);
        } else if (onUpdateComponentPosition) {
          onUpdateComponentPosition(dragCompId, pos.schematicX, pos.schematicY);
        }
      }
      return;
    }

    if (isOrbiting) {
      const dx = (e.clientX - dragStart.x) * 0.007;
      const dy = (e.clientY - dragStart.y) * 0.007;
      setRotY((prev) => prev + dx);
      setRotX((prev) => Math.max(0.1, Math.min(1.4, prev - dy)));
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Pin hover detection: Find nearest pin in projected screen space within 16px radius
    let foundPin: { compId: string; pinId: string; pinName: string; screenX: number; screenY: number } | null = null;
    let minDistance = 16;

    for (const comp of components) {
      for (const pin of comp.pins) {
        const p3d = getComponentPinWorld3D(comp, pin.id);
        const proj = project3D(p3d.x, p3d.y, p3d.z, canvas.width, canvas.height);
        const dist = Math.hypot(proj.px - mouseX, proj.py - mouseY);

        if (dist < minDistance) {
          minDistance = dist;
          foundPin = {
            compId: comp.id,
            pinId: pin.id,
            pinName: pin.name,
            screenX: proj.px,
            screenY: proj.py,
          };
        }
      }
    }

    setHoveredPin(foundPin);

    // Interactive Breadboard Hole Snap Detection
    if (!foundPin && hasBreadboard) {
      const pos = unprojectToWorkbench(mouseX, mouseY, canvas.width, canvas.height);
      if (pos) {
        const hole = findNearestBreadboardHole(pos.world3dX, pos.world3dZ, BB_DEFAULT_X, BB_DEFAULT_Z);
        if (hole) {
          const hp = project3D(hole.x, hole.y, hole.z, canvas.width, canvas.height);
          if (Math.hypot(hp.px - mouseX, hp.py - mouseY) < 18) {
            setHoveredHole({
              id: hole.id,
              name: hole.name,
              x3d: hole.x,
              y3d: hole.y,
              z3d: hole.z,
              screenX: hp.px,
              screenY: hp.py,
            });
          } else {
            setHoveredHole(null);
          }
        } else {
          setHoveredHole(null);
        }
      } else {
        setHoveredHole(null);
      }
    } else {
      setHoveredHole(null);
    }
  };

  const handleMouseUp = () => {
    setIsOrbiting(false);
    setIsPanning(false);
    setIsDraggingComp(false);
    setDragCompId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.max(0.4, Math.min(3.0, prev * factor)));
  };

  // Preset Camera Angles
  const setCameraPreset = (preset: 'iso' | 'top' | 'front' | 'side' | 'reset') => {
    if (preset === 'iso') {
      setRotX(0.65);
      setRotY(-0.45);
      setPan({ x: 0, y: 0 });
      setZoom(1.0);
    } else if (preset === 'top') {
      setRotX(0.05); // Near straight down
      setRotY(0);
      setPan({ x: 0, y: 0 });
      setZoom(1.1);
    } else if (preset === 'front') {
      setRotX(1.3); // Low angle looking forward
      setRotY(0);
      setPan({ x: 0, y: 0 });
      setZoom(1.0);
    } else if (preset === 'side') {
      setRotX(1.3); // Side elevation
      setRotY(Math.PI / 2);
      setPan({ x: 0, y: 0 });
      setZoom(1.0);
    } else {
      setRotX(0.65);
      setRotY(-0.45);
      setPan({ x: 0, y: 0 });
      setZoom(1.0);
    }
  };

  // --------------------------------------------------------------------------
  // Main 3D Canvas Rendering Loop
  // --------------------------------------------------------------------------
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const proj = (x: number, y: number, z: number) => project3D(x, y, z, width, height);

    // 1. Dark Workbench Laboratory Floor
    ctx.fillStyle = '#060B14';
    ctx.fillRect(0, 0, width, height);

    // Radial studio illumination spotlight
    const spot = ctx.createRadialGradient(width / 2, height / 2 - 20, 30, width / 2, height / 2, 400);
    spot.addColorStop(0, 'rgba(30, 58, 102, 0.28)');
    spot.addColorStop(0.6, 'rgba(11, 21, 40, 0.15)');
    spot.addColorStop(1, 'rgba(6, 11, 20, 0)');
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, width, height);

    // 2. 3D Workbench Grid Lines
    const gridSpan = 240;
    const gridStep = 40;
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
    ctx.lineWidth = 1;

    for (let gx = -gridSpan; gx <= gridSpan; gx += gridStep) {
      const p1 = project3D(gx, 0, -gridSpan, width, height);
      const p2 = project3D(gx, 0, gridSpan, width, height);
      ctx.beginPath();
      ctx.moveTo(p1.px, p1.py);
      ctx.lineTo(p2.px, p2.py);
      ctx.stroke();
    }
    for (let gz = -gridSpan; gz <= gridSpan; gz += gridStep) {
      const p1 = project3D(-gridSpan, 0, gz, width, height);
      const p2 = project3D(gridSpan, 0, gz, width, height);
      ctx.beginPath();
      ctx.moveTo(p1.px, p1.py);
      ctx.lineTo(p2.px, p2.py);
      ctx.stroke();
    }

    // 3. 3D Full-Size Solderless Breadboard (830 / 400 tie-points)
    if (hasBreadboard) {
      const bbW = BB_WIDTH;
      const bbH = BB_HEIGHT;
      const bbD = BB_DEPTH;
      const bbX = BB_DEFAULT_X;
      const bbZ = BB_DEFAULT_Z;

      // Solid ABS Plastic Body with true 3D perspective shading
      drawBox3D(
        ctx,
        bbX - bbW / 2, -bbH, bbZ - bbD / 2,
        bbX + bbW / 2, 0, bbZ + bbD / 2,
        '#F8FAFC', '#E2E8F0', '#CBD5E1', '#94A3B8',
        proj
      );

      // Central IC Divider Trench / Groove
      const tr1 = project3D(bbX - bbW / 2 + 8, -0.6, bbZ, width, height);
      const tr2 = project3D(bbX + bbW / 2 - 8, -0.6, bbZ, width, height);
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tr1.px, tr1.py);
      ctx.lineTo(tr2.px, tr2.py);
      ctx.stroke();

      // Top Power Rails (+ Red, - Blue)
      const rTop1 = project3D(bbX - bbW / 2 + 12, -0.2, bbZ - 44, width, height);
      const rTop2 = project3D(bbX + bbW / 2 - 12, -0.2, bbZ - 44, width, height);
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rTop1.px, rTop1.py);
      ctx.lineTo(rTop2.px, rTop2.py);
      ctx.stroke();

      const bTop1 = project3D(bbX - bbW / 2 + 12, -0.2, bbZ - 36, width, height);
      const bTop2 = project3D(bbX + bbW / 2 - 12, -0.2, bbZ - 36, width, height);
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bTop1.px, bTop1.py);
      ctx.lineTo(bTop2.px, bTop2.py);
      ctx.stroke();

      // Bottom Power Rails (- Blue, + Red)
      const bBot1 = project3D(bbX - bbW / 2 + 12, -0.2, bbZ + 36, width, height);
      const bBot2 = project3D(bbX + bbW / 2 - 12, -0.2, bbZ + 36, width, height);
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bBot1.px, bBot1.py);
      ctx.lineTo(bBot2.px, bBot2.py);
      ctx.stroke();

      const rBot1 = project3D(bbX - bbW / 2 + 12, -0.2, bbZ + 44, width, height);
      const rBot2 = project3D(bbX + bbW / 2 - 12, -0.2, bbZ + 44, width, height);
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rBot1.px, rBot1.py);
      ctx.lineTo(rBot2.px, rBot2.py);
      ctx.stroke();

      // Silkscreen Row Numbers
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 7px monospace';
      for (let r = 1; r <= BB_ROWS; r += 5) {
        const rx = BB_START_X + (r - 1) * BB_STEP_X;
        const tp = project3D(rx, -0.4, bbZ - 28, width, height);
        ctx.fillText(String(r), tp.px - 3, tp.py);
        const bp = project3D(rx, -0.4, bbZ + 30, width, height);
        ctx.fillText(String(r), bp.px - 3, bp.py);
      }

      // Draw all terminal sockets and power rail sockets
      ctx.fillStyle = '#0F172A';
      const colKeys: ('E' | 'D' | 'C' | 'B' | 'A' | 'F' | 'G' | 'H' | 'I' | 'J')[] = ['E', 'D', 'C', 'B', 'A', 'F', 'G', 'H', 'I', 'J'];
      for (let r = 1; r <= BB_ROWS; r++) {
        const rx = BB_START_X + (r - 1) * BB_STEP_X;
        for (const col of colKeys) {
          const rz = BB_COL_Z[col];
          const hp = project3D(rx, -0.8, rz, width, height);
          ctx.beginPath();
          ctx.arc(hp.px, hp.py, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
        // Power rail sockets
        for (const rz of [bbZ - 44, bbZ - 36, bbZ + 36, bbZ + 44]) {
          const hp = project3D(rx, -0.8, rz, width, height);
          ctx.beginPath();
          ctx.arc(hp.px, hp.py, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Breadboard Hovered Hole Target Indicator
      if (hoveredHole) {
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(hoveredHole.screenX, hoveredHole.screenY, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#34D399';
        ctx.beginPath();
        ctx.arc(hoveredHole.screenX, hoveredHole.screenY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Render All 3D Components
    for (const comp of components) {
      const isSelected = comp.id === selectedCompId;
      const compX = comp.x3d !== undefined ? comp.x3d : (comp.x - 400) * 0.7;
      const compZ = comp.z3d !== undefined ? comp.z3d : (comp.y - 300) * 0.7;
      const compY = 0;
      const simState = simulationStates[comp.id];

      // Draw Component Base Footprint / Model
      if (comp.type.includes('ARDUINO_UNO')) {
        // ARDUINO UNO R3 (Authentic Italian Turquoise Blue PCB with True 3D Box Extrusions)
        const bw = 90;
        const bd = 68;

        // PCB Substrate 3D Slab with thickness
        drawBox3D(
          ctx,
          compX - bw / 2, -2, compZ - bd / 2,
          compX + bw / 2, 0, compZ + bd / 2,
          isSelected ? '#0284C7' : '#00878F',
          isSelected ? '#0369A1' : '#005C62',
          isSelected ? '#075985' : '#00474C',
          isSelected ? '#38BDF8' : '#00979C',
          proj
        );

        // 3D Silver USB Type-B Port
        drawBox3D(
          ctx,
          compX - bw / 2 + 2, -14, compZ - bd / 2 + 8,
          compX - bw / 2 + 18, -2, compZ - bd / 2 + 22,
          '#CBD5E1', '#94A3B8', '#64748B', '#475569',
          proj
        );
        // USB Socket Aperture
        const usbP = project3D(compX - bw / 2 + 4, -8, compZ - bd / 2 + 15, width, height);
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(usbP.px - 3, usbP.py - 3, 6, 6);

        // 3D Black DC Barrel Power Jack
        drawBox3D(
          ctx,
          compX - bw / 2 + 2, -14, compZ + bd / 2 - 22,
          compX - bw / 2 + 18, -2, compZ + bd / 2 - 8,
          '#0F172A', '#090D16', '#1E293B', '#334155',
          proj
        );
        // Center brass terminal pin
        const dcP = project3D(compX - bw / 2 + 4, -8, compZ + bd / 2 - 15, width, height);
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(dcP.px, dcP.py, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // 3D ATmega328P DIP-28 IC Socket & Microchip
        drawBox3D(
          ctx,
          compX - 6, -8, compZ - 14,
          compX + 28, -2, compZ + 14,
          '#0F172A', '#090D16', '#1E293B', '#334155',
          proj
        );
        // IC Pin 1 notch
        const icNotch = project3D(compX - 6, -8, compZ, width, height);
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.arc(icNotch.px, icNotch.py, 2.5, 0, Math.PI);
        ctx.fill();

        // 16 MHz Silver Crystal Oscillator
        const xtalP = project3D(compX - 8, compY - 5, compZ - 2, width, height);
        ctx.fillStyle = '#94A3B8';
        ctx.beginPath();
        ctx.roundRect(xtalP.px - 5, xtalP.py - 3, 10, 6, 2);
        ctx.fill();

        // Red Tactile Reset Button
        const rstP = project3D(compX - bw / 2 + 12, compY - 6, compZ - bd / 2 + 34, width, height);
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(rstP.px, rstP.py, 3, 0, Math.PI * 2);
        ctx.fill();

        // 3D Dual Black Female Pin Header Strips
        // Top Header Block (Digital Pins 0..13, AREF, GND)
        drawBox3D(
          ctx,
          compX - 44, -14, compZ - bd / 2 + 2,
          compX + 40, -2, compZ - bd / 2 + 7,
          '#1E293B', '#0F172A', '#090D16', '#334155',
          proj
        );
        // Bottom Header Block (Power & Analog)
        drawBox3D(
          ctx,
          compX - 44, -14, compZ + bd / 2 - 7,
          compX + 44, -2, compZ + bd / 2 - 2,
          '#1E293B', '#0F172A', '#090D16', '#334155',
          proj
        );

        // Built-in Pin 13 LED (Amber)
        const led13PinState = gpioStates && gpioStates[13]?.value === 1;
        const ledP = project3D(compX - 10, compY - 4, compZ - 12, width, height);
        ctx.fillStyle = led13PinState ? '#F59E0B' : '#78350F';
        ctx.beginPath();
        ctx.arc(ledP.px, ledP.py, 3.5, 0, Math.PI * 2);
        ctx.fill();
        if (led13PinState) {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
          ctx.beginPath();
          ctx.arc(ledP.px, ledP.py, 10, 0, Math.PI * 2);
          ctx.fill();
        }

        // White Silk-Screen Branding
        const labelP = project3D(compX, compY - 3, compZ - 18, width, height);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('ARDUINO UNO R3', labelP.px - 32, labelP.py);
      } else if (comp.type.includes('ARDUINO_NANO') || comp.type.includes('NANO')) {
        // ARDUINO NANO V3 (Compact 45mm x 18mm Blue PCB)
        const bw = 55;
        const bd = 26;
        const p1 = project3D(compX - bw / 2, compY - 2, compZ - bd / 2, width, height);
        const p2 = project3D(compX + bw / 2, compY - 2, compZ - bd / 2, width, height);
        const p3 = project3D(compX + bw / 2, compY - 2, compZ + bd / 2, width, height);
        const p4 = project3D(compX - bw / 2, compY - 2, compZ + bd / 2, width, height);

        ctx.fillStyle = isSelected ? '#0284C7' : '#0369A1';
        ctx.strokeStyle = isSelected ? '#38BDF8' : '#075985';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.lineTo(p3.px, p3.py);
        ctx.lineTo(p4.px, p4.py);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Mini-USB socket
        const usbP = project3D(compX - bw / 2 + 5, compY - 5, compZ, width, height);
        ctx.fillStyle = '#CBD5E1';
        ctx.fillRect(usbP.px - 5, usbP.py - 4, 10, 8);

        // ATmega328P TQFP square chip rotated 45°
        const chipP = project3D(compX + 4, compY - 5, compZ, width, height);
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(chipP.px - 6, chipP.py - 6, 12, 12);

        // Dual Header Strips
        const hdrTop = project3D(compX, compY - 5, compZ - bd / 2 + 3, width, height);
        const hdrBot = project3D(compX, compY - 5, compZ + bd / 2 - 3, width, height);
        ctx.fillStyle = '#090D16';
        ctx.fillRect(hdrTop.px - 22, hdrTop.py - 2, 44, 4);
        ctx.fillRect(hdrBot.px - 22, hdrBot.py - 2, 44, 4);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 7px monospace';
        ctx.fillText('NANO V3', chipP.px - 14, chipP.py + 14);
      } else if (comp.type.includes('ARDUINO_MEGA') || comp.type.includes('MEGA')) {
        // ARDUINO MEGA 2560 (Extended 101.6mm x 53.4mm Blue PCB)
        const bw = 120;
        const bd = 68;
        const p1 = project3D(compX - bw / 2, compY - 2, compZ - bd / 2, width, height);
        const p2 = project3D(compX + bw / 2, compY - 2, compZ - bd / 2, width, height);
        const p3 = project3D(compX + bw / 2, compY - 2, compZ + bd / 2, width, height);
        const p4 = project3D(compX - bw / 2, compY - 2, compZ + bd / 2, width, height);

        ctx.fillStyle = isSelected ? '#0284C7' : '#00878F';
        ctx.strokeStyle = isSelected ? '#38BDF8' : '#005C62';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.lineTo(p3.px, p3.py);
        ctx.lineTo(p4.px, p4.py);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // ATmega2560 Square TQFP-100 Chip
        const icP = project3D(compX, compY - 6, compZ, width, height);
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(icP.px - 12, icP.py - 12, 24, 24);

        // Extended Digital Double-Row Header at the right edge
        const digHdr = project3D(compX + bw / 2 - 8, compY - 6, compZ, width, height);
        ctx.fillStyle = '#090D16';
        ctx.fillRect(digHdr.px - 4, digHdr.py - 22, 8, 44);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('MEGA 2560', icP.px - 22, icP.py - 16);
      } else if (comp.type.includes('ESP32')) {
        // ESP32 DevKit (Black PCB + Perforated Metal RF Shield)
        const bw = 65;
        const bd = 38;
        const p1 = project3D(compX - bw / 2, compY - 2, compZ - bd / 2, width, height);
        const p2 = project3D(compX + bw / 2, compY - 2, compZ - bd / 2, width, height);
        const p3 = project3D(compX + bw / 2, compY - 2, compZ + bd / 2, width, height);
        const p4 = project3D(compX - bw / 2, compY - 2, compZ + bd / 2, width, height);

        ctx.fillStyle = isSelected ? '#1E293B' : '#0F172A';
        ctx.strokeStyle = isSelected ? '#38BDF8' : '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.lineTo(p3.px, p3.py);
        ctx.lineTo(p4.px, p4.py);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Metallic RF Shield Can with Perforations
        const rfP = project3D(compX + 8, compY - 6, compZ, width, height);
        ctx.fillStyle = '#94A3B8';
        ctx.strokeStyle = '#64748B';
        ctx.fillRect(rfP.px - 14, rfP.py - 10, 28, 20);
        ctx.strokeRect(rfP.px - 14, rfP.py - 10, 28, 20);

        // Serpentine Trace Antenna
        const antP = project3D(compX + bw / 2 - 4, compY - 3, compZ, width, height);
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(antP.px - 2, antP.py - 8, 4, 16);

        // EN & BOOT Buttons
        const enP = project3D(compX - bw / 2 + 10, compY - 5, compZ - 10, width, height);
        const bootP = project3D(compX - bw / 2 + 10, compY - 5, compZ + 10, width, height);
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(enP.px - 2, enP.py - 2, 4, 4);
        ctx.fillRect(bootP.px - 2, bootP.py - 2, 4, 4);

        const lbl = project3D(compX - 14, compY - 3, compZ, width, height);
        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('ESP32 WROOM', lbl.px - 18, lbl.py + 3);
      } else if (comp.type.includes('PICO')) {
        // Raspberry Pi Pico (Signature British Racing Green PCB)
        const bw = 68;
        const bd = 28;
        const p1 = project3D(compX - bw / 2, compY - 2, compZ - bd / 2, width, height);
        const p2 = project3D(compX + bw / 2, compY - 2, compZ - bd / 2, width, height);
        const p3 = project3D(compX + bw / 2, compY - 2, compZ + bd / 2, width, height);
        const p4 = project3D(compX - bw / 2, compY - 2, compZ + bd / 2, width, height);

        ctx.fillStyle = isSelected ? '#047857' : '#059669';
        ctx.strokeStyle = isSelected ? '#34D399' : '#065F46';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.lineTo(p3.px, p3.py);
        ctx.lineTo(p4.px, p4.py);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Micro-USB Port
        const usbP = project3D(compX - bw / 2 + 5, compY - 5, compZ, width, height);
        ctx.fillStyle = '#CBD5E1';
        ctx.fillRect(usbP.px - 4, usbP.py - 3, 8, 6);

        // RP2040 Chip Rotated 45°
        const rpP = project3D(compX + 4, compY - 5, compZ, width, height);
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(rpP.px - 6, rpP.py - 6, 12, 12);

        // White BOOTSEL button
        const bselP = project3D(compX - 8, compY - 5, compZ - 4, width, height);
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(bselP.px, bselP.py, 2.5, 0, Math.PI * 2);
        ctx.fill();

        const lbl = project3D(compX, compY - 4, compZ, width, height);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('RP2040 PICO', lbl.px - 26, lbl.py + 14);
      } else if (comp.type.includes('STM32')) {
        // STM32 Blue Pill Board
        const bw = 65;
        const bd = 26;
        const p1 = project3D(compX - bw / 2, compY - 2, compZ - bd / 2, width, height);
        const p2 = project3D(compX + bw / 2, compY - 2, compZ - bd / 2, width, height);
        const p3 = project3D(compX + bw / 2, compY - 2, compZ + bd / 2, width, height);
        const p4 = project3D(compX - bw / 2, compY - 2, compZ + bd / 2, width, height);

        ctx.fillStyle = '#1D4ED8';
        ctx.strokeStyle = '#1E40AF';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.lineTo(p3.px, p3.py);
        ctx.lineTo(p4.px, p4.py);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Yellow Boot Jumpers
        const jmpP = project3D(compX - 10, compY - 5, compZ - 5, width, height);
        ctx.fillStyle = '#FBBF24';
        ctx.fillRect(jmpP.px - 3, jmpP.py - 2, 6, 4);

        const lbl = project3D(compX, compY - 4, compZ, width, height);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 7px monospace';
        ctx.fillText('STM32F103', lbl.px - 18, lbl.py + 12);
      } else if (comp.type.includes('CONTACTOR') || comp.type.includes('RELAY_CONTACTOR')) {
        // Industrial Contactor (3-Phase Modular Gray Enclosure)
        const cp = project3D(compX, compY - 14, compZ, width, height);
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.fillRect(cp.px - 28, cp.py - 20, 56, 40);
        ctx.strokeRect(cp.px - 28, cp.py - 20, 56, 40);

        // Terminal Screws (Top: L1, L2, L3; Bottom: T1, T2, T3)
        ctx.fillStyle = '#F59E0B';
        for (let ti = -18; ti <= 18; ti += 18) {
          ctx.beginPath();
          ctx.arc(cp.px + ti, cp.py - 14, 2.5, 0, Math.PI * 2);
          ctx.arc(cp.px + ti, cp.py + 14, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Central Trip Armature Indicator
        ctx.fillStyle = '#F97316';
        ctx.fillRect(cp.px - 8, cp.py - 6, 16, 12);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('CONTACTOR', cp.px - 24, cp.py + 2);
      } else if (comp.type.includes('TRANSFORMER') || comp.type.includes('CONTROL_TRANSFORMER')) {
        // Laminated Iron Core with Yellow Wrapped Copper Coils
        const tp = project3D(compX, compY - 12, compZ, width, height);
        ctx.fillStyle = '#475569';
        ctx.fillRect(tp.px - 24, tp.py - 16, 48, 32);

        // Copper Coils wrapped in yellow insulating tape
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(tp.px - 14, tp.py - 14, 28, 28);
        ctx.strokeStyle = '#D97706';
        ctx.strokeRect(tp.px - 14, tp.py - 14, 28, 28);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 7px monospace';
        ctx.fillText('XFMR', tp.px - 10, tp.py + 2);
      } else if (comp.type.includes('PROTECTION_MCB') || comp.type.includes('PROTECTION_MCCB')) {
        // Modular DIN-Rail Circuit Breaker (White body + Black lever)
        const bp = project3D(compX, compY - 14, compZ, width, height);
        ctx.fillStyle = '#F8FAFC';
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 1.5;
        ctx.fillRect(bp.px - 16, bp.py - 22, 32, 44);
        ctx.strokeRect(bp.px - 16, bp.py - 22, 32, 44);

        // Status Window (Green=OFF, Red=ON)
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(bp.px - 6, bp.py - 14, 12, 6);

        // Toggle Switch Lever
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(bp.px - 5, bp.py - 4, 10, 16);

        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 7px monospace';
        ctx.fillText('MCB C16', bp.px - 14, bp.py + 18);
      } else if (comp.type.includes('POWER_SUPPLY_24V')) {
        // 24V SMPS (Perforated Aluminum Enclosure)
        const sp = project3D(compX, compY - 12, compZ, width, height);
        ctx.fillStyle = '#94A3B8';
        ctx.strokeStyle = '#64748B';
        ctx.lineWidth = 1.5;
        ctx.fillRect(sp.px - 32, sp.py - 18, 64, 36);
        ctx.strokeRect(sp.px - 32, sp.py - 18, 64, 36);

        // Green Terminal Strip
        ctx.fillStyle = '#059669';
        ctx.fillRect(sp.px - 30, sp.py + 6, 60, 10);

        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('24V DC SMPS', sp.px - 26, sp.py - 4);
      } else if (comp.type === 'LED') {
        // 3D 5mm Diffused LED Bulb
        const pLed = project3D(compX, compY - 14, compZ, width, height);
        const isGlowing = isSimulating && simState && (simState.on || simState.voltage > 1.8);
        const rawColor = String(comp.parameters?.color || 'Red');
        const colorName = rawColor.toLowerCase();
        const baseColor = rawColor.startsWith('#')
          ? rawColor
          : colorName.includes('blue')
          ? '#3B82F6'
          : colorName.includes('green')
          ? '#10B981'
          : colorName.includes('amber') || colorName.includes('yellow')
          ? '#F59E0B'
          : colorName.includes('white')
          ? '#F8FAFC'
          : colorName.includes('cyan')
          ? '#06B6D4'
          : colorName.includes('purple') || colorName.includes('violet')
          ? '#A855F7'
          : '#EF4444';

        // Outer Aura Glow during simulation
        if (isGlowing) {
          const glowGrad = ctx.createRadialGradient(pLed.px, pLed.py, 4, pLed.px, pLed.py, 28);
          glowGrad.addColorStop(0, baseColor);
          glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(pLed.px, pLed.py, 28, 0, Math.PI * 2);
          ctx.fill();
        }

        // Domed Epoxy Bulb
        ctx.fillStyle = isGlowing ? '#FFFFFF' : baseColor;
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pLed.px, pLed.py, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Metallic Cathode / Anode Leads
        const leadL = project3D(compX - 4, compY, compZ, width, height);
        const leadR = project3D(compX + 4, compY, compZ, width, height);
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pLed.px - 3, pLed.py + 6);
        ctx.lineTo(leadL.px, leadL.py);
        ctx.moveTo(pLed.px + 3, pLed.py + 6);
        ctx.lineTo(leadR.px, leadR.py);
        ctx.stroke();
      } else if (comp.type === 'ACTUATOR_RGB_LED') {
        // 3D 5mm Tri-Color 4-Lead Diffused RGB LED
        const pLed = project3D(compX, compY - 14, compZ, width, height);
        const onR = isSimulating && Boolean(simState?.onRed);
        const onG = isSimulating && Boolean(simState?.onGreen);
        const onB = isSimulating && Boolean(simState?.onBlue);
        const isGlowing = onR || onG || onB;

        let glowColor = '#38BDF8';
        if (onR && onG && onB) glowColor = '#FFFFFF';
        else if (onR && onG) glowColor = '#FBBF24';
        else if (onR && onB) glowColor = '#EC4899';
        else if (onG && onB) glowColor = '#06B6D4';
        else if (onR) glowColor = '#EF4444';
        else if (onG) glowColor = '#10B981';
        else if (onB) glowColor = '#3B82F6';

        // Outer Aura Glow during simulation
        if (isGlowing) {
          const glowGrad = ctx.createRadialGradient(pLed.px, pLed.py, 4, pLed.px, pLed.py, 32);
          glowGrad.addColorStop(0, glowColor);
          glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(pLed.px, pLed.py, 32, 0, Math.PI * 2);
          ctx.fill();
        }

        // Domed Milky Diffused Bulb
        ctx.fillStyle = isGlowing ? glowColor : '#E2E8F0';
        ctx.strokeStyle = isGlowing ? '#FFFFFF' : '#94A3B8';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(pLed.px, pLed.py, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 4 Metallic Leads (R, COM, G, B) down to breadboard
        const offsets = [-6, -2, 2, 6];
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.4;
        offsets.forEach((off) => {
          const lPos = project3D(compX + off, compY, compZ, width, height);
          ctx.beginPath();
          ctx.moveTo(pLed.px + off * 0.7, pLed.py + 7);
          ctx.lineTo(lPos.px, lPos.py);
          ctx.stroke();
        });
      } else if (comp.type === 'RESISTOR') {
        // 3D Axial Resistor with Authentic EIA Color Bands
        const r1 = project3D(compX - 16, compY - 8, compZ, width, height);
        const r2 = project3D(compX + 16, compY - 8, compZ, width, height);

        // Body Capsule
        ctx.strokeStyle = '#D97706'; // Tan ceramic body
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(r1.px, r1.py);
        ctx.lineTo(r2.px, r2.py);
        ctx.stroke();

        // 4 Authentic Color Bands calculated from resistance value
        const bands = getResistorColorBands(comp.value || String(comp.parameters?.resistance || 1000));
        const bandStep = (r2.px - r1.px) / 5;
        const bandStepY = (r2.py - r1.py) / 5;
        bands.forEach((bColor, bi) => {
          const bx = r1.px + bandStep * (bi + 1);
          const by = r1.py + bandStepY * (bi + 1);
          ctx.strokeStyle = bColor;
          ctx.lineWidth = 7.5;
          ctx.beginPath();
          ctx.moveTo(bx - 1.5, by - 3.5);
          ctx.lineTo(bx + 1.5, by + 3.5);
          ctx.stroke();
        });

        // Bent Lead Wires inserting into breadboard
        const l1 = project3D(compX - 22, compY, compZ, width, height);
        const l2 = project3D(compX + 22, compY, compZ, width, height);
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(r1.px, r1.py);
        ctx.lineTo(l1.px, l1.py);
        ctx.moveTo(r2.px, r2.py);
        ctx.lineTo(l2.px, l2.py);
        ctx.stroke();
      } else if (comp.type === 'POTENTIOMETER') {
        // 3D Potentiometer with Blue Casing and Rotatable Dial Knob
        const potP = project3D(compX, compY - 8, compZ, width, height);
        ctx.fillStyle = '#0284C7';
        ctx.strokeStyle = '#0369A1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(potP.px, potP.py, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Center silver dial knob
        ctx.fillStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.arc(potP.px, potP.py, 9, 0, Math.PI * 2);
        ctx.fill();

        // Wiper pointer notch
        const alpha = Number(comp.parameters?.position ?? 0.5);
        const angle = -Math.PI * 0.75 + alpha * (Math.PI * 1.5);
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(potP.px, potP.py);
        ctx.lineTo(potP.px + Math.cos(angle) * 8, potP.py + Math.sin(angle) * 8);
        ctx.stroke();

        // 3 Solder lug terminals
        [-14, 0, 14].forEach((tx, ti) => {
          const tp = project3D(compX + tx, compY, compZ + (ti === 1 ? 14 : 8), width, height);
          ctx.fillStyle = '#94A3B8';
          ctx.fillRect(tp.px - 2, tp.py - 2, 4, 4);
        });
      } else if (comp.type === 'CAPACITOR') {
        // 3D Radial Canister Capacitor
        const cBase = project3D(compX, compY, compZ, width, height);
        const cTop = project3D(compX, compY - 18, compZ, width, height);
        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(cTop.px - 8, cTop.py, 16, cBase.py - cTop.py, 4);
        ctx.fill();
        ctx.stroke();

        // Silver Top
        ctx.fillStyle = '#94A3B8';
        ctx.beginPath();
        ctx.arc(cTop.px, cTop.py + 2, 7.5, 0, Math.PI * 2);
        ctx.fill();

        // Negative Stripe
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(cTop.px - 8, cTop.py + 2, 4, cBase.py - cTop.py - 2);

        ctx.fillStyle = '#94A3B8';
        ctx.font = 'bold 7px monospace';
        ctx.fillText(comp.value || '10µF', cTop.px - 2, (cTop.py + cBase.py) / 2);
      } else if (comp.type === 'TIMER_555' || comp.type.startsWith('LOGIC_') || comp.type.includes('DIP8')) {
        // 3D DIP-8 Molded Epoxy Package
        drawBox3D(
          ctx,
          compX - 14, compY - 10, compZ - 12,
          compX + 14, compY - 2, compZ + 12,
          '#0F172A', '#090D16', '#1E293B', '#334155',
          proj
        );

        // Pin 1 Notch
        const notchP = project3D(compX, compY - 10, compZ - 12, width, height);
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.arc(notchP.px, notchP.py, 3, 0, Math.PI);
        ctx.fill();

        // Part Laser Engraving
        const txtP = project3D(compX, compY - 10, compZ, width, height);
        ctx.fillStyle = '#94A3B8';
        ctx.font = 'bold 7.5px monospace';
        ctx.fillText(comp.type === 'TIMER_555' ? 'NE555P' : comp.designator || comp.type.slice(0, 6), txtP.px - 14, txtP.py + 2);
      } else if (comp.type === 'PUSHBUTTON') {
        // 3D 6x6mm Tactile Pushbutton
        const pbP = project3D(compX, compY - 6, compZ, width, height);
        ctx.fillStyle = '#334155';
        ctx.fillRect(pbP.px - 10, pbP.py - 10, 20, 20);

        // Center Round Button Actuator
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(pbP.px, pbP.py, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (comp.type === 'SENSOR_ULTRASONIC') {
        // HC-SR04 Dual Aluminum Transducers
        const sP = project3D(compX, compY - 12, compZ, width, height);
        // Blue Mini PCB
        ctx.fillStyle = '#0284C7';
        ctx.fillRect(sP.px - 25, sP.py - 12, 50, 24);

        // TX & RX Cylinders
        ctx.fillStyle = '#CBD5E1';
        ctx.strokeStyle = '#64748B';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sP.px - 12, sP.py, 9, 0, Math.PI * 2);
        ctx.arc(sP.px + 12, sP.py, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // Generic 3D Integrated Circuit Package
        const icP = project3D(compX, compY - 6, compZ, width, height);
        ctx.fillStyle = isSelected ? '#1E293B' : '#0F172A';
        ctx.strokeStyle = isSelected ? '#10B981' : '#475569';
        ctx.lineWidth = 1.5;
        ctx.fillRect(icP.px - 18, icP.py - 12, 36, 24);
        ctx.strokeRect(icP.px - 18, icP.py - 12, 36, 24);

        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(comp.designator || comp.type.slice(0, 5), icP.px - 14, icP.py + 3);
      }

      // Draw Component Terminal Pins (Yellow / Gold dots)
      for (const pin of comp.pins) {
        const p3d = getComponentPinWorld3D(comp, pin.id);
        const proj = project3D(p3d.x, p3d.y, p3d.z, width, height);

        const isHovered =
          hoveredPin && hoveredPin.compId === comp.id && hoveredPin.pinId === pin.id;

        ctx.fillStyle = isHovered ? '#10B981' : '#FBBF24';
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(proj.px, proj.py, isHovered ? 4.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // 5. Render All 3D Flexible Jumper Wires (Catenary Curves)
    for (const wire of wires) {
      let p1_3d: { x: number; y: number; z: number } | null = null;
      let p2_3d: { x: number; y: number; z: number } | null = null;

      if (wire.fromCompId === 'BREADBOARD' || wire.fromCompId === 'bb') {
        p1_3d = getBreadboardHoleCoords(wire.fromPinId, BB_DEFAULT_X, BB_DEFAULT_Z);
      } else {
        const fromComp = components.find((c) => c.id === wire.fromCompId);
        if (fromComp) p1_3d = getComponentPinWorld3D(fromComp, wire.fromPinId);
      }

      if (wire.toCompId === 'BREADBOARD' || wire.toCompId === 'bb') {
        p2_3d = getBreadboardHoleCoords(wire.toPinId, BB_DEFAULT_X, BB_DEFAULT_Z);
      } else {
        const toComp = components.find((c) => c.id === wire.toCompId);
        if (toComp) p2_3d = getComponentPinWorld3D(toComp, wire.toPinId);
      }

      if (!p1_3d || !p2_3d) continue;

      const pt1 = project3D(p1_3d.x, p1_3d.y, p1_3d.z, width, height);
      const pt2 = project3D(p2_3d.x, p2_3d.y, p2_3d.z, width, height);

      // Mid-point with natural gravity parabolic arch / sag
      const midX = (p1_3d.x + p2_3d.x) / 2;
      const midY = Math.min(p1_3d.y, p2_3d.y) - 35; // Wire arch apex
      const midZ = (p1_3d.z + p2_3d.z) / 2;
      const ptMid = project3D(midX, midY, midZ, width, height);

      const isSelectedWire = wire.id === selectedWireId;
      const wireColor = isSelectedWire ? '#F59E0B' : wire.color || '#3B82F6';

      // 3D Shadow underneath the wire
      const shadowMid = project3D(midX, 0, midZ, width, height);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pt1.px, pt1.py + 4);
      ctx.quadraticCurveTo(shadowMid.px, shadowMid.py, pt2.px, pt2.py + 4);
      ctx.stroke();

      // Outer Selection Glow for selected wire
      if (isSelectedWire) {
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pt1.px, pt1.py);
        ctx.quadraticCurveTo(ptMid.px, ptMid.py, pt2.px, pt2.py);
        ctx.stroke();
      }

      // Main Flexible Curved Wire
      ctx.strokeStyle = wireColor;
      ctx.lineWidth = isSelectedWire ? 4 : 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pt1.px, pt1.py);
      ctx.quadraticCurveTo(ptMid.px, ptMid.py, pt2.px, pt2.py);
      ctx.stroke();

      // Black Dupont Connector Sleeves at terminal pins
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(pt1.px, pt1.py, 3.5, 0, Math.PI * 2);
      ctx.arc(pt2.px, pt2.py, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Prominent Red Delete Badge for selected wire in 3D
      if (isSelectedWire) {
        // Red badge circle
        ctx.fillStyle = '#EF4444';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ptMid.px, ptMid.py, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // White '✕'
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(ptMid.px - 4, ptMid.py - 4);
        ctx.lineTo(ptMid.px + 4, ptMid.py + 4);
        ctx.moveTo(ptMid.px + 4, ptMid.py - 4);
        ctx.lineTo(ptMid.px - 4, ptMid.py + 4);
        ctx.stroke();

        // Floating label
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(ptMid.px - 28, ptMid.py - 24, 56, 14);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('DEL WIRE', ptMid.px - 23, ptMid.py - 14);
      }

      // Active Simulation: Glowing Conventional Current Dots along 3D wire
      if (isSimulating) {
        const wCurrent = wireCurrents ? (wireCurrents[wire.id] ?? 0) : 1;
        if (Math.abs(wCurrent) > 0.0001) {
          const tPos = ((animTick * 0.02) % 1.0);
          // Evaluate quadratic bezier curve point at t
          const t = wCurrent < 0 ? 1 - tPos : tPos;
          const dotX = (1 - t) * (1 - t) * pt1.px + 2 * (1 - t) * t * ptMid.px + t * t * pt2.px;
          const dotY = (1 - t) * (1 - t) * pt1.py + 2 * (1 - t) * t * ptMid.py + t * t * pt2.py;

          ctx.fillStyle = '#FDE047';
          ctx.beginPath();
          ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 6. Active Wire Rubber-Band preview while dragging
    if (activeWireStart && hoveredPin) {
      const p1 = project3D(activeWireStart.x3d, activeWireStart.y3d, activeWireStart.z3d, width, height);
      ctx.strokeStyle = activeWireColor;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(p1.px, p1.py);
      ctx.lineTo(hoveredPin.screenX, hoveredPin.screenY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [
    components,
    wires,
    selectedCompId,
    selectedWireId,
    project3D,
    getComponentPinWorld3D,
    hoveredPin,
    hoveredHole,
    activeWireStart,
    activeWireColor,
    isSimulating,
    simulationStates,
    wireCurrents,
    gpioStates,
    animTick,
    hasBreadboard,
  ]);

  // Keep canvas size responsive and synchronized
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      renderFrame();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderFrame]);

  // Re-render when dependencies change
  useEffect(() => {
    renderFrame();
  }, [renderFrame]);

  // Component selection from 3D Tray
  const handleAddTemplate = (template: ComponentTemplate) => {
    const instance = createComponentInstance(template, 400, 300, components);
    onAddComponent(instance);
    setIsTrayOpen(false);
    toast.success(`Placed ${instance.label} in 3D Studio`);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#060B14] overflow-hidden select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        if (activeWireStart) {
          setActiveWireStart(null);
          toast.info('Cancelled wiring [Esc]');
          return;
        }

        // Check if right-clicked on an existing wire in 3D
        let hitWire: CircuitWire | null = null;
        for (const wire of wires) {
          let p1_3d: { x: number; y: number; z: number } | null = null;
          let p2_3d: { x: number; y: number; z: number } | null = null;

          if (wire.fromCompId === 'BREADBOARD' || wire.fromCompId === 'bb') {
            p1_3d = getBreadboardHoleCoords(wire.fromPinId, BB_DEFAULT_X, BB_DEFAULT_Z);
          } else {
            const fromComp = components.find((c) => c.id === wire.fromCompId);
            if (fromComp) p1_3d = getComponentPinWorld3D(fromComp, wire.fromPinId);
          }

          if (wire.toCompId === 'BREADBOARD' || wire.toCompId === 'bb') {
            p2_3d = getBreadboardHoleCoords(wire.toPinId, BB_DEFAULT_X, BB_DEFAULT_Z);
          } else {
            const toComp = components.find((c) => c.id === wire.toCompId);
            if (toComp) p2_3d = getComponentPinWorld3D(toComp, wire.toPinId);
          }

          if (!p1_3d || !p2_3d) continue;

          const pt1 = project3D(p1_3d.x, p1_3d.y, p1_3d.z, canvas.width, canvas.height);
          const pt2 = project3D(p2_3d.x, p2_3d.y, p2_3d.z, canvas.width, canvas.height);
          const midX = (p1_3d.x + p2_3d.x) / 2;
          const midY = Math.min(p1_3d.y, p2_3d.y) - 35;
          const midZ = (p1_3d.z + p2_3d.z) / 2;
          const ptMid = project3D(midX, midY, midZ, canvas.width, canvas.height);

          const dist = distanceToCurve(mx, my, pt1, ptMid, pt2);
          if (dist <= 18) {
            hitWire = wire;
            break;
          }
        }

        if (hitWire) {
          onSelectWire?.(hitWire.id);
          onSelectComponent?.(null);
          setWireContextMenu({
            wireId: hitWire.id,
            screenX: mx,
            screenY: my,
          });
          return;
        }

        setWireContextMenu(null);
        if (selectedWireId) {
          onSelectWire?.(null);
        } else if (selectedCompId) {
          onSelectComponent?.(null);
        }
      }}
    >
      {/* Interactive 3D Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating 3D Control Studio Bar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
        {/* Left: 3D Breadboard & Component Quick Placement */}
        <div className="flex items-center gap-2 pointer-events-auto bg-[#0B1528]/90 backdrop-blur-md border border-slate-800 p-1.5 rounded-lg shadow-xl">
          <button
            onClick={() => setIsTrayOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            + Add Device in 3D
          </button>

          <button
            onClick={() => setHasBreadboard((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer ${
              hasBreadboard ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'text-slate-400 hover:text-white'
            }`}
            title="Toggle Solderless Breadboard Base"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            Breadboard
          </button>
        </div>

        {/* Center: Jumper Wire Color Selector Palette */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-[#0B1528]/90 backdrop-blur-md border border-slate-800 p-1.5 rounded-lg shadow-xl text-xs">
          <span className="text-slate-400 font-mono text-[11px] px-1 flex items-center gap-1">
            <Palette className="w-3.5 h-3.5 text-sky-400" />
            Wire:
          </span>
          {WIRE_COLORS.map((col) => (
            <button
              key={col.hex}
              onClick={() => setActiveWireColor(col.hex)}
              className={`w-5 h-5 rounded-full transition-transform cursor-pointer relative ${
                activeWireColor === col.hex ? 'scale-125 ring-2 ring-white shadow-md' : 'hover:scale-110 opacity-80'
              }`}
              style={{ backgroundColor: col.hex }}
              title={col.name}
            >
              {activeWireColor === col.hex && (
                <Check className="w-3 h-3 text-white absolute inset-0 m-auto stroke-[3]" />
              )}
            </button>
          ))}
        </div>

        {/* Right: Camera Presets & Reset */}
        <div className="flex items-center gap-1 pointer-events-auto bg-[#0B1528]/90 backdrop-blur-md border border-slate-800 p-1 rounded-lg shadow-xl text-xs">
          <button
            onClick={() => setCameraPreset('iso')}
            className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded font-mono text-[11px] cursor-pointer"
            title="Isometric 3D Perspective"
          >
            3D Orbit
          </button>
          <button
            onClick={() => setCameraPreset('top')}
            className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded font-mono text-[11px] cursor-pointer"
            title="Top-Down Breadboard View"
          >
            Top
          </button>
          <button
            onClick={() => setCameraPreset('front')}
            className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded font-mono text-[11px] cursor-pointer"
            title="Front Elevation Angle"
          >
            Front
          </button>
          <button
            onClick={() => setCameraPreset('side')}
            className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded font-mono text-[11px] cursor-pointer"
            title="Side Profile View"
          >
            Side
          </button>
          <button
            onClick={() => setCameraPreset('reset')}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
            title="Reset Camera Transform"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating 3D Device Tray Drawer Modal */}
      {isTrayOpen && (
        <div className="absolute top-16 left-3 w-84 bg-[#0B1528]/95 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl p-3 z-30 flex flex-col gap-2 max-h-[75vh] overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Select 3D Component to Place
            </span>
            <button
              onClick={() => setIsTrayOpen(false)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer px-1.5 py-0.5 rounded hover:bg-slate-800"
            >
              ✕
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-mono scrollbar-none">
            {['all', 'microcontrollers', 'passive', 'active', 'sensors', 'instruments'].map((cat) => (
              <button
                key={cat}
                onClick={() => setTrayCategory(cat)}
                className={`px-2 py-0.5 rounded capitalize whitespace-nowrap cursor-pointer ${
                  trayCategory === cat ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Component List */}
          <div className="overflow-y-auto space-y-1.5 pr-1 max-h-[55vh]">
            {COMPONENT_CATALOG.filter((item) => trayCategory === 'all' || item.category === trayCategory).map(
              (template) => (
                <div
                  key={template.type + template.name}
                  onClick={() => handleAddTemplate(template)}
                  className="p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">
                      {template.name}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">
                      {template.description}
                    </p>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Hovered Pin Info Tooltip */}
      {hoveredPin && (
        <div
          className="absolute pointer-events-none z-30 bg-slate-950/90 backdrop-blur-md border border-emerald-500/60 text-white px-2.5 py-1 rounded shadow-2xl text-[11px] font-mono flex items-center gap-1.5 transform -translate-x-1/2 -translate-y-8"
          style={{ left: hoveredPin.screenX, top: hoveredPin.screenY }}
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Pin: </span>
          <strong className="text-emerald-400">{hoveredPin.pinName}</strong>
        </div>
      )}

      {/* Hovered Breadboard Hole Tooltip */}
      {hoveredHole && !hoveredPin && (
        <div
          className="absolute pointer-events-none z-30 bg-slate-950/90 backdrop-blur-md border border-emerald-500/80 text-white px-2.5 py-1 rounded shadow-2xl text-[11px] font-mono flex items-center gap-1.5 transform -translate-x-1/2 -translate-y-8"
          style={{ left: hoveredHole.screenX, top: hoveredHole.screenY }}
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Hole: </span>
          <strong className="text-emerald-400">{hoveredHole.name}</strong>
        </div>
      )}

      {/* Interactive 3D Wire Control Floating HUD */}
      {selectedWireId && (() => {
        const selWire = wires.find((w) => w.id === selectedWireId);
        if (!selWire) return null;
        const fromComp = components.find((c) => c.id === selWire.fromCompId);
        const toComp = components.find((c) => c.id === selWire.toCompId);
        const fromName = fromComp?.label || (selWire.fromCompId === 'BREADBOARD' ? 'Breadboard' : 'Pin');
        const toName = toComp?.label || (selWire.toCompId === 'BREADBOARD' ? 'Breadboard' : 'Pin');
        const wCurrent = wireCurrents ? (wireCurrents[selWire.id] ?? 0) : 0;

        return (
          <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-[#0B1528]/95 backdrop-blur-xl border border-amber-500/60 p-2.5 px-4 rounded-xl shadow-2xl z-30 flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full shadow" style={{ backgroundColor: selWire.color || '#3B82F6' }} />
              <div>
                <span className="text-[10px] text-amber-400 block uppercase font-bold">Selected Jumper Wire</span>
                <span className="text-white text-xs">
                  <strong>{fromName}</strong> [{selWire.fromPinId}] ➔ <strong>{toName}</strong> [{selWire.toPinId}]
                </span>
              </div>
            </div>

            {isSimulating && (
              <div className="border-l border-slate-700 pl-3 text-[11px] text-slate-300">
                Current: <strong className="text-emerald-400">{(wCurrent * 1000).toFixed(2)} mA</strong>
              </div>
            )}

            {/* Disconnect Endpoints and Re-route */}
            <div className="flex items-center gap-1.5 border-l border-slate-700 pl-3">
              <button
                onClick={() => handleDisconnectStart(selWire)}
                className="px-2.5 py-1.5 bg-sky-950/80 hover:bg-sky-850 border border-sky-600/70 text-sky-200 hover:text-white rounded font-semibold flex items-center gap-1 text-[11px] shadow transition-all cursor-pointer"
                title={`Disconnect from ${fromComp?.label || 'Pin 1'} and re-route in 3D`}
              >
                <Scissors className="w-3 h-3 text-sky-400" />
                <span>Disconnect Pin 1</span>
              </button>

              <button
                onClick={() => handleDisconnectEnd(selWire)}
                className="px-2.5 py-1.5 bg-sky-950/80 hover:bg-sky-850 border border-sky-600/70 text-sky-200 hover:text-white rounded font-semibold flex items-center gap-1 text-[11px] shadow transition-all cursor-pointer"
                title={`Disconnect from ${toComp?.label || 'Pin 2'} and re-route in 3D`}
              >
                <Scissors className="w-3 h-3 text-sky-400" />
                <span>Disconnect Pin 2</span>
              </button>

              <button
                onClick={() => handleUnplugWire(selWire.id)}
                className="px-2.5 py-1.5 bg-amber-950/80 hover:bg-amber-850 border border-amber-600/70 text-amber-200 hover:text-white rounded font-semibold flex items-center gap-1 text-[11px] shadow transition-all cursor-pointer"
                title="Disconnect both ends (unplug jumper wire)"
              >
                <Unplug className="w-3 h-3 text-amber-400" />
                <span>Disconnect Wire</span>
              </button>
            </div>

            {/* Primary Action: Delete Wire */}
            {onDeleteWire && (
              <button
                onClick={() => {
                  onDeleteWire(selectedWireId);
                  toast.success('Deleted wire in 3D');
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
                title="Delete this wire [Shortcut: Delete key]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Wire [Del]</span>
              </button>
            )}

            <button
              onClick={() => onSelectWire?.(null)}
              className="text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 text-xs cursor-pointer"
            >
              Deselect
            </button>
          </div>
        );
      })()}

      {/* 3D Wire Context Menu */}
      {wireContextMenu && (() => {
        const wire = wires.find((w) => w.id === wireContextMenu.wireId);
        if (!wire) return null;
        const fromComp = components.find((c) => c.id === wire.fromCompId);
        const toComp = components.find((c) => c.id === wire.toCompId);

        return (
          <div
            className="absolute z-40 bg-[#0B1528]/95 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl p-1.5 min-w-[210px] text-xs font-mono space-y-1"
            style={{
              left: Math.min(wireContextMenu.screenX, (containerRef.current?.clientWidth || 600) - 230),
              top: Math.min(wireContextMenu.screenY, (containerRef.current?.clientHeight || 400) - 210),
            }}
          >
            <div className="px-2 py-1 text-[10px] text-slate-400 uppercase font-bold border-b border-slate-800 flex items-center justify-between">
              <span>3D Jumper Options</span>
              <button
                onClick={() => setWireContextMenu(null)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <button
              onClick={() => {
                handleDisconnectStart(wire);
                setWireContextMenu(null);
              }}
              className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800/80 text-sky-400 hover:text-sky-300 rounded flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Scissors className="w-3.5 h-3.5 text-sky-400" />
              <span>Disconnect Pin 1 ({fromComp?.label || 'Start'})</span>
            </button>

            <button
              onClick={() => {
                handleDisconnectEnd(wire);
                setWireContextMenu(null);
              }}
              className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800/80 text-sky-400 hover:text-sky-300 rounded flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Scissors className="w-3.5 h-3.5 text-sky-400" />
              <span>Disconnect Pin 2 ({toComp?.label || 'End'})</span>
            </button>

            <button
              onClick={() => {
                handleUnplugWire(wire.id);
                setWireContextMenu(null);
              }}
              className="w-full text-left px-2.5 py-1.5 hover:bg-amber-950/60 text-amber-400 hover:text-amber-300 rounded flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Unplug className="w-3.5 h-3.5 text-amber-400" />
              <span>Disconnect / Unplug Wire</span>
            </button>

            <button
              onClick={() => {
                onDeleteWire?.(wire.id);
                setWireContextMenu(null);
                onSelectWire?.(null);
                toast.success('Deleted wire in 3D');
              }}
              className="w-full text-left px-2.5 py-1.5 hover:bg-red-950/60 text-red-400 hover:text-red-300 rounded flex items-center gap-2 cursor-pointer border-t border-slate-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Delete Wire [Del]</span>
            </button>
          </div>
        );
      })()}

      {/* Interactive Virtual Hardware Floating HUD */}
      {selectedCompId && (() => {
        const selComp = components.find((c) => c.id === selectedCompId);
        if (!selComp) return null;

        return (
          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 bg-[#0B1528]/95 backdrop-blur-xl border border-emerald-500/50 p-3 rounded-xl shadow-2xl z-20 flex items-center gap-4 text-xs font-mono">
            <div className="border-r border-slate-700 pr-3">
              <span className="text-[10px] text-emerald-400 block uppercase font-bold">Selected Device (3D)</span>
              <strong className="text-white text-xs">{selComp.label}</strong>
              <span className="text-slate-400 text-[10px] ml-1.5">({selComp.designator || selComp.type})</span>
            </div>

            {/* CAD Quick Actions: Rotate & Delete */}
            <div className="flex items-center gap-2 border-r border-slate-700 pr-3">
              {onUpdateComponent && (
                <button
                  onClick={() => {
                    onUpdateComponent({
                      ...selComp,
                      rotation: (((selComp.rotation || 0) + 90) % 360) as 0 | 90 | 180 | 270,
                    });
                    toast.info(`Rotated ${selComp.label}`);
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Rotate 90 degrees [R]"
                >
                  <RotateCw className="w-3 h-3 text-sky-400" />
                  <span>Rotate [R]</span>
                </button>
              )}
              {onDeleteComponent && (
                <button
                  onClick={() => {
                    onDeleteComponent(selComp.id);
                    toast.success(`Removed ${selComp.label}`);
                  }}
                  className="px-2.5 py-1 bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700 rounded font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Delete component [Delete]"
                >
                  <Trash2 className="w-3 h-3 text-red-300" />
                  <span>Delete [Del]</span>
                </button>
              )}
            </div>

            {/* Ultrasonic Distance Slider */}
            {selComp.type === 'SENSOR_ULTRASONIC' && onUpdateComponent && (
              <div className="flex items-center gap-2">
                <span className="text-slate-300">Target Obstacle:</span>
                <input
                  type="range"
                  min="2"
                  max="400"
                  value={Number(selComp.parameters?.distanceCm ?? 45)}
                  onChange={(e) => {
                    const dist = Number(e.target.value);
                    onUpdateComponent({
                      ...selComp,
                      parameters: { ...selComp.parameters, distanceCm: dist },
                    });
                  }}
                  className="w-36 accent-emerald-500 cursor-pointer"
                />
                <span className="text-emerald-400 font-bold min-w-[55px]">
                  {Number(selComp.parameters?.distanceCm ?? 45)} cm
                </span>
              </div>
            )}

            {/* DHT11 Temperature Slider */}
            {selComp.type === 'SENSOR_DHT11' && onUpdateComponent && (
              <div className="flex items-center gap-2">
                <span className="text-slate-300">Temp:</span>
                <input
                  type="range"
                  min="-10"
                  max="60"
                  value={Number(selComp.parameters?.temperatureC ?? 24)}
                  onChange={(e) => {
                    const temp = Number(e.target.value);
                    onUpdateComponent({
                      ...selComp,
                      parameters: { ...selComp.parameters, temperatureC: temp },
                    });
                  }}
                  className="w-24 accent-sky-500 cursor-pointer"
                />
                <span className="text-sky-400 font-bold">{Number(selComp.parameters?.temperatureC ?? 24)}°C</span>
              </div>
            )}

            {/* LDR Light Level Slider */}
            {selComp.type === 'SENSOR_LDR' && onUpdateComponent && (
              <div className="flex items-center gap-2">
                <span className="text-slate-300">Ambient Light:</span>
                <input
                  type="range"
                  min="10"
                  max="2000"
                  value={Number(selComp.parameters?.lightLux ?? 350)}
                  onChange={(e) => {
                    const lux = Number(e.target.value);
                    const rCalc = Math.round(500000 / Math.max(lux, 1));
                    onUpdateComponent({
                      ...selComp,
                      parameters: { ...selComp.parameters, lightLux: lux, lightResistance: rCalc },
                    });
                  }}
                  className="w-28 accent-amber-500 cursor-pointer"
                />
                <span className="text-amber-400 font-bold">{Number(selComp.parameters?.lightLux ?? 350)} Lux</span>
              </div>
            )}

            {/* Potentiometer Wiper Dial */}
            {selComp.type === 'POTENTIOMETER' && onUpdateComponent && (
              <div className="flex items-center gap-2">
                <span className="text-slate-300">Wiper:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(Number(selComp.parameters?.wiperPosition ?? 0.5) * 100)}
                  onChange={(e) => {
                    const pos = Number(e.target.value) / 100;
                    onUpdateComponent({
                      ...selComp,
                      parameters: { ...selComp.parameters, wiperPosition: pos, resistance: Math.round(pos * 10000) },
                    });
                  }}
                  className="w-28 accent-purple-500 cursor-pointer"
                />
                <span className="text-purple-400 font-bold">
                  {Math.round(Number(selComp.parameters?.wiperPosition ?? 0.5) * 100)}%
                </span>
              </div>
            )}

            {/* Tactile Pushbutton */}
            {selComp.type === 'PUSHBUTTON' && onUpdateComponent && (
              <button
                onClick={() => {
                  const isClosed = Boolean(selComp.parameters?.closed);
                  onUpdateComponent({
                    ...selComp,
                    parameters: { ...selComp.parameters, closed: !isClosed },
                  });
                }}
                className={`px-3 py-1 rounded font-bold transition-all cursor-pointer ${
                  selComp.parameters?.closed ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {selComp.parameters?.closed ? 'PRESSED [CLOSED]' : 'RELEASED [OPEN]'}
              </button>
            )}

            {/* Toggle Switch */}
            {selComp.type === 'SWITCH_SPST' && onUpdateComponent && (
              <button
                onClick={() => {
                  const isClosed = Boolean(selComp.parameters?.closed);
                  onUpdateComponent({
                    ...selComp,
                    parameters: { ...selComp.parameters, closed: !isClosed },
                  });
                }}
                className={`px-3 py-1 rounded font-bold transition-all cursor-pointer ${
                  selComp.parameters?.closed ? 'bg-emerald-600 text-white' : 'bg-rose-900/60 text-rose-300'
                }`}
              >
                Switch: {selComp.parameters?.closed ? 'ON (CLOSED)' : 'OFF (OPEN)'}
              </button>
            )}

            {/* Servo Angle */}
            {selComp.type === 'ACTUATOR_SERVO_SG90' && onUpdateComponent && (
              <div className="flex items-center gap-2">
                <span className="text-slate-300">Servo Angle:</span>
                <input
                  type="range"
                  min="0"
                  max="180"
                  value={Number(selComp.parameters?.angleDeg ?? 90)}
                  onChange={(e) => {
                    const ang = Number(e.target.value);
                    onUpdateComponent({
                      ...selComp,
                      parameters: { ...selComp.parameters, angleDeg: ang },
                    });
                  }}
                  className="w-28 accent-sky-500 cursor-pointer"
                />
                <span className="text-sky-400 font-bold">{Number(selComp.parameters?.angleDeg ?? 90)}°</span>
              </div>
            )}

            {/* Resistor Value update */}
            {selComp.type === 'RESISTOR' && onUpdateComponent && (
              <div className="flex items-center gap-2">
                <span className="text-slate-300">Resistance:</span>
                <input
                  type="number"
                  min="1"
                  max="1000000"
                  value={Number(selComp.parameters?.resistance ?? 1000)}
                  onChange={(e) => {
                    const r = Number(e.target.value);
                    onUpdateComponent({
                      ...selComp,
                      value: `${r}Ω`,
                      parameters: { ...selComp.parameters, resistance: r },
                    });
                  }}
                  className="w-24 px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-amber-400 font-bold"
                />
                <span className="text-slate-400">Ω</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Footer Instructions Badge */}
      <div className="absolute bottom-3 left-3 bg-[#0B1528]/80 backdrop-blur-sm border border-slate-800 px-3 py-1.5 rounded-lg text-slate-400 font-mono text-[11px] flex items-center gap-4 pointer-events-none z-10">
        <span>
          <strong className="text-slate-200">Drag Comp:</strong> Move in 3D
        </span>
        <span>
          <strong className="text-amber-400">Click Wire:</strong> Select / Delete
        </span>
        <span>
          <strong className="text-slate-200">Rotate:</strong> [R]
        </span>
        <span>
          <strong className="text-red-400">Delete:</strong> [Del]
        </span>
        <span>
          <strong className="text-slate-200">Orbit:</strong> Left Drag
        </span>
        <span>
          <strong className="text-slate-200">Pan:</strong> Shift + Drag
        </span>
        <span>
          <strong className="text-emerald-400">Connect:</strong> Click Pin
        </span>
      </div>
    </div>
  );
}
