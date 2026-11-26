'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  PcbLayout,
  PcbTrack,
  PcbPad,
  PcbSilkscreenText,
  PcbMountingHole,
  CircuitComponent,
  CircuitWire,
  PhysicalSpec,
} from '@/modules/engineering-lab/types';
import { PcbAutoRouter, compute45RoutePoints } from '@/modules/engineering-lab/pcb-engine/autorouter';
import { DrcEngine, DrcViolation } from '@/modules/engineering-lab/pcb-engine/drc-engine';
import { GerberExporter } from '@/modules/engineering-lab/pcb-engine/gerber-exporter';
import { UniversalExportFormat } from '@/modules/engineering-lab/export-engine/universal-exporter';
import { FootprintRenderer } from '@/modules/engineering-lab/pcb-engine/footprint-renderer';
import { PcbGenerator, isVirtualSchematicSymbol, DEFAULT_GND_POUR_LAYER } from '@/modules/engineering-lab/pcb-engine/pcb-generator';
import { resolvePhysicalSpec } from '@/modules/engineering-lab/circuit-engine/component-physical-registry';
import {
  Layers,
  Download,
  AlertTriangle,
  CheckCircle,
  Route,
  Trash2,
  Sliders,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crosshair,
  Wand2,
  Disc,
  CircleDot,
  Grid,
  Shield,
  Settings,
  Hand,
  MousePointer,
  ChevronDown,
  FileSpreadsheet,
  FileCode,
  Printer,
  GripHorizontal,
  X,
  Type,
  Copy,
  Check,
  Save,
  Upload,
} from 'lucide-react';
import { exportCanvasAsPng, exportCanvasAsJpg, exportCanvasAsPdf } from '@/modules/engineering-lab/export-engine/raster-export';
import { toast } from 'sonner';

export interface Pcb2dEditorProps {
  pcb: PcbLayout;
  components?: CircuitComponent[];
  wires?: CircuitWire[];
  projectTitle?: string;
  onUpdatePcb?: (updated: PcbLayout) => void;
  onUpdateDimensions?: (widthMm: number, heightMm: number) => void;
  onExportGerber?: () => void;
  onExportProject?: (format: UniversalExportFormat) => void;
  onTriggerImport?: () => void;
}

const TRACE_WIDTH_PRESETS = [
  { label: '0.2 mm (8 mil)', value: 0.2 },
  { label: '0.25 mm (10 mil)', value: 0.25 },
  { label: '0.4 mm (16 mil)', value: 0.4 },
  { label: '0.5 mm (20 mil)', value: 0.5 },
  { label: '0.8 mm (Power)', value: 0.8 },
  { label: '1.0 mm (Heavy Power)', value: 1.0 },
];

const DRILL_SIZE_PRESETS = [
  { label: '0.3 mm (Via)', value: 0.3 },
  { label: '0.6 mm (Small)', value: 0.6 },
  { label: '0.8 mm (Standard IC)', value: 0.8 },
  { label: '1.0 mm (Pin Header)', value: 1.0 },
  { label: '1.2 mm (Power/Terminal)', value: 1.2 },
];

const GRID_SPACING_PRESETS = [
  { label: '0.5 mm', value: 0.5 },
  { label: '1.0 mm', value: 1.0 },
  { label: '2.54 mm (0.1")', value: 2.54 },
];

