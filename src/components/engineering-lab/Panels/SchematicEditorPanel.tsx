'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  CircuitComponent,
  CircuitWire,
  EngineeringProject,
  SchematicGraphicShape,
  SchematicTextNote,
  SchematicAttachedImage,
  SchematicNoConnect,
  SchematicManualJunction,
  SchematicNetLabel,
  SchematicPowerPort,
  SchematicTitleBlock,
  SchematicEditorSheetConfig,
} from '@/modules/engineering-lab/types';
import { runElectricalRulesCheck, ErcViolation, autoAnnotateComponents } from '@/modules/engineering-lab/circuit-engine/schematic-erc';
import { autoLayoutCircuit } from '@/modules/engineering-lab/schematic-engine/schematic-sync-layout';
import {
  getCanonicalWirePoints,
  computeCanonicalJunctions,
  projectPointOntoPolyline,
  resolveShortestNetWire,
} from './schematic-editor/canonical-geometry';
import {
  extractWireSegments,
  slideWireSegment,
  dragWireCornerVertex,
  Point,
} from '@/modules/engineering-lab/circuit-engine/wire-router';

import { SchematicLeftRail, SchematicTool } from './schematic-editor/SchematicLeftRail';
import { SchematicTopBar } from './schematic-editor/SchematicTopBar';
import { SchematicVectorSymbol } from './schematic-editor/SchematicVectorSymbols';
import { SchematicDrawingLayer } from './schematic-editor/SchematicDrawingLayer';
import { SchematicTitleBlockView } from './schematic-editor/SchematicTitleBlockView';
import { SchematicInlineEditor, InlineEditorTarget } from './schematic-editor/SchematicInlineEditor';
import { exportSchematicSvg, exportSchematicPng, printSchematicSheet } from './schematic-editor/export-utils';
import { SchematicBomNetlistModal } from './schematic-editor/SchematicBomNetlistModal';
import { loadEditorViewport, saveEditorViewport } from './schematic-editor/editor-session-store';
import { Search, X, Trash2 } from 'lucide-react';

const ErcReportModal = dynamic(
  () => import('./ErcReportModal').then((m) => m.ErcReportModal),
  { ssr: false }
);

