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
  _wires = [],
  waveformData = {},
  isSimulating = false,
}: DigitalLogicAnalyzer16Props & { _wires?: CircuitWire[] }) {
  const la = instruments.logicAnalyzer;
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // Decode mock UART / I2C / SPI / PWM packets from simulated timing
  const decodedPackets = useMemo(() => {
    if (protocolDecoder === 'uart') {
      return [
        { time: '0.012s', raw: '0x48', char: "'H'", parity: 'OK' },
        { time: '0.024s', raw: '0x45', char: "'E'", parity: 'OK' },
        { time: '0.036s', raw: '0x4C', char: "'L'", parity: 'OK' },
        { time: '0.048s', raw: '0x4C', char: "'L'", parity: 'OK' },
        { time: '0.060s', raw: '0x4F', char: "'O'", parity: 'OK' },
        { time: '0.072s', raw: '0x21', char: "'!'", parity: 'OK' },
      ];
    }
    if (protocolDecoder === 'i2c') {
      return [
        { time: '0.015s', raw: '0x3C', char: 'ADDR [0x3C W]', parity: 'ACK' },
        { time: '0.028s', raw: '0x00', char: 'REG [COMMAND]', parity: 'ACK' },
        { time: '0.041s', raw: '0xAF', char: 'DATA [DISPLAY ON]', parity: 'ACK' },
      ];
    }
    if (protocolDecoder === 'spi') {
      return [
        { time: '0.010s', raw: '0x06', char: 'WREN (0x06)', parity: 'OK' },
        { time: '0.022s', raw: '0x02', char: 'WRITE (0x02)', parity: 'OK' },
        { time: '0.034s', raw: '0xAA', char: 'DATA (0xAA)', parity: 'OK' },
      ];
    }
    if (protocolDecoder === 'pwm') {
      return [
        { time: 'CH0 (D0)', raw: '490 Hz', char: 'Duty: 64%', parity: 'PWM ~' },
        { time: 'CH1 (D1)', raw: '980 Hz', char: 'Duty: 25%', parity: 'PWM ~' },
      ];
    }
    return [];
  }, [protocolDecoder]);

  // Per-channel live metrics (Frequency, Pulse Width, Duty)
  const channelMetrics = useMemo(() => {
    const keys = Object.keys(waveformData);
    const metrics: Record<number, { freq: string; pulseWidth: string; duty: string; state: number }> = {};

    for (let ch = 0; ch < channelCount; ch++) {
      const explicitPin = channelPinMap[ch];
      const waveKey = explicitPin && waveformData[explicitPin] ? explicitPin : keys[ch % keys.length];
      const pts = waveKey ? waveformData[waveKey] : undefined;

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
  }, [channelCount, channelPinMap, waveformData, logicThreshold]);

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
      const keys = Object.keys(waveformData);

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
        const waveKey = explicitPin && waveformData[explicitPin] ? explicitPin : keys[ch % keys.length];
        const pts = waveKey ? waveformData[waveKey] : undefined;

        const traceColor = [
          '#10B981', '#38BDF8', '#EAB308', '#EC4899', '#A855F7', '#F97316', '#06B6D4', '#F43F5E',
          '#10B981', '#38BDF8', '#EAB308', '#EC4899', '#A855F7', '#F97316', '#06B6D4', '#F43F5E',
        ][ch % 16];

        ctx.strokeStyle = traceColor;
        ctx.lineWidth = 2;
        ctx.beginPath();

        if (pts && pts.length > 1) {
          const xStep = (width / (pts.length - 1)) * zoomLevel;
          pts.forEach((p, idx) => {
            const x = idx * xStep;
            const isHigh = p.value >= logicThreshold;
            const y = isHigh ? highY : lowY;

            if (idx === 0) {
              ctx.moveTo(x, y);
            } else {
              const prevHigh = pts[idx - 1].value >= logicThreshold;
              const prevY = prevHigh ? highY : lowY;
              if (prevY !== y) {
                ctx.lineTo(x, prevY);
              }
              ctx.lineTo(x, y);
            }
          });
        } else {
          // Synthetic digital level
          const isHigh = ch % 2 === 0;
          ctx.moveTo(0, isHigh ? highY : lowY);
          ctx.lineTo(width, isHigh ? highY : lowY);
        }

        ctx.stroke();
      }

      if (la.running && isSimulating) {
        animId = requestAnimationFrame(render);
      }
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [channelCount, channelPinMap, waveformData, zoomLevel, logicThreshold, la.running, isSimulating]);

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

          {/* Zoom Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-slate-400 font-bold px-1">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(3.0, z + 0.25))}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Run / Stop Toggle */}
          <button
            onClick={() =>
              onUpdateInstruments({
                ...instruments,
                logicAnalyzer: { ...la, running: !la.running },
              })
            }
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs cursor-pointer shadow-md ${
              la.running ? 'bg-rose-950 border border-rose-600 text-rose-300' : 'bg-emerald-950 border border-emerald-500 text-emerald-300'
            }`}
          >
            {la.running ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{la.running ? 'HOLD' : 'ACQUIRE'}</span>
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
          <canvas ref={canvasRef} width={800} height={channelCount * 44} className="w-full h-full block" />
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

          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-[10px] font-mono pt-1">
            {decodedPackets.map((pkt, idx) => (
              <div key={idx} className="p-1.5 rounded bg-slate-900 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">{pkt.time}</span>
                <span className="text-cyan-300 font-bold">{pkt.raw}</span>
                <span className="text-emerald-400 font-bold">{pkt.char}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
