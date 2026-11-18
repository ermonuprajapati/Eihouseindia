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
} from 'lucide-react';
import { toast } from 'sonner';

interface Virtual3dStudioProps {
  components: CircuitComponent[];
  wires: CircuitWire[];
  selectedCompId: string | null;
  onSelectComponent?: (id: string | null) => void;
  onAddComponent: (comp: CircuitComponent) => void;
  onUpdateComponent?: (updated: CircuitComponent) => void;
  onUpdateComponentPosition?: (id: string, x: number, y: number) => void;
  onDeleteComponent?: (id: string) => void;
  onAddWire: (wire: Omit<CircuitWire, 'id'>) => void;
  onDeleteWire?: (wireId: string) => void;
  isSimulating: boolean;
  simulationStates: Record<string, { voltage: number; current: number; on?: boolean }>;
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
  onSelectComponent,
  onAddComponent,
  onUpdateComponent,
  onAddWire,
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

  // Mouse drag tracking
  const [isOrbiting, setIsOrbiting] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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

  // Animation pulse offset for current flow
  const [animTick, setAnimTick] = useState<number>(0);

  // 3D Quick Add Drawer State
  const [isTrayOpen, setIsTrayOpen] = useState<boolean>(false);
  const [trayCategory, setTrayCategory] = useState<string>('all');

  // Breadboard visual presence state
  const [hasBreadboard, setHasBreadboard] = useState<boolean>(true);

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
      const pin = comp.pins.find((p) => p.id === pinId);
      const pinName = pin ? pin.name : pinId;

      // Component 3D origin on workbench / breadboard
      const compX = (comp.x - 400) * 0.7;
      const compZ = (comp.y - 300) * 0.7;
      const compY = 0; // Surface level

      // Board / IC specific pin layout offsets
      let ox = (pin?.x || 0) * 0.7;
      let oz = (pin?.y || 0) * 0.7;
      let oy = -6; // Height above board