export interface SchematicEditorPanelProps {
  project: EngineeringProject;
  components: CircuitComponent[];
  wires: CircuitWire[];
  selectedCompId: string | null;
  selectedCompIds?: string[];
  selectedWireId?: string | null;
  placingComponent?: CircuitComponent | null;
  onSelectComponent: (id: string | null) => void;
  onSelectComponents?: (ids: string[]) => void;
  onSelectWire?: (id: string | null) => void;
  onUpdateComponentPosition: (id: string, x: number, y: number) => void;
  onRotateComponent: (id: string) => void;
  onMirrorComponent?: (id: string) => void;
  onDeleteComponent: (id: string) => void;
  onAddWire: (wire: Omit<CircuitWire, 'id'> & { id?: string }) => void;
  onDeleteWire: (wireId: string) => void;
  onUpdateComponents: (comps: CircuitComponent[]) => void;
  onUpdateWires: (wires: CircuitWire[]) => void;
  onFinishPlacing?: (comp: CircuitComponent) => void;
  onCancelPlacing?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function SchematicEditorPanel({
  project,
  components,
  wires,
  selectedCompId,
  selectedCompIds: externalSelectedCompIds,
  selectedWireId,
  placingComponent: incomingPlacingComponent = null,
  onSelectComponent,
  onSelectComponents,
  onSelectWire = () => {},
  onUpdateComponentPosition,
  onRotateComponent,
  onMirrorComponent,
  onDeleteComponent,
  onAddWire,
  onDeleteWire,
  onUpdateComponents,
  onUpdateWires,
  onFinishPlacing,
  onCancelPlacing,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: SchematicEditorPanelProps) {
  // Primary Tool Selection
  const [tool, setTool] = useState<SchematicTool>('select');

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: 'component' | 'wire' | 'canvas';
    targetId?: string;
  } | null>(null);

  // Ruler measurement state
  const [rulerStart, setRulerStart] = useState<{ x: number; y: number } | null>(null);

  // Multi-Component Selection state
  const [internalSelectedCompIds, setInternalSelectedCompIds] = useState<string[]>([]);
  const selectedCompIds = externalSelectedCompIds || internalSelectedCompIds;

  // Wire Selection state (internal fallback + prop sync)
  const [internalSelectedWireId, setInternalSelectedWireId] = useState<string | null>(null);
  const activeSelectedWireId = selectedWireId !== undefined && selectedWireId !== null ? selectedWireId : internalSelectedWireId;

  const updateSelectedCompIds = useCallback((ids: string[]) => {
    setInternalSelectedCompIds(ids);
    onSelectComponents?.(ids);
  }, [onSelectComponents]);

  // Marquee Selection Box { x1, y1, x2, y2 } in world coordinates
  const [marqueeBox, setMarqueeBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Group Dragging State for Multi-Component Move
  const [groupDragStartPos, setGroupDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [groupInitialPositions, setGroupInitialPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  // Annotation dragging & image resizing state
  const [draggingItem, setDraggingItem] = useState<{ type: string; id: string; startX: number; startY: number } | null>(null);
  const [resizingImage, setResizingImage] = useState<{ id: string; handle: string; startX: number; startY: number; origW: number; origH: number; origX: number; origY: number } | null>(null);

  // Initial Session State Restored from session store (keyed by project.id)
  const initialSession = useMemo(() => loadEditorViewport(project.id), [project.id]);

  // Sheet configuration (A4 / A3 / Letter, Grid, Theme)
  const [sheetConfig, setSheetConfig] = useState<SchematicEditorSheetConfig>(() => ({
    size: initialSession.sheetConfig?.size || project.schematicEditorSheet?.size || project.schematicEditorAnnotations?.sheet?.size || 'A3',
    theme: initialSession.sheetConfig?.theme || project.schematicEditorSheet?.theme || project.schematicEditorAnnotations?.sheet?.theme || 'dark',
    gridStep: initialSession.sheetConfig?.gridStep || project.schematicEditorSheet?.gridStep || project.schematicEditorAnnotations?.sheet?.gridStep || 20,
    snapToGrid: initialSession.sheetConfig?.snapToGrid ?? project.schematicEditorSheet?.snapToGrid ?? true,
  }));
  const [showGrid, setShowGrid] = useState(true);

  // Canvas Viewport Pan & Zoom
  const [zoom, setZoom] = useState<number>(initialSession.zoom);
  const [pan, setPan] = useState<{ x: number; y: number }>(initialSession.pan);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragStartClient, setDragStartClient] = useState<{ x: number; y: number } | null>(null);

  // Component Dragging State (Single component)
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const [compDragOffset, setCompDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Wire Segment Dragging State (Orthogonal sliding)
  const [draggingSegment, setDraggingSegment] = useState<{
    wireId: string;
    segmentIndex: number;
    isHorizontal: boolean;
    initialVertices: Point[];
  } | null>(null);

  // Wire Corner Dragging State
  const [draggingWireCorner, setDraggingWireCorner] = useState<{
    wireId: string;
    pointIndex: number;
    initialVertices?: Point[];
  } | null>(null);

  // Wire Selection Clearer Helper
  const clearWireSelection = useCallback(() => {
    setInternalSelectedWireId(null);
    onSelectWire(null);
  }, [onSelectWire]);

  // Wire Drawing State
  const [activeWireStart, setActiveWireStart] = useState<{ compId: string; pinId: string; x: number; y: number } | null>(null);
  const [wireWaypoints, setWireWaypoints] = useState<{ x: number; y: number }[]>([]);
  const [wireElbowFlip, setWireElbowFlip] = useState<boolean>(false);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);

  // Mouse Coordinates (World space)
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Ghost Placing State (from library or internal)
  const [localPlacingComponent, setLocalPlacingComponent] = useState<CircuitComponent | null>(null);
  const [ghostRotation, setGhostRotation] = useState<0 | 90 | 180 | 270>(0);
  const [ghostMirrored, setGhostMirrored] = useState<boolean>(false);

  // Active placing component reference
  const currentPlacingComp = incomingPlacingComponent || localPlacingComponent;

  // Annotations State (Shapes, text notes, images, no-connects, manual junctions, net labels, power ports, title block)
  const [shapes, setShapes] = useState<SchematicGraphicShape[]>(() => initialSession.shapes || project.schematicEditorAnnotations?.shapes || []);
  const [textNotes, setTextNotes] = useState<SchematicTextNote[]>(() => initialSession.textNotes || project.schematicEditorAnnotations?.textNotes || []);
  const [images, setImages] = useState<SchematicAttachedImage[]>(() => initialSession.images || project.schematicEditorAnnotations?.images || []);
  const [noConnects, setNoConnects] = useState<SchematicNoConnect[]>(() => initialSession.noConnects || project.schematicEditorAnnotations?.noConnects || []);
  const [manualJunctions, setManualJunctions] = useState<SchematicManualJunction[]>(() => initialSession.manualJunctions || project.schematicEditorAnnotations?.manualJunctions || []);
  const [netLabels, setNetLabels] = useState<SchematicNetLabel[]>(() => initialSession.netLabels || project.schematicEditorAnnotations?.netLabels || []);
  const [powerPorts, setPowerPorts] = useState<SchematicPowerPort[]>(() => initialSession.powerPorts || project.schematicEditorAnnotations?.powerPorts || []);
  const [titleBlock, setTitleBlock] = useState<SchematicTitleBlock | undefined>(() => initialSession.titleBlock || project.schematicEditorAnnotations?.titleBlock);

  // Selected annotation item
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Shape drawing in-progress
  const [drawingShapeStart, setDrawingShapeStart] = useState<{ x: number; y: number } | null>(null);

  // Power port sub-selection
  const [selectedPowerPortType, setSelectedPowerPortType] = useState<'VCC' | 'GND' | '+3.3V' | '+5V' | '+9V' | '+12V'>('VCC');

  // Inline Editor Modal Target
  const [inlineEditorTarget, setInlineEditorTarget] = useState<InlineEditorTarget | null>(null);

  // ERC Modal
  const [isErcOpen, setIsErcOpen] = useState(false);
  const [ercViolations, setErcViolations] = useState<ErcViolation[]>([]);

  // Pro EDA Dialogs State
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBomOpen, setIsBomOpen] = useState(false);
  const [wirePillPos, setWirePillPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Hidden File Input for Image Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Persist complete session state (viewport, config, annotations) to session store on change
  useEffect(() => {
    saveEditorViewport(
      {
        pan,
        zoom,
        sheetConfig,
        shapes,
        textNotes,
        images,
        noConnects,
        manualJunctions,
        netLabels,
        powerPorts,
        titleBlock,
      },
      project.id
    );
  }, [
    pan,
    zoom,
    sheetConfig,
    shapes,
    textNotes,
    images,
    noConnects,
    manualJunctions,
    netLabels,
    powerPorts,
    titleBlock,
    project.id,
  ]);
  // Dynamic Sheet Dimensions based on standard size
  const sheetDimensions = useMemo(() => {
    switch (sheetConfig.size) {
      case 'A4':
        return { width: 1100, height: 780 };
      case 'Letter':
        return { width: 1050, height: 800 };
      case 'A3':
      default:
        return { width: 1400, height: 950 };
    }
  }, [sheetConfig.size]);

  // Compute canonical wire points and junctions matching SchematicCanvas.tsx 1-to-1
  const routedWires = useMemo(() => {
    return wires.map((w) => {
      const pts = getCanonicalWirePoints(w, components, wires);
      return {
        wireId: w.id,
        points: pts,
        netName: w.netName || 'NET',
        junctionPoint: w.junctionPoint,
      };
    });
  }, [wires, components]);

  // Combine auto-computed junction dots with manual junction dots
  const allJunctions = useMemo(() => {
    return computeCanonicalJunctions(routedWires, manualJunctions);
  }, [routedWires, manualJunctions]);

  // Unique electrical nets count
  const netCount = useMemo(() => {
    const nets = new Set<string>();
    wires.forEach((w) => {
      if (w.netName) nets.add(w.netName);
      else nets.add(`NET_${w.fromCompId}_${w.fromPinId}`);
    });
    return Math.max(nets.size, wires.length > 0 ? 1 : 0);
  }, [wires]);

  // Convert client mouse coordinates to world coordinates
  const clientToWorld = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = (clientX - rect.left - pan.x) / zoom;
      const rawY = (clientY - rect.top - pan.y) / zoom;
      const step = sheetConfig.gridStep;
      return {
        x: sheetConfig.snapToGrid ? Math.round(rawX / step) * step : Math.round(rawX),
        y: sheetConfig.snapToGrid ? Math.round(rawY / step) * step : Math.round(rawY),
      };
    },
    [pan, zoom, sheetConfig.gridStep, sheetConfig.snapToGrid]
  );

  // Auto-Tidy Layout handler
  const handleAutoTidy = useCallback(() => {
    const layout = autoLayoutCircuit(components, wires, sheetConfig.gridStep);
    onUpdateComponents(layout.components);
    onUpdateWires(layout.wires);
  }, [components, wires, sheetConfig.gridStep, onUpdateComponents, onUpdateWires]);

  // Rotate Counter-Clockwise handler (Shift+R)
  const handleRotateCcw = useCallback(() => {
    if (selectedCompIds.length > 0) {
      onUpdateComponents(
        components.map((c) => {
          if (!selectedCompIds.includes(c.id)) return c;
          const nextRot = (((c.rotation ?? 0) + 270) % 360) as 0 | 90 | 180 | 270;
          return { ...c, rotation: nextRot };
        })
      );
    } else if (selectedCompId) {
      const comp = components.find((c) => c.id === selectedCompId);
      if (comp) {
        const nextRot = (((comp.rotation ?? 0) + 270) % 360) as 0 | 90 | 180 | 270;
        onUpdateComponents(
          components.map((c) => (c.id === comp.id ? { ...c, rotation: nextRot } : c))
        );
      }
    }
  }, [selectedCompIds, selectedCompId, components, onUpdateComponents]);

  // Auto-Annotate components handler
  const handleAutoAnnotate = useCallback(() => {
    const annotated = autoAnnotateComponents(components);
    onUpdateComponents(annotated);
  }, [components, onUpdateComponents]);

  // Align Components handler
  const handleAlign = useCallback(
    (type: 'left' | 'top' | 'center' | 'distribute') => {
      if (components.length < 2) return;
      const sorted = [...components];
      if (type === 'left') {
        const minX = Math.min(...sorted.map((c) => c.x));
        onUpdateComponents(
          components.map((c) => ({
            ...c,
            x: minX,
          }))
        );
      } else if (type === 'top') {
        const minY = Math.min(...sorted.map((c) => c.y));
        onUpdateComponents(
          components.map((c) => ({
            ...c,
            y: minY,
          }))
        );
      } else if (type === 'center') {
        const avgX =
          sorted.reduce((sum, c) => sum + c.x, 0) /
          sorted.length;
        onUpdateComponents(
          components.map((c) => ({
            ...c,
            x: Math.round(avgX / 20) * 20,
          }))
        );
      } else if (type === 'distribute') {
        sorted.sort((a, b) => a.x - b.x);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const minX = first?.x ?? 0;
        const maxX = last?.x ?? 0;
        const step = (maxX - minX) / (sorted.length - 1 || 1);
        const posMap = new Map<string, number>();
        sorted.forEach((c, idx) => {
          posMap.set(c.id, Math.round((minX + idx * step) / 20) * 20);
        });
        onUpdateComponents(
          components.map((c) => ({
            ...c,
            x: posMap.get(c.id) ?? c.x,
          }))
        );
      }
    },
    [components, onUpdateComponents]
  );

  // Run ERC handler
  const handleRunErc = useCallback(() => {
    // Filter out unconnected pin warnings for pins with explicit No-Connect flags
    const ncPinKeys = new Set(noConnects.map((nc) => `${nc.compId}:${nc.pinId}`));
    const rawViolations = runElectricalRulesCheck(components, wires);
    const filtered = rawViolations.filter((v) => {
      if (v.code === 'WARN_UNCONNECTED_PIN' && v.compIds && v.pinIds) {
        const key = `${v.compIds[0]}:${v.pinIds[0]}`;
        return !ncPinKeys.has(key);
      }
      return true;
    });
    setErcViolations(filtered);
    setIsErcOpen(true);
  }, [components, wires, noConnects]);

  // Pin click handler
  const handlePinClick = useCallback(
    (e: React.MouseEvent, compId: string, pinId: string, wx: number, wy: number) => {
      e.stopPropagation();

      // Tool: Eraser
      if (tool === 'eraser') {
        onDeleteComponent(compId);
        return;
      }

      // Tool: No-Connect marker
      if (tool === 'noconnect') {
        setNoConnects((prev) => [
          ...prev.filter((nc) => !(nc.compId === compId && nc.pinId === pinId)),
          { id: `nc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, compId, pinId, x: wx, y: wy },
        ]);
        return;
      }

      // In Select mode, pin clicks never start wiring; bubble up to select component cleanly
      if (tool === 'select') {
        onSelectComponent(compId);
        updateSelectedCompIds([compId]);
        clearWireSelection();
        return;
      }

      // Tool: Wire drawing or direct pin click-to-wire in Wire or Bus mode ONLY
      if (tool === 'wire' || tool === 'bus') {
        if (!activeWireStart) {
          setActiveWireStart({ compId, pinId, x: wx, y: wy });
          setWireWaypoints([]);
        } else {
          if (activeWireStart.compId !== compId || activeWireStart.pinId !== pinId) {
            const startPt = { x: activeWireStart.x, y: activeWireStart.y };
            const lastPt = wireWaypoints.length > 0 ? wireWaypoints[wireWaypoints.length - 1] : startPt;
            const corner = wireElbowFlip
              ? { x: lastPt.x, y: wy }
              : { x: wx, y: lastPt.y };

            const finalPoints: { x: number; y: number }[] = [startPt, ...wireWaypoints];
            if (
              (corner.x !== lastPt.x || corner.y !== lastPt.y) &&
              (corner.x !== wx || corner.y !== wy)
            ) {
              finalPoints.push(corner);
            }
            finalPoints.push({ x: wx, y: wy });

            // Bug 2 Contract: wire.points stores ONLY interior waypoints (slice(1, -1))
            const interiorWaypoints = finalPoints.slice(1, -1);

            const resolved = resolveShortestNetWire(
              activeWireStart.compId,
              activeWireStart.pinId,
              compId,
              pinId,
              components,
              wires,
              interiorWaypoints,
              sheetConfig.gridStep
            );

            if (!resolved.skipDuplicate) {
              const newWireId = `wire_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
              onAddWire({
                id: newWireId,
                fromCompId: resolved.fromCompId,
                fromPinId: resolved.fromPinId,
                toCompId: resolved.toCompId,
                toPinId: resolved.toPinId,
                tappedWireId: resolved.tappedWireId,
                junctionPoint: resolved.junctionPoint,
                points: resolved.points,
              });
              setInternalSelectedWireId(newWireId);
              setWirePillPos({ x: wx, y: wy });
              onSelectWire(newWireId);
            }
          }
          setActiveWireStart(null);
          setWireWaypoints([]);
        }
        return;
      }

      onSelectComponent(compId);
    },
    [tool, activeWireStart, wireWaypoints, wireElbowFlip, onSelectComponent, onAddWire, onDeleteComponent, onSelectWire]
  );

  // Wire click handler
  const handleWireClick = useCallback(
    (e: React.MouseEvent, wireId: string, hitX: number, hitY: number) => {
      e.stopPropagation();

      // Tool: Eraser
      if (tool === 'eraser') {
        onDeleteWire(wireId);
        setInternalSelectedWireId(null);
        onSelectWire(null);
        return;
      }

      // Tool: Junction placement on wire
      if (tool === 'junction') {
        setManualJunctions((prev) => [
          ...prev,
          { id: `mj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, x: hitX, y: hitY },
        ]);
        return;
      }

      // Tool: Net Label attachment
      if (tool === 'netlabel') {
        const newNl: SchematicNetLabel = {
          id: `nl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          x: hitX,
          y: hitY,
          name: 'NET',
          wireId,
        };
        setNetLabels((prev) => [...prev, newNl]);
        setInlineEditorTarget({ type: 'netlabel', netLabel: newNl });
        setTool('select');
        return;
      }

      // Wire tap when in Wire or Bus mode and routing an active wire
      if ((tool === 'wire' || tool === 'bus') && activeWireStart) {
        const targetWire = wires.find((w) => w.id === wireId);
        if (targetWire) {
          const resolvedCheck = resolveShortestNetWire(
            activeWireStart.compId,
            activeWireStart.pinId,
            targetWire.fromCompId,
            targetWire.fromPinId,
            components,
            wires
          );
          if (resolvedCheck.skipDuplicate) {
            setActiveWireStart(null);
            setWireWaypoints([]);
            clearWireSelection();
            return;
          }

          const startPt = { x: activeWireStart.x, y: activeWireStart.y };
          const lastPt = wireWaypoints.length > 0 ? wireWaypoints[wireWaypoints.length - 1] : startPt;
          const corner = wireElbowFlip
            ? { x: lastPt.x, y: hitY }
            : { x: hitX, y: lastPt.y };

          const finalPoints: { x: number; y: number }[] = [startPt, ...wireWaypoints];
          if (
            (corner.x !== lastPt.x || corner.y !== lastPt.y) &&
            (corner.x !== hitX || corner.y !== hitY)
          ) {
            finalPoints.push(corner);
          }
          finalPoints.push({ x: hitX, y: hitY });

          const interiorWaypoints = finalPoints.slice(1, -1);
          const newWireId = `wire_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          onAddWire({
            id: newWireId,
            fromCompId: activeWireStart.compId,
            fromPinId: activeWireStart.pinId,
            toCompId: targetWire.fromCompId,
            toPinId: targetWire.fromPinId,
            tappedWireId: wireId,
            junctionPoint: { x: hitX, y: hitY },
            points: interiorWaypoints.length > 0 ? interiorWaypoints : undefined,
          });
          clearWireSelection();
          setActiveWireStart(null);
          setWireWaypoints([]);
          return;
        }
      }

      setWirePillPos({ x: hitX, y: hitY });
      setInternalSelectedWireId(wireId);
      onSelectWire(wireId);
      onSelectComponent(null);
    },
    [tool, activeWireStart, wireWaypoints, wireElbowFlip, wires, onAddWire, onSelectWire, onSelectComponent, onDeleteWire]
  );

  // Keyboard Shortcuts (V, H, W, J, N, P, Q, G, T, R, X, Y, Del, Ctrl+D, Ctrl+Z, Ctrl+Y, Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Space flips wire elbow or triggers pan
      if (e.code === 'Space') {
        if (tool === 'wire' && activeWireStart) {
          e.preventDefault();
          setWireElbowFlip((prev) => !prev);
          return;
        }
      }

      // Ctrl+F opens Quick Find
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setIsFindOpen(true);
        return;
      }

      // Ctrl+A selects all components
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        const allIds = components.map((c) => c.id);
        updateSelectedCompIds(allIds);
        if (allIds.length > 0) onSelectComponent(allIds[0]);
        return;
      }

      if (e.key === 'v' || e.key === 'V') setTool('select');
      else if (e.key === 'h' || e.key === 'H') setTool('pan');
      else if (e.key === 'w' || e.key === 'W') {
        setTool('wire');
        setActiveWireStart(null);
        setWireWaypoints([]);
      } else if (e.key === 'j' || e.key === 'J') setTool('junction');
      else if (e.key === 'n' || e.key === 'N') setTool('netlabel');
      else if (e.key === 'p' || e.key === 'P') setTool('power');
      else if (e.key === 'q' || e.key === 'Q') setTool('noconnect');
      else if (e.key === 'g' || e.key === 'G') setTool('draw_rect');
      else if (e.key === 't' || e.key === 'T') setTool('text');
      else if (e.key === 'r' || e.key === 'R') {
        if (e.shiftKey) {
          handleRotateCcw();
        } else if (currentPlacingComp) {
          setGhostRotation((prev) => (((prev + 90) % 360) as 0 | 90 | 180 | 270));
        } else if (selectedCompIds.length > 0) {
          selectedCompIds.forEach((id) => onRotateComponent(id));
        } else if (selectedCompId) {
          onRotateComponent(selectedCompId);
        }
      } else if (e.key === 'x' || e.key === 'X') {
        if (currentPlacingComp) {
          setGhostMirrored((prev) => !prev);
        } else if (selectedCompIds.length > 0) {
          const idSet = new Set(selectedCompIds);
          onUpdateComponents(
            components.map((c) =>
              idSet.has(c.id) ? { ...c, mirrored: !c.mirrored } : c
            )
          );
        } else if (selectedCompId) {
          const comp = components.find((c) => c.id === selectedCompId);
          if (comp) {
            onUpdateComponents(components.map((c) => (c.id === comp.id ? { ...c, mirrored: !c.mirrored } : c)));
          }
        }
      } else if ((e.key === 'y' || e.key === 'Y') && !(e.ctrlKey || e.metaKey)) {
        if (currentPlacingComp) {
          setGhostRotation((prev) => (((prev + 180) % 360) as 0 | 90 | 180 | 270));
        } else if (selectedCompIds.length > 0) {
          selectedCompIds.forEach((id) => onRotateComponent(id));
        } else if (selectedCompId) {
          onRotateComponent(selectedCompId);
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        if (selectedCompIds.length > 0) {
          const idSet = new Set(selectedCompIds);
          const dups: CircuitComponent[] = [];
          const newIds: string[] = [];
          components.forEach((c) => {
            if (idSet.has(c.id)) {
              const dupId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
              newIds.push(dupId);
              dups.push({
                ...c,
                id: dupId,
                x: c.x + 40,
                y: c.y + 40,
              });
            }
          });
          onUpdateComponents([...components, ...dups]);
          updateSelectedCompIds(newIds);
          if (newIds.length > 0) onSelectComponent(newIds[0]);
        } else if (selectedCompId) {
          const comp = components.find((c) => c.id === selectedCompId);
          if (comp) {
            const dupId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const dup: CircuitComponent = {
              ...comp,
              id: dupId,
              x: comp.x + 40,
              y: comp.y + 40,
            };
            onUpdateComponents([...components, dup]);
            onSelectComponent(dupId);
            updateSelectedCompIds([dupId]);
          }
        }
      } else if (e.key === 'Backspace' && activeWireStart) {
        e.preventDefault();
        setWireWaypoints((prev) => (prev.length > 0 ? prev.slice(0, prev.length - 1) : []));
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedCompIds.length > 0) {
          selectedCompIds.forEach((id) => onDeleteComponent(id));
          updateSelectedCompIds([]);
          onSelectComponent(null);
        } else if (selectedCompId) onDeleteComponent(selectedCompId);
        else if (activeSelectedWireId) {
          onDeleteWire(activeSelectedWireId);
          clearWireSelection();
        }
        else if (selectedItemId) {
          setShapes((prev) => prev.filter((s) => s.id !== selectedItemId));
          setTextNotes((prev) => prev.filter((t) => t.id !== selectedItemId));
          setImages((prev) => prev.filter((i) => i.id !== selectedItemId));
          setNoConnects((prev) => prev.filter((nc) => nc.id !== selectedItemId));
          setManualJunctions((prev) => prev.filter((mj) => mj.id !== selectedItemId));
          setNetLabels((prev) => prev.filter((nl) => nl.id !== selectedItemId));
          setPowerPorts((prev) => prev.filter((pp) => pp.id !== selectedItemId));
          setSelectedItemId(null);
        }
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
        setWireWaypoints([]);
        setContextMenu(null);
        setRulerStart(null);
        clearWireSelection();
        onSelectComponent(null);
        updateSelectedCompIds([]);
        setSelectedItemId(null);
        if (currentPlacingComp) {
          setLocalPlacingComponent(null);
          if (onCancelPlacing) onCancelPlacing();
        }
        setTool('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    tool,
    activeWireStart,
    currentPlacingComp,
    selectedCompId,
    selectedWireId,
    selectedItemId,
    components,
    onRotateComponent,
    handleRotateCcw,
    onDeleteComponent,
    onDeleteWire,
    onUpdateComponents,
    onSelectComponent,
    selectedCompIds,
    updateSelectedCompIds,
    onCancelPlacing,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
  ]);

  // Canvas Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    setContextMenu(null);

    // Middle-click or Pan tool activates canvas dragging
    if (e.button === 1 || tool === 'pan' || (e.button === 0 && e.altKey)) {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setDragStartClient({ x: e.clientX, y: e.clientY });
      return;
    }

    const wCoord = clientToWorld(e.clientX, e.clientY);

    // Cancel placing on right-click
    if (e.button === 2) {
      e.preventDefault();
      if (currentPlacingComp) {
        setLocalPlacingComponent(null);
        if (onCancelPlacing) onCancelPlacing();
      }
      setActiveWireStart(null);
      setWireWaypoints([]);
      return;
    }

    if (e.button === 0) {
      // Ruler tool: start measurement line
      if (tool === 'ruler') {
        setRulerStart(wCoord);
        return;
      }

      // Placing mode: drop component at cursor
      if (currentPlacingComp) {
        const placed: CircuitComponent = {
          ...currentPlacingComp,
          x: wCoord.x,
          y: wCoord.y,
          rotation: ghostRotation,
          mirrored: ghostMirrored,
        };

        if (onFinishPlacing) {
          onFinishPlacing(placed);
        } else {
          onUpdateComponents([...components, placed]);
        }
        setLocalPlacingComponent(null);
        return;
      }

      // Drawing Graphics (Rect, Line, Circle)
      if (['draw_rect', 'draw_line', 'draw_circle'].includes(tool)) {
        setDrawingShapeStart(wCoord);
        return;
      }

      // Text Note placement
      if (tool === 'text') {
        const newNote: SchematicTextNote = {
          id: `text_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          x: wCoord.x,
          y: wCoord.y,
          text: 'Note Text',
          fontSize: 12,
        };
        setTextNotes((prev) => [...prev, newNote]);
        setInlineEditorTarget({ type: 'text', textNote: newNote });
        setTool('select');
        return;
      }

      // Power / GND Port placement
      if (tool === 'power') {
        const newPort: SchematicPowerPort = {
          id: `pwr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          x: wCoord.x,
          y: wCoord.y,
          portType: selectedPowerPortType,
        };
        setPowerPorts((prev) => [...prev, newPort]);
        setTool('select');
        return;
      }

      // Sheet Port placement
      if (tool === 'sheetport') {
        const newNl: SchematicNetLabel = {
          id: `port_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          x: wCoord.x,
          y: wCoord.y,
          name: 'PORT_IO',
        };
        setNetLabels((prev) => [...prev, newNl]);
        setInlineEditorTarget({ type: 'netlabel', netLabel: newNl });
        setTool('select');
        return;
      }

      // Net Label placement on empty sheet
      if (tool === 'netlabel') {
        const newNl: SchematicNetLabel = {
          id: `nl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          x: wCoord.x,
          y: wCoord.y,
          name: 'NET',
        };
        setNetLabels((prev) => [...prev, newNl]);
        setInlineEditorTarget({ type: 'netlabel', netLabel: newNl });
        setTool('select');
        return;
      }

      // Wire waypoint locking when drawing wire (Wire, Bus, or Select mode with active wire)
      if ((tool === 'wire' || tool === 'bus' || tool === 'select') && activeWireStart) {
        const lastPt =
          wireWaypoints.length > 0 ? wireWaypoints[wireWaypoints.length - 1] : activeWireStart;
        const corner = wireElbowFlip
          ? { x: lastPt.x, y: wCoord.y }
          : { x: wCoord.x, y: lastPt.y };
        setWireWaypoints((prev) => {
          const next = [...prev];
          if (
            (corner.x !== lastPt.x || corner.y !== lastPt.y) &&
            (corner.x !== wCoord.x || corner.y !== wCoord.y)
          ) {
            next.push(corner);
          }
          next.push(wCoord);
          return next;
        });
        return;
      }

      // Clear wire selection on any empty canvas click when not currently drawing a wire
      clearWireSelection();
      onSelectComponent(null);
      updateSelectedCompIds([]);
      setSelectedItemId(null);

      // Marquee box selection start on empty canvas in Select mode
      if (tool === 'select') {
        setMarqueeBox({ x1: wCoord.x, y1: wCoord.y, x2: wCoord.x, y2: wCoord.y });
      }
    }
  };

  // Canvas Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    const wCoord = clientToWorld(e.clientX, e.clientY);
    setMousePos(wCoord);

    if (isDraggingCanvas) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    } else if (marqueeBox) {
      setMarqueeBox((prev) => (prev ? { ...prev, x2: wCoord.x, y2: wCoord.y } : null));
    } else if (groupDragStartPos && selectedCompIds.length > 0) {
      const dx = wCoord.x - groupDragStartPos.x;
      const dy = wCoord.y - groupDragStartPos.y;
      onUpdateComponents(
        components.map((c) => {
          const init = groupInitialPositions.get(c.id);
          if (init) {
            const rawX = init.x + dx;
            const rawY = init.y + dy;
            const newX = sheetConfig.snapToGrid
              ? Math.round(rawX / sheetConfig.gridStep) * sheetConfig.gridStep
              : rawX;
            const newY = sheetConfig.snapToGrid
              ? Math.round(rawY / sheetConfig.gridStep) * sheetConfig.gridStep
              : rawY;
            return {
              ...c,
              x: newX,
              y: newY,
            };
          }
          return c;
        })
      );
    } else if (draggingCompId) {
      const newX = sheetConfig.snapToGrid
        ? Math.round((wCoord.x - compDragOffset.x) / sheetConfig.gridStep) * sheetConfig.gridStep
        : wCoord.x - compDragOffset.x;
      const newY = sheetConfig.snapToGrid
        ? Math.round((wCoord.y - compDragOffset.y) / sheetConfig.gridStep) * sheetConfig.gridStep
        : wCoord.y - compDragOffset.y;
      onUpdateComponentPosition(draggingCompId, newX, newY);
    } else if (draggingSegment) {
      const targetWire = wires.find((w) => w.id === draggingSegment.wireId);
      if (targetWire && draggingSegment.initialVertices && draggingSegment.initialVertices.length >= 2) {
        const targetCoord = draggingSegment.isHorizontal ? wCoord.y : wCoord.x;
        const updatedWaypoints = slideWireSegment(
          draggingSegment.initialVertices,
          draggingSegment.segmentIndex,
          targetCoord,
          sheetConfig.snapToGrid ? sheetConfig.gridStep : 10
        );
        onUpdateWires(
          wires.map((w) =>
            w.id === targetWire.id
              ? {
                  ...w,
                  points: updatedWaypoints.length > 0 ? updatedWaypoints : undefined,
                }
              : w
          )
        );
      }
    } else if (draggingWireCorner) {
      const targetWire = wires.find((w) => w.id === draggingWireCorner.wireId);
      if (targetWire) {
        const rw = routedWires.find((r) => r.wireId === targetWire.id);
        const fullPoints = draggingWireCorner.initialVertices || (rw ? [...rw.points] : [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
        ]);
        const updatedWaypoints = dragWireCornerVertex(
          fullPoints,
          draggingWireCorner.pointIndex,
          wCoord,
          sheetConfig.snapToGrid ? sheetConfig.gridStep : 10
        );
        onUpdateWires(
          wires.map((w) =>
            w.id === targetWire.id
              ? {
                  ...w,
                  points: updatedWaypoints.length > 0 ? updatedWaypoints : undefined,
                }
              : w
          )
        );
      }
    } else if (draggingItem) {
      const dx = wCoord.x - draggingItem.startX;
      const dy = wCoord.y - draggingItem.startY;
      setDraggingItem({ ...draggingItem, startX: wCoord.x, startY: wCoord.y });

      if (draggingItem.type === 'text') {
        setTextNotes((prev) =>
          prev.map((t) => (t.id === draggingItem.id ? { ...t, x: t.x + dx, y: t.y + dy } : t))
        );
      } else if (draggingItem.type === 'image') {
        setImages((prev) =>
          prev.map((img) => (img.id === draggingItem.id ? { ...img, x: img.x + dx, y: img.y + dy } : img))
        );
      } else if (draggingItem.type === 'netlabel') {
        setNetLabels((prev) =>
          prev.map((nl) => (nl.id === draggingItem.id ? { ...nl, x: nl.x + dx, y: nl.y + dy } : nl))
        );
      } else if (draggingItem.type === 'powerport') {
        setPowerPorts((prev) =>
          prev.map((pp) => (pp.id === draggingItem.id ? { ...pp, x: pp.x + dx, y: pp.y + dy } : pp))
        );
      } else if (draggingItem.type === 'noconnect') {
        setNoConnects((prev) =>
          prev.map((nc) => (nc.id === draggingItem.id ? { ...nc, x: nc.x + dx, y: nc.y + dy } : nc))
        );
      } else if (draggingItem.type === 'junction') {
        setManualJunctions((prev) =>
          prev.map((mj) => (mj.id === draggingItem.id ? { ...mj, x: mj.x + dx, y: mj.y + dy } : mj))
        );
      } else if (draggingItem.type === 'shape') {
        setShapes((prev) =>
          prev.map((s) =>
            s.id === draggingItem.id
              ? { ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy }
              : s
          )
        );
      }
    } else if (resizingImage) {
      const dx = wCoord.x - resizingImage.startX;
      const dy = wCoord.y - resizingImage.startY;
      const { id, handle, origW, origH, origX, origY } = resizingImage;

      let newW = origW;
      let newH = origH;
      let newX = origX;
      let newY = origY;

      if (handle === 'se') {
        newW = Math.max(30, origW + dx);
        newH = Math.max(30, origH + dy);
      } else if (handle === 'sw') {
        newW = Math.max(30, origW - dx);
        newH = Math.max(30, origH + dy);
        newX = origX + (origW - newW);
      } else if (handle === 'ne') {
        newW = Math.max(30, origW + dx);
        newH = Math.max(30, origH - dy);
        newY = origY + (origH - newH);
      } else if (handle === 'nw') {
        newW = Math.max(30, origW - dx);
        newH = Math.max(30, origH - dy);
        newX = origX + (origW - newW);
        newY = origY + (origH - newH);
      }

      setImages((prev) =>
        prev.map((img) =>
          img.id === id ? { ...img, width: newW, height: newH, x: newX, y: newY } : img
        )
      );
    }
  };

  // Canvas Mouse Up
  const handleMouseUp = (e?: React.MouseEvent | MouseEvent) => {
    if (isDraggingCanvas && dragStartClient && e && typeof e.clientX === 'number') {
      const dist = Math.hypot(e.clientX - dragStartClient.x, e.clientY - dragStartClient.y);
      if (dist < 4) {
        clearWireSelection();
      }
    }
    setDragStartClient(null);
    setIsDraggingCanvas(false);
    setDraggingCompId(null);
    setDraggingWireCorner(null);
    setDraggingSegment(null);
    setDraggingItem(null);
    setResizingImage(null);
    setGroupDragStartPos(null);
    setRulerStart(null);

    // Finalize Marquee Selection Box
    if (marqueeBox) {
      const minX = Math.min(marqueeBox.x1, marqueeBox.x2);
      const maxX = Math.max(marqueeBox.x1, marqueeBox.x2);
      const minY = Math.min(marqueeBox.y1, marqueeBox.y2);
      const maxY = Math.max(marqueeBox.y1, marqueeBox.y2);

      // Only select if dragged more than 5px
      if (Math.hypot(maxX - minX, maxY - minY) > 5) {
        const boxed = components.filter((c) => {
          const posX = c.x;
          const posY = c.y;
          return posX >= minX - 40 && posX <= maxX + 40 && posY >= minY - 40 && posY <= maxY + 40;
        });
        const boxedIds = boxed.map((c) => c.id);
        updateSelectedCompIds(boxedIds);
        if (boxedIds.length > 0) {
          onSelectComponent(boxedIds[0]);
        }
      }
      setMarqueeBox(null);
    }

    // Finalize shape drawing
    if (drawingShapeStart && ['draw_rect', 'draw_line', 'draw_circle'].includes(tool)) {
      const type = tool === 'draw_rect' ? 'rect' : tool === 'draw_line' ? 'line' : 'circle';
      const shape: SchematicGraphicShape = {
        id: `shape_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type,
        x1: drawingShapeStart.x,
        y1: drawingShapeStart.y,
        x2: mousePos.x,
        y2: mousePos.y,
        stroke: sheetConfig.theme === 'dark' ? '#38BDF8' : '#0284C7',
        strokeWidth: 1.5,
      };
      setShapes((prev) => [...prev, shape]);
      setDrawingShapeStart(null);
      setTool('select');
    }
  };

  // Canvas Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.min(2.5, Math.max(0.4, prev * factor)));
  };

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEv) => {
      const dataUrl = uploadEv.target?.result as string;
      if (dataUrl) {
        const newImg: SchematicAttachedImage = {
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          x: 200,
          y: 200,
          width: 180,
          height: 120,
          dataUrl,
          opacity: 1.0,
        };
        setImages((prev) => [...prev, newImg]);
        setSelectedItemId(newImg.id);
        setTool('select');
      }
    };
    reader.readAsDataURL(file);
  };

  // Computed Rubberband wire points preview
  const rubberbandPoints = useMemo(() => {
    if (!activeWireStart) return '';
    const lastPt = wireWaypoints.length > 0 ? wireWaypoints[wireWaypoints.length - 1] : activeWireStart;
    const corner = wireElbowFlip
      ? `${lastPt.x},${mousePos.y}`
      : `${mousePos.x},${lastPt.y}`;
    const pts = [
      `${activeWireStart.x},${activeWireStart.y}`,
      ...wireWaypoints.map((w) => `${w.x},${w.y}`),
      corner,
      `${mousePos.x},${mousePos.y}`,
    ];
    return pts.join(' ');
  }, [activeWireStart, wireWaypoints, wireElbowFlip, mousePos]);

  return (
    <div
      data-testid="schematic-editor-panel"
      className="relative w-full h-full flex flex-col bg-[#050A14] select-none overflow-hidden"
    >
      {/* Hidden File Input for Image Attachment */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Slim Top Action Bar */}
      <SchematicTopBar
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        onRotate={() => {
          if (selectedCompIds.length > 0) {
            selectedCompIds.forEach((id) => onRotateComponent(id));
          } else if (selectedCompId) {
            onRotateComponent(selectedCompId);
          }
        }}
        onRotateCcw={handleRotateCcw}
        onAutoAnnotate={handleAutoAnnotate}
        onMirrorH={() => {
          if (selectedCompIds.length > 0) {
            const idSet = new Set(selectedCompIds);
            onUpdateComponents(
              components.map((c) =>
                idSet.has(c.id)
                  ? { ...c, mirrored: !c.mirrored }
                  : c
              )
            );
          } else if (selectedCompId) {
            onUpdateComponents(
              components.map((c) =>
                c.id === selectedCompId
                  ? { ...c, mirrored: !c.mirrored }
                  : c
              )
            );
          }
        }}
        onMirrorV={() => {
          if (selectedCompIds.length > 0) {
            const idSet = new Set(selectedCompIds);
            onUpdateComponents(
              components.map((c) =>
                idSet.has(c.id) ? { ...c, mirrored: !c.mirrored } : c
              )
            );
          } else if (selectedCompId) {
            onUpdateComponents(
              components.map((c) =>
                c.id === selectedCompId ? { ...c, mirrored: !c.mirrored } : c
              )
            );
          }
        }}
        onDuplicate={() => {
          if (selectedCompIds.length > 0) {
            const idSet = new Set(selectedCompIds);
            const dups: CircuitComponent[] = [];
            const newIds: string[] = [];
            components.forEach((c) => {
              if (idSet.has(c.id)) {
                const dupId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                newIds.push(dupId);
                dups.push({
                  ...c,
                  id: dupId,
                  x: c.x + 40,
                  y: c.y + 40,
                });
              }
            });
            onUpdateComponents([...components, ...dups]);
            updateSelectedCompIds(newIds);
            if (newIds.length > 0) onSelectComponent(newIds[0]);
          } else if (selectedCompId) {
            const comp = components.find((c) => c.id === selectedCompId);
            if (comp) {
              const dupId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
              const dup: CircuitComponent = {
                ...comp,
                id: dupId,
                x: comp.x + 40,
                y: comp.y + 40,
              };
              onUpdateComponents([...components, dup]);
              // Keep original selected component active unless no component was selected
            }
          }
        }}
        onDelete={() => {
          if (selectedCompId) onDeleteComponent(selectedCompId);
          else if (selectedCompIds.length > 0) {
            selectedCompIds.forEach((id) => onDeleteComponent(id));
            updateSelectedCompIds([]);
            onSelectComponent(null);
          } else if (selectedWireId) onDeleteWire(selectedWireId);
          else if (selectedItemId) {
            setShapes((prev) => prev.filter((s) => s.id !== selectedItemId));
            setTextNotes((prev) => prev.filter((t) => t.id !== selectedItemId));
            setImages((prev) => prev.filter((i) => i.id !== selectedItemId));
            setNoConnects((prev) => prev.filter((nc) => nc.id !== selectedItemId));
            setManualJunctions((prev) => prev.filter((mj) => mj.id !== selectedItemId));
            setNetLabels((prev) => prev.filter((nl) => nl.id !== selectedItemId));
            setPowerPorts((prev) => prev.filter((pp) => pp.id !== selectedItemId));
            setSelectedItemId(null);
          }
        }}
        onAutoTidy={handleAutoTidy}
        onRunErc={handleRunErc}
        onAlign={handleAlign}
        onOpenFind={() => setIsFindOpen(true)}
        onOpenBomNetlist={() => setIsBomOpen(true)}
        zoom={zoom}
        onZoomIn={() => setZoom((z) => Math.min(2.5, z * 1.15))}
        onZoomOut={() => setZoom((z) => Math.max(0.4, z * 0.85))}
        onZoomReset={() => setZoom(1)}
        onZoomFit={() => {
          setZoom(0.85);
          setPan({ x: 50, y: 40 });
        }}
        sheetConfig={{ ...sheetConfig, showGrid }}
        onUpdateSheetConfig={(cfg) => {
          if (cfg.showGrid !== undefined) setShowGrid(cfg.showGrid);
          setSheetConfig((prev) => ({ ...prev, ...cfg }));
        }}
        onExportSvg={() => exportSchematicSvg(svgRef.current, `${project.title || 'schematic'}.svg`)}
        onExportPng={() => exportSchematicPng(svgRef.current, `${project.title || 'schematic'}.png`, 2)}
        onPrintPdf={printSchematicSheet}
        selectedCompId={selectedCompId}
        selectedCompIds={selectedCompIds}
        selectedWireId={activeSelectedWireId}
        selectedItemId={selectedItemId}
      />

      {/* Main Workspace: Left Tool Rail + Central SVG Engineering Sheet Canvas */}
      <div className="flex-1 flex overflow-hidden relative w-full h-full min-w-0">
        {/* Slim Left Vertical EDA Tool Rail */}
        <SchematicLeftRail
          activeTool={tool}
          onSelectTool={(t) => {
            setTool(t);
            setActiveWireStart(null);
            setWireWaypoints([]);
          }}
          onAttachImageClick={() => fileInputRef.current?.click()}
          onSelectPowerPortType={(pt) => setSelectedPowerPortType(pt)}
          selectedPowerPortType={selectedPowerPortType}
        />

        {/* Central Drafting Sheet Canvas */}
        <div
          ref={containerRef}
          data-testid="sch-canvas-viewport"
          className={`flex-1 h-full overflow-hidden relative ${
            sheetConfig.theme === 'dark' ? 'bg-[#060B14]' : 'bg-[#D8D4C8]'
          } ${
            tool === 'pan' || isDraggingCanvas
              ? 'cursor-grab active:cursor-grabbing'
              : tool === 'wire' || currentPlacingComp || ['draw_rect', 'draw_line', 'draw_circle', 'ruler'].includes(tool)
              ? 'cursor-crosshair'
              : tool === 'eraser'
              ? 'cursor-pointer'
              : 'cursor-default'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, type: 'canvas' });
          }}
        >
          {/* Engineering Sheet Transform Container */}
          <div
            className="absolute origin-top-left transition-transform duration-75"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              width: `${sheetDimensions.width}px`,
              height: `${sheetDimensions.height}px`,
            }}
          >
            {/* Pure SVG Engineering Capture Sheet */}
            <svg
              ref={svgRef}
              data-testid="sch-sheet-svg"
              width={sheetDimensions.width}
              height={sheetDimensions.height}
              viewBox={`0 0 ${sheetDimensions.width} ${sheetDimensions.height}`}
              className={`overflow-visible shadow-2xl select-none ${
                sheetConfig.theme === 'dark' ? 'bg-[#09101E]' : 'bg-[#ECE8DC]'
              }`}
            >
              {/* Subtle Engineering Dot Grid */}
              <defs>
                <pattern
                  id="sch-grid-pattern"
                  width={sheetConfig.gridStep}
                  height={sheetConfig.gridStep}
                  patternUnits="userSpaceOnUse"
                >
                  <circle
                    cx="1"
                    cy="1"
                    r="0.85"
                    fill={sheetConfig.theme === 'dark' ? '#334155' : '#C0BCAE'}
                  />
                </pattern>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="url(#sch-grid-pattern)"
                pointerEvents="none"
                opacity={showGrid ? 1 : 0}
              />

              {/* Standard Engineering Sheet Frame Border & Bottom-Right Title Block */}
              <SchematicTitleBlockView
                sheetWidth={sheetDimensions.width}
                sheetHeight={sheetDimensions.height}
                titleBlock={titleBlock}
                projectTitle={project.title}
                componentCount={components.length}
                netCount={netCount}
                theme={sheetConfig.theme}
                onDoubleClick={() => setInlineEditorTarget({ type: 'titleblock', titleBlock, projectTitle: project.title })}
              />

              {/* User Annotations Layer (Shapes, Images, Text Notes, Net Labels, Power Ports, No-Connects) */}
              <SchematicDrawingLayer
                shapes={shapes}
                textNotes={textNotes}
                images={images}
                noConnects={noConnects}
                manualJunctions={manualJunctions}
                netLabels={netLabels}
                powerPorts={powerPorts}
                theme={sheetConfig.theme}
                selectedItemId={selectedItemId}
                onSelectItem={(id) => {
                  setSelectedItemId(id);
                  onSelectComponent(null);
                  updateSelectedCompIds([]);
                  onSelectWire(null);
                }}
                onDoubleClickItem={(item) => {
                  if (item.type === 'text') setInlineEditorTarget({ type: 'text', textNote: item.data as SchematicTextNote });
                  else if (item.type === 'netlabel') setInlineEditorTarget({ type: 'netlabel', netLabel: item.data as SchematicNetLabel });
                }}
                onItemMouseDown={(e, type, id) => {
                  if (tool === 'select') {
                    const wCoord = clientToWorld(e.clientX, e.clientY);
                    setDraggingItem({ type, id, startX: wCoord.x, startY: wCoord.y });
                  }
                }}
                onImageHandleMouseDown={(e, imageId, handle) => {
                  const wCoord = clientToWorld(e.clientX, e.clientY);
                  const targetImg = images.find((i) => i.id === imageId);
                  if (targetImg) {
                    setResizingImage({
                      id: imageId,
                      handle,
                      startX: wCoord.x,
                      startY: wCoord.y,
                      origW: targetImg.width,
                      origH: targetImg.height,
                      origX: targetImg.x,
                      origY: targetImg.y,
                    });
                  }
                }}
              />

              {/* 90° Manhattan Orthogonal Wires Layer */}
              <g className="sch-wires-layer">
                {routedWires
                  .filter((rw) => Array.isArray(rw.points) && rw.points.length >= 2)
                  .map((rw) => {
                    const segments = extractWireSegments(rw.wireId, rw.points);
                  const isSelected = activeSelectedWireId === rw.wireId;
                  const ptsStr = rw.points.map((p) => `${p.x},${p.y}`).join(' ');
                  return (
                    <g
                      key={rw.wireId}
                      className="cursor-pointer"
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelectWire(rw.wireId);
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          type: 'wire',
                          targetId: rw.wireId,
                        });
                      }}
                    >
                      {/* Visible Copper Track Line rendered FIRST below interactive hit strokes */}
                      <polyline
                        data-testid={`sch-wire-${rw.wireId}`}
                        points={ptsStr}
                        fill="none"
                        stroke={
                          isSelected
                            ? '#B45309'
                            : wires.find((w) => w.id === rw.wireId)?.color ||
                              (sheetConfig.theme === 'dark' ? '#38BDF8' : '#0F6B54')
                        }
                        strokeWidth={isSelected ? '3' : '2'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        pointerEvents="none"
                        style={{ pointerEvents: 'none' }}
                        className="transition-colors hover:stroke-emerald-400"
                      />

                      {/* Per-Segment 14px Hit Strokes for interactive segment sliding and selection */}
                      {segments.map((seg, sIdx) => {
                        const isH = seg.isHorizontal;
                        const isV = seg.isVertical;
                        const segMidX = Math.round((seg.p1.x + seg.p2.x) / 2);
                        const segMidY = Math.round((seg.p1.y + seg.p2.y) / 2);

                        return (
                          <line
                            key={`seg-hit-${rw.wireId}-${sIdx}`}
                            data-testid={sIdx === 0 ? `sch-wire-hit-${rw.wireId}` : undefined}
                            x1={seg.p1.x}
                            y1={seg.p1.y}
                            x2={seg.p2.x}
                            y2={seg.p2.y}
                            stroke="transparent"
                            strokeWidth={14}
                            pointerEvents="stroke"
                            strokeLinecap="round"
                            className={
                              tool === 'select'
                                ? isH
                                  ? 'cursor-ns-resize'
                                  : isV
                                  ? 'cursor-ew-resize'
                                  : 'cursor-pointer'
                                : 'cursor-pointer'
                            }
                            onMouseDown={(e) => {
                              if (e.button === 0 && tool === 'select') {
                                e.stopPropagation();
                                setInternalSelectedWireId(rw.wireId);
                                onSelectWire(rw.wireId);
                                onSelectComponent(null);
                                setWirePillPos({ x: segMidX, y: segMidY });
                                setDraggingSegment({
                                  wireId: rw.wireId,
                                  segmentIndex: sIdx,
                                  isHorizontal: isH,
                                  initialVertices: [...rw.points],
                                });
                              } else {
                                const clickedWorld = clientToWorld(e.clientX, e.clientY);
                                const proj = projectPointOntoPolyline(clickedWorld, rw.points, sheetConfig.gridStep);
                                const hitPt = proj ? proj.point : { x: segMidX, y: segMidY };
                                handleWireClick(e, rw.wireId, hitPt.x, hitPt.y);
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          />
                        );
                      })}
                      {/* Draggable Corner Handles when selected */}
                      {isSelected &&
                        rw.points.map((pt, pIdx) => {
                          const isInterior = pIdx > 0 && pIdx < rw.points.length - 1;
                          return (
                            <circle
                              key={`corner-${rw.wireId}-${pIdx}`}
                              data-testid={`sch-wire-corner-${pIdx}`}
                              cx={pt.x}
                              cy={pt.y}
                              r={isInterior ? '5' : '4'}
                              fill={isInterior ? '#34D399' : '#10B981'}
                              stroke="#FFFFFF"
                              strokeWidth="1.5"
                              className="cursor-move"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setDraggingWireCorner({
                                  wireId: rw.wireId,
                                  pointIndex: pIdx,
                                  initialVertices: [...rw.points],
                                });
                              }}
                            />
                          );
                        })}
                      {/* Draggable Midpoint Handles to slide wire segments */}
                      {isSelected &&
                        segments.map((seg, sIdx) => {
                          const isH = seg.isHorizontal;
                          const segMidX = Math.round((seg.p1.x + seg.p2.x) / 2);
                          const segMidY = Math.round((seg.p1.y + seg.p2.y) / 2);
                          return (
                            <circle
                              key={`mid-${rw.wireId}-${sIdx}`}
                              data-testid={`sch-wire-mid-${sIdx}`}
                              cx={segMidX}
                              cy={segMidY}
                              r="4"
                              fill="#F59E0B"
                              stroke="#FFFFFF"
                              strokeWidth="1.5"
                              className={
                                isH
                                  ? 'cursor-ns-resize hover:scale-150 transition-transform'
                                  : 'cursor-ew-resize hover:scale-150 transition-transform'
                              }
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setDraggingSegment({
                                  wireId: rw.wireId,
                                  segmentIndex: sIdx,
                                  isHorizontal: isH,
                                  initialVertices: [...rw.points],
                                });
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <title>Drag to slide wire segment</title>
                            </circle>
                          );
                        })}
                    </g>
                  );
                })}

                {/* Electrical Solder Junction Dots (3+ wires & manual junctions) */}
                {allJunctions.map((j, idx) => (
                  <circle
                    key={`junct-${idx}`}
                    data-testid={`sch-junction-${Math.round(j.x)}-${Math.round(j.y)}`}
                    cx={j.x}
                    cy={j.y}
                    r="4.5"
                    fill={sheetConfig.theme === 'dark' ? '#34D399' : '#047857'}
                    stroke={sheetConfig.theme === 'dark' ? '#0F172A' : '#ECE8DC'}
                    strokeWidth="1.5"
                  />
                ))}

                {/* Live Rubberband Wire Preview (When actively routing wire) */}
                {activeWireStart && (
                  <polyline
                    data-testid="sch-rubberband-wire"
                    points={rubberbandPoints}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </g>

              {/* Components Layer (Real Full Vector IEEE/IEC Schematic Symbols) */}
              <g className="sch-components-layer">
                {components.map((comp) => {
                  const isSingleSelected = selectedCompId === comp.id;
                  const isMultiSelected = selectedCompIds.includes(comp.id);
                  const isSelected = isSingleSelected || isMultiSelected;
                  const posX = comp.x ?? 0;
                  const posY = comp.y ?? 0;

                  return (
                    <g
                      key={comp.id}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelectComponent(comp.id);
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          type: 'component',
                          targetId: comp.id,
                        });
                      }}
                      onMouseDown={(e) => {
                        if (tool === 'eraser') {
                          e.stopPropagation();
                          onDeleteComponent(comp.id);
                          return;
                        }
                        if (e.button === 0 && (tool === 'select' || tool === 'wire')) {
                          e.stopPropagation();
                          const wCoord = clientToWorld(e.clientX, e.clientY);

                          if (e.shiftKey) {
                            // Toggle component in/out of multi-selection
                            const next = isMultiSelected
                              ? selectedCompIds.filter((id) => id !== comp.id)
                              : [...selectedCompIds, comp.id];
                            updateSelectedCompIds(next);
                            if (next.length > 0) onSelectComponent(next[0]);
                            else onSelectComponent(null);
                            return;
                          }

                          if (isMultiSelected && selectedCompIds.length > 1) {
                            // Start group drag of all selected components
                            setGroupDragStartPos(wCoord);
                            const posMap = new Map<string, { x: number; y: number }>();
                            components.forEach((c) => {
                              if (selectedCompIds.includes(c.id)) {
                                posMap.set(c.id, {
                                  x: c.x ?? 0,
                                  y: c.y ?? 0,
                                });
                              }
                            });
                            setGroupInitialPositions(posMap);
                          } else {
                            // Single component selection & drag
                            onSelectComponent(comp.id);
                            updateSelectedCompIds([comp.id]);
                            clearWireSelection();
                            setDraggingCompId(comp.id);
                            setCompDragOffset({
                              x: wCoord.x - posX,
                              y: wCoord.y - posY,
                            });
                          }
                        }
                      }}
                    >
                      <SchematicVectorSymbol
                        component={comp}
                        isSelected={isSelected}
                        theme={sheetConfig.theme}
                        isWiringMode={tool === 'wire' || tool === 'bus' || tool === 'noconnect'}
                        onPinClick={handlePinClick}
                        onPinHover={setHoveredPinId}
                        hoveredPinId={hoveredPinId}
                        onDoubleClick={(e, c) => setInlineEditorTarget({ type: 'component', component: c })}
                      />
                    </g>
                  );
                })}
              </g>

              {/* Ghost Preview Following Cursor While Placing Component from Library */}
              {currentPlacingComp && (
                <g className="sch-ghost-preview opacity-70 pointer-events-none">
                  <SchematicVectorSymbol
                    component={{
                      ...currentPlacingComp,
                      x: mousePos.x,
                      y: mousePos.y,
                      rotation: ghostRotation,
                      mirrored: ghostMirrored,
                    }}
                    isSelected={true}
                    theme={sheetConfig.theme}
                    isGhost={true}
                  />
                </g>
              )}

              {/* Active Shape Drawing Preview */}
              {drawingShapeStart && (
                <g className="sch-shape-preview pointer-events-none opacity-80">
                  {tool === 'draw_rect' && (
                    <rect
                      x={Math.min(drawingShapeStart.x, mousePos.x)}
                      y={Math.min(drawingShapeStart.y, mousePos.y)}
                      width={Math.abs(mousePos.x - drawingShapeStart.x)}
                      height={Math.abs(mousePos.y - drawingShapeStart.y)}
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                    />
                  )}
                  {tool === 'draw_line' && (
                    <line
                      x1={drawingShapeStart.x}
                      y1={drawingShapeStart.y}
                      x2={mousePos.x}
                      y2={mousePos.y}
                      stroke="#38BDF8"
                      strokeWidth="1.8"
                      strokeDasharray="4 2"
                    />
                  )}
                  {tool === 'draw_circle' && (
                    <circle
                      cx={(drawingShapeStart.x + mousePos.x) / 2}
                      cy={(drawingShapeStart.y + mousePos.y) / 2}
                      r={Math.hypot(mousePos.x - drawingShapeStart.x, mousePos.y - drawingShapeStart.y) / 2}
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                    />
                  )}
                </g>
              )}

              {/* Marquee Selection Box Preview */}
              {marqueeBox && (
                <g className="sch-marquee-preview pointer-events-none">
                  <rect
                    data-testid="sch-marquee-box"
                    x={Math.min(marqueeBox.x1, marqueeBox.x2)}
                    y={Math.min(marqueeBox.y1, marqueeBox.y2)}
                    width={Math.abs(marqueeBox.x2 - marqueeBox.x1)}
                    height={Math.abs(marqueeBox.y2 - marqueeBox.y1)}
                    fill="rgba(16, 185, 129, 0.12)"
                    stroke="#10B981"
                    strokeWidth="1.5"
                    strokeDasharray="5 3"
                  />
                </g>
              )}

              {/* Interactive Ruler Dimension Preview */}
              {rulerStart && (
                <g className="sch-ruler-preview pointer-events-none">
                  <line
                    x1={rulerStart.x}
                    y1={rulerStart.y}
                    x2={mousePos.x}
                    y2={mousePos.y}
                    stroke="#F59E0B"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                  <rect
                    x={(rulerStart.x + mousePos.x) / 2 - 25}
                    y={(rulerStart.y + mousePos.y) / 2 - 12}
                    width="50"
                    height="18"
                    rx="3"
                    fill="#0F172A"
                    stroke="#F59E0B"
                    strokeWidth="1"
                  />
                  <text
                    x={(rulerStart.x + mousePos.x) / 2}
                    y={(rulerStart.y + mousePos.y) / 2 + 1}
                    textAnchor="middle"
                    fill="#F59E0B"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {Math.round(Math.hypot(mousePos.x - rulerStart.x, mousePos.y - rulerStart.y))} px
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Bottom-Center Docked Wire Action Bar */}
          {(() => {
            if (
              !activeSelectedWireId ||
              draggingSegment ||
              draggingWireCorner ||
              draggingCompId ||
              isDraggingCanvas ||
              marqueeBox !== null
            ) {
              return null;
            }
            const targetWire = wires.find((w) => w.id === activeSelectedWireId);
            if (!targetWire) return null;

            return (
              <div
                data-testid="sch-wire-action-pill"
                className="sch-wire-action-pill absolute bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-[#0B1528]/95 border border-slate-700/90 px-3.5 py-1.5 rounded-xl shadow-2xl backdrop-blur font-mono text-xs select-none pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-150"
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
                {/* Delete Wire */}
                <button
                  type="button"
                  data-testid="pill-delete-wire"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteWire(activeSelectedWireId);
                    clearWireSelection();
                  }}
                  className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/70 text-amber-200 rounded flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
                  title="Delete selected wire"
                >
                  <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Delete Wire</span>
                </button>

                <div className="h-4 w-px bg-slate-700 mx-0.5" />

                {/* 5 Wire Color Swatches */}
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
                      data-testid={`pill-color-${c.hex.replace('#', '')}`}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateWires(
                          wires.map((w) =>
                            w.id === activeSelectedWireId ? { ...w, color: c.hex } : w
                          )
                        );
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

                {/* +Junction */}
                <button
                  type="button"
                  data-testid="pill-add-junction"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    const rw = routedWires.find((r) => r.wireId === activeSelectedWireId);
                    const mid = rw?.points && rw.points.length >= 2
                      ? rw.points[Math.floor(rw.points.length / 2)]
                      : wirePillPos;
                    setManualJunctions((prev) => [
                      ...prev,
                      { id: `mj_${Date.now()}`, x: mid.x, y: mid.y },
                    ]);
                  }}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded flex items-center gap-1 text-xs transition-colors cursor-pointer"
                  title="Add manual electrical junction dot"
                >
                  <span>+Junction</span>
                </button>

                {/* Net Label */}
                <button
                  type="button"
                  data-testid="pill-net-label"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    const rw = routedWires.find((r) => r.wireId === activeSelectedWireId);
                    const mid = rw?.points && rw.points.length >= 2
                      ? rw.points[Math.floor(rw.points.length / 2)]
                      : wirePillPos;
                    const newNl: SchematicNetLabel = {
                      id: `nl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                      x: mid.x,
                      y: mid.y,
                      name: targetWire.netName || 'NET',
                      wireId: activeSelectedWireId,
                    };
                    setNetLabels((prev) => [...prev, newNl]);
                    setInlineEditorTarget({ type: 'netlabel', netLabel: newNl });
                  }}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded flex items-center gap-1 text-xs transition-colors cursor-pointer"
                  title="Assign Net Label (e.g. VCC, RESET, SDA)"
                >
                  <span>Net Label</span>
                </button>

