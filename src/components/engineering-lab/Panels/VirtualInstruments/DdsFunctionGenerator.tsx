'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
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
  const [selectedChannel, setSelectedChannel] = useState<'CH1' | 'CH2'>('CH1');
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Active channel configuration
  const ch2Config = useMemo(() => ({
    waveform: fg.channel2?.waveform || 'sine',
    frequencyHz: fg.channel2?.frequencyHz || 1000,
    amplitudeV: fg.channel2?.amplitudeV !== undefined ? fg.channel2.amplitudeV : 5.0,
    offsetV: fg.channel2?.offsetV || 0,
    dutyCycle: fg.channel2?.dutyCycle ?? 0.5,
    enabled: fg.channel2?.enabled ?? false,
    outputNet: fg.channel2?.outputNet || '',
  }), [fg.channel2]);

  const ch1Config = useMemo(() => ({
    waveform: fg.waveform || 'sine',
    frequencyHz: fg.frequencyHz || 1000,
    amplitudeV: fg.amplitudeV !== undefined ? fg.amplitudeV : 5.0,
    offsetV: fg.offsetV || 0,
    dutyCycle: fg.dutyCycle ?? 0.5,
    enabled: fg.enabled,
    outputNet: fg.outputNet || '',
  }), [fg]);

  const activeConfig = selectedChannel === 'CH1' ? ch1Config : ch2Config;

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

  // Helper to update active channel settings
  const updateActiveChannel = (updates: Partial<typeof activeConfig>) => {
    if (selectedChannel === 'CH1') {
      onUpdateInstruments({
        ...instruments,
        functionGenerator: {
          ...fg,
          ...updates,
        },
      });
    } else {
      onUpdateInstruments({
        ...instruments,
        functionGenerator: {
          ...fg,
          channel2: {
            ...ch2Config,
            ...updates,
          },
        },
      });
    }
  };

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

      const isCh1 = selectedChannel === 'CH1';
      const traceColor = activeConfig.enabled
        ? (isCh1 ? '#A855F7' : '#06B6D4')
        : '#64748B';

      ctx.strokeStyle = traceColor;
      ctx.lineWidth = 2.5;
      if (activeConfig.enabled) {
        ctx.shadowColor = traceColor;
        ctx.shadowBlur = 8;
      }
      ctx.beginPath();

      const numPoints = 140;
      const cycles = 3;
      const ampRatio = Math.min(1.0, (activeConfig.amplitudeV || 5) / 15);
      const ampPx = (height / 2.5) * ampRatio;
      const offsetRatio = ((activeConfig.offsetV || 0) / 15) * (height / 3);
      const midY = height / 2 - offsetRatio;

      for (let i = 0; i < numPoints; i++) {
        const x = (i / (numPoints - 1)) * width;
        const normTime = (i / numPoints) * cycles + phaseOffset;
        const phase = normTime % 1.0;
        let yOffset = 0;

        if (activeConfig.waveform === 'square') {
          const duty = activeConfig.dutyCycle ?? 0.5;
          yOffset = phase < duty ? -ampPx : ampPx;
        } else if (activeConfig.waveform === 'triangle') {
          yOffset = -ampPx * (4 * Math.abs(phase - 0.5) - 1);
        } else if (activeConfig.waveform === 'sawtooth') {
          yOffset = -ampPx * (2 * phase - 1);
        } else if (activeConfig.waveform === 'pulse') {
          yOffset = phase < 0.15 ? -ampPx : 0;
        } else if (activeConfig.waveform === 'noise') {
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

      if (activeConfig.enabled) {
        phaseOffset = (phaseOffset + 0.02) % 1.0;
        animId = requestAnimationFrame(render);
      }
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [activeConfig, selectedChannel]);

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

          {/* Master Output Enable / Disable Button for Active Channel */}
          <button
            onClick={() => {
              const nextState = !activeConfig.enabled;
              updateActiveChannel({ enabled: nextState });
              toast.info(nextState ? `⚡ AWG ${selectedChannel} Enabled: Signal Active` : `⚡ AWG ${selectedChannel} Disabled: High-Z`);
            }}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold cursor-pointer transition-all shadow-md ${
              activeConfig.enabled
                ? selectedChannel === 'CH1'
                  ? 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-400 ring-2 ring-purple-400/30'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-400 ring-2 ring-cyan-400/30'
                : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            <Power className={`w-3.5 h-3.5 ${activeConfig.enabled ? 'text-white' : 'text-slate-500'}`} />
            <span>{selectedChannel} {activeConfig.enabled ? 'OUTPUT ON' : 'OUTPUT OFF'}</span>
          </button>
        </div>

        {/* Dual Channel Switcher Tabs */}
        <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedChannel('CH1')}
              className={`px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                selectedChannel === 'CH1'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${ch1Config.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>CHANNEL 1 (CH1)</span>
              {ch1Config.enabled && <span className="text-[10px] bg-purple-900/80 px-1.5 py-0.2 rounded">LIVE</span>}
            </button>

            <button
              onClick={() => setSelectedChannel('CH2')}
              className={`px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                selectedChannel === 'CH2'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${ch2Config.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>CHANNEL 2 (CH2)</span>
              {ch2Config.enabled && <span className="text-[10px] bg-cyan-900/80 px-1.5 py-0.2 rounded">LIVE</span>}
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-mono pr-2">
            Independent Synthesizer Engines
          </div>
        </div>

        {/* Real-time Dynamic Waveform Preview Screen */}
        <div className="bg-[#030914] border-2 border-slate-800 rounded-xl p-4 shadow-inner relative space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 border-b border-slate-900 pb-2">
            <div className="flex items-center gap-2">
              <Waves className={`w-4 h-4 ${selectedChannel === 'CH1' ? 'text-purple-400' : 'text-cyan-400'}`} />
              <span className="text-white uppercase">{selectedChannel}: {activeConfig.waveform} WAVEFORM</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`${selectedChannel === 'CH1' ? 'text-purple-300' : 'text-cyan-300'} font-bold`}>
                {activeConfig.frequencyHz >= 1000 ? `${(activeConfig.frequencyHz / 1000).toFixed(2)} kHz` : `${activeConfig.frequencyHz} Hz`}
              </span>
              <span className="text-emerald-300 font-bold">{activeConfig.amplitudeV} Vpp</span>
              <span className="text-slate-400">Offset: {activeConfig.offsetV >= 0 ? `+${activeConfig.offsetV}` : activeConfig.offsetV}V</span>
            </div>
          </div>

          <div className="w-full h-28 relative rounded overflow-hidden">
            <canvas ref={previewCanvasRef} width={600} height={120} className="w-full h-full block" />
          </div>
        </div>

        {/* Waveform Shape Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {selectedChannel} Synthesized Waveform Shape
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
                onClick={() => updateActiveChannel({ waveform: w.id as 'sine' | 'square' | 'triangle' | 'sawtooth' | 'pulse' | 'noise' })}
                className={`py-2 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                  activeConfig.waveform === w.id
                    ? selectedChannel === 'CH1'
                      ? 'bg-purple-600 border-purple-400 text-white shadow-lg font-black'
                      : 'bg-cyan-600 border-cyan-400 text-white shadow-lg font-black'
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
              <span className={`${selectedChannel === 'CH1' ? 'text-purple-400' : 'text-cyan-400'} font-bold text-sm`}>
                {activeConfig.frequencyHz >= 1000 ? `${(activeConfig.frequencyHz / 1000).toFixed(2)} kHz` : `${activeConfig.frequencyHz} Hz`}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={50000}
              step={10}
              value={activeConfig.frequencyHz || 1000}
              onChange={(e) => updateActiveChannel({ frequencyHz: Number(e.target.value) })}
              className={`w-full cursor-pointer ${selectedChannel === 'CH1' ? 'accent-purple-500' : 'accent-cyan-400'}`}
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
                  onClick={() => updateActiveChannel({ frequencyHz: b.val })}
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
              <span className="text-emerald-400 font-bold text-sm">{activeConfig.amplitudeV || 5.0} V</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={20.0}
              step={0.5}
              value={activeConfig.amplitudeV || 5.0}
              onChange={(e) => updateActiveChannel({ amplitudeV: parseFloat(e.target.value) })}
              className="w-full accent-emerald-400 cursor-pointer"
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
                  onClick={() => updateActiveChannel({ amplitudeV: b.val })}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer"
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* DC Offset Slider */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-300">{selectedChannel} DC Bias Offset:</span>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold font-mono">
                {activeConfig.offsetV >= 0 ? `+${activeConfig.offsetV.toFixed(2)}` : activeConfig.offsetV.toFixed(2)} V
              </span>
              <button
                onClick={() => updateActiveChannel({ offsetV: 0 })}
                className="px-1.5 py-0.5 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                0V Reset
              </button>
            </div>
          </div>
          <input
            type="range"
            min={-5.0}
            max={5.0}
            step={0.1}
            value={activeConfig.offsetV || 0}
            onChange={(e) => updateActiveChannel({ offsetV: parseFloat(e.target.value) })}
            className="w-full accent-amber-400 cursor-pointer"
          />
        </div>

        {/* Live Circuit Injection Node Selector */}
        <div className="p-3 bg-slate-950 border border-purple-900/50 rounded-xl space-y-1.5">
          <label className="text-[11px] font-bold text-purple-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              {selectedChannel} Live Circuit Injection Node (Output Terminal)
            </span>
            <span className="text-[10px] text-slate-400">Injects directly into MNA solver net</span>
          </label>
          <select
            value={activeConfig.outputNet || ''}
            onChange={(e) => updateActiveChannel({ outputNet: e.target.value })}
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
