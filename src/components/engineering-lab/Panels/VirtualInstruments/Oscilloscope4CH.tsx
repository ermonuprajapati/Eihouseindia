'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  SimulationWaveformPoint,
  VirtualInstrumentState,
  CircuitComponent,
  CircuitWire,
} from '@/modules/engineering-lab/types';
import {
  Play,
  Pause,
  Wand2,
  Crosshair,
  Radio,
  Power,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

export interface Oscilloscope4CHProps {
  instruments: VirtualInstrumentState;
  onUpdateInstruments: (updated: VirtualInstrumentState) => void;
  waveformData: Record<string, SimulationWaveformPoint[]>;
  isSimulating: boolean;
  components?: CircuitComponent[];
  wires?: CircuitWire[];
}

export function Oscilloscope4CH({
  instruments,
  onUpdateInstruments,
  waveformData,
  isSimulating,
  components = [],
  _wires = [],
}: Oscilloscope4CHProps & { _wires?: CircuitWire[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scopeState = instruments.oscilloscope;

  const [measureChannel, setMeasureChannel] = useState<'CH1' | 'CH2' | 'CH3' | 'CH4'>('CH1');
  const [activeTabPanel, setActiveTabPanel] = useState<'channels' | 'trigger' | 'math' | 'cursors'>('channels');
  const [isGenOutDrawerOpen, setIsGenOutDrawerOpen] = useState(false);

  // Build selectable probe points from available components and circuit nodes
  const probeOptions = useMemo(() => {
    const list: { id: string; label: string; group: string }[] = [];

    // Built-in Function Generator Output
    list.push({ id: 'gen:out', label: '⚡ AWG Gen Out (Built-in)', group: 'Generators' });

    // Components & Pins
    components.forEach((comp) => {
      list.push({ id: comp.id, label: `${comp.label} [${comp.value || comp.type}] (Across)`, group: 'Components' });
      comp.pins.forEach((p) => {
        list.push({
          id: `${comp.id}:${p.id}`,
          label: `${comp.label} ➔ Pin ${p.name || p.id}`,
          group: 'Pins',
        });
      });
    });

    // Keys present in current waveform buffer
    Object.keys(waveformData).forEach((k) => {
      if (!list.some((item) => item.id === k)) {
        list.push({ id: k, label: `Signal: ${k}`, group: 'Signals' });
      }
    });

    return list;
  }, [components, waveformData]);

  // Resolve waveform series for a given channel based on probe selection
  const getChannelPoints = useCallback(
    (ch: 'CH1' | 'CH2' | 'CH3' | 'CH4'): SimulationWaveformPoint[] => {
      let probeKey = '';
      if (ch === 'CH1') probeKey = scopeState.ch1ProbeSource || '';
      else if (ch === 'CH2') probeKey = scopeState.ch2ProbeSource || '';
      else if (ch === 'CH3') probeKey = scopeState.ch3ProbeSource || '';
      else if (ch === 'CH4') probeKey = scopeState.ch4ProbeSource || '';

      if (probeKey && waveformData[probeKey]) {
        return waveformData[probeKey];
      }

      // Default fallback by index
      const keys = Object.keys(waveformData);
      const chIdx = ch === 'CH1' ? 0 : ch === 'CH2' ? 1 : ch === 'CH3' ? 2 : 3;
      if (keys[chIdx] && waveformData[keys[chIdx]]) {
        return waveformData[keys[chIdx]];
      }

      return [];
    },
    [scopeState, waveformData]
  );

  // Auto-Set Button (Scans active signals and auto-adjusts V/Div and Timebase)
  const handleAutoSet = useCallback(() => {
    const ch1Pts = getChannelPoints('CH1');
    const ch2Pts = getChannelPoints('CH2');
    const activePts = ch1Pts.length > 5 ? ch1Pts : ch2Pts.length > 5 ? ch2Pts : Object.values(waveformData)[0];

    if (!activePts || activePts.length < 5) {
      toast.info('Auto-Set: Start simulation to acquire waveform signal for auto-scaling.');
      return;
    }

    const vals = activePts.map((p) => p.value);
    const maxV = Math.max(...vals);
    const minV = Math.min(...vals);
    const vpp = Math.max(0.01, maxV - minV);

    // Compute best V/Div so Vpp occupies ~4-6 vertical divisions of 8
    const idealVDiv = vpp / 4;
    const vSteps = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0];
    const bestVScale = vSteps.reduce((prev, curr) => (Math.abs(curr - idealVDiv) < Math.abs(prev - idealVDiv) ? curr : prev));

    // Compute frequency from zero-crossings
    const mid = (maxV + minV) / 2;
    const crossings: number[] = [];
    for (let i = 1; i < activePts.length; i++) {
      if ((activePts[i - 1].value - mid) * (activePts[i].value - mid) < 0) {
        crossings.push(activePts[i].time);
      }
    }

    let bestTimebaseMs = 50;
    if (crossings.length >= 2) {
      const avgHalfPeriod = (crossings[crossings.length - 1] - crossings[0]) / (crossings.length - 1);
      const periodSec = avgHalfPeriod * 2;
      const idealTbSec = (periodSec * 3) / 10; // 3 periods in 10 divisions
      const tbSteps = [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];
      const idealTbMs = idealTbSec * 1000;
      bestTimebaseMs = tbSteps.reduce((prev, curr) => (Math.abs(curr - idealTbMs) < Math.abs(prev - idealTbMs) ? curr : prev));
    }

    onUpdateInstruments({
      ...instruments,
      oscilloscope: {
        ...scopeState,
        ch1ScaleV: bestVScale,
        ch2ScaleV: bestVScale,
        timebaseMs: bestTimebaseMs,
        ch1OffsetV: 0,
        ch2OffsetV: 0,
        triggerLevel: Math.round(mid * 10) / 10,
        running: true,
      },
    });

    toast.success(`⚡ Auto-Set: Locked V/Div at ${bestVScale}V, Timebase at ${bestTimebaseMs}ms/Div`);
  }, [getChannelPoints, waveformData, instruments, onUpdateInstruments, scopeState]);

  // Compute Live Measurements for Selected Channel
  const activeMeasurePoints = useMemo(() => {
    return getChannelPoints(measureChannel);
  }, [getChannelPoints, measureChannel]);

  const measurements = useMemo(() => {
    if (!activeMeasurePoints || activeMeasurePoints.length < 2) {
      return {
        vmax: 0,
        vmin: 0,
        vpp: 0,
        vrms: 0,
        vavg: 0,
        freq: 0,
        periodMs: 0,
        dutyCycle: 50,
      };
    }

    const vals = activeMeasurePoints.map((p) => p.value);
    const vmax = Math.max(...vals);
    const vmin = Math.min(...vals);
    const vpp = Math.max(0, vmax - vmin);
    const vavg = vals.reduce((sum, v) => sum + v, 0) / vals.length;
    const vrms = Math.sqrt(vals.reduce((sum, v) => sum + v * v, 0) / vals.length);

    const mid = (vmax + vmin) / 2;
    const crossings: number[] = [];
    let highCount = 0;
    for (let i = 0; i < activeMeasurePoints.length; i++) {
      if (activeMeasurePoints[i].value >= mid) highCount++;
      if (i > 0 && (activeMeasurePoints[i - 1].value - mid) * (activeMeasurePoints[i].value - mid) < 0) {
        crossings.push(activeMeasurePoints[i].time);
      }
    }

    let periodMs = 0;
    let freq = 0;
    if (crossings.length >= 2) {
      const avgHalfPeriod = (crossings[crossings.length - 1] - crossings[0]) / (crossings.length - 1);
      const periodSec = avgHalfPeriod * 2;
      if (periodSec > 0.000001) {
        periodMs = periodSec * 1000;
        freq = 1.0 / periodSec;
      }
    }

    const dutyCycle = Math.round((highCount / activeMeasurePoints.length) * 100);

    return {
      vmax,
      vmin,
      vpp,
      vrms,
      vavg,
      freq,
      periodMs,
      dutyCycle,
    };
  }, [activeMeasurePoints]);

  // Canvas Waveform & CRT Graticule Renderer Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // 1. Dark CRT Phosphor Background
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, width, height);

      // 2. 10 x 8 Standard Scope Division Graticule
      const numDivX = 10;
      const numDivY = 8;
      const divW = width / numDivX;
      const divH = height / numDivY;

      // Subtle Minor Grid
      ctx.strokeStyle = '#0E1E38';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= width; x += divW) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += divH) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Subdivision Tick Marks along Major Axes
      ctx.strokeStyle = '#1E3A5F';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const midY = height / 2;
      const midX = width / 2;
      // Ticks along central horizontal axis
      for (let x = 0; x <= width; x += divW / 5) {
        ctx.moveTo(x, midY - 3);
        ctx.lineTo(x, midY + 3);
      }
      // Ticks along central vertical axis
      for (let y = 0; y <= height; y += divH / 5) {
        ctx.moveTo(midX - 3, y);
        ctx.lineTo(midX + 3, y);
      }
      ctx.stroke();

      // Major Center Crosshairs
      ctx.strokeStyle = '#1E40AF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.moveTo(midX, 0);
      ctx.lineTo(midX, height);
      ctx.stroke();

      // Trigger Level Line (Dashed)
      if (scopeState.triggerLevel !== undefined) {
        const trigY = midY - (scopeState.triggerLevel / (scopeState.ch1ScaleV || 1.0)) * divH;
        if (trigY >= 0 && trigY <= height) {
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(0, trigY);
          ctx.lineTo(width, trigY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Trigger arrow on right border
          ctx.fillStyle = '#F59E0B';
          ctx.beginPath();
          ctx.moveTo(width - 8, trigY - 4);
          ctx.lineTo(width, trigY);
          ctx.lineTo(width - 8, trigY + 4);
          ctx.closePath();
          ctx.fill();
        }
      }

      // 3. Render Channels
      const channels = [
        {
          id: 'CH1',
          name: 'CH1',
          enabled: scopeState.ch1Enabled !== false,
          color: '#EAB308', // Yellow
          scaleV: scopeState.ch1ScaleV || 1.0,
          offsetV: scopeState.ch1OffsetV || 0,
          coupling: scopeState.ch1Coupling || 'DC',
          attenuation: scopeState.ch1Attenuation || '1x',
          invert: scopeState.ch1Invert || false,
          pts: getChannelPoints('CH1'),
        },
        {
          id: 'CH2',
          name: 'CH2',
          enabled: scopeState.ch2Enabled === true,
          color: '#06B6D4', // Cyan
          scaleV: scopeState.ch2ScaleV || 1.0,
          offsetV: scopeState.ch2OffsetV || 0,
          coupling: scopeState.ch2Coupling || 'DC',
          attenuation: scopeState.ch2Attenuation || '1x',
          invert: scopeState.ch2Invert || false,
          pts: getChannelPoints('CH2'),
        },
        {
          id: 'CH3',
          name: 'CH3',
          enabled: scopeState.ch3Enabled === true,
          color: '#EC4899', // Magenta
          scaleV: scopeState.ch3ScaleV || 1.0,
          offsetV: scopeState.ch3OffsetV || 0,
          coupling: scopeState.ch3Coupling || 'DC',
          attenuation: scopeState.ch3Attenuation || '1x',
          invert: scopeState.ch3Invert || false,
          pts: getChannelPoints('CH3'),
        },
        {
          id: 'CH4',
          name: 'CH4',
          enabled: scopeState.ch4Enabled === true,
          color: '#10B981', // Green
          scaleV: scopeState.ch4ScaleV || 1.0,
          offsetV: scopeState.ch4OffsetV || 0,
          coupling: scopeState.ch4Coupling || 'DC',
          attenuation: scopeState.ch4Attenuation || '1x',
          invert: scopeState.ch4Invert || false,
          pts: getChannelPoints('CH4'),
        },
      ];

      channels.forEach((ch) => {
        if (!ch.enabled || !ch.pts || ch.pts.length < 2) return;

        ctx.strokeStyle = ch.color;
        ctx.lineWidth = 2.2;
        ctx.shadowColor = ch.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();

        const xStep = width / (ch.pts.length - 1);
        const meanV = ch.pts.reduce((s, p) => s + p.value, 0) / ch.pts.length;

        ch.pts.forEach((pt, i) => {
          let val = pt.value;
          if (ch.coupling === 'GND') val = 0;
          else if (ch.coupling === 'AC') val = val - meanV;

          if (ch.attenuation === '10x') val = val / 10;
          if (ch.invert) val = -val;

          const y = midY - ((val + ch.offsetV) / ch.scaleV) * divH;
          const x = i * xStep;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });

        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      });

      // 4. Math Channel Rendering (CH1+CH2 / CH1-CH2 / CH1*CH2)
      if (scopeState.mathMode && scopeState.mathMode !== 'off') {
        const ch1 = channels[0].pts;
        const ch2 = channels[1].pts;
        if (ch1 && ch2 && ch1.length > 2 && ch2.length > 2) {
          const len = Math.min(ch1.length, ch2.length);
          ctx.strokeStyle = '#F97316'; // Orange Math Trace
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          const xStep = width / (len - 1);

          for (let i = 0; i < len; i++) {
            let mVal = 0;
            if (scopeState.mathMode === 'CH1+CH2') mVal = ch1[i].value + ch2[i].value;
            else if (scopeState.mathMode === 'CH1-CH2') mVal = ch1[i].value - ch2[i].value;
            else if (scopeState.mathMode === 'CH1*CH2') mVal = (ch1[i].value * ch2[i].value) / 5;

            const y = midY - (mVal / (scopeState.ch1ScaleV || 1.0)) * divH;
            const x = i * xStep;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }

      // 5. Interactive Time & Voltage Measurement Cursors
      if (scopeState.cursorsEnabled) {
        const cx1 = (scopeState.cursorX1 ?? 0.25) * width;
        const cx2 = (scopeState.cursorX2 ?? 0.75) * width;
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);

        // X Cursors (Time)
        ctx.beginPath();
        ctx.moveTo(cx1, 0);
        ctx.lineTo(cx1, height);
        ctx.moveTo(cx2, 0);
        ctx.lineTo(cx2, height);
        ctx.stroke();

        ctx.setLineDash([]);
      }

      if (scopeState.running !== false && isSimulating) {
        animId = requestAnimationFrame(render);
      }
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [scopeState, waveformData, isSimulating, getChannelPoints]);

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 h-full bg-[#050B14] p-3 text-slate-200 select-none overflow-hidden font-mono text-xs">
      {/* Scope Main Screen Column */}
      <div className="flex-1 flex flex-col bg-slate-950 border border-slate-800 rounded-xl p-3 shadow-2xl relative min-w-0">
        {/* Top Scope Status & Channel Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] mb-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-bold text-white">
              <span className={`w-2 h-2 rounded-full ${scopeState.running !== false ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              {scopeState.running !== false ? 'DSO RUNNING' : 'DSO STOPPED'}
            </span>
            <div className="h-3 w-px bg-slate-800" />
            <span className="text-yellow-400 font-bold">CH1: {scopeState.ch1ScaleV || 1.0}V</span>
            <span className="text-cyan-400 font-bold">CH2: {scopeState.ch2ScaleV || 1.0}V</span>
            {scopeState.ch3Enabled && <span className="text-pink-400 font-bold">CH3: {scopeState.ch3ScaleV || 1.0}V</span>}
            {scopeState.ch4Enabled && <span className="text-emerald-400 font-bold">CH4: {scopeState.ch4ScaleV || 1.0}V</span>}
            <span className="text-slate-400 font-bold">TB: {scopeState.timebaseMs || 50}ms</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Built-in Function Generator Dock Button */}
            <button
              onClick={() => setIsGenOutDrawerOpen(!isGenOutDrawerOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-bold cursor-pointer transition-all ${
                isGenOutDrawerOpen || instruments.functionGenerator.enabled
                  ? 'bg-purple-950/90 border border-purple-500 text-purple-300 shadow-md ring-1 ring-purple-500/50'
                  : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Toggle Built-in AWG Function Generator Dock (DSO4254C Hardware Dock)"
            >
              <Radio className="w-3.5 h-3.5 text-purple-400" />
              <span>Gen Out {instruments.functionGenerator.enabled ? '⚡' : ''}</span>
            </button>

            <button
              onClick={handleAutoSet}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500 text-amber-300 font-bold cursor-pointer transition-all"
              title="Automatically scale V/Div and Timebase to fit active waveforms cleanly"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Auto-Set</span>
            </button>
            <button
              onClick={() =>
                onUpdateInstruments({
                  ...instruments,
                  oscilloscope: {
                    ...scopeState,
                    running: scopeState.running === false ? true : false,
                  },
                })
              }
              className={`flex items-center gap-1 px-3 py-1 rounded font-bold cursor-pointer transition-all ${
                scopeState.running !== false
                  ? 'bg-rose-950/80 border border-rose-600 text-rose-300 hover:bg-rose-900'
                  : 'bg-emerald-950/80 border border-emerald-500 text-emerald-300 hover:bg-emerald-900'
              }`}
            >
              {scopeState.running !== false ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
              <span>{scopeState.running !== false ? 'Stop' : 'Run'}</span>
            </button>
          </div>
        </div>

        {/* Built-in Function Generator Dock Drawer (DSO4254C style) */}
        {isGenOutDrawerOpen && (
          <div className="mb-2 p-3 bg-slate-900/95 border border-purple-800/80 rounded-xl shadow-2xl space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between pb-1.5 border-b border-purple-900/60 text-[11px] font-bold">
              <span className="flex items-center gap-1.5 text-purple-300 uppercase tracking-wider">
                <Radio className="w-3.5 h-3.5 text-purple-400" />
                Built-in AWG Function Generator (DSO Gen Out)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const nextState = !instruments.functionGenerator.enabled;
                    onUpdateInstruments({
                      ...instruments,
                      functionGenerator: { ...instruments.functionGenerator, enabled: nextState },
                    });
                    toast.info(nextState ? '⚡ Gen Out Enabled: Signal Driving Load' : '⚡ Gen Out Disabled: High-Z');
                  }}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                    instruments.functionGenerator.enabled
                      ? 'bg-purple-600 text-white border border-purple-400'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  <Power className="w-3 h-3" />
                  <span>{instruments.functionGenerator.enabled ? 'OUTPUT ON' : 'OUTPUT OFF'}</span>
                </button>
                <button
                  onClick={() => setIsGenOutDrawerOpen(false)}
                  className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              {/* Waveform Selector */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold">Waveform Shape:</label>
                <select
                  value={instruments.functionGenerator.waveform}
                  onChange={(e) =>
                    onUpdateInstruments({
                      ...instruments,
                      functionGenerator: { ...instruments.functionGenerator, waveform: e.target.value as 'sine' | 'square' | 'triangle' | 'sawtooth' | 'pulse' | 'noise' },
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-purple-300 font-bold"
                >
                  <option value="sine">∿ Sine Wave</option>
                  <option value="square">⎍ Square Wave</option>
                  <option value="triangle">∧ Triangle Wave</option>
                  <option value="sawtooth">⧘ Ramp / Sawtooth</option>
                  <option value="pulse">⎍ Pulse / PWM</option>
                  <option value="noise">∿ Random Noise</option>
                </select>
              </div>

              {/* Frequency */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400 font-bold">Frequency:</span>
                  <span className="text-purple-300 font-bold">
                    {instruments.functionGenerator.frequencyHz >= 1000
                      ? `${(instruments.functionGenerator.frequencyHz / 1000).toFixed(2)} kHz`
                      : `${instruments.functionGenerator.frequencyHz} Hz`}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20000}
                  step={10}
                  value={instruments.functionGenerator.frequencyHz || 1000}
                  onChange={(e) =>
                    onUpdateInstruments({
                      ...instruments,
                      functionGenerator: { ...instruments.functionGenerator, frequencyHz: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* Amplitude (Vpp) */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400 font-bold">Amplitude:</span>
                  <span className="text-cyan-300 font-bold">{instruments.functionGenerator.amplitudeV || 5} Vpp</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={15}
                  step={0.5}
                  value={instruments.functionGenerator.amplitudeV || 5}
                  onChange={(e) =>
                    onUpdateInstruments({
                      ...instruments,
                      functionGenerator: { ...instruments.functionGenerator, amplitudeV: parseFloat(e.target.value) },
                    })
                  }
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Target Node Injection */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold">Inject to Circuit Node:</label>
                <select
                  value={instruments.functionGenerator.outputNet || ''}
                  onChange={(e) =>
                    onUpdateInstruments({
                      ...instruments,
                      functionGenerator: { ...instruments.functionGenerator, outputNet: e.target.value },
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-amber-300 font-bold text-[11px]"
                >
                  <option value="">None (Scope Probe &apos;gen:out&apos; only)</option>
                  {probeOptions
                    .filter((p) => p.id !== 'gen:out')
                    .map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        [{opt.group}] {opt.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 10x8 CRT Reticle Canvas Display */}
        <div className="flex-1 w-full min-h-[320px] relative bg-[#030712] rounded-lg overflow-hidden border border-slate-900 shadow-inner">
          <canvas
            ref={canvasRef}
            width={900}
            height={460}
            className="w-full h-full block"
          />

          {/* Graticule Overlay Labels */}
          <div className="absolute top-2 left-2 text-[10px] text-slate-500 pointer-events-none">
            100 kSa/s 12-Bit ADC • Rigol/Hantek Calibration Standard
          </div>
          <div className="absolute top-2 right-2 text-[10px] text-amber-400/80 pointer-events-none">
            Trig: {scopeState.triggerSource || 'CH1'} [{scopeState.triggerEdge || 'Rising'} ↗ {scopeState.triggerLevel ?? 0}V]
          </div>
        </div>

        {/* Real-Time Automated Measurement Bar (Bottom of Scope) */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
              Automated Measurements
            </span>
            <div className="flex items-center gap-1">
              {(['CH1', 'CH2', 'CH3', 'CH4'] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setMeasureChannel(ch)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                    measureChannel === ch
                      ? ch === 'CH1'
                        ? 'bg-yellow-500/30 border border-yellow-500 text-yellow-300'
                        : ch === 'CH2'
                        ? 'bg-cyan-500/30 border border-cyan-500 text-cyan-300'
                        : ch === 'CH3'
                        ? 'bg-pink-500/30 border border-pink-500 text-pink-300'
                        : 'bg-emerald-500/30 border border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5 text-center font-mono">
            <div className="bg-slate-900/90 border border-slate-800 p-1.5 rounded">
              <span className="text-[9px] text-slate-500 block">Vmax</span>
              <span className="text-white font-bold">{measurements.vmax.toFixed(2)}V</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-1.5 rounded">
              <span className="text-[9px] text-slate-500 block">Vmin</span>
              <span className="text-white font-bold">{measurements.vmin.toFixed(2)}V</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-1.5 rounded">
              <span className="text-[9px] text-slate-500 block">Vpp</span>
              <span className="text-cyan-300 font-bold">{measurements.vpp.toFixed(2)}V</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-1.5 rounded">
              <span className="text-[9px] text-slate-500 block">Vrms</span>
              <span className="text-cyan-300 font-bold">{measurements.vrms.toFixed(2)}V</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-1.5 rounded">
              <span className="text-[9px] text-slate-500 block">Vavg</span>
              <span className="text-slate-300 font-bold">{measurements.vavg.toFixed(2)}V</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-1.5 rounded">
              <span className="text-[9px] text-slate-500 block">Frequency</span>
              <span className="text-amber-300 font-bold">
                {measurements.freq >= 1000
                  ? `${(measurements.freq / 1000).toFixed(2)} kHz`
                  : measurements.freq > 0
                  ? `${measurements.freq.toFixed(1)} Hz`
                  : '--'}
              </span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-1.5 rounded">
              <span className="text-[9px] text-slate-500 block">Period</span>
              <span className="text-amber-300 font-bold">
                {measurements.periodMs >= 1
                  ? `${measurements.periodMs.toFixed(2)} ms`
                  : measurements.periodMs > 0
                  ? `${(measurements.periodMs * 1000).toFixed(1)} µs`
                  : '--'}
              </span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-1.5 rounded">
              <span className="text-[9px] text-slate-500 block">Duty Cycle</span>
              <span className="text-emerald-300 font-bold">{measurements.dutyCycle}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Deck (Channels, Vertical, Horizontal, Trigger, Math, Cursors) */}
      <div className="w-full lg:w-80 bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col space-y-3 shrink-0">
        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-950 rounded-lg text-[10px] font-bold">
          <button
            onClick={() => setActiveTabPanel('channels')}
            className={`py-1.5 rounded transition-colors ${
              activeTabPanel === 'channels' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Channels
          </button>
          <button
            onClick={() => setActiveTabPanel('trigger')}
            className={`py-1.5 rounded transition-colors ${
              activeTabPanel === 'trigger' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Trigger
          </button>
          <button
            onClick={() => setActiveTabPanel('math')}
            className={`py-1.5 rounded transition-colors ${
              activeTabPanel === 'math' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Math
          </button>
          <button
            onClick={() => setActiveTabPanel('cursors')}
            className={`py-1.5 rounded transition-colors ${
              activeTabPanel === 'cursors' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cursors
          </button>
        </div>

        {/* Tab 1: Channels Controls (CH1 - CH4) */}
        {activeTabPanel === 'channels' && (
          <div className="space-y-3 overflow-y-auto max-h-[520px] pr-1">
            {/* Horizontal Timebase Setting */}
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-300 font-bold">
                <span>HORIZONTAL TIMEBASE</span>
                <span className="text-cyan-400 font-bold">{scopeState.timebaseMs || 50} ms/Div</span>
              </div>
              <select
                value={scopeState.timebaseMs || 50}
                onChange={(e) =>
                  onUpdateInstruments({
                    ...instruments,
                    oscilloscope: { ...scopeState, timebaseMs: Number(e.target.value) },
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
              >
                {[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500].map((t) => (
                  <option key={t} value={t}>
                    {t < 1 ? `${t * 1000} µs / Div` : `${t} ms / Div`}
                  </option>
                ))}
              </select>
            </div>

            {/* CH1 Channel Box */}
            <div className="p-2.5 rounded bg-slate-950 border border-yellow-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-yellow-400 font-bold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  CHANNEL 1
                </span>
                <button
                  onClick={() =>
                    onUpdateInstruments({
                      ...instruments,
                      oscilloscope: { ...scopeState, ch1Enabled: scopeState.ch1Enabled === false },
                    })
                  }
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    scopeState.ch1Enabled !== false ? 'bg-yellow-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {scopeState.ch1Enabled !== false ? 'ENABLED' : 'MUTED'}
                </button>
              </div>

              {/* Probe Selector */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">Probe Point (Net / Pin):</label>
                <select
                  value={scopeState.ch1ProbeSource || ''}
                  onChange={(e) =>
                    onUpdateInstruments({
                      ...instruments,
                      oscilloscope: { ...scopeState, ch1ProbeSource: e.target.value },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-yellow-300"
                >
                  <option value="">Auto Detect (Signal 1)</option>
                  {probeOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      [{opt.group}] {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* V/Div & Coupling */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block">V/Div</label>
                  <select
                    value={scopeState.ch1ScaleV || 1.0}
                    onChange={(e) =>
                      onUpdateInstruments({
                        ...instruments,
                        oscilloscope: { ...scopeState, ch1ScaleV: Number(e.target.value) },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px] text-white"
                  >
                    {[0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0].map((v) => (
                      <option key={v} value={v}>
                        {v < 1 ? `${v * 1000} mV` : `${v} V`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">Coupling</label>
                  <select
                    value={scopeState.ch1Coupling || 'DC'}
                    onChange={(e) =>
                      onUpdateInstruments({
                        ...instruments,
                        oscilloscope: { ...scopeState, ch1Coupling: e.target.value as 'DC' | 'AC' | 'GND' },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px] text-white"
                  >
                    <option value="DC">DC</option>
                    <option value="AC">AC</option>
                    <option value="GND">GND</option>
                  </select>
                </div>
              </div>
            </div>

            {/* CH2 Channel Box */}
            <div className="p-2.5 rounded bg-slate-950 border border-cyan-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  CHANNEL 2
                </span>
                <button
                  onClick={() =>
                    onUpdateInstruments({
                      ...instruments,
                      oscilloscope: { ...scopeState, ch2Enabled: !scopeState.ch2Enabled },
                    })
                  }
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    scopeState.ch2Enabled ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {scopeState.ch2Enabled ? 'ENABLED' : 'MUTED'}
                </button>
              </div>

              {/* Probe Selector */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">Probe Point (Net / Pin):</label>
                <select
                  value={scopeState.ch2ProbeSource || ''}
                  onChange={(e) =>
                    onUpdateInstruments({
                      ...instruments,
                      oscilloscope: { ...scopeState, ch2ProbeSource: e.target.value },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-cyan-300"
                >
                  <option value="">Auto Detect (Signal 2)</option>
                  {probeOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      [{opt.group}] {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* V/Div & Coupling */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block">V/Div</label>
                  <select
                    value={scopeState.ch2ScaleV || 1.0}
                    onChange={(e) =>
                      onUpdateInstruments({
                        ...instruments,
                        oscilloscope: { ...scopeState, ch2ScaleV: Number(e.target.value) },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px] text-white"
                  >
                    {[0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0].map((v) => (
                      <option key={v} value={v}>
                        {v < 1 ? `${v * 1000} mV` : `${v} V`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">Coupling</label>
                  <select
                    value={scopeState.ch2Coupling || 'DC'}
                    onChange={(e) =>
                      onUpdateInstruments({
                        ...instruments,
                        oscilloscope: { ...scopeState, ch2Coupling: e.target.value as 'DC' | 'AC' | 'GND' },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-[11px] text-white"
                  >
                    <option value="DC">DC</option>
                    <option value="AC">AC</option>
                    <option value="GND">GND</option>
                  </select>
                </div>
              </div>
            </div>

            {/* CH3 Channel Box */}
            <div className="p-2.5 rounded bg-slate-950 border border-pink-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-pink-400 font-bold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-400" />
                  CHANNEL 3
                </span>
                <button
                  onClick={() =>
                    onUpdateInstruments({
                      ...instruments,
                      oscilloscope: { ...scopeState, ch3Enabled: !scopeState.ch3Enabled },
                    })
                  }
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    scopeState.ch3Enabled ? 'bg-pink-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {scopeState.ch3Enabled ? 'ENABLED' : 'OFF'}
                </button>
              </div>

              {scopeState.ch3Enabled && (
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400">Probe Point:</label>
                  <select
                    value={scopeState.ch3ProbeSource || ''}
                    onChange={(e) =>
                      onUpdateInstruments({
                        ...instruments,
                        oscilloscope: { ...scopeState, ch3ProbeSource: e.target.value },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-pink-300"
                  >
                    <option value="">Auto Signal 3</option>
                    {probeOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        [{opt.group}] {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* CH4 Channel Box */}
            <div className="p-2.5 rounded bg-slate-950 border border-emerald-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  CHANNEL 4
                </span>
                <button
                  onClick={() =>
                    onUpdateInstruments({
                      ...instruments,
                      oscilloscope: { ...scopeState, ch4Enabled: !scopeState.ch4Enabled },
                    })
                  }
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    scopeState.ch4Enabled ? 'bg-emerald-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {scopeState.ch4Enabled ? 'ENABLED' : 'OFF'}
                </button>
              </div>

              {scopeState.ch4Enabled && (
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400">Probe Point:</label>
                  <select
                    value={scopeState.ch4ProbeSource || ''}
                    onChange={(e) =>
                      onUpdateInstruments({
                        ...instruments,
                        oscilloscope: { ...scopeState, ch4ProbeSource: e.target.value },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-emerald-300"
                  >
                    <option value="">Auto Signal 4</option>
                    {probeOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        [{opt.group}] {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Trigger System */}
        {activeTabPanel === 'trigger' && (
          <div className="space-y-3 p-1">
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-3">
              <h5 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">Edge Trigger Engine</h5>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">Trigger Source:</label>
                <select
                  value={scopeState.triggerSource || 'CH1'}
                  onChange={(e) =>
                    onUpdateInstruments({
                      ...instruments,
                      oscilloscope: { ...scopeState, triggerSource: e.target.value as 'CH1' | 'CH2' | 'CH3' | 'CH4' | 'GEN' },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white font-bold"
                >
                  <option value="CH1">Channel 1 (Yellow)</option>
                  <option value="CH2">Channel 2 (Cyan)</option>
                  <option value="CH3">Channel 3 (Magenta)</option>
                  <option value="CH4">Channel 4 (Green)</option>
                  <option value="GEN">AWG Generator Output</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block">Slope / Edge</label>
                  <select
                    value={scopeState.triggerEdge || 'rising'}
                    onChange={(e) =>
                      onUpdateInstruments({
                        ...instruments,
                        oscilloscope: { ...scopeState, triggerEdge: e.target.value as 'rising' | 'falling' },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white"
                  >
                    <option value="rising">Rising ↗</option>
                    <option value="falling">Falling ↘</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">Mode</label>
                  <select
                    value={scopeState.triggerMode || 'auto'}
                    onChange={(e) =>
                      onUpdateInstruments({
                        ...instruments,
                        oscilloscope: { ...scopeState, triggerMode: e.target.value as 'auto' | 'normal' | 'single' },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white"
                  >
                    <option value="auto">Auto</option>
                    <option value="normal">Normal</option>
                    <option value="single">Single</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Trigger Level:</span>
                  <span className="text-amber-400 font-bold">{scopeState.triggerLevel ?? 0.0} V</span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.1"
                  value={scopeState.triggerLevel ?? 0}
                  onChange={(e) =>
                    onUpdateInstruments({
                      ...instruments,
                      oscilloscope: { ...scopeState, triggerLevel: parseFloat(e.target.value) },
                    })
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Math Operations */}
        {activeTabPanel === 'math' && (
          <div className="space-y-3 p-1">
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-3">
              <h5 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">Waveform Math Channel</h5>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'off', label: 'Math OFF' },
                  { id: 'CH1+CH2', label: 'CH1 + CH2' },
                  { id: 'CH1-CH2', label: 'CH1 - CH2' },
                  { id: 'CH1*CH2', label: 'CH1 × CH2' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() =>
                      onUpdateInstruments({
                        ...instruments,
                        oscilloscope: { ...scopeState, mathMode: m.id as 'off' | 'CH1+CH2' | 'CH1-CH2' | 'CH1*CH2' },
                      })
                    }
                    className={`p-2 rounded font-bold border transition-colors ${
                      (scopeState.mathMode || 'off') === m.id
                        ? 'bg-orange-600 border-orange-400 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Calculates real-time vector addition, differential voltage, or instantaneous power product rendered in high-contrast orange.
              </p>
            </div>
          </div>
        )}

        {/* Tab 4: Precision Measurement Cursors */}
        {activeTabPanel === 'cursors' && (
          <div className="space-y-3 p-1">
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 uppercase text-[11px]">X/Y Graticule Cursors</span>
                <button
                  onClick={() =>
                    onUpdateInstruments({
                      ...instruments,
                      oscilloscope: { ...scopeState, cursorsEnabled: !scopeState.cursorsEnabled },
                    })
                  }
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    scopeState.cursorsEnabled ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {scopeState.cursorsEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {scopeState.cursorsEnabled && (
                <div className="space-y-2 text-[10px]">
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Cursor A (Time)</span>
                      <span className="text-cyan-400 font-bold">{Math.round((scopeState.cursorX1 ?? 0.25) * (scopeState.timebaseMs || 50) * 10)} ms</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.95"
                      step="0.01"
                      value={scopeState.cursorX1 ?? 0.25}
                      onChange={(e) =>
                        onUpdateInstruments({
                          ...instruments,
                          oscilloscope: { ...scopeState, cursorX1: parseFloat(e.target.value) },
                        })
                      }
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Cursor B (Time)</span>
                      <span className="text-cyan-400 font-bold">{Math.round((scopeState.cursorX2 ?? 0.75) * (scopeState.timebaseMs || 50) * 10)} ms</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.95"
                      step="0.01"
                      value={scopeState.cursorX2 ?? 0.75}
                      onChange={(e) =>
                        onUpdateInstruments({
                          ...instruments,
                          oscilloscope: { ...scopeState, cursorX2: parseFloat(e.target.value) },
                        })
                      }
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  <div className="p-2 bg-slate-900 rounded border border-slate-800 space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between text-slate-300">
                      <span>ΔT (Delta Time):</span>
                      <span className="text-white font-bold">
                        {Math.abs(Math.round(((scopeState.cursorX2 ?? 0.75) - (scopeState.cursorX1 ?? 0.25)) * (scopeState.timebaseMs || 50) * 10))} ms
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>1/ΔT (Est. Freq):</span>
                      <span className="text-amber-400 font-bold">
                        {(() => {
                          const dtSec = Math.abs(((scopeState.cursorX2 ?? 0.75) - (scopeState.cursorX1 ?? 0.25)) * (scopeState.timebaseMs || 50) * 10) / 1000;
                          return dtSec > 0 ? `${(1 / dtSec).toFixed(1)} Hz` : '--';
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