      if (comp.type.includes('ARDUINO_UNO')) {
        oy = -14; // Header socket top
        if (pinId === '5V') { ox = -38; oz = 32; }
        else if (pinId === 'GND') { ox = -26; oz = 32; }
        else if (pinId === 'A0') { ox = 8; oz = 32; }
        else if (pinId === 'A1') { ox = 18; oz = 32; }
        else if (pinId === 'D13') { ox = -38; oz = -32; }
        else if (pinId === 'D2') { ox = 28; oz = -32; }
      } else if (comp.type.includes('MEGA')) {
        oy = -14;
        if (pinId === '5V') { ox = -50; oz = 35; }
        else if (pinId === 'GND') { ox = -35; oz = 35; }
        else if (pinId === 'D13') { ox = -50; oz = -35; }
      } else if (comp.type.includes('ESP32')) {
        oy = -12;
        if (pinId === '3V3') { ox = -28; oz = -30; }
        else if (pinId === 'GND') { ox = -28; oz = -18; }
        else if (pinId === 'IO2' || pinId === 'IO48') { ox = 28; oz = -18; }
      } else if (comp.type.includes('PICO')) {
        oy = -10;
        if (pinId === '3V3') { ox = -25; oz = -35; }
        else if (pinId === 'GND') { ox = -25; oz = -23; }
        else if (pinId.includes('GP25')) { ox = 25; oz = -23; }
      } else if (comp.type === 'LED') {
        oy = -18; // LED dome pin lead top
        ox = pinId === 'a' ? -6 : 6;
        oz = 0;
      } else if (comp.type === 'RESISTOR') {
        oy = -8;
        ox = pinId === '1' ? -20 : 20;
        oz = 0;
      } else if (comp.type === 'PUSHBUTTON') {
        oy = -6;
        ox = pinId === '1' ? -12 : 12;
        oz = 0;
      } else if (comp.type === 'TIMER_555' || comp.type.startsWith('LOGIC_')) {
        oy = -8;
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
  // Canvas Mouse & Interaction Handlers
  // --------------------------------------------------------------------------
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.shiftKey) {
      // Pan
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else if (e.button === 0) {
      // Left click: check if clicked on a pin
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
            toast.info(`Wiring from ${comp.label} [${hoveredPin.pinName}]... Click another pin to connect.`);
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
            toast.success(`Connected jumper wire (${activeWireStart.pinName} -> ${hoveredPin.pinName})`);
          }
          setActiveWireStart(null);
        }
        return;
      }

      // Check if clicked on a component body to select it
      const canvas = canvasRef.current;
      if (canvas && onSelectComponent) {
        let clickedCompId: string | null = null;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        for (const comp of components) {
          const cx = (comp.x - 400) * 0.7;
          const cz = (comp.y - 300) * 0.7;
          const proj = project3D(cx, 0, cz, canvas.width, canvas.height);
          if (Math.hypot(proj.px - mx, proj.py - my) < 35) {
            clickedCompId = comp.id;
            break;
          }
        }
        if (clickedCompId) {
          onSelectComponent(clickedCompId);
          return;
        }
      }

      // If clicked on canvas background, start 3D Orbit
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

    if (isOrbiting) {
      const dx = (e.clientX - dragStart.x) * 0.007;
      const dy = (e.clientY - dragStart.y) * 0.007;
      setRotY((prev) => prev + dx);
      setRotX((prev) => Math.max(0.1, Math.min(1.4, prev - dy)));
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Pin hover detection: Find nearest pin in projected screen space within 15px radius
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
  };

  const handleMouseUp = () => {
    setIsOrbiting(false);
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.max(0.4, Math.min(3.0, prev * factor)));
  };

  // Preset Camera Angles
  const setCameraPreset = (preset: 'iso' | 'top' | 'front' | 'reset') => {
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

    // 3. 3D Full-Size Solderless Breadboard (830 tie-points)
    if (hasBreadboard) {
      const bbW = 220;
      const bbH = 9;
      const bbD = 130;
      const bbX = -40;
      const bbZ = -10;

      // Breadboard Body Base & Bevel (ABS Plastic Eggshell White)
      const c1 = project3D(bbX - bbW / 2, 0, bbZ - bbD / 2, width, height);
      const c2 = project3D(bbX + bbW / 2, 0, bbZ - bbD / 2, width, height);
      const c3 = project3D(bbX + bbW / 2, 0, bbZ + bbD / 2, width, height);
      const c4 = project3D(bbX - bbW / 2, 0, bbZ + bbD / 2, width, height);

      const b1 = project3D(bbX - bbW / 2, bbH, bbZ - bbD / 2, width, height);
      const b2 = project3D(bbX + bbW / 2, bbH, bbZ - bbD / 2, width, height);
      const b3 = project3D(bbX + bbW / 2, bbH, bbZ + bbD / 2, width, height);
      const b4 = project3D(bbX - bbW / 2, bbH, bbZ + bbD / 2, width, height);

      // Shadow underneath breadboard
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.moveTo(b1.px + 4, b1.py + 4);
      ctx.lineTo(b2.px + 4, b2.py + 4);
      ctx.lineTo(b3.px + 4, b3.py + 4);
      ctx.lineTo(b4.px + 4, b4.py + 4);
      ctx.closePath();
      ctx.fill();

      // Breadboard Top Face (Beige / Off-White ABS)
      ctx.fillStyle = '#F1F5F9';
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(c1.px, c1.py);
      ctx.lineTo(c2.px, c2.py);
      ctx.lineTo(c3.px, c3.py);
      ctx.lineTo(c4.px, c4.py);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Front & Side Bevels
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.moveTo(c4.px, c4.py);
      ctx.lineTo(c3.px, c3.py);
      ctx.lineTo(b3.px, b3.py);
      ctx.lineTo(b4.px, b4.py);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Central IC Divider Trench / Groove
      const tr1 = project3D(bbX - bbW / 2 + 10, -0.5, bbZ, width, height);
      const tr2 = project3D(bbX + bbW / 2 - 10, -0.5, bbZ, width, height);
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(tr1.px, tr1.py);
      ctx.lineTo(tr2.px, tr2.py);
      ctx.stroke();

      // Top & Bottom Power Rails (+ Red, - Blue Lines)
      const rTop1 = project3D(bbX - bbW / 2 + 15, -0.2, bbZ - bbD / 2 + 12, width, height);
      const rTop2 = project3D(bbX + bbW / 2 - 15, -0.2, bbZ - bbD / 2 + 12, width, height);
      ctx.strokeStyle = '#EF4444'; // Red +
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(rTop1.px, rTop1.py);
      ctx.lineTo(rTop2.px, rTop2.py);
      ctx.stroke();

      const bTop1 = project3D(bbX - bbW / 2 + 15, -0.2, bbZ - bbD / 2 + 22, width, height);
      const bTop2 = project3D(bbX + bbW / 2 - 15, -0.2, bbZ - bbD / 2 + 22, width, height);
      ctx.strokeStyle = '#3B82F6'; // Blue -
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(bTop1.px, bTop1.py);
      ctx.lineTo(bTop2.px, bTop2.py);
      ctx.stroke();

      // Breadboard Terminal Sockets / Pin Holes
      ctx.fillStyle = '#334155';
      const cols = 28;
      const startX = bbX - bbW / 2 + 18;
      const stepX = (bbW - 36) / cols;

      for (let ci = 0; ci < cols; ci += 2) {
        const hx = startX + ci * stepX;
        // Upper section holes
        for (let ri = -20; ri <= -8; ri += 6) {
          const hp = project3D(hx, -0.8, bbZ + ri, width, height);
          ctx.beginPath();
          ctx.arc(hp.px, hp.py, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
        // Lower section holes
        for (let ri = 8; ri <= 20; ri += 6) {
          const hp = project3D(hx, -0.8, bbZ + ri, width, height);
          ctx.beginPath();
          ctx.arc(hp.px, hp.py, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 4. Render All 3D Components
    for (const comp of components) {
      const isSelected = comp.id === selectedCompId;
      const compX = (comp.x - 400) * 0.7;
      const compZ = (comp.y - 300) * 0.7;
      const compY = 0;
      const simState = simulationStates[comp.id];

      // Draw Component Base Footprint / Model
      if (comp.type.includes('ARDUINO_UNO')) {
        // ARDUINO UNO R3 (68.6mm x 53.4mm Blue PCB)
        const bw = 85;
        const bd = 65;
        const p1 = project3D(compX - bw / 2, compY - 2, compZ - bd / 2, width, height);
        const p2 = project3D(compX + bw / 2, compY - 2, compZ - bd / 2, width, height);
        const p3 = project3D(compX + bw / 2, compY - 2, compZ + bd / 2, width, height);
        const p4 = project3D(compX - bw / 2, compY - 2, compZ + bd / 2, width, height);

        // PCB Body
        ctx.fillStyle = isSelected ? '#0284C7' : '#0369A1';
        ctx.strokeStyle = isSelected ? '#38BDF8' : '#075985';
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.lineTo(p3.px, p3.py);
        ctx.lineTo(p4.px, p4.py);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Silver USB-B Port
        const usbP = project3D(compX - bw / 2 + 8, compY - 8, compZ - bd / 2 + 14, width, height);
        ctx.fillStyle = '#CBD5E1';
        ctx.fillRect(usbP.px - 6, usbP.py - 6, 12, 10);

        // Black DC Barrel Jack
        const dcP = project3D(compX - bw / 2 + 8, compY - 10, compZ + bd / 2 - 14, width, height);
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(dcP.px - 7, dcP.py - 7, 14, 12);

        // ATmega328P DIP IC
        const icP = project3D(compX + 8, compY - 5, compZ + 5, width, height);
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(icP.px - 14, icP.py - 5, 28, 10);

        // Built-in Pin 13 LED
        const led13PinState = gpioStates && gpioStates[13]?.value === 1;
        const ledP = project3D(compX - 10, compY - 4, compZ - 10, width, height);
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
        ctx.font = 'bold 9px monospace';
        ctx.fillText('ARDUINO UNO', labelP.px - 32, labelP.py);
      } else if (comp.type.includes('ESP32')) {
        // ESP32 DevKit (Black PCB + Metal RF Shield)
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

        // Metallic RF Shield
        const rfP = project3D(compX + 6, compY - 6, compZ, width, height);
        ctx.fillStyle = '#94A3B8';
        ctx.fillRect(rfP.px - 14, rfP.py - 10, 28, 20);

        const lbl = project3D(compX - 18, compY - 3, compZ, width, height);
        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('ESP32', lbl.px, lbl.py + 3);
      } else if (comp.type.includes('PICO')) {
        // Raspberry Pi Pico (Signature Green PCB)
        const bw = 68;
        const bd = 28;
        const p1 = project3D(compX - bw / 2, compY - 2, compZ - bd / 2, width, height);
        const p2 = project3D(compX + bw / 2, compY - 2, compZ - bd / 2, width, height);
        const p3 = project3D(compX + bw / 2, compY - 2, compZ + bd / 2, width, height);
        const p4 = project3D(compX - bw / 2, compY - 2, compZ + bd / 2, width, height);

        ctx.fillStyle = '#059669';
        ctx.strokeStyle = '#047857';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.lineTo(p3.px, p3.py);
        ctx.lineTo(p4.px, p4.py);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        const lbl = project3D(compX, compY - 4, compZ, width, height);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('RP2040 PICO', lbl.px - 26, lbl.py + 3);
      } else if (comp.type === 'LED') {
        // 3D 5mm Diffused LED Bulb
        const pLed = project3D(compX, compY - 14, compZ, width, height);
        const isGlowing = isSimulating && simState && (simState.on || simState.voltage > 1.8);
        const colorName = String(comp.parameters?.color || 'Red').toLowerCase();
        const baseColor = colorName.includes('blue')
          ? '#3B82F6'
          : colorName.includes('green')
          ? '#10B981'
          : colorName.includes('yellow')
          ? '#F59E0B'
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
      } else if (comp.type === 'RESISTOR') {
        // 3D Axial Resistor with Color Bands
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

        // Bent Lead Wires
        const l1 = project3D(compX - 22, compY, compZ, width, height);
        const l2 = project3D(compX + 22, compY, compZ, width, height);
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(r1.px, r1.py);
        ctx.lineTo(l1.px, l1.py);
        ctx.moveTo(r2.px, r2.py);
        ctx.lineTo(l2.px, l2.py);
        ctx.stroke();
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
      const fromComp = components.find((c) => c.id === wire.fromCompId);
      const toComp = components.find((c) => c.id === wire.toCompId);
      if (!fromComp || !toComp) continue;

      const p1_3d = getComponentPinWorld3D(fromComp, wire.fromPinId);
      const p2_3d = getComponentPinWorld3D(toComp, wire.toPinId);

      const pt1 = project3D(p1_3d.x, p1_3d.y, p1_3d.z, width, height);
      const pt2 = project3D(p2_3d.x, p2_3d.y, p2_3d.z, width, height);

      // Mid-point with natural gravity parabolic arch / sag
      const midX = (p1_3d.x + p2_3d.x) / 2;
      const midY = Math.min(p1_3d.y, p2_3d.y) - 35; // Wire arch apex
      const midZ = (p1_3d.z + p2_3d.z) / 2;
      const ptMid = project3D(midX, midY, midZ, width, height);

      const wireColor = wire.color || '#3B82F6';

      // 3D Shadow underneath the wire
      const shadowMid = project3D(midX, 0, midZ, width, height);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pt1.px, pt1.py + 4);
      ctx.quadraticCurveTo(shadowMid.px, shadowMid.py, pt2.px, pt2.py + 4);
      ctx.stroke();

      // Main Flexible Curved Wire
      ctx.strokeStyle = wireColor;
      ctx.lineWidth = 3;
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
    project3D,
    getComponentPinWorld3D,
    hoveredPin,
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
            className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded font-mono text-[11px] cursor-pointer"
            title="Isometric 3D Perspective"
          >
            3D Orbit
          </button>
          <button
            onClick={() => setCameraPreset('top')}
            className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded font-mono text-[11px] cursor-pointer"
            title="Top-Down Breadboard View"
          >
            Top View
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

      {/* Interactive Virtual Hardware Floating HUD */}
      {selectedCompId && (() => {
        const selComp = components.find((c) => c.id === selectedCompId);
        if (!selComp || !onUpdateComponent) return null;

        const isSensor = selComp.category === 'sensors';
        const isActuator = selComp.category === 'actuators';
        const isPassive = selComp.type === 'POTENTIOMETER' || selComp.type === 'PUSHBUTTON' || selComp.type === 'SWITCH_SPST' || selComp.type === 'RESISTOR';

        if (!isSensor && !isActuator && !isPassive) return null;

        return (
          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 bg-[#0B1528]/95 backdrop-blur-xl border border-emerald-500/50 p-3 rounded-xl shadow-2xl z-20 flex items-center gap-4 text-xs font-mono">
            <div className="border-r border-slate-700 pr-3">
              <span className="text-[10px] text-emerald-400 block uppercase font-bold">Interactive Hardware</span>
              <strong className="text-white text-xs">{selComp.label}</strong>
            </div>

            {/* Ultrasonic Distance Slider */}
            {selComp.type === 'SENSOR_ULTRASONIC' && (
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
            {selComp.type === 'SENSOR_DHT11' && (
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
            {selComp.type === 'SENSOR_LDR' && (
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
            {selComp.type === 'POTENTIOMETER' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-300">Wiper Position:</span>
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
            {selComp.type === 'PUSHBUTTON' && (
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
            {selComp.type === 'SWITCH_SPST' && (
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
            {selComp.type === 'ACTUATOR_SERVO_SG90' && (
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

            {/* Resistor Value update (Test 4) */}
            {selComp.type === 'RESISTOR' && (
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
          <strong className="text-slate-200">Left Drag:</strong> 3D Orbit
        </span>
        <span>
          <strong className="text-slate-200">Shift + Drag:</strong> Pan
        </span>
        <span>
          <strong className="text-slate-200">Wheel:</strong> Zoom
        </span>
        <span>
          <strong className="text-emerald-400">Click Pin:</strong> Connect Wire
        </span>
      </div>
    </div>
  );
}
