'use client';

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
  CircuitComponent,
  CircuitWire,
  WireInteractionMode,
  WireRoutingStyle,
} from '@/modules/engineering-lab/types';
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
  Tag,
  AlignLeft,
  AlignRight,
  AlignCenter,
  FileCheck2,
  CheckCircle2,
  Unplug,
} from 'lucide-react';
import { SchematicSymbol } from './SchematicSymbols';
import { SchematicSheetFrame } from './SchematicSheetFrame';
import { ErcReportModal } from '../Panels/ErcReportModal';
import {
  runElectricalRulesCheck,
  ErcViolation,
} from '@/modules/engineering-lab/circuit-engine/schematic-erc';
import {
  Point,
  ElbowOrientation,
  getFullWireVertices,
  extractWireSegments,
  slideWireSegment,
  dragWireCornerVertex,
  calculateJunctionDots,
  simplifyCollinearPoints,
  computeOrthogonalVertices,
  compute45Vertices,
  verticesToSvgPath,
} from '@/modules/engineering-lab/circuit-engine/wire-router';

export interface SchematicCanvasProps {
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
  onDisconnectWire?: (wireId: string) => void;
  onUpdateWire?: (wire: CircuitWire) => void;
  onClearSheet?: () => void;
  isSimulating: boolean;
  simulationStates: Record<
    string,
    {
      voltage: number;
      current: number;
      on?: boolean;
      brightness?: number;
      status?: 'NORMAL' | 'WARNING' | 'BURNED';
      faultState?: 'NORMAL' | 'WARNING' | 'BURNED';
      burned?: boolean;
      isBurnedOut?: boolean;
      thermalStress?: number;
      fault?: string;
      digitalOut?: number;
      onRed?: boolean;
      onGreen?: boolean;
      onBlue?: boolean;
      redBrightness?: number;
      greenBrightness?: number;
      blueBrightness?: number;
    }
  >;
  wireCurrents?: Record<string, number>;
  projectTitle?: string;
  onAddComponent?: (comp: CircuitComponent) => void;
  onBatchUpdatePositions?: (updates: { id: string; x: number; y: number }[]) => void;
  onBatchDelete?: (compIds: string[], wireIds: string[]) => void;
  onAutoAnnotate?: () => void;
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
  style: WireRoutingStyle = 'orthogonal',
  elbow: ElbowOrientation = 'horizontal-first',
  isDrawingLive = false
): string {
  if (isDrawingLive) {
    const lastPt = waypoints && waypoints.length > 0 ? waypoints[waypoints.length - 1] : p1;
    let liveLeg: { x: number; y: number }[] = [];
    if (style === 'straight') {
      liveLeg = [lastPt, p2];
    } else if (style === 'diagonal45') {
      liveLeg = compute45Vertices(lastPt, p2, elbow);
    } else {
      liveLeg = computeOrthogonalVertices(lastPt, p2, elbow);
    }
    const allPts = [p1, ...(waypoints || []), ...liveLeg.slice(1)];
    return verticesToSvgPath(allPts);
  }

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

  if (elbow === 'vertical-first') {
    const midY = (p1.y + p2.y) / 2;
    return `M ${p1.x} ${p1.y} L ${p1.x} ${midY} L ${p2.x} ${midY} L ${p2.x} ${p2.y}`;
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
  onDisconnectWire,
  onUpdateWire,
  onClearSheet,
  isSimulating,
  simulationStates,
  wireCurrents,
  projectTitle = 'EI House India Schematic',
  onBatchUpdatePositions,
  onBatchDelete,
  onAutoAnnotate,
}: SchematicCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Tool Modes ('select' | 'wire' | 'pan' | 'delete' | 'net_highlight')
  const [toolMode, setToolMode] = useState<WireInteractionMode>('select');
  const [activeRoutingStyle, setActiveRoutingStyle] = useState<WireRoutingStyle>('orthogonal');
  const [elbowOrientation, setElbowOrientation] = useState<ElbowOrientation>('horizontal-first');

  // Interactive Wire Segment & Vertex Dragging
  const [draggingSegment, setDraggingSegment] = useState<{
    wireId: string;
    segmentIndex: number;
    isHorizontal: boolean;
    initialVertices: Point[];
  } | null>(null);

  const [draggingVertex, setDraggingVertex] = useState<{
    wireId: string;
    vertexIndex: number;
    initialVertices: Point[];
  } | null>(null);

  // Throttled wire dragging updater via requestAnimationFrame
  const pendingWireUpdateRef = useRef<CircuitWire | null>(null);
  const rafWireUpdateIdRef = useRef<number | null>(null);

  const scheduleWireUpdate = (wire: CircuitWire) => {
    pendingWireUpdateRef.current = wire;
    if (rafWireUpdateIdRef.current === null) {
      rafWireUpdateIdRef.current = requestAnimationFrame(() => {
        rafWireUpdateIdRef.current = null;
        if (pendingWireUpdateRef.current && onUpdateWire) {
          onUpdateWire(pendingWireUpdateRef.current);
        }
      });
    }
  };

  // Zoom & Pan transforms
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 40, y: 30 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Grid Configuration
  const gridSnapSize = 10;
  const [showSheetFrame] = useState(true);

  // Marquee Multi-Selection State
  const [selectedCompIds, setSelectedCompIds] = useState<Set<string>>(new Set());
  const [selectedWireIds, setSelectedWireIds] = useState<Set<string>>(new Set());
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null);

  // Synchronize single selection with parent prop
  useEffect(() => {
    if (selectedCompId) {
      setSelectedCompIds(new Set([selectedCompId]));
    } else if (selectedCompIds.size <= 1) {
      setSelectedCompIds(new Set());
    }
  }, [selectedCompId, selectedCompIds.size]);

  // Dragging single or multiple components
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const [dragInitialPositions, setDragInitialPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [dragStartPoint, setDragStartPoint] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Wiring in progress with intermediate waypoints (STRICT WIRE MODE ONLY)
  const [activeWireStart, setActiveWireStart] = useState<{
    compId: string;
    pinId: string;
    x: number;
    y: number;
  } | null>(null);
  const [activeWaypoints, setActiveWaypoints] = useState<{ x: number; y: number }[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Magnetic Pin Snapping
  const [snappedPin, setSnappedPin] = useState<{
    compId: string;
    pinId: string;
    name: string;
    x: number;
    y: number;
  } | null>(null);

  // Modal: Inline Net Label Editor
  const [editingNetLabelWireId, setEditingNetLabelWireId] = useState<string | null>(null);
  const [tempNetLabel, setTempNetLabel] = useState<string>('');

  // Current flow animation tick
  const [animOffset, setAnimOffset] = useState(0);

  // Selected Wire State & Context Menu
  const [localSelectedWireId, setLocalSelectedWireId] = useState<string | null>(null);
  const selectedWireId = propSelectedWireId !== undefined ? propSelectedWireId : localSelectedWireId;
  const setWireSelected = useCallback(
    (id: string | null) => {
      setLocalSelectedWireId(id);
      if (id) {
        setSelectedWireIds(new Set([id]));
      } else {
        setSelectedWireIds(new Set());
      }
      onSelectWire?.(id);
    },
    [onSelectWire]
  );

  const [wireContextMenu, setWireContextMenu] = useState<{
    x: number;
    y: number;
    wireId: string;
    canvasX: number;
    canvasY: number;
  } | null>(null);

  // Net Highlight state
  const [highlightedNetId, setHighlightedNetId] = useState<string | null>(null);

  // Electrical Rules Check (ERC) Diagnostics Modal
  const [isErcModalOpen, setIsErcModalOpen] = useState(false);
  const [highlightedErcNode, setHighlightedErcNode] = useState<{ x: number; y: number; id: string } | null>(null);

  // Clear Sheet confirmation modal
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Run Live ERC Analysis
  const ercViolations: ErcViolation[] = useMemo(() => {
    return runElectricalRulesCheck(components, wires);
  }, [components, wires]);

  const ercErrorCount = ercViolations.filter((v) => v.severity === 'error').length;
  const ercWarnCount = ercViolations.filter((v) => v.severity === 'warning').length;

  // Locate an ERC Violation on Canvas
  const handleLocateViolation = (targetLocation?: { x: number; y: number }, compId?: string) => {
    if (!targetLocation) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const w = rect ? rect.width : 1000;
    const h = rect ? rect.height : 700;

    setPan({
      x: w / 2 - targetLocation.x * zoom,
      y: h / 2 - targetLocation.y * zoom,
    });

    if (compId) {
      onSelectComponent(compId);
      setSelectedCompIds(new Set([compId]));
    }

    setHighlightedErcNode({ x: targetLocation.x, y: targetLocation.y, id: `erc_${Date.now()}` });
    setTimeout(() => setHighlightedErcNode(null), 3500);
    toast.info(`Centered on ${targetLocation.x}, ${targetLocation.y}`);
  };

  // Zoom-to-Fit (Fit All components & wires on screen)
  const handleZoomToFit = useCallback(() => {
    if (components.length === 0) {
      setZoom(1.0);
      setPan({ x: 40, y: 30 });
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    components.forEach((c) => {
      minX = Math.min(minX, c.x - 50);
      maxX = Math.max(maxX, c.x + 50);
      minY = Math.min(minY, c.y - 40);
      maxY = Math.max(maxY, c.y + 40);
    });

    const boxW = Math.max(300, maxX - minX + 120);
    const boxH = Math.max(200, maxY - minY + 120);

    const scaleX = rect.width / boxW;
    const scaleY = rect.height / boxH;
    const targetZoom = Math.min(1.8, Math.max(0.45, Math.min(scaleX, scaleY)));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setZoom(targetZoom);
    setPan({
      x: rect.width / 2 - centerX * targetZoom,
      y: rect.height / 2 - centerY * targetZoom,
    });

    toast.success('Zoomed to fit all components');
  }, [components]);

  // Bulk Alignment Tools
  const handleAlign = (alignment: 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY') => {
    if (selectedCompIds.size < 2) return;
    const targets = components.filter((c) => selectedCompIds.has(c.id));
    if (targets.length < 2) return;

    let targetVal = 0;
    if (alignment === 'left') {
      targetVal = Math.min(...targets.map((c) => c.x));
    } else if (alignment === 'right') {
      targetVal = Math.max(...targets.map((c) => c.x));
    } else if (alignment === 'top') {
      targetVal = Math.min(...targets.map((c) => c.y));
    } else if (alignment === 'bottom') {
      targetVal = Math.max(...targets.map((c) => c.y));
    } else if (alignment === 'centerX') {
      targetVal = Math.round(targets.reduce((acc, c) => acc + c.x, 0) / targets.length / 10) * 10;
    } else if (alignment === 'centerY') {
      targetVal = Math.round(targets.reduce((acc, c) => acc + c.y, 0) / targets.length / 10) * 10;
    }

    const updates = targets.map((c) => ({
      id: c.id,
      x: ['left', 'right', 'centerX'].includes(alignment) ? targetVal : c.x,
      y: ['top', 'bottom', 'centerY'].includes(alignment) ? targetVal : c.y,
    }));

    if (onBatchUpdatePositions) {
      onBatchUpdatePositions(updates);
    } else {
      updates.forEach((u) => onUpdateComponentPosition(u.id, u.x, u.y));
    }

    toast.success(`Aligned ${targets.length} components (${alignment})`);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        if (selectedCompIds.size > 0 && onDuplicateComponent) {
          e.preventDefault();
          selectedCompIds.forEach((id) => onDuplicateComponent(id));
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
        if (selectedCompIds.size > 0) {
          e.preventDefault();
          selectedCompIds.forEach((id) => onRotateComponent(id));
        }
      } else if (!e.ctrlKey && !e.metaKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        handleZoomToFit();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedCompIds.size > 0 || selectedWireIds.size > 0) {
          e.preventDefault();
          if (onBatchDelete) {
            onBatchDelete(Array.from(selectedCompIds), Array.from(selectedWireIds));
          } else {
            selectedWireIds.forEach((wid) => onDeleteWire(wid));
            selectedCompIds.forEach((cid) => onDeleteComponent(cid));
          }
          setSelectedCompIds(new Set());
          setSelectedWireIds(new Set());
          setWireSelected(null);
          onSelectComponent(null);
          setWireContextMenu(null);
        }
      } else if (e.key === 'Escape') {
        setWireSelected(null);
        setActiveWireStart(null);
        setActiveWaypoints([]);
        setWireContextMenu(null);
        setHighlightedNetId(null);
        setEditingNetLabelWireId(null);
        setIsMarqueeSelecting(false);
        setSelectedCompIds(new Set());
        setSelectedWireIds(new Set());
      } else if (e.key === ' ' || e.code === 'Space') {
        if (activeWireStart && toolMode === 'wire') {
          e.preventDefault();
          setElbowOrientation((prev) => (prev === 'horizontal-first' ? 'vertical-first' : 'horizontal-first'));
        }
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
  }, [
    selectedCompIds,
    selectedWireIds,
    selectedWireId,
    selectedCompId,
    onDeleteWire,
    onDeleteComponent,
    onDuplicateComponent,
    onCopyComponent,
    onPasteComponent,
    onRotateComponent,
    mousePos,
    setWireSelected,
    activeWireStart,
    toolMode,
    onBatchDelete,
    onSelectComponent,
    handleZoomToFit,
  ]);

  // Simulation current dot flow loop
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
    // STEP 2: Block default right click menu
    if (e.button === 2) {
      e.preventDefault();
      if (activeWireStart) {
        setActiveWireStart(null);
        setActiveWaypoints([]);
        return;
      }
    }

    if (wireContextMenu) setWireContextMenu(null);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const curX = (e.clientX - rect.left - pan.x) / zoom;
    const curY = (e.clientY - rect.top - pan.y) / zoom;

    if (e.button === 0) {
      // Dismiss wire floating toolbar when clicking on empty canvas
      if (selectedWireId && !e.shiftKey) {
        setWireSelected(null);
        if (onSelectWire) onSelectWire(null);
      }

      // If drawing a wire, clicking canvas locks a clean 90° corner waypoint
      if (activeWireStart && toolMode === 'wire') {
        const lastPt = activeWaypoints.length > 0 ? activeWaypoints[activeWaypoints.length - 1] : activeWireStart;
        const snapX = Math.round(curX / 10) * 10;
        const snapY = Math.round(curY / 10) * 10;
        if (activeRoutingStyle === 'orthogonal') {
          const corner = elbowOrientation === 'horizontal-first'
            ? { x: snapX, y: lastPt.y }
            : { x: lastPt.x, y: snapY };
          if (Math.abs(corner.x - lastPt.x) > 1 || Math.abs(corner.y - lastPt.y) > 1) {
            setActiveWaypoints((prev) => [...prev, corner]);
          } else {
            setActiveWaypoints((prev) => [...prev, { x: snapX, y: snapY }]);
          }
        } else {
          setActiveWaypoints((prev) => [...prev, { x: snapX, y: snapY }]);
        }
        return;
      }

      // Pan Canvas
      if (toolMode === 'pan' || e.shiftKey) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        return;
      }

      // In Select mode: clicking on canvas starts marquee multi-selection box
      if (toolMode === 'select') {
        setIsMarqueeSelecting(true);
        setMarqueeStart({ x: curX, y: curY });
        setMarqueeEnd({ x: curX, y: curY });
        if (!e.shiftKey) {
          setSelectedCompIds(new Set());
          setSelectedWireIds(new Set());
          onSelectComponent(null);
          setWireSelected(null);
        }
        return;
      }
    } else if (e.button === 1) {
      // Middle click pan
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const curCanvasX = (e.clientX - rect.left - pan.x) / zoom;
    const curCanvasY = (e.clientY - rect.top - pan.y) / zoom;
    setMousePos({ x: curCanvasX, y: curCanvasY });

    // Magnetic Pin Snap Search ONLY in Wire Mode
    if (toolMode === 'wire') {
      let nearest: { compId: string; pinId: string; name: string; x: number; y: number; dist: number } | null = null;
      components.forEach((c) => {
        c.pins.forEach((p) => {
          const wCoord = getPinWorldCoord(c, p);
          const d = Math.sqrt((wCoord.x - curCanvasX) ** 2 + (wCoord.y - curCanvasY) ** 2);
          if (d <= 18) {
            if (!nearest || d < nearest.dist) {
              nearest = { compId: c.id, pinId: p.id, name: p.name, x: wCoord.x, y: wCoord.y, dist: d };
            }
          }
        });
      });
      setSnappedPin(nearest);
    } else {
      setSnappedPin(null);
    }

    // Panning
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    // Rubber-Band Marquee Selection Box
    if (isMarqueeSelecting && marqueeStart) {
      setMarqueeEnd({ x: curCanvasX, y: curCanvasY });
      const x1 = Math.min(marqueeStart.x, curCanvasX);
      const x2 = Math.max(marqueeStart.x, curCanvasX);
      const y1 = Math.min(marqueeStart.y, curCanvasY);
      const y2 = Math.max(marqueeStart.y, curCanvasY);

      const inBoxComps = new Set<string>();
      components.forEach((c) => {
        if (c.x >= x1 - 35 && c.x <= x2 + 35 && c.y >= y1 - 25 && c.y <= y2 + 25) {
          inBoxComps.add(c.id);
        }
      });
      setSelectedCompIds(inBoxComps);
      return;
    }

    // Interactive Wire Segment Dragging (Clean Orthogonal Adjustment, No Infinite Staircase Splits)
    if (draggingSegment && onUpdateWire) {
      const targetWire = wires.find((w) => w.id === draggingSegment.wireId);
      if (targetWire && draggingSegment.initialVertices && draggingSegment.initialVertices.length >= 2) {
        const targetCoord = draggingSegment.isHorizontal ? curCanvasY : curCanvasX;
        const updatedWaypoints = slideWireSegment(
          draggingSegment.initialVertices,
          draggingSegment.segmentIndex,
          targetCoord,
          10
        );
        scheduleWireUpdate({
          ...targetWire,
          points: updatedWaypoints.length > 0 ? updatedWaypoints : undefined,
        });
        return;
      }
    }

    // Interactive Corner Vertex Dragging
    if (draggingVertex && onUpdateWire) {
      const targetWire = wires.find((w) => w.id === draggingVertex.wireId);
      if (targetWire && draggingVertex.initialVertices && draggingVertex.initialVertices.length >= 2) {
        const updatedWaypoints = dragWireCornerVertex(
          draggingVertex.initialVertices,
          draggingVertex.vertexIndex,
          { x: curCanvasX, y: curCanvasY },
          10
        );
        scheduleWireUpdate({
          ...targetWire,
          points: updatedWaypoints.length > 0 ? updatedWaypoints : undefined,
        });
        return;
      }
    }

    // Multi-Component Dragging
    if (draggingCompId && dragInitialPositions.size > 0) {
      const deltaX = Math.round((curCanvasX - dragStartPoint.x) / gridSnapSize) * gridSnapSize;
      const deltaY = Math.round((curCanvasY - dragStartPoint.y) / gridSnapSize) * gridSnapSize;

      dragInitialPositions.forEach((initPos, id) => {
        onUpdateComponentPosition(id, initPos.x + deltaX, initPos.y + deltaY);
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingCompId(null);
    setDraggingSegment(null);
    setDraggingVertex(null);
    setIsMarqueeSelecting(false);
    setMarqueeStart(null);
    setMarqueeEnd(null);

    // Cancel pending animation frame and commit final pruned/simplified collinear wire waypoints
    if (rafWireUpdateIdRef.current !== null) {
      cancelAnimationFrame(rafWireUpdateIdRef.current);
      rafWireUpdateIdRef.current = null;
    }
    if (pendingWireUpdateRef.current && onUpdateWire) {
      const finalWire = { ...pendingWireUpdateRef.current };
      if (finalWire.points && finalWire.points.length > 0) {
        const fromComp = components.find((c) => c.id === finalWire.fromCompId);
        const toComp = components.find((c) => c.id === finalWire.toCompId);
        const fromPin = fromComp?.pins.find((p) => p.id === finalWire.fromPinId);
        const toPin = toComp?.pins.find((p) => p.id === finalWire.toPinId);
        if (fromComp && toComp && fromPin && toPin) {
          const p1 = getPinWorldCoord(fromComp, fromPin);
          const p2 = getPinWorldCoord(toComp, toPin);
          const full = [p1, ...finalWire.points, p2];
          const simplified = simplifyCollinearPoints(full).slice(1, -1);
          finalWire.points = simplified.length > 0 ? simplified : undefined;
        }
      }
      onUpdateWire(finalWire);
      pendingWireUpdateRef.current = null;
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.max(0.4, Math.min(2.5, prev * factor)));
  };

  // STEP 2: Strict Wire Mode Rule for Pin Click
  const handlePinClick = (e: React.MouseEvent, compId: string, pinId: string, pinX: number, pinY: number) => {
    e.stopPropagation();

    // RULE: In Select mode, clicking pin MUST ONLY select the component, NEVER start a wire!
    if (toolMode !== 'wire') {
      onSelectComponent(compId);
      setSelectedCompIds(new Set([compId]));
      return;
    }

    // When toolMode === 'wire', execute pin routing
    if (!activeWireStart) {
      setActiveWireStart({ compId, pinId, x: pinX, y: pinY });
      setActiveWaypoints([]);
    } else {
      if (activeWireStart.compId !== compId || activeWireStart.pinId !== pinId) {
        const cleanedWaypoints =
          activeWaypoints.length > 0 ? simplifyCollinearPoints(activeWaypoints) : undefined;
        onAddWire({
          fromCompId: activeWireStart.compId,
          fromPinId: activeWireStart.pinId,
          toCompId: compId,
          toPinId: pinId,
          points: cleanedWaypoints && cleanedWaypoints.length > 0 ? cleanedWaypoints : undefined,
          style: activeRoutingStyle,
        });
      }
      setActiveWireStart(null);
      setActiveWaypoints([]);
    }
  };

  // Wire right-click context menu (STEP 2: Custom CAD context menu)
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

  // Change wire color
  const handleChangeWireColor = (wireId: string, color: string) => {
    if (!onUpdateWire) return;
    const wire = wires.find((w) => w.id === wireId);
    if (!wire) return;
    onUpdateWire({ ...wire, color });
    setWireContextMenu(null);
  };

  // Calculate Electrical Solder Junction Dots (T-junctions & 3+ wire meeting nodes)
  const junctionDots = useMemo(() => {
    const wiresWithVertices = wires
      .map((w) => {
        const fromComp = components.find((c) => c.id === w.fromCompId);
        const toComp = components.find((c) => c.id === w.toCompId);
        const fromPin = fromComp?.pins.find((p) => p.id === w.fromPinId);
        const toPin = toComp?.pins.find((p) => p.id === w.toPinId);
        if (!fromComp || !toComp || !fromPin || !toPin) {
          return { id: w.id, vertices: [] as Point[], netName: w.netName };
        }
        const p1 = getPinWorldCoord(fromComp, fromPin);
        const p2 = getPinWorldCoord(toComp, toPin);
        const vertices = getFullWireVertices(
          p1,
          p2,
          w.points,
          w.style || activeRoutingStyle,
          elbowOrientation
        );
        return { id: w.id, vertices, netName: w.netName };
      })
      .filter((w) => w.vertices.length > 0);

    return calculateJunctionDots(wiresWithVertices);
  }, [wires, components, activeRoutingStyle, elbowOrientation]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => {
        // STEP 2: Strict Block Browser Right-Click Menu
        e.preventDefault();
        if (activeWireStart) {
          setActiveWireStart(null);
          setActiveWaypoints([]);
        }
      }}
      className={`relative w-full h-full bg-[#070D18] overflow-hidden select-none touch-none ${
        toolMode === 'pan' ? 'cursor-grab active:cursor-grabbing' : toolMode === 'wire' ? 'cursor-crosshair' : 'cursor-default'
      }`}
    >
      {/* ========================================================================= */}
      {/* STEP 2: CLEAN SLEEK TOOLBAR (ONLY ESSENTIAL WORKING EDA TOOLS)             */}
      {/* ========================================================================= */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900/95 border border-slate-700/80 rounded-xl px-2 py-1 shadow-2xl z-40 backdrop-blur max-w-[95vw] overflow-x-auto no-scrollbar touch-scroll">
        {/* Select (V) */}
        <button
          onClick={() => setToolMode('select')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
            toolMode === 'select'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Select Tool (V) — Select/inspect components without drawing wires"
        >
          <MousePointer className="w-3.5 h-3.5" />
          <span>Select (V)</span>
        </button>

        {/* Wire (W) */}
        <button
          onClick={() => setToolMode('wire')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
            toolMode === 'wire'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Wire Tool (W) — Draw connecting wires between terminal pins"
        >
          <Spline className="w-3.5 h-3.5" />
          <span>Wire (W)</span>
        </button>

        {/* Wire Routing Style Toggle: 90° Ortho | 45° Chamfer | Straight */}
        <div className="flex items-center gap-0.5 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveRoutingStyle('orthogonal')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
              activeRoutingStyle === 'orthogonal'
                ? 'bg-amber-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
            title="90° Orthogonal Routing (Manhattan EDA Standard)"
          >
            90° Ortho
          </button>
          <button
            onClick={() => setActiveRoutingStyle('diagonal45')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
              activeRoutingStyle === 'diagonal45'
                ? 'bg-amber-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
            title="45° Chamfered Routing"
          >
            45° Chamfer
          </button>
          <button
            onClick={() => setActiveRoutingStyle('straight')}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
              activeRoutingStyle === 'straight'
                ? 'bg-amber-600 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Straight Pin-to-Pin Direct Routing"
          >
            Straight
          </button>
        </div>

        {/* Flip Elbow [Space] Toggle */}
        <button
          onClick={() => {
            setElbowOrientation((prev) => (prev === 'horizontal-first' ? 'vertical-first' : 'horizontal-first'));
            toast.info(elbowOrientation === 'horizontal-first' ? 'Elbow: Vertical-first' : 'Elbow: Horizontal-first');
          }}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-colors border ${
            elbowOrientation === 'horizontal-first'
              ? 'text-cyan-400 bg-cyan-950/40 border-cyan-800/60 hover:bg-cyan-900/40'
              : 'text-purple-400 bg-purple-950/40 border-purple-800/60 hover:bg-purple-900/40'
          }`}
          title="Flip Elbow Direction [Space] (Horizontal-first vs Vertical-first)"
        >
          <span>Flip [Space]</span>
        </button>

        {/* Net Label (N) */}
        <button
          onClick={() => setToolMode('net_highlight')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
            toolMode === 'net_highlight'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Net Highlight Tool (N) — Click any wire to illuminate its net"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Net (N)</span>
        </button>

        {/* Pan (H) */}
        <button
          onClick={() => setToolMode('pan')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
            toolMode === 'pan'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Pan Tool (H) — Drag to move canvas viewport"
        >
          <Hand className="w-3.5 h-3.5" />
          <span>Pan (H)</span>
        </button>

        {/* Delete (D) */}
        <button
          onClick={() => setToolMode('delete')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
            toolMode === 'delete'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
          }`}
          title="Delete Tool (D) — Click to delete component or wire"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete (D)</span>
        </button>

        <div className="w-[1px] h-4 bg-slate-700 mx-1" />

        {/* Rotate (R) when component selected */}
        {selectedCompId && (
          <button
            onClick={() => onRotateComponent(selectedCompId)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono text-emerald-400 hover:bg-slate-800 border border-slate-700 transition-colors"
            title="Rotate Component 90° (R key)"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Rotate (R)</span>
          </button>
        )}

        {/* Duplicate when component selected */}
        {selectedCompId && onDuplicateComponent && (
          <button
            onClick={() => onDuplicateComponent(selectedCompId)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono text-amber-400 hover:bg-slate-800 border border-slate-700 transition-colors"
            title="Duplicate Component (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate</span>
          </button>
        )}

        {/* Electrical Rules Check (ERC) Button with Live Badge */}
        <button
          onClick={() => setIsErcModalOpen(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold transition-colors border ${
            ercErrorCount > 0
              ? 'bg-rose-950/80 border-rose-700 text-rose-300 hover:bg-rose-900 animate-pulse'
              : ercWarnCount > 0
              ? 'bg-amber-950/80 border-amber-700 text-amber-300 hover:bg-amber-900'
              : 'bg-emerald-950/60 border-emerald-800 text-emerald-300 hover:bg-emerald-900/80'
          }`}
          title="Run Electrical Rules Check (ERC) Diagnostics"
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>ERC</span>
          {ercErrorCount > 0 ? (
            <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px] font-bold">
              {ercErrorCount}
            </span>
          ) : ercWarnCount > 0 ? (
            <span className="px-1.5 py-0.2 bg-amber-600 text-white rounded-full text-[10px] font-bold">
              {ercWarnCount}
            </span>
          ) : (
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          )}
        </button>

        {/* Clear Sheet Action */}
        {onClearSheet && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono text-rose-400 hover:text-white hover:bg-rose-950 transition-colors ml-1"
            title="Clear Schematic Sheet"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Clear Sheet</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MULTI-COMPONENT CAD ALIGNMENT FLOATING PALETTE                            */}
      {/* ========================================================================= */}
      {selectedCompIds.size >= 2 && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#0B1528]/95 border border-cyan-500/80 rounded-xl px-3 py-1.5 shadow-2xl z-40 backdrop-blur font-mono text-xs animate-in fade-in zoom-in-95 duration-150 select-none pointer-events-auto"
        >
          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mr-1.5">
            {selectedCompIds.size} Selected
          </span>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              handleAlign('left');
            }}
            className="p-1 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 rounded transition-colors cursor-pointer"
            title="Align Left Edges"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              handleAlign('centerX');
            }}
            className="p-1 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 rounded transition-colors cursor-pointer"
            title="Align Center Horizontally"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              handleAlign('right');
            }}
            className="p-1 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 rounded transition-colors cursor-pointer"
            title="Align Right Edges"
          >
            <AlignRight className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          {/* Bulk Rotate */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              const ids = Array.from(selectedCompIds);
              ids.forEach((id) => onRotateComponent(id));
              toast.success(`Rotated ${ids.length} selected components 90°`);
            }}
            className="p-1 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 rounded transition-colors cursor-pointer"
            title="Rotate All Selected 90° [R]"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Bulk Delete */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              const ids = Array.from(selectedCompIds);
              if (onBatchDelete) {
                onBatchDelete(ids, []);
              } else {
                ids.forEach((id) => onDeleteComponent(id));
              }
              setSelectedCompIds(new Set());
              onSelectComponent(null);
              toast.info(`Deleted ${ids.length} components`);
            }}
            className="p-1 hover:bg-rose-950 text-rose-400 hover:text-rose-300 rounded transition-colors cursor-pointer"
            title="Delete Selected Components [Del]"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CANVAS GRID BACKGROUND PATTERN                                            */}
      {/* ========================================================================= */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <pattern
            id="schematic-small-grid"
            width={gridSnapSize * 2 * zoom}
            height={gridSnapSize * 2 * zoom}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x % (gridSnapSize * 2 * zoom)}, ${
              pan.y % (gridSnapSize * 2 * zoom)
            })`}
          >
            <circle cx={2} cy={2} r={1} fill="#1E293B" opacity={0.65} />
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

      {/* ========================================================================= */}
      {/* MAIN SCHEMATIC RENDER GROUP WITH PAN AND ZOOM                             */}
      {/* ========================================================================= */}
      <div
        className="absolute inset-0 origin-top-left pointer-events-auto"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {/* SVG Layer for Drawing Sheet Frame, Connecting Wires, Junctions & Net Labels */}
        <svg id="main-schematic-svg" className="main-schematic-svg absolute inset-0 w-[4000px] h-[4000px] pointer-events-auto overflow-visible">
          {/* IEEE Schematic Drawing Sheet Frame & Title Block */}
          <SchematicSheetFrame projectTitle={projectTitle} showFrame={showSheetFrame} />

          {/* Connecting Wires */}
          {wires.map((wire) => {
            const fromComp = components.find((c) => c.id === wire.fromCompId);
            const toComp = components.find((c) => c.id === wire.toCompId);
            if (!fromComp || !toComp) return null;

            const fromPin = fromComp.pins.find((p) => p.id === wire.fromPinId);
            const toPin = toComp.pins.find((p) => p.id === wire.toPinId);
            if (!fromPin || !toPin) return null;

            const p1 = getPinWorldCoord(fromComp, fromPin);
            const p2 = getPinWorldCoord(toComp, toPin);

            const isShorted = ercViolations.some(
              (v) => v.code === 'ERR_DIRECT_SHORT' && v.wireIds?.includes(wire.id)
            );
            const routingStyle = wire.style || activeRoutingStyle;
            const fullVertices = getFullWireVertices(p1, p2, wire.points, routingStyle, elbowOrientation);
            const segments = extractWireSegments(wire.id, fullVertices);
            const pathData = computeWireSvgPath(p1, p2, wire.points, routingStyle, elbowOrientation);
            const isWireSelected = selectedWireId === wire.id || selectedWireIds.has(wire.id);
            const isHighlighted = highlightedNetId === wire.id;
            const wireBaseColor = isShorted
              ? '#EF4444'
              : wire.color || (isWireSelected ? '#F59E0B' : isHighlighted ? '#A855F7' : '#10B981');

            const midPoint =
              wire.points && wire.points.length > 0
                ? wire.points[Math.floor(wire.points.length / 2)]
                : { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

            return (
              <g key={wire.id} className="group">
                {/* Wide hit area for easy selection */}
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
                      setWireSelected(wire.id);
                      onSelectComponent(null);
                    }
                  }}
                  onContextMenu={(e) => handleWireContextMenu(e, wire.id)}
                />

                {/* Selection Halo */}
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

                {/* Interactive Draggable Segments & Midpoint Handles */}
                {segments.map((seg, sIdx) => {
                  const isH = seg.isHorizontal;
                  const isV = seg.isVertical;
                  const segMidX = (seg.p1.x + seg.p2.x) / 2;
                  const segMidY = (seg.p1.y + seg.p2.y) / 2;
                  return (
                    <g key={`seg_${wire.id}_${sIdx}`}>
                      <line
                        x1={seg.p1.x}
                        y1={seg.p1.y}
                        x2={seg.p2.x}
                        y2={seg.p2.y}
                        stroke="transparent"
                        strokeWidth={14}
                        className={
                          toolMode === 'select'
                            ? isH
                              ? 'cursor-ns-resize'
                              : isV
                              ? 'cursor-ew-resize'
                              : 'cursor-pointer'
                            : 'cursor-pointer'
                        }
                        onMouseDown={(e) => {
                          if (e.button === 0 && toolMode === 'select') {
                            e.stopPropagation();
                            setWireSelected(wire.id);
                            onSelectComponent(null);
                            setDraggingSegment({
                              wireId: wire.id,
                              segmentIndex: sIdx,
                              isHorizontal: isH,
                              initialVertices: [...fullVertices],
                            });
                          }
                        }}
                      />
                      {/* Midpoint handle for selected wire */}
                      {isWireSelected && seg.length > 20 && (
                        <circle
                          cx={segMidX}
                          cy={segMidY}
                          r={3.5}
                          fill="#10B981"
                          stroke="#0B1528"
                          strokeWidth={1.5}
                          className={
                            isH
                              ? 'cursor-ns-resize hover:scale-150 transition-transform'
                              : 'cursor-ew-resize hover:scale-150 transition-transform'
                          }
                          onMouseDown={(e) => {
                            if (e.button === 0 && toolMode === 'select') {
                              e.stopPropagation();
                              setDraggingSegment({
                                wireId: wire.id,
                                segmentIndex: sIdx,
                                isHorizontal: isH,
                                initialVertices: [...fullVertices],
                              });
                            }
                          }}
                        >
                          <title>Drag to slide wire segment</title>
                        </circle>
                      )}
                    </g>
                  );
                })}

                {/* Draggable Corner Vertex Handles for Selected Wire */}
                {isWireSelected &&
                  fullVertices.slice(1, -1).map((v, vIdx) => (
                    <circle
                      key={`vertex_${wire.id}_${vIdx}`}
                      cx={v.x}
                      cy={v.y}
                      r={4.5}
                      fill="#06B6D4"
                      stroke="#FFFFFF"
                      strokeWidth={1.5}
                      className="cursor-move hover:scale-125 transition-transform"
                      onMouseDown={(e) => {
                        if (e.button === 0 && toolMode === 'select') {
                          e.stopPropagation();
                          setDraggingVertex({
                            wireId: wire.id,
                            vertexIndex: vIdx + 1,
                            initialVertices: [...fullVertices],
                          });
                        }
                      }}
                    >
                      <title>Drag corner vertex</title>
                    </circle>
                  ))}

                {/* Electron Flow */}
                {isSimulating && (
                  (() => {
                    const wCurrent = wireCurrents ? wireCurrents[wire.id] ?? 0 : 1;
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

                {/* Net Label Flag */}
                {wire.netName && (
                  <g
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingNetLabelWireId(wire.id);
                      setTempNetLabel(wire.netName || '');
                    }}
                  >
                    <polygon
                      points={`${midPoint.x - 20},${midPoint.y - 8} ${midPoint.x + 20},${midPoint.y - 8} ${
                        midPoint.x + 28
                      },${midPoint.y} ${midPoint.x + 20},${midPoint.y + 8} ${midPoint.x - 20},${midPoint.y + 8}`}
                      fill="#0B1528"
                      stroke={wireBaseColor}
                      strokeWidth={1.5}
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
              </g>
            );
          })}

          {/* Electrical Solder Junction Dots */}
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
          {activeWireStart && toolMode === 'wire' && (
            <g>
              <path
                d={computeWireSvgPath(
                  activeWireStart,
                  snappedPin ? { x: snappedPin.x, y: snappedPin.y } : mousePos,
                  activeWaypoints,
                  activeRoutingStyle,
                  elbowOrientation,
                  true
                )}
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

          {/* Magnetic Pin Proximity Snap Indicator (ONLY in Wire Mode) */}
          {snappedPin && toolMode === 'wire' && (
            <g className="pointer-events-none">
              <circle
                cx={snappedPin.x}
                cy={snappedPin.y}
                r={10}
                fill="none"
                stroke="#10B981"
                strokeWidth={2}
                className="animate-ping"
              />
              <circle cx={snappedPin.x} cy={snappedPin.y} r={5} fill="#10B981" />
              <rect
                x={snappedPin.x - 24}
                y={snappedPin.y - 24}
                width={48}
                height={16}
                rx={3}
                fill="#0B1528"
                stroke="#10B981"
                strokeWidth={1}
              />
              <text
                x={snappedPin.x}
                y={snappedPin.y - 13}
                fill="#34D399"
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {snappedPin.name}
              </text>
            </g>
          )}

          {/* ERC Highlight Pulse Ring when locating violation */}
          {highlightedErcNode && (
            <g className="pointer-events-none">
              <circle
                cx={highlightedErcNode.x}
                cy={highlightedErcNode.y}
                r={36}
                fill="none"
                stroke="#EF4444"
                strokeWidth={3}
                strokeDasharray="6 3"
                className="animate-spin"
              />
              <circle
                cx={highlightedErcNode.x}
                cy={highlightedErcNode.y}
                r={16}
                fill="#EF4444"
                opacity={0.3}
                className="animate-ping"
              />
            </g>
          )}

          {/* Rubber-Band Marquee Selection Box */}
          {isMarqueeSelecting && marqueeStart && marqueeEnd && (
            <rect
              x={Math.min(marqueeStart.x, marqueeEnd.x)}
              y={Math.min(marqueeStart.y, marqueeEnd.y)}
              width={Math.abs(marqueeEnd.x - marqueeStart.x)}
              height={Math.abs(marqueeEnd.y - marqueeStart.y)}
              fill="rgba(6, 182, 212, 0.12)"
              stroke="#06B6D4"
              strokeWidth={1.5}
              strokeDasharray="4, 2"
              className="pointer-events-none"
            />
          )}
        </svg>

        {/* Component Nodes Layer: Standard IEEE Schematic Symbols */}
        {components.map((comp) => {
          const isSelected = selectedCompId === comp.id || selectedCompIds.has(comp.id);
          const state = simulationStates[comp.id];

          return (
            <div
              key={comp.id}
              onClick={(e) => {
                e.stopPropagation();
                if (toolMode === 'delete') {
                  onDeleteComponent(comp.id);
                } else {
                  if (e.shiftKey) {
                    const next = new Set(selectedCompIds);
                    if (next.has(comp.id)) next.delete(comp.id);
                    else next.add(comp.id);
                    setSelectedCompIds(next);
                  } else {
                    setSelectedCompIds(new Set([comp.id]));
                    onSelectComponent(comp.id);
                  }
                }
              }}
              onMouseDown={(e) => {
                if (e.button === 0 && toolMode !== 'wire') {
                  e.stopPropagation();
                  let currentSelection = selectedCompIds;
                  if (!selectedCompIds.has(comp.id) && !e.shiftKey) {
                    currentSelection = new Set([comp.id]);
                    setSelectedCompIds(currentSelection);
                    onSelectComponent(comp.id);
                  }

                  setDraggingCompId(comp.id);
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    const curX = (e.clientX - rect.left - pan.x) / zoom;
                    const curY = (e.clientY - rect.top - pan.y) / zoom;
                    setDragStartPoint({ x: curX, y: curY });

                    const initMap = new Map<string, { x: number; y: number }>();
                    components.forEach((c) => {
                      if (currentSelection.has(c.id)) {
                        initMap.set(c.id, { x: c.x, y: c.y });
                      }
                    });
                    setDragInitialPositions(initMap);
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
                wires={wires}
                wireCurrents={wireCurrents}
                simState={state}
              />

              {/* Exact Terminal Pin Interactive Circles */}
              {comp.pins.map((pin) => {
                const world = getPinWorldCoord(comp, pin);
                const localX = world.x - comp.x;
                const localY = world.y - comp.y;
                const pinLabel = pin.name || (pin as unknown as { label?: string }).label || pin.id;

                // Check if this pin is connected to any wire
                const isPinConnected = wires.some(
                  (w) => (w.fromCompId === comp.id && w.fromPinId === pin.id) ||
                         (w.toCompId === comp.id && w.toPinId === pin.id)
                );

                return (
                  <div
                    key={pin.id}
                    onClick={(e) => handlePinClick(e, comp.id, pin.id, world.x, world.y)}
                    className={`absolute w-3.5 h-3.5 rounded-full border-2 transition-all cursor-pointer z-30 flex items-center justify-center group/pin ${
                      isPinConnected
                        ? 'bg-emerald-400 border-white ring-1 ring-emerald-500'
                        : 'bg-slate-900 border-emerald-400 hover:bg-emerald-400 hover:scale-125'
                    }`}
                    style={{
                      left: `calc(50% + ${localX}px)`,
                      top: `calc(50% + ${localY}px)`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    title={`Pin: ${pinLabel} (${pin.pinType}) ${isPinConnected ? '[Connected]' : '[Floating]'}`}
                  >
                    <span className="opacity-0 group-hover/pin:opacity-100 absolute -top-5 left-1/2 -translate-x-1/2 bg-slate-950 text-[10px] text-amber-300 font-mono font-bold px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap border border-amber-400/80 shadow-lg z-40">
                      {pinLabel}
                    </span>
                  </div>
                );
              })}

              {/* Floating Inline Quick Action Bar when Single Component is Selected */}
              {isSelected && selectedCompIds.size <= 1 && (
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
                      title="Mirror Horizontally"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                    </button>
                  )}
                  {onDuplicateComponent && (
                    <button
                      onClick={() => onDuplicateComponent(comp.id)}
                      className="p-1 hover:bg-slate-800 text-amber-400 hover:text-white rounded transition-colors"
                      title="Duplicate (Ctrl+D)"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteComponent(comp.id)}
                    className="p-1 hover:bg-rose-950 text-rose-400 hover:text-rose-300 rounded transition-colors"
                    title="Delete Component [Del]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* STEP 2: NON-OBSTRUCTIVE FLOATING WIRE ACTION BAR (DOCKED AT BOTTOM-CENTER) */}
      {/* ========================================================================= */}
      {(() => {
        // Auto-hide toolbar while dragging or editing
        if (
          !selectedWireId ||
          wireContextMenu ||
          draggingSegment ||
          draggingVertex ||
          draggingCompId ||
          isPanning ||
          isMarqueeSelecting
        ) {
          return null;
        }
        const targetWire = wires.find((w) => w.id === selectedWireId);
        if (!targetWire) return null;

        return (
          <div
            className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-[#0B1528]/95 border border-slate-700/90 px-3.5 py-1.5 rounded-xl shadow-2xl backdrop-blur font-mono text-xs select-none pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-150"
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {/* STEP 2: SINGLE Disconnect Button */}
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (onDisconnectWire) {
                  onDisconnectWire(targetWire.id);
                } else {
                  onDeleteWire(targetWire.id);
                }
                setWireSelected(null);
              }}
              className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/70 text-amber-200 rounded flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
              title="Disconnect wire completely from both terminal pins"
            >
              <Unplug className="w-3.5 h-3.5 text-amber-400" />
              <span>Disconnect</span>
            </button>

            <div className="h-4 w-px bg-slate-700 mx-0.5" />

            {/* Color Swatches */}
            <div className="flex items-center gap-1 px-1">
              {[
                { label: 'Green (Signal)', hex: '#10B981' },
                { label: 'Red (+5V)', hex: '#EF4444' },
                { label: 'Blue (Bus)', hex: '#3B82F6' },
                { label: 'Yellow (Clock)', hex: '#FBBF24' },
                { label: 'Slate (GND)', hex: '#64748B' },
              ].map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChangeWireColor(targetWire.id, c.hex);
                  }}
                  className={`w-3.5 h-3.5 rounded-full border transition-transform cursor-pointer ${
                    (targetWire.color || '#10B981') === c.hex
                      ? 'border-white scale-125 ring-1 ring-white/50'
                      : 'border-slate-600 hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={`Set color: ${c.label}`}
                />
              ))}
            </div>

            <div className="h-4 w-px bg-slate-700 mx-0.5" />

            {/* Set Net Label */}
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setEditingNetLabelWireId(targetWire.id);
                setTempNetLabel(targetWire.netName || '');
              }}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded flex items-center gap-1 text-xs transition-colors cursor-pointer"
              title="Assign Net Label (e.g. VCC, RESET, SDA)"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Net Label</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setWireSelected(null);
              }}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded text-xs leading-none ml-1"
            >
              ✕
            </button>
          </div>
        );
      })()}

      {/* Wire Right-Click Context Menu (STEP 2: Custom CAD Menu) */}
      {wireContextMenu && (() => {
        const targetWire = wires.find((w) => w.id === wireContextMenu.wireId);
        return (
          <div
            className="fixed bg-[#0B1528] border border-slate-700 rounded-lg shadow-2xl p-1.5 z-50 font-mono text-xs text-slate-200 space-y-1 w-48 backdrop-blur-md"
            style={{ left: `${wireContextMenu.x}px`, top: `${wireContextMenu.y}px` }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1 text-[10px] text-slate-400 uppercase border-b border-slate-800 font-bold flex items-center justify-between">
              <span>Wire Options</span>
              {targetWire?.netName && <span className="text-emerald-400 font-bold">{targetWire.netName}</span>}
            </div>

            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setEditingNetLabelWireId(wireContextMenu.wireId);
                setTempNetLabel(targetWire?.netName || '');
                setWireContextMenu(null);
              }}
              className="w-full text-left px-2 py-1.5 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 rounded flex items-center gap-2 cursor-pointer"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Set Net Label...</span>
            </button>

            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (targetWire) {
                  if (onDisconnectWire) onDisconnectWire(targetWire.id);
                  else onDeleteWire(targetWire.id);
                }
                setWireContextMenu(null);
                setWireSelected(null);
              }}
              className="w-full text-left px-2 py-1.5 hover:bg-amber-950 text-amber-400 hover:text-amber-300 rounded flex items-center gap-2 border-t border-slate-800 cursor-pointer"
            >
              <Unplug className="w-3.5 h-3.5" />
              <span>Disconnect Wire</span>
            </button>

            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (onDisconnectWire) onDisconnectWire(wireContextMenu.wireId);
                else onDeleteWire(wireContextMenu.wireId);
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

      {/* Floating Canvas Zoom & Viewport Controls */}
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
          onClick={handleZoomToFit}
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition-colors"
          title="Zoom to Fit All (Press F)"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Status Bar Hint */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-400 pointer-events-none backdrop-blur">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span>Mode: {toolMode.toUpperCase()}</span>
        <span className="text-slate-600">|</span>
        <span>Grid: 10px</span>
        <span className="text-slate-600">|</span>
        <span>{toolMode === 'wire' ? 'Click pin to wire' : 'Click/Drag to select'}</span>
      </div>

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

      {/* Electrical Rules Check (ERC) Modal */}
      <ErcReportModal
        isOpen={isErcModalOpen}
        onClose={() => setIsErcModalOpen(false)}
        violations={ercViolations}
        onLocateViolation={handleLocateViolation}
        onAutoAnnotate={onAutoAnnotate}
      />
    </div>
  );
}
