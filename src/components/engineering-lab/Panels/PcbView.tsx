'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { PcbLayout, CircuitComponent, CircuitWire } from '@/modules/engineering-lab/types';
import { Pcb2dEditor } from './Pcb2dEditor';
import {
  Box,
  Sliders,
  X,
  Compass,
  Layers,
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

export interface PcbViewProps {
  pcb: PcbLayout;
  components?: CircuitComponent[];
  wires?: CircuitWire[];
  projectTitle?: string;
  onExportGerber: () => void;
  is3DMode?: boolean;
  onUpdateDimensions?: (widthMm: number, heightMm: number) => void;
  onUpdatePcb?: (updated: PcbLayout) => void;
}

export function PcbView({
  pcb,
  components = [],
  wires = [],
  projectTitle = 'EI_House_PCB',
  onExportGerber,
  is3DMode = false,
  onUpdateDimensions,
  onUpdatePcb,
}: PcbViewProps) {
  // 3D Visualizer Mode State
  const [solderMaskColor, setSolderMaskColor] = useState<string>('#0B4F28');
  const [show3dComponents, setShow3dComponents] = useState<boolean>(true);
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'bot' | 'front' | 'reset' | null>(null);
  const [isStackupHudOpen, setIsStackupHudOpen] = useState(false);
  const [showStackupModal, setShowStackupModal] = useState(false);
  const [copperLayers, setCopperLayers] = useState<2 | 4 | 6 | 8>(pcb.copperLayers || 2);
  const [boardThicknessMm, setBoardThicknessMm] = useState<number>(pcb.boardThicknessMm || 1.6);
  const [copperWeightOz, setCopperWeightOz] = useState<number>(1);

  // If in 2D Layout & Routing mode, render the pro Pcb2dEditor
  if (!is3DMode) {
    return (
      <Pcb2dEditor
        pcb={pcb}
        components={components}
        wires={wires}
        projectTitle={projectTitle}
        onUpdatePcb={onUpdatePcb}
        onUpdateDimensions={onUpdateDimensions}
        onExportGerber={onExportGerber}
      />
    );
  }

  // 3D Photorealistic WebGL Visualizer Mode
  return (
    <div className="flex-1 flex flex-col bg-[#070D18] text-slate-200 select-none overflow-hidden h-full">
      {/* 3D Top Toolbar */}
      <div className="h-11 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 sm:px-4 shrink-0 overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-300">
            <Box className="w-4 h-4 text-emerald-400" />
            <span className="font-bold hidden sm:inline">3D PCB Visualizer</span>
            <span className="font-bold sm:hidden">PCB 3D</span>
          </div>

          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800 font-mono text-[11px]">
            <span className="text-slate-500 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              Camera:
            </span>
            <button
              type="button"
              onClick={() => setCameraPreset('top')}
              className="px-2 py-0.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer transition-colors"
              title="Top View (F.Cu)"
            >
              Top
            </button>
            <button
              type="button"
              onClick={() => setCameraPreset('iso')}
              className="px-2 py-0.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer transition-colors"
              title="Isometric 3D Perspective"
            >
              Isometric
            </button>
            <button
              type="button"
              onClick={() => setCameraPreset('bot')}
              className="px-2 py-0.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer transition-colors"
              title="Bottom View (B.Cu)"
            >
              Bottom
            </button>
            <button
              type="button"
              onClick={() => setCameraPreset('front')}
              className="px-2 py-0.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer transition-colors"
              title="Front Edge View"
            >
              Front
            </button>
            <button
              type="button"
              onClick={() => setCameraPreset('reset')}
              className="px-2 py-0.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer transition-colors"
              title="Reset Camera"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setIsStackupHudOpen((prev) => !prev)}
              className={`ml-2 px-2.5 py-0.5 rounded flex items-center gap-1 font-mono text-[11px] transition-colors cursor-pointer ${
                isStackupHudOpen
                  ? 'bg-cyan-950 border border-cyan-500 text-cyan-300 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title="Toggle PCB Layer Stack & Fabrication HUD"
            >
              <Sliders className="w-3 h-3 text-cyan-400" />
              <span>Stackup</span>
            </button>
            <button
              type="button"
              onClick={() => setShow3dComponents((prev) => !prev)}
              className={`ml-2 px-2.5 py-0.5 rounded flex items-center gap-1 font-mono text-[11px] transition-colors cursor-pointer ${
                show3dComponents
                  ? 'bg-emerald-950 border border-emerald-500 text-emerald-300 font-bold'
                  : 'bg-cyan-950 border border-cyan-500 text-cyan-300 font-bold'
              }`}
              title="Toggle 3D Populated Components vs Bare Board"
            >
              <Layers className="w-3 h-3" />
              <span>{show3dComponents ? 'Populated' : 'Bare PCB'}</span>
            </button>
          </div>
        </div>

        {/* Right Section: Soldermask Colors */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-mono text-[11px] mr-1">Mask:</span>
            <div className="flex items-center gap-1">
              {[
                { name: 'Green', color: '#0B4F28' },
                { name: 'Black', color: '#141619' },
                { name: 'Blue', color: '#0E3A75' },
                { name: 'Red', color: '#7A1216' },
                { name: 'White', color: '#EAECEF' },
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
        </div>
      </div>

      {/* Main 3D Canvas */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Floating Stackup HUD */}
        {isStackupHudOpen && (
          <div className="absolute top-6 left-6 bg-[#0B1528]/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-2xl font-mono text-xs z-30 flex flex-col gap-1.5 pointer-events-auto min-w-[250px] animate-in fade-in duration-150">
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
              <button
                type="button"
                onClick={() => setIsStackupHudOpen(false)}
                className="text-slate-400 hover:text-white p-0.5 hover:bg-slate-800 rounded ml-1 transition-colors"
                title="Close Stackup HUD"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-300">
              <div>Dimensions: <strong className="text-cyan-400">{pcb.widthMm} × {pcb.heightMm} mm</strong></div>
              <div>Thickness: <strong className="text-cyan-400">{boardThicknessMm} mm</strong></div>
              <div>Finished Cu: <strong className="text-amber-400">{copperWeightOz} oz (35µm)</strong></div>
              <div>Surface: <strong className="text-amber-400">ENIG Gold</strong></div>
            </div>
          </div>
        )}

        <div className="w-full h-full relative">
          <Pcb3dViewer
            pcb={pcb}
            solderMaskColor={solderMaskColor}
            cameraPreset={cameraPreset}
            show3dComponents={show3dComponents}
          />
        </div>
      </div>

      {/* Stackup Modal */}
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
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Copper Layer Count</label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 4, 6, 8].map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setCopperLayers(l as 2 | 4 | 6 | 8)}
                      className={`py-2 px-2 rounded border text-center font-bold text-[11px] transition-all ${
                        copperLayers === l
                          ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {l} Layers
                    </button>
                  ))}
                </div>
              </div>

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
