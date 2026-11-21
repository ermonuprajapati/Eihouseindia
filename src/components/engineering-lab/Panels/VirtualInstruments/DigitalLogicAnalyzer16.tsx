'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  VirtualInstrumentState,
  CircuitComponent,
  CircuitWire,
  SimulationWaveformPoint,
} from '@/modules/engineering-lab/types';
import {
  Binary,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  Code2,
} from 'lucide-react';

export interface DigitalLogicAnalyzer16Props {
  instruments: VirtualInstrumentState;
  onUpdateInstruments: (updated: VirtualInstrumentState) => void;
  components?: CircuitComponent[];
  wires?: CircuitWire[];
  waveformData?: Record<string, SimulationWaveformPoint[]>;
  isSimulating?: boolean;
}

export function DigitalLogicAnalyzer16({
  instruments,
  onUpdateInstruments,
  components = [],
  waveformData = {},
  isSimulating = false,
}: DigitalLogicAnalyzer16Props) {
  const la = instruments.logicAnalyzer;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frozenWaveformsRef = useRef<Record<string, SimulationWaveformPoint[]> | null>(null);

  // If in HOLD mode, use the frozen snapshot to prevent live simulation updates from overwriting display
  if (!la.running && !frozenWaveformsRef.current && Object.keys(waveformData).length > 0) {
    frozenWaveformsRef.current = JSON.parse(JSON.stringify(waveformData));
  } else if (la.running && frozenWaveformsRef.current) {
    frozenWaveformsRef.current = null;
  }

  const activeWaveformData = !la.running && frozenWaveformsRef.current ? frozenWaveformsRef.current : waveformData;

  const [channelCount, setChannelCount] = useState<8 | 16>(8);
  const [logicThreshold, setLogicThreshold] = useState<number>(2.0); // 2.0V TTL, 1.65V CMOS 3.3V, 0.9V 1.8V
  const [protocolDecoder, setProtocolDecoder] = useState<'none' | 'uart' | 'i2c' | 'spi' | 'pwm'>(la.protocolDecoder || 'none');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [triggerCh, setTriggerCh] = useState<number>(0);
  const [triggerEdge, setTriggerEdge] = useState<'rising' | 'falling'>('rising');

  // Per-channel explicit pin mappings (D0 - D15)
  const [channelPinMap, setChannelPinMap] = useState<Record<number, string>>({});

  // Digital probe options
  const digitalPinOptions = useMemo(() => {
    const list: { id: string; label: string }[] = [];
    list.push({ id: '', label: 'Auto (Waveform Channel)' });

    components.forEach((c) => {
      list.push({ id: c.id, label: `${c.label} (${c.value || c.type})` });
      c.pins.forEach((p) => {
        list.push({
          id: `${c.id}:${p.id}`,
          label: `${c.label} ➔ ${p.name || p.id}`,
        });
      });
    });

    Object.keys(waveformData).forEach((k) => {
      if (!list.some((item) => item.id === k)) {
        list.push({ id: k, label: `Signal: ${k}` });
      }
    });

    return list;
  }, [components, waveformData]);

  // Decode genuine UART / I2C / SPI / PWM bitstreams from real sampled channel voltages
  const decodedPackets = useMemo(() => {
    if (protocolDecoder === 'none') return [];

    const getChannelBits = (ch: number): { time: number; bit: number }[] => {
      const explicitPin = channelPinMap[ch];
      const keys = Object.keys(activeWaveformData);
      const waveKey = explicitPin && activeWaveformData[explicitPin] ? explicitPin : keys[ch % Math.max(1, keys.length)];
      const pts = waveKey ? activeWaveformData[waveKey] : undefined;
      if (!pts || pts.length < 2) return [];
      return pts.map((p) => ({ time: p.time, bit: p.value >= logicThreshold ? 1 : 0 }));
    };

    const getBitAt = (stream: { time: number; bit: number }[], t: number): number => {
      let low = 0;
      let high = stream.length - 1;
      while (low <= high) {
        const mid = (low + high) >> 1;
        if (stream[mid].time < t) low = mid + 1;
        else high = mid - 1;
      }
      const idx = Math.min(stream.length - 1, Math.max(0, low));
      return stream[idx].bit;
    };

    if (protocolDecoder === 'uart') {
      const rxCh = triggerCh < channelCount ? triggerCh : 0;
      const rx = getChannelBits(rxCh);
      if (rx.length < 12) return [];

      // Determine bit period from shortest pulse duration
      let minPulse = Infinity;
      let runStart = 0;
      for (let i = 1; i < rx.length; i++) {
        if (rx[i].bit !== rx[i - 1].bit) {
          const dt = rx[i].time - rx[runStart].time;
          if (dt > 1e-7 && dt < minPulse) {
            minPulse = dt;
          }
          runStart = i;
        }
      }
      if (!Number.isFinite(minPulse) || minPulse <= 1e-7) return [];
      const bitPeriod = minPulse;

      const packets: { time: string; raw: string; char: string; parity: string }[] = [];
      let i = 1;

      while (i < rx.length) {
        // Detect falling edge: IDLE(1) -> START(0)
        if (rx[i - 1].bit === 1 && rx[i].bit === 0) {
          const tStart = rx[i].time;
          // Verify center of START bit is low
          const startCenter = getBitAt(rx, tStart + 0.5 * bitPeriod);
          if (startCenter === 0) {
            let byteVal = 0;
            let valid = true;

            // Sample 8 data bits LSB-first
            for (let b = 0; b < 8; b++) {
              const sampleTime = tStart + (1.5 + b) * bitPeriod;
              if (sampleTime > rx[rx.length - 1].time) {
                valid = false;
                break;
              }
              const bit = getBitAt(rx, sampleTime);
              byteVal |= (bit << b);
            }

            // Verify STOP bit is high
            const stopTime = tStart + 9.5 * bitPeriod;
            if (valid && stopTime <= rx[rx.length - 1].time) {
              const stopBit = getBitAt(rx, stopTime);
              if (stopBit === 1) {
                const hex = `0x${byteVal.toString(16).toUpperCase().padStart(2, '0')}`;
                const charRep = byteVal >= 32 && byteVal <= 126 ? `'${String.fromCharCode(byteVal)}'` : `[${byteVal}]`;
                packets.push({
                  time: `${tStart.toFixed(4)}s`,
                  raw: hex,
                  char: charRep,
                  parity: 'OK',
                });
                // Advance past frame
                while (i < rx.length && rx[i].time < stopTime + 0.5 * bitPeriod) {
                  i++;
                }
                continue;
              }
            }
          }
        }
        i++;
      }
      return packets;
    }

    if (protocolDecoder === 'i2c') {
      const sda = getChannelBits(0);
      const scl = getChannelBits(1);
      if (sda.length < 10 || scl.length < 10) return [];

      let inFrame = false;
      let currentBits: number[] = [];
      let isAddressPhase = true;
      const packets: { time: string; raw: string; char: string; parity: string }[] = [];

      for (let i = 1; i < scl.length; i++) {
        const t = scl[i].time;
        const sdaPrev = getBitAt(sda, scl[i - 1].time);
        const sdaCurr = getBitAt(sda, t);
        const sclPrev = scl[i - 1].bit;
        const sclCurr = scl[i].bit;

        // START condition: SDA falling while SCL is HIGH
        if (sclPrev === 1 && sclCurr === 1 && sdaPrev === 1 && sdaCurr === 0) {
          inFrame = true;
          currentBits = [];
          isAddressPhase = true;
          continue;
        }

        // STOP condition: SDA rising while SCL is HIGH
        if (sclPrev === 1 && sclCurr === 1 && sdaPrev === 0 && sdaCurr === 1) {
          inFrame = false;
          currentBits = [];
          continue;
        }

        // Sample on SCL rising edge (0 -> 1)
        if (inFrame && sclPrev === 0 && sclCurr === 1) {
          currentBits.push(sdaCurr);
          if (currentBits.length === 9) {
            const byteBits = currentBits.slice(0, 8);
            const ackBit = currentBits[8];
            let val = 0;
            for (let b = 0; b < 8; b++) {
              val = (val << 1) | byteBits[b];
            }
            const ackStr = ackBit === 0 ? 'ACK' : 'NACK';
            const hex = `0x${val.toString(16).toUpperCase().padStart(2, '0')}`;

            if (isAddressPhase) {
              const addr = val >> 1;
              const rw = (val & 1) === 1 ? 'R' : 'W';
              packets.push({
                time: `${t.toFixed(4)}s`,
                raw: hex,
                char: `ADDR [0x${addr.toString(16).toUpperCase()} ${rw}]`,
                parity: ackStr,
              });
              isAddressPhase = false;
            } else {
              const charRep = val >= 32 && val <= 126 ? `DATA ['${String.fromCharCode(val)}']` : `DATA [${hex}]`;
              packets.push({
                time: `${t.toFixed(4)}s`,
                raw: hex,
                char: charRep,
                parity: ackStr,
              });
            }
            currentBits = [];
          }
        }
      }
      return packets;
    }

    if (protocolDecoder === 'spi') {
      const cs = getChannelBits(0);
      const sclk = getChannelBits(1);
      const mosi = getChannelBits(2);
      const miso = getChannelBits(3);
      if (cs.length < 8 || sclk.length < 8 || mosi.length < 8) return [];

      let mosiBits: number[] = [];
      let misoBits: number[] = [];
      const packets: { time: string; raw: string; char: string; parity: string }[] = [];

      for (let i = 1; i < sclk.length; i++) {
        const t = sclk[i].time;
        const isCsActive = getBitAt(cs, t) === 0;
        if (!isCsActive) {
          mosiBits = [];
          misoBits = [];
          continue;
        }

        // SCLK rising edge (Mode 0)
        if (sclk[i - 1].bit === 0 && sclk[i].bit === 1) {
          mosiBits.push(getBitAt(mosi, t));
          misoBits.push(miso.length > 0 ? getBitAt(miso, t) : 0);

          if (mosiBits.length === 8) {
            let mosiByte = 0;
            let misoByte = 0;
            for (let b = 0; b < 8; b++) {
              mosiByte = (mosiByte << 1) | mosiBits[b];
              misoByte = (misoByte << 1) | misoBits[b];
            }
            const mosiHex = `0x${mosiByte.toString(16).toUpperCase().padStart(2, '0')}`;
            const misoHex = `0x${misoByte.toString(16).toUpperCase().padStart(2, '0')}`;
            packets.push({
              time: `${t.toFixed(4)}s`,
              raw: mosiHex,
              char: `MOSI: ${mosiHex} / MISO: ${misoHex}`,
              parity: 'OK',
            });
            mosiBits = [];
            misoBits = [];
          }
        }
      }
      return packets;
    }

    if (protocolDecoder === 'pwm') {
      const packets: { time: string; raw: string; char: string; parity: string }[] = [];
      for (let ch = 0; ch < Math.min(4, channelCount); ch++) {
        const stream = getChannelBits(ch);
        if (stream.length < 5) continue;

        let highCount = 0;
        const crossings: number[] = [];
        for (let i = 0; i < stream.length; i++) {
          if (stream[i].bit === 1) highCount++;
          if (i > 0 && stream[i - 1].bit !== stream[i].bit) {
            crossings.push(stream[i].time);
          }
        }

        if (crossings.length >= 2) {
          const period = ((crossings[crossings.length - 1] - crossings[0]) / (crossings.length - 1)) * 2;
          if (period > 1e-7) {
            const f = 1 / period;
            const duty = Math.round((highCount / stream.length) * 100);
            const freqStr = f >= 1000 ? `${(f / 1000).toFixed(1)} kHz` : `${f.toFixed(0)} Hz`;
            packets.push({
              time: `CH${ch} (D${ch})`,
              raw: freqStr,
              char: `Duty: ${duty}%`,
              parity: 'PWM ~',
            });
          }
        }
      }
      return packets;
    }

    return [];
  }, [protocolDecoder, channelPinMap, activeWaveformData, logicThreshold, triggerCh, channelCount]);

  // Per-channel live metrics (Frequency, Pulse Width, Duty)
  const channelMetrics = useMemo(() => {
    const keys = Object.keys(activeWaveformData);
    const metrics: Record<number, { freq: string; pulseWidth: string; duty: string; state: number }> = {};

    for (let ch = 0; ch < channelCount; ch++) {
      const explicitPin = channelPinMap[ch];
      const waveKey = explicitPin && activeWaveformData[explicitPin] ? explicitPin : keys[ch % keys.length];
      const pts = waveKey ? activeWaveformData[waveKey] : undefined;

      if (!pts || pts.length < 5) {
        metrics[ch] = { freq: '--', pulseWidth: '--', duty: '--', state: 0 };
        continue;
      }

      const lastV = pts[pts.length - 1].value;
      const state = lastV >= logicThreshold ? 1 : 0;

      let highCount = 0;
      const crossings: number[] = [];
      pts.forEach((p, i) => {
        if (p.value >= logicThreshold) highCount++;
        if (i > 0 && (pts[i - 1].value >= logicThreshold) !== (p.value >= logicThreshold)) {
          crossings.push(p.time);
        }
      });

      let freqStr = '--';
      let pwStr = '--';
      if (crossings.length >= 2) {
        const period = ((crossings[crossings.length - 1] - crossings[0]) / (crossings.length - 1)) * 2;
        if (period > 0.000001) {
          const f = 1 / period;
          freqStr = f >= 1000 ? `${(f / 1000).toFixed(1)} kHz` : `${f.toFixed(0)} Hz`;
          const pw = period * (highCount / pts.length);
          pwStr = pw >= 0.001 ? `${(pw * 1000).toFixed(1)} ms` : `${(pw * 1000000).toFixed(0)} µs`;
        }
      }

      const dutyStr = `${Math.round((highCount / pts.length) * 100)}%`;
      metrics[ch] = { freq: freqStr, pulseWidth: pwStr, duty: dutyStr, state };
    }

    return metrics;
  }, [channelCount, channelPinMap, activeWaveformData, logicThreshold]);

  // Synchronous Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Dark background
      ctx.fillStyle = '#050B14';
      ctx.fillRect(0, 0, width, height);

      const numChannels = channelCount;
      const rowHeight = height / numChannels;
      const keys = Object.keys(activeWaveformData);

      for (let ch = 0; ch < numChannels; ch++) {
        const topY = ch * rowHeight;
        const botY = topY + rowHeight;
        const highY = topY + 7;
        const lowY = botY - 7;

        // Row background
        ctx.fillStyle = ch % 2 === 0 ? '#070E1A' : '#050B14';
        ctx.fillRect(0, topY, width, rowHeight);
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, botY);
        ctx.lineTo(width, botY);
        ctx.stroke();

        // Trace
        const explicitPin = channelPinMap[ch];
        const waveKey = explicitPin && activeWaveformData[explicitPin] ? explicitPin : keys[ch % keys.length];
        const pts = waveKey ? activeWaveformData[waveKey] : undefined;

        const traceColor = [
          '#10B981', '#38BDF8', '#EAB308', '#EC4899', '#A855F7', '#F97316', '#06B6D4', '#F43F5E',
          '#10B981', '#38BDF8', '#EAB308', '#EC4899', '#A855F7', '#F97316', '#06B6D4', '#F43F5E',
        ][ch % 16];

        ctx.strokeStyle = traceColor;
        ctx.lineWidth = 2;
        ctx.beginPath();

        if (pts && pts.length > 1) {
          // Dynamically compress/expand timing waveforms on the horizontal axis based on zoomLevel
          const visibleCount = Math.max(8, Math.round(pts.length / zoomLevel));
          const startIndex = Math.max(0, pts.length - visibleCount);
          const visibleSlice = pts.slice(startIndex);
          const xStep = width / Math.max(1, visibleSlice.length - 1);

          visibleSlice.forEach((p, idx) => {
            const x = idx * xStep;
            const isHigh = p.value >= logicThreshold;
            const y = isHigh ? highY : lowY;

            if (idx === 0) {
              ctx.moveTo(x, y);
            } else {
              const prevHigh = visibleSlice[idx - 1].value >= logicThreshold;
              const prevY = prevHigh ? highY : lowY;
              if (prevY !== y) {
                ctx.lineTo(x, prevY);
              }
              ctx.lineTo(x, y);
            }
          });
        } else {
          // Inactive digital baseline (0 / LOW)
          ctx.moveTo(0, lowY);
          ctx.lineTo(width, lowY);
        }

        ctx.stroke();
      }

      if (la.running && isSimulating) {
        animId = requestAnimationFrame(render);
      }
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [channelCount, channelPinMap, activeWaveformData, zoomLevel, logicThreshold, la.running, isSimulating]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050B14] p-3 text-slate-200 select-none overflow-hidden font-mono text-xs">
      {/* Top Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xl mb-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold text-white text-xs uppercase tracking-wider">
            <Binary className="w-4 h-4 text-emerald-400" />
            Live 8/16-CH Synchronous Logic Analyzer
          </span>
          <div className="h-4 w-px bg-slate-800" />
          {/* Channel Count */}
          <div className="flex items-center gap-1 text-[11px] font-bold">
            <button
              onClick={() => setChannelCount(8)}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                channelCount === 8 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              8 Channels
            </button>
            <button
              onClick={() => setChannelCount(16)}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                channelCount === 16 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              16 Channels
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Logic Threshold */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400">Threshold:</span>
            <select
              value={logicThreshold}
              onChange={(e) => setLogicThreshold(parseFloat(e.target.value))}
              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-emerald-400 font-bold"
            >
              <option value={2.0}>TTL 5.0V (2.0V Level)</option>
              <option value={1.65}>CMOS 3.3V (1.65V Level)</option>
              <option value={0.9}>1.8V Low-Power (0.9V Level)</option>
            </select>
          </div>

          {/* Trigger Selection */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400">Trigger:</span>
            <select
              value={triggerCh}
              onChange={(e) => setTriggerCh(Number(e.target.value))}
              className="bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-amber-300 font-bold"
            >
              {Array.from({ length: channelCount }).map((_, i) => (
                <option key={i} value={i}>D{i}</option>
              ))}
            </select>
            <select
              value={triggerEdge}
              onChange={(e) => setTriggerEdge(e.target.value as 'rising' | 'falling')}
              className="bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-amber-300 font-bold"
            >
              <option value="rising">Rising ↗</option>
              <option value="falling">Falling ↘</option>
            </select>
          </div>

          {/* Protocol Decoder Selector */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400">Protocol:</span>
            <select
              value={protocolDecoder}
              onChange={(e) => setProtocolDecoder(e.target.value as 'none' | 'uart' | 'i2c' | 'spi' | 'pwm')}
              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-bold"
            >
              <option value="none">Raw Timing Only</option>
              <option value="pwm">PWM Pulse Width</option>
              <option value="uart">UART (Serial)</option>
              <option value="i2c">I2C (Two-Wire)</option>
              <option value="spi">SPI (Serial Bus)</option>
            </select>
          </div>

          {/* Zoom Buttons with 100% Reset */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.25, parseFloat((z - 0.25).toFixed(2))))}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              title="Zoom Out (Compress Timing)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1.0)}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold px-1.5 py-0.5 rounded cursor-pointer hover:bg-slate-800"
              title="Reset Zoom to 100%"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.min(4.0, parseFloat((z + 0.25).toFixed(2))))}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              title="Zoom In (Expand Timing)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Run / Stop (HOLD) Toggle */}
          <button
            onClick={() => {
              const nextRunning = !la.running;
              if (!nextRunning) {
                frozenWaveformsRef.current = JSON.parse(JSON.stringify(waveformData));
              } else {
                frozenWaveformsRef.current = null;
              }
              onUpdateInstruments({
                ...instruments,
                logicAnalyzer: { ...la, running: nextRunning },
              });
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs cursor-pointer shadow-md transition-all ${
              la.running ? 'bg-rose-950/90 border border-rose-600 text-rose-300 hover:bg-rose-900' : 'bg-emerald-950/90 border border-emerald-500 text-emerald-300 hover:bg-emerald-900'
            }`}
          >
            {la.running ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{la.running ? 'HOLD' : 'RESUME'}</span>
          </button>
        </div>
      </div>

      {/* Main Timing Diagrams & Per-Channel Pin Binding Column */}
      <div className="flex-1 flex border border-slate-800 rounded-xl overflow-hidden bg-slate-950 shadow-2xl relative min-h-0">
        {/* Left Channel Name & Pin Selector Strip */}
        <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 overflow-y-auto">
          {Array.from({ length: channelCount }).map((_, i) => {
            const m = channelMetrics[i] || { freq: '--', pulseWidth: '--', duty: '--', state: 0 };
            return (
              <div
                key={i}
                className="h-11 border-b border-slate-800/80 px-2 flex items-center justify-between gap-1 text-[11px] font-bold"
              >
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: [
                        '#10B981', '#38BDF8', '#EAB308', '#EC4899', '#A855F7', '#F97316', '#06B6D4', '#F43F5E',
                      ][i % 8],
                    }}
                  />
                  <span className="text-white w-6">D{i}</span>
                  <span
                    className={`px-1 py-0.2 rounded text-[9px] ${
                      m.state === 1 ? 'bg-emerald-950 text-emerald-400 border border-emerald-700' : 'bg-slate-950 text-slate-500'
                    }`}
                  >
                    {m.state}
                  </span>
                </div>

                {/* Target Circuit Pin Selector */}
                <select
                  value={channelPinMap[i] || ''}
                  onChange={(e) =>
                    setChannelPinMap((prev) => ({ ...prev, [i]: e.target.value }))
                  }
                  className="bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-cyan-300 font-mono w-28 truncate"
                >
                  {digitalPinOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* Metric Summary */}
                <span className="text-[9px] text-amber-300 font-mono w-14 text-right">
                  {m.freq !== '--' ? m.freq : m.duty}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right Timing Canvas Area */}
        <div className="flex-1 relative overflow-hidden bg-[#050B14]">
          <canvas
            ref={canvasRef}
            width={800}
            height={channelCount * 44}
            className="w-full h-full block cursor-ew-resize"
            onWheel={(e) => {
              e.preventDefault();
              if (e.deltaY < 0) {
                setZoomLevel((z) => Math.min(4.0, parseFloat((z + 0.25).toFixed(2))));
              } else {
                setZoomLevel((z) => Math.max(0.25, parseFloat((z - 0.25).toFixed(2))));
              }
            }}
          />
        </div>
      </div>

      {/* Bottom Protocol Decoder Packet Console */}
      {protocolDecoder !== 'none' && (
        <div className="mt-3 bg-slate-950 border border-cyan-900/60 rounded-xl p-2.5 max-h-36 overflow-y-auto space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-cyan-400 border-b border-slate-800 pb-1 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5" />
              {protocolDecoder.toUpperCase()} Real-Time Bus Packet Sniffer
            </span>
            <span className="text-slate-500">Threshold: {logicThreshold}V • Synchronous Capture</span>
          </div>

          {decodedPackets.length === 0 ? (
            <div className="py-2.5 text-center text-slate-500 text-[11px] italic">
              Idle — No valid {protocolDecoder.toUpperCase()} frames detected in captured signal
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-[10px] font-mono pt-1">
              {decodedPackets.map((pkt, idx) => (
                <div key={idx} className="p-1.5 rounded bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">{pkt.time}</span>
                  <span className="text-cyan-300 font-bold">{pkt.raw}</span>
                  <span className="text-emerald-400 font-bold">{pkt.char}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
