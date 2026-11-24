'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  MousePointer,
  Hand,
  GitCommit,
  RotateCw,
  Trash2,
  Sparkles,
  CheckCircle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  RotateCcw,
} from 'lucide-react';
import { CircuitComponent, CircuitWire, EngineeringProject } from '@/modules/engineering-lab/types';
import { SchematicSymbol } from '../Canvas/SchematicSymbols';
import { getPinWorldCoord, runElectricalRulesCheck, ErcViolation } from '@/modules/engineering-lab/circuit-engine/schematic-erc';
import {
  autoLayoutCircuit,
  routeOrthogonalWires,
  RoutedWirePath,
  JunctionDot,
} from '@/modules/engineering-lab/schematic-engine/schematic-sync-layout';

const ErcReportModal = dynamic(
  () => import('./ErcReportModal').then((m) => m.ErcReportModal),
  { ssr: false }
);

export interface SchematicEditorPanelProps {
  project: EngineeringProject;
  components: CircuitComponent[];
  wires: CircuitWire[];
  selectedCompId: string | null;
  selectedWireId?: string | null;
  onSelectComponent: (id: string | null) => void;
  onSelectWire?: (id: string | null) => void;
  onUpdateComponentPosition: (id: string, x: number, y: number) => void;
  onRotateComponent: (id: string) => void;
  onDeleteComponent: (id: string) => void;
  onAddWire: (wire: Omit<CircuitWire, 'id'> & { id?: string }) => void;
  onDeleteWire: (wireId: string) => void;
  onUpdateComponents: (comps: CircuitComponent[]) => void;
  onUpdateWires: (wires: CircuitWire[]) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

type EditorTool = 'select' | 'pan' | 'wire';

export function SchematicEditorPanel({
  project,
  components,
  wires,
  selectedCompId,
  selectedWireId,
  onSelectComponent,
  onSelectWire = () => {},
  onUpdateComponentPosition,
  onRotateComponent,
  onDeleteComponent,
  onAddWire,
  onDeleteWire,
  onUpdateComponents,
  onUpdateWires,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: SchematicEditorPanelProps) {
  const [tool, setTool] = useState<EditorTool>('select');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 100, y: 80 });
  const [isGridSnap, setIsGridSnap] = useState<boolean>(true);
  const [activeWireStart, setActiveWireStart] = useState<{ compId: string; pinId: string; x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const [compDragOffset, setCompDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // ERC Modal
  const [isErcOpen, setIsErcOpen] = useState(false);
  const [ercViolations, setErcViolations] = useState<ErcViolation[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const gridStep = 20;

  // Compute 90° Manhattan routed wires and junctions
  const { routedWires, junctions } = useMemo(() => {
    return routeOrthogonalWires(components, wires, true, gridStep);
  }, [components, wires]);

  // Unique net count
  const netCount = useMemo(() => {
    const nets = new Set<string>();
    wires.forEach((w) => {
      if (w.netName) nets.add(w.netName);
      else nets.add(`NET_${w.fromCompId}_${w.fromPinId}`);
    });
    return Math.max(nets.size, wires.length > 0 ? 1 : 0);
  }, [wires]);

  // Auto-Tidy Layout handler
  const handleAutoTidy = useCallback(() => {
    const layout = autoLayoutCircuit(components, wires, gridStep);
    onUpdateComponents(layout.components);
    onUpdateWires(layout.wires);
  }, [components, wires, onUpdateComponents, onUpdateWires]);

  // Run ERC handler
  const handleRunErc = useCallback(() => {
    const violations = runElectricalRulesCheck(components, wires);
    setErcViolations(violations);
    setIsErcOpen(true);
  }, [components, wires]);

  // Convert client mouse coordinates to world coordinates
  const clientToWorld = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = (clientX - rect.left - pan.x) / zoom;
      const rawY = (clientY - rect.top - pan.y) / zoom;
      return {
        x: isGridSnap ? Math.round(rawX / gridStep) * gridStep : Math.round(rawX),
        y: isGridSnap ? Math.round(rawY / gridStep) * gridStep : Math.round(rawY),
      };
    },
    [pan, zoom, isGridSnap]
  );

  // Pin click handler (for Wire mode)
  const handlePinClick = useCallback(
    (e: React.MouseEvent, compId: string, pinId: string, wx: number, wy: number) => {
      e.stopPropagation();
      if (tool !== 'wire') {
        onSelectComponent(compId);
        return;
      }

      if (!activeWireStart) {
        setActiveWireStart({ compId, pinId, x: wx, y: wy });
      } else {
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
    },
    [tool, activeWireStart, onSelectComponent, onAddWire]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'v' || e.key === 'V') setTool('select');
      else if (e.key === 'h' || e.key === 'H') setTool('pan');
      else if (e.key === 'w' || e.key === 'W') {
        setTool('wire');
        setActiveWireStart(null);
      } else if (e.key === 'r' || e.key === 'R') {
        if (selectedCompId) onRotateComponent(selectedCompId);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedCompId) onDeleteComponent(selectedCompId);
        else if (selectedWireId) onDeleteWire(selectedWireId);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          if (onRedo && canRedo) onRedo();
        } else {
          if (onUndo && canUndo) onUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        if (onRedo && canRedo) onRedo();
      } else if (e.key === 'Escape') {
        setActiveWireStart(null);
        setTool('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCompId, selectedWireId, onRotateComponent, onDeleteComponent, onDeleteWire, onUndo, onRedo, canUndo, canRedo]);

  // Canvas Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || tool === 'pan') {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else if (e.button === 0 && tool === 'select') {
      onSelectComponent(null);
      onSelectWire(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const wCoord = clientToWorld(e.clientX, e.clientY);
    setMousePos(wCoord);

    if (isDraggingCanvas) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    } else if (draggingCompId) {
      const newX = isGridSnap ? Math.round((wCoord.x - compDragOffset.x) / gridStep) * gridStep : wCoord.x - compDragOffset.x;
      const newY = isGridSnap ? Math.round((wCoord.y - compDragOffset.y) / gridStep) * gridStep : wCoord.y - compDragOffset.y;
      onUpdateComponentPosition(draggingCompId, newX, newY);
    }
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
    setDraggingCompId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.min(2.5, Math.max(0.4, prev * factor)));
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#050A14] select-none overflow-hidden">
      {/* Top Professional Toolbar */}
      <div className="h-10 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between px-3 z-20 shrink-0 gap-1.5 text-xs">
        <div className="flex items-center gap-1 shrink-0">
          {/* Tool Modes */}
          <button
            onClick={() => {
              setTool('select');
              setActiveWireStart(null);
            }}
            className={`px-2 py-1 rounded flex items-center gap-1 font-medium transition-colors ${
              tool === 'select' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Select & Move (V)"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Select (V)</span>
          </button>

          <button
            onClick={() => {
              setTool('pan');
              setActiveWireStart(null);
            }}
            className={`px-2 py-1 rounded flex items-center gap-1 font-medium transition-colors ${
              tool === 'pan' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Pan Sheet (H)"
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Pan (H)</span>
          </button>

          <button
            onClick={() => {
              setTool('wire');
              setActiveWireStart(null);
            }}
            className={`px-2 py-1 rounded flex items-center gap-1 font-medium transition-colors ${
              tool === 'wire' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Orthogonal Wire (W)"
          >
            <GitCommit className="w-3.5 h-3.5 text-blue-400" />
            <span>Wire (W)</span>
          </button>

          <div className="w-[1px] h-4 bg-slate-800 mx-1" />

          {/* Component Operations */}
          <button
            onClick={() => selectedCompId && onRotateComponent(selectedCompId)}
            disabled={!selectedCompId}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent"
            title="Rotate Component (R)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              if (selectedCompId) onDeleteComponent(selectedCompId);
              else if (selectedWireId) onDeleteWire(selectedWireId);
            }}
            disabled={!selectedCompId && !selectedWireId}
            className="p-1.5 rounded text-red-400 hover:text-red-300 hover:bg-red-950/40 disabled:opacity-40 disabled:hover:bg-transparent"
            title="Delete Selected (Del)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-slate-800 mx-1" />

          {/* History */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-40"
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-40"
            title="Redo (Ctrl+Y)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center / Right Tools */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleAutoTidy}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 flex items-center gap-1 font-medium transition-colors"
            title="Auto-Tidy: Align components into clean signal flow with zero overlaps"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto-Tidy</span>
          </button>

          <button
            onClick={handleRunErc}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 flex items-center gap-1 font-medium transition-colors"
            title="Electrical Rules Check (ERC)"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>ERC Check</span>
          </button>

          <div className="w-[1px] h-4 bg-slate-800 mx-1" />

          {/* Grid Snap Toggle */}
          <button
            onClick={() => setIsGridSnap((prev) => !prev)}
            className={`p-1.5 rounded transition-colors ${
              isGridSnap ? 'text-emerald-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'
            }`}
            title={`Grid Snap: ${isGridSnap ? 'ON (20px)' : 'OFF'}`}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          {/* Zoom */}
          <button
            onClick={() => setZoom((prev) => Math.min(2.5, prev * 1.15))}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setZoom((prev) => Math.max(0.4, prev * 0.85))}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 100, y: 80 });
            }}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            title="Reset Fit (100%)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Drafting Sheet Viewport */}
      <div
        ref={containerRef}
        className="flex-1 w-full h-full relative overflow-hidden cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg className="w-full h-full absolute inset-0 pointer-events-none">
          <defs>
            {/* Fine Grid Pattern */}
            <pattern id="schematic-grid" width={gridStep * zoom} height={gridStep * zoom} patternUnits="userSpaceOnUse">
              <circle cx={(gridStep * zoom) / 2} cy={(gridStep * zoom) / 2} r="0.75" fill="#1E293B" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#schematic-grid)" />
        </svg>

        {/* Scaled & Panned Sheet Layer */}
        <div
          className="absolute inset-0 origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* Engineering Sheet Frame (A3 Standard) */}
          <div className="absolute left-0 top-0 w-[1400px] h-[950px] border-2 border-slate-700 pointer-events-none bg-slate-950/40 shadow-2xl">
            {/* Inner Border */}
            <div className="absolute inset-2 border border-slate-800 pointer-events-none flex flex-col justify-between p-1 text-[9px] font-mono text-slate-600 select-none">
              <div className="flex justify-between px-2">
                <span>A</span>
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
                <span>6</span>
                <span>B</span>
              </div>
              <div className="flex justify-between px-2">
                <span>C</span>
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
                <span>6</span>
                <span>D</span>
              </div>
            </div>

            {/* Bottom-Right Professional Title Block */}
            <div className="absolute bottom-2 right-2 w-72 bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[10px] p-2 pointer-events-auto shadow-lg">
              <div className="border-b border-slate-700 pb-1 mb-1 font-bold text-slate-100 flex justify-between items-center">
                <span className="truncate max-w-[180px]">{project.title || 'Schematic Capture'}</span>
                <span className="text-[9px] text-emerald-400">REV 1.0</span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] text-slate-400">
                <div>ORG: <span className="text-slate-200">EI HOUSE ENG</span></div>
                <div>SHEET: <span className="text-slate-200">1 / 1</span></div>
                <div>COMPS: <span className="text-slate-200">{components.length}</span></div>
                <div>NETS: <span className="text-slate-200">{netCount}</span></div>
              </div>
            </div>
          </div>

          {/* SVG Wires & Junctions Layer */}
          <svg className="absolute left-0 top-0 w-[1400px] h-[950px] overflow-visible pointer-events-none z-10">
            {/* 90° Manhattan Orthogonal Wires */}
            {routedWires.map((rw) => (
              <g key={rw.wireId} className="pointer-events-auto">
                <polyline
                  points={rw.points.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={selectedWireId === rw.wireId ? '#10B981' : '#38BDF8'}
                  strokeWidth={selectedWireId === rw.wireId ? '3' : '2'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="cursor-pointer hover:stroke-emerald-400 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectWire(rw.wireId);
                  }}
                />
              </g>
            ))}

            {/* Junction Dots (3+ Net connections) */}
            {junctions.map((j, idx) => (
              <circle
                key={`junct-${idx}`}
                cx={j.x}
                cy={j.y}
                r="3.5"
                fill="#38BDF8"
                stroke="#0284C7"
                strokeWidth="1"
              />
            ))}

            {/* Active Rubberband Wire Preview */}
            {activeWireStart && (
              <line
                x1={activeWireStart.x}
                y1={activeWireStart.y}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="#F59E0B"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            )}
          </svg>

          {/* Components Layer */}
          <div className="absolute left-0 top-0 w-[1400px] h-[950px] pointer-events-none z-20">
            {components.map((comp) => {
              const posX = comp.editorPosition ? comp.editorPosition.x : comp.x;
              const posY = comp.editorPosition ? comp.editorPosition.y : comp.y;
              const isSelected = selectedCompId === comp.id;

              return (
                <div
                  key={comp.id}
                  className={`absolute pointer-events-auto cursor-move select-none ${
                    isSelected ? 'ring-2 ring-emerald-500 rounded' : ''
                  }`}
                  style={{
                    left: `${posX}px`,
                    top: `${posY}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onMouseDown={(e) => {
                    if (e.button === 0 && tool === 'select') {
                      e.stopPropagation();
                      onSelectComponent(comp.id);
                      setDraggingCompId(comp.id);
                      const wCoord = clientToWorld(e.clientX, e.clientY);
                      setCompDragOffset({
                        x: wCoord.x - posX,
                        y: wCoord.y - posY,
                      });
                    }
                  }}
                >
                  <svg className="overflow-visible" width="1" height="1">
                    <SchematicSymbol
                      component={comp}
                      isSelected={isSelected}
                      isSimulating={false}
                    />
                  </svg>

                  {/* Interactive Pin Connection Terminals */}
                  {comp.pins &&
                    comp.pins.map((pin) => {
                      const world = getPinWorldCoord(
                        { ...comp, x: posX, y: posY },
                        pin
                      );
                      const relX = world.x - posX;
                      const relY = world.y - posY;

                      return (
                        <div
                          key={pin.id}
                          className="absolute w-3 h-3 rounded-full border border-blue-400 bg-slate-900 hover:bg-emerald-400 hover:scale-125 transition-all cursor-pointer z-30"
                          style={{
                            left: `calc(50% + ${relX}px)`,
                            top: `calc(50% + ${relY}px)`,
                            transform: 'translate(-50%, -50%)',
                          }}
                          onClick={(e) => handlePinClick(e, comp.id, pin.id, world.x, world.y)}
                          title={`Pin: ${pin.name || pin.id} (${pin.pinType})`}
                        />
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ERC Report Modal */}
      {isErcOpen && (
        <ErcReportModal
          isOpen={isErcOpen}
          onClose={() => setIsErcOpen(false)}
          violations={ercViolations}
          onLocateViolation={(targetLocation, compId) => {
            if (compId) onSelectComponent(compId);
            if (targetLocation) {
              setPan({
                x: 400 - targetLocation.x * zoom,
                y: 300 - targetLocation.y * zoom,
              });
            }
            setIsErcOpen(false);
          }}
        />
      )}
    </div>
  );
}
