'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { CircuitComponent, CircuitWire, WireInteractionMode } from '@/modules/engineering-lab/types';
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
} from 'lucide-react';
import { SchematicSymbol } from './SchematicSymbols';

interface SchematicCanvasProps {
  components: CircuitComponent[];
  wires: CircuitWire[];
  selectedCompId: string | null;
  onSelectComponent: (id: string | null) => void;
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
  simulationStates: Record<string, { voltage: number; current: number; on?: boolean }>;
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
 * Calculates polyline SVG path with optional intermediate waypoints.
 */
export function computeWireSvgPath(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  waypoints?: { x: number; y: number }[]
): string {
  if (waypoints && waypoints.length > 0) {
    let d = `M ${p1.x} ${p1.y}`;
    for (const pt of waypoints) {
      d += ` L ${pt.x} ${pt.y}`;
    }
    d += ` L ${p2.x} ${p2.y}`;
    return d;
  }
  // Standard Manhattan orthogonal path
  const midX = (p1.x + p2.x) / 2;
  return `M ${p1.x} ${p1.y} L ${midX} ${p1.y} L ${midX} ${p2.y} L ${p2.x} ${p2.y}`;
}

export function SchematicCanvas({
  components,
  wires,
  selectedCompId,
  onSelectComponent,
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

  // Active Tool Mode
  const [toolMode, setToolMode] = useState<WireInteractionMode>('select');

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

  // Current flow animation tick
  const [animOffset, setAnimOffset] = useState(0);

  // Selected Wire State & Context Menu
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
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
          setSelectedWireId(null);
          setWireContextMenu(null);
        } else if (selectedCompId) {
          onDeleteComponent(selectedCompId);
        }
      } else if (e.key === 'Escape') {
        setSelectedWireId(null);
        setActiveWireStart(null);
        setActiveWaypoints([]);
        setWireContextMenu(null);
        setHighlightedNetId(null);
      } else if (e.key === 'v' || e.key === 'V') {
        setToolMode('select');
      } else if (e.key === 'w' || e.key === 'W') {
        setToolMode('wire');
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
  }, [selectedWireId, selectedCompId, onDeleteWire, onDeleteComponent, onDuplicateComponent, onCopyComponent, onPasteComponent, onRotateComponent, mousePos]);

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
        setSelectedWireId(null);
        setHighlightedNetId(null);
      }
    } else if (e.button === 1) {
      // Middle click pan
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      onSelectComponent(null);
      setSelectedWireId(null);
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
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.max(0.4, Math.min(2.5, prev * factor)));
  };

  // Pin click: start or finish wire
  const handlePinClick = (e: React.MouseEvent, compId: string, pinId: string, pinX: number, pinY: number) => {
    e.stopPropagation();

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

    setSelectedWireId(wireId);
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

            const pathData = computeWireSvgPath(p1, p2, wire.points);
            const isWireSelected = selectedWireId === wire.id;
            const isHighlighted = highlightedNetId === wire.id;
            const wireBaseColor = wire.color || (isWireSelected ? '#F59E0B' : isHighlighted ? '#A855F7' : '#10B981');

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
                      setSelectedWireId(wire.id);
                      onSelectComponent(null);
                    }
                  }}
                  onContextMenu={(e) => handleWireContextMenu(e, wire.id)}
                />

                {/* Visual Wire with Selection Halo */}
                {(isWireSelected || isHighlighted) && (
                  <path
                    d={pathData}
                    fill="none"
                    stroke={isHighlighted ? '#C084FC' : '#F59E0B'}
                    strokeWidth={6}
                    opacity={0.45}
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

                {/* Intermediate Waypoint Knots */}
                {wire.points?.map((pt, pIdx) => (
                  <circle
                    key={pIdx}
                    cx={pt.x}
                    cy={pt.y}
                    r={3}
                    fill={wireBaseColor}
                    stroke="#0B1528"
                    strokeWidth={1}
                  />
                ))}

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
                      setSelectedWireId(null);
                    }}
                  >
                    <circle cx={midPoint.x} cy={midPoint.y} r={10} fill="#E11D48" stroke="#FFFFFF" strokeWidth={1.5} />
                    <text x={midPoint.x} y={midPoint.y + 3.5} fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">✕</text>
                  </g>
                )}
              </g>
            );
          })}

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
                d={(() => {
                  let d = `M ${activeWireStart.x} ${activeWireStart.y}`;
                  for (const wp of activeWaypoints) {
                    d += ` L ${wp.x} ${wp.y}`;
                  }
                  const lastPt = activeWaypoints.length > 0 ? activeWaypoints[activeWaypoints.length - 1] : activeWireStart;
                  const midX = (lastPt.x + mousePos.x) / 2;
                  d += ` L ${midX} ${lastPt.y} L ${midX} ${mousePos.y} L ${mousePos.x} ${mousePos.y}`;
                  return d;
                })()}
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
      {wireContextMenu && (
        <div
          className="fixed bg-[#0B1528] border border-slate-700 rounded-lg shadow-2xl p-1.5 z-50 font-mono text-xs text-slate-200 space-y-1 w-44 backdrop-blur-md"
          style={{ left: `${wireContextMenu.x}px`, top: `${wireContextMenu.y}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1 text-[10px] text-slate-400 uppercase border-b border-slate-800 font-bold">
            Wire Options
          </div>
          <button
            onClick={() => {
              setSelectedWireId(wireContextMenu.wireId);
              setWireContextMenu(null);
            }}
            className="w-full text-left px-2 py-1.5 hover:bg-slate-800 rounded flex items-center gap-2"
          >
            <MousePointer className="w-3.5 h-3.5 text-emerald-400" />
            <span>Select Wire</span>
          </button>
          <button
            onClick={() =>
              handleAddWaypointToWire(wireContextMenu.wireId, wireContextMenu.canvasX, wireContextMenu.canvasY)
            }
            className="w-full text-left px-2 py-1.5 hover:bg-slate-800 rounded flex items-center gap-2"
          >
            <Spline className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Waypoint</span>
          </button>
          <button
            onClick={() => {
              setHighlightedNetId(wireContextMenu.wireId);
              setWireContextMenu(null);
            }}
            className="w-full text-left px-2 py-1.5 hover:bg-slate-800 rounded flex items-center gap-2"
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
              { label: 'Black', hex: '#64748B' },
            ].map((c) => (
              <button
                key={c.hex}
                onClick={() => handleChangeWireColor(wireContextMenu.wireId, c.hex)}
                className="w-4 h-4 rounded-full border border-slate-600 hover:scale-125 transition-transform"
                style={{ backgroundColor: c.hex }}
                title={`Set color: ${c.label}`}
              />
            ))}
          </div>
          <button
            onClick={() => {
              const targetWire = wires.find((w) => w.id === wireContextMenu.wireId);
              if (targetWire) {
                onDeleteWire(targetWire.id);
                const fromComp = components.find((c) => c.id === targetWire.fromCompId);
                const fromPin = fromComp?.pins.find((p) => p.id === targetWire.fromPinId);
                if (fromComp && fromPin) {
                  const pCoord = getPinWorldCoord(fromComp, fromPin);
                  setActiveWireStart({ compId: fromComp.id, pinId: fromPin.id, x: pCoord.x, y: pCoord.y });
                  setActiveWaypoints(targetWire.points || []);
                }
              }
              setWireContextMenu(null);
              setSelectedWireId(null);
            }}
            className="w-full text-left px-2 py-1.5 hover:bg-slate-800 text-sky-400 hover:text-sky-300 rounded flex items-center gap-2 border-t border-slate-800"
          >
            <Spline className="w-3.5 h-3.5" />
            <span>Disconnect &amp; Reconnect</span>
          </button>
          <button
            onClick={() => {
              onDeleteWire(wireContextMenu.wireId);
              setWireContextMenu(null);
              setSelectedWireId(null);
            }}
            className="w-full text-left px-2 py-1.5 hover:bg-rose-950 text-rose-400 hover:text-rose-300 rounded flex items-center gap-2 border-t border-slate-800"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Wire</span>
          </button>
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