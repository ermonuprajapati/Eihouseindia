'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { SimulationWaveformPoint, VirtualInstrumentState } from '@/modules/engineering-lab/types';
import { Activity, Gauge, Radio, Play, Pause, Binary } from 'lucide-react';

interface InstrumentPanelProps {
  instruments: VirtualInstrumentState;
  onUpdateInstruments: (updated: VirtualInstrumentState) => void;
  waveformData: Record<string, SimulationWaveformPoint[]>;
  isSimulating: boolean;
}

export function InstrumentPanel({
  instruments,
  onUpdateInstruments,
  waveformData,
  isSimulating,
}: InstrumentPanelProps) {
  const scopeCanvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState<'scope' | 'multimeter' | 'funcgen' | 'logic'>('scope');

  // Oscilloscope Canvas Rendering Loop
  useEffect(() => {
    const canvas = scopeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const renderScope = () => {
      const width = canvas.width;
      const height = canvas.height;

      // 1. Clear CRT phosphor dark background
      ctx.fillStyle = '#050B14';
      ctx.fillRect(0, 0, width, height);

      // 2. Draw 10x8 Division Scope Reticle Grid
      ctx.strokeStyle = '#132338';
      ctx.lineWidth = 1;

      const numDivX = 10;
      const numDivY = 8;
      const divWidth = width / numDivX;
      const divHeight = height / numDivY;

      ctx.beginPath();
      for (let x = 0; x <= width; x += divWidth) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += divHeight) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Major Crosshairs Center Axis
      ctx.strokeStyle = '#1E3A5F';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();

      // 3. Render Channel Waveforms
      const keys = Object.keys(waveformData);
      const ch1Key = keys[0];
      const ch2Key = keys[1];

      const drawChannel = (pts: SimulationWaveformPoint[] | undefined, color: string, vScale: number, yOffset: number) => {
        if (!pts || pts.length < 2) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        const xStep = width / (pts.length - 1);
        pts.forEach((pt, idx) => {
          const x = idx * xStep;
          // Zero volt line is center height / 2
          const y = height / 2 - (pt.value / vScale) * divHeight + yOffset;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });

        ctx.stroke();
      };

      if (instruments.oscilloscope.ch1Enabled && ch1Key) {
        drawChannel(waveformData[ch1Key], '#38BDF8', instruments.oscilloscope.ch1ScaleV, 0);
      }

      if (instruments.oscilloscope.ch2Enabled && ch2Key) {
        drawChannel(waveformData[ch2Key], '#F59E0B', instruments.oscilloscope.ch2ScaleV, 20);
      }

      if (instruments.oscilloscope.running && isSimulating) {
        animId = requestAnimationFrame(renderScope);
      }
    };

    renderScope();
    return () => cancelAnimationFrame(animId);
  }, [waveformData, instruments.oscilloscope, isSimulating]);

  const keys = Object.keys(waveformData);
  const ch1Key = keys[0];
  const ch1Pts = ch1Key ? waveformData[ch1Key] : undefined;

  // Real Mathematical Scope Measurements
  const scopeStats = useMemo(() => {
    if (!ch1Pts || ch1Pts.length < 2) {
      return { vpp: 0, vrms: 0, freq: 0, periodMs: 0 };
    }
    const vals = ch1Pts.map((p) => p.value);
    const maxV = Math.max(...vals);
    const minV = Math.min(...vals);
    const vpp = Math.max(0, maxV - minV);
    const sumSq = vals.reduce((acc, v) => acc + v * v, 0);
    const vrms = Math.sqrt(sumSq / vals.length);

    const mid = (maxV + minV) / 2;
    const crossings: number[] = [];
    for (let i = 1; i < ch1Pts.length; i++) {
      if ((ch1Pts[i - 1].value - mid) * (ch1Pts[i].value - mid) < 0) {
        crossings.push(ch1Pts[i].time);
      }
    }
    let periodMs = 0;
    let freq = 0;
    if (crossings.length >= 2) {
      const avgHalfPeriod = (crossings[crossings.length - 1] - crossings[0]) / (crossings.length - 1);
      const periodSec = avgHalfPeriod * 2;
      if (periodSec > 0.00001) {
        periodMs = periodSec * 1000;
        freq = 1.0 / periodSec;
      }
    }
    return { vpp, vrms, freq, periodMs };
  }, [ch1Pts]);

  return (
    <div className="flex-1 flex flex-col bg-[#070D18] text-slate-200 select-none overflow-hidden h-full">
      {/* Sub Navigation Bar */}
      <div className="h-10 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setActiveTab('scope')}
            className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-medium transition-colors ${
              activeTab === 'scope' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Digital Oscilloscope
          </button>
          <button
            onClick={() => setActiveTab('multimeter')}
            className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-medium transition-colors ${
              activeTab === 'multimeter' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            Benchtop Multimeter
          </button>
          <button
            onClick={() => setActiveTab('funcgen')}
            className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-medium transition-colors ${
              activeTab === 'funcgen' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-purple-400" />
            Function Generator
          </button>
          <button
            onClick={() => setActiveTab('logic')}
            className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-medium transition-colors ${
              activeTab === 'logic' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Binary className="w-3.5 h-3.5 text-rose-400" />
            Logic Analyzer
          </button>
        </div>

        <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Virtual Bench Online
        </div>
      </div>

      {/* Main Instrument Display Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'scope' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
            {/* Scope Screen */}
            <div className="lg:col-span-3 bg-[#050B14] border-2 border-slate-800 rounded-xl p-3 flex flex-col shadow-2xl relative">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-slate-800/80 mb-2">
                <div className="flex items-center gap-4">
                  <span className="text-cyan-400 font-semibold">CH1: {instruments.oscilloscope.ch1ScaleV}V/Div</span>
                  <span className="text-amber-400 font-semibold">CH2: {instruments.oscilloscope.ch2ScaleV}V/Div</span>
                  <span>TB: {instruments.oscilloscope.timebaseMs}ms/Div</span>
                </div>
                <div className="text-[11px] text-emerald-400">100 kSa/s Real-time</div>
              </div>

              {/* CRT Canvas */}
              <div className="flex-1 w-full min-h-[340px] relative">
                <canvas
                  ref={scopeCanvasRef}
                  width={800}
                  height={420}
                  className="w-full h-full rounded border border-slate-900 shadow-inner"
                />
              </div>

              {/* Scope Measurement Bar */}
              <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                <div className="bg-slate-950 p-2 rounded border border-slate-900">
                  <span className="text-slate-500 block text-[9px]">Vpp (Peak-to-Peak)</span>
                  <span className="text-cyan-300 font-bold text-sm">
                    {scopeStats.vpp > 0 ? `${scopeStats.vpp.toFixed(2)} V` : '--'}
                  </span>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-900">
                  <span className="text-slate-500 block text-[9px]">Vrms (Root Mean Square)</span>
                  <span className="text-cyan-300 font-bold text-sm">
                    {scopeStats.vrms > 0 ? `${scopeStats.vrms.toFixed(2)} V` : '--'}
                  </span>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-900">
                  <span className="text-slate-500 block text-[9px]">Frequency</span>
                  <span className="text-amber-300 font-bold text-sm">
                    {scopeStats.freq >= 1000
                      ? `${(scopeStats.freq / 1000).toFixed(2)} kHz`
                      : scopeStats.freq > 0
                      ? `${scopeStats.freq.toFixed(2)} Hz`
                      : '--'}
                  </span>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-900">
                  <span className="text-slate-500 block text-[9px]">Period (T)</span>
                  <span className="text-amber-300 font-bold text-sm">
                    {scopeStats.periodMs >= 1
                      ? `${scopeStats.periodMs.toFixed(1)} ms`
                      : scopeStats.periodMs > 0
                      ? `${(scopeStats.periodMs * 1000).toFixed(1)} µs`
                      : '--'}
                  </span>
                </div>
              </div>
            </div>

            {/* Scope Control Dials & Adjusters */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 text-xs font-mono">
              <h4 className="font-semibold text-slate-100 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-2">
                Scope Controls
              </h4>

              {/* Run / Stop */}
              <button
                onClick={() =>
                  onUpdateInstruments({
                    ...instruments,
                    oscilloscope: {
                      ...instruments.oscilloscope,
                      running: !instruments.oscilloscope.running,
                    },
                  })
                }
                className={`py-2 px-3 rounded flex items-center justify-center gap-2 font-bold text-xs shadow transition-all ${
                  instruments.oscilloscope.running
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                }`}
              >
                {instruments.oscilloscope.running ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    Hold Waveform
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Live Trigger
                  </>
                )}
              </button>

              {/* Channel 1 Scale */}
              <div className="space-y-1">
                <label className="text-[10px] text-cyan-400 font-bold">CH1 Vertical (V/Div)</label>
                <select
                  value={instruments.oscilloscope.ch1ScaleV}
                  onChange={(e) =>
                    onUpdateInstruments({
                      ...instruments,
                      oscilloscope: {
                        ...instruments.oscilloscope,
                        ch1ScaleV: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200"
                >
                  <option value={0.5}>0.5 V / Div</option>
                  <option value={1.0}>1.0 V / Div</option>
                  <option value={2.0}>2.0 V / Div</option>
                  <option value={5.0}>5.0 V / Div</option>
                  <option value={10.0}>10.0 V / Div</option>
                </select>
              </div>

              {/* Channel 2 Scale */}
              <div className="space-y-1">
                <label className="text-[10px] text-amber-400 font-bold">CH2 Vertical (V/Div)</label>
                <select
                  value={instruments.oscilloscope.ch2ScaleV}
                  onChange={(e) =>
                    onUpdateInstruments({
                      ...instruments,
                      oscilloscope: {
                        ...instruments.oscilloscope,
                        ch2ScaleV: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200"
                >
                  <option value={0.5}>0.5 V / Div</option>
                  <option value={1.0}>1.0 V / Div</option>
                  <option value={2.0}>2.0 V / Div</option>
                  <option value={5.0}>5.0 V / Div</option>
                </select>
              </div>

              {/* Timebase */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-300 font-bold">Timebase (ms/Div)</label>
                <select
                  value={instruments.oscilloscope.timebaseMs}
                  onChange={(e) =>
                    onUpdateInstruments({
                      ...instruments,
                      oscilloscope: {
                        ...instruments.oscilloscope,
                        timebaseMs: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200"
                >
                  <option value={10}>10 ms / Div</option>
                  <option value={20}>20 ms / Div</option>
                  <option value={50}>50 ms / Div</option>
                  <option value={100}>100 ms / Div</option>
                  <option value={200}>200 ms / Div</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Benchtop Multimeter */}
        {activeTab === 'multimeter' && (
          <div className="max-w-md mx-auto bg-slate-900 border-2 border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-6">
            <div className="w-full bg-[#030712] border border-slate-800 rounded-xl p-6 text-right font-mono shadow-inner">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest block text-left mb-1">
                AUTORANGE DIGITAL MULTIMETER
              </span>
              <div className="text-5xl font-black text-emerald-400 tracking-wider">
                {instruments.multimeter.reading.toFixed(3)}
                <span className="text-xl ml-2 text-emerald-600 font-semibold">{instruments.multimeter.unit}</span>
              </div>
            </div>

            {/* Mode Selector Knob */}
            <div className="grid grid-cols-3 gap-2 w-full text-xs font-mono">
              {(
                [
                  { mode: 'DC_V', label: 'DC Voltage', unit: 'V' },
                  { mode: 'AC_V', label: 'AC Voltage', unit: 'V~' },
                  { mode: 'RESISTANCE', label: 'Resistance', unit: 'Ω' },
                  { mode: 'CONTINUITY', label: 'Continuity', unit: '♫' },
                  { mode: 'CURRENT_MA', label: 'Current mA', unit: 'mA' },
                ] as const
              ).map((m) => (
                <button
                  key={m.mode}
                  onClick={() =>
                    onUpdateInstruments({
                      ...instruments,
                      multimeter: {
                        ...instruments.multimeter,
                        mode: m.mode,
                        unit: m.unit,
                      },
                    })
                  }
                  className={`p-2.5 rounded-lg border font-semibold text-center transition-all ${
                    instruments.multimeter.mode === m.mode
                      ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Function Generator */}
        {activeTab === 'funcgen' && (
          <div className="max-w-lg mx-auto bg-slate-900 border-2 border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <h3 className="font-semibold text-sm font-mono text-slate-100 uppercase border-b border-slate-800 pb-2">
              DDS Signal Synthesizer
            </h3>

            <div className="grid grid-cols-4 gap-2 font-mono text-xs">
              {(['sine', 'square', 'triangle', 'sawtooth'] as const).map((wave) => (
                <button
                  key={wave}
                  onClick={() =>
                    onUpdateInstruments({
                      ...instruments,
                      functionGenerator: {
                        ...instruments.functionGenerator,
                        waveform: wave,
                      },
                    })
                  }
                  className={`p-2 rounded border uppercase font-bold text-center ${
                    instruments.functionGenerator.waveform === wave
                      ? 'bg-purple-600 border-purple-400 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {wave}
                </button>
              ))}
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span>Output Frequency</span>
                <span className="text-purple-400 font-bold">{instruments.functionGenerator.frequencyHz} Hz</span>
              </div>
              <input
                type="range"
                min={1}
                max={5000}
                value={instruments.functionGenerator.frequencyHz}
                onChange={(e) =>
                  onUpdateInstruments({
                    ...instruments,
                    functionGenerator: {
                      ...instruments.functionGenerator,
                      frequencyHz: Number(e.target.value),
                    },
                  })
                }
                className="w-full accent-purple-500"
              />
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span>Peak Amplitude</span>
                <span className="text-purple-400 font-bold">{instruments.functionGenerator.amplitudeV} V</span>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                value={instruments.functionGenerator.amplitudeV}
                onChange={(e) =>
                  onUpdateInstruments({
                    ...instruments,
                    functionGenerator: {
                      ...instruments.functionGenerator,
                      amplitudeV: Number(e.target.value),
                    },
                  })
                }
                className="w-full accent-purple-500"
              />
            </div>
          </div>
        )}

        {/* 8-Channel Digital Logic Analyzer */}
        {activeTab === 'logic' && (
          <div className="bg-[#050B14] border-2 border-slate-800 rounded-xl p-4 flex flex-col shadow-2xl h-full font-mono text-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400">
              <div className="flex items-center gap-2">
                <Binary className="w-4 h-4 text-rose-400" />
                <span className="font-bold text-slate-100 uppercase tracking-wider text-[11px]">
                  8-Channel Synchronous Digital Logic Analyzer
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-emerald-400 font-semibold">Sample Rate: 1 MSa/s</span>
                <span className="text-slate-500">Threshold: TTL 2.0V / 0.8V</span>
              </div>
            </div>

            <div className="flex-1 bg-slate-950 border border-slate-900 rounded-lg p-3 overflow-y-auto space-y-2">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((ch) => {
                const waveKey = keys[ch % keys.length];
                const pts = waveKey ? waveformData[waveKey] : undefined;
                const lastVal = pts && pts.length > 0 ? pts[pts.length - 1].value : 0;
                const isHigh = lastVal >= 2.0;

                return (
                  <div key={ch} className="flex items-center gap-3 p-1.5 bg-slate-900/60 rounded border border-slate-800/80">
                    <div className="w-16 shrink-0 flex items-center justify-between">
                      <span className="text-slate-400 font-bold">D{ch}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isHigh ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-950 text-slate-500'
                      }`}>
                        {isHigh ? '1' : '0'}
                      </span>
                    </div>

                    {/* Digital Trace Polyline SVG */}
                    <div className="flex-1 h-7 bg-[#020617] rounded border border-slate-900 relative overflow-hidden flex items-center">
                      <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 24">
                        <line x1="0" y1="20" x2="400" y2="20" stroke="#1E293B" strokeWidth="1" strokeDasharray="4 4" />
                        <line x1="0" y1="4" x2="400" y2="4" stroke="#1E293B" strokeWidth="1" strokeDasharray="4 4" />
                        {pts && pts.length > 1 ? (
                          <path
                            d={pts.reduce((acc, p, idx) => {
                              const x = (idx / (pts.length - 1)) * 400;
                              const y = p.value >= 2.0 ? 4 : 20;
                              if (idx === 0) return `M ${x} ${y}`;
                              const prevY = pts[idx - 1].value >= 2.0 ? 4 : 20;
                              if (prevY !== y) {
                                return `${acc} L ${x} ${prevY} L ${x} ${y}`;
                              }
                              return `${acc} L ${x} ${y}`;
                            }, '')}
                            fill="none"
                            stroke={isHigh ? '#10B981' : '#64748B'}
                            strokeWidth="2"
                          />
                        ) : (
                          <line x1="0" y1={isHigh ? 4 : 20} x2="400" y2={isHigh ? 4 : 20} stroke={isHigh ? '#10B981' : '#64748B'} strokeWidth="2" />
                        )}
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