                {/* Close */}
                <button
                  type="button"
                  data-testid="pill-close-wire"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    clearWireSelection();
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Deselect wire"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })()}

          {/* Right-Click Context Menu */}
          {contextMenu && (
            <div
              data-testid="sch-context-menu"
              className="fixed z-50 bg-slate-900 border border-slate-700 shadow-2xl rounded-lg p-1.5 w-48 text-xs font-mono text-slate-200 select-none flex flex-col gap-0.5"
              style={{
                left: Math.min(contextMenu.x, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 200),
                top: Math.min(contextMenu.y, (typeof window !== 'undefined' ? window.innerHeight : 800) - 200),
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {contextMenu.type === 'component' && (
                <>
                  <div className="px-2 py-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-800">
                    Component Action
                  </div>
                  <button
                    data-testid="ctx-rotate"
                    onClick={() => {
                      if (contextMenu.targetId) onRotateComponent(contextMenu.targetId);
                      setContextMenu(null);
                    }}
                    className="px-2 py-1.5 rounded text-left hover:bg-slate-800 hover:text-emerald-400 flex items-center justify-between"
                  >
                    <span>Rotate 90°</span>
                    <span className="text-slate-500 text-[10px]">R</span>
                  </button>
                  <button
                    data-testid="ctx-mirror"
                    onClick={() => {
                      if (contextMenu.targetId) {
                        if (onMirrorComponent) onMirrorComponent(contextMenu.targetId);
                        else {
                          onUpdateComponents(
                            components.map((c) =>
                              c.id === contextMenu.targetId
                                ? { ...c, mirrored: !c.mirrored }
                                : c
                            )
                          );
                        }
                      }
                      setContextMenu(null);
                    }}
                    className="px-2 py-1.5 rounded text-left hover:bg-slate-800 hover:text-emerald-400 flex items-center justify-between"
                  >
                    <span>Mirror H</span>
                    <span className="text-slate-500 text-[10px]">X</span>
                  </button>
                  <button
                    data-testid="ctx-duplicate"
                    onClick={() => {
                      if (contextMenu.targetId) {
                        const comp = components.find((c) => c.id === contextMenu.targetId);
                        if (comp) {
                          const dupId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                          const nx = (comp.x ?? 0) + 40;
                          const ny = (comp.y ?? 0) + 40;
                          onUpdateComponents([
                            ...components,
                            { ...comp, id: dupId, x: nx, y: ny },
                          ]);
                        }
                      }
                      setContextMenu(null);
                    }}
                    className="px-2 py-1.5 rounded text-left hover:bg-slate-800 hover:text-emerald-400 flex items-center justify-between"
                  >
                    <span>Duplicate</span>
                    <span className="text-slate-500 text-[10px]">Ctrl+D</span>
                  </button>
                  <div className="w-full h-[1px] bg-slate-800 my-0.5" />
                  <button
                    data-testid="ctx-delete"
                    onClick={() => {
                      if (contextMenu.targetId) onDeleteComponent(contextMenu.targetId);
                      setContextMenu(null);
                    }}
                    className="px-2 py-1.5 rounded text-left hover:bg-rose-950/60 text-rose-400 flex items-center justify-between"
                  >
                    <span>Delete Component</span>
                    <span className="text-rose-500 text-[10px]">Del</span>
                  </button>
                </>
              )}
              {contextMenu.type === 'wire' && (
                <>
                  <div className="px-2 py-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-800">
                    Wire Action
                  </div>
                  <button
                    data-testid="ctx-add-junction"
                    onClick={() => {
                      const wCoord = clientToWorld(contextMenu.x, contextMenu.y);
                      setManualJunctions((prev) => [
                        ...prev,
                        { id: `mj_${Date.now()}`, x: wCoord.x, y: wCoord.y },
                      ]);
                      setContextMenu(null);
                    }}
                    className="px-2 py-1.5 rounded text-left hover:bg-slate-800 hover:text-cyan-400 flex items-center justify-between"
                  >
                    <span>Add Junction Dot</span>
                    <span className="text-slate-500 text-[10px]">J</span>
                  </button>
                  <button
                    data-testid="ctx-add-label"
                    onClick={() => {
                      const wCoord = clientToWorld(contextMenu.x, contextMenu.y);
                      const newNl: SchematicNetLabel = {
                        id: `nl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                        x: wCoord.x,
                        y: wCoord.y,
                        name: 'NET',
                        wireId: contextMenu.targetId,
                      };
                      setNetLabels((prev) => [...prev, newNl]);
                      setInlineEditorTarget({ type: 'netlabel', netLabel: newNl });
                      setContextMenu(null);
                    }}
                    className="px-2 py-1.5 rounded text-left hover:bg-slate-800 hover:text-emerald-400 flex items-center justify-between"
                  >
                    <span>Add Net Label</span>
                    <span className="text-slate-500 text-[10px]">N</span>
                  </button>
                  <div className="w-full h-[1px] bg-slate-800 my-0.5" />
                  <button
                    data-testid="ctx-delete-wire"
                    onClick={() => {
                      if (contextMenu.targetId) onDeleteWire(contextMenu.targetId);
                      onSelectWire(null);
                      setContextMenu(null);
                    }}
                    className="px-2 py-1.5 rounded text-left hover:bg-rose-950/60 text-rose-400 flex items-center justify-between"
                  >
                    <span>Delete Wire</span>
                    <span className="text-rose-500 text-[10px]">Del</span>
                  </button>
                </>
              )}
              {contextMenu.type === 'canvas' && (
                <>
                  <div className="px-2 py-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-800">
                    Schematic Sheet
                  </div>
                  <button
                    data-testid="ctx-tool-select"
                    onClick={() => {
                      setTool('select');
                      setContextMenu(null);
                    }}
                    className="px-2 py-1.5 rounded text-left hover:bg-slate-800 hover:text-emerald-400 flex items-center justify-between"
                  >
                    <span>Select & Move</span>
                    <span className="text-slate-500 text-[10px]">V</span>
                  </button>
                  <button
                    data-testid="ctx-tool-wire"
                    onClick={() => {
                      setTool('wire');
                      setContextMenu(null);
                    }}
                    className="px-2 py-1.5 rounded text-left hover:bg-slate-800 hover:text-emerald-400 flex items-center justify-between"
                  >
                    <span>Route Wire</span>
                    <span className="text-slate-500 text-[10px]">W</span>
                  </button>
                  <button
                    data-testid="ctx-autotidy"
                    onClick={() => {
                      handleAutoTidy();
                      setContextMenu(null);
                    }}
                    className="px-2 py-1.5 rounded text-left hover:bg-slate-800 hover:text-emerald-400"
                  >
                    Auto-Tidy Layout
                  </button>
                  <button
                    data-testid="ctx-run-erc"
                    onClick={() => {
                      handleRunErc();
                      setContextMenu(null);
                    }}
                    className="px-2 py-1.5 rounded text-left hover:bg-slate-800 hover:text-emerald-400"
                  >
                    Run Electrical Rules (ERC)
                  </button>
                  <button
                    data-testid="ctx-zoom-fit"
                    onClick={() => {
                      setZoom(0.85);
                      setPan({ x: 50, y: 40 });
                      setContextMenu(null);
                    }}
                    className="px-2 py-1.5 rounded text-left hover:bg-slate-800 hover:text-emerald-400"
                  >
                    Fit Sheet to Viewport
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Double-Click Inline Editing Modal */}
      {inlineEditorTarget && (
        <SchematicInlineEditor
          target={inlineEditorTarget}
          onClose={() => setInlineEditorTarget(null)}
          onSaveComponent={(updated) => {
            onUpdateComponents(components.map((c) => (c.id === updated.id ? updated : c)));
          }}
          onSaveTextNote={(updated) => {
            setTextNotes((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          }}
          onSaveNetLabel={(updated) => {
            setNetLabels((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
          }}
          onSaveTitleBlock={(updated) => {
            setTitleBlock(updated);
          }}
        />
      )}

      {/* ERC Violation Diagnostic Report Modal */}
      {isErcOpen && (
        <ErcReportModal
          isOpen={isErcOpen}
          violations={ercViolations}
          onClose={() => setIsErcOpen(false)}
          onLocateViolation={(loc, compId) => {
            if (loc) {
              setPan({
                x: 300 - loc.x * zoom,
                y: 200 - loc.y * zoom,
              });
            } else if (compId) {
              onSelectComponent(compId);
            }
          }}
        />
      )}
      {/* Quick Find (Ctrl+F) Popover */}
      {isFindOpen && (
        <div
          data-testid="sch-quick-find"
          className="absolute top-12 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-3 z-50 w-80 text-xs font-mono"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-cyan-400" /> Quick Find
            </span>
            <button onClick={() => setIsFindOpen(false)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <input
            data-testid="sch-find-input"
            type="text"
            placeholder="Search component (e.g. U1, 10k, R1)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 mt-2 focus:outline-none focus:border-cyan-400"
            autoFocus
          />
          <div className="mt-2 max-h-40 overflow-y-auto divide-y divide-slate-800">
            {components
              .filter(
                (c) =>
                  !searchQuery ||
                  c.designator?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  c.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  c.value?.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelectComponent(c.id);
                    const posX = c.x;
                    const posY = c.y;
                    setPan({ x: 400 - posX * zoom, y: 300 - posY * zoom });
                    setIsFindOpen(false);
                  }}
                  className="w-full text-left py-1 px-1 hover:bg-slate-800 rounded flex items-center justify-between text-slate-300"
                >
                  <span className="text-emerald-400 font-bold">{c.designator || c.label}</span>
                  <span className="text-slate-500 text-[10px]">{c.value}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Bill of Materials & Netlist Modal */}
      <SchematicBomNetlistModal
        isOpen={isBomOpen}
        onClose={() => setIsBomOpen(false)}
        components={components}
        wires={wires}
        projectName={project.title}
      />
    </div>
  );
}
