'use client';

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { CircuitComponent, CircuitWire, WireInteractionMode, WireRoutingStyle } from '@/modules/engineering-lab/types';
import {
  RotateCw,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FlipHorizontal,
  MousePointer,
  Spline,
  Hand,
  Sparkles,
  AlertOctagon,
  Copy,
  Ruler,
  Scissors,
  Tag,
  CornerDownRight,
} from 'lucide-react';
import { SchematicSymbol } from './SchematicSymbols';

interface SchematicCanvasProps {
  components: CircuitComponent[];
  wires: CircuitWire[];
  selectedCompId: string | null;
  selectedWireId?: string | null;
  onSelectComponent: (id: string | null) => void;
  onSelectWire?: (id: string | null) => void;
  onUpdateComponentPosition: (id: string, x: number, y: number) => void;
  onRotateComponent: (id: string) => void;
  onMirrorComponent?: (id: string) => void;
  onDeleteComponent: (id: string) => void;
  onDuplicateComponent?: (id: string) => void;
  onCopyComponent?: (id: string) => void;
  onPasteComponent?: (atX?: number, atY?: number) => void;
  onAddWire: (wire: Omit<CircuitWire, 'id'>) => void;
  onDeleteWire: (wireId: string) => void;
  onUpdateWire?: (wire: CircuitWire) => void;
  onClearSheet?: () => void;
  isSimulating: boolean;
  simulationStates: Record<string, { voltage: number; current: number; on?: boolean; onRed?: boolean; onGreen?: boolean; onBlue?: boolean }>;
  wireCurrents?: Record<string, number>;
}

/**
 * Calculates rotated and mirrored world coordinates for a component's pin terminal.
 */
