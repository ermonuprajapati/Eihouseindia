'use client';

import React, { useRef, useState, useEffect } from 'react';
import { CircuitComponent, CircuitWire } from '@/modules/engineering-lab/types';
import { RotateCw, Trash2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface SchematicCanvasProps {
  components: CircuitComponent[];
  wires: CircuitWire[];
  selectedCompId: string | null;
  onSelectComponent: (id: string | null) => void;
  onUpdateComponentPosition: (id: string, x: number, y: number) => void;
  onRotateComponent: (id: string) => void;
  onDeleteComponent: (id: string) => void;
  onAddWire: (wire: Omit<CircuitWire, 'id'>) => void;
  onDeleteWire: (wireId: string) => void;
  isSimulating: boolean;
  simulationStates: Record<string, { voltage: number; current: number; on?: boolean }>;
}

export function SchematicCanvas({
  components,
  wires,
  selectedCompId,
  onSelectComponent,
  onUpdateComponentPosition,
  onRotateComponent,
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

            const x1 = fromComp.x + fromPin.x;
            const y1 = fromComp.y + fromPin.y;
            const x2 = toComp.x + toPin.x;
            const y2 = toComp.y + toPin.y;

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

                {/* Junction Pin Nodes */}
                <circle cx={x1} cy={y1} r={3} fill="#10B981" />
                <circle cx={x2} cy={y2} r={3} fill="#10B981" />
              </g>
            );
          })}

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

        {/* Component Nodes Layer */}
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
              className={`absolute select-none group cursor-move transition-shadow ${
                isSelected ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 rounded-lg' : ''
              }`}
              style={{
                left: `${comp.x}px`,
                top: `${comp.y}px`,
                transform: `translate(-50%, -50%) rotate(${comp.rotation}deg)`,
              }}
            >
              {/* Component Body Graphic */}
              <div className="relative bg-slate-900/90 border border-slate-700 rounded-lg p-2 flex flex-col items-center justify-center min-w-[70px] shadow-lg backdrop-blur-sm">
                {/* Component Symbol & Type badge */}
                <div className="text-[10px] font-mono text-emerald-400 font-semibold tracking-wider uppercase mb-0.5">
                  {comp.type.replace(/_/g, ' ')}
                </div>

                <div className="text-xs font-bold text-slate-100">{comp.value || comp.label}</div>

                {/* LED Dynamic Glow Effect */}
                {comp.type === 'LED' && (
                  <div
                    className={`w-4 h-4 rounded-full mt-1 border transition-all ${
                      state?.on
                        ? 'bg-rose-500 border-rose-300 shadow-[0_0_15px_#F43F5E]'
                        : 'bg-rose-950 border-rose-800 opacity-60'
                    }`}
                  />
                )}

                {/* 555 Timer Output State */}
                {comp.type === 'TIMER_555' && (
                  <div className="text-[9px] text-slate-400 mt-1 font-mono">
                    Out: <span className={state?.on ? 'text-emerald-400 font-bold' : 'text-slate-500'}>{state?.on ? 'HIGH (5V)' : 'LOW (0V)'}</span>
                  </div>
                )}

                {/* Component Live Electrical Readout */}
                {isSimulating && state && (
                  <div className="text-[9px] font-mono text-cyan-300 mt-1 flex items-center gap-1.5 bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">
                    <span>{state.voltage.toFixed(2)}V</span>
                    <span className="text-slate-600">|</span>
                    <span>{(state.current * 1000).toFixed(1)}mA</span>
                  </div>
                )}

                {/* Component Pins */}
                {comp.pins.map((pin) => {
                  return (
                    <div
                      key={pin.id}
                      onClick={(e) => handlePinClick(e, comp.id, pin.id, comp.x + pin.x, comp.y + pin.y)}
                      className="absolute w-3 h-3 rounded-full bg-slate-800 border-2 border-emerald-400 hover:bg-emerald-400 hover:scale-125 transition-all cursor-pointer z-20 flex items-center justify-center group/pin"
                      style={{
                        left: `calc(50% + ${pin.x}px)`,
                        top: `calc(50% + ${pin.y}px)`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      title={`Pin: ${pin.name} (${pin.pinType}) — Click to route wire`}
                    >
                      <span className="opacity-0 group-hover/pin:opacity-100 absolute -top-5 left-1/2 -translate-x-1/2 bg-slate-950 text-[9px] text-emerald-300 font-mono px-1 py-0.5 rounded pointer-events-none whitespace-nowrap border border-slate-800">
                        {pin.name}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Floating Inline Quick Action Bar when Selected */}
              {isSelected && (
                <div
                  className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-md p-1 shadow-xl z-30"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => onRotateComponent(comp.id)}
                    className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors"
                    title="Rotate 90° (R key)"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
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
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition-colors border-l border-slate-800 ml-1"
          title="Reset View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Wiring mode helper tooltip */}
      {activeWireStart && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs px-3 py-1.5 rounded-full shadow-lg pointer-events-none flex items-center gap-2 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          Click target component pin to complete connection, or click canvas to cancel.
        </div>
      )}
    </div>
  );
}
