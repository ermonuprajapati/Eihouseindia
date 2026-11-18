'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PcbLayout, PcbTrack } from '@/modules/engineering-lab/types';
import {
  Layers,
  Box,
  Download,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Compass,
  Play,
  Pause,
  Route,
  Trash2,
  Sliders,
  X,
} from 'lucide-react';

interface PcbViewProps {
  pcb: PcbLayout;
  onExportGerber: () => void;
  is3DMode?: boolean;
  onUpdateDimensions?: (widthMm: number, heightMm: number) => void;
  onUpdatePcb?: (updated: PcbLayout) => void;
}

export function PcbView({ pcb, onExportGerber, is3DMode = false, onUpdateDimensions, onUpdatePcb }: PcbViewProps) {
  const canvas2dRef = useRef<HTMLCanvasElement>(null);
  const canvas3dRef = useRef<HTMLCanvasElement>(null);

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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTrackId, onUpdatePcb, pcb, is3DMode]);

  // 3D Orbit, Tilt & Camera State
  const [rotY, setRotY] = useState(0.5); // horizontal angle
  const [rotX, setRotX] = useState(0.55); // tilt angle
  const [zoom3D, setZoom3D] = useState(1.15);
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [isDragging3D, setIsDragging3D] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Camera Presets
  const setPresetView = (preset: 'top' | 'iso' | 'bottom' | 'front') => {
    setIsAutoRotate(false);
    if (preset === 'top') {
      setRotX(0.01);
      setRotY(0.0);
    } else if (preset === 'iso') {
      setRotX(0.6);
      setRotY(0.65);
    } else if (preset === 'bottom') {
      setRotX(Math.PI - 0.05);
      setRotY(0.0);
    } else if (preset === 'front') {
      setRotX(Math.PI / 2);
      setRotY(0.0);
    }
  };

  const handleResetCamera = () => {
    setRotX(0.55);
    setRotY(0.5);
    setZoom3D(1.15);
    setIsAutoRotate(true);
  };

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

    // 2. Check if clicked near an existing track to select it
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

  // ----------------------------------------------------
  // Native 3D PCB Canvas Projection & Orbit Engine
  // ----------------------------------------------------
  const render3DFrame = useCallback(() => {
    const canvas = canvas3dRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Dark futuristic lab environment
    ctx.fillStyle = '#050B14';
    ctx.fillRect(0, 0, width, height);

    // Radial floor glow under the board
    const glowGrad = ctx.createRadialGradient(width / 2, height / 2 + 80, 20, width / 2, height / 2 + 80, 260);
    glowGrad.addColorStop(0, 'rgba(16, 185, 129, 0.18)');
    glowGrad.addColorStop(1, 'rgba(5, 11, 20, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const scale = 5.2 * zoom3D;

    // 3D rotation projection helper
    const project3D = (x: number, y: number, z: number) => {
      // Center-relative coordinates
      const rx = x - pcb.widthMm / 2;
      const rz = z - pcb.heightMm / 2;

      // Rotate around Y axis
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const x1 = rx * cosY + rz * sinY;
      const z1 = -rx * sinY + rz * cosY;

      // Rotate around X axis (tilt)
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const y2 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;

      // Perspective division
      const distance = 200;
      const fov = distance / (distance + z2);

      return {
        px: centerX + x1 * scale * fov,
        py: centerY + y2 * scale * fov,
        depth: z2,
      };
    };

    // 1. Draw FR4 Board Edges (Substrate thickness = 1.6mm)
    const cornersTop = [
      project3D(0, -1.6, 0),
      project3D(pcb.widthMm, -1.6, 0),
      project3D(pcb.widthMm, -1.6, pcb.heightMm),
      project3D(0, -1.6, pcb.heightMm),
    ];

    const cornersBottom = [
      project3D(0, 1.6, 0),
      project3D(pcb.widthMm, 1.6, 0),
      project3D(pcb.widthMm, 1.6, pcb.heightMm),
      project3D(0, 1.6, pcb.heightMm),
    ];

    // Board dark edge sides
    ctx.fillStyle = '#064E3B';
    ctx.strokeStyle = '#022C22';
    ctx.lineWidth = 1;

    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      ctx.beginPath();
      ctx.moveTo(cornersTop[i].px, cornersTop[i].py);
      ctx.lineTo(cornersTop[next].px, cornersTop[next].py);
      ctx.lineTo(cornersBottom[next].px, cornersBottom[next].py);
      ctx.lineTo(cornersBottom[i].px, cornersBottom[i].py);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Board Top Face (Solder Mask Green with subtle metallic sheen)
    const topGrad = ctx.createLinearGradient(cornersTop[0].px, cornersTop[0].py, cornersTop[2].px, cornersTop[2].py);
    topGrad.addColorStop(0, '#047857');
    topGrad.addColorStop(0.5, '#065F46');
    topGrad.addColorStop(1, '#064E3B');
    ctx.fillStyle = topGrad;
    ctx.beginPath();
    ctx.moveTo(cornersTop[0].px, cornersTop[0].py);
    for (let i = 1; i < 4; i++) {
      ctx.lineTo(cornersTop[i].px, cornersTop[i].py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Corner M3 Mounting Holes
    const mountHoles3D = [
      { x: 4, z: 4 },
      { x: pcb.widthMm - 4, z: 4 },
      { x: 4, z: pcb.heightMm - 4 },
      { x: pcb.widthMm - 4, z: pcb.heightMm - 4 },
    ];
    mountHoles3D.forEach((mh) => {
      const p = project3D(mh.x, -1.7, mh.z);
      // Gold pad
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(p.px, p.py, 3.2 * zoom3D, 0, Math.PI * 2);
      ctx.fill();
      // Hole punch
      ctx.fillStyle = '#050B14';
      ctx.beginPath();
      ctx.arc(p.px, p.py, 1.8 * zoom3D, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. Draw 3D Top Copper Tracks
    if (visibleLayers.topCopper) {
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2.2 * zoom3D;
      ctx.lineCap = 'round';
      pcb.tracks
        .filter((t) => t.layer === 'top_copper')
        .forEach((t) => {
          const p1 = project3D(t.from.x, -1.7, t.from.y);
          const p2 = project3D(t.to.x, -1.7, t.to.y);
          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          ctx.lineTo(p2.px, p2.py);
          ctx.stroke();
        });
    }

    // 3. Draw 3D Copper Pads (Gold Plated Annular Rings)
    pcb.pads.forEach((pad) => {
      const p = project3D(pad.x, -1.8, pad.y);
      const radius = (pad.diameterMm * scale * 0.42) / 2;

      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(p.px, p.py, radius, 0, Math.PI * 2);
      ctx.fill();

      // Drill Hole
      ctx.fillStyle = '#050D1A';
      ctx.beginPath();
      ctx.arc(p.px, p.py, radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Draw 3D Component Models
    if (visibleLayers.components3D && pcb.components) {
      // Sort components back-to-front by depth
      const sortedComps = [...pcb.components]
        .map((comp) => {
          const proj = project3D(comp.x, -1.6, comp.y);
          return { comp, depth: proj.depth };
        })
        .sort((a, b) => b.depth - a.depth);

      sortedComps.forEach(({ comp }) => {
        const cx = comp.x;
        const cy = comp.y;

        if (comp.type === 'TIMER_555' || comp.type.includes('IC')) {
          // --- DIP-8 IC PACKAGE ---
          const p1 = project3D(cx - 5, -6, cy - 8);
          const p2 = project3D(cx + 5, -6, cy - 8);
          const p3 = project3D(cx + 5, -6, cy + 8);
          const p4 = project3D(cx - 5, -6, cy + 8);

          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          const s1 = project3D(cx - 5.5, -1.8, cy - 8.5);
          const s3 = project3D(cx + 5.5, -1.8, cy + 8.5);
          ctx.fillRect(s1.px, s1.py, s3.px - s1.px, s3.py - s1.py);

          // DIP-8 Molded Epoxy Body
          ctx.fillStyle = '#1E293B';
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          ctx.lineTo(p2.px, p2.py);
          ctx.lineTo(p3.px, p3.py);
          ctx.lineTo(p4.px, p4.py);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Notch on Pin 1 End
          const notchP = project3D(cx, -6, cy - 8);
          ctx.fillStyle = '#0F172A';
          ctx.beginPath();
          ctx.arc(notchP.px, notchP.py, 2.5 * zoom3D, 0, Math.PI);
          ctx.fill();

          // Laser Mark Silkscreen
          ctx.fillStyle = '#94A3B8';
          ctx.font = 'bold 8px monospace';
          ctx.fillText(comp.designator || 'U1', p1.px + 4, p1.py + 10);
        } else if (comp.type === 'RESISTOR' || comp.type === 'POTENTIOMETER') {
          // --- AXIAL CERAMIC RESISTOR ---
          const rP1 = project3D(cx - 6, -3.5, cy);
          const rP2 = project3D(cx + 6, -3.5, cy);

          // Lead Wires (Silver)
          ctx.strokeStyle = '#94A3B8';
          ctx.lineWidth = 1.5 * zoom3D;
          const leadL = project3D(cx - 8, -1.8, cy);
          const leadR = project3D(cx + 8, -1.8, cy);
          ctx.beginPath();
          ctx.moveTo(leadL.px, leadL.py);
          ctx.lineTo(rP1.px, rP1.py);
          ctx.moveTo(rP2.px, rP2.py);
          ctx.lineTo(leadR.px, leadR.py);
          ctx.stroke();

          // Cylindrical Body
          ctx.fillStyle = '#D97706'; // Tan ceramic body
          ctx.strokeStyle = '#B45309';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(rP1.px, rP1.py - 2.5 * zoom3D, rP2.px - rP1.px, 5 * zoom3D, 2);
          ctx.fill();
          ctx.stroke();

          // Color Bands (e.g. Brown, Black, Orange, Gold for 10k)
          const bandWidth = 1.2 * zoom3D;
          const step = (rP2.px - rP1.px) / 5;
          ctx.fillStyle = '#78350F'; // Brown
          ctx.fillRect(rP1.px + step * 1, rP1.py - 2.5 * zoom3D, bandWidth, 5 * zoom3D);
          ctx.fillStyle = '#0F172A'; // Black
          ctx.fillRect(rP1.px + step * 2, rP1.py - 2.5 * zoom3D, bandWidth, 5 * zoom3D);
          ctx.fillStyle = '#EA580C'; // Orange
          ctx.fillRect(rP1.px + step * 3, rP1.py - 2.5 * zoom3D, bandWidth, 5 * zoom3D);
          ctx.fillStyle = '#F59E0B'; // Gold tolerance
          ctx.fillRect(rP1.px + step * 4, rP1.py - 2.5 * zoom3D, bandWidth, 5 * zoom3D);
        } else if (comp.type === 'CAPACITOR') {
          // --- RADIAL ELECTROLYTIC CANISTER ---
          const cBase = project3D(cx, -1.8, cy);
          const cTop = project3D(cx, -7.5, cy);
          const cRadius = 4.0 * zoom3D;

          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.beginPath();
          ctx.arc(cBase.px, cBase.py, cRadius * 1.1, 0, Math.PI * 2);
          ctx.fill();

          // Aluminum Canister Body
          const canGrad = ctx.createLinearGradient(cBase.px - cRadius, cBase.py, cBase.px + cRadius, cBase.py);
          canGrad.addColorStop(0, '#1E293B');
          canGrad.addColorStop(0.7, '#334155');
          canGrad.addColorStop(1, '#0F172A');
          ctx.fillStyle = canGrad;
          ctx.beginPath();
          ctx.roundRect(cTop.px - cRadius, cTop.py, cRadius * 2, cBase.py - cTop.py, 3);
          ctx.fill();

          // Aluminum Silver Top with Cross Vent
          ctx.fillStyle = '#94A3B8';
          ctx.beginPath();
          ctx.arc(cTop.px, cTop.py + 1, cRadius, 0, Math.PI * 2);
          ctx.fill();
          // Cross vent
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cTop.px - cRadius * 0.7, cTop.py + 1);
          ctx.lineTo(cTop.px + cRadius * 0.7, cTop.py + 1);
          ctx.moveTo(cTop.px, cTop.py + 1 - cRadius * 0.7);
          ctx.lineTo(cTop.px, cTop.py + 1 + cRadius * 0.7);
          ctx.stroke();

          // Negative Stripe
          ctx.fillStyle = '#F8FAFC';
          ctx.fillRect(cTop.px - cRadius, cTop.py + 1, 1.8 * zoom3D, cBase.py - cTop.py);
        } else if (comp.type === 'LED' || comp.type === 'DIODE') {
          // --- 5MM THT OPTICAL DOME LED ---
          const ledBase = project3D(cx, -1.8, cy);
          const ledDome = project3D(cx, -6.5, cy);
          const ledRadius = 3.5 * zoom3D;

          // LED Lead wires down to board
          ctx.strokeStyle = '#94A3B8';
          ctx.lineWidth = 1.2 * zoom3D;
          ctx.beginPath();
          ctx.moveTo(ledDome.px, ledDome.py);
          ctx.lineTo(ledBase.px, ledBase.py);
          ctx.stroke();

          // Optical Epoxy Dome (Red with Active Luminescence)
          const ledGrad = ctx.createRadialGradient(ledDome.px, ledDome.py, 1, ledDome.px, ledDome.py, ledRadius * 1.5);
          ledGrad.addColorStop(0, '#FCA5A5');
          ledGrad.addColorStop(0.4, '#EF4444');
          ledGrad.addColorStop(1, '#991B1B');

          ctx.fillStyle = ledGrad;
          ctx.beginPath();
          ctx.arc(ledDome.px, ledDome.py, ledRadius, 0, Math.PI * 2);
          ctx.fill();

          // Active Glow Halo
          const glowGrad = ctx.createRadialGradient(ledDome.px, ledDome.py, 2, ledDome.px, ledDome.py, ledRadius * 3);
          glowGrad.addColorStop(0, 'rgba(239, 68, 68, 0.45)');
          glowGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(ledDome.px, ledDome.py, ledRadius * 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (comp.type === 'BATTERY' || comp.type === 'DC_VOLTAGE') {
          // --- 2-PIN SCREW TERMINAL BLOCK (GREEN) ---
          const tbP1 = project3D(cx - 7, -6, cy - 4);
          const tbP2 = project3D(cx + 7, -6, cy - 4);
          const tbP3 = project3D(cx + 7, -6, cy + 4);
          const tbP4 = project3D(cx - 7, -6, cy + 4);

          // Green Molded Body
          ctx.fillStyle = '#059669';
          ctx.strokeStyle = '#047857';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(tbP1.px, tbP1.py);
          ctx.lineTo(tbP2.px, tbP2.py);
          ctx.lineTo(tbP3.px, tbP3.py);
          ctx.lineTo(tbP4.px, tbP4.py);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Brass Screws
          const sc1 = project3D(cx - 3.5, -6, cy);
          const sc2 = project3D(cx + 3.5, -6, cy);
          ctx.fillStyle = '#F59E0B';
          ctx.beginPath();
          ctx.arc(sc1.px, sc1.py, 1.8 * zoom3D, 0, Math.PI * 2);
          ctx.arc(sc2.px, sc2.py, 1.8 * zoom3D, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Generic SMD / Through-hole Package
          const genP = project3D(cx, -4, cy);
          ctx.fillStyle = '#334155';
          ctx.fillRect(genP.px - 4 * zoom3D, genP.py - 4 * zoom3D, 8 * zoom3D, 8 * zoom3D);
        }
      });
    }

    // Auto gentle rotation when enabled and not dragging
    if (isAutoRotate && !isDragging3D) {
      setRotY((r) => r + 0.003);
    }
  }, [pcb, rotX, rotY, zoom3D, isAutoRotate, isDragging3D, visibleLayers]);

  useEffect(() => {
    if (!is3DMode) return;
    let animId: number;
    const loop = () => {
      render3DFrame();
      animId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animId);
  }, [is3DMode, render3DFrame]);

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
            </div>
          ) : (
            <div className="flex items-center gap-1.5 pr-3 border-r border-slate-800 text-xs">
              {/* 3D View Presets */}
              <button
                onClick={() => setPresetView('top')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono"
                title="Top Orthogonal View"
              >
                Top
              </button>
              <button
                onClick={() => setPresetView('iso')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono"
                title="Isometric 3D View"
              >
                Isometric
              </button>
              <button
                onClick={() => setPresetView('bottom')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono"
                title="Bottom Solder Side"
              >
                Bottom
              </button>
              <button
                onClick={() => setPresetView('front')}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono"
                title="Front Edge View"
              >
                Front
              </button>
              <button
                onClick={handleResetCamera}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Reset Camera & Auto-Rotate"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsAutoRotate(!isAutoRotate)}
                className={`p-1 rounded ${isAutoRotate ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}`}
                title={isAutoRotate ? 'Pause Rotation' : 'Resume Auto-Rotation'}
              >
                {isAutoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
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
          {is3DMode ? (
            <div
              onMouseDown={(e) => {
                setIsDragging3D(true);
                setIsAutoRotate(false);
                setDragStart({ x: e.clientX, y: e.clientY });
              }}
              onMouseMove={(e) => {
                if (!isDragging3D) return;
                const dx = e.clientX - dragStart.x;
                const dy = e.clientY - dragStart.y;
                setRotY((r) => r + dx * 0.008);
                setRotX((r) => Math.max(0.01, Math.min(Math.PI - 0.01, r + dy * 0.008)));
                setDragStart({ x: e.clientX, y: e.clientY });
              }}
              onMouseUp={() => setIsDragging3D(false)}
              onWheel={(e) => {
                e.preventDefault();
                setZoom3D((z) => Math.max(0.5, Math.min(2.5, z - e.deltaY * 0.001)));
              }}
              className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing relative"
            >
              <canvas
                ref={canvas3dRef}
                width={850}
                height={550}
                className="max-w-full max-h-full rounded-2xl border border-slate-800 shadow-2xl"
              />
              <div className="absolute bottom-4 left-4 text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800 backdrop-blur pointer-events-none flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>Drag to Orbit | Wheel to Zoom | Presets: Top / Iso / Bottom</span>
              </div>
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