export function getPinWorldCoord(
  comp: CircuitComponent,
  pin: { x: number; y: number }
): { x: number; y: number } {
  let px = pin.x;
  const py = pin.y;
  if (comp.mirrored) {
    px = -px;
  }
  const rad = ((comp.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rx = Math.round(px * cos - py * sin);
  const ry = Math.round(px * sin + py * cos);
  return { x: comp.x + rx, y: comp.y + ry };
}

/**
 * Calculates polyline SVG path with optional intermediate waypoints and routing geometry styles.
 * Supports:
 * - 'orthogonal' (standard 90° Manhattan EDA routing)
 * - 'diagonal45' (professional 45° chamfered corner routing)
 * - 'straight' (direct pin-to-pin vector line)
 */
export function computeWireSvgPath(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  waypoints?: { x: number; y: number }[],
  style: WireRoutingStyle = 'orthogonal'
): string {
  const points = [p1, ...(waypoints || []), p2];
  if (points.length < 2) return '';

  if (style === 'straight') {
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  }

  if (style === 'diagonal45') {
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (Math.abs(dx) === 0 || Math.abs(dy) === 0) {
        d += ` L ${b.x} ${b.y}`;
      } else {
        const signX = Math.sign(dx);
        const signY = Math.sign(dy);
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        if (absX >= absY) {
          const cornerX = a.x + signX * (absX - absY);
          d += ` L ${cornerX} ${a.y} L ${b.x} ${b.y}`;
        } else {
          const cornerY = a.y + signY * (absY - absX);
          d += ` L ${a.x} ${cornerY} L ${b.x} ${b.y}`;
        }
      }
    }
    return d;
  }

  // Standard Manhattan orthogonal path
  if (waypoints && waypoints.length > 0) {
    let d = `M ${p1.x} ${p1.y}`;
    for (const pt of waypoints) {
      d += ` L ${pt.x} ${pt.y}`;
    }
    d += ` L ${p2.x} ${p2.y}`;
    return d;
  }
  const midX = (p1.x + p2.x) / 2;
  return `M ${p1.x} ${p1.y} L ${midX} ${p1.y} L ${midX} ${p2.y} L ${p2.x} ${p2.y}`;
}

export function SchematicCanvas({
  components,
  wires,
  selectedCompId,
  selectedWireId: propSelectedWireId,
  onSelectComponent,
  onSelectWire,
  onUpdateComponentPosition,
  onRotateComponent,
  onMirrorComponent,
  onDeleteComponent,
  onDuplicateComponent,
  onCopyComponent,
  onPasteComponent,
  onAddWire,
  onDeleteWire,
  onUpdateWire,
  onClearSheet,
  isSimulating,
  simulationStates,
  wireCurrents,
}: SchematicCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Active Tool Mode & Wire Routing Style
  const [toolMode, setToolMode] = useState<WireInteractionMode>('select');
  const [activeRoutingStyle, setActiveRoutingStyle] = useState<WireRoutingStyle>('orthogonal');

  // Zoom & Pan transforms
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Dragging component
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Wiring in progress with intermediate waypoints
  const [activeWireStart, setActiveWireStart] = useState<{ compId: string; pinId: string; x: number; y: number } | null>(null);
  const [activeWaypoints, setActiveWaypoints] = useState<{ x: number; y: number }[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Waypoint dragging on existing wire
  const [draggingWaypoint, setDraggingWaypoint] = useState<{ wireId: string; pointIndex: number } | null>(null);

  // Measure Tool Telemetry
  const [measureStart, setMeasureStart] = useState<{ x: number; y: number; label?: string; voltage?: number } | null>(null);
  const [measureResult, setMeasureResult] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    distanceMm: number;
    deltaX: number;
    deltaY: number;
    deltaV?: number;
    label1?: string;
    label2?: string;
  } | null>(null);

  // Modal: Inline Net Label Editor
  const [editingNetLabelWireId, setEditingNetLabelWireId] = useState<string | null>(null);
  const [tempNetLabel, setTempNetLabel] = useState<string>('');

  // Current flow animation tick
  const [animOffset, setAnimOffset] = useState(0);

  // Selected Wire State & Context Menu
  const [localSelectedWireId, setLocalSelectedWireId] = useState<string | null>(null);
  const selectedWireId = propSelectedWireId !== undefined ? propSelectedWireId : localSelectedWireId;
  const setWireSelected = useCallback((id: string | null) => {
    setLocalSelectedWireId(id);
    onSelectWire?.(id);
  }, [onSelectWire]);
  const [wireContextMenu, setWireContextMenu] = useState<{
    x: number;
    y: number;
    wireId: string;
    canvasX: number;
    canvasY: number;
  } | null>(null);

  // Net Highlight state
  const [highlightedNetId, setHighlightedNetId] = useState<string | null>(null);

  // Clear Sheet confirmation modal
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        if (selectedCompId && onDuplicateComponent) {
          e.preventDefault();
          onDuplicateComponent(selectedCompId);
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        if (selectedCompId && onCopyComponent) {
          e.preventDefault();
          onCopyComponent(selectedCompId);
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        if (onPasteComponent) {
          e.preventDefault();
          onPasteComponent(mousePos.x, mousePos.y);
        }
      } else if (!e.ctrlKey && !e.metaKey && (e.key === 'r' || e.key === 'R')) {
        if (selectedCompId) {
          e.preventDefault();
          onRotateComponent(selectedCompId);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedWireId) {
          onDeleteWire(selectedWireId);
          setWireSelected(null);
          setWireContextMenu(null);
        } else if (selectedCompId) {
          onDeleteComponent(selectedCompId);
        }
      } else if (e.key === 'Escape') {
        setWireSelected(null);
        setActiveWireStart(null);
        setActiveWaypoints([]);
        setWireContextMenu(null);
        setHighlightedNetId(null);
        setMeasureStart(null);
        setMeasureResult(null);
        setDraggingWaypoint(null);
        setEditingNetLabelWireId(null);
      } else if (e.key === 'v' || e.key === 'V') {
        setToolMode('select');
      } else if (e.key === 'w' || e.key === 'W') {
        setToolMode('wire');
      } else if (e.key === 'e' || e.key === 'E') {
        setToolMode('edit_wire');
      } else if (e.key === 'm' || e.key === 'M') {
        setToolMode('measure');
        setMeasureStart(null);
      } else if (e.key === 'h' || e.key === 'H') {
        setToolMode('pan');
      } else if (e.key === 'n' || e.key === 'N') {
        setToolMode('net_highlight');
      } else if (e.key === 'd' || e.key === 'D') {
        setToolMode('delete');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWireId, selectedCompId, onDeleteWire, onDeleteComponent, onDuplicateComponent, onCopyComponent, onPasteComponent, onRotateComponent, mousePos, setWireSelected]);

  useEffect(() => {
    if (!isSimulating) return;
    let animId: number;
    const animate = () => {
      setAnimOffset((prev) => (prev + 1.2) % 30);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isSimulating]);

  // Electrical Net Analysis, Short-Circuit Detection & Floating Pin Detection
  const netAnalysis = useMemo(() => {
    const parent = new Map<string, string>();
    const find = (i: string): string => {
      if (!parent.has(i)) parent.set(i, i);
      if (parent.get(i) === i) return i;
      const root = find(parent.get(i)!);
      parent.set(i, root);
      return root;
    };
    const union = (i: string, j: string) => {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) parent.set(rootI, rootJ);
    };

    const connectedPins = new Set<string>();
    const netWireMap = new Map<string, string[]>();

    for (const w of wires) {
      const key1 = `${w.fromCompId}:${w.fromPinId}`;
      const key2 = `${w.toCompId}:${w.toPinId}`;
      connectedPins.add(key1);
      connectedPins.add(key2);
      union(key1, key2);
    }

    for (const w of wires) {
      const key1 = `${w.fromCompId}:${w.fromPinId}`;
      const root = find(key1);
      const cur = netWireMap.get(root) || [];
      cur.push(w.id);
      netWireMap.set(root, cur);
    }

    const powerPins = new Map<string, string>();
    const groundPins = new Map<string, string>();

    const isPowerPin = (pinName: string, compType: string, pinId: string): boolean => {
      const n = pinName.toLowerCase();
      const p = pinId.toLowerCase();
      const c = compType.toLowerCase();
      if (n.includes('vcc') || n.includes('5v') || n.includes('12v') || n.includes('3v3') || n.includes('vin') || n === 'v+') return true;
      if (c.includes('battery') || c.includes('dc_voltage')) {
        return p === 'pos' || p === '1' || n === '+';
      }
      return false;
    };

    const isGroundPin = (pinName: string, compType: string, pinId: string): boolean => {
      const n = pinName.toLowerCase();
      const p = pinId.toLowerCase();
      const c = compType.toLowerCase();
      if (n.includes('gnd') || n.includes('ground') || n === '0v' || n === 'v-') return true;
      if (c.includes('battery') || c.includes('dc_voltage')) {
        return p === 'neg' || p === '2' || n === '-';
      }
      return false;
    };

    for (const comp of components) {
      for (const pin of comp.pins) {
        const pinKey = `${comp.id}:${pin.id}`;
        if (connectedPins.has(pinKey)) {
          const root = find(pinKey);
          if (isPowerPin(pin.name, comp.type, pin.id)) {
            powerPins.set(root, `${comp.label || comp.type}.${pin.name}`);
          }
          if (isGroundPin(pin.name, comp.type, pin.id)) {
            groundPins.set(root, `${comp.label || comp.type}.${pin.name}`);
          }
        }
      }
    }

    const directShorts: { netId: string; powerPin: string; gndPin: string; wireIds: string[] }[] = [];
    const shortedWireIds = new Set<string>();

    powerPins.forEach((pPin, netId) => {
      if (groundPins.has(netId)) {
        const gPin = groundPins.get(netId)!;
        const wIds = netWireMap.get(netId) || [];
        directShorts.push({ netId, powerPin: pPin, gndPin: gPin, wireIds: wIds });
        wIds.forEach((id) => shortedWireIds.add(id));
      }
    });

    const unconnectedPins: { compId: string; pinId: string; worldX: number; worldY: number }[] = [];
    for (const comp of components) {
      for (const pin of comp.pins) {
        const pinKey = `${comp.id}:${pin.id}`;
        if (!connectedPins.has(pinKey)) {
          const world = getPinWorldCoord(comp, pin);
          unconnectedPins.push({ compId: comp.id, pinId: pin.id, worldX: world.x, worldY: world.y });
        }
      }
    }

    return { directShorts, shortedWireIds, unconnectedPins, findNet: find };
  }, [components, wires]);

  // Handle Mouse Down on Canvas Background
  const handleMouseDown = (e: React.MouseEvent) => {
    // If context menu is open, close it
    if (wireContextMenu) setWireContextMenu(null);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const curX = (e.clientX - rect.left - pan.x) / zoom;
    const curY = (e.clientY - rect.top - pan.y) / zoom;

    // Right click cancels active wire drawing
    if (e.button === 2) {
      if (activeWireStart) {
        e.preventDefault();
        setActiveWireStart(null);
        setActiveWaypoints([]);
        return;
      }
    }

    if (e.button === 0) {
      // In measure mode, clicking on canvas sets endpoint
      if (toolMode === 'measure') {
        const snapX = Math.round(curX / 10) * 10;
        const snapY = Math.round(curY / 10) * 10;
        if (!measureStart) {
          setMeasureStart({ x: snapX, y: snapY, label: `Point (${snapX}, ${snapY})` });
          setMeasureResult(null);
        } else {
          const dx = snapX - measureStart.x;
          const dy = snapY - measureStart.y;
          const distPx = Math.sqrt(dx * dx + dy * dy);
          const distanceMm = Math.round(distPx * 0.254 * 10) / 10;
          setMeasureResult({
            x1: measureStart.x,
            y1: measureStart.y,
            x2: snapX,
            y2: snapY,
            distanceMm,
            deltaX: Math.round(Math.abs(dx) * 0.254 * 10) / 10,
            deltaY: Math.round(Math.abs(dy) * 0.254 * 10) / 10,
            label1: measureStart.label,
            label2: `Point (${snapX}, ${snapY})`,
          });
          setMeasureStart(null);
        }
        return;
      }

      // If we are drawing a wire and user clicks on empty canvas -> insert a waypoint!
      if (activeWireStart) {
        const snapX = Math.round(curX / 10) * 10;
        const snapY = Math.round(curY / 10) * 10;
        setActiveWaypoints((prev) => [...prev, { x: snapX, y: snapY }]);
        return;
      }

      // Pan canvas
      if (toolMode === 'pan' || e.shiftKey || e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        onSelectComponent(null);
        setWireSelected(null);
        setHighlightedNetId(null);
      }
    } else if (e.button === 1) {
      // Middle click pan
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      onSelectComponent(null);
      setWireSelected(null);
      setHighlightedNetId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Track mouse in canvas coordinates (snapped to 10px grid)
    const curCanvasX = (e.clientX - rect.left - pan.x) / zoom;
    const curCanvasY = (e.clientY - rect.top - pan.y) / zoom;
    setMousePos({ x: curCanvasX, y: curCanvasY });

    if (draggingWaypoint && onUpdateWire) {
      const wire = wires.find((w) => w.id === draggingWaypoint.wireId);
      if (wire && wire.points) {
        const snapX = Math.round(curCanvasX / 10) * 10;
        const snapY = Math.round(curCanvasY / 10) * 10;
        const nextPoints = wire.points.map((pt, idx) =>
          idx === draggingWaypoint.pointIndex ? { x: snapX, y: snapY } : pt
        );
        onUpdateWire({ ...wire, points: nextPoints });
      }
      return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else if (draggingCompId) {
      // Snap to 10px grid
      const rawX = curCanvasX - dragOffset.x;
      const rawY = curCanvasY - dragOffset.y;
      const snapX = Math.round(rawX / 10) * 10;
      const snapY = Math.round(rawY / 10) * 10;
      onUpdateComponentPosition(draggingCompId, snapX, snapY);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingCompId(null);
    setDraggingWaypoint(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.max(0.4, Math.min(2.5, prev * factor)));
  };

  // Pin click: start or finish wire, or measure node
  const handlePinClick = (e: React.MouseEvent, compId: string, pinId: string, pinX: number, pinY: number) => {
    e.stopPropagation();

    if (toolMode === 'measure') {
      const comp = components.find((c) => c.id === compId);
      const pin = comp?.pins.find((p) => p.id === pinId);
      const label = `${comp?.label || comp?.type}.${pin?.name || pinId}`;
      const state = simulationStates[compId];
      const pinVoltage = state ? state.voltage : undefined;

      if (!measureStart) {
        setMeasureStart({ x: pinX, y: pinY, label, voltage: pinVoltage });
        setMeasureResult(null);
      } else {
        const dx = pinX - measureStart.x;
        const dy = pinY - measureStart.y;
        const distPx = Math.sqrt(dx * dx + dy * dy);
        const distanceMm = Math.round(distPx * 0.254 * 10) / 10;
        const deltaV = (measureStart.voltage !== undefined && pinVoltage !== undefined)
          ? Math.round(Math.abs(measureStart.voltage - pinVoltage) * 1000) / 1000
          : undefined;

        setMeasureResult({
          x1: measureStart.x,
          y1: measureStart.y,
          x2: pinX,
          y2: pinY,
          distanceMm,
          deltaX: Math.round(Math.abs(dx) * 0.254 * 10) / 10,
          deltaY: Math.round(Math.abs(dy) * 0.254 * 10) / 10,
          deltaV,
          label1: measureStart.label,
          label2: label,
        });
        setMeasureStart(null);
      }
      return;
    }

    if (!activeWireStart) {
      // Start wire
      setActiveWireStart({ compId, pinId, x: pinX, y: pinY });
      setActiveWaypoints([]);
    } else {
      // Complete wire
      if (activeWireStart.compId !== compId || activeWireStart.pinId !== pinId) {
        onAddWire({
          fromCompId: activeWireStart.compId,
          fromPinId: activeWireStart.pinId,
          toCompId: compId,
          toPinId: pinId,
          points: activeWaypoints.length > 0 ? activeWaypoints : undefined,
          style: activeRoutingStyle,
        });
      }
      setActiveWireStart(null);
      setActiveWaypoints([]);
    }
  };

  // Wire right-click context menu trigger
  const handleWireContextMenu = (e: React.MouseEvent, wireId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    const curX = rect ? (e.clientX - rect.left - pan.x) / zoom : 0;
    const curY = rect ? (e.clientY - rect.top - pan.y) / zoom : 0;

    setWireSelected(wireId);
    setWireContextMenu({
      x: e.clientX,
      y: e.clientY,
      wireId,
      canvasX: Math.round(curX / 10) * 10,
      canvasY: Math.round(curY / 10) * 10,
    });
  };

  // Add waypoint to existing wire
  const handleAddWaypointToWire = (wireId: string, x: number, y: number) => {
    if (!onUpdateWire) return;
    const wire = wires.find((w) => w.id === wireId);
    if (!wire) return;
    const nextPoints = wire.points ? [...wire.points, { x, y }] : [{ x, y }];
    onUpdateWire({ ...wire, points: nextPoints });
    setWireContextMenu(null);
  };

  // Change wire color
  const handleChangeWireColor = (wireId: string, color: string) => {
    if (!onUpdateWire) return;
    const wire = wires.find((w) => w.id === wireId);
    if (!wire) return;
    onUpdateWire({ ...wire, color });
    setWireContextMenu(null);
  };

  // Disconnect start or end pin and re-enter wire routing mode
  const handleDisconnectWireEndpoint = (wireId: string, endpoint: 'start' | 'end') => {
    const wire = wires.find((w) => w.id === wireId);
    if (!wire) return;
    onDeleteWire(wireId);
    setWireSelected(null);
    setWireContextMenu(null);

    const keepCompId = endpoint === 'start' ? wire.toCompId : wire.fromCompId;
    const keepPinId = endpoint === 'start' ? wire.toPinId : wire.fromPinId;

    const keepComp = components.find((c) => c.id === keepCompId);
    const keepPin = keepComp?.pins.find((p) => p.id === keepPinId);
    if (keepComp && keepPin) {
      const pCoord = getPinWorldCoord(keepComp, keepPin);
      setActiveWireStart({ compId: keepComp.id, pinId: keepPin.id, x: pCoord.x, y: pCoord.y });
      setActiveWaypoints(wire.points || []);
      toast.info(`Disconnected ${endpoint === 'start' ? 'Start' : 'End'} pin. Click another pin to reconnect, or press Esc to cancel.`);
    }
  };

  // Calculate Solder Junction Dots (Points where 3 or more wire connections meet)
  const junctionDots = useMemo(() => {
    const pointCounts = new Map<string, { count: number; x: number; y: number }>();

    for (const wire of wires) {
      const fromComp = components.find((c) => c.id === wire.fromCompId);
      const toComp = components.find((c) => c.id === wire.toCompId);
      if (!fromComp || !toComp) continue;

      const fromPin = fromComp.pins.find((p) => p.id === wire.fromPinId);
      const toPin = toComp.pins.find((p) => p.id === wire.toPinId);
      if (!fromPin || !toPin) continue;

      const p1 = getPinWorldCoord(fromComp, fromPin);
      const p2 = getPinWorldCoord(toComp, toPin);

      const k1 = `${p1.x},${p1.y}`;
      const k2 = `${p2.x},${p2.y}`;

      const e1 = pointCounts.get(k1) || { count: 0, x: p1.x, y: p1.y };
      e1.count += 1;
      pointCounts.set(k1, e1);

      const e2 = pointCounts.get(k2) || { count: 0, x: p2.x, y: p2.y };
      e2.count += 1;
      pointCounts.set(k2, e2);
    }

    const junctions: { x: number; y: number }[] = [];
    pointCounts.forEach((val) => {
      if (val.count >= 3) {
        junctions.push({ x: val.x, y: val.y });
      }
    });

    return junctions;
  }, [wires, components]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => {
        // Prevent default browser menu on canvas background
        if (activeWireStart) {
          e.preventDefault();
          setActiveWireStart(null);
          setActiveWaypoints([]);
        }
      }}
      className={`relative w-full h-full bg-[#070D18] overflow-hidden select-none ${
        toolMode === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
      }`}
    >
      {/* Top Floating CAD Interaction Mode Bar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900/95 border border-slate-700/80 rounded-lg p-1 shadow-2xl z-40 backdrop-blur">
        <button
          onClick={() => setToolMode('select')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
            toolMode === 'select'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Select Tool (V) — Select components & wires without deleting"
        >
          <MousePointer className="w-3.5 h-3.5" />
          <span>Select (V)</span>
        </button>

        <button
          onClick={() => setToolMode('wire')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
            toolMode === 'wire'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Wire Tool (W) — Click pins to connect, click canvas to add waypoints"
        >
          <Spline className="w-3.5 h-3.5" />
          <span>Wire (W)</span>
        </button>

        <button
          onClick={() => setToolMode('edit_wire')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
            toolMode === 'edit_wire'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Edit Wire Tool (E) — Select wires, add/drag/delete waypoints"
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>Edit Wire (E)</span>
        </button>

        <button
          onClick={() => {
            setToolMode('measure');
            setMeasureStart(null);
          }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
            toolMode === 'measure'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Measure Tool (M) — Click two points to measure distance (mm) and potential difference (ΔV)"
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>Measure (M)</span>
        </button>

        <button
          onClick={() => setToolMode('pan')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
            toolMode === 'pan'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Pan Tool (H) — Drag to move view"
        >
          <Hand className="w-3.5 h-3.5" />
          <span>Pan (H)</span>
        </button>

        <button
          onClick={() => setToolMode('net_highlight')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
            toolMode === 'net_highlight'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Net Highlight Tool (N) — Click any wire or pin to illuminate entire electrical net"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Net (N)</span>
        </button>

        <button
          onClick={() => setToolMode('delete')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
            toolMode === 'delete'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
          }`}
          title="Delete Tool (D) — Click any wire or component to delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete (D)</span>
        </button>

        {/* Wire Routing Style Toggle */}
        <div className="w-[1px] h-4 bg-slate-700 mx-1" />
        <button
          onClick={() => {
            const nextMap: Record<WireRoutingStyle, WireRoutingStyle> = {
              orthogonal: 'diagonal45',
              diagonal45: 'straight',
              straight: 'orthogonal',
            };
            setActiveRoutingStyle(nextMap[activeRoutingStyle]);
          }}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono text-cyan-300 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 transition-colors"
          title="Wire Routing Style: Click to cycle between 90° Orthogonal, 45° Chamfer, and Straight Direct"
        >
          <CornerDownRight className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold">
            {activeRoutingStyle === 'diagonal45' ? '45°' : activeRoutingStyle === 'straight' ? 'Direct' : '90°'}
          </span>
        </button>

        {/* Selected Component Quick CAD Actions */}
        {selectedCompId && (
          <>
            <div className="w-[1px] h-4 bg-slate-700 mx-1" />
            <button
              onClick={() => onRotateComponent(selectedCompId)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono text-emerald-400 hover:bg-slate-800 transition-colors"
              title="Rotate 90° (R key)"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rotate</span>
            </button>
            {onDuplicateComponent && (
              <button
                onClick={() => onDuplicateComponent(selectedCompId)}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono text-amber-400 hover:bg-slate-800 transition-colors"
                title="Duplicate Component (Ctrl+D)"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicate</span>
              </button>
            )}
          </>
        )}

        {/* Selected Wire Quick CAD Actions */}
        {selectedWireId && (
          <>
            <div className="w-[1px] h-4 bg-slate-700 mx-1" />
            <button
              onClick={() => {
                onDeleteWire(selectedWireId);
                setWireSelected(null);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono bg-rose-950/80 text-rose-300 border border-rose-700 hover:bg-rose-900 transition-colors shadow"
              title="Delete Selected Wire [Delete or Backspace]"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete Wire [Del]</span>
            </button>
          </>
        )}

        <div className="w-[1px] h-4 bg-slate-700 mx-1" />

        {/* Clear Sheet Action */}
        {onClearSheet && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono text-rose-400 hover:text-white hover:bg-rose-950 transition-colors"
            title="Clear Schematic Sheet"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Clear Sheet</span>
          </button>
        )}
      </div>

      {/* High-Visibility Direct Short Circuit Warning Banner */}
      {netAnalysis.directShorts.length > 0 && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-rose-950/95 border-2 border-rose-500 text-rose-200 px-4 py-2 rounded-lg shadow-2xl z-40 backdrop-blur animate-pulse font-mono text-xs">
          <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <span className="font-bold text-rose-100">⚠️ DIRECT SHORT CIRCUIT DETECTED:</span>
            <span className="ml-1.5 text-rose-200">
              {netAnalysis.directShorts.map((s) => `${s.powerPin} connects directly to ${s.gndPin}`).join('; ')}
            </span>
          </div>
        </div>
      )}

      {/* Canvas Grid Background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <pattern
            id="schematic-small-grid"
            width={20 * zoom}
            height={20 * zoom}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x % (20 * zoom)}, ${pan.y % (20 * zoom)})`}
          >
            <circle cx={2} cy={2} r={1} fill="#1E293B" opacity={0.6} />
          </pattern>
          <pattern
            id="schematic-major-grid"
            width={100 * zoom}
            height={100 * zoom}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x % (100 * zoom)}, ${pan.y % (100 * zoom)})`}
          >
            <circle cx={2} cy={2} r={1.5} fill="#334155" opacity={0.8} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#schematic-small-grid)" />
        <rect width="100%" height="100%" fill="url(#schematic-major-grid)" />
      </svg>

      {/* Main Schematic Render Group with Pan and Zoom */}
      <div
        className="absolute inset-0 origin-top-left pointer-events-auto"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {/* SVG Layer for Connecting Wires, Junctions & Electron Flow */}
        <svg className="absolute inset-0 w-[4000px] h-[4000px] pointer-events-auto overflow-visible">
          {wires.map((wire) => {
            const fromComp = components.find((c) => c.id === wire.fromCompId);
            const toComp = components.find((c) => c.id === wire.toCompId);
            if (!fromComp || !toComp) return null;

            const fromPin = fromComp.pins.find((p) => p.id === wire.fromPinId);
            const toPin = toComp.pins.find((p) => p.id === wire.toPinId);
            if (!fromPin || !toPin) return null;

            // Rotated World Coordinates of Pins
            const p1 = getPinWorldCoord(fromComp, fromPin);
            const p2 = getPinWorldCoord(toComp, toPin);

            const isShorted = netAnalysis.shortedWireIds.has(wire.id);
            const routingStyle = wire.style || activeRoutingStyle;
            const pathData = computeWireSvgPath(p1, p2, wire.points, routingStyle);
            const isWireSelected = selectedWireId === wire.id;
            const isHighlighted = highlightedNetId === wire.id;
            const wireBaseColor = isShorted
              ? '#EF4444'
              : wire.color || (isWireSelected ? '#F59E0B' : isHighlighted ? '#A855F7' : '#10B981');

            const midPoint = wire.points && wire.points.length > 0
              ? wire.points[Math.floor(wire.points.length / 2)]
              : { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

            return (
              <g key={wire.id} className="group">
                {/* Invisible wide hit area for easy wire selection (tolerance ~16px) */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (toolMode === 'delete') {
                      onDeleteWire(wire.id);
                    } else if (toolMode === 'net_highlight') {
                      setHighlightedNetId(wire.id);
                    } else {
                      // Standard Select: SELECTS the wire, does NOT delete!
                      setWireSelected(wire.id);
                      onSelectComponent(null);
                    }
                  }}
                  onContextMenu={(e) => handleWireContextMenu(e, wire.id)}
                />

                {/* Visual Wire with Selection Halo */}
                {(isWireSelected || isHighlighted || isShorted) && (
                  <path
                    d={pathData}
                    fill="none"
                    stroke={isShorted ? '#EF4444' : isHighlighted ? '#C084FC' : '#F59E0B'}
                    strokeWidth={6}
                    opacity={isShorted ? 0.6 : 0.45}
                    className={isShorted ? 'animate-pulse' : ''}
                  />
                )}

                <path
                  d={pathData}
                  fill="none"
                  stroke={wireBaseColor}
                  strokeWidth={isWireSelected ? 2.8 : 2}
                  className="transition-colors group-hover:stroke-amber-400"
                />

                {/* Animated Conventional Current Flow Dots with Polarity Direction */}
                {isSimulating && (
                  (() => {
                    const wCurrent = wireCurrents ? (wireCurrents[wire.id] ?? 0) : 1;
                    const hasCurrent = Math.abs(wCurrent) > 0.000001;
                    if (!hasCurrent) return null;
                    const isReverse = wCurrent < 0;
                    return (
                      <path
                        d={pathData}
                        fill="none"
                        stroke="#FBBF24"
                        strokeWidth={3}
                        strokeDasharray="4, 16"
                        strokeDashoffset={isReverse ? animOffset : -animOffset}
                        strokeLinecap="round"
                        opacity={0.9}
                      />
                    );
                  })()
                )}

                {/* Intermediate Waypoint Knots & Draggable Knobs */}
                {wire.points?.map((pt, pIdx) => (
                  <circle
                    key={pIdx}
                    cx={pt.x}
                    cy={pt.y}
                    r={isWireSelected ? 5.5 : 3.5}
                    fill={isWireSelected ? '#F59E0B' : wireBaseColor}
                    stroke={isWireSelected ? '#FFFFFF' : '#0B1528'}
                    strokeWidth={isWireSelected ? 2 : 1}
                    className={isWireSelected ? 'cursor-move hover:scale-125 transition-transform' : ''}
                    onMouseDown={(e) => {
                      if (isWireSelected && e.button === 0) {
                        e.stopPropagation();
                        setDraggingWaypoint({ wireId: wire.id, pointIndex: pIdx });
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (onUpdateWire && wire.points) {
                        const nextPoints = wire.points.filter((_, idx) => idx !== pIdx);
                        onUpdateWire({ ...wire, points: nextPoints });
                      }
                    }}
                  >
                    <title>Waypoint knot: Drag to adjust routing; Right-click to delete</title>
                  </circle>
                ))}

                {/* Engineering Net Label Tag */}
                {wire.netName && (
                  <g
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingNetLabelWireId(wire.id);
                      setTempNetLabel(wire.netName || '');
                    }}
                  >
                    <rect
                      x={midPoint.x - (wire.netName.length * 3.5 + 8)}
                      y={midPoint.y - 8}
                      width={wire.netName.length * 7 + 16}
                      height={16}
                      rx={3}
                      fill="#0B1528"
                      stroke={wireBaseColor}
                      strokeWidth={1.2}
                    />
                    <text
                      x={midPoint.x}
                      y={midPoint.y + 3.5}
                      fill="#FFFFFF"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {wire.netName}
                    </text>
                  </g>
                )}

                {/* Pin Terminal End Dots */}
                <circle cx={p1.x} cy={p1.y} r={3} fill={wireBaseColor} />
                <circle cx={p2.x} cy={p2.y} r={3} fill={wireBaseColor} />

                {/* Wire Deletion Badge when Wire is Selected */}
                {isWireSelected && (
                  <g
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteWire(wire.id);
                      setWireSelected(null);
                    }}
                  >
                    <circle cx={midPoint.x} cy={midPoint.y} r={10} fill="#E11D48" stroke="#FFFFFF" strokeWidth={1.5} />
                    <text x={midPoint.x} y={midPoint.y + 3.5} fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">✕</text>
                  </g>
                )}
              </g>
            );
          })}

          {/* KiCad-Style Unconnected Pin Warning Rings */}
          {netAnalysis.unconnectedPins.map((up) => (
            <g key={`${up.compId}:${up.pinId}`} className="pointer-events-none opacity-40">
              <circle cx={up.worldX} cy={up.worldY} r={3} fill="none" stroke="#64748B" strokeWidth={1} strokeDasharray="1.5, 1.5" />
            </g>
          ))}

          {/* Solder Junction Dots (Points where 3+ wires meet) */}
          {junctionDots.map((junc, idx) => (
            <circle
              key={idx}
              cx={junc.x}
              cy={junc.y}
              r={4.5}
              fill="#10B981"
              stroke="#064E3B"
              strokeWidth={1.5}
            >
              <title>Electrical Solder Junction Dot</title>
            </circle>
          ))}

          {/* Active Wire being drawn with live waypoints preview */}
          {activeWireStart && (
            <g>
              <path
                d={computeWireSvgPath(activeWireStart, mousePos, activeWaypoints, activeRoutingStyle)}
                fill="none"
                stroke="#F59E0B"
                strokeWidth={2}
                strokeDasharray="4, 4"
              />
              {activeWaypoints.map((wp, i) => (
                <circle key={i} cx={wp.x} cy={wp.y} r={4} fill="#F59E0B" stroke="#FFFFFF" strokeWidth={1} />
              ))}
            </g>
          )}

          {/* Active Measure Line / Dimension Tape */}
          {toolMode === 'measure' && measureStart && (
            <g className="pointer-events-none">
              <line
                x1={measureStart.x}
                y1={measureStart.y}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="#06B6D4"
                strokeWidth={1.5}
                strokeDasharray="4, 3"
              />
              <circle cx={measureStart.x} cy={measureStart.y} r={4} fill="#06B6D4" stroke="#FFFFFF" strokeWidth={1.5} />
              <circle cx={mousePos.x} cy={mousePos.y} r={4} fill="#06B6D4" stroke="#FFFFFF" strokeWidth={1.5} />
              <rect
                x={(measureStart.x + mousePos.x) / 2 - 35}
                y={(measureStart.y + mousePos.y) / 2 - 18}
                width={70}
                height={16}
                rx={3}
                fill="#0B1528"
                stroke="#06B6D4"
                strokeWidth={1}
              />
              <text
                x={(measureStart.x + mousePos.x) / 2}
                y={(measureStart.y + mousePos.y) / 2 - 6}
                fill="#22D3EE"
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {(Math.sqrt((mousePos.x - measureStart.x) ** 2 + (mousePos.y - measureStart.y) ** 2) * 0.254).toFixed(1)} mm
              </text>
            </g>
          )}

          {/* Persisted Dimension Result Tape */}
          {measureResult && (
            <g className="pointer-events-none">
              <line
                x1={measureResult.x1}
                y1={measureResult.y1}
                x2={measureResult.x2}
                y2={measureResult.y2}
                stroke="#06B6D4"
                strokeWidth={2}
              />
              <circle cx={measureResult.x1} cy={measureResult.y1} r={4.5} fill="#06B6D4" stroke="#FFFFFF" strokeWidth={1.5} />
              <circle cx={measureResult.x2} cy={measureResult.y2} r={4.5} fill="#06B6D4" stroke="#FFFFFF" strokeWidth={1.5} />
            </g>
          )}
        </svg>

        {/* Component Nodes Layer: Standard IEEE Schematic Symbols */}
        {components.map((comp) => {
          const isSelected = selectedCompId === comp.id;
          const state = simulationStates[comp.id];

          return (
            <div
              key={comp.id}
              onClick={(e) => {
                e.stopPropagation();
                if (toolMode === 'delete') {
                  onDeleteComponent(comp.id);
                } else {
                  onSelectComponent(comp.id);
                }
              }}
              onMouseDown={(e) => {
                if (e.button === 0 && toolMode !== 'wire') {
                  e.stopPropagation();
                  onSelectComponent(comp.id);
                  setDraggingCompId(comp.id);
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    const curX = (e.clientX - rect.left - pan.x) / zoom;
                    const curY = (e.clientY - rect.top - pan.y) / zoom;
                    setDragOffset({ x: curX - comp.x, y: curY - comp.y });
                  }
                }
              }}
              className="absolute cursor-move"
              style={{
                left: `${comp.x}px`,
                top: `${comp.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Professional IEEE / IEC Schematic Vector Symbol */}
              <SchematicSymbol
                component={comp}
                isSelected={isSelected}
                isSimulating={isSimulating}
                simState={state}
              />

              {/* Exact Terminal Pin Interactive Circles */}
              {comp.pins.map((pin) => {
                // Compute rotated offset relative to component center
                const world = getPinWorldCoord(comp, pin);
                const localX = world.x - comp.x;
                const localY = world.y - comp.y;

                return (
                  <div
                    key={pin.id}
                    onClick={(e) => handlePinClick(e, comp.id, pin.id, world.x, world.y)}
                    className="absolute w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-emerald-400 hover:bg-emerald-400 hover:scale-125 transition-all cursor-pointer z-30 flex items-center justify-center group/pin"
                    style={{
                      left: `calc(50% + ${localX}px)`,
                      top: `calc(50% + ${localY}px)`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    title={`Pin: ${pin.name} (${pin.pinType}) — Click to route wire`}
                  >
                    <span className="opacity-0 group-hover/pin:opacity-100 absolute -top-5 left-1/2 -translate-x-1/2 bg-slate-950 text-[9px] text-emerald-300 font-mono px-1 py-0.5 rounded pointer-events-none whitespace-nowrap border border-slate-800 z-40">
                      {pin.name}
                    </span>
                  </div>
                );
              })}

              {/* Floating Inline Quick Action Bar when Selected */}
              {isSelected && (
                <div
                  className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900/95 border border-slate-700 rounded-md p-1 shadow-2xl z-40 backdrop-blur"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => onRotateComponent(comp.id)}
                    className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors"
                    title="Rotate 90° Clockwise (R key)"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  {onMirrorComponent && (
                    <button
                      onClick={() => onMirrorComponent(comp.id)}
                      className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors"
                      title="Mirror Component Horizontally"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteComponent(comp.id)}
                    className="p-1 hover:bg-rose-950 text-rose-400 hover:text-rose-300 rounded transition-colors"
                    title="Delete Component (Del key)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Wire Right-Click Context Menu */}
      {wireContextMenu && (() => {
        const targetWire = wires.find((w) => w.id === wireContextMenu.wireId);
        return (
          <div
            className="fixed bg-[#0B1528] border border-slate-700 rounded-lg shadow-2xl p-1.5 z-50 font-mono text-xs text-slate-200 space-y-1 w-52 backdrop-blur-md"
            style={{ left: `${wireContextMenu.x}px`, top: `${wireContextMenu.y}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1 text-[10px] text-slate-400 uppercase border-b border-slate-800 font-bold flex items-center justify-between">
              <span>Wire Options</span>
              {targetWire?.netName && (
                <span className="text-emerald-400 font-bold">{targetWire.netName}</span>
              )}
            </div>

            <button
              onClick={() => {
                setWireSelected(wireContextMenu.wireId);
                setWireContextMenu(null);
              }}
              className="w-full text-left px-2 py-1.5 hover:bg-slate-800 rounded flex items-center gap-2 cursor-pointer"
            >
              <MousePointer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Select Wire</span>
            </button>

            {/* Routing Style Selector */}
            <div className="px-2 py-1 text-[10px] text-slate-400 uppercase border-t border-slate-800">
              Routing Style
            </div>
            <div className="grid grid-cols-3 gap-1 px-1">
              {[
                { id: 'orthogonal', label: '90°' },
                { id: 'diagonal45', label: '45°' },
                { id: 'straight', label: 'Direct' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => {
                    if (targetWire && onUpdateWire) {
                      onUpdateWire({ ...targetWire, style: st.id as WireRoutingStyle });
                    }
                    setWireContextMenu(null);
                  }}
                  className={`py-1 px-1.5 rounded text-[10px] border text-center transition-colors cursor-pointer ${
                    (targetWire?.style || activeRoutingStyle) === st.id
                      ? 'bg-amber-600/30 border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <button
              onClick={() =>
                handleAddWaypointToWire(wireContextMenu.wireId, wireContextMenu.canvasX, wireContextMenu.canvasY)
              }
              className="w-full text-left px-2 py-1.5 hover:bg-slate-800 rounded flex items-center gap-2 cursor-pointer border-t border-slate-800"
            >
              <Spline className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Waypoint Here</span>
            </button>

            {targetWire?.points && targetWire.points.length > 0 && (
              <button
                onClick={() => {
                  if (targetWire && onUpdateWire) {
                    onUpdateWire({ ...targetWire, points: undefined });
                  }
                  setWireContextMenu(null);
                }}
                className="w-full text-left px-2 py-1 hover:bg-slate-800 rounded flex items-center gap-2 text-slate-400 hover:text-rose-300 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Remove Waypoints</span>
              </button>
            )}

            {/* Disconnect Endpoints */}
            <div className="px-2 py-1 text-[10px] text-slate-400 uppercase border-t border-slate-800">
              Disconnect &amp; Re-route
            </div>
            <button
              onClick={() => {
                if (targetWire) handleDisconnectWireEndpoint(targetWire.id, 'start');
              }}
              className="w-full text-left px-2 py-1 hover:bg-slate-800 text-sky-400 hover:text-sky-300 rounded flex items-center gap-2 cursor-pointer"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Disconnect Start Pin</span>
            </button>
            <button
              onClick={() => {
                if (targetWire) handleDisconnectWireEndpoint(targetWire.id, 'end');
              }}
              className="w-full text-left px-2 py-1 hover:bg-slate-800 text-sky-400 hover:text-sky-300 rounded flex items-center gap-2 cursor-pointer"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Disconnect End Pin</span>
            </button>

            {/* Set Net Label */}
            <button
              onClick={() => {
                setEditingNetLabelWireId(wireContextMenu.wireId);
                setTempNetLabel(targetWire?.netName || '');
                setWireContextMenu(null);
              }}
              className="w-full text-left px-2 py-1.5 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 rounded flex items-center gap-2 border-t border-slate-800 cursor-pointer"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Set Net Label...</span>
            </button>

            <button
              onClick={() => {
                setHighlightedNetId(wireContextMenu.wireId);
                setWireContextMenu(null);
              }}
              className="w-full text-left px-2 py-1 hover:bg-slate-800 rounded flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Highlight Net</span>
            </button>

            {/* Wire Colors */}
            <div className="px-2 py-1 text-[10px] text-slate-400 uppercase border-t border-slate-800">
              Wire Color
            </div>
            <div className="flex items-center gap-1 px-2 py-1">
              {[
                { label: 'Green', hex: '#10B981' },
                { label: 'Red', hex: '#EF4444' },
                { label: 'Blue', hex: '#3B82F6' },
                { label: 'Yellow', hex: '#FBBF24' },
                { label: 'Purple', hex: '#A855F7' },
                { label: 'Black', hex: '#64748B' },
              ].map((c) => (
                <button
                  key={c.hex}
                  onClick={() => handleChangeWireColor(wireContextMenu.wireId, c.hex)}
                  className="w-4 h-4 rounded-full border border-slate-600 hover:scale-125 transition-transform cursor-pointer"
                  style={{ backgroundColor: c.hex }}
                  title={`Set color: ${c.label}`}
                />
              ))}
            </div>

            <button
              onClick={() => {
                onDeleteWire(wireContextMenu.wireId);
                setWireContextMenu(null);
                setWireSelected(null);
              }}
              className="w-full text-left px-2 py-1.5 hover:bg-rose-950 text-rose-400 hover:text-rose-300 rounded flex items-center gap-2 border-t border-slate-800 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Wire</span>
            </button>
          </div>
        );
      })()}

      {/* Clean Floating Wire Action Bar when user clicks an existing wire */}
      {(() => {
        if (!selectedWireId || wireContextMenu) return null;
        const targetWire = wires.find((w) => w.id === selectedWireId);
        if (!targetWire) return null;

        const fromComp = components.find((c) => c.id === targetWire.fromCompId);
        const toComp = components.find((c) => c.id === targetWire.toCompId);
        const fromPin = fromComp?.pins.find((p) => p.id === targetWire.fromPinId);
        const toPin = toComp?.pins.find((p) => p.id === targetWire.toPinId);
        if (!fromComp || !toComp || !fromPin || !toPin) return null;

        const p1 = getPinWorldCoord(fromComp, fromPin);
        const p2 = getPinWorldCoord(toComp, toPin);

        let midWorld = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        if (targetWire.points && targetWire.points.length > 0) {
          const midIdx = Math.floor(targetWire.points.length / 2);
          midWorld = targetWire.points[midIdx];
        }

        const screenX = midWorld.x * zoom + pan.x;
        const screenY = midWorld.y * zoom + pan.y;

        return (
          <div
            className="absolute z-30 flex items-center gap-1.5 bg-[#0B1528]/95 border border-slate-700/90 px-2.5 py-1.5 rounded-xl shadow-2xl backdrop-blur font-mono text-xs select-none pointer-events-auto"
            style={{
              left: `${Math.max(140, Math.min(window.innerWidth - 220, screenX))}px`,
              top: `${Math.max(45, screenY - 50)}px`,
              transform: 'translateX(-50%)',
            }}
          >
            {/* Disconnect Start Pin */}
            <button
              type="button"
              onClick={() => handleDisconnectWireEndpoint(targetWire.id, 'start')}
              className="px-2 py-1 bg-sky-950/80 hover:bg-sky-900 border border-sky-600/60 text-sky-200 rounded flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer"
              title="Disconnect Start Pin and re-route from End Pin"
            >
              <Scissors className="w-3.5 h-3.5 text-sky-400" />
              <span>Disconnect Start</span>
            </button>

            {/* Disconnect End Pin */}
            <button
              type="button"
              onClick={() => handleDisconnectWireEndpoint(targetWire.id, 'end')}
              className="px-2 py-1 bg-sky-950/80 hover:bg-sky-900 border border-sky-600/60 text-sky-200 rounded flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer"
              title="Disconnect End Pin and re-route from Start Pin"
            >
              <Scissors className="w-3.5 h-3.5 text-sky-400" />
              <span>Disconnect End</span>
            </button>

            <div className="h-4 w-px bg-slate-700 mx-0.5" />

            {/* Color Swatches */}
            <div className="flex items-center gap-1 px-1">
              {[
                { label: 'Green', hex: '#10B981' },
                { label: 'Red', hex: '#EF4444' },
                { label: 'Blue', hex: '#3B82F6' },
                { label: 'Yellow', hex: '#FBBF24' },
                { label: 'Purple', hex: '#A855F7' },
                { label: 'Slate', hex: '#64748B' },
              ].map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => handleChangeWireColor(targetWire.id, c.hex)}
                  className={`w-3.5 h-3.5 rounded-full border transition-transform cursor-pointer ${
                    (targetWire.color || '#10B981') === c.hex ? 'border-white scale-125 ring-1 ring-white/50' : 'border-slate-600 hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={`Set wire color: ${c.label}`}
                />
              ))}
            </div>

            <div className="h-4 w-px bg-slate-700 mx-0.5" />

            {/* Delete Wire */}
            <button
              type="button"
              onClick={() => {
                onDeleteWire(targetWire.id);
                setWireSelected(null);
              }}
              className="p-1 hover:bg-rose-950 text-rose-400 hover:text-rose-300 rounded transition-colors cursor-pointer"
              title="Delete Wire [Delete]"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Close / Deselect */}
            <button
              type="button"
              onClick={() => setWireSelected(null)}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded text-[11px] leading-none"
              title="Close Wire Bar"
            >
              ✕
            </button>
          </div>
        );
      })()}

      {/* Floating Measurement HUD Result Card */}
      {measureResult && (
        <div className="absolute top-16 right-4 bg-[#0B1528]/95 border border-cyan-500/60 rounded-xl p-3 shadow-2xl z-40 font-mono text-xs text-slate-200 w-64 backdrop-blur space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Ruler className="w-3.5 h-3.5" />
              CAD Measurement
            </span>
            <button
              onClick={() => setMeasureResult(null)}
              className="text-slate-400 hover:text-white text-xs px-1 hover:bg-slate-800 rounded"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
              <span className="text-[9px] text-slate-500 block uppercase">Distance (mm)</span>
              <span className="text-cyan-400 font-bold text-sm">{measureResult.distanceMm} mm</span>
            </div>
            {measureResult.deltaV !== undefined ? (
              <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
                <span className="text-[9px] text-slate-500 block uppercase">Potential Diff</span>
                <span className="text-amber-400 font-bold text-sm">{measureResult.deltaV.toFixed(3)} V</span>
              </div>
            ) : (
              <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
                <span className="text-[9px] text-slate-500 block uppercase">Grid Offset</span>
                <span className="text-slate-300 font-bold text-xs">ΔX:{measureResult.deltaX} ΔY:{measureResult.deltaY}</span>
              </div>
            )}
          </div>
          {measureResult.label1 && measureResult.label2 && (
            <div className="text-[10px] text-slate-400 space-y-0.5 border-t border-slate-800 pt-1.5">
              <div className="truncate"><span className="text-slate-500">From:</span> {measureResult.label1}</div>
              <div className="truncate"><span className="text-slate-500">To:</span> {measureResult.label2}</div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Edit Wire Net Label */}
      {editingNetLabelWireId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1528] border border-slate-700 rounded-xl p-4 max-w-xs w-full font-mono text-xs text-slate-200 shadow-2xl space-y-3">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-sm">
              <Tag className="w-4 h-4" />
              <span>Assign Electrical Net Label</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Set an electrical net name (e.g. VCC, GND, RESET, SDA, SCL).
            </p>
            <input
              type="text"
              autoFocus
              value={tempNetLabel}
              onChange={(e) => setTempNetLabel(e.target.value)}
              placeholder="e.g. VCC"
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500 uppercase"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const target = wires.find((w) => w.id === editingNetLabelWireId);
                  if (target && onUpdateWire) {
                    onUpdateWire({ ...target, netName: tempNetLabel.trim() || undefined });
                  }
                  setEditingNetLabelWireId(null);
                } else if (e.key === 'Escape') {
                  setEditingNetLabelWireId(null);
                }
              }}
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setEditingNetLabelWireId(null)}
                className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const target = wires.find((w) => w.id === editingNetLabelWireId);
                  if (target && onUpdateWire) {
                    onUpdateWire({ ...target, netName: tempNetLabel.trim() || undefined });
                  }
                  setEditingNetLabelWireId(null);
                }}
                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                Save Net Label
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Clear Schematic Sheet */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1528] border border-slate-700 rounded-xl p-5 max-w-sm w-full font-mono text-xs text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertOctagon className="w-5 h-5" />
              <span>Clear Schematic Sheet?</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              All components and connecting wires on this current schematic will be removed. Your PCB layout and firmware files will remain intact. This action can be undone with Undo (Ctrl+Z).
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onClearSheet) onClearSheet();
                  setShowClearConfirm(false);
                }}
                className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Canvas Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-1 text-slate-300 shadow-xl z-20 backdrop-blur">
        <button
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono px-1 text-slate-400">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setZoom(1.0);
            setPan({ x: 0, y: 0 });
          }}
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition-colors"
          title="Reset Zoom & Pan (100%)"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Engineering Canvas Status Hint */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-400 pointer-events-none backdrop-blur">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span>Mode: {toolMode.toUpperCase()}</span>
        <span className="text-slate-600">|</span>
        <span>Click pin to wire</span>
        <span className="text-slate-600">|</span>
        <span>Right-click wire for menu</span>
      </div>
    </div>
  );
}