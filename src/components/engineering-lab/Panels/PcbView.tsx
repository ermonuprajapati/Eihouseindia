'use client';

import React, { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { PcbLayout, PcbTrack } from '@/modules/engineering-lab/types';
import {
  Layers,
  Box,
  Download,
  AlertTriangle,
  CheckCircle,
  Route,
  Trash2,
  Sliders,
  X,
} from 'lucide-react';

const Pcb3dViewer = dynamic(
  () => import('@/modules/engineering-lab/pcb-engine/Pcb3dViewer').then((m) => m.Pcb3dViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#070D18] font-mono text-xs text-cyan-400">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <span>INITIALIZING THREE.JS PCB 3D VIEWER...</span>
        </div>
      </div>
    ),
  }
);

interface PcbViewProps {
  pcb: PcbLayout;
  onExportGerber: () => void;
  is3DMode?: boolean;
  onUpdateDimensions?: (widthMm: number, heightMm: number) => void;
  onUpdatePcb?: (updated: PcbLayout) => void;
}

export function PcbView({ pcb, onExportGerber, is3DMode = false, onUpdateDimensions, onUpdatePcb }: PcbViewProps) {
  const canvas2dRef = useRef<HTMLCanvasElement>(null);

  const [activeCopperLayer, setActiveCopperLayer] = useState<'top_copper' | 'bottom_copper'>('top_copper');
  const [boardWidth, setBoardWidth] = useState(pcb.widthMm);
  const [boardHeight, setBoardHeight] = useState(pcb.heightMm);

  // Interactive PCB CAD Routing & Selection State
  const [isRoutingMode, setIsRoutingMode] = useState(false);
  const [routingStartPad, setRoutingStartPad] = useState<{ id: string; x: number; y: number } | null>(null);
  const [hoveredPadId, setHoveredPadId] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ canvasX: number; canvasY: number; mmX: number; mmY: number } | null>(null);

  // Layer Stackup & Fab Specs Modal
  const [showStackupModal, setShowStackupModal] = useState(false);
  const [copperLayers, setCopperLayers] = useState<2 | 4 | 6 | 8>(pcb.copperLayers || 2);
  const [boardThicknessMm, setBoardThicknessMm] = useState<number>(pcb.boardThicknessMm || 1.6);
  const [copperWeightOz, setCopperWeightOz] = useState<number>(1);
  const [units, setUnits] = useState<'mm' | 'mil'>(pcb.units || 'mm');

  const [visibleLayers, setVisibleLayers] = useState({
    topCopper: true,
    bottomCopper: true,
    silkscreen: true,
    drillHoles: true,
    components3D: true,
  });

  // Keyboard shortcut listener for track deletion and escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedTrackId && onUpdatePcb) {
          e.preventDefault();
          const nextTracks = pcb.tracks.filter((t) => t.id !== selectedTrackId);
          onUpdatePcb({ ...pcb, tracks: nextTracks });
          setSelectedTrackId(null);
        }
      } else if (e.key === 'Escape') {
        setRoutingStartPad(null);
        setSelectedTrackId(null);
        setIsRoutingMode(false);
      } else if (e.key === 'r' || e.key === 'R') {
        if (!is3DMode) {
          setIsRoutingMode((m) => !m);
        }
      } else if (e.key === 'v' || e.key === 'V') {
        if (!is3DMode && mousePos) {
          e.preventDefault();
          const snapX = Math.round(mousePos.mmX * 2) / 2;
          const snapY = Math.round(mousePos.mmY * 2) / 2;
          const viaPad = {
            id: `via_${Date.now()}`,
            componentId: 'VIA',
            pinId: 'VIA',
            x: snapX,
            y: snapY,
            diameterMm: 0.8,
            holeMm: 0.4,
            shape: 'round' as const,
            layer: 'all' as const,
          };
          const nextLayer = activeCopperLayer === 'top_copper' ? 'bottom_copper' : 'top_copper';
          setActiveCopperLayer(nextLayer);
          if (onUpdatePcb) {
            onUpdatePcb({
              ...pcb,
              pads: [...pcb.pads, viaPad],
            });
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTrackId, onUpdatePcb, pcb, is3DMode, mousePos, activeCopperLayer]);

  const [solderMaskColor, setSolderMaskColor] = useState<string>('#065F46');

  // ----------------------------------------------------
  // 2D PCB Canvas Render
  // ----------------------------------------------------
  useEffect(() => {
    if (is3DMode) return;
    const canvas = canvas2dRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Dark EDA board canvas background
    ctx.fillStyle = '#050D1A';
    ctx.fillRect(0, 0, width, height);

    // Scaling from mm to canvas pixels (centered)
    const scale = Math.min((width - 90) / pcb.widthMm, (height - 90) / pcb.heightMm);
    const offsetX = (width - pcb.widthMm * scale) / 2;
    const offsetY = (height - pcb.heightMm * scale) / 2;

    // 1. Draw FR4 Board Substrate (Green Soldermask) with rounded corners
    ctx.fillStyle = '#064E3B';
    ctx.strokeStyle = '#047857';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(offsetX, offsetY, pcb.widthMm * scale, pcb.heightMm * scale, 10);
    ctx.fill();
    ctx.stroke();

    // 2. Corner M3 Mounting Holes (diameter 3.2mm)
    const mountHoles = [
      { x: offsetX + 4 * scale, y: offsetY + 4 * scale },
      { x: offsetX + (pcb.widthMm - 4) * scale, y: offsetY + 4 * scale },
      { x: offsetX + 4 * scale, y: offsetY + (pcb.heightMm - 4) * scale },
      { x: offsetX + (pcb.widthMm - 4) * scale, y: offsetY + (pcb.heightMm - 4) * scale },
    ];

    mountHoles.forEach((hole) => {
      // Annular keepout
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, 3.0 * scale, 0, Math.PI * 2);
      ctx.stroke();
      // Hole punch
      ctx.fillStyle = '#050D1A';
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, 1.6 * scale, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2.1 Draw CAD Dimension Extension Lines & Rulers
    const pcbW = pcb.widthMm * scale;
    const pcbH = pcb.heightMm * scale;

    // Top Dimension Line (Horizontal Width)
    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 1;
    // Extension ticks
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    ctx.lineTo(offsetX, offsetY - 24);
    ctx.moveTo(offsetX + pcbW, offsetY);
    ctx.lineTo(offsetX + pcbW, offsetY - 24);
    ctx.stroke();

    // Main horizontal dimension line with arrows
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY - 16);
    ctx.lineTo(offsetX + pcbW, offsetY - 16);
    ctx.stroke();

    // Arrow heads
    ctx.fillStyle = '#06B6D4';
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY - 16);
    ctx.lineTo(offsetX + 6, offsetY - 19);
    ctx.lineTo(offsetX + 6, offsetY - 13);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(offsetX + pcbW, offsetY - 16);
    ctx.lineTo(offsetX + pcbW - 6, offsetY - 19);
    ctx.lineTo(offsetX + pcbW - 6, offsetY - 13);
    ctx.closePath();
    ctx.fill();

    // Width Dimension Pill Badge
    const wLabel = `${pcb.widthMm.toFixed(1)} mm`;
    ctx.fillStyle = '#042F2E';
    ctx.strokeStyle = '#0D9488';
    ctx.lineWidth = 1;
    ctx.fillRect(offsetX + pcbW / 2 - 36, offsetY - 24, 72, 16);
    ctx.strokeRect(offsetX + pcbW / 2 - 36, offsetY - 24, 72, 16);
    ctx.fillStyle = '#2DD4BF';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(wLabel, offsetX + pcbW / 2 - 24, offsetY - 12);

    // Left Dimension Line (Vertical Height)
    ctx.strokeStyle = '#06B6D4';
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    ctx.lineTo(offsetX - 24, offsetY);
    ctx.moveTo(offsetX, offsetY + pcbH);
    ctx.lineTo(offsetX - 24, offsetY + pcbH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(offsetX - 16, offsetY);
    ctx.lineTo(offsetX - 16, offsetY + pcbH);
    ctx.stroke();

    // Arrow heads
    ctx.fillStyle = '#06B6D4';
    ctx.beginPath();
    ctx.moveTo(offsetX - 16, offsetY);
    ctx.lineTo(offsetX - 19, offsetY + 6);
    ctx.lineTo(offsetX - 13, offsetY + 6);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(offsetX - 16, offsetY + pcbH);
    ctx.lineTo(offsetX - 19, offsetY + pcbH - 6);
    ctx.lineTo(offsetX - 13, offsetY + pcbH - 6);
    ctx.closePath();
    ctx.fill();

    // Height Dimension Pill Badge
    const hLabel = `${pcb.heightMm.toFixed(1)} mm`;
    ctx.fillStyle = '#042F2E';
    ctx.strokeStyle = '#0D9488';
    ctx.lineWidth = 1;
    ctx.fillRect(offsetX - 72, offsetY + pcbH / 2 - 8, 52, 16);
    ctx.strokeRect(offsetX - 72, offsetY + pcbH / 2 - 8, 52, 16);
    ctx.fillStyle = '#2DD4BF';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(hLabel, offsetX - 68, offsetY + pcbH / 2 + 4);

    // Millimeter Edge Ticks along Top and Left Borders
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    for (let m = 0; m <= pcb.widthMm; m += 5) {
      const tx = offsetX + m * scale;
      const isMajor = m % 10 === 0;
      ctx.beginPath();
      ctx.moveTo(tx, offsetY);
      ctx.lineTo(tx, offsetY + (isMajor ? 6 : 3));
      ctx.stroke();
    }
    for (let m = 0; m <= pcb.heightMm; m += 5) {
      const ty = offsetY + m * scale;
      const isMajor = m % 10 === 0;
      ctx.beginPath();
      ctx.moveTo(offsetX, ty);
      ctx.lineTo(offsetX + (isMajor ? 6 : 3), ty);
      ctx.stroke();
    }

    // 3. Draw Bottom Copper Tracks (Blue)
    if (visibleLayers.bottomCopper) {
      ctx.lineCap = 'round';
      pcb.tracks
        .filter((t) => t.layer === 'bottom_copper')
        .forEach((t) => {
          const isSelected = t.id === selectedTrackId;
          if (isSelected) {
            ctx.strokeStyle = '#F59E0B';
            ctx.lineWidth = Math.max(t.widthMm * scale, 1.8) + 4;
            ctx.beginPath();
            ctx.moveTo(offsetX + t.from.x * scale, offsetY + t.from.y * scale);
            ctx.lineTo(offsetX + t.to.x * scale, offsetY + t.to.y * scale);
            ctx.stroke();
          }
          ctx.strokeStyle = '#3B82F6';
          ctx.lineWidth = Math.max(t.widthMm * scale, 1.8);
          ctx.beginPath();
          ctx.moveTo(offsetX + t.from.x * scale, offsetY + t.from.y * scale);
          ctx.lineTo(offsetX + t.to.x * scale, offsetY + t.to.y * scale);
          ctx.stroke();
        });
    }

    // 4. Draw Top Copper Tracks (Red)
    if (visibleLayers.topCopper) {
      ctx.lineCap = 'round';
      pcb.tracks
        .filter((t) => t.layer === 'top_copper')
        .forEach((t) => {
          const isSelected = t.id === selectedTrackId;
          if (isSelected) {
            ctx.strokeStyle = '#F59E0B';
            ctx.lineWidth = Math.max(t.widthMm * scale, 1.8) + 4;
            ctx.beginPath();
            ctx.moveTo(offsetX + t.from.x * scale, offsetY + t.from.y * scale);
            ctx.lineTo(offsetX + t.to.x * scale, offsetY + t.to.y * scale);
            ctx.stroke();
          }
          ctx.strokeStyle = '#EF4444';
          ctx.lineWidth = Math.max(t.widthMm * scale, 1.8);
          ctx.beginPath();
          ctx.moveTo(offsetX + t.from.x * scale, offsetY + t.from.y * scale);
          ctx.lineTo(offsetX + t.to.x * scale, offsetY + t.to.y * scale);
          ctx.stroke();
        });
    }

    // Interactive Rubberband Trace in Progress
    if (routingStartPad && mousePos) {
      const sx = offsetX + routingStartPad.x * scale;
      const sy = offsetY + routingStartPad.y * scale;

      // Start pad pulsating highlight
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sx, sy, 5 * scale, 0, Math.PI * 2);
      ctx.stroke();

      // Rubberband line in active copper color
      ctx.strokeStyle = activeCopperLayer === 'top_copper' ? '#EF4444' : '#3B82F6';
      ctx.lineWidth = Math.max(0.35 * scale, 2);
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(mousePos.canvasX, mousePos.canvasY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Millimeter distance badge
      const distMm = Math.hypot(mousePos.mmX - routingStartPad.x, mousePos.mmY - routingStartPad.y);
      ctx.fillStyle = '#020617';
      ctx.fillRect((sx + mousePos.canvasX) / 2 + 5, (sy + mousePos.canvasY) / 2 - 16, 52, 16);
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1;
      ctx.strokeRect((sx + mousePos.canvasX) / 2 + 5, (sy + mousePos.canvasY) / 2 - 16, 52, 16);
      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`${distMm.toFixed(1)} mm`, (sx + mousePos.canvasX) / 2 + 8, (sy + mousePos.canvasY) / 2 - 4);
    }

    // 5. Draw Copper Pads (Gold / Tin Plated Annular Rings)
    pcb.pads.forEach((pad) => {
      const px = offsetX + pad.x * scale;
      const py = offsetY + pad.y * scale;
      const radius = (pad.diameterMm * scale) / 2;
      const isHovered = pad.id === hoveredPadId;
      const isStart = routingStartPad?.id === pad.id;

      // Hover / Route selection ring
      if (isHovered || isStart) {
        ctx.strokeStyle = isStart ? '#10B981' : '#38BDF8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = isHovered ? '#FDE047' : '#F59E0B'; // Copper pad annular ring
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 1;

      ctx.beginPath();
      if (pad.shape === 'rect') {
        ctx.rect(px - radius, py - radius, radius * 2, radius * 2);
      } else {
        ctx.arc(px, py, radius, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();

      // Drill Hole (Hole punch through board)
      if (visibleLayers.drillHoles) {
        ctx.fillStyle = '#050D1A';
        ctx.beginPath();
        ctx.arc(px, py, (pad.holeMm * scale) / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 6. Silkscreen Outlines and Reference Designators
    if (visibleLayers.silkscreen) {
      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.font = 'bold 9px monospace';

      // Header Branding
      ctx.fillText('EI HOUSE ENG LAB', offsetX + 10, offsetY + 18);
      ctx.fillText(`REV 1.0 (${pcb.widthMm}x${pcb.heightMm}mm)`, offsetX + 10, offsetY + pcb.heightMm * scale - 10);

      // Component Footprint Silkscreen Outlines
      if (pcb.components) {
        pcb.components.forEach((comp) => {
          const cx = offsetX + comp.x * scale;
          const cy = offsetY + comp.y * scale;

          if (comp.type === 'TIMER_555' || comp.type.includes('IC')) {
            // DIP-8 box
            ctx.strokeRect(cx - 5 * scale, cy - 8 * scale, 10 * scale, 16 * scale);
            // Pin 1 notch
            ctx.beginPath();
            ctx.arc(cx, cy - 8 * scale, 2 * scale, 0, Math.PI);
            ctx.stroke();
            ctx.fillText(comp.designator, cx - 6 * scale, cy - 10 * scale);
          } else if (comp.type === 'RESISTOR' || comp.type === 'POTENTIOMETER') {
            // Axial resistor box
            ctx.strokeRect(cx - 6 * scale, cy - 2.5 * scale, 12 * scale, 5 * scale);
            ctx.fillText(`${comp.designator} ${comp.value}`, cx - 7 * scale, cy - 4 * scale);
          } else if (comp.type === 'CAPACITOR') {
            // Polarized capacitor circle
            ctx.beginPath();
            ctx.arc(cx, cy, 4.5 * scale, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillText('+', cx - 7 * scale, cy - 1 * scale);
            ctx.fillText(`${comp.designator}`, cx - 6 * scale, cy + 9 * scale);
          } else if (comp.type === 'LED' || comp.type === 'DIODE') {
            // LED circle with flat edge
            ctx.beginPath();
            ctx.arc(cx, cy, 3.5 * scale, -0.6 * Math.PI, 0.6 * Math.PI);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + 3.5 * scale * Math.cos(0.6 * Math.PI), cy + 3.5 * scale * Math.sin(0.6 * Math.PI));
            ctx.lineTo(cx + 3.5 * scale * Math.cos(-0.6 * Math.PI), cy + 3.5 * scale * Math.sin(-0.6 * Math.PI));
            ctx.stroke();
            ctx.fillText(comp.designator, cx - 6 * scale, cy + 8 * scale);
          } else if (comp.type === 'BATTERY' || comp.type === 'DC_VOLTAGE') {
            // Terminal block outline
            ctx.strokeRect(cx - 7 * scale, cy - 4 * scale, 14 * scale, 8 * scale);
            ctx.fillText(comp.designator, cx - 6 * scale, cy - 6 * scale);
          } else {
            // Generic component boundary
            ctx.strokeRect(cx - 5 * scale, cy - 5 * scale, 10 * scale, 10 * scale);
            ctx.fillText(comp.designator, cx - 6 * scale, cy - 7 * scale);
          }
        });
      }
    }
  }, [pcb, visibleLayers, is3DMode, routingStartPad, mousePos, hoveredPadId, selectedTrackId, activeCopperLayer]);

  // ----------------------------------------------------
  // Interactive 2D Routing & Track Selection Handlers
  // ----------------------------------------------------
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvas2dRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height);

    const scale = Math.min((canvas.width - 90) / pcb.widthMm, (canvas.height - 90) / pcb.heightMm);
    const offsetX = (canvas.width - pcb.widthMm * scale) / 2;
    const offsetY = (canvas.height - pcb.heightMm * scale) / 2;

    const mmX = (canvasX - offsetX) / scale;
    const mmY = (canvasY - offsetY) / scale;

    setMousePos({ canvasX, canvasY, mmX, mmY });

    const hovered = pcb.pads.find((p) => {
      const d = Math.hypot(p.x - mmX, p.y - mmY);
      return d <= Math.max(p.diameterMm, 2.5);
    });
    setHoveredPadId(hovered ? hovered.id : null);
  };

  const handleCanvasClick = () => {
    if (!mousePos) return;
    const { mmX, mmY } = mousePos;

    // 1. Check if clicked on a copper pad
    const clickedPad = pcb.pads.find((p) => {
      const d = Math.hypot(p.x - mmX, p.y - mmY);
      return d <= Math.max(p.diameterMm, 2.5);
    });

    if (clickedPad) {
      if (!routingStartPad) {
        // Start interactive routing trace from this pad
        setRoutingStartPad({ id: clickedPad.id, x: clickedPad.x, y: clickedPad.y });
        setSelectedTrackId(null);
      } else if (routingStartPad.id !== clickedPad.id) {
        // Complete the track connection
        const newTrack: PcbTrack = {
          id: `trk_manual_${Date.now()}`,
          layer: activeCopperLayer,
          from: { x: routingStartPad.x, y: routingStartPad.y },
          to: { x: clickedPad.x, y: clickedPad.y },
          widthMm: 0.35,
        };
        if (onUpdatePcb) {
          onUpdatePcb({
            ...pcb,
            tracks: [...pcb.tracks, newTrack],
          });
        }
        setRoutingStartPad(null);
      }
      return;
    }

    // 2. If actively routing and clicked empty space on board: insert intermediate routing waypoint
    if (routingStartPad) {
      const snapX = Math.round(mmX * 2) / 2;
      const snapY = Math.round(mmY * 2) / 2;
      const segTrack: PcbTrack = {
        id: `trk_seg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        layer: activeCopperLayer,
        from: { x: routingStartPad.x, y: routingStartPad.y },
        to: { x: snapX, y: snapY },
        widthMm: 0.35,
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

    // 3. Check if clicked near an existing track to select it
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
      if (dist < 1.5) {
        clickedTrack = track;
        break;
      }
    }

    if (clickedTrack) {
      setSelectedTrackId(clickedTrack.id);
      setRoutingStartPad(null);
    } else {
      setSelectedTrackId(null);
      setRoutingStartPad(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#070D18] text-slate-200 select-none overflow-hidden h-full">
      {/* Top PCB Toolbar */}
      <div className="h-11 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-300">
            {is3DMode ? <Box className="w-4 h-4 text-emerald-400" /> : <Layers className="w-4 h-4 text-blue-400" />}
            <span>{is3DMode ? '3D Photorealistic PCB Visualizer' : '2D Board Layout & Copper Traces'}</span>
          </div>

          {/* Dimension Controls */}
          {onUpdateDimensions && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
              <span>Size:</span>
              <input
                type="number"
                value={boardWidth}
                onChange={(e) => {
                  const w = Math.max(30, Math.min(300, Number(e.target.value)));
                  setBoardWidth(w);
                  onUpdateDimensions(w, boardHeight);
                }}
                className="w-14 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-center text-emerald-400"
                title="Board Width in mm"
              />
              <span>x</span>
              <input
                type="number"
                value={boardHeight}
                onChange={(e) => {
                  const h = Math.max(30, Math.min(300, Number(e.target.value)));
                  setBoardHeight(h);
                  onUpdateDimensions(boardWidth, h);
                }}
                className="w-14 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-center text-emerald-400"
                title="Board Height in mm"
              />
              <span>mm</span>
            </div>
          )}

          {/* Active Copper Layer Switcher */}
          {!is3DMode && (
            <div className="flex items-center gap-1 text-[11px] font-mono pl-2 border-l border-slate-800">
              <span className="text-slate-500">Active:</span>
              <button
                onClick={() => setActiveCopperLayer('top_copper')}
                className={`px-2 py-0.5 rounded ${
                  activeCopperLayer === 'top_copper'
                    ? 'bg-red-950 border border-red-600 text-red-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Top Copper Layer (Red)"
              >
                F.Cu (Top)
              </button>
              <button
                onClick={() => setActiveCopperLayer('bottom_copper')}
                className={`px-2 py-0.5 rounded ${
                  activeCopperLayer === 'bottom_copper'
                    ? 'bg-blue-950 border border-blue-600 text-blue-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Bottom Copper Layer (Blue)"
              >
                B.Cu (Bot)
              </button>

              {/* Interactive Trace Router Toggle */}
              <button
                onClick={() => {
                  setIsRoutingMode((m) => !m);
                  setRoutingStartPad(null);
                }}
                className={`ml-2 px-2.5 py-0.5 rounded flex items-center gap-1 font-bold transition-colors ${
                  isRoutingMode || routingStartPad
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                title="Click pads to interactively route copper tracks [Shortcut: R]"
              >
                <Route className="w-3 h-3" />
                <span>{routingStartPad ? 'Routing Active...' : 'Route [R]'}</span>
              </button>

              {/* Delete Selected Track Button */}
              {selectedTrackId && (
                <button
                  onClick={() => {
                    if (onUpdatePcb) {
                      onUpdatePcb({
                        ...pcb,
                        tracks: pcb.tracks.filter((t) => t.id !== selectedTrackId),
                      });
                      setSelectedTrackId(null);
                    }
                  }}
                  className="px-2 py-0.5 bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700 rounded flex items-center gap-1"
                  title="Delete selected track [Delete]"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Del Track</span>
                </button>
              )}

              {/* Stackup & Fab Specs Modal Toggle */}
              <button
                onClick={() => setShowStackupModal(true)}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1"
                title="Configure PCB Layer Stack & Fabrication Specs"
              >
                <Sliders className="w-3 h-3 text-cyan-400" />
                <span>Stackup</span>
              </button>
            </div>
          )}
        </div>

        {/* Action Controls & Layer Toggles */}
        <div className="flex items-center gap-2">
          {!is3DMode ? (
            <div className="flex items-center gap-3 text-[11px] font-mono pr-3 border-r border-slate-800">
              <label className="flex items-center gap-1 text-red-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleLayers.topCopper}
                  onChange={(e) => setVisibleLayers({ ...visibleLayers, topCopper: e.target.checked })}
                  className="rounded accent-red-500"
                />
                Top
              </label>
              <label className="flex items-center gap-1 text-blue-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleLayers.bottomCopper}
                  onChange={(e) => setVisibleLayers({ ...visibleLayers, bottomCopper: e.target.checked })}
                  className="rounded accent-blue-500"
                />
                Bottom
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
              <button
                type="button"
                onClick={() => {
                  const nextUnit = units === 'mm' ? 'mil' : 'mm';
                  setUnits(nextUnit);
                  if (onUpdatePcb) onUpdatePcb({ ...pcb, units: nextUnit });
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono text-[10px] font-bold border border-slate-700 transition-colors"
                title="Toggle coordinate units between Millimeters and Mils (Thou)"
              >
                {units.toUpperCase()}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 pr-3 border-r border-slate-800 text-xs">
              <span className="text-slate-400 font-mono text-[11px] mr-1">Mask:</span>
              <div className="flex items-center gap-1">
                {[
                  { name: 'Green', color: '#065F46' },
                  { name: 'Black', color: '#0F172A' },
                  { name: 'Blue', color: '#1E40AF' },
                  { name: 'Red', color: '#991B1B' },
                ].map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setSolderMaskColor(c.color)}
                    className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${
                      solderMaskColor === c.color ? 'border-white scale-110 shadow-sm ring-1 ring-cyan-400' : 'border-slate-600 opacity-60 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.color }}
                    title={`${c.name} Solder Mask`}
                  />
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onExportGerber}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow"
            title="Download RS-274X Gerber Fabrication Files"
          >
            <Download className="w-3.5 h-3.5" />
            Export Gerber (.gtl)
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        <div className="flex-1 relative flex items-center justify-center p-4">
          {/* Floating PCB Layer Stack & Dimensions Callout HUD */}
          <div className="absolute top-6 left-6 bg-[#0B1528]/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-2xl font-mono text-xs z-20 flex flex-col gap-1.5 pointer-events-auto min-w-[240px]">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <strong className="text-slate-100 text-[11px] uppercase tracking-wider">PCB Fabrication Stackup</strong>
              <button
                type="button"
                onClick={() => setShowStackupModal(true)}
                className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold hover:bg-emerald-900 cursor-pointer"
              >
                {copperLayers}-LAYER FR-4
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-300">
              <div>Dimensions: <strong className="text-cyan-400">{boardWidth} × {boardHeight} mm</strong></div>
              <div>Thickness: <strong className="text-cyan-400">{boardThicknessMm} mm</strong></div>
              <div>Finished Cu: <strong className="text-amber-400">{copperWeightOz} oz (35µm)</strong></div>
              <div>Surface: <strong className="text-amber-400">ENIG Gold</strong></div>
            </div>
            {/* Miniature Cross-Section Layer Stackup */}
            <div className="flex flex-col gap-0.5 mt-1 pt-1.5 border-t border-slate-800 text-[10px]">
              <div className="flex items-center justify-between text-red-400 font-bold">
                <span>L1: F.Cu (Top Copper)</span>
                <span>35 µm</span>
              </div>
              <div className="h-2 rounded-xs bg-emerald-900 border border-emerald-700/60 flex items-center justify-center text-[8px] text-emerald-200">
                FR-4 Dielectric Core ({boardThicknessMm - (copperLayers === 2 ? 0.07 : 0.14)} mm)
              </div>
              <div className="flex items-center justify-between text-blue-400 font-bold">
                <span>L{copperLayers}: B.Cu (Bottom Copper)</span>
                <span>35 µm</span>
              </div>
            </div>
          </div>
          {is3DMode ? (
            <div className="w-full h-full relative">
              <Pcb3dViewer pcb={pcb} solderMaskColor={solderMaskColor} />
            </div>
          ) : (
            <div className="relative flex items-center justify-center">
              <canvas
                ref={canvas2dRef}
                width={800}
                height={550}
                onMouseMove={handleCanvasMouseMove}
                onClick={handleCanvasClick}
                style={{ cursor: isRoutingMode || routingStartPad ? 'crosshair' : 'default' }}
                className="max-w-full max-h-full rounded-xl border border-slate-800 shadow-2xl"
              />
              {/* Floating Routing Helper Banner */}
              {routingStartPad && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-emerald-500/60 text-emerald-300 font-mono text-[11px] px-3 py-1 rounded-full shadow-lg backdrop-blur flex items-center gap-2 pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>
                    Routing on {activeCopperLayer === 'top_copper' ? 'Top Copper (F.Cu)' : 'Bottom Copper (B.Cu)'}: Click destination pad to connect (Esc to cancel)
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* DRC Sidebar */}
        <div className="w-full lg:w-80 bg-slate-900/90 border-l border-slate-800 p-4 flex flex-col font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="font-semibold text-slate-100 uppercase tracking-wider text-[11px]">
              Design Rule Checks (DRC)
            </span>
            {pcb.drcErrors.length === 0 ? (
              <span className="text-emerald-400 flex items-center gap-1 font-bold text-[11px]">
                <CheckCircle className="w-3.5 h-3.5" />
                PASS
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1 font-bold text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5" />
                {pcb.drcErrors.length} Warning(s)
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto mt-3 space-y-2">
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Standard PCB Fab Specs</div>
              <div className="flex justify-between text-slate-300">
                <span>Min Track Width:</span>
                <span className="text-emerald-400 font-bold">0.2 mm / 8 mil</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Min Clearance:</span>
                <span className="text-emerald-400 font-bold">0.2 mm / 8 mil</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Min Drill Hole:</span>
                <span className="text-emerald-400 font-bold">0.3 mm / 12 mil</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Layer Count:</span>
                <span className="text-cyan-400 font-bold">{copperLayers} Layers (FR-4)</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Board Thickness:</span>
                <span className="text-cyan-400 font-bold">{boardThicknessMm} mm</span>
              </div>
            </div>

            {pcb.drcErrors.length === 0 ? (
              <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded text-emerald-400 text-[11px]">
                All traces, annular rings and clearances pass IPC-2221 manufacturing design rule specifications.
              </div>
            ) : (
              pcb.drcErrors.map((err) => (
                <div key={err.id} className="p-2.5 bg-amber-950/20 border border-amber-800/40 rounded text-[11px] text-amber-300">
                  {err.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Layer Stackup & Fabrication Specs Modal */}
      {showStackupModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1528] border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-5 text-slate-200 font-mono text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-slate-100">PCB Layer Stack &amp; Fabrication Specs</h3>
              </div>
              <button
                onClick={() => setShowStackupModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Copper Layer Count */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Copper Layer Count</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCopperLayers(2)}
                    className={`py-2 px-2 rounded border text-center font-bold text-[11px] transition-all ${
                      copperLayers === 2
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    2 Layers
                  </button>
                  <button
                    type="button"
                    onClick={() => setCopperLayers(4)}
                    className={`py-2 px-2 rounded border text-center font-bold text-[11px] transition-all ${
                      copperLayers === 4
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    4 Layers
                  </button>
                  <button
                    type="button"
                    onClick={() => setCopperLayers(6)}
                    className={`py-2 px-2 rounded border text-center font-bold text-[11px] transition-all ${
                      copperLayers === 6
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    6 Layers
                  </button>
                </div>
              </div>

              {/* Board Thickness */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Board Substrate Thickness</label>
                <select
                  value={boardThicknessMm}
                  onChange={(e) => setBoardThicknessMm(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                >
                  <option value={0.8}>0.8 mm (Ultra Thin)</option>
                  <option value={1.0}>1.0 mm (Thin FR-4)</option>
                  <option value={1.6}>1.6 mm (Standard IPC-2221 FR-4)</option>
                  <option value={2.0}>2.0 mm (Heavy Duty)</option>
                </select>
              </div>

              {/* Copper Weight */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Finished Copper Weight</label>
                <select
                  value={copperWeightOz}
                  onChange={(e) => setCopperWeightOz(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
                >
                  <option value={1}>1 oz (35 µm standard signal)</option>
                  <option value={2}>2 oz (70 µm high current / power)</option>
                </select>
              </div>

              {/* Surface Finish */}
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span>Dielectric Constant (εr):</span>
                  <span className="text-slate-200 font-bold">4.5 (FR-4 Glass Epoxy)</span>
                </div>
                <div className="flex justify-between">
                  <span>Surface Finish:</span>
                  <span className="text-slate-200 font-bold">ENIG (Electroless Nickel Gold)</span>
                </div>
                <div className="flex justify-between">
                  <span>Solder Mask:</span>
                  <span className="text-emerald-400 font-bold">Green Matte LPI</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowStackupModal(false)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onUpdatePcb) {
                    onUpdatePcb({
                      ...pcb,
                      copperLayers,
                      boardThicknessMm,
                    });
                  }
                  setShowStackupModal(false);
                }}
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                Apply Stackup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