export function Pcb2dEditor({
  pcb,
  components = [],
  wires = [],
  projectTitle = 'EI_House_PCB',
  onUpdatePcb,
  onUpdateDimensions,
  onExportGerber,
  onExportProject,
  onTriggerImport,
}: Pcb2dEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Board dimensions
  const [boardWidth, setBoardWidth] = useState(pcb.widthMm);
  const [boardHeight, setBoardHeight] = useState(pcb.heightMm);

  // Synchronize board dimensions when auto-sized from schematic placement
  useEffect(() => {
    setBoardWidth(pcb.widthMm);
    setBoardHeight(pcb.heightMm);
  }, [pcb.widthMm, pcb.heightMm]);

  // Active routing / editing layer
  const [activeLayer, setActiveLayer] = useState<'top_copper' | 'bottom_copper'>('top_copper');
  const [gndPourLayer, setGndPourLayer] = useState<'bottom_copper' | 'top_copper' | 'off'>(DEFAULT_GND_POUR_LAYER);

  // Tool Modes
  const [toolMode, setToolMode] = useState<'select' | 'route' | 'via' | 'pan'>('select');

  // Selected parameters
  const [traceWidth, setTraceWidth] = useState<number>(0.35);
  const [drillSize, setDrillSize] = useState<number>(0.8);
  const [units, setUnits] = useState<'mm' | 'mil'>(pcb.units || 'mm');
  const [gridSpacingMm, setGridSpacingMm] = useState<number>(1.0);
  const [isSnapToGrid, setIsSnapToGrid] = useState<boolean>(true);

  // Interactive routing state
  const [routingStartPad, setRoutingStartPad] = useState<{ id: string; x: number; y: number } | null>(null);
  const [hoveredPadId, setHoveredPadId] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [selectedPadId, setSelectedPadId] = useState<string | null>(null);
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [isDraggingComp, setIsDraggingComp] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedHoleId, setSelectedHoleId] = useState<string | null>(null);
  const [isDraggingHole, setIsDraggingHole] = useState<boolean>(false);
  const [holeDragOffset, setHoleDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Canvas mouse coordinates
  const [mouseCoord, setMouseCoord] = useState<{
    mmX: number;
    mmY: number;
    canvasX: number;
    canvasY: number;
    clientX?: number;
    clientY?: number;
  } | null>(null);

  // Zoom & Pan
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Layer Visibility
  const [visibleLayers, setVisibleLayers] = useState({
    topCopper: true,
    bottomCopper: true,
    silkscreen: true,
    drillHoles: true,
    ratsnest: true,
    copperPour: true,
  });

  const [showLayerPanel, setShowLayerPanel] = useState<boolean>(false);

  // Sidebar / Inspector Active Tab
  const [sidebarTab, setSidebarTab] = useState<'drc' | 'stackup' | 'inspector'>('drc');
  const [drcViolations, setDrcViolations] = useState<DrcViolation[]>([]);
  const [highlightLocation, setHighlightLocation] = useState<{ x: number; y: number } | null>(null);

  // Silkscreen Text State
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [isAddingText, setIsAddingText] = useState<boolean>(false);
  const [newTextValue, setNewTextValue] = useState<string>('REV 1.0');
  const [newTextFontSizeMm, setNewTextFontSizeMm] = useState<number>(2.0);
  const [newTextLayer, setNewTextLayer] = useState<'F.SilkS' | 'B.SilkS'>('F.SilkS');
  const [isDraggingText, setIsDraggingText] = useState<boolean>(false);
  const [textDragOffset, setTextDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Draggable Floating Stackup Modal State
  const [isStackupModalOpen, setIsStackupModalOpen] = useState<boolean>(false);
  const [stackupModalPos, setStackupModalPos] = useState<{ x: number; y: number }>({ x: 40, y: 65 });
  const [isDraggingStackup, setIsDraggingStackup] = useState<boolean>(false);
  const [stackupDragStart, setStackupDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Manufacturing Export Dropdown State
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [exportMenuPos, setExportMenuPos] = useState<{ top: number; right: number }>({ top: 46, right: 12 });

  useEffect(() => {
    if (!isExportMenuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        exportBtnRef.current?.contains(target) ||
        exportMenuRef.current?.contains(target)
      ) {
        return;
      }
      setIsExportMenuOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsExportMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick, true);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isExportMenuOpen]);

  // Stackup specs
  const [copperLayers, setCopperLayers] = useState<2 | 4 | 6 | 8>(pcb.copperLayers || 2);
  const [boardThicknessMm, setBoardThicknessMm] = useState<number>(pcb.boardThicknessMm || 1.6);
  const [copperWeightOz, setCopperWeightOz] = useState<number>(1);

  // Net-to-Layer Assignment Map
  const [netAssignments, setNetAssignments] = useState<Record<string, string>>({
    VCC: 'top_copper',
    GND: 'bottom_copper',
    SIGNALS: 'auto',
  });

  // 2D PCB Dedicated Undo / Redo Stacks (Capped at 50 states)
  const [undoStack, setUndoStack] = useState<PcbLayout[]>([]);
  const [redoStack, setRedoStack] = useState<PcbLayout[]>([]);
  const isUndoRedoRef = useRef(false);
  const lastPcbRef = useRef<PcbLayout>(pcb);

  useEffect(() => {
    if (!isUndoRedoRef.current && lastPcbRef.current !== pcb) {
      setUndoStack((prev) => [...prev.slice(-49), lastPcbRef.current]);
      setRedoStack([]);
    }
    lastPcbRef.current = pcb;
  }, [pcb]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, s.length - 1));
    setRedoStack((s) => [...s.slice(-49), JSON.parse(JSON.stringify(pcb))]);
    isUndoRedoRef.current = true;
    if (onUpdatePcb) onUpdatePcb(prev);
    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 0);
    toast.info('Reverted 2D PCB change (Undo)');
  }, [undoStack, pcb, onUpdatePcb]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, s.length - 1));
    setUndoStack((s) => [...s.slice(-49), JSON.parse(JSON.stringify(pcb))]);
    isUndoRedoRef.current = true;
    if (onUpdatePcb) onUpdatePcb(next);
    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 0);
    toast.info('Re-applied 2D PCB change (Redo)');
  }, [redoStack, pcb, onUpdatePcb]);

  // Run initial and reactive DRC
  useEffect(() => {
    const violations = DrcEngine.runChecks(pcb, { wires });
    setDrcViolations(violations);
  }, [pcb, wires]);

  // Handle snap to grid calculation
  const snapCoord = useCallback(
    (val: number) => {
      if (!isSnapToGrid || gridSpacingMm <= 0) return val;
      return Math.round(val / gridSpacingMm) * gridSpacingMm;
    },
    [isSnapToGrid, gridSpacingMm]
  );

  // Rotate selected component 90 degrees
  const handleRotateSelectedComponent = useCallback(() => {
    if (!selectedCompId || !pcb.components || !onUpdatePcb) return;
    const targetComp = pcb.components.find((c) => c.componentId === selectedCompId);
    if (!targetComp) return;

    const newRot = ((targetComp.rotation || 0) + 90) % 360;
    const updatedComponents = pcb.components.map((c) =>
      c.componentId === selectedCompId ? { ...c, rotation: newRot } : c
    );

    const padMapping = new Map<string, { oldX: number; oldY: number; newX: number; newY: number }>();
    const updatedPads = pcb.pads.map((p) => {
      if (p.componentId === selectedCompId) {
        const relX = p.x - targetComp.x;
        const relY = p.y - targetComp.y;
        const newPadX = Math.round((targetComp.x - relY) * 10) / 10;
        const newPadY = Math.round((targetComp.y + relX) * 10) / 10;
        padMapping.set(p.id, { oldX: p.x, oldY: p.y, newX: newPadX, newY: newPadY });
        return { ...p, x: newPadX, y: newPadY };
      }
      return p;
    });

    const updatedTracks = pcb.tracks.map((t) => {
      let from = { ...t.from };
      let to = { ...t.to };
      for (const [, m] of padMapping) {
        if (Math.hypot(t.from.x - m.oldX, t.from.y - m.oldY) < 0.3) {
          from = { x: m.newX, y: m.newY };
        }
        if (Math.hypot(t.to.x - m.oldX, t.to.y - m.oldY) < 0.3) {
          to = { x: m.newX, y: m.newY };
        }
      }
      return { ...t, from, to };
    });

    onUpdatePcb({
      ...pcb,
      components: updatedComponents,
      pads: updatedPads,
      tracks: updatedTracks,
    });
    toast.success(`Rotated ${targetComp.designator} to ${newRot}°`);
  }, [selectedCompId, pcb, onUpdatePcb]);

  // Plated Via insertion for layer transition [Shortcut: V]
  const handleInsertPlatedVia = useCallback(() => {
    const nextLayer = activeLayer === 'top_copper' ? 'bottom_copper' : 'top_copper';
    const viaX = mouseCoord ? snapCoord(mouseCoord.mmX) : Math.round(pcb.widthMm / 2);
    const viaY = mouseCoord ? snapCoord(mouseCoord.mmY) : Math.round(pcb.heightMm / 2);

    const viaPad: PcbPad = {
      id: `via_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      componentId: 'VIA',
      pinId: 'VIA',
      x: viaX,
      y: viaY,
      diameterMm: 0.8,
      holeMm: 0.4,
      shape: 'round',
      layer: 'all',
      netId: routingStartPad ? (pcb.pads.find((p) => p.id === routingStartPad.id)?.netId || undefined) : undefined,
      isManual: true,
    };

    if (routingStartPad && onUpdatePcb) {
      const pts = compute45RoutePoints(routingStartPad, { x: viaX, y: viaY });
      const newTracks: PcbTrack[] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        newTracks.push({
          id: `trk_via_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          layer: activeLayer,
          from: pts[i],
          to: pts[i + 1],
          widthMm: traceWidth,
          netId: viaPad.netId,
          isManual: true,
        });
      }

      setActiveLayer(nextLayer);
      onUpdatePcb({
        ...pcb,
        pads: [...pcb.pads, viaPad],
        tracks: [...pcb.tracks, ...newTracks],
      });

      setRoutingStartPad({ id: viaPad.id, x: viaX, y: viaY });
      toast.info(`Placed Via at (${viaX.toFixed(1)}, ${viaY.toFixed(1)}) mm & switched to ${nextLayer === 'top_copper' ? 'F.Cu' : 'B.Cu'}`);
    } else if (onUpdatePcb) {
      onUpdatePcb({
        ...pcb,
        pads: [...pcb.pads, viaPad],
      });
      setActiveLayer(nextLayer);
      toast.info(`Placed Plated Via at (${viaX.toFixed(1)}, ${viaY.toFixed(1)}) mm & active layer is now ${nextLayer === 'top_copper' ? 'F.Cu' : 'B.Cu'}`);
    } else {
      setActiveLayer(nextLayer);
    }
  }, [activeLayer, mouseCoord, snapCoord, pcb, routingStartPad, onUpdatePcb, traceWidth]);

  const handleDeleteSelectedText = useCallback(() => {
    if (!selectedTextId || !onUpdatePcb) return;
    const nextTexts = (pcb.texts || []).filter((t) => t.id !== selectedTextId);
    onUpdatePcb({ ...pcb, texts: nextTexts });
    setSelectedTextId(null);
    toast.success('Deleted silkscreen text');
  }, [selectedTextId, pcb, onUpdatePcb]);

  const handleRotateSelectedText = useCallback(() => {
    if (!selectedTextId || !onUpdatePcb) return;
    const nextTexts = (pcb.texts || []).map((t) =>
      t.id === selectedTextId ? { ...t, rotation: ((t.rotation || 0) + 90) % 360 } : t
    );
    onUpdatePcb({ ...pcb, texts: nextTexts });
    toast.info('Rotated silkscreen text 90°');
  }, [selectedTextId, pcb, onUpdatePcb]);

  const handleDeleteSelectedHole = useCallback(() => {
    if (!selectedHoleId || !onUpdatePcb) return;
    const baseHoles: PcbMountingHole[] = pcb.mountingHoles && pcb.mountingHoles.length > 0
      ? pcb.mountingHoles
      : [
          { id: 'mount_tl', xMm: 5.0, yMm: 5.0, x: 5.0, y: 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
          { id: 'mount_tr', xMm: pcb.widthMm - 5.0, yMm: 5.0, x: pcb.widthMm - 5.0, y: 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
          { id: 'mount_bl', xMm: 5.0, yMm: pcb.heightMm - 5.0, x: 5.0, y: pcb.heightMm - 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
          { id: 'mount_br', xMm: pcb.widthMm - 5.0, yMm: pcb.heightMm - 5.0, x: pcb.widthMm - 5.0, y: pcb.heightMm - 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
        ];
    const nextHoles = baseHoles.filter((h, idx) => (h.id || `m3_${idx}`) !== selectedHoleId);
    onUpdatePcb({ ...pcb, mountingHoles: nextHoles });
    setSelectedHoleId(null);
    toast.success('Mounting hole deleted');
  }, [selectedHoleId, pcb, onUpdatePcb]);

  const handleAddMountingHole = useCallback(() => {
    if (!onUpdatePcb) return;
    const baseHoles: PcbMountingHole[] = pcb.mountingHoles && pcb.mountingHoles.length > 0
      ? pcb.mountingHoles
      : [
          { id: 'mount_tl', xMm: 5.0, yMm: 5.0, x: 5.0, y: 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
          { id: 'mount_tr', xMm: pcb.widthMm - 5.0, yMm: 5.0, x: pcb.widthMm - 5.0, y: 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
          { id: 'mount_bl', xMm: 5.0, yMm: pcb.heightMm - 5.0, x: 5.0, y: pcb.heightMm - 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
          { id: 'mount_br', xMm: pcb.widthMm - 5.0, yMm: pcb.heightMm - 5.0, x: pcb.widthMm - 5.0, y: pcb.heightMm - 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
        ];
    const newHoleX = Math.round(pcb.widthMm / 2);
    const newHoleY = Math.round(pcb.heightMm / 2);
    const newHoleId = `hole_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newHole: PcbMountingHole = {
      id: newHoleId,
      xMm: newHoleX,
      yMm: newHoleY,
      x: newHoleX,
      y: newHoleY,
      drillMm: 3.2,
      outerMm: 6.0,
      diameterMm: 3.2,
      isCustomMoved: true,
    };
    onUpdatePcb({ ...pcb, mountingHoles: [...baseHoles, newHole] });
    setSelectedHoleId(newHoleId);
    setSelectedCompId(null);
    setSelectedTrackId(null);
    setSelectedTextId(null);
    setSidebarTab('inspector');
    toast.success(`Added M3 mounting hole at (${newHoleX}, ${newHoleY}) mm`);
  }, [pcb, onUpdatePcb]);

  const handleResetCornerHoles = useCallback(() => {
    if (!onUpdatePcb) return;
    const cornerInset = 5.0;
    const w = pcb.widthMm;
    const h = pcb.heightMm;
    const standardCorners: PcbMountingHole[] = [
      { id: 'mount_tl', xMm: cornerInset, yMm: cornerInset, x: cornerInset, y: cornerInset, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2, isCustomMoved: false },
      { id: 'mount_tr', xMm: w - cornerInset, yMm: cornerInset, x: w - cornerInset, y: cornerInset, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2, isCustomMoved: false },
      { id: 'mount_bl', xMm: cornerInset, yMm: h - cornerInset, x: cornerInset, y: h - cornerInset, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2, isCustomMoved: false },
      { id: 'mount_br', xMm: w - cornerInset, yMm: h - cornerInset, x: w - cornerInset, y: h - cornerInset, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2, isCustomMoved: false },
    ];
    onUpdatePcb({ ...pcb, mountingHoles: standardCorners });
    setSelectedHoleId(null);
    toast.success('Reset 4 corner M3 mounting holes to (5mm, 5mm) insets');
  }, [pcb, onUpdatePcb]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedTextId && onUpdatePcb) {
          e.preventDefault();
          handleDeleteSelectedText();
        } else if (selectedTrackId && onUpdatePcb) {
          e.preventDefault();
          const nextTracks = pcb.tracks.filter((t) => t.id !== selectedTrackId);
          onUpdatePcb({ ...pcb, tracks: nextTracks });
          setSelectedTrackId(null);
          toast.success('Copper track deleted');
        } else if (selectedHoleId && onUpdatePcb) {
          e.preventDefault();
          handleDeleteSelectedHole();
        }
      } else if (e.key === 'Escape') {
        setRoutingStartPad(null);
        setSelectedTrackId(null);
        setSelectedPadId(null);
        setSelectedCompId(null);
        setSelectedTextId(null);
        setSelectedHoleId(null);
        setIsDraggingComp(false);
        setIsDraggingText(false);
        setIsDraggingHole(false);
        setIsAddingText(false);
        setToolMode('select');
        setIsExportMenuOpen(false);
      } else if (e.key === 'r' || e.key === 'R') {
        if (selectedTextId && onUpdatePcb) {
          e.preventDefault();
          handleRotateSelectedText();
        } else if (selectedCompId && pcb.components && onUpdatePcb) {
          e.preventDefault();
          handleRotateSelectedComponent();
        } else {
          setToolMode((m) => (m === 'route' ? 'select' : 'route'));
          setRoutingStartPad(null);
        }
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setIsAddingText((prev) => !prev);
      } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        setToolMode('route');
        setRoutingStartPad(null);
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setToolMode((m) => (m === 'pan' ? 'select' : 'pan'));
        setRoutingStartPad(null);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setToolMode('select');
        setRoutingStartPad(null);
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        handleInsertPlatedVia();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedTrackId,
    selectedCompId,
    selectedTextId,
    selectedHoleId,
    routingStartPad,
    mouseCoord,
    activeLayer,
    pcb,
    onUpdatePcb,
    snapCoord,
    handleRotateSelectedComponent,
    handleRotateSelectedText,
    handleDeleteSelectedText,
    handleDeleteSelectedHole,
    traceWidth,
    handleInsertPlatedVia,
    handleUndo,
    handleRedo,
  ]);

  // Run full Auto-Router with Manhattan 45-chamfered tracks
  const handleAutoRoute = () => {
    if (!onUpdatePcb) return;
    const { tracks: routedTracks, vias } = PcbAutoRouter.route(
      pcb.pads,
      wires,
      boardWidth,
      boardHeight,
      { defaultSignalWidthMm: traceWidth, powerTrackWidthMm: Math.max(traceWidth * 2, 0.8) },
      components
    );

    // Filter out previous auto-routed vias to eliminate duplicate keys & duplicate vias
    const nonViaPads = pcb.pads.filter((p) => p.componentId !== 'VIA');
    const updatedPads = [...nonViaPads, ...vias];
    const drcViolationsFresh = DrcEngine.runChecks({ ...pcb, pads: updatedPads, tracks: routedTracks }, { wires });

    onUpdatePcb({
      ...pcb,
      pads: updatedPads,
      tracks: routedTracks,
      drcErrors: drcViolationsFresh.map((v) => ({ id: v.id, message: v.message, severity: v.severity })),
    });

    setDrcViolations(drcViolationsFresh);
    toast.success(`Auto-routed ${routedTracks.length} tracks with ${vias.length} layer-hop vias`);
  };

  // Courtyard-Aware Zero-Overlap Auto-Placement & Dynamic Board Auto-Sizing
  const handleAutoPlace = useCallback(() => {
    if (!onUpdatePcb) return;
    const newPcb = PcbGenerator.generatePcbFromSchematic(components, wires);
    onUpdatePcb(newPcb);
    if (onUpdateDimensions) {
      onUpdateDimensions(newPcb.widthMm, newPcb.heightMm);
    }
    toast.success(`Auto-placed ${newPcb.components?.length || 0} components (${newPcb.widthMm}×${newPcb.heightMm}mm board)`);
  }, [components, wires, onUpdatePcb, onUpdateDimensions]);

  // Clear all tracks
  const handleClearAllTraces = () => {
    if (!onUpdatePcb) return;
    onUpdatePcb({
      ...pcb,
      tracks: [],
    });
    setSelectedTrackId(null);
    setRoutingStartPad(null);
    toast.info('Cleared all copper traces');
  };

  // Auto-Fix DRC Clearances
  const handleFixDrcClearances = () => {
    if (!onUpdatePcb) return;
    const fixedPcb = DrcEngine.autoFixClearances(pcb, 0.25);
    onUpdatePcb(fixedPcb);
    const violations = DrcEngine.runChecks(fixedPcb, { wires });
    setDrcViolations(violations);
    toast.success('Applied automatic minimum trace width & clearance corrections');
  };

  // Multi-Format Manufacturing File Exporters
  const handleDownloadGerberZip = () => {
    setIsExportMenuOpen(false);
    if (onExportProject) {
      onExportProject('gerber-zip');
    } else if (onExportGerber) {
      onExportGerber();
    } else {
      GerberExporter.exportGerberZip(pcb, components, projectTitle);
    }
  };

  const handleDownloadBomCsv = () => {
    setIsExportMenuOpen(false);
    const csv = GerberExporter.exportBomCsv(components);
    GerberExporter.downloadFile(`${projectTitle}_BOM.csv`, csv, 'text/csv');
    toast.success('Downloaded Bill of Materials (BOM.csv)');
  };

  const handleDownloadPickAndPlaceCsv = () => {
    setIsExportMenuOpen(false);
    const csv = GerberExporter.exportPickAndPlaceCsv(pcb);
    GerberExporter.downloadFile(`${projectTitle}_CPL.csv`, csv, 'text/csv');
    toast.success('Downloaded Pick & Place Centroid (CPL.csv)');
  };

  const handleDownloadBlueprintSvg = () => {
    setIsExportMenuOpen(false);
    const svg = GerberExporter.exportBlueprintSvg(pcb);
    GerberExporter.downloadFile(`${projectTitle}_Blueprint.svg`, svg, 'image/svg+xml');
    toast.success('Downloaded 2D Vector Blueprint (Blueprint.svg)');
  };

  // ----------------------------------------------------
  // 2D PCB Canvas Drawing Effect
  // ----------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Dark EDA board canvas background
    ctx.fillStyle = '#050D1A';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);

    const baseScale = Math.min((width - 90) / pcb.widthMm, (height - 90) / pcb.heightMm);
    const scale = baseScale * zoomLevel;
    const offsetX = (width - pcb.widthMm * scale) / 2;
    const offsetY = (height - pcb.heightMm * scale) / 2;

    // EDA background grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridPx = gridSpacingMm * scale;
    if (gridPx > 6) {
      for (let x = offsetX % gridPx; x < width; x += gridPx) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = offsetY % gridPx; y < height; y += gridPx) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // 1. Draw FR4 Board Substrate (Dark EDA Substrate)
    ctx.fillStyle = '#0B1117';
    ctx.strokeStyle = '#047857';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(offsetX, offsetY, pcb.widthMm * scale, pcb.heightMm * scale, 8 * zoomLevel);
    ctx.fill();
    ctx.stroke();

    // 1.1 Ground Pour / GND Plane (KiCad / Altium Professional 2-Layer Standard)
    // Strictly beneath signal tracks, with isolation clearance around non-GND pads/vias and traces.
    if (visibleLayers.copperPour && gndPourLayer !== 'off') {
      const margin = 1.8 * scale;
      const isBottomGnd = gndPourLayer === 'bottom_copper';

      // Subtle translucent ground pour plane (B.Cu blue or F.Cu red)
      ctx.fillStyle = isBottomGnd ? 'rgba(37, 99, 235, 0.22)' : 'rgba(239, 68, 68, 0.18)';
      ctx.fillRect(offsetX + margin, offsetY + margin, pcb.widthMm * scale - margin * 2, pcb.heightMm * scale - margin * 2);
      ctx.strokeStyle = isBottomGnd ? 'rgba(59, 130, 246, 0.5)' : 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(offsetX + margin, offsetY + margin, pcb.widthMm * scale - margin * 2, pcb.heightMm * scale - margin * 2);

      // Isolation clearance gaps around non-GND through-hole pads & vias
      pcb.pads.forEach((pad) => {
        const isGnd = pad.netId === 'GND' || pad.pinId.toLowerCase().includes('gnd');
        if (!isGnd) {
          const px = offsetX + pad.x * scale;
          const py = offsetY + pad.y * scale;
          const clearR = (pad.diameterMm * scale) / 2 + 0.6 * scale;
          ctx.fillStyle = '#0B1117';
          ctx.beginPath();
          if (pad.shape === 'rect') {
            ctx.fillRect(px - clearR, py - clearR, clearR * 2, clearR * 2);
          } else {
            ctx.arc(px, py, clearR, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      // Isolation clearance gaps around non-GND traces on this pour layer
      const pourTrackLayer = isBottomGnd ? 'bottom_copper' : 'top_copper';
      ctx.strokeStyle = '#0B1117';
      ctx.lineWidth = 1.5 * scale;
      ctx.lineCap = 'round';
      pcb.tracks
        .filter((t) => t.layer === pourTrackLayer && t.netId !== 'GND')
        .forEach((t) => {
          ctx.beginPath();
          ctx.moveTo(offsetX + t.from.x * scale, offsetY + t.from.y * scale);
          ctx.lineTo(offsetX + t.to.x * scale, offsetY + t.to.y * scale);
          ctx.stroke();
        });

      // Silkscreen / Copper zone indicator in top-left corner
      ctx.fillStyle = isBottomGnd ? 'rgba(59, 130, 246, 0.85)' : 'rgba(239, 68, 68, 0.85)';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(
        isBottomGnd ? 'B.Cu GND ZONE (COPPER POUR)' : 'F.Cu GND ZONE (COPPER POUR)',
        offsetX + margin + 6,
        offsetY + margin + 12
      );
    }

    // 2. Corner M3 Mounting Holes (Single source of truth synchronized with 3D PCB View)
    const effectiveHoles: PcbMountingHole[] =
      pcb.mountingHoles && pcb.mountingHoles.length > 0
        ? pcb.mountingHoles
        : [
            { id: 'mount_tl', xMm: 5.0, yMm: 5.0, x: 5.0, y: 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
            { id: 'mount_tr', xMm: pcb.widthMm - 5.0, yMm: 5.0, x: pcb.widthMm - 5.0, y: 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
            { id: 'mount_bl', xMm: 5.0, yMm: pcb.heightMm - 5.0, x: 5.0, y: pcb.heightMm - 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
            { id: 'mount_br', xMm: pcb.widthMm - 5.0, yMm: pcb.heightMm - 5.0, x: pcb.widthMm - 5.0, y: pcb.heightMm - 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
          ];

    effectiveHoles.forEach((hole, idx) => {
      const hId = hole.id || `m3_${idx}`;
      const isSelected = hId === selectedHoleId;
      const posX = hole.xMm ?? hole.x ?? 0;
      const posY = hole.yMm ?? hole.y ?? 0;
      const drill = hole.drillMm ?? hole.diameterMm ?? 3.2;
      const outer = hole.outerMm ?? (drill + 2.8);
      const hx = offsetX + posX * scale;
      const hy = offsetY + posY * scale;
      const padR = (outer / 2) * scale;
      const drillR = (drill / 2) * scale;

      // Outer ENIG gold annular ring
      ctx.fillStyle = '#D4AF37';
      ctx.beginPath();
      ctx.arc(hx, hy, padR, 0, Math.PI * 2);
      ctx.fill();

      // Inner see-through drill hole bore
      ctx.fillStyle = '#050D1A';
      ctx.beginPath();
      ctx.arc(hx, hy, drillR, 0, Math.PI * 2);
      ctx.fill();

      // Plated copper barrel edge
      ctx.strokeStyle = '#C87D55';
      ctx.lineWidth = Math.max(1, 0.25 * scale);
      ctx.beginPath();
      ctx.arc(hx, hy, drillR, 0, Math.PI * 2);
      ctx.stroke();

      // Selection halo if selected
      if (isSelected) {
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(hx, hy, padR + 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Small silkscreen label
      ctx.fillStyle = '#F8FAFC';
      ctx.font = `bold ${Math.max(8, Math.round(1.1 * scale))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('M3', hx, hy + padR + 1.5);
    });

    // 2.1 CAD Dimensions & Outer Extension Lines
    const pcbW = pcb.widthMm * scale;
    const pcbH = pcb.heightMm * scale;

    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 1;
    // Top dimension
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY - 14);
    ctx.lineTo(offsetX + pcbW, offsetY - 14);
    ctx.stroke();

    ctx.fillStyle = '#042F2E';
    ctx.strokeStyle = '#0D9488';
    ctx.fillRect(offsetX + pcbW / 2 - 34, offsetY - 22, 68, 16);
    ctx.strokeRect(offsetX + pcbW / 2 - 34, offsetY - 22, 68, 16);
    ctx.fillStyle = '#2DD4BF';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`${pcb.widthMm.toFixed(1)} mm`, offsetX + pcbW / 2 - 24, offsetY - 10);

    // Left dimension
    ctx.strokeStyle = '#06B6D4';
    ctx.beginPath();
    ctx.moveTo(offsetX - 14, offsetY);
    ctx.lineTo(offsetX - 14, offsetY + pcbH);
    ctx.stroke();

    ctx.fillStyle = '#042F2E';
    ctx.strokeStyle = '#0D9488';
    ctx.fillRect(offsetX - 58, offsetY + pcbH / 2 - 8, 52, 16);
    ctx.strokeRect(offsetX - 58, offsetY + pcbH / 2 - 8, 52, 16);
    ctx.fillStyle = '#2DD4BF';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`${pcb.heightMm.toFixed(1)} mm`, offsetX - 54, offsetY + pcbH / 2 + 4);

    // 3. Ratsnest (Airwires) - Live connection guides
    if (visibleLayers.ratsnest && wires.length > 0) {
      const padLookup = new Map<string, { x: number; y: number }>();
      pcb.pads.forEach((p) => padLookup.set(`${p.componentId}:${p.pinId}`, { x: p.x, y: p.y }));

      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      wires.forEach((wire) => {
        const p1 = padLookup.get(`${wire.fromCompId}:${wire.fromPinId}`);
        const p2 = padLookup.get(`${wire.toCompId}:${wire.toPinId}`);
        if (p1 && p2) {
          const isConnected = pcb.tracks.some((t) => {
            const near1 = Math.hypot(t.from.x - p1.x, t.from.y - p1.y) < 0.5 || Math.hypot(t.to.x - p1.x, t.to.y - p1.y) < 0.5;
            const near2 = Math.hypot(t.from.x - p2.x, t.from.y - p2.y) < 0.5 || Math.hypot(t.to.x - p2.x, t.to.y - p2.y) < 0.5;
            return near1 && near2;
          });

          if (!isConnected) {
            ctx.beginPath();
            ctx.moveTo(offsetX + p1.x * scale, offsetY + p1.y * scale);
            ctx.lineTo(offsetX + p2.x * scale, offsetY + p2.y * scale);
            ctx.stroke();
          }
        }
      });
      ctx.setLineDash([]);
    }

    // 4. Draw Bottom Copper Tracks (B.Cu - Blue)
    if (visibleLayers.bottomCopper) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const isLayerActive = activeLayer === 'bottom_copper';

      pcb.tracks
        .filter((t) => t.layer === 'bottom_copper')
        .forEach((t) => {
          const isSelected = t.id === selectedTrackId;
          const pxWidth = Math.max(t.widthMm * scale, isLayerActive ? 2.0 : 1.2);

          if (isSelected) {
            ctx.strokeStyle = '#F59E0B';
            ctx.lineWidth = pxWidth + 4;
            ctx.beginPath();
            ctx.moveTo(offsetX + t.from.x * scale, offsetY + t.from.y * scale);
            ctx.lineTo(offsetX + t.to.x * scale, offsetY + t.to.y * scale);
            ctx.stroke();
          }

          ctx.strokeStyle = isSelected
            ? '#F59E0B'
            : isLayerActive
            ? '#3B82F6'
            : 'rgba(59, 130, 246, 0.35)';
          ctx.lineWidth = pxWidth;
          ctx.beginPath();
          ctx.moveTo(offsetX + t.from.x * scale, offsetY + t.from.y * scale);
          ctx.lineTo(offsetX + t.to.x * scale, offsetY + t.to.y * scale);
          ctx.stroke();
        });
    }

    // 5. Draw Top Copper Tracks (F.Cu - Red)
    if (visibleLayers.topCopper) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const isLayerActive = activeLayer === 'top_copper';

      pcb.tracks
        .filter((t) => t.layer === 'top_copper')
        .forEach((t) => {
          const isSelected = t.id === selectedTrackId;
          const pxWidth = Math.max(t.widthMm * scale, isLayerActive ? 2.0 : 1.2);

          if (isSelected) {
            ctx.strokeStyle = '#F59E0B';
            ctx.lineWidth = pxWidth + 4;
            ctx.beginPath();
            ctx.moveTo(offsetX + t.from.x * scale, offsetY + t.from.y * scale);
            ctx.lineTo(offsetX + t.to.x * scale, offsetY + t.to.y * scale);
            ctx.stroke();
          }

          ctx.strokeStyle = isSelected
            ? '#F59E0B'
            : isLayerActive
            ? '#EF4444'
            : 'rgba(239, 68, 68, 0.35)';
          ctx.lineWidth = pxWidth;
          ctx.beginPath();
          ctx.moveTo(offsetX + t.from.x * scale, offsetY + t.from.y * scale);
          ctx.lineTo(offsetX + t.to.x * scale, offsetY + t.to.y * scale);
          ctx.stroke();
        });
    }

    // 6. Interactive 45°-Chamfered Rubberband Trace Preview
    if (routingStartPad && mouseCoord) {
      const sx = offsetX + routingStartPad.x * scale;
      const sy = offsetY + routingStartPad.y * scale;

      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sx, sy, 5 * scale, 0, Math.PI * 2);
      ctx.stroke();

      const dx = mouseCoord.mmX - routingStartPad.x;
      const dy = mouseCoord.mmY - routingStartPad.y;
      const signX = Math.sign(dx) || 1;
      const signY = Math.sign(dy) || 1;
      const chamfer = Math.min(Math.abs(dx), Math.abs(dy));

      let midMmX = routingStartPad.x;
      let midMmY = routingStartPad.y;

      if (Math.abs(dx) >= Math.abs(dy)) {
        midMmX = routingStartPad.x + (Math.abs(dx) - chamfer) * signX;
        midMmY = routingStartPad.y;
      } else {
        midMmX = routingStartPad.x;
        midMmY = routingStartPad.y + (Math.abs(dy) - chamfer) * signY;
      }

      ctx.strokeStyle = activeLayer === 'top_copper' ? '#EF4444' : '#3B82F6';
      ctx.lineWidth = Math.max(traceWidth * scale, 2);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(offsetX + midMmX * scale, offsetY + midMmY * scale);
      ctx.lineTo(mouseCoord.canvasX, mouseCoord.canvasY);
      ctx.stroke();

      const distMm = Math.hypot(dx, dy);
      ctx.fillStyle = '#020617';
      ctx.fillRect(mouseCoord.canvasX + 8, mouseCoord.canvasY - 18, 54, 16);
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1;
      ctx.strokeRect(mouseCoord.canvasX + 8, mouseCoord.canvasY - 18, 54, 16);
      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`${distMm.toFixed(1)} mm`, mouseCoord.canvasX + 11, mouseCoord.canvasY - 6);
    }

    // 7. Silkscreen Outlines and Tight, Legible Labels Right Beside Courtyards (Strictly ABOVE Copper Tracks)
    if (visibleLayers.silkscreen) {
      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.font = 'bold 9px monospace';

      ctx.fillText('EI HOUSE ENG LAB', offsetX + 14 * scale, offsetY + 5.5 * scale);
      ctx.fillText(`REV 2.0 (${pcb.widthMm}x${pcb.heightMm}mm)`, offsetX + 14 * scale, offsetY + pcb.heightMm * scale - 4 * scale);

      // User Custom Silkscreen Texts
      if (pcb.texts && pcb.texts.length > 0) {
        pcb.texts.forEach((txt) => {
          const tx = offsetX + txt.xMm * scale;
          const ty = offsetY + txt.yMm * scale;
          const isTextSelected = txt.id === selectedTextId;
          const isTop = txt.layer === 'F.SilkS' || !txt.layer;

          ctx.save();
          ctx.translate(tx, ty);
          if (txt.rotation) {
            ctx.rotate((txt.rotation * Math.PI) / 180);
          }
          const fontPx = Math.max(9, Math.round((txt.fontSizeMm || 2.0) * scale));
          ctx.font = `bold ${fontPx}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          if (isTextSelected) {
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            const textMetrics = ctx.measureText(txt.text);
            const boxW = textMetrics.width + 8;
            const boxH = fontPx + 6;
            ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);
            ctx.setLineDash([]);
            ctx.fillStyle = '#38BDF8';
            ctx.font = 'bold 8px monospace';
            ctx.fillText('↺ [R]', -boxW / 2 + 10, boxH / 2 + 8);
            ctx.font = `bold ${fontPx}px monospace`;
          }

          ctx.fillStyle = isTextSelected ? '#38BDF8' : isTop ? '#F8FAFC' : '#93C5FD';
          ctx.fillText(txt.text, 0, 0);
          ctx.restore();
        });
      }

      if (pcb.components) {
        pcb.components.filter((comp) => !isVirtualSchematicSymbol(comp.type)).forEach((comp) => {
          const cx = offsetX + comp.x * scale;
          const cy = offsetY + comp.y * scale;
          const isCompSelected = comp.componentId === selectedCompId;

          ctx.save();
          ctx.translate(cx, cy);
          if (comp.rotation) {
            ctx.rotate((comp.rotation * Math.PI) / 180);
          }

          const spec = resolvePhysicalSpec(comp.type, comp.footprint);
          const selW = (spec.courtyardMm?.width || spec.bodyDimensionsMm?.width || 12) * scale;
          const selH = (spec.courtyardMm?.depth || spec.bodyDimensionsMm?.depth || 10) * scale;

          if (isCompSelected) {
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(-selW / 2, -selH / 2, selW, selH);
            ctx.setLineDash([]);
            ctx.fillStyle = '#38BDF8';
            ctx.font = 'bold 8px monospace';
            ctx.fillText('↺ [R]', -selW / 2 + 2, selH / 2 + 10);
          }

          // Render complete IPC-7351 production silkscreen
          FootprintRenderer.renderSilkscreen(ctx, comp, {
            scale,
            isSelected: isCompSelected,
            silkColor: isCompSelected ? '#38BDF8' : '#F8FAFC',
            is3dDecal: false,
          });

          ctx.restore();
        });
      }
    }

    // 8. Exposed Metallic Pads, Thermal Relief Spokes, Annular Rings & Drill Holes (Top Layer)
    pcb.pads.forEach((pad) => {
      const px = offsetX + pad.x * scale;
      const py = offsetY + pad.y * scale;
      const radius = (pad.diameterMm * scale) / 2;
      const isHovered = pad.id === hoveredPadId;
      const isStart = routingStartPad?.id === pad.id;
      const isSelected = pad.id === selectedPadId;
      const isVia = pad.componentId === 'VIA' || pad.id.startsWith('via_');
      const matchingComp = pcb.components?.find((c) => c.componentId === pad.componentId);
      const upperType = matchingComp ? (matchingComp.type || '').toUpperCase() : '';
      const upperVal = matchingComp ? (matchingComp.value || '').toUpperCase() : '';
      const isCeramicCap =
        upperType.includes('CAPACITOR') &&
        !upperType.includes('ELECTROLYTIC') &&
        !upperType.includes('RADIAL') &&
        !upperType.includes('TANTALUM') &&
        !upperVal.includes('UF') &&
        !upperVal.includes('µF');
      const isPlainResistor = upperType.includes('RESISTOR') && !upperType.includes('POT') && !upperType.includes('TRIMMER');
      const isNonPolarizedPassive = isCeramicCap || isPlainResistor;
      const isPin1 =
        !isNonPolarizedPassive &&
        (pad.pinId === '1' || pad.pinId.toLowerCase() === 'k' || pad.pinId.toLowerCase() === 'c' || pad.shape === 'rect');
      const isRect = !isVia && (pad.shape === 'rect' || isPin1);
      const isGnd = pad.netId === 'GND' || pad.pinId.toLowerCase().includes('gnd');

      // Thermal Relief 4-Spoke Cross for GND Pads connecting to Ground Pour
      if (isGnd && visibleLayers.copperPour && gndPourLayer !== 'off') {
        const spokeColor = gndPourLayer === 'bottom_copper' ? '#3B82F6' : '#EF4444';
        // Clearance isolation circular trough in substrate color
        ctx.strokeStyle = '#0B1117';
        ctx.lineWidth = 1.8 * scale;
        ctx.beginPath();
        ctx.arc(px, py, radius + 1.2 * scale, 0, Math.PI * 2);
        ctx.stroke();

        // 4 orthogonal copper spokes connecting to ground pour (+ shape)
        ctx.strokeStyle = spokeColor;
        ctx.lineWidth = Math.max(1.5, 0.6 * scale);
        ctx.beginPath();
        ctx.moveTo(px - radius - 2.0 * scale, py);
        ctx.lineTo(px + radius + 2.0 * scale, py);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(px, py - radius - 2.0 * scale);
        ctx.lineTo(px, py + radius + 2.0 * scale);
        ctx.stroke();
      }

      // Solder Mask Relief / Clearance Ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (isRect) {
        ctx.strokeRect(px - radius - 1.5, py - radius - 1.5, (radius + 1.5) * 2, (radius + 1.5) * 2);
      } else {
        ctx.arc(px, py, radius + 1.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Selection / Hover Halo
      if (isHovered || isStart || isSelected) {
        ctx.strokeStyle = isStart ? '#10B981' : isSelected ? '#F59E0B' : '#38BDF8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (isRect) {
          ctx.strokeRect(px - radius - 3.5, py - radius - 3.5, (radius + 3.5) * 2, (radius + 3.5) * 2);
        } else {
          ctx.arc(px, py, radius + 3.5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // ENIG Gold Plated Annular Pad (Pin 1 is distinct square/chamfered)
      ctx.fillStyle = isHovered ? '#FDE047' : isSelected ? '#FBBF24' : isPin1 ? '#F59E0B' : '#D97706';
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 1;

      ctx.beginPath();
      if (isRect) {
        ctx.rect(px - radius, py - radius, radius * 2, radius * 2);
      } else {
        ctx.arc(px, py, radius, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();

      // Plated Through Hole Barrel & Drill Center
      if (visibleLayers.drillHoles) {
        const drillRadius = (pad.holeMm * scale) / 2;
        // Inner plated barrel rim
        ctx.strokeStyle = '#B45309';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, drillRadius + 0.6, 0, Math.PI * 2);
        ctx.stroke();

        // Dark hollow drill hole
        ctx.fillStyle = '#050D1A';
        ctx.beginPath();
        ctx.arc(px, py, drillRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Crisp miniature centered / beside net text (GND, 5V, VCC, Pin) readable when zoomed in
      if (scale >= 1.6) {
        const netLabel = pad.netId ? pad.netId : isGnd ? 'GND' : pad.pinId;
        ctx.fillStyle = isGnd ? '#10B981' : isPin1 ? '#F59E0B' : '#CBD5E1';
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(netLabel, px, py - (radius + 2.5));
      }
    });

    // 9. Real Geometric DRC Violation Red Ring Markers on Board
    drcViolations.forEach((v) => {
      if (v.location) {
        const vx = offsetX + v.location.x * scale;
        const vy = offsetY + v.location.y * scale;

        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(vx, vy, 8 * zoomLevel, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(vx, vy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 10. Selected DRC Marker Pulsing Target
    if (highlightLocation) {
      const hx = offsetX + highlightLocation.x * scale;
      const hy = offsetY + highlightLocation.y * scale;

      ctx.strokeStyle = '#F43F5E';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(hx, hy, 14, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#F43F5E';
      ctx.beginPath();
      ctx.arc(hx, hy, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }, [
    pcb,
    wires,
    visibleLayers,
    activeLayer,
    routingStartPad,
    mouseCoord,
    hoveredPadId,
    selectedTrackId,
    selectedPadId,
    selectedCompId,
    selectedTextId,
    traceWidth,
    zoomLevel,
    panOffset,
    highlightLocation,
    gridSpacingMm,
    drcViolations,
    gndPourLayer,
  ]);

  // ----------------------------------------------------
  // Canvas Mouse Interaction Handlers
  // ----------------------------------------------------
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height);

    const baseScale = Math.min((canvas.width - 90) / pcb.widthMm, (canvas.height - 90) / pcb.heightMm);
    const scale = baseScale * zoomLevel;
    const offsetX = (canvas.width - pcb.widthMm * scale) / 2 + panOffset.x;
    const offsetY = (canvas.height - pcb.heightMm * scale) / 2 + panOffset.y;

    const mmX = (canvasX - offsetX) / scale;
    const mmY = (canvasY - offsetY) / scale;

    return { canvasX, canvasY, mmX, mmY, clientX: e.clientX, clientY: e.clientY };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    if (!coords) return;
    setMouseCoord(coords);

    if (isPanning) {
      setPanOffset({
        x: coords.canvasX - panStart.x,
        y: coords.canvasY - panStart.y,
      });
      return;
    }

    // Live M3 Mounting Hole Dragging
    if (isDraggingHole && selectedHoleId && pcb.mountingHoles && onUpdatePcb) {
      const targetHole = pcb.mountingHoles.find((h, idx) => (h.id || `m3_${idx}`) === selectedHoleId);
      if (targetHole) {
        const rawSnapX = snapCoord(coords.mmX - holeDragOffset.x);
        const rawSnapY = snapCoord(coords.mmY - holeDragOffset.y);
        const clampedX = Math.max(3, Math.min(pcb.widthMm - 3, rawSnapX));
        const clampedY = Math.max(3, Math.min(pcb.heightMm - 3, rawSnapY));
        const nextHoles = pcb.mountingHoles.map((h, idx) =>
          (h.id || `m3_${idx}`) === selectedHoleId
            ? { ...h, id: h.id || `m3_${idx}`, xMm: clampedX, yMm: clampedY, x: clampedX, y: clampedY, isCustomMoved: true }
            : h
        );
        onUpdatePcb({ ...pcb, mountingHoles: nextHoles });
        return;
      }
    }

    // Live Silkscreen Text Dragging
    if (isDraggingText && selectedTextId && pcb.texts && onUpdatePcb) {
      const snapX = snapCoord(coords.mmX - textDragOffset.x);
      const snapY = snapCoord(coords.mmY - textDragOffset.y);
      const clampedX = Math.max(2, Math.min(pcb.widthMm - 2, snapX));
      const clampedY = Math.max(2, Math.min(pcb.heightMm - 2, snapY));
      const nextTexts = pcb.texts.map((t) =>
        t.id === selectedTextId ? { ...t, xMm: clampedX, yMm: clampedY } : t
      );
      onUpdatePcb({ ...pcb, texts: nextTexts });
      return;
    }

    // Live Component Dragging with Instant Ratsnest Updates
    if (isDraggingComp && selectedCompId && pcb.components && onUpdatePcb) {
      const targetComp = pcb.components.find((c) => c.componentId === selectedCompId);
      if (targetComp) {
        const rawSnapX = snapCoord(coords.mmX - dragOffset.x);
        const rawSnapY = snapCoord(coords.mmY - dragOffset.y);
        const clampedX = Math.max(6, Math.min(pcb.widthMm - 6, rawSnapX));
        const clampedY = Math.max(6, Math.min(pcb.heightMm - 6, rawSnapY));
        const deltaX = clampedX - targetComp.x;
        const deltaY = clampedY - targetComp.y;

        if (Math.abs(deltaX) > 0.05 || Math.abs(deltaY) > 0.05) {
          const updatedComponents = pcb.components.map((c) =>
            c.componentId === selectedCompId ? { ...c, x: clampedX, y: clampedY } : c
          );
          const padMapping = new Map<string, { oldX: number; oldY: number; newX: number; newY: number }>();
          const updatedPads = pcb.pads.map((p) => {
            if (p.componentId === selectedCompId) {
              const newX = Math.round((p.x + deltaX) * 10) / 10;
              const newY = Math.round((p.y + deltaY) * 10) / 10;
              padMapping.set(p.id, { oldX: p.x, oldY: p.y, newX, newY });
              return { ...p, x: newX, y: newY };
            }
            return p;
          });
          const updatedTracks = pcb.tracks.map((t) => {
            let from = { ...t.from };
            let to = { ...t.to };
            for (const [, m] of padMapping) {
              if (Math.hypot(t.from.x - m.oldX, t.from.y - m.oldY) < 0.3) {
                from = { x: m.newX, y: m.newY };
              }
              if (Math.hypot(t.to.x - m.oldX, t.to.y - m.oldY) < 0.3) {
                to = { x: m.newX, y: m.newY };
              }
            }
            return { ...t, from, to };
          });
          onUpdatePcb({
            ...pcb,
            components: updatedComponents,
            pads: updatedPads,
            tracks: updatedTracks,
          });
        }
      }
    }

    const hovered = pcb.pads.find((p) => {
      const d = Math.hypot(p.x - coords.mmX, p.y - coords.mmY);
      return d <= Math.max(p.diameterMm, 2.5);
    });
    setHoveredPadId(hovered ? hovered.id : null);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || (e.button === 0 && toolMode === 'pan')) {
      e.preventDefault();
      setIsPanning(true);
      const coords = getCanvasCoords(e);
      if (coords) setPanStart({ x: coords.canvasX - panOffset.x, y: coords.canvasY - panOffset.y });
      return;
    }

    if (e.button !== 0) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const { mmX, mmY } = coords;

    if (toolMode === 'select' && !routingStartPad) {
      // Check M3 mounting holes
      if (visibleLayers.drillHoles) {
        const effectiveHoles: PcbMountingHole[] =
          pcb.mountingHoles && pcb.mountingHoles.length > 0
            ? pcb.mountingHoles
            : [
                { id: 'mount_tl', xMm: 5.0, yMm: 5.0, x: 5.0, y: 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
                { id: 'mount_tr', xMm: pcb.widthMm - 5.0, yMm: 5.0, x: pcb.widthMm - 5.0, y: 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
                { id: 'mount_bl', xMm: 5.0, yMm: pcb.heightMm - 5.0, x: 5.0, y: pcb.heightMm - 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
                { id: 'mount_br', xMm: pcb.widthMm - 5.0, yMm: pcb.heightMm - 5.0, x: pcb.widthMm - 5.0, y: pcb.heightMm - 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
              ];
        const clickedHole = effectiveHoles.find((h, idx) => {
          const posX = h.xMm ?? h.x ?? 0;
          const posY = h.yMm ?? h.y ?? 0;
          const drill = h.drillMm ?? h.diameterMm ?? 3.2;
          const outer = h.outerMm ?? (drill + 2.8);
          const d = Math.hypot(posX - mmX, posY - mmY);
          return d <= Math.max(outer / 2, 3.5);
        });
        if (clickedHole) {
          const hId = clickedHole.id || `m3_${effectiveHoles.indexOf(clickedHole)}`;
          if (!pcb.mountingHoles || pcb.mountingHoles.length === 0) {
            onUpdatePcb?.({ ...pcb, mountingHoles: effectiveHoles });
          }
          const posX = clickedHole.xMm ?? clickedHole.x ?? 0;
          const posY = clickedHole.yMm ?? clickedHole.y ?? 0;
          setSelectedHoleId(hId);
          setSelectedCompId(null);
          setSelectedTrackId(null);
          setSelectedPadId(null);
          setSelectedTextId(null);
          setIsDraggingHole(true);
          setHoleDragOffset({ x: mmX - posX, y: mmY - posY });
          setSidebarTab('inspector');
          return;
        }
      }

      if (pcb.texts && visibleLayers.silkscreen) {
        const clickedText = pcb.texts.find((t) => {
          const charCount = t.text.length || 1;
          const halfW = Math.max((t.fontSizeMm || 2.0) * 0.7 * charCount, 6) / 2;
          const halfH = Math.max((t.fontSizeMm || 2.0) * 1.2, 4) / 2;
          return Math.abs(t.xMm - mmX) <= halfW + 1 && Math.abs(t.yMm - mmY) <= halfH + 1;
        });
        if (clickedText) {
          setSelectedTextId(clickedText.id);
          setSelectedCompId(null);
          setSelectedTrackId(null);
          setSelectedPadId(null);
          setIsDraggingText(true);
          setTextDragOffset({ x: mmX - clickedText.xMm, y: mmY - clickedText.yMm });
          setSidebarTab('inspector');
          return;
        }
      }

      const clickedComp = pcb.components?.find((c) => {
        if (isVirtualSchematicSymbol(c.type)) return false;
        const spec = resolvePhysicalSpec(c.type, c.footprint);
        const halfW = (spec.courtyardMm?.width || spec.bodyDimensionsMm?.width || 12) / 2;
        const halfH = (spec.courtyardMm?.depth || spec.bodyDimensionsMm?.depth || 10) / 2;
        return Math.abs(c.x - mmX) <= Math.max(halfW, 5) && Math.abs(c.y - mmY) <= Math.max(halfH, 5);
      });
      if (clickedComp) {
        setSelectedCompId(clickedComp.componentId);
        setSelectedTrackId(null);
        setSelectedPadId(null);
        setSelectedTextId(null);
        setIsDraggingComp(true);
        setDragOffset({ x: mmX - clickedComp.x, y: mmY - clickedComp.y });
        setSidebarTab('inspector');
        return;
      }
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingComp(false);
    setIsDraggingText(false);
    setIsDraggingHole(false);
    setIsPanning(false);
  };

  const handleCanvasContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (routingStartPad) {
      setRoutingStartPad(null);
      toast.info('Cancelled track routing');
    } else if (selectedTrackId) {
      setSelectedTrackId(null);
    } else {
      setSelectedCompId(null);
      setSelectedPadId(null);
      setSelectedHoleId(null);
      setHighlightLocation(null);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || toolMode === 'pan') return;
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const { mmX, mmY } = coords;

    const clickedPad = pcb.pads.find((p) => {
      const d = Math.hypot(p.x - mmX, p.y - mmY);
      return d <= Math.max(p.diameterMm, 2.5);
    });

    if (clickedPad) {
      setSelectedPadId(clickedPad.id);
      setSelectedCompId(null);
      setSelectedTrackId(null);
      setSidebarTab('inspector');

      if (toolMode === 'route' || routingStartPad) {
        if (!routingStartPad) {
          setRoutingStartPad({ id: clickedPad.id, x: clickedPad.x, y: clickedPad.y });
        } else if (routingStartPad.id !== clickedPad.id) {
          const pts = compute45RoutePoints(routingStartPad, { x: clickedPad.x, y: clickedPad.y });
          const newTracks: PcbTrack[] = [];
          for (let i = 0; i < pts.length - 1; i++) {
            newTracks.push({
              id: `trk_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
              layer: activeLayer,
              from: pts[i],
              to: pts[i + 1],
              widthMm: traceWidth,
              netId: clickedPad.netId,
              isManual: true,
            });
          }
          if (onUpdatePcb) {
            onUpdatePcb({
              ...pcb,
              tracks: [...pcb.tracks, ...newTracks],
            });
          }
          setRoutingStartPad(null);
          toast.success(`Connected trace on ${activeLayer === 'top_copper' ? 'F.Cu' : 'B.Cu'}`);
        }
        return;
      }
    }

    if (routingStartPad) {
      const snapX = snapCoord(mmX);
      const snapY = snapCoord(mmY);
      const pts = compute45RoutePoints(routingStartPad, { x: snapX, y: snapY });
      const newTracks: PcbTrack[] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        newTracks.push({
          id: `trk_seg_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          layer: activeLayer,
          from: pts[i],
          to: pts[i + 1],
          widthMm: traceWidth,
          isManual: true,
        });
      }
      if (onUpdatePcb) {
        onUpdatePcb({
          ...pcb,
          tracks: [...pcb.tracks, ...newTracks],
        });
      }
      setRoutingStartPad({ id: `wp_${Date.now()}`, x: snapX, y: snapY });
      return;
    }

    let clickedTrack: PcbTrack | null = null;
    for (const track of pcb.tracks) {
      const dx = track.to.x - track.from.x;
      const dy = track.to.y - track.from.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) continue;
      const t = Math.max(0, Math.min(1, ((mmX - track.from.x) * dx + (mmY - track.from.y) * dy) / lenSq));
      const projX = track.from.x + t * dx;
      const projY = track.from.y + t * dy;
      const dist = Math.hypot(mmX - projX, mmY - projY);
      if (dist < Math.max(track.widthMm, 1.5)) {
        clickedTrack = track;
        break;
      }
    }

    if (clickedTrack) {
      setSelectedTrackId(clickedTrack.id);
      setSelectedPadId(null);
      setSelectedCompId(null);
      setSelectedTextId(null);
      setSidebarTab('inspector');
    } else {
      setSelectedTrackId(null);
    }
  };

  const handleUpdateSelectedTrackWidth = (w: number) => {
    if (!selectedTrackId || !onUpdatePcb) return;
    const nextTracks = pcb.tracks.map((t) => (t.id === selectedTrackId ? { ...t, widthMm: w } : t));
    onUpdatePcb({ ...pcb, tracks: nextTracks });
    toast.success(`Updated track width to ${w} mm`);
  };

  const handleUpdateSelectedPadHole = (h: number) => {
    if (!selectedPadId || !onUpdatePcb) return;
    const nextPads = pcb.pads.map((p) => (p.id === selectedPadId ? { ...p, holeMm: h } : p));
    onUpdatePcb({ ...pcb, pads: nextPads });
    toast.success(`Updated pad drill diameter to ${h} mm`);
  };

  const handleAddSilkscreenText = () => {
    if (!newTextValue.trim() || !onUpdatePcb) return;
    const newText: PcbSilkscreenText = {
      id: `txt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text: newTextValue.trim(),
      xMm: Math.round((pcb.widthMm / 2) * 10) / 10,
      yMm: Math.round((pcb.heightMm / 2) * 10) / 10,
      fontSizeMm: newTextFontSizeMm,
      layer: newTextLayer,
      rotation: 0,
    };
    const nextTexts = [...(pcb.texts || []), newText];
    onUpdatePcb({ ...pcb, texts: nextTexts });
    setSelectedTextId(newText.id);
    setSelectedCompId(null);
    setSelectedTrackId(null);
    setSelectedPadId(null);
    setIsAddingText(false);
    setSidebarTab('inspector');
    toast.success(`Added silkscreen text "${newText.text}"`);
  };

  const handleUpdateSelectedText = (updates: Partial<PcbSilkscreenText>) => {
    if (!selectedTextId || !onUpdatePcb) return;
    const nextTexts = (pcb.texts || []).map((t) =>
      t.id === selectedTextId ? { ...t, ...updates } : t
    );
    onUpdatePcb({ ...pcb, texts: nextTexts });
  };

  const handleCopyDrcReport = () => {
    if (drcViolations.length === 0) {
      navigator.clipboard?.writeText('DRC CLEAN: 0 violations detected.');
      toast.success('Copied DRC status to clipboard!');
      return;
    }
    const report = drcViolations
      .map((v) => {
        const loc = v.location ? ` at (${v.location.x.toFixed(1)}mm, ${v.location.y.toFixed(1)}mm)` : '';
        return `[${v.severity.toUpperCase()}][${v.rule.toUpperCase()}] ${v.message}${loc}`;
      })
      .join('\n');
    navigator.clipboard?.writeText(report);
    toast.success(`Copied ${drcViolations.length} DRC diagnostic item(s) to clipboard!`);
  };

  const handleCopySingleViolation = (v: DrcViolation) => {
    const loc = v.location ? ` at (${v.location.x.toFixed(1)}mm, ${v.location.y.toFixed(1)}mm)` : '';
    const text = `[${v.severity.toUpperCase()}][${v.rule.toUpperCase()}] ${v.message}${loc}`;
    navigator.clipboard?.writeText(text);
    toast.success('Copied DRC violation to clipboard!');
  };

  // Draggable Stackup Header Mouse Handlers
  const handleStackupMouseDown = (e: React.MouseEvent) => {
    setIsDraggingStackup(true);
    setStackupDragStart({
      x: e.clientX - stackupModalPos.x,
      y: e.clientY - stackupModalPos.y,
    });
  };

  useEffect(() => {
    const handleMouseMoveWindow = (e: MouseEvent) => {
      if (isDraggingStackup) {
        setStackupModalPos({
          x: Math.max(10, Math.min(window.innerWidth - 380, e.clientX - stackupDragStart.x)),
          y: Math.max(50, Math.min(window.innerHeight - 300, e.clientY - stackupDragStart.y)),
        });
      }
    };

    const handleMouseUpWindow = () => {
      setIsDraggingStackup(false);
    };

    if (isDraggingStackup) {
      window.addEventListener('mousemove', handleMouseMoveWindow);
      window.addEventListener('mouseup', handleMouseUpWindow);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMoveWindow);
      window.removeEventListener('mouseup', handleMouseUpWindow);
    };
  }, [isDraggingStackup, stackupDragStart]);

  const selectedTrack = pcb.tracks.find((t) => t.id === selectedTrackId);
  const selectedPad = pcb.pads.find((p) => p.id === selectedPadId);
  const selectedComp = pcb.components?.find((c) => c.componentId === selectedCompId);
  const selectedText = pcb.texts?.find((t) => t.id === selectedTextId);
  const selectedHole = (pcb.mountingHoles && pcb.mountingHoles.length > 0
    ? pcb.mountingHoles
    : [
        { id: 'mount_tl', xMm: 5.0, yMm: 5.0, x: 5.0, y: 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
        { id: 'mount_tr', xMm: pcb.widthMm - 5.0, yMm: 5.0, x: pcb.widthMm - 5.0, y: 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
        { id: 'mount_bl', xMm: 5.0, yMm: pcb.heightMm - 5.0, x: 5.0, y: pcb.heightMm - 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
        { id: 'mount_br', xMm: pcb.widthMm - 5.0, yMm: pcb.heightMm - 5.0, x: pcb.widthMm - 5.0, y: pcb.heightMm - 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
      ]
  ).find((h, idx) => (h.id || `m3_${idx}`) === selectedHoleId);

  const hoveredPad = hoveredPadId ? pcb.pads.find((p) => p.id === hoveredPadId) : null;
  const hoveredComp = hoveredPad ? pcb.components?.find((c) => c.componentId === hoveredPad.componentId) : null;
  const hoveredPadNet = useMemo(() => {
    if (!hoveredPad) return null;
    const connectedTrack = pcb.tracks.find(
      (t) =>
        Math.hypot(t.from.x - hoveredPad.x, t.from.y - hoveredPad.y) < 0.5 ||
        Math.hypot(t.to.x - hoveredPad.x, t.to.y - hoveredPad.y) < 0.5
    );
    if (connectedTrack?.netId) return connectedTrack.netId;
    const connectedWire = wires.find(
      (w) =>
        (w.fromCompId === hoveredPad.componentId && w.fromPinId === hoveredPad.pinId) ||
        (w.toCompId === hoveredPad.componentId && w.toPinId === hoveredPad.pinId)
    );
    if (connectedWire) return connectedWire.id;
    return 'Unrouted / Floating';
  }, [hoveredPad, pcb.tracks, wires]);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#070D18] text-slate-200 select-none overflow-hidden h-full">
      {/* ---------------------------------------------------- */}
      {/* Top KiCad / Altium-Style Professional Engineering Console */}
      {/* ---------------------------------------------------- */}
      <div className="min-h-10 py-1 bg-[#0B1528] border-b border-slate-800 flex flex-wrap items-center justify-between px-2 gap-1.5 text-xs shrink-0 select-none font-mono">
        {/* Left Section: Tools Group + Active Layer + Track Width + GND Mode + Layer Visibility */}
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {/* Brand/Label */}
          <div className="flex items-center gap-1 text-slate-300 pr-1.5 border-r border-slate-800 shrink-0">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-[11px] hidden md:inline text-cyan-200">PCB 2D</span>
          </div>

          {/* Tools Group: Undo/Redo, Select, Pan (H), Route Track (X), Place Via (V), Auto-Route */}
          <div className="flex items-center bg-slate-950/90 p-0.5 rounded-lg border border-slate-800 shrink-0 gap-0.5">
            {/* Undo / Redo */}
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className={`h-7 px-1.5 rounded font-semibold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                undoStack.length === 0
                  ? 'text-slate-600 opacity-40 cursor-not-allowed pointer-events-none'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
              title="Undo 2D Edit [Shortcut: Ctrl+Z]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className={`h-7 px-1.5 rounded font-semibold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                redoStack.length === 0
                  ? 'text-slate-600 opacity-40 cursor-not-allowed pointer-events-none'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
              title="Redo 2D Edit [Shortcut: Ctrl+Y / Ctrl+Shift+Z]"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setToolMode('select');
                setRoutingStartPad(null);
              }}
              className={`h-7 px-2 rounded font-semibold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                toolMode === 'select'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
              title="Select & Move Objects [Shortcut: S / Esc]"
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Select</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setToolMode((m) => (m === 'pan' ? 'select' : 'pan'));
                setRoutingStartPad(null);
              }}
              className={`h-7 px-2 rounded font-semibold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                toolMode === 'pan'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
              title="Pan Tool [Shortcut: H] — Left-drag to pan canvas smoothly"
            >
              <Hand className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Pan (H)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setToolMode('route');
                setRoutingStartPad(null);
              }}
              className={`h-7 px-2 rounded font-semibold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                toolMode === 'route' || routingStartPad
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
              title="Interactive 45° Manual Copper Routing [Shortcut: X / R]"
            >
              <Route className="w-3.5 h-3.5" />
              <span>{routingStartPad ? 'Routing...' : 'Route (X)'}</span>
            </button>

            <button
              type="button"
              onClick={handleInsertPlatedVia}
              className="h-7 px-2 rounded font-semibold text-[11px] text-amber-300 hover:text-amber-200 hover:bg-amber-950/60 transition-all cursor-pointer flex items-center gap-1"
              title="Place Plated Through-Hole Via [Shortcut: V]"
            >
              <Disc className="w-3 h-3 text-amber-400" />
              <span className="hidden md:inline">+Via (V)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddingText(true)}
              className={`h-7 px-2 rounded font-semibold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                isAddingText || selectedTextId
                  ? 'bg-cyan-900 border border-cyan-500 text-cyan-200'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
              title="Place Silkscreen Text [Shortcut: T]"
            >
              <Type className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Text (T)</span>
            </button>

            <button
              type="button"
              onClick={handleAddMountingHole}
              className="h-7 px-2 rounded font-semibold text-[11px] text-purple-300 hover:text-purple-200 hover:bg-purple-950/60 transition-all cursor-pointer flex items-center gap-1"
              title="Place M3 Mounting Hole (3.2mm drill, 6.0mm annular pad)"
            >
              <CircleDot className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden md:inline">+Hole</span>
            </button>

            <button
              type="button"
              onClick={handleAutoRoute}
              className="h-7 px-2 rounded font-semibold text-[11px] text-cyan-300 hover:text-white hover:bg-cyan-950/60 transition-all cursor-pointer flex items-center gap-1"
              title="Auto-Route all unrouted nets with 45° mitered tracks"
            >
              <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden xl:inline">Auto-Route</span>
            </button>

            <button
              type="button"
              onClick={handleAutoPlace}
              className="h-7 px-2 rounded font-semibold text-[11px] text-amber-300 hover:text-white hover:bg-amber-950/60 transition-all cursor-pointer flex items-center gap-1"
              title="Courtyard-Aware Zero-Overlap Auto-Placement & Dynamic Board Auto-Sizing"
            >
              <Crosshair className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline">Auto-Place</span>
            </button>
          </div>

          {/* Active Layer Pill: [● F.Cu] and [● B.Cu] */}
          <div className="flex items-center bg-slate-950/90 p-0.5 rounded-lg border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setActiveLayer('top_copper')}
              className={`h-7 px-2 rounded font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1.5 ${
                activeLayer === 'top_copper'
                  ? 'bg-red-950 border border-red-500 text-red-200'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Top Copper Routing Layer (F.Cu - KiCad Red)"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
              <span>F.Cu</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveLayer('bottom_copper')}
              className={`h-7 px-2 rounded font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1.5 ${
                activeLayer === 'bottom_copper'
                  ? 'bg-blue-950 border border-blue-500 text-blue-200'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Bottom Copper Routing Layer (B.Cu - KiCad Blue)"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
              <span>B.Cu</span>
            </button>
          </div>

          {/* Track Width Selector */}
          <div className="hidden sm:flex items-center gap-1 pl-1 border-l border-slate-800 shrink-0">
            <span className="text-slate-500 text-[10px] hidden md:inline">Track:</span>
            <select
              value={traceWidth}
              onChange={(e) => {
                const w = parseFloat(e.target.value);
                setTraceWidth(w);
                if (selectedTrackId) handleUpdateSelectedTrackWidth(w);
              }}
              className="bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-emerald-400 font-mono text-[11px] cursor-pointer"
              title="Active trace routing width"
            >
              <option value={0.25}>0.25mm (Signal)</option>
              <option value={0.35}>0.35mm (Standard)</option>
              <option value={0.55}>0.55mm (Power/GND)</option>
              <option value={0.80}>0.80mm (Heavy)</option>
              <option value={1.00}>1.00mm (Power Bus)</option>
            </select>
          </div>

          {/* GND Plane Mode Selector */}
          <div className="hidden md:flex items-center gap-1 pl-1 border-l border-slate-800 shrink-0">
            <span className="text-slate-500 text-[10px] hidden lg:inline">GND:</span>
            <select
              value={gndPourLayer}
              onChange={(e) => {
                const val = e.target.value as 'bottom_copper' | 'top_copper' | 'off';
                setGndPourLayer(val);
                setVisibleLayers((l) => ({ ...l, copperPour: val !== 'off' }));
              }}
              className="bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-blue-400 font-mono text-[11px] cursor-pointer"
              title="Ground Plane Mode (B.Cu Pour standard, F.Cu Pour, or Tracks Only with pour hidden)"
            >
              <option value="bottom_copper">B.Cu Pour</option>
              <option value="top_copper">F.Cu Pour</option>
              <option value="off">Tracks Only</option>
            </select>
          </div>

          {/* Layer Visibility Compact Strip */}
          <div className="hidden xl:flex items-center gap-1.5 pl-1.5 border-l border-slate-800 text-[10px] text-slate-400 shrink-0">
            <label className="flex items-center gap-1 cursor-pointer select-none text-red-400">
              <input
                type="checkbox"
                checked={visibleLayers.topCopper}
                onChange={(e) => setVisibleLayers({ ...visibleLayers, topCopper: e.target.checked })}
                className="w-3 h-3 accent-red-500"
              />
              <span>F.Cu</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer select-none text-blue-400">
              <input
                type="checkbox"
                checked={visibleLayers.bottomCopper}
                onChange={(e) => setVisibleLayers({ ...visibleLayers, bottomCopper: e.target.checked })}
                className="w-3 h-3 accent-blue-500"
              />
              <span>B.Cu</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer select-none text-emerald-400">
              <input
                type="checkbox"
                checked={visibleLayers.copperPour}
                onChange={(e) => {
                  const c = e.target.checked;
                  setVisibleLayers({ ...visibleLayers, copperPour: c });
                  if (!c) setGndPourLayer('off');
                  else if (gndPourLayer === 'off') setGndPourLayer('bottom_copper');
                }}
                className="w-3 h-3 accent-emerald-500"
              />
              <span>GND</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer select-none text-slate-300">
              <input
                type="checkbox"
                checked={visibleLayers.silkscreen}
                onChange={(e) => setVisibleLayers({ ...visibleLayers, silkscreen: e.target.checked })}
                className="w-3 h-3 accent-slate-300"
              />
              <span>Silk</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer select-none text-amber-400">
              <input
                type="checkbox"
                checked={visibleLayers.drillHoles}
                onChange={(e) => setVisibleLayers({ ...visibleLayers, drillHoles: e.target.checked })}
                className="w-3 h-3 accent-amber-500"
              />
              <span>Pads</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer select-none text-yellow-400">
              <input
                type="checkbox"
                checked={visibleLayers.ratsnest}
                onChange={(e) => setVisibleLayers({ ...visibleLayers, ratsnest: e.target.checked })}
                className="w-3 h-3 accent-yellow-500"
              />
              <span>Airwires</span>
            </label>
          </div>
        </div>

        {/* Right Section: Viewport, Stackup & Manufacturing */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0 ml-auto">
          {/* Zoom & View Reset */}
          <div className="flex items-center bg-slate-950/80 rounded border border-slate-800 p-0.5">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.15))}
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(3.0, z + 0.15))}
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoomLevel(1.0);
                setPanOffset({ x: 0, y: 0 });
              }}
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded"
              title="Reset View / Fit (100%)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1.5 text-cyan-400 border-l border-slate-800">
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>

          {/* Rotate Selected Footprint */}
          {selectedCompId && (
            <button
              type="button"
              onClick={handleRotateSelectedComponent}
              className="px-2 py-1 bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-600 rounded flex items-center gap-1 font-mono text-[11px] transition-colors"
              title="Rotate Selected Component 90° [Shortcut: R]"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Rotate</span>
            </button>
          )}

          {/* Delete Track */}
          {selectedTrackId && (
            <button
              type="button"
              onClick={() => {
                if (onUpdatePcb) {
                  onUpdatePcb({ ...pcb, tracks: pcb.tracks.filter((t) => t.id !== selectedTrackId) });
                  setSelectedTrackId(null);
                  toast.success('Deleted track');
                }
              }}
              className="px-2 py-1 bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700 rounded flex items-center gap-1 font-mono text-[11px]"
              title="Delete Selected Track [Shortcut: Delete]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}

          {/* Draggable Stackup Toggle */}
          <button
            type="button"
            onClick={() => setIsStackupModalOpen((prev) => !prev)}
            className={`h-7 px-2 rounded font-bold text-[11px] flex items-center gap-1 transition-all ${
              isStackupModalOpen
                ? 'bg-cyan-950 border border-cyan-500 text-cyan-300'
                : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
            title="Layer Stackup & Impedance Manager"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Stackup</span>
          </button>

          {/* Clear Traces */}
          <button
            type="button"
            onClick={handleClearAllTraces}
            className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-800 transition-colors"
            title="Clear All Tracks to Route Fresh"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Export Manufacturing Files ▾ Dropdown Menu */}
          <div className="relative">
            <button
              ref={exportBtnRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const rect = exportBtnRef.current?.getBoundingClientRect();
                if (rect) {
                  setExportMenuPos({
                    top: rect.bottom + 6,
                    right: Math.max(8, (typeof window !== 'undefined' ? window.innerWidth : 1000) - rect.right),
                  });
                }
                setIsExportMenuOpen((prev) => !prev);
              }}
              className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold text-[11px] flex items-center gap-1 shadow cursor-pointer"
              title="Export complete manufacturing files (Gerbers, Drill, BOM, CPL, SVG)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>

            {isExportMenuOpen && (
              <div
                ref={exportMenuRef}
                style={{ top: exportMenuPos.top, right: exportMenuPos.right }}
                className="fixed w-64 bg-[#0B1528] border border-slate-700/80 rounded-xl shadow-2xl py-1.5 z-[9999] font-mono text-xs animate-in fade-in zoom-in-95 duration-100"
              >
                <button
                  type="button"
                  onClick={handleDownloadGerberZip}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 text-emerald-400 font-bold transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <div>
                    <div>Production Gerber (.zip)</div>
                    <div className="text-[10px] text-slate-400 font-normal">JLCPCB / PCBWay RS-274X + DRL</div>
                  </div>
                </button>
                <div className="h-px bg-slate-800 my-1" />
                <button
                  type="button"
                  onClick={handleDownloadBomCsv}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-300 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bill of Materials (BOM .csv)</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPickAndPlaceCsv}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-300 transition-colors cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Pick &amp; Place Centroid (CPL .csv)</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadBlueprintSvg}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-300 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-purple-400" />
                  <span>2D Print Blueprint (.svg)</span>
                </button>
                <div className="h-px bg-slate-800 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    if (onExportProject) {
                      onExportProject('pdf');
                    } else if (canvasRef.current) {
                      exportCanvasAsPdf(canvasRef.current, `${projectTitle}_pcb2d.pdf`, {
                        title: projectTitle,
                        viewLabel: 'PCB 2D Layout & Fabrication Blueprint',
                      }, '#042F2E');
                    }
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-300 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-rose-400" />
                  <span>Production PDF (.pdf)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    if (onExportProject) {
                      onExportProject('png');
                    } else if (canvasRef.current) {
                      exportCanvasAsPng(canvasRef.current, `${projectTitle}_pcb2d.png`);
                    }
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-300 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>2D Board Image (.png)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    if (onExportProject) {
                      onExportProject('jpg');
                    } else if (canvasRef.current) {
                      exportCanvasAsJpg(canvasRef.current, `${projectTitle}_pcb2d.jpg`, '#042F2E');
                    }
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-300 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>2D Board Image (.jpg)</span>
                </button>
                <div className="h-px bg-slate-800 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    if (onExportProject) {
                      onExportProject('eihouse');
                    }
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-emerald-400 transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Local File (.eihouse.json)</span>
                </button>
                {onTriggerImport && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      onTriggerImport();
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-cyan-400 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import Local Project...</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* Main Canvas & Right Inspector */}
      {/* ---------------------------------------------------- */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Canvas Area */}
        <div className="flex-1 min-h-0 min-w-0 relative flex items-center justify-center p-2 bg-[#050D1A] overflow-hidden">
          {/* Add Silkscreen Text Dialog Popover */}
          {isAddingText && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 bg-[#0B1528]/95 backdrop-blur-md border border-cyan-500/70 rounded-xl p-4 shadow-2xl font-mono text-xs min-w-[280px] max-w-[340px] space-y-3 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between pb-1 border-b border-slate-700">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Type className="w-4 h-4 text-cyan-400" />
                  Place Silkscreen Text
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingText(false)}
                  className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase">Text String</label>
                <input
                  type="text"
                  value={newTextValue}
                  onChange={(e) => setNewTextValue(e.target.value)}
                  placeholder="e.g. REV 1.0 or EI HOUSE"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-hidden"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddSilkscreenText();
                    if (e.key === 'Escape') setIsAddingText(false);
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Font Size (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1.0"
                    max="10.0"
                    value={newTextFontSizeMm}
                    onChange={(e) => setNewTextFontSizeMm(Math.max(1, parseFloat(e.target.value) || 2.0))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-emerald-400 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Layer</label>
                  <select
                    value={newTextLayer}
                    onChange={(e) => setNewTextLayer(e.target.value as 'F.SilkS' | 'B.SilkS')}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-mono text-xs cursor-pointer"
                  >
                    <option value="F.SilkS">F.SilkS (Top)</option>
                    <option value="B.SilkS">B.SilkS (Bottom)</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAddSilkscreenText}
                  className="flex-1 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded flex items-center justify-center gap-1 cursor-pointer shadow transition-colors"
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>Place on Board</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingText(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Routing Guide Banner */}
          {routingStartPad && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-slate-950/90 border border-emerald-500/80 text-emerald-300 font-mono text-[11px] px-3.5 py-1.5 rounded-full shadow-2xl backdrop-blur flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>
                Routing on {activeLayer === 'top_copper' ? 'F.Cu (Top Red)' : 'B.Cu (Bottom Blue)'}: Click destination pad to connect | Press [V] for Via | Right-click to cancel
              </span>
            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* Draggable Floating Stackup & Layer-Signal Manager */}
          {/* ---------------------------------------------------- */}
          {isStackupModalOpen && (
            <div
              style={{
                left: `${stackupModalPos.x}px`,
                top: `${stackupModalPos.y}px`,
              }}
              className="absolute z-40 w-80 bg-[#0B1528]/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl font-mono text-xs flex flex-col pointer-events-auto select-none"
            >
              {/* Draggable Title Bar */}
              <div
                onMouseDown={handleStackupMouseDown}
                className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 rounded-t-xl cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-[11px]">
                  <GripHorizontal className="w-4 h-4 text-slate-500" />
                  <span>Layer Stackup &amp; Signal Manager</span>
                </div>
                <button
                  onClick={() => setIsStackupModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-3 space-y-3 max-h-[420px] overflow-y-auto">
                {/* Active Layer Quick Selector */}
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Active Routing Layer</div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => {
                        setActiveLayer('top_copper');
                        toast.info('Switched active layer to L1: F.Cu (Top Copper)');
                      }}
                      className={`px-2.5 py-1.5 rounded flex items-center justify-between font-bold text-[11px] transition-all cursor-pointer ${
                        activeLayer === 'top_copper'
                          ? 'bg-red-950 border border-red-500 text-red-200'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>L1: F.Cu (Top Copper)</span>
                      <span className="text-[10px] font-normal">35 µm / 1 oz</span>
                    </button>

                    {copperLayers >= 4 && (
                      <>
                        <div className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-800/60 rounded text-emerald-300 flex items-center justify-between text-[10px]">
                          <span>In1.Cu (Internal GND Plane)</span>
                          <span>35 µm</span>
                        </div>
                        <div className="px-2.5 py-1 bg-amber-950/60 border border-amber-800/60 rounded text-amber-300 flex items-center justify-between text-[10px]">
                          <span>In2.Cu (Internal PWR Plane)</span>
                          <span>35 µm</span>
                        </div>
                      </>
                    )}

                    <button
                      onClick={() => {
                        setActiveLayer('bottom_copper');
                        toast.info('Switched active layer to L2: B.Cu (Bottom Copper)');
                      }}
                      className={`px-2.5 py-1.5 rounded flex items-center justify-between font-bold text-[11px] transition-all cursor-pointer ${
                        activeLayer === 'bottom_copper'
                          ? 'bg-blue-950 border border-blue-500 text-blue-200'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>L{copperLayers}: B.Cu (Bottom Copper)</span>
                      <span className="text-[10px] font-normal">35 µm / 1 oz</span>
                    </button>
                  </div>
                </div>

                {/* Layer Count */}
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Stackup Count</div>
                  <div className="grid grid-cols-4 gap-1">
                    {[2, 4, 6, 8].map((l) => (
                      <button
                        key={l}
                        onClick={() => {
                          setCopperLayers(l as 2 | 4 | 6 | 8);
                          if (onUpdatePcb) onUpdatePcb({ ...pcb, copperLayers: l as 2 | 4 | 6 | 8 });
                        }}
                        className={`py-1 rounded font-bold text-[10px] transition-colors ${
                          copperLayers === l
                            ? 'bg-cyan-950 border border-cyan-500 text-cyan-300'
                            : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {l}L
                      </button>
                    ))}
                  </div>
                </div>

                {/* Substrate Thickness & Copper Weight */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <label className="text-slate-400 uppercase font-bold block mb-1">Thickness</label>
                    <select
                      value={boardThicknessMm}
                      onChange={(e) => {
                        const th = parseFloat(e.target.value);
                        setBoardThicknessMm(th);
                        if (onUpdatePcb) onUpdatePcb({ ...pcb, boardThicknessMm: th });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200"
                    >
                      <option value={0.8}>0.8 mm</option>
                      <option value={1.0}>1.0 mm</option>
                      <option value={1.6}>1.6 mm</option>
                      <option value={2.0}>2.0 mm</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 uppercase font-bold block mb-1">Copper Weight</label>
                    <select
                      value={copperWeightOz}
                      onChange={(e) => setCopperWeightOz(parseInt(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-200"
                    >
                      <option value={1}>1 oz (35 µm)</option>
                      <option value={2}>2 oz (70 µm)</option>
                    </select>
                  </div>
                </div>

                {/* Signal / Net Layer Assignment Section */}
                <div className="space-y-1 pt-1 border-t border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Signal &amp; Power Net Routing Rules</div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] p-1.5 rounded bg-slate-950 border border-slate-800/80">
                      <span className="text-red-400 font-bold">VCC / Power</span>
                      <select
                        value={netAssignments.VCC || 'top_copper'}
                        onChange={(e) => setNetAssignments({ ...netAssignments, VCC: e.target.value })}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-300"
                      >
                        <option value="top_copper">L1: F.Cu (Top)</option>
                        <option value="bottom_copper">L2: B.Cu (Bot)</option>
                        <option value="auto">Auto Router</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between text-[11px] p-1.5 rounded bg-slate-950 border border-slate-800/80">
                      <span className="text-blue-400 font-bold">GND / Ground</span>
                      <select
                        value={netAssignments.GND || 'bottom_copper'}
                        onChange={(e) => setNetAssignments({ ...netAssignments, GND: e.target.value })}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-300"
                      >
                        <option value="bottom_copper">L2: B.Cu (GND Plane)</option>
                        <option value="top_copper">L1: F.Cu (Top)</option>
                        <option value="auto">Auto Router</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between text-[11px] p-1.5 rounded bg-slate-950 border border-slate-800/80">
                      <span className="text-emerald-400 font-bold">Digital / Analog Signals</span>
                      <select
                        value={netAssignments.SIGNALS || 'auto'}
                        onChange={(e) => setNetAssignments({ ...netAssignments, SIGNALS: e.target.value })}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-300"
                      >
                        <option value="auto">Auto / Both Layers</option>
                        <option value="top_copper">F.Cu Only</option>
                        <option value="bottom_copper">B.Cu Only</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2D EDA Canvas */}
          <canvas
            id="pcb-2d-canvas"
            ref={canvasRef}
            width={850}
            height={560}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onClick={handleCanvasClick}
            onContextMenu={handleCanvasContextMenu}
            style={{
              cursor:
                isPanning
                  ? 'grabbing'
                  : toolMode === 'pan'
                  ? 'grab'
                  : toolMode === 'route' || routingStartPad
                  ? 'crosshair'
                  : isDraggingComp
                  ? 'grabbing'
                  : selectedCompId
                  ? 'grab'
                  : 'default',
            }}
            className="touch-none max-w-full max-h-full rounded-xl border border-slate-800 shadow-2xl"
          />

          {/* Interactive Hover HUD Tooltip for Pads / Vias */}
          {hoveredPad && mouseCoord?.clientX && mouseCoord?.clientY && (
            <div
              className="pointer-events-none fixed z-50 bg-[#0B1528]/95 backdrop-blur-md border border-cyan-500/70 rounded-xl p-3 shadow-2xl font-mono text-xs min-w-[220px] animate-in fade-in duration-100"
              style={{
                left: Math.min(window.innerWidth - 240, mouseCoord.clientX + 16),
                top: Math.min(window.innerHeight - 190, mouseCoord.clientY + 16),
              }}
            >
              <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-700/80">
                <span className="font-bold text-cyan-400">
                  {hoveredPad.componentId === 'VIA' ? 'Through-Hole Via' : `${hoveredComp?.designator || hoveredPad.componentId}`}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-600/70 text-amber-300 font-bold">
                  {hoveredPad.layer === 'all'
                    ? 'Through-Hole'
                    : hoveredPad.layer === 'top'
                    ? 'F.Cu (Top)'
                    : 'B.Cu (Bot)'}
                </span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-300">
                {hoveredPad.componentId !== 'VIA' && (
                  <div className="flex justify-between text-slate-400">
                    <span>Pin / Name:</span>
                    <span className="text-white font-semibold">
                      Pin {hoveredPad.pinId}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Net:</span>
                  <span className="text-emerald-400 font-bold">{hoveredPadNet}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Coordinates:</span>
                  <span className="text-slate-200">
                    X: {hoveredPad.x.toFixed(2)} mm, Y: {hoveredPad.y.toFixed(2)} mm
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Pad / Drill:</span>
                  <span className="text-cyan-300">
                    Ø {hoveredPad.diameterMm} mm / Ø {hoveredPad.holeMm} mm
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------- */}
        {/* Right Sidebar: DRC & Stackup Inspector */}
        {/* ---------------------------------------------------- */}
        <div className="w-full lg:w-72 shrink-0 bg-slate-900 border-l border-slate-800 flex flex-col font-mono text-xs overflow-y-auto">
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-800 bg-slate-950 text-[11px]">
            <button
              onClick={() => setSidebarTab('drc')}
              className={`flex-1 py-2 text-center font-bold flex items-center justify-center gap-1.5 transition-colors ${
                sidebarTab === 'drc'
                  ? 'text-cyan-400 border-b-2 border-cyan-500 bg-slate-900/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>DRC ({drcViolations.length})</span>
            </button>
            <button
              onClick={() => setSidebarTab('stackup')}
              className={`flex-1 py-2 text-center font-bold flex items-center justify-center gap-1.5 transition-colors ${
                sidebarTab === 'stackup'
                  ? 'text-cyan-400 border-b-2 border-cyan-500 bg-slate-900/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Stackup</span>
            </button>
            <button
              onClick={() => setSidebarTab('inspector')}
              className={`flex-1 py-2 text-center font-bold flex items-center justify-center gap-1.5 transition-colors ${
                sidebarTab === 'inspector'
                  ? 'text-cyan-400 border-b-2 border-cyan-500 bg-slate-900/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Inspect</span>
            </button>
          </div>

          {/* TAB 1: Real-Time DRC */}
          {sidebarTab === 'drc' && (
            <div className="flex-1 p-3 flex flex-col overflow-y-auto space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-slate-100 text-[11px] uppercase">
                  Manufacturing DRC
                </span>
                {drcViolations.length === 0 ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                    <CheckCircle className="w-3.5 h-3.5" />
                    PASS
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold flex items-center gap-1 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {drcViolations.length} Warning(s)
                  </span>
                )}
              </div>

              {/* Standard Rules Specs */}
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1 text-[11px]">
                <div className="text-[10px] text-slate-400 uppercase font-bold">IPC-2221 Class 2 Fab Rules</div>
                <div className="flex justify-between text-slate-300">
                  <span>Min Track Width:</span>
                  <span className="text-emerald-400 font-bold">0.15 mm (6 mil)</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Min Clearance:</span>
                  <span className="text-emerald-400 font-bold">0.20 mm (8 mil)</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Board Edge Clearance:</span>
                  <span className="text-emerald-400 font-bold">1.00 mm</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Min Drill Hole:</span>
                  <span className="text-emerald-400 font-bold">0.30 mm</span>
                </div>
              </div>

              {/* DRC Violation Items */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    {drcViolations.length} Issue(s)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyDrcReport}
                    className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 text-cyan-300 rounded text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
                    title="Copy DRC diagnostic report in standard AI troubleshooting format"
                  >
                    <Copy className="w-3 h-3 text-cyan-400" />
                    <span>Copy All (AI Format)</span>
                  </button>
                </div>

                {drcViolations.length === 0 ? (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded text-emerald-400 text-[11px] space-y-1">
                    <p className="font-bold">✓ Zero DRC Violations Found</p>
                    <p className="text-[10px] text-emerald-500">
                      Layout satisfies board outline, minimum track widths, annular rings, and isolation clearances.
                    </p>
                  </div>
                ) : (
                  drcViolations.map((v, vIdx) => (
                    <div
                      key={`${v.id}_${vIdx}`}
                      className="p-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/60 rounded text-[11px] transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-bold uppercase text-[9px] px-1 py-0.5 rounded ${
                            v.severity === 'error'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {v.rule.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {v.location && (
                            <button
                              type="button"
                              onClick={() => {
                                setHighlightLocation(v.location!);
                                toast.info(`Focused on ${v.rule}`);
                              }}
                              className="text-[9px] text-cyan-400 hover:text-cyan-200 flex items-center gap-0.5 cursor-pointer"
                              title="Focus view on coordinates"
                            >
                              <Crosshair className="w-2.5 h-2.5" />
                              {v.location.x.toFixed(1)}, {v.location.y.toFixed(1)}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopySingleViolation(v);
                            }}
                            className="p-0.5 text-slate-400 hover:text-cyan-300 rounded hover:bg-slate-800 cursor-pointer"
                            title="Copy this DRC issue"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-300 text-[10px] font-mono select-text cursor-text leading-relaxed">
                        {v.message}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Fix Clearances Auto-Button */}
              {drcViolations.length > 0 && (
                <button
                  onClick={handleFixDrcClearances}
                  className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded text-[11px] flex items-center justify-center gap-1.5 shadow"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Fix All Clearances</span>
                </button>
              )}
            </div>
          )}

          {/* TAB 2: Stackup & Fab Specs */}
          {sidebarTab === 'stackup' && (
            <div className="flex-1 p-3 overflow-y-auto space-y-3 text-[11px]">
              <div className="font-bold text-slate-100 text-[11px] uppercase pb-2 border-b border-slate-800">
                Layer Stack &amp; Substrate Specs
              </div>

              {/* Board Size Inputs */}
              <div className="space-y-1">
                <label className="text-slate-400 uppercase text-[10px] font-bold">Board Dimensions (mm)</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center bg-slate-950 border border-slate-800 rounded px-2 py-1">
                    <span className="text-slate-500 mr-1">W:</span>
                    <input
                      type="number"
                      value={boardWidth}
                      onChange={(e) => {
                        const w = Math.max(20, Math.min(300, Number(e.target.value)));
                        setBoardWidth(w);
                        if (onUpdateDimensions) onUpdateDimensions(w, boardHeight);
                        if (onUpdatePcb) {
                          const updatedHoles: PcbMountingHole[] = (pcb.mountingHoles && pcb.mountingHoles.length > 0
                            ? pcb.mountingHoles
                            : [
                                { id: 'mount_tl', xMm: 5.0, yMm: 5.0, x: 5.0, y: 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
                                { id: 'mount_tr', xMm: pcb.widthMm - 5.0, yMm: 5.0, x: pcb.widthMm - 5.0, y: 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
                                { id: 'mount_bl', xMm: 5.0, yMm: pcb.heightMm - 5.0, x: 5.0, y: pcb.heightMm - 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
                                { id: 'mount_br', xMm: pcb.widthMm - 5.0, yMm: pcb.heightMm - 5.0, x: pcb.widthMm - 5.0, y: pcb.heightMm - 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
                              ]
                          ).map((h) => {
                            if (!h.isCustomMoved && (h.id === 'mount_tr' || h.id === 'mount_br' || h.id === 'm3_tr' || h.id === 'm3_br' || Math.abs(h.x - (pcb.widthMm - 5.0)) < 1.5)) {
                              return { ...h, x: w - 5.0, xMm: w - 5.0 };
                            }
                            return h;
                          });
                          onUpdatePcb({ ...pcb, widthMm: w, mountingHoles: updatedHoles });
                        }
                      }}
                      className="w-full bg-transparent text-emerald-400 text-center focus:outline-hidden"
                    />
                  </div>
                  <span className="text-slate-500">×</span>
                  <div className="flex-1 flex items-center bg-slate-950 border border-slate-800 rounded px-2 py-1">
                    <span className="text-slate-500 mr-1">H:</span>
                    <input
                      type="number"
                      value={boardHeight}
                      onChange={(e) => {
                        const h = Math.max(20, Math.min(300, Number(e.target.value)));
                        setBoardHeight(h);
                        if (onUpdateDimensions) onUpdateDimensions(boardWidth, h);
                        if (onUpdatePcb) {
                          const updatedHoles: PcbMountingHole[] = (pcb.mountingHoles && pcb.mountingHoles.length > 0
                            ? pcb.mountingHoles
                            : [
                                { id: 'mount_tl', xMm: 5.0, yMm: 5.0, x: 5.0, y: 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
                                { id: 'mount_tr', xMm: pcb.widthMm - 5.0, yMm: 5.0, x: pcb.widthMm - 5.0, y: 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
                                { id: 'mount_bl', xMm: 5.0, yMm: pcb.heightMm - 5.0, x: 5.0, y: pcb.heightMm - 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
                                { id: 'mount_br', xMm: pcb.widthMm - 5.0, yMm: pcb.heightMm - 5.0, x: pcb.widthMm - 5.0, y: pcb.heightMm - 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
                              ]
                          ).map((hole) => {
                            if (!hole.isCustomMoved && (hole.id === 'mount_bl' || hole.id === 'mount_br' || hole.id === 'm3_bl' || hole.id === 'm3_br' || Math.abs(hole.y - (pcb.heightMm - 5.0)) < 1.5)) {
                              return { ...hole, y: h - 5.0, yMm: h - 5.0 };
                            }
                            return hole;
                          });
                          onUpdatePcb({ ...pcb, heightMm: h, mountingHoles: updatedHoles });
                        }
                      }}
                      className="w-full bg-transparent text-emerald-400 text-center focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Layer Count */}
              <div className="space-y-1">
                <label className="text-slate-400 uppercase text-[10px] font-bold">Copper Layers</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[2, 4, 6, 8].map((l) => (
                    <button
                      key={l}
                      onClick={() => {
                        setCopperLayers(l as 2 | 4 | 6 | 8);
                        if (onUpdatePcb) onUpdatePcb({ ...pcb, copperLayers: l as 2 | 4 | 6 | 8 });
                      }}
                      className={`py-1 rounded font-bold transition-colors ${
                        copperLayers === l
                          ? 'bg-cyan-950 border border-cyan-500 text-cyan-300'
                          : 'bg-slate-950 border border-slate-800 text-slate-400'
                      }`}
                    >
                      {l}L
                    </button>
                  ))}
                </div>
              </div>

              {/* Thickness */}
              <div className="space-y-1">
                <label className="text-slate-400 uppercase text-[10px] font-bold">Board Thickness</label>
                <select
                  value={boardThicknessMm}
                  onChange={(e) => {
                    const th = parseFloat(e.target.value);
                    setBoardThicknessMm(th);
                    if (onUpdatePcb) onUpdatePcb({ ...pcb, boardThicknessMm: th });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200"
                >
                  <option value={0.8}>0.8 mm (Ultra Thin)</option>
                  <option value={1.0}>1.0 mm (Thin FR-4)</option>
                  <option value={1.6}>1.6 mm (Standard IPC-2221)</option>
                  <option value={2.0}>2.0 mm (Heavy Duty)</option>
                </select>
              </div>

              {/* Copper Weight */}
              <div className="space-y-1">
                <label className="text-slate-400 uppercase text-[10px] font-bold">Copper Weight</label>
                <select
                  value={copperWeightOz}
                  onChange={(e) => setCopperWeightOz(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200"
                >
                  <option value={1}>1 oz (35 µm standard signal)</option>
                  <option value={2}>2 oz (70 µm power copper)</option>
                </select>
              </div>

              {/* Layer Stackup Miniature Diagram */}
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded space-y-1 mt-2">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Cross-Section Profile</div>
                <div className="flex justify-between text-red-400 font-bold">
                  <span>L1: F.Cu (Top Copper)</span>
                  <span>35 µm</span>
                </div>
                <div className="h-3 bg-emerald-950 border border-emerald-800/80 rounded flex items-center justify-center text-[8px] text-emerald-300">
                  FR-4 Core ({boardThicknessMm - (copperLayers === 2 ? 0.07 : 0.14)} mm)
                </div>
                <div className="flex justify-between text-blue-400 font-bold">
                  <span>L{copperLayers}: B.Cu (Bottom Copper)</span>
                  <span>35 µm</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Selected Object Inspector */}
          {sidebarTab === 'inspector' && (
            <div className="flex-1 p-3 overflow-y-auto space-y-3 text-[11px]">
              <div className="font-bold text-slate-100 text-[11px] uppercase pb-2 border-b border-slate-800">
                Selected Element Inspector
              </div>

              {/* Silkscreen Text Selected */}
              {selectedText && (
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 flex items-center gap-1">
                      <Type className="w-3.5 h-3.5 text-cyan-400" />
                      Silkscreen Text
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{selectedText.id}</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[10px]">Text String:</label>
                    <input
                      type="text"
                      value={selectedText.text}
                      onChange={(e) => handleUpdateSelectedText({ text: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-hidden"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[10px]">Font Size (mm):</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1.0"
                      max="12.0"
                      value={selectedText.fontSizeMm}
                      onChange={(e) => handleUpdateSelectedText({ fontSizeMm: Math.max(1, parseFloat(e.target.value) || 2.0) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-emerald-400 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[10px]">Layer:</label>
                    <select
                      value={selectedText.layer}
                      onChange={(e) => handleUpdateSelectedText({ layer: e.target.value as 'F.SilkS' | 'B.SilkS' })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-mono text-xs cursor-pointer"
                    >
                      <option value="F.SilkS">F.SilkS (Top Silkscreen)</option>
                      <option value="B.SilkS">B.SilkS (Bottom Silkscreen)</option>
                    </select>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Position:</span>
                    <span className="font-mono text-cyan-400">
                      ({selectedText.xMm.toFixed(1)}, {selectedText.yMm.toFixed(1)}) mm
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Rotation:</span>
                    <span className="font-mono text-cyan-400">{selectedText.rotation || 0}°</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleRotateSelectedText}
                      className="flex-1 py-1 bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 rounded font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Rotate 90° [R]</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSelectedText}
                      className="flex-1 py-1 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 rounded font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Track Selected */}
              {selectedTrack && (
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400">Copper Track</span>
                    <span className="text-[10px] text-slate-500 font-mono">{selectedTrack.id}</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[10px]">Track Width (mm):</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.05"
                        min="0.15"
                        max="3.0"
                        value={selectedTrack.widthMm}
                        onChange={(e) => handleUpdateSelectedTrackWidth(parseFloat(e.target.value) || 0.35)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-emerald-400 font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Layer:</span>
                    <span className={selectedTrack.layer === 'top_copper' ? 'text-red-400 font-bold' : 'text-blue-400 font-bold'}>
                      {selectedTrack.layer === 'top_copper' ? 'F.Cu (Top)' : 'B.Cu (Bottom)'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Length:</span>
                    <span className="text-cyan-400">
                      {Math.hypot(selectedTrack.to.x - selectedTrack.from.x, selectedTrack.to.y - selectedTrack.from.y).toFixed(2)} mm
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (onUpdatePcb) {
                        onUpdatePcb({ ...pcb, tracks: pcb.tracks.filter((t) => t.id !== selectedTrack.id) });
                        setSelectedTrackId(null);
                        toast.success('Deleted track');
                      }
                    }}
                    className="w-full py-1 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 rounded font-bold flex items-center justify-center gap-1 mt-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Track</span>
                  </button>
                </div>
              )}

              {/* Pad / Via Selected */}
              {selectedPad && (
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-400 flex items-center gap-1">
                      <Disc className="w-3.5 h-3.5" />
                      {selectedPad.componentId === 'VIA' ? 'Through-Hole Via' : `Pad ${selectedPad.pinId}`}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{selectedPad.componentId}</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[10px]">Drill Hole Diameter (mm):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.2"
                      max="3.5"
                      value={selectedPad.holeMm}
                      onChange={(e) => handleUpdateSelectedPadHole(parseFloat(e.target.value) || 0.8)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-cyan-400 font-bold"
                    />
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Pad Diameter:</span>
                    <span className="text-amber-400 font-bold">{selectedPad.diameterMm} mm</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Position:</span>
                    <span className="text-slate-400 font-mono">
                      X: {selectedPad.x.toFixed(1)}, Y: {selectedPad.y.toFixed(1)}
                    </span>
                  </div>
                </div>
              )}

              {/* Component Selected */}
              {selectedComp && (
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400">{selectedComp.designator}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{selectedComp.type}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Value / Spec:</span>
                    <span className="text-cyan-400 font-bold">{selectedComp.value || '-'}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Rotation:</span>
                    <span className="text-slate-300 font-bold">{selectedComp.rotation || 0}°</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Position:</span>
                    <span className="text-slate-400 font-mono">
                      X: {selectedComp.x.toFixed(1)}, Y: {selectedComp.y.toFixed(1)} mm
                    </span>
                  </div>
                  <button
                    onClick={handleRotateSelectedComponent}
                    className="w-full py-1 bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-600 rounded font-bold flex items-center justify-center gap-1 mt-2"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Rotate 90° [R]</span>
                  </button>
                </div>
              )}

              {/* M3 Mounting Hole Selected */}
              {selectedHole && (
                <div className="p-2.5 bg-slate-950 border border-amber-500/40 rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400 flex items-center gap-1">
                      <CircleDot className="w-3.5 h-3.5 text-amber-400" />
                      M3 Mounting Hole
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{selectedHole.id || selectedHoleId}</span>
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    Plated Through Hole Chassis Ground / Mechanical Screw Mount.
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[10px]">X Position (mm):</label>
                    <input
                      type="number"
                      step="0.5"
                      min="3.0"
                      max={pcb.widthMm - 3}
                      value={selectedHole.xMm ?? selectedHole.x ?? 5.0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        if (!onUpdatePcb) return;
                        const baseHoles: PcbMountingHole[] = (pcb.mountingHoles && pcb.mountingHoles.length > 0)
                          ? pcb.mountingHoles
                          : [
                              { id: 'mount_tl', xMm: 5.0, yMm: 5.0, x: 5.0, y: 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
                              { id: 'mount_tr', xMm: pcb.widthMm - 5.0, yMm: 5.0, x: pcb.widthMm - 5.0, y: 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
                              { id: 'mount_bl', xMm: 5.0, yMm: pcb.heightMm - 5.0, x: 5.0, y: pcb.heightMm - 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
                              { id: 'mount_br', xMm: pcb.widthMm - 5.0, yMm: pcb.heightMm - 5.0, x: pcb.widthMm - 5.0, y: pcb.heightMm - 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
                            ];
                        const nextHoles = baseHoles.map((h, idx) =>
                          (h.id || `m3_${idx}`) === selectedHoleId
                            ? { ...h, xMm: val, x: val, isCustomMoved: true }
                            : h
                        );
                        onUpdatePcb({ ...pcb, mountingHoles: nextHoles });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-emerald-400 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[10px]">Y Position (mm):</label>
                    <input
                      type="number"
                      step="0.5"
                      min="3.0"
                      max={pcb.heightMm - 3}
                      value={selectedHole.yMm ?? selectedHole.y ?? 5.0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        if (!onUpdatePcb) return;
                        const baseHoles: PcbMountingHole[] = (pcb.mountingHoles && pcb.mountingHoles.length > 0)
                          ? pcb.mountingHoles
                          : [
                              { id: 'mount_tl', xMm: 5.0, yMm: 5.0, x: 5.0, y: 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
                              { id: 'mount_tr', xMm: pcb.widthMm - 5.0, yMm: 5.0, x: pcb.widthMm - 5.0, y: 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
                              { id: 'mount_bl', xMm: 5.0, yMm: pcb.heightMm - 5.0, x: 5.0, y: pcb.heightMm - 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
                              { id: 'mount_br', xMm: pcb.widthMm - 5.0, yMm: pcb.heightMm - 5.0, x: pcb.widthMm - 5.0, y: pcb.heightMm - 5.0, drillMm: 3.2, outerMm: 6.0, diameterMm: 3.2 },
                            ];
                        const nextHoles = baseHoles.map((h, idx) =>
                          (h.id || `m3_${idx}`) === selectedHoleId
                            ? { ...h, yMm: val, y: val, isCustomMoved: true }
                            : h
                        );
                        onUpdatePcb({ ...pcb, mountingHoles: nextHoles });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-emerald-400 font-mono"
                    />
                  </div>
                  <div className="flex justify-between text-slate-300 pt-1">
                    <span>Drill Diameter:</span>
                    <span className="font-mono text-cyan-400">
                      {selectedHole.drillMm || selectedHole.diameterMm || 3.2} mm (M3)
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Annular Ring:</span>
                    <span className="font-mono text-cyan-400">
                      {selectedHole.outerMm || ((selectedHole.drillMm || 3.2) + 2.8)} mm (ENIG Gold)
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Connection:</span>
                    <span className="font-mono text-emerald-400">Chassis Ground</span>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={handleResetCornerHoles}
                      className="flex-1 py-1 bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800 rounded font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      title="Reset all 4 corner holes to standard 5mm insets"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>Reset Corners</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSelectedHole}
                      className="flex-1 py-1 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 rounded font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      title="Delete this mounting hole"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              )}

              {!selectedTrack && !selectedPad && !selectedComp && !selectedText && !selectedHole && (
                <div className="p-4 text-center text-slate-500 space-y-1">
                  <p>Click on any copper track, pad, via, mounting hole, footprint, or silkscreen text on the canvas to inspect and edit its parameters.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
