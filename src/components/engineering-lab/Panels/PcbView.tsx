'use client';

import React, { useRef, useEffect, useState } from 'react';
import { PcbLayout } from '@/modules/engineering-lab/types';
import { Layers, Box, Download, AlertTriangle, CheckCircle } from 'lucide-react';

interface PcbViewProps {
  pcb: PcbLayout;
  onExportGerber: () => void;
  is3DMode?: boolean;
}

export function PcbView({ pcb, onExportGerber, is3DMode = false }: PcbViewProps) {
  const canvas2dRef = useRef<HTMLCanvasElement>(null);
  const canvas3dRef = useRef<HTMLCanvasElement>(null);

  const [visibleLayers, setVisibleLayers] = useState({
    topCopper: true,
    bottomCopper: true,
    silkscreen: true,
    drillHoles: true,
  });

  // 3D Orbit & Tilt State
  const [rotY, setRotY] = useState(0.4); // horizontal angle
  const [rotX, setRotX] = useState(0.6); // tilt angle
  const [zoom3D, setZoom3D] = useState(1.1);
  const [isDragging3D, setIsDragging3D] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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
    const scale = Math.min((width - 80) / pcb.widthMm, (height - 80) / pcb.heightMm);
    const offsetX = (width - pcb.widthMm * scale) / 2;
    const offsetY = (height - pcb.heightMm * scale) / 2;

    // 1. Draw FR4 Board Substrate (Green Soldermask)
    ctx.fillStyle = '#064E3B';
    ctx.strokeStyle = '#047857';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(offsetX, offsetY, pcb.widthMm * scale, pcb.heightMm * scale, 8);
    ctx.fill();
    ctx.stroke();

    // 2. Draw Bottom Copper Tracks (Blue)
    if (visibleLayers.bottomCopper) {
      ctx.strokeStyle = '#3B82F6';
      ctx.lineCap = 'round';
      pcb.tracks
        .filter((t) => t.layer === 'bottom_copper')
        .forEach((t) => {
          ctx.lineWidth = Math.max(t.widthMm * scale, 1.5);
          ctx.beginPath();
          ctx.moveTo(offsetX + t.from.x * scale, offsetY + t.from.y * scale);
          ctx.lineTo(offsetX + t.to.x * scale, offsetY + t.to.y * scale);
          ctx.stroke();
        });
    }

    // 3. Draw Top Copper Tracks (Red)
    if (visibleLayers.topCopper) {
      ctx.strokeStyle = '#EF4444';
      ctx.lineCap = 'round';
      pcb.tracks
        .filter((t) => t.layer === 'top_copper')
        .forEach((t) => {
          ctx.lineWidth = Math.max(t.widthMm * scale, 1.5);
          ctx.beginPath();
          ctx.moveTo(offsetX + t.from.x * scale, offsetY + t.from.y * scale);
          ctx.lineTo(offsetX + t.to.x * scale, offsetY + t.to.y * scale);
          ctx.stroke();
        });
    }

    // 4. Draw Copper Pads (Gold / Tin Plated)
    pcb.pads.forEach((pad) => {
      const px = offsetX + pad.x * scale;
      const py = offsetY + pad.y * scale;
      const radius = (pad.diameterMm * scale) / 2;

      ctx.fillStyle = '#F59E0B'; // Copper pad annular ring
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

    // 5. Silkscreen Labels
    if (visibleLayers.silkscreen) {
      ctx.fillStyle = '#F8FAFC';
      ctx.font = '10px monospace';
      ctx.fillText('EI HOUSE ENG LAB', offsetX + 10, offsetY + 20);
      ctx.fillText(`REV 1.0 (${pcb.widthMm}x${pcb.heightMm}mm)`, offsetX + 10, offsetY + pcb.heightMm * scale - 12);
    }
  }, [pcb, visibleLayers, is3DMode]);

  // ----------------------------------------------------
  // Native 3D PCB Canvas Projection & Orbit Engine
  // ----------------------------------------------------
  useEffect(() => {
    if (!is3DMode) return;
    const canvas = canvas3dRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render3D = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Dark futuristic lab environment
      ctx.fillStyle = '#050B14';
      ctx.fillRect(0, 0, width, height);

      // Radial floor glow under the board
      const glowGrad = ctx.createRadialGradient(width / 2, height / 2 + 80, 20, width / 2, height / 2 + 80, 250);
      glowGrad.addColorStop(0, 'rgba(16, 185, 129, 0.15)');
      glowGrad.addColorStop(1, 'rgba(5, 11, 20, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const scale = 5.2 * zoom3D;

      // 3D rotation projection helper
      const project3D = (x: number, y: number, z: number) => {
        // Center-relative
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
        const distance = 180;
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

      // Board Top Face (Solder Mask Green with subtle lighting)
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

      // 2. Draw 3D Top Copper Tracks
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2 * zoom3D;
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

      // 3. Draw 3D Copper Pads (Gold Plated)
      pcb.pads.forEach((pad) => {
        const p = project3D(pad.x, -1.8, pad.y);
        const radius = (pad.diameterMm * scale * 0.4) / 2;

        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(p.px, p.py, radius, 0, Math.PI * 2);
        ctx.fill();

        // Hole
        ctx.fillStyle = '#050D1A';
        ctx.beginPath();
        ctx.arc(p.px, p.py, radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
      });

      // 4. Draw 3D DIP-8 IC Component Body
      const icX = pcb.widthMm / 2;
      const icY = pcb.heightMm / 2;
      const icP1 = project3D(icX - 5, -6, icY - 8);
      const icP2 = project3D(icX + 5, -6, icY - 8);
      const icP3 = project3D(icX + 5, -6, icY + 8);
      const icP4 = project3D(icX - 5, -6, icY + 8);

      // IC Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      const s1 = project3D(icX - 5, -1.8, icY - 8);
      const s3 = project3D(icX + 5, -1.8, icY + 8);
      ctx.fillRect(s1.px, s1.py, s3.px - s1.px, s3.py - s1.py);

      // IC Molded Black Body
      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(icP1.px, icP1.py);
      ctx.lineTo(icP2.px, icP2.py);
      ctx.lineTo(icP3.px, icP3.py);
      ctx.lineTo(icP4.px, icP4.py);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Silkscreen text on top of IC
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('NE555P', icP1.px + 4, icP1.py + 12);

      // Auto gentle rotation when not dragging
      if (!isDragging3D) {
        setRotY((r) => r + 0.003);
      }
    };

    const renderLoop = () => {
      render3D();
      animId = requestAnimationFrame(renderLoop);
    };
    renderLoop();
    return () => cancelAnimationFrame(animId);
  }, [pcb, rotX, rotY, zoom3D, isDragging3D, is3DMode]);

  return (
    <div className="flex-1 flex flex-col bg-[#070D18] text-slate-200 select-none overflow-hidden h-full">
      {/* Top PCB Toolbar */}
      <div className="h-11 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-300">
            {is3DMode ? <Box className="w-4 h-4 text-emerald-400" /> : <Layers className="w-4 h-4 text-blue-400" />}
            <span>{is3DMode ? '3D Photorealistic PCB Visualizer' : '2D Board Layout & Copper Traces'}</span>
          </div>

          <span className="text-[11px] font-mono text-slate-500">
            Dimensions: {pcb.widthMm} x {pcb.heightMm} mm | 2 Copper Layers | FR4
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {!is3DMode ? (
            <div className="flex items-center gap-2 text-[11px] font-mono pr-3 border-r border-slate-800">
              <label className="flex items-center gap-1 text-red-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleLayers.topCopper}
                  onChange={(e) => setVisibleLayers({ ...visibleLayers, topCopper: e.target.checked })}
                  className="rounded accent-red-500"
                />
                Top (Red)
              </label>
              <label className="flex items-center gap-1 text-blue-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleLayers.bottomCopper}
                  onChange={(e) => setVisibleLayers({ ...visibleLayers, bottomCopper: e.target.checked })}
                  className="rounded accent-blue-500"
                />
                Bottom (Blue)
              </label>
            </div>
          ) : (
            <div className="text-[11px] font-mono text-slate-400 pr-3 border-r border-slate-800">
              Drag to Orbit & Tilt 3D Board
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
                setDragStart({ x: e.clientX, y: e.clientY });
              }}
              onMouseMove={(e) => {
                if (!isDragging3D) return;
                const dx = e.clientX - dragStart.x;
                const dy = e.clientY - dragStart.y;
                setRotY((r) => r + dx * 0.008);
                setRotX((r) => Math.max(0.1, Math.min(1.4, r + dy * 0.008)));
                setDragStart({ x: e.clientX, y: e.clientY });
              }}
              onMouseUp={() => setIsDragging3D(false)}
              onWheel={(e) => {
                e.preventDefault();
                setZoom3D((z) => Math.max(0.6, Math.min(2.2, z - e.deltaY * 0.001)));
              }}
              className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing relative"
            >
              <canvas
                ref={canvas3dRef}
                width={850}
                height={550}
                className="max-w-full max-h-full rounded-2xl border border-slate-800 shadow-2xl"
              />
              <div className="absolute bottom-4 left-4 text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800 backdrop-blur pointer-events-none">
                Mouse Drag: Orbit 3D Board | Wheel: Zoom
              </div>
            </div>
          ) : (
            <canvas
              ref={canvas2dRef}
              width={800}
              height={550}
              className="max-w-full max-h-full rounded-xl border border-slate-800 shadow-2xl"
            />
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
    </div>
  );
}
