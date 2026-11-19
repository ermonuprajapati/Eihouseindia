'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  PcbLayout,
  PcbTrack,
  PcbPad,
  CircuitComponent,
  CircuitWire,
} from '@/modules/engineering-lab/types';
import { PcbAutoRouter } from '@/modules/engineering-lab/pcb-engine/autorouter';
import { DrcEngine, DrcViolation } from '@/modules/engineering-lab/pcb-engine/drc-engine';
import { GerberExporter } from '@/modules/engineering-lab/pcb-engine/gerber-exporter';
import { FootprintRenderer } from '@/modules/engineering-lab/pcb-engine/footprint-renderer';
import {
  Layers,
  Download,
  AlertTriangle,
  CheckCircle,
  Route,
  Trash2,
  Sliders,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crosshair,
  Wand2,
  Disc,
  Grid,
  Shield,
  Eye,
  Settings,
  ChevronDown,
  FileSpreadsheet,
  FileCode,
  Printer,
  GripHorizontal,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

export interface Pcb2dEditorProps {
  pcb: PcbLayout;
  components?: CircuitComponent[];
  wires?: CircuitWire[];
  projectTitle?: string;
  onUpdatePcb?: (updated: PcbLayout) => void;
  onUpdateDimensions?: (widthMm: number, heightMm: number) => void;
  onExportGerber?: () => void;
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
}: Pcb2dEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Board dimensions
  const [boardWidth, setBoardWidth] = useState(pcb.widthMm);
  const [boardHeight, setBoardHeight] = useState(pcb.heightMm);

  // Active routing / editing layer
  const [activeLayer, setActiveLayer] = useState<'top_copper' | 'bottom_copper'>('top_copper');

  // Tool Modes
  const [toolMode, setToolMode] = useState<'select' | 'route' | 'via'>('select');

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

  // Canvas mouse coordinates
  const [mouseCoord, setMouseCoord] = useState<{ mmX: number; mmY: number; canvasX: number; canvasY: number } | null>(null);

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
    copperPour: false,
  });

  // Sidebar / Inspector Active Tab
  const [sidebarTab, setSidebarTab] = useState<'drc' | 'stackup' | 'inspector'>('drc');
  const [drcViolations, setDrcViolations] = useState<DrcViolation[]>([]);
  const [highlightLocation, setHighlightLocation] = useState<{ x: number; y: number } | null>(null);

  // Draggable Floating Stackup Modal State
  const [isStackupModalOpen, setIsStackupModalOpen] = useState<boolean>(false);
  const [stackupModalPos, setStackupModalPos] = useState<{ x: number; y: number }>({ x: 40, y: 65 });
  const [isDraggingStackup, setIsDraggingStackup] = useState<boolean>(false);
  const [stackupDragStart, setStackupDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Manufacturing Export Dropdown State
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);

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

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedTrackId && onUpdatePcb) {
          e.preventDefault();
          const nextTracks = pcb.tracks.filter((t) => t.id !== selectedTrackId);
          onUpdatePcb({ ...pcb, tracks: nextTracks });
          setSelectedTrackId(null);
          toast.success('Copper track deleted');
        }
      } else if (e.key === 'Escape') {
        setRoutingStartPad(null);
        setSelectedTrackId(null);
        setSelectedPadId(null);
        setSelectedCompId(null);
        setIsDraggingComp(false);
        setToolMode('select');
        setIsExportMenuOpen(false);
      } else if (e.key === 'r' || e.key === 'R') {
        if (selectedCompId && pcb.components && onUpdatePcb) {
          e.preventDefault();
          handleRotateSelectedComponent();
        } else {
          setToolMode((m) => (m === 'route' ? 'select' : 'route'));
          setRoutingStartPad(null);
        }
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        const nextLayer = activeLayer === 'top_copper' ? 'bottom_copper' : 'top_copper';
        setActiveLayer(nextLayer);

        if (routingStartPad && mouseCoord && onUpdatePcb) {
          const viaX = snapCoord(mouseCoord.mmX);
          const viaY = snapCoord(mouseCoord.mmY);
          const viaPad: PcbPad = {
            id: `via_${Date.now()}`,
            componentId: 'VIA',
            pinId: 'VIA',
            x: viaX,
            y: viaY,
            diameterMm: 0.8,
            holeMm: 0.4,
            shape: 'round',
            layer: 'all',
          };
          onUpdatePcb({
            ...pcb,
            pads: [...pcb.pads, viaPad],
          });
          toast.info(`Placed Via at (${viaX.toFixed(1)}, ${viaY.toFixed(1)}) mm & flipped to ${nextLayer === 'top_copper' ? 'F.Cu' : 'B.Cu'}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTrackId, selectedCompId, routingStartPad, mouseCoord, activeLayer, pcb, onUpdatePcb, snapCoord, handleRotateSelectedComponent]);

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

    const updatedPads = [...pcb.pads, ...vias];
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
    GerberExporter.exportGerberZip(pcb, components, projectTitle);
    toast.success(`Downloaded Production Gerber ZIP package for ${projectTitle}`);
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

    // 1. Draw FR4 Board Substrate (Green Soldermask)
    ctx.fillStyle = '#064E3B';
    ctx.strokeStyle = '#047857';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(offsetX, offsetY, pcb.widthMm * scale, pcb.heightMm * scale, 8 * zoomLevel);
    ctx.fill();
    ctx.stroke();

    // 1.1 Copper Pour / GND Plane (if toggled on)
    if (visibleLayers.copperPour) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
      ctx.fillRect(offsetX + 3 * scale, offsetY + 3 * scale, (pcb.widthMm - 6) * scale, (pcb.heightMm - 6) * scale);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(offsetX + 3 * scale, offsetY + 3 * scale, (pcb.widthMm - 6) * scale, (pcb.heightMm - 6) * scale);
    }

    // 2. Corner M3 Mounting Holes
    const mountHoles = [
      { x: offsetX + 4 * scale, y: offsetY + 4 * scale },
      { x: offsetX + (pcb.widthMm - 4) * scale, y: offsetY + 4 * scale },
      { x: offsetX + 4 * scale, y: offsetY + (pcb.heightMm - 4) * scale },
      { x: offsetX + (pcb.widthMm - 4) * scale, y: offsetY + (pcb.heightMm - 4) * scale },
    ];

    mountHoles.forEach((hole) => {
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, 3.0 * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#050D1A';
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, 1.6 * scale, 0, Math.PI * 2);
      ctx.fill();
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

    // 7. Copper Pads (Annular Rings, Solder Mask Clearance & Plated Drill Centers)
    pcb.pads.forEach((pad) => {
      const px = offsetX + pad.x * scale;
      const py = offsetY + pad.y * scale;
      const radius = (pad.diameterMm * scale) / 2;
      const isHovered = pad.id === hoveredPadId;
      const isStart = routingStartPad?.id === pad.id;
      const isSelected = pad.id === selectedPadId;
      const isRect = pad.shape === 'rect';

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

      // ENIG Gold Plated Annular Pad
      ctx.fillStyle = isHovered ? '#FDE047' : isSelected ? '#FBBF24' : '#F59E0B';
      ctx.strokeStyle = '#B45309';
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
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, drillRadius + 0.6, 0, Math.PI * 2);
        ctx.stroke();

        // Dark hollow drill hole
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(px, py, drillRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 8. Silkscreen Outlines and Tight, Legible Labels Right Beside Courtyards
    if (visibleLayers.silkscreen) {
      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.font = 'bold 9px monospace';

      ctx.fillText('EI HOUSE ENG LAB', offsetX + 8, offsetY + 16);
      ctx.fillText(`REV 2.0 (${pcb.widthMm}x${pcb.heightMm}mm)`, offsetX + 8, offsetY + pcb.heightMm * scale - 8);

      if (pcb.components) {
        pcb.components.forEach((comp) => {
          const cx = offsetX + comp.x * scale;
          const cy = offsetY + comp.y * scale;
          const isCompSelected = comp.componentId === selectedCompId;

          ctx.save();
          ctx.translate(cx, cy);
          if (comp.rotation) {
            ctx.rotate((comp.rotation * Math.PI) / 180);
          }

          if (isCompSelected) {
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(-9 * scale, -9 * scale, 18 * scale, 18 * scale);
            ctx.setLineDash([]);
            ctx.fillStyle = '#38BDF8';
            ctx.font = 'bold 8px monospace';
            ctx.fillText('↺ [R]', -7 * scale, 13 * scale);
          }

          ctx.strokeStyle = isCompSelected ? '#38BDF8' : '#E2E8F0';
          ctx.fillStyle = isCompSelected ? '#38BDF8' : '#F8FAFC';
          ctx.lineWidth = 1;
          ctx.font = 'bold 8px monospace';

          // Layout labels tightly beside silkscreen courtyard
          const layout = FootprintRenderer.calculateSilkscreenLayout({
            designator: comp.designator,
            type: comp.type,
            value: comp.value,
            x: 0,
            y: 0,
            rotation: comp.rotation || 0,
          });

          if (layout.boxBounds) {
            ctx.strokeRect(
              layout.boxBounds.x * scale,
              layout.boxBounds.y * scale,
              layout.boxBounds.width * scale,
              layout.boxBounds.height * scale
            );
            if (layout.outlineType === 'dip') {
              // Semicircular notch on the left side (-X)
              ctx.beginPath();
              ctx.arc(layout.boxBounds.x * scale, 0, 1.8 * scale, -Math.PI / 2, Math.PI / 2);
              ctx.stroke();
              // Pin 1 indicator dot
              ctx.beginPath();
              ctx.arc(
                (layout.boxBounds.x + 1.8) * scale,
                (layout.boxBounds.y + 1.8) * scale,
                1.0 * scale,
                0,
                Math.PI * 2
              );
              ctx.fill();
            }
          }

          // Designator text
          ctx.fillText(layout.designatorText, layout.designatorPos.x * scale, layout.designatorPos.y * scale);
          // Value text
          if (layout.valueText) {
            ctx.fillStyle = isCompSelected ? '#7DD3FC' : '#94A3B8';
            ctx.fillText(layout.valueText, layout.valuePos.x * scale, layout.valuePos.y * scale);
          }

          ctx.restore();
        });
      }
    }

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
    traceWidth,
    zoomLevel,
    panOffset,
    highlightLocation,
    gridSpacingMm,
    drcViolations,
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

    return { canvasX, canvasY, mmX, mmY };
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
    if (e.button === 1) {
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
      const clickedComp = pcb.components?.find((c) => Math.hypot(c.x - mmX, c.y - mmY) <= 8);
      if (clickedComp) {
        setSelectedCompId(clickedComp.componentId);
        setSelectedTrackId(null);
        setSelectedPadId(null);
        setIsDraggingComp(true);
        setDragOffset({ x: mmX - clickedComp.x, y: mmY - clickedComp.y });
        setSidebarTab('inspector');
        return;
      }
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingComp(false);
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
      setHighlightLocation(null);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
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
          const newTrack: PcbTrack = {
            id: `trk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            layer: activeLayer,
            from: { x: routingStartPad.x, y: routingStartPad.y },
            to: { x: clickedPad.x, y: clickedPad.y },
            widthMm: traceWidth,
          };
          if (onUpdatePcb) {
            onUpdatePcb({
              ...pcb,
              tracks: [...pcb.tracks, newTrack],
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
      const segTrack: PcbTrack = {
        id: `trk_seg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        layer: activeLayer,
        from: { x: routingStartPad.x, y: routingStartPad.y },
        to: { x: snapX, y: snapY },
        widthMm: traceWidth,
      };
      if (onUpdatePcb) {
        onUpdatePcb({
          ...pcb,
          tracks: [...pcb.tracks, segTrack],
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

  return (
    <div className="flex-1 flex flex-col bg-[#070D18] text-slate-200 select-none overflow-hidden h-full">
      {/* ---------------------------------------------------- */}
      {/* Top Context-Aware PCB Toolbar */}
      {/* ---------------------------------------------------- */}
      <div className="h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 gap-2 flex-wrap text-xs">
        {/* Left Section: Modes & Tools */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 font-mono text-slate-300 pr-2 border-r border-slate-800">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="font-bold hidden sm:inline">PCB 2D</span>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800">
            <button
              onClick={() => {
                setToolMode('select');
                setRoutingStartPad(null);
              }}
              className={`px-2.5 py-1 rounded font-mono text-[11px] font-semibold transition-all ${
                toolMode === 'select'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Select & Move Objects [Shortcut: S]"
            >
              Select (S)
            </button>
            <button
              onClick={() => {
                setToolMode('route');
                setRoutingStartPad(null);
              }}
              className={`px-2.5 py-1 rounded font-mono text-[11px] font-semibold flex items-center gap-1 transition-all ${
                toolMode === 'route' || routingStartPad
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Interactive 45° Manual Copper Routing [Shortcut: R]"
            >
              <Route className="w-3.5 h-3.5" />
              <span>{routingStartPad ? 'Routing...' : 'Route [R]'}</span>
            </button>
          </div>

          {/* Layer Selector */}
          <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
            <button
              onClick={() => setActiveLayer('top_copper')}
              className={`px-2 py-1 rounded font-mono text-[11px] font-bold transition-all ${
                activeLayer === 'top_copper'
                  ? 'bg-red-950 border border-red-600 text-red-300'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Top Copper Layer (F.Cu - Red)"
            >
              F.Cu (Top)
            </button>
            <button
              onClick={() => setActiveLayer('bottom_copper')}
              className={`px-2 py-1 rounded font-mono text-[11px] font-bold transition-all ${
                activeLayer === 'bottom_copper'
                  ? 'bg-blue-950 border border-blue-600 text-blue-300'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Bottom Copper Layer (B.Cu - Blue)"
            >
              B.Cu (Bot)
            </button>
          </div>

          {/* Trace Width Selector */}
          <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
            <span className="text-slate-500 font-mono text-[10px] hidden md:inline">Width:</span>
            <select
              value={traceWidth}
              onChange={(e) => {
                const w = parseFloat(e.target.value);
                setTraceWidth(w);
                if (selectedTrackId) handleUpdateSelectedTrackWidth(w);
              }}
              className="bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-emerald-400 font-mono text-[11px] cursor-pointer"
              title="Active trace routing width (updates newly routed & selected traces)"
            >
              {TRACE_WIDTH_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Drill Size Selector */}
          <div className="flex items-center gap-1 pl-1">
            <span className="text-slate-500 font-mono text-[10px] hidden md:inline">Drill:</span>
            <select
              value={drillSize}
              onChange={(e) => {
                const d = parseFloat(e.target.value);
                setDrillSize(d);
                if (selectedPadId) handleUpdateSelectedPadHole(d);
              }}
              className="bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-cyan-400 font-mono text-[11px] cursor-pointer"
              title="Pad / Via drill hole diameter"
            >
              {DRILL_SIZE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Grid Snap & Unit Toggle */}
          <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
            <button
              onClick={() => setIsSnapToGrid((s) => !s)}
              className={`p-1 rounded transition-colors ${
                isSnapToGrid ? 'bg-cyan-950 text-cyan-300 border border-cyan-700' : 'text-slate-500 hover:text-white'
              }`}
              title="Toggle Snap to Grid"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <select
              value={gridSpacingMm}
              onChange={(e) => setGridSpacingMm(parseFloat(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded px-1 py-1 text-slate-300 font-mono text-[10px]"
              title="Grid spacing"
            >
              {GRID_SPACING_PRESETS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                const nextUnit = units === 'mm' ? 'mil' : 'mm';
                setUnits(nextUnit);
                if (onUpdatePcb) onUpdatePcb({ ...pcb, units: nextUnit });
              }}
              className="px-1.5 py-1 rounded bg-slate-950 text-cyan-400 font-mono text-[10px] font-bold border border-slate-800"
              title="Toggle units (mm / mil)"
            >
              {units.toUpperCase()}
            </button>
          </div>
        </div>

        {/* Right Section: Auto-Route, Draggable Stackup Toggle & Export Menu */}
        <div className="flex items-center gap-2">
          {/* Draggable Stackup Toggle */}
          <button
            onClick={() => setIsStackupModalOpen((prev) => !prev)}
            className={`px-2.5 py-1 rounded font-mono text-[11px] font-bold flex items-center gap-1 transition-all ${
              isStackupModalOpen
                ? 'bg-cyan-950 border border-cyan-500 text-cyan-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title="Open Draggable Stackup & Layer Manager"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Stackup</span>
          </button>

          {/* Rotate Selected Footprint */}
          {selectedCompId && (
            <button
              onClick={handleRotateSelectedComponent}
              className="px-2.5 py-1 bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-600 rounded flex items-center gap-1 font-mono text-[11px] transition-colors"
              title="Rotate Selected Component 90° [Shortcut: R]"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rotate</span>
            </button>
          )}

          {/* Delete Track */}
          {selectedTrackId && (
            <button
              onClick={() => {
                if (onUpdatePcb) {
                  onUpdatePcb({ ...pcb, tracks: pcb.tracks.filter((t) => t.id !== selectedTrackId) });
                  setSelectedTrackId(null);
                  toast.success('Deleted track');
                }
              }}
              className="px-2.5 py-1 bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700 rounded flex items-center gap-1 font-mono text-[11px]"
              title="Delete Selected Track [Shortcut: Delete]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}

          {/* Pro Auto-Router Button */}
          <button
            onClick={handleAutoRoute}
            className="px-3 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded font-semibold flex items-center gap-1.5 shadow"
            title="Auto-Route all unrouted schematic nets with 45° Manhattan routes"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Auto-Route</span>
          </button>

          {/* Clear Traces */}
          <button
            onClick={handleClearAllTraces}
            className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-800 transition-colors"
            title="Clear All Tracks to Route Fresh"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Export Manufacturing Files ▾ Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold flex items-center gap-1.5 shadow"
              title="Export complete manufacturing files (Gerbers, Drill, BOM, CPL, SVG)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Manufacturing Files</span>
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#0B1528] border border-slate-700/80 rounded-xl shadow-2xl py-1.5 z-50 font-mono text-xs animate-in fade-in zoom-in-95 duration-100">
                <button
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
                  onClick={handleDownloadBomCsv}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-300 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bill of Materials (BOM .csv)</span>
                </button>
                <button
                  onClick={handleDownloadPickAndPlaceCsv}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-300 transition-colors cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Pick &amp; Place Centroid (CPL .csv)</span>
                </button>
                <button
                  onClick={handleDownloadBlueprintSvg}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-slate-300 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-purple-400" />
                  <span>2D Print Blueprint (.svg)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* Main Canvas & Right Inspector */}
      {/* ---------------------------------------------------- */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Canvas Area */}
        <div className="flex-1 relative flex items-center justify-center p-2 bg-[#050D1A] overflow-hidden">
          {/* Canvas Viewport Controls Overlay */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-1 bg-slate-950/80 backdrop-blur border border-slate-800 rounded-lg p-1 text-slate-300">
            <button
              onClick={() => setZoomLevel((z) => Math.min(3.0, z + 0.15))}
              className="p-1 hover:bg-slate-800 rounded text-slate-300"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.15))}
              className="p-1 hover:bg-slate-800 rounded text-slate-300"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setZoomLevel(1.0);
                setPanOffset({ x: 0, y: 0 });
              }}
              className="p-1 hover:bg-slate-800 rounded text-slate-300"
              title="Reset View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1 text-cyan-400">
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>

          {/* Layer Visibility Pills Overlay */}
          <div className="absolute top-4 right-4 z-20 hidden sm:flex items-center gap-1.5 bg-slate-950/85 backdrop-blur border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-mono">
            <span className="text-slate-500 mr-1 flex items-center gap-1">
              <Eye className="w-3 h-3 text-cyan-400" />
              Layers:
            </span>
            <label className="flex items-center gap-1 text-red-400 cursor-pointer">
              <input
                type="checkbox"
                checked={visibleLayers.topCopper}
                onChange={(e) => setVisibleLayers({ ...visibleLayers, topCopper: e.target.checked })}
                className="rounded accent-red-500"
              />
              F.Cu
            </label>
            <label className="flex items-center gap-1 text-blue-400 cursor-pointer">
              <input
                type="checkbox"
                checked={visibleLayers.bottomCopper}
                onChange={(e) => setVisibleLayers({ ...visibleLayers, bottomCopper: e.target.checked })}
                className="rounded accent-blue-500"
              />
              B.Cu
            </label>
            <label className="flex items-center gap-1 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={visibleLayers.silkscreen}
                onChange={(e) => setVisibleLayers({ ...visibleLayers, silkscreen: e.target.checked })}
                className="rounded accent-emerald-500"
              />
              Silk
            </label>
            <label className="flex items-center gap-1 text-amber-400 cursor-pointer">
              <input
                type="checkbox"
                checked={visibleLayers.drillHoles}
                onChange={(e) => setVisibleLayers({ ...visibleLayers, drillHoles: e.target.checked })}
                className="rounded accent-amber-500"
              />
              Drill
            </label>
            <label className="flex items-center gap-1 text-yellow-400 cursor-pointer">
              <input
                type="checkbox"
                checked={visibleLayers.ratsnest}
                onChange={(e) => setVisibleLayers({ ...visibleLayers, ratsnest: e.target.checked })}
                className="rounded accent-yellow-500"
              />
              Airwires
            </label>
            <label className="flex items-center gap-1 text-emerald-400 cursor-pointer">
              <input
                type="checkbox"
                checked={visibleLayers.copperPour}
                onChange={(e) => setVisibleLayers({ ...visibleLayers, copperPour: e.target.checked })}
                className="rounded accent-emerald-500"
              />
              GND Pour
            </label>
          </div>

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
                  : toolMode === 'route' || routingStartPad
                  ? 'crosshair'
                  : isDraggingComp
                  ? 'grabbing'
                  : selectedCompId
                  ? 'grab'
                  : 'default',
            }}
            className="max-w-full max-h-full rounded-xl border border-slate-800 shadow-2xl"
          />
        </div>

        {/* ---------------------------------------------------- */}
        {/* Right Sidebar: DRC & Stackup Inspector */}
        {/* ---------------------------------------------------- */}
        <div className="w-full lg:w-80 bg-slate-900 border-l border-slate-800 flex flex-col font-mono text-xs overflow-hidden">
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
                {drcViolations.length === 0 ? (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded text-emerald-400 text-[11px] space-y-1">
                    <p className="font-bold">✓ Zero DRC Violations Found</p>
                    <p className="text-[10px] text-emerald-500">
                      Layout satisfies board outline, minimum track widths, annular rings, and isolation clearances.
                    </p>
                  </div>
                ) : (
                  drcViolations.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => {
                        if (v.location) {
                          setHighlightLocation(v.location);
                          toast.info(`Focused on ${v.rule}`);
                        }
                      }}
                      className="p-2 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/60 rounded text-[11px] cursor-pointer transition-colors space-y-1"
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
                        {v.location && (
                          <span className="text-[9px] text-cyan-400 flex items-center gap-0.5">
                            <Crosshair className="w-2.5 h-2.5" />
                            {v.location.x.toFixed(1)}, {v.location.y.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-300 text-[10px]">{v.message}</p>
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

              {!selectedTrack && !selectedPad && !selectedComp && (
                <div className="p-4 text-center text-slate-500 space-y-1">
                  <p>Click on any copper track, pad, via, or footprint on the canvas to inspect and edit its parameters.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
