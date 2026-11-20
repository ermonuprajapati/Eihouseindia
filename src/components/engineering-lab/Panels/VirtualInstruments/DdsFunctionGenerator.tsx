'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import {
  VirtualInstrumentState,
  CircuitComponent,
  CircuitWire,
} from '@/modules/engineering-lab/types';
import {
  Zap,
  Power,
  Waves,
} from 'lucide-react';
import { toast } from 'sonner';

export interface DdsFunctionGeneratorProps {
  instruments: VirtualInstrumentState;
  onUpdateInstruments: (updated: VirtualInstrumentState) => void;
  components?: CircuitComponent[];
  wires?: CircuitWire[];
}

export function DdsFunctionGenerator({
  instruments,
  onUpdateInstruments,
  components = [],
}: DdsFunctionGeneratorProps) {
  const fg = instruments.functionGenerator;
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Build list of injectable circuit nets / pins
  const targetNodes = useMemo(() => {
    const list: { id: string; label: string; group: string }[] = [];
    list.push({ id: '', label: 'Unconnected (Bench Standalone)', group: 'Floating' });

    components.forEach((comp) => {
      comp.pins.forEach((p) => {
        list.push({
          id: `${comp.id}:${p.id}`,
          label: `${comp.label} ➔ Pin ${p.name || p.id}`,
          group: 'Pins',
        });
      });
    });

    return list;
  }, [components]);

  // Real-time canvas preview of synthesized waveform
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phaseOffset = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Dark background
      ctx.fillStyle = '#050B14';
      ctx.fillRect(0, 0, width, height);

      // Subtle center axis
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Waveform trace
      ctx.strokeStyle = fg.enabled ? '#A855F7' : '#64748B';
      ctx.lineWidth = 2.5;
      if (fg.enabled) {
        ctx.shadowColor = '#A855F7';
        ctx.shadowBlur = 8;
      }
      ctx.beginPath();

      const numPoints = 120;
      const cycles = 3;
      const ampRatio = Math.min(1.0, (fg.amplitudeV || 5) / 15);
      const ampPx = (height / 2.5) * ampRatio;
      const midY = height / 2;

      for (let i = 0; i < numPoints; i++) {
        const x = (i / (numPoints - 1)) * width;
        const normTime = (i / numPoints) * cycles + phaseOffset;
        const phase = normTime % 1.0;
        let yOffset = 0;

        if (fg.waveform === 'square') {
          const duty = fg.dutyCycle ?? 0.5;
          yOffset = phase < duty ? -ampPx : ampPx;
        } else if (fg.waveform === 'triangle') {
          yOffset = -ampPx * (4 * Math.abs(phase - 0.5) - 1);
        } else if (fg.waveform === 'sawtooth') {
          yOffset = -ampPx * (2 * phase - 1);
        } else if (fg.waveform === 'pulse') {
          yOffset = phase < 0.15 ? -ampPx : 0;
        } else if (fg.waveform === 'noise') {
          yOffset = (Math.random() * 2 - 1) * ampPx;
        } else {
          // Sine
          yOffset = -ampPx * Math.sin(2 * Math.PI * normTime);
        }

        const y = midY + yOffset;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();
      ctx.shadowBlur = 0;

      if (fg.enabled) {
        phaseOffset = (phaseOffset + 0.02) % 1.0;
        animId = requestAnimationFrame(render);
      }
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [fg]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[#050B14] select-none text-slate-200 font-mono">
      {/* Benchtop DDS Synthesizer Chassis */}
      <div className="w-full max-w-2xl bg-slate-900 border-2 border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-6">
        {/* Chassis Top Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-purple-600 text-white font-black text-[10px] tracking-wider">
              DDS-2000 PRO
            </span>
            <span className="font-bold text-slate-300 uppercase tracking-widest text-[11px]">
              Dual-Channel Arbitrary Function Generator
            </span>
          </div>

          {/* Master Output Enable / Disable Button */}
          <button
            onClick={() => {
              const nextState = !fg.enabled;
              onUpdateInstruments({
                ...instruments,
                functionGenerator: { ...fg, enabled: nextState },
              });
              toast.info(nextState ? '⚡ AWG Output Enabled: Signal Active' : '⚡ AWG Output Disabled: High-Z');
            }}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold cursor-pointer transition-all shadow-md ${
              fg.enabled
                ? 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-400 ring-2 ring-purple-400/30'
                : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            <Power className={`w-3.5 h-3.5 ${fg.enabled ? 'text-white' : 'text-slate-500'}`} />
            <span>{fg.enabled ? 'OUTPUT ON' : 'OUTPUT OFF'}</span>
          </button>
        </div>

        {/* Real-time Dynamic Waveform Preview Screen */}
        <div className="bg-[#030914] border-2 border-slate-800 rounded-xl p-4 shadow-inner relative space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 border-b border-slate-900 pb-2">
            <div className="flex items-center gap-2">
              <Waves className="w-4 h-4 text-purple-400" />
              <span className="text-white uppercase">{fg.waveform} WAVEFORM</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-purple-300 font-bold">{fg.frequencyHz >= 1000 ? `${(fg.frequencyHz / 1000).toFixed(2)} kHz` : `${fg.frequencyHz} Hz`}</span>
              <span className="text-cyan-300 font-bold">{fg.amplitudeV} Vpp</span>
              <span className="text-slate-400">Offset: {fg.offsetV || 0}V</span>
            </div>
          </div>

          <div className="w-full h-28 relative rounded overflow-hidden">
            <canvas ref={previewCanvasRef} width={600} height={120} className="w-full h-full block" />
          </div>
        </div>

        {/* Waveform Shape Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Synthesized Waveform Shape
          </label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs font-bold">
            {[
              { id: 'sine', label: '∿ Sine' },
              { id: 'square', label: '⎍ Square' },
              { id: 'triangle', label: '∧ Triangle' },
              { id: 'sawtooth', label: '⧘ Ramp' },
              { id: 'pulse', label: '⎍ Pulse' },
              { id: 'noise', label: '∿ Noise' },
            ].map((w) => (
              <button
                key={w.id}
                onClick={() =>
                  onUpdateInstruments({
                    ...instruments,
                    functionGenerator: { ...fg, waveform: w.id as 'sine' | 'square' | 'triangle' | 'sawtooth' | 'pulse' | 'noise' },
                  })
                }
                className={`py-2 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                  fg.waveform === w.id
                    ? 'bg-purple-600 border-purple-400 text-white shadow-lg font-black'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* Frequency & Amplitude Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-950 border border-slate-800 rounded-xl">
          {/* Frequency Control */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300">Frequency:</span>
              <span className="text-purple-400 font-bold text-sm">
                {fg.frequencyHz >= 1000 ? `${(fg.frequencyHz / 1000).toFixed(2)} kHz` : `${fg.frequencyHz} Hz`}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={50000}
              step={10}
              value={fg.frequencyHz || 1000}
              onChange={(e) =>
                onUpdateInstruments({
                  ...instruments,
                  functionGenerator: { ...fg, frequencyHz: Number(e.target.value) },
                })
              }
              className="w-full accent-purple-500 cursor-pointer"
            />
            {/* Quick Multipliers */}
            <div className="flex gap-1.5 text-[10px] font-bold">
              {[
                { label: '100 Hz', val: 100 },
                { label: '1 kHz', val: 1000 },
                { label: '5 kHz', val: 5000 },
                { label: '10 kHz', val: 10000 },
              ].map((b) => (
                <button
                  key={b.label}
                  onClick={() =>
                    onUpdateInstruments({
                      ...instruments,
                      functionGenerator: { ...fg, frequencyHz: b.val },
                    })
                  }
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer"
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Peak Amplitude Control */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300">Peak-to-Peak (Vpp):</span>
              <span className="text-cyan-400 font-bold text-sm">{fg.amplitudeV || 5.0} V</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={20.0}
              step={0.5}
              value={fg.amplitudeV || 5.0}
              onChange={(e) =>
                onUpdateInstruments({
                  ...instruments,
                  functionGenerator: { ...fg, amplitudeV: parseFloat(e.target.value) },
                })
              }
              className="w-full accent-cyan-400 cursor-pointer"
            />
            {/* Quick Presets */}
            <div className="flex gap-1.5 text-[10px] font-bold">
              {[
                { label: '1.0 V', val: 1.0 },
                { label: '3.3 V', val: 3.3 },
                { label: '5.0 V', val: 5.0 },
                { label: '12.0 V', val: 12.0 },
              ].map((b) => (
                <button
                  key={b.label}
                  onClick={() =>
                    onUpdateInstruments({
                      ...instruments,
                      functionGenerator: { ...fg, amplitudeV: b.val },
                    })
                  }
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer"
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Circuit Injection Node Selector */}
        <div className="p-3 bg-slate-950 border border-purple-900/50 rounded-xl space-y-1.5">
          <label className="text-[11px] font-bold text-purple-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Live Circuit Injection Node (Output Terminal)
            </span>
            <span className="text-[10px] text-slate-400">Injects directly into solver net</span>
          </label>
          <select
            value={fg.outputNet || ''}
            onChange={(e) =>
              onUpdateInstruments({
                ...instruments,
                functionGenerator: { ...fg, outputNet: e.target.value },
              })
            }
            className="w-full bg-slate-900 border border-purple-800/60 rounded p-1.5 text-xs text-purple-200 font-mono"
          >
            {targetNodes.map((opt) => (
              <option key={opt.id} value={opt.id}>
                [{opt.group}] {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
