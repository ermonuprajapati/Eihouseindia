'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { CircuitComponent, CircuitWire } from '@/modules/engineering-lab/types';
import { RotateCw, Trash2, ZoomIn, ZoomOut, Maximize2, FlipHorizontal } from 'lucide-react';
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
  onAddWire: (wire: Omit<CircuitWire, 'id'>) => void;
  onDeleteWire: (wireId: string) => void;
  isSimulating: boolean;
  simulationStates: Record<string, { voltage: number; current: number; on?: boolean }>;
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

export function SchematicCanvas({
  components,
  wires,
  selectedCompId,
  onSelectComponent,
  onUpdateComponentPosition,
  onRotateComponent,
  onMirrorComponent,
  onDeleteComponent,
  onAddWire,
  onDeleteWire,
  isSimulating,
  simulationStates,
}: SchematicCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom & Pan transforms
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Dragging component
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Wiring in progress
  const [activeWireStart, setActiveWireStart] = useState<{ compId: string; pinId: string; x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Current flow animation tick
  const [animOffset, setAnimOffset] = useState(0);

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

  // Handle Pan start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      if (e.button === 0 || e.button === 1 || e.shiftKey) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        onSelectComponent(null);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Track mouse in canvas coordinates
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
    } else {
      // Complete wire
      if (activeWireStart.compId !== compId || activeWireStart.pinId !== pinId) {
        onAddWire({
          fromCompId: activeWireStart.compId,
          fromPinId: activeWireStart.pinId,
          toCompId: compId,
          toPinId: pinId,
        });
      }
      setActiveWireStart(null);
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
      className="relative w-full h-full bg-[#070D18] overflow-hidden cursor-crosshair select-none"
    >
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
            const { x: x1, y: y1 } = getPinWorldCoord(fromComp, fromPin);
            const { x: x2, y: y2 } = getPinWorldCoord(toComp, toPin);

            // Manhattan orthogonal wire path: horizontal then vertical
            const midX = (x1 + x2) / 2;
            const pathData = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;

            return (
              <g key={wire.id} className="group">
                {/* Invisible wide hit area for easy wire clicking / deletion */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={14}
                  className="cursor-pointer"
                  onClick={() => onDeleteWire(wire.id)}
                />
                {/* Visual Wire */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth={2}
                  className="transition-colors group-hover:stroke-rose-400"
                />

                {/* Animated Current Flow Dots */}
                {isSimulating && (
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#FBBF24"
                    strokeWidth={3}
                    strokeDasharray="4, 16"
                    strokeDashoffset={-animOffset}
                    strokeLinecap="round"
                    opacity={0.85}
                  />
                )}

                {/* Pin Terminal End Dots */}
                <circle cx={x1} cy={y1} r={3} fill="#10B981" />
                <circle cx={x2} cy={y2} r={3} fill="#10B981" />
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

          {/* Active Wire being drawn */}
          {activeWireStart && (
            <path
              d={`M ${activeWireStart.x} ${activeWireStart.y} L ${(activeWireStart.x + mousePos.x) / 2} ${activeWireStart.y} L ${(activeWireStart.x + mousePos.x) / 2} ${mousePos.y} L ${mousePos.x} ${mousePos.y}`}
              fill="none"
              stroke="#F59E0B"
              strokeWidth={2}
              strokeDasharray="4, 4"
            />
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
                onSelectComponent(comp.id);
              }}
              onMouseDown={(e) => {
                if (e.button === 0) {
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
        <span>Grid: 10px snap</span>
        <span className="text-slate-600">|</span>
        <span>Click pin to wire</span>
        <span className="text-slate-600">|</span>
        <span>Scroll to zoom</span>
      </div>
    </div>
  );
}
