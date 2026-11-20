'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  VirtualInstrumentState,
  CircuitComponent,
  CircuitWire,
  SimulationWaveformPoint,
} from '@/modules/engineering-lab/types';
import {
  Volume2,
  VolumeX,
  Lock,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

export interface DigitalMultimeter65Props {
  instruments: VirtualInstrumentState;
  onUpdateInstruments: (updated: VirtualInstrumentState) => void;
  components?: CircuitComponent[];
  wires?: CircuitWire[];
  simStates?: Record<string, { voltage: number; current: number; on?: boolean }>;
  wireCurrents?: Record<string, number>;
  waveformData?: Record<string, SimulationWaveformPoint[]>;
}

export function DigitalMultimeter65({
  instruments,
  onUpdateInstruments,
  components = [],
  simStates = {},
  wireCurrents = {},
  waveformData = {},
}: DigitalMultimeter65Props) {
  const dmm = instruments.multimeter;
  const [audioEnabled, setAudioEnabled] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Probe selector options
  const probeOptions = useMemo(() => {
    const list: { id: string; label: string; group: string }[] = [];
    list.push({ id: 'GND', label: 'Ground (0V Reference)', group: 'Reference' });
    list.push({ id: 'VCC', label: 'VCC / 5V Rail', group: 'Power' });

    components.forEach((c) => {
      list.push({ id: c.id, label: `${c.label} (${c.value || c.type}) Across`, group: 'Components' });
      c.pins.forEach((p) => {
        list.push({
          id: `${c.id}:${p.id}`,
          label: `${c.label} ➔ Pin ${p.name || p.id}`,
          group: 'Pins',
        });
      });
    });

    return list;
  }, [components]);

  const probeRed = dmm.probeRed || (components[0] ? components[0].id : 'VCC');
  const probeBlack = dmm.probeBlack || 'GND';

  // Compute live reading based on actual circuit state and probe attachment
  const liveReading = useMemo(() => {
    // 1. Check if probing across a single component
    const probedComp = components.find((c) => c.id === probeRed);
    const compState = probedComp ? simStates[probedComp.id] : undefined;

    // Mode-specific calculations
    if (dmm.mode === 'RESISTANCE') {
      if (probedComp && (probedComp.type === 'RESISTOR' || probedComp.type.includes('RESISTOR'))) {
        const rVal = parseFloat(String(probedComp.parameters?.resistance ?? probedComp.value ?? 1000));
        return { val: rVal, unit: rVal >= 1e6 ? 'MΩ' : rVal >= 1000 ? 'kΩ' : 'Ω', isOverload: false };
      }
      if (probeRed === probeBlack) {
        return { val: 0.05, unit: 'Ω', isOverload: false };
      }
      return { val: 0, unit: 'MΩ', isOverload: true }; // Open Circuit
    }

    if (dmm.mode === 'CONTINUITY') {
      if (probeRed === probeBlack) {
        return { val: 0.02, unit: 'Ω', isOverload: false, isShort: true };
      }
      if (probedComp && (probedComp.type.includes('SWITCH') || probedComp.type.includes('BUTTON'))) {
        const isClosed = probedComp.parameters?.closed !== false;
        return { val: isClosed ? 0.08 : 999999, unit: 'Ω', isOverload: !isClosed, isShort: isClosed };
      }
      return { val: 999999, unit: 'Ω', isOverload: true, isShort: false };
    }

    if (dmm.mode === 'DIODE') {
      if (probedComp && (probedComp.type === 'DIODE' || probedComp.type.includes('LED'))) {
        const vf = compState?.voltage || 0.68;
        return { val: Math.abs(vf), unit: 'V', isOverload: false };
      }
      return { val: 0, unit: 'V', isOverload: true };
    }

    if (dmm.mode === 'CURRENT_MA') {
      if (compState?.current) {
        const mA = compState.current * 1000;
        return { val: Math.abs(mA), unit: Math.abs(mA) >= 1000 ? 'A' : 'mA', isOverload: false };
      }
      const wireI = Object.values(wireCurrents)[0];
      if (wireI !== undefined) {
        const mA = Math.abs(wireI) * 1000;
        return { val: mA, unit: mA >= 1000 ? 'A' : 'mA', isOverload: false };
      }
      return { val: 0.0, unit: 'mA', isOverload: false };
    }

    if (dmm.mode === 'AC_V') {
      const vVal = compState?.voltage || 0;
      // AC True RMS approximation
      const vRms = Math.abs(vVal) / Math.SQRT2;
      return { val: vRms, unit: 'V~', isOverload: false };
    }

    if (dmm.mode === 'FREQUENCY') {
      // Frequency counter from waveform buffer
      const wave = Object.values(waveformData)[0];
      if (wave && wave.length > 5) {
        const mid = (Math.max(...wave.map((p) => p.value)) + Math.min(...wave.map((p) => p.value))) / 2;
        const crossings: number[] = [];
        for (let i = 1; i < wave.length; i++) {
          if ((wave[i - 1].value - mid) * (wave[i].value - mid) < 0) {
            crossings.push(wave[i].time);
          }
        }
        if (crossings.length >= 2) {
          const tSec = ((crossings[crossings.length - 1] - crossings[0]) / (crossings.length - 1)) * 2;
          const f = tSec > 0 ? 1 / tSec : 0;
          return { val: f >= 1000 ? f / 1000 : f, unit: f >= 1000 ? 'kHz' : 'Hz', isOverload: false };
        }
      }
      return { val: 0, unit: 'Hz', isOverload: false };
    }

    if (dmm.mode === 'CAPACITANCE') {
      if (probedComp && probedComp.type.includes('CAPACITOR')) {
        const cap = parseFloat(String(probedComp.parameters?.capacitance ?? 1e-7));
        const uF = cap * 1e6;
        return { val: uF >= 1 ? uF : uF * 1000, unit: uF >= 1 ? 'µF' : 'nF', isOverload: false };
      }
      return { val: 0, unit: 'nF', isOverload: true };
    }

    // Default: DC_V
    const vVal = compState ? compState.voltage : 5.0;
    return { val: Math.abs(vVal), unit: 'V', isOverload: false };
  }, [components, simStates, wireCurrents, waveformData, dmm.mode, probeRed, probeBlack]);

  // Continuity Beeper Sound Synthesizer via Web Audio API
  useEffect(() => {
    if (dmm.mode === 'CONTINUITY' && liveReading.isShort && audioEnabled) {
      try {
        if (!audioCtxRef.current) {
          const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
          const osc = audioCtxRef.current.createOscillator();
          const gain = audioCtxRef.current.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(2400, audioCtxRef.current.currentTime); // 2.4 kHz standard Fluke beep tone
          gain.gain.setValueAtTime(0.04, audioCtxRef.current.currentTime);
          osc.connect(gain);
          gain.connect(audioCtxRef.current.destination);
          osc.start();
          osc.stop(audioCtxRef.current.currentTime + 0.12);
        }
      } catch {
        // Audio policy ignore
      }
    }
  }, [dmm.mode, liveReading.isShort, audioEnabled]);

  // Display value after relative offset or hold
  const displayedValue = useMemo(() => {
    if (dmm.hold) return dmm.reading;
    if (liveReading.isOverload) return null;
    let v = liveReading.val;
    if (dmm.relEnabled && dmm.relZero !== undefined) {
      v = v - dmm.relZero;
    }
    return v;
  }, [dmm.hold, dmm.reading, dmm.relEnabled, dmm.relZero, liveReading]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[#050B14] select-none text-slate-200 font-mono">
      {/* Benchtop Chassis (Fluke 87V / Keysight Benchtop Style) */}
      <div className="w-full max-w-2xl bg-slate-900 border-2 border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-6">
        {/* Chassis Top Brand & Status Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] tracking-wider">
              EI-87V PRO
            </span>
            <span className="font-bold text-slate-300 uppercase tracking-widest text-[11px]">
              6.5-Digit True-RMS Benchtop Multimeter
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`p-1.5 rounded cursor-pointer transition-colors ${
                audioEnabled ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800' : 'text-slate-500 bg-slate-800'
              }`}
              title={audioEnabled ? 'Beeper Mute' : 'Beeper Enable'}
            >
              {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold">
              CAT III 1000V
            </span>
          </div>
        </div>

        {/* High-Contrast Large VFD / Segmented LCD Display */}
        <div className="bg-[#030914] border-2 border-slate-800 rounded-xl p-6 shadow-inner relative overflow-hidden">
          {/* Annunciator Top Bar */}
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pb-2 border-b border-slate-900">
            <div className="flex items-center gap-3">
              <span className={dmm.range === 'manual' ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                {dmm.range === 'manual' ? 'MANUAL' : 'AUTO'}
              </span>
              {dmm.hold && <span className="text-amber-400 bg-amber-950 px-1 rounded animate-pulse">HOLD</span>}
              {dmm.relEnabled && <span className="text-cyan-400 bg-cyan-950 px-1 rounded">REL Δ</span>}
              {dmm.mode === 'CONTINUITY' && liveReading.isShort && (
                <span className="text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold animate-pulse">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  CLOSED LOOP (&lt;50Ω)
                </span>
              )}
            </div>

            <div className="text-slate-400">
              Probing: <span className="text-yellow-400">{probeRed}</span> ➔ <span className="text-slate-300">{probeBlack}</span>
            </div>
          </div>

          {/* Large Primary Readout */}
          <div className="py-4 flex items-baseline justify-end gap-3 text-right">
            {displayedValue === null ? (
              <span className="text-6xl font-black text-rose-500 tracking-wider">OL.</span>
            ) : (
              <span className="text-6xl font-black text-emerald-400 tracking-tight font-mono">
                {displayedValue.toFixed(4)}
              </span>
            )}
            <span className="text-3xl font-bold text-emerald-500 w-16 text-left">
              {liveReading.unit}
            </span>
          </div>

          {/* Analog Bar Graph (60-Segment Fluke Style) */}
          <div className="space-y-1">
            <div className="w-full h-2.5 bg-slate-950 rounded-full border border-slate-800 p-0.5 overflow-hidden flex items-center">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-75"
                style={{
                  width: `${Math.min(100, Math.max(2, ((displayedValue || 0) / 10) * 100))}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-500 font-mono px-1">
              <span>0</span>
              <span>2.5</span>
              <span>5.0</span>
              <span>7.5</span>
              <span>10.0+</span>
            </div>
          </div>
        </div>

        {/* Function Selector Buttons */}
        <div className="space-y-2">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Measurement Mode Selector
          </label>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5 text-xs font-bold">
            {[
              { id: 'DC_V', label: 'V DC' },
              { id: 'AC_V', label: 'V AC~' },
              { id: 'RESISTANCE', label: 'Ω Ohms' },
              { id: 'CONTINUITY', label: '♫ Cont.' },
              { id: 'CURRENT_MA', label: 'mA Cur.' },
              { id: 'DIODE', label: '->|- Diode' },
              { id: 'CAPACITANCE', label: '-||- Cap' },
              { id: 'FREQUENCY', label: 'Hz Freq' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() =>
                  onUpdateInstruments({
                    ...instruments,
                    multimeter: {
                      ...dmm,
                      mode: m.id as 'DC_V' | 'AC_V' | 'RESISTANCE' | 'CONTINUITY' | 'CURRENT_MA' | 'DIODE' | 'CAPACITANCE' | 'FREQUENCY',
                      unit: m.label.split(' ')[0],
                    },
                  })
                }
                className={`py-2 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                  dmm.mode === m.id
                    ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-lg scale-102 font-black'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dual Probe Assignment Terminal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
          {/* Positive Probe Red */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-rose-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              INPUT V / Ω / + Probe (Red)
            </label>
            <select
              value={probeRed}
              onChange={(e) =>
                onUpdateInstruments({
                  ...instruments,
                  multimeter: { ...dmm, probeRed: e.target.value },
                })
              }
              className="w-full bg-slate-900 border border-rose-900/60 rounded p-1.5 text-xs text-rose-300 font-mono"
            >
              {probeOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  [{opt.group}] {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Negative Probe Black COM */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              COM / GND / - Probe (Black)
            </label>
            <select
              value={probeBlack}
              onChange={(e) =>
                onUpdateInstruments({
                  ...instruments,
                  multimeter: { ...dmm, probeBlack: e.target.value },
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-slate-300 font-mono"
            >
              {probeOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  [{opt.group}] {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary Feature Controls: HOLD, REL Δ, RANGE, RESET */}
        <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-800 text-xs font-bold">
          <button
            onClick={() =>
              onUpdateInstruments({
                ...instruments,
                multimeter: {
                  ...dmm,
                  hold: !dmm.hold,
                  reading: liveReading.val,
                },
              })
            }
            className={`py-2 rounded border flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              dmm.hold ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>HOLD</span>
          </button>

          <button
            onClick={() =>
              onUpdateInstruments({
                ...instruments,
                multimeter: {
                  ...dmm,
                  relEnabled: !dmm.relEnabled,
                  relZero: liveReading.val,
                },
              })
            }
            className={`py-2 rounded border cursor-pointer transition-colors ${
              dmm.relEnabled ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            REL Δ (Zero)
          </button>

          <button
            onClick={() =>
              onUpdateInstruments({
                ...instruments,
                multimeter: {
                  ...dmm,
                  range: dmm.range === 'manual' ? 'auto' : 'manual',
                },
              })
            }
            className="py-2 rounded border bg-slate-950 border-slate-800 text-slate-300 hover:text-white cursor-pointer transition-colors"
          >
            RANGE ({dmm.range || 'Auto'})
          </button>

          <button
            onClick={() => {
              onUpdateInstruments({
                ...instruments,
                multimeter: {
                  ...dmm,
                  hold: false,
                  relEnabled: false,
                  relZero: 0,
                  range: 'auto',
                },
              });
              toast.info('Multimeter reset to factory default mode.');
            }}
            className="py-2 rounded border bg-slate-950 border-slate-800 text-slate-400 hover:text-rose-400 cursor-pointer transition-colors flex items-center justify-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>
        </div>
      </div>
    </div>
  );
}
