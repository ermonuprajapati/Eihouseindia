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
import { runElectricalRulesCheck, ErcViolation } from '@/modules/engineering-lab/circuit-engine/schematic-erc';
import {
  autoLayoutCircuit,
  routeOrthogonalWires,
} from '@/modules/engineering-lab/schematic-engine/schematic-sync-layout';

import { SchematicLeftRail, SchematicTool } from './schematic-editor/SchematicLeftRail';
import { SchematicTopBar } from './schematic-editor/SchematicTopBar';
import { SchematicVectorSymbol } from './schematic-editor/SchematicVectorSymbols';
import { SchematicDrawingLayer } from './schematic-editor/SchematicDrawingLayer';
import { SchematicTitleBlockView } from './schematic-editor/SchematicTitleBlockView';
import { SchematicInlineEditor, InlineEditorTarget } from './schematic-editor/SchematicInlineEditor';
import { exportSchematicSvg, exportSchematicPng, printSchematicSheet } from './schematic-editor/export-utils';

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
  placingComponent?: CircuitComponent | null;
  onSelectComponent: (id: string | null) => void;
  onSelectWire?: (id: string | null) => void;
  onUpdateComponentPosition: (id: string, x: number, y: number) => void;
  onRotateComponent: (id: string) => void;
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
  selectedWireId,
  placingComponent: incomingPlacingComponent = null,
  onSelectComponent,
  onSelectWire = () => {},
  onUpdateComponentPosition,
  onRotateComponent,
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

  // Sheet configuration (A4 / A3 / Letter, Grid, Theme)
  const [sheetConfig, setSheetConfig] = useState<SchematicEditorSheetConfig>(() => ({
    size: project.schematicEditorSheet?.size || project.schematicEditorAnnotations?.sheet?.size || 'A3',
    theme: project.schematicEditorSheet?.theme || project.schematicEditorAnnotations?.sheet?.theme || 'dark',
    gridStep: project.schematicEditorSheet?.gridStep || project.schematicEditorAnnotations?.sheet?.gridStep || 20,
    snapToGrid: project.schematicEditorSheet?.snapToGrid ?? true,
  }));

  // Canvas Viewport Pan & Zoom
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 80, y: 60 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Component Dragging State
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const [compDragOffset, setCompDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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
  const [shapes, setShapes] = useState<SchematicGraphicShape[]>(() => project.schematicEditorAnnotations?.shapes || []);
  const [textNotes, setTextNotes] = useState<SchematicTextNote[]>(() => project.schematicEditorAnnotations?.textNotes || []);
  const [images, setImages] = useState<SchematicAttachedImage[]>(() => project.schematicEditorAnnotations?.images || []);
  const [noConnects, setNoConnects] = useState<SchematicNoConnect[]>(() => project.schematicEditorAnnotations?.noConnects || []);
  const [manualJunctions, setManualJunctions] = useState<SchematicManualJunction[]>(() => project.schematicEditorAnnotations?.manualJunctions || []);
  const [netLabels, setNetLabels] = useState<SchematicNetLabel[]>(() => project.schematicEditorAnnotations?.netLabels || []);
  const [powerPorts, setPowerPorts] = useState<SchematicPowerPort[]>(() => project.schematicEditorAnnotations?.powerPorts || []);
  const [titleBlock, setTitleBlock] = useState<SchematicTitleBlock | undefined>(() => project.schematicEditorAnnotations?.titleBlock);

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

  // Hidden File Input for Image Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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

  // Compute 90° Manhattan routed wires and junctions
  const { routedWires, junctions: autoJunctions } = useMemo(() => {
    return routeOrthogonalWires(components, wires, true, sheetConfig.gridStep);
  }, [components, wires, sheetConfig.gridStep]);

  // Combine auto-computed junction dots with manual junction dots
  const allJunctions = useMemo(() => {
    const combined = [...autoJunctions];
    manualJunctions.forEach((mj) => {
      if (!combined.some((j) => Math.hypot(j.x - mj.x, j.y - mj.y) < 5)) {
        combined.push({ x: mj.x, y: mj.y, netName: mj.netName || 'NET' });
      }
    });
    return combined;
  }, [autoJunctions, manualJunctions]);

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

      // Tool: No-Connect marker
      if (tool === 'noconnect') {
        setNoConnects((prev) => [
          ...prev.filter((nc) => !(nc.compId === compId && nc.pinId === pinId)),
          { id: `nc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, compId, pinId, x: wx, y: wy },
        ]);
        return;
      }

      // Tool: Wire drawing
      if (tool === 'wire') {
        if (!activeWireStart) {
          setActiveWireStart({ compId, pinId, x: wx, y: wy });
          setWireWaypoints([]);
        } else {
          if (activeWireStart.compId !== compId || activeWireStart.pinId !== pinId) {
            onAddWire({
              fromCompId: activeWireStart.compId,
              fromPinId: activeWireStart.pinId,
              toCompId: compId,
              toPinId: pinId,
              points: wireWaypoints.length > 0 ? wireWaypoints : undefined,
            });
          }
          setActiveWireStart(null);
          setWireWaypoints([]);
        }
        return;
      }

      onSelectComponent(compId);
    },
    [tool, activeWireStart, wireWaypoints, onSelectComponent, onAddWire]
  );

  // Wire click handler
  const handleWireClick = useCallback(
    (e: React.MouseEvent, wireId: string, hitX: number, hitY: number) => {
      e.stopPropagation();

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
        setNetLabels((prev) => [
          ...prev,
          { id: `nl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, x: hitX, y: hitY, name: 'NET', wireId },
        ]);
        return;
      }

      onSelectWire(wireId);
    },
    [tool, onSelectWire]
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
        if (currentPlacingComp) {
          setGhostRotation((prev) => (((prev + 90) % 360) as 0 | 90 | 180 | 270));
        } else if (selectedCompId) {
          onRotateComponent(selectedCompId);
        }
      } else if (e.key === 'x' || e.key === 'X') {
        if (currentPlacingComp) {
          setGhostMirrored((prev) => !prev);
        } else if (selectedCompId) {
          const comp = components.find((c) => c.id === selectedCompId);
          if (comp) {
            onUpdateComponents(components.map((c) => (c.id === comp.id ? { ...c, mirrored: !c.mirrored } : c)));
          }
        }
      } else if ((e.key === 'y' || e.key === 'Y') && !(e.ctrlKey || e.metaKey)) {
        if (currentPlacingComp) {
          setGhostRotation((prev) => (((prev + 180) % 360) as 0 | 90 | 180 | 270));
        } else if (selectedCompId) {
          onRotateComponent(selectedCompId);
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        if (selectedCompId) {
          const comp = components.find((c) => c.id === selectedCompId);
          if (comp) {
            const dupId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const dup: CircuitComponent = {
              ...comp,
              id: dupId,
              x: (comp.editorPosition ? comp.editorPosition.x : comp.x) + 40,
              y: (comp.editorPosition ? comp.editorPosition.y : comp.y) + 40,
              editorPosition: {
                x: (comp.editorPosition ? comp.editorPosition.x : comp.x) + 40,
                y: (comp.editorPosition ? comp.editorPosition.y : comp.y) + 40,
              },
            };
            onUpdateComponents([...components, dup]);
            onSelectComponent(dupId);
          }
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedCompId) onDeleteComponent(selectedCompId);
        else if (selectedWireId) onDeleteWire(selectedWireId);
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
    onDeleteComponent,
    onDeleteWire,
    onUpdateComponents,
    onSelectComponent,
    onCancelPlacing,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
  ]);

  // Canvas Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle-click or Pan tool activates canvas dragging
    if (e.button === 1 || tool === 'pan' || (e.button === 0 && e.altKey)) {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
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
      // Placing mode: drop component at cursor
      if (currentPlacingComp) {
        const placed: CircuitComponent = {
          ...currentPlacingComp,
          x: wCoord.x,
          y: wCoord.y,
          editorPosition: { x: wCoord.x, y: wCoord.y },
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

      // Wire waypoint locking when drawing wire
      if (tool === 'wire' && activeWireStart) {
        setWireWaypoints((prev) => [...prev, wCoord]);
        return;
      }

      // Deselect if clicking empty sheet in select mode
      if (tool === 'select') {
        onSelectComponent(null);
        onSelectWire(null);
        setSelectedItemId(null);
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
    } else if (draggingCompId) {
      const newX = sheetConfig.snapToGrid
        ? Math.round((wCoord.x - compDragOffset.x) / sheetConfig.gridStep) * sheetConfig.gridStep
        : wCoord.x - compDragOffset.x;
      const newY = sheetConfig.snapToGrid
        ? Math.round((wCoord.y - compDragOffset.y) / sheetConfig.gridStep) * sheetConfig.gridStep
        : wCoord.y - compDragOffset.y;
      onUpdateComponentPosition(draggingCompId, newX, newY);
    }
  };

  // Canvas Mouse Up
  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
    setDraggingCompId(null);

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
        onRotate={() => selectedCompId && onRotateComponent(selectedCompId)}
        onMirrorH={() => {
          if (selectedCompId) {
            onUpdateComponents(components.map((c) => (c.id === selectedCompId ? { ...c, mirrored: !c.mirrored } : c)));
          }
        }}
        onMirrorV={() => selectedCompId && onRotateComponent(selectedCompId)}
        onDuplicate={() => {
          if (selectedCompId) {
            const comp = components.find((c) => c.id === selectedCompId);
            if (comp) {
              const dupId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
              const dup: CircuitComponent = {
                ...comp,
                id: dupId,
                x: (comp.editorPosition ? comp.editorPosition.x : comp.x) + 40,
                y: (comp.editorPosition ? comp.editorPosition.y : comp.y) + 40,
                editorPosition: {
                  x: (comp.editorPosition ? comp.editorPosition.x : comp.x) + 40,
                  y: (comp.editorPosition ? comp.editorPosition.y : comp.y) + 40,
                },
              };
              onUpdateComponents([...components, dup]);
              onSelectComponent(dupId);
            }
          }
        }}
        onDelete={() => {
          if (selectedCompId) onDeleteComponent(selectedCompId);
          else if (selectedWireId) onDeleteWire(selectedWireId);
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
        zoom={zoom}
        onZoomIn={() => setZoom((z) => Math.min(2.5, z * 1.15))}
        onZoomOut={() => setZoom((z) => Math.max(0.4, z * 0.85))}
        onZoomReset={() => setZoom(1)}
        onZoomFit={() => {
          setZoom(0.85);
          setPan({ x: 50, y: 40 });
        }}
        sheetConfig={sheetConfig}
        onUpdateSheetConfig={(cfg) => setSheetConfig((prev) => ({ ...prev, ...cfg }))}
        onExportSvg={() => exportSchematicSvg(svgRef.current, `${project.title || 'schematic'}.svg`)}
        onExportPng={() => exportSchematicPng(svgRef.current, `${project.title || 'schematic'}.png`, 2)}
        onPrintPdf={printSchematicSheet}
        selectedCompId={selectedCompId}
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
            tool === 'pan' || isDraggingCanvas
              ? 'cursor-grab active:cursor-grabbing'
              : tool === 'wire' || currentPlacingComp || ['draw_rect', 'draw_line', 'draw_circle'].includes(tool)
              ? 'cursor-crosshair'
              : 'cursor-default'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
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
                sheetConfig.theme === 'dark' ? 'bg-[#09101E]' : 'bg-[#FAFCFF]'
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
                    fill={sheetConfig.theme === 'dark' ? '#334155' : '#CBD5E1'}
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#sch-grid-pattern)" pointerEvents="none" />

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
                  onSelectWire(null);
                }}
                onDoubleClickItem={(item) => {
                  if (item.type === 'text') setInlineEditorTarget({ type: 'text', textNote: item.data as SchematicTextNote });
                  else if (item.type === 'netlabel') setInlineEditorTarget({ type: 'netlabel', netLabel: item.data as SchematicNetLabel });
                }}
              />

              {/* 90° Manhattan Orthogonal Wires Layer */}
              <g className="sch-wires-layer">
                {routedWires.map((rw) => {
                  const isSelected = selectedWireId === rw.wireId;
                  const ptsStr = rw.points.map((p) => `${p.x},${p.y}`).join(' ');
                  return (
                    <g key={rw.wireId} className="cursor-pointer">
                      {/* Generous Invisible Hover/Click Stroke */}
                      <polyline
                        points={ptsStr}
                        fill="none"
                        stroke="transparent"
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        onClick={(e) => {
                          const mid = rw.points[Math.floor(rw.points.length / 2)] || { x: mousePos.x, y: mousePos.y };
                          handleWireClick(e, rw.wireId, mid.x, mid.y);
                        }}
                      />
                      {/* Visible Copper Track Line */}
                      <polyline
                        points={ptsStr}
                        fill="none"
                        stroke={isSelected ? '#10B981' : sheetConfig.theme === 'dark' ? '#38BDF8' : '#0284C7'}
                        strokeWidth={isSelected ? '3' : '2'}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-colors hover:stroke-emerald-400"
                        onClick={(e) => {
                          const mid = rw.points[Math.floor(rw.points.length / 2)] || { x: mousePos.x, y: mousePos.y };
                          handleWireClick(e, rw.wireId, mid.x, mid.y);
                        }}
                      />
                    </g>
                  );
                })}

                {/* Electrical Solder Junction Dots (3+ wires & manual junctions) */}
                {allJunctions.map((j, idx) => (
                  <circle
                    key={`junct-${idx}`}
                    cx={j.x}
                    cy={j.y}
                    r="4"
                    fill="#38BDF8"
                    stroke="#0284C7"
                    strokeWidth="1.2"
                  />
                ))}

                {/* Live Rubberband Wire Preview (When actively routing wire) */}
                {activeWireStart && (
                  <polyline
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
                  const isSelected = selectedCompId === comp.id;
                  const posX = comp.editorPosition ? comp.editorPosition.x : comp.x;
                  const posY = comp.editorPosition ? comp.editorPosition.y : comp.y;

                  return (
                    <g
                      key={comp.id}
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
                      <SchematicVectorSymbol
                        component={comp}
                        isSelected={isSelected}
                        theme={sheetConfig.theme}
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
                      editorPosition: { x: mousePos.x, y: mousePos.y },
                      rotation: ghostRotation,
                      mirrored: ghostMirrored,
                    }}
                    isSelected={true}
                    theme={sheetConfig.theme}
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
            </svg>
          </div>
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
    </div>
  );
}
