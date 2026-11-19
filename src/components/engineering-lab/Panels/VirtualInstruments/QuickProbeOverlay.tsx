'use client';

import React, { useState } from 'react';
import {
  CircuitComponent,
  CircuitWire,
  SimulationWaveformPoint,
} from '@/modules/engineering-lab/types';
import {
  Crosshair,
  X,
  Minimize2,
  Maximize2,
} from 'lucide-react';

export interface QuickProbeOverlayProps {
  components?: CircuitComponent[];
  wires?: CircuitWire[];
  simStates?: Record<string, { voltage: number; current: number; on?: boolean }>;
  wireCurrents?: Record<string, number>;
  waveformData?: Record<string, SimulationWaveformPoint[]>;
  isOpen?: boolean;
  onClose?: () => void;
}

export function QuickProbeOverlay({
  components = [],
  _wires = [],
  simStates = {},
  _wireCurrents = {},
  waveformData = {},
  isOpen = true,
  onClose,
}: QuickProbeOverlayProps & { _wires?: CircuitWire[]; _wireCurrents?: Record<string, number> }) {
  const [selectedTarget, setSelectedTarget] = useState<string>(components[0]?.id || 'VCC');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  if (!isOpen) return null;

  const targetComp = components.find((c) => c.id === selectedTarget);
  const compState = targetComp ? simStates[targetComp.id] : undefined;
  const currentV = compState ? compState.voltage : 5.0;
  const currentI = compState?.current ? Math.abs(compState.current * 1000) : 0;

  // Mini sparkline points
  const points = waveformData[selectedTarget] || Object.values(waveformData)[0] || [];

  return (
    <div className="absolute top-14 right-4 z-30 font-mono text-xs select-none">
      <div className="bg-slate-900/95 border border-cyan-500/60 rounded-xl p-3 shadow-2xl backdrop-blur w-72 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[11px] font-bold">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <Crosshair className="w-3.5 h-3.5" />
            LIVE CIRCUIT QUICK-PROBE
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Target Selector */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400">Probed Component / Node:</label>
              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
              >
                {components.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} ({c.value || c.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Readouts (Voltage & Current) */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-950 border border-slate-800 p-2 rounded-lg">
                <span className="text-[9px] text-slate-500 block uppercase font-bold">Voltage Drop</span>
                <span className="text-lg font-black text-emerald-400">{Math.abs(currentV).toFixed(2)} V</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-2 rounded-lg">
                <span className="text-[9px] text-slate-500 block uppercase font-bold">Current</span>
                <span className="text-lg font-black text-cyan-400">{currentI.toFixed(1)} mA</span>
              </div>
            </div>

            {/* Mini Sparkline Preview */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 space-y-1">
              <span className="text-[9px] text-slate-500 block uppercase font-bold px-1">Signal Sparkline</span>
              <div className="w-full h-12 relative flex items-center">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 30">
                  <line x1="0" y1="15" x2="100" y2="15" stroke="#1E293B" strokeWidth="0.5" strokeDasharray="2 2" />
                  {points.length > 1 ? (
                    <polyline
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="1.5"
                      points={points
                        .slice(-30)
                        .map((p, idx, arr) => {
                          const x = (idx / (arr.length - 1)) * 100;
                          const y = Math.min(28, Math.max(2, 15 - p.value * 2.5));
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />
                  ) : (
                    <line x1="0" y1="15" x2="100" y2="15" stroke="#38BDF8" strokeWidth="1.5" />
                  )}
                </svg>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
