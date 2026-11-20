'use client';

import React, { useState } from 'react';
import { Calculator, Zap, Cpu, Activity, Sliders, Waves, Layers, AlertTriangle } from 'lucide-react';

type CalcTab = 'ohm' | 'divider' | '555' | 'led' | 'rc' | 'lc' | 'pcb';
type OhmMode = 'VR' | 'VI' | 'VP' | 'IR' | 'IP' | 'RP';

// Standard E12 values [1.0 .. 8.2]
const E12_SERIES = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];

function findNearestE12(rOhms: number): number {
  if (rOhms <= 0 || !isFinite(rOhms)) return 0;
  const exponent = Math.floor(Math.log10(rOhms));
  const mantissa = rOhms / Math.pow(10, exponent);
  let best = E12_SERIES[0];
  let minDiff = Infinity;
  for (const val of E12_SERIES) {
    const diff = Math.abs(val - mantissa);
    if (diff < minDiff) {
      minDiff = diff;
      best = val;
    }
  }
  // Check if next decade's first item (10.0) is closer
  if (Math.abs(10.0 - mantissa) < minDiff) {
    return 10.0 * Math.pow(10, exponent);
  }
  return Math.round(best * Math.pow(10, exponent) * 100) / 100;
}

function formatResistance(r: number): string {
  if (r <= 0 || !isFinite(r)) return '0 Ω';
  if (r >= 1e6) return `${(r / 1e6).toFixed(2)} MΩ`;
  if (r >= 1e3) return `${(r / 1e3).toFixed(2)} kΩ`;
  if (r < 1) return `${(r * 1000).toFixed(2)} mΩ`;
  return `${r.toFixed(2)} Ω`;
}

export function CalculatorsPanel() {
  const [activeTab, setActiveTab] = useState<CalcTab>('555');

  // 1. Ohm's Law Multi-Variable Solver State
  const [ohmMode, setOhmMode] = useState<OhmMode>('VR');
  const [ohmVVal, setOhmVVal] = useState<string>('9');
  const [ohmVUnit, setOhmVUnit] = useState<'mV' | 'V' | 'kV'>('V');

  const [ohmIVal, setOhmIVal] = useState<string>('9');
  const [ohmIUnit, setOhmIUnit] = useState<'uA' | 'mA' | 'A'>('mA');

  const [ohmRVal, setOhmRVal] = useState<string>('1000');
  const [ohmRUnit, setOhmRUnit] = useState<'mOhm' | 'Ohm' | 'kOhm' | 'MOhm'>('Ohm');

  const [ohmPVal, setOhmPVal] = useState<string>('81');
  const [ohmPUnit, setOhmPUnit] = useState<'uW' | 'mW' | 'W' | 'kW'>('mW');

  const calcOhmMulti = () => {
    // Multipliers to standard SI units (V, A, Ohm, W)
    const multV = ohmVUnit === 'mV' ? 1e-3 : ohmVUnit === 'kV' ? 1e3 : 1;
    const multI = ohmIUnit === 'uA' ? 1e-6 : ohmIUnit === 'mA' ? 1e-3 : 1;
    const multR = ohmRUnit === 'mOhm' ? 1e-3 : ohmRUnit === 'kOhm' ? 1e3 : ohmRUnit === 'MOhm' ? 1e6 : 1;
    const multP = ohmPUnit === 'uW' ? 1e-6 : ohmPUnit === 'mW' ? 1e-3 : ohmPUnit === 'kW' ? 1e3 : 1;

    let v = 0;
    let i = 0;
    let r = 0;
    let p = 0;

    switch (ohmMode) {
      case 'VR': {
        v = (parseFloat(ohmVVal) || 0) * multV;
        r = Math.max((parseFloat(ohmRVal) || 0) * multR, 1e-9);
        i = v / r;
        p = v * i;
        break;
      }
      case 'VI': {
        v = (parseFloat(ohmVVal) || 0) * multV;
        i = (parseFloat(ohmIVal) || 0) * multI;
        r = i !== 0 ? Math.abs(v / i) : 0;
        p = Math.abs(v * i);
        break;
      }
      case 'VP': {
        v = (parseFloat(ohmVVal) || 0) * multV;
        p = Math.max((parseFloat(ohmPVal) || 0) * multP, 0);
        i = v !== 0 ? p / v : 0;
        r = p > 0 ? (v * v) / p : 0;
        break;
      }
      case 'IR': {
        i = (parseFloat(ohmIVal) || 0) * multI;
        r = Math.max((parseFloat(ohmRVal) || 0) * multR, 0);
        v = i * r;
        p = i * i * r;
        break;
      }
      case 'IP': {
        i = (parseFloat(ohmIVal) || 0) * multI;
        p = Math.max((parseFloat(ohmPVal) || 0) * multP, 0);
        v = i !== 0 ? p / i : 0;
        r = i !== 0 ? p / (i * i) : 0;
        break;
      }
      case 'RP': {
        r = Math.max((parseFloat(ohmRVal) || 0) * multR, 1e-9);
        p = Math.max((parseFloat(ohmPVal) || 0) * multP, 0);
        v = Math.sqrt(p * r);
        i = Math.sqrt(p / r);
        break;
      }
    }

    return {
      v,
      i,
      r,
      p,
      nearestE12: findNearestE12(r),
      isOverheating: p > 0.25, // > 250mW standard resistor dissipation rating
    };
  };

  // 2. Voltage Divider State
  const [divVin, setDivVin] = useState<string>('5');
  const [divR1, setDivR1] = useState<string>('10000');
  const [divR2, setDivR2] = useState<string>('4700');
  const calcDivider = () => {
    const vin = parseFloat(divVin) || 0;
    const r1 = parseFloat(divR1) || 0;
    const r2 = parseFloat(divR2) || 0;
    const vout = r1 + r2 > 0 ? (vin * r2) / (r1 + r2) : 0;
    const req = r1 + r2 > 0 ? (r1 * r2) / (r1 + r2) : 0;
    const iTot = r1 + r2 > 0 ? vin / (r1 + r2) : 0;
    return {
      vout: Math.round(vout * 1000) / 1000,
      req: Math.round(req * 10) / 10,
      currentMa: Math.round(iTot * 100000) / 100,
      ratio: r1 + r2 > 0 ? Math.round((r2 / (r1 + r2)) * 1000) / 10 : 0,
    };
  };

  // 3. NE555 Timer Astable State
  const [ra555, setRa555] = useState<string>('10000'); // 10k
  const [rb555, setRb555] = useState<string>('47000'); // 47k
  const [c555, setC555] = useState<string>('10'); // 10 uF
  const calc555 = () => {
    const ra = parseFloat(ra555) || 0;
    const rb = parseFloat(rb555) || 0;
    const c = (parseFloat(c555) || 0) * 1e-6; // convert uF to F
    if (ra <= 0 || rb <= 0 || c <= 0) return { freq: 0, th: 0, tl: 0, period: 0, duty: 0 };

    const th = 0.693 * (ra + rb) * c;
    const tl = 0.693 * rb * c;
    const period = th + tl;
    const freq = period > 0 ? 1 / period : 0;
    const duty = period > 0 ? (th / period) * 100 : 0;

    return {
      freq: Math.round(freq * 100) / 100,
      thSec: Math.round(th * 10000) / 10000,
      tlSec: Math.round(tl * 10000) / 10000,
      periodSec: Math.round(period * 10000) / 10000,
      duty: Math.round(duty * 10) / 10,
    };
  };

  // 4. LED Current Limiter State
  const [ledVs, setLedVs] = useState<string>('5');
  const [ledVf, setLedVf] = useState<string>('2.0'); // 2V for red/green
  const [ledIf, setLedIf] = useState<string>('20'); // 20mA
  const calcLed = () => {
    const vs = parseFloat(ledVs) || 0;
    const vf = parseFloat(ledVf) || 0;
    const ifMa = parseFloat(ledIf) || 0;
    const ifA = ifMa / 1000;
    if (vs <= vf || ifA <= 0) return { r: 0, powerMw: 0, standardE12: 0 };

    const rExact = (vs - vf) / ifA;
    const powerMw = ifA * ifA * rExact * 1000;

    // Nearest standard E12 series resistor
    const standardE12 = [100, 120, 150, 180, 220, 270, 330, 390, 470, 560, 680, 820, 1000];
    let nearest = standardE12[0];
    let minDiff = Infinity;
    for (const val of standardE12) {
      if (Math.abs(val - rExact) < minDiff) {
        minDiff = Math.abs(val - rExact);
        nearest = val;
      }
    }

    return {
      rExact: Math.round(rExact * 10) / 10,
      nearestE12: nearest,
      powerMw: Math.round(powerMw * 10) / 10,
    };
  };

  // 5. RC / Cutoff State
  const [rcR, setRcR] = useState<string>('10000');
  const [rcC, setRcC] = useState<string>('0.1'); // 0.1 uF
  const calcRc = () => {
    const r = parseFloat(rcR) || 0;
    const c = (parseFloat(rcC) || 0) * 1e-6;
    if (r <= 0 || c <= 0) return { tauSec: 0, fc: 0 };
    const tau = r * c;
    const fc = 1 / (2 * Math.PI * r * c);
    return {
      tauSec: Math.round(tau * 1000000) / 1000000,
      tauMs: Math.round(tau * 100000) / 100,
      fcHz: Math.round(fc * 10) / 10,
    };
  };

  // 6. LC Resonant State
  const [lcL, setLcL] = useState<string>('10'); // 10 mH
  const [lcC, setLcC] = useState<string>('100'); // 100 nF
  const calcLc = () => {
    const l = (parseFloat(lcL) || 0) * 1e-3;
    const c = (parseFloat(lcC) || 0) * 1e-9;
    if (l <= 0 || c <= 0) return { f0: 0 };
    const f0 = 1 / (2 * Math.PI * Math.sqrt(l * c));
    return {
      f0Hz: Math.round(f0 * 10) / 10,
      f0Khz: Math.round((f0 / 1000) * 100) / 100,
    };
  };

  // 7. PCB Trace Width (IPC-2152) State
  const [pcbCurrent, setPcbCurrent] = useState<string>('1.5'); // 1.5 Amps
  const [pcbTempRise, setPcbTempRise] = useState<string>('10'); // 10 deg C
  const [pcbCuOz, setPcbCuOz] = useState<string>('1'); // 1 oz / 1.37 mil
  const calcPcbTrace = () => {
    const i = parseFloat(pcbCurrent) || 1.0;
    const deltaT = parseFloat(pcbTempRise) || 10.0;
    const cuOz = parseFloat(pcbCuOz) || 1.0;
    const thicknessMils = cuOz * 1.37; // 1 oz = 1.37 mils = 0.035 mm

    // IPC-2152 External layer: A = (I / (k * deltaT^0.44))^(1 / 0.725)
    // k = 0.048 for external layer
    const kExt = 0.048;
    const areaMils2Ext = Math.pow(i / (kExt * Math.pow(deltaT, 0.44)), 1 / 0.725);
    const widthMilsExt = areaMils2Ext / thicknessMils;
    const widthMmExt = widthMilsExt * 0.0254;

    // Internal layer: k = 0.024
    const kInt = 0.024;
    const areaMils2Int = Math.pow(i / (kInt * Math.pow(deltaT, 0.44)), 1 / 0.725);
    const widthMilsInt = areaMils2Int / thicknessMils;
    const widthMmInt = widthMilsInt * 0.0254;

    return {
      extWidthMils: Math.round(widthMilsExt * 10) / 10,
      extWidthMm: Math.round(widthMmExt * 100) / 100,
      intWidthMils: Math.round(widthMilsInt * 10) / 10,
      intWidthMm: Math.round(widthMmInt * 100) / 100,
    };
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row bg-[#070D18] text-slate-200 select-none overflow-hidden h-full min-w-0 max-w-full">
      {/* Left Navigation Menu */}
      <div className="w-full lg:w-72 bg-slate-900/90 border-b lg:border-b-0 lg:border-r border-slate-800 p-3 lg:p-4 flex flex-col shrink-0 min-w-0">
        <div className="flex items-center gap-2 pb-2.5 lg:pb-3 border-b border-slate-800 mb-2.5 lg:mb-4">
          <Calculator className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
            R&D Engineering Calculators
          </h2>
        </div>

        <nav className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-1.5 lg:space-y-1 pb-1.5 lg:pb-0 no-scrollbar touch-scroll text-xs font-medium">
          <button
            onClick={() => setActiveTab('555')}
            className={`px-3 py-2 rounded-lg flex items-center gap-2.5 transition-all text-left shrink-0 whitespace-nowrap lg:whitespace-normal ${
              activeTab === '555' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4 text-amber-400 shrink-0" />
            <span>NE555 Astable / Monostable</span>
          </button>

          <button
            onClick={() => setActiveTab('ohm')}
            className={`px-3 py-2 rounded-lg flex items-center gap-2.5 transition-all text-left shrink-0 whitespace-nowrap lg:whitespace-normal ${
              activeTab === 'ohm' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
            <span>Ohm&apos;s Law & Power</span>
          </button>

          <button
            onClick={() => setActiveTab('divider')}
            className={`px-3 py-2 rounded-lg flex items-center gap-2.5 transition-all text-left shrink-0 whitespace-nowrap lg:whitespace-normal ${
              activeTab === 'divider' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Voltage Divider</span>
          </button>

          <button
            onClick={() => setActiveTab('led')}
            className={`px-3 py-2 rounded-lg flex items-center gap-2.5 transition-all text-left shrink-0 whitespace-nowrap lg:whitespace-normal ${
              activeTab === 'led' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4 text-rose-400 shrink-0" />
            <span>LED Current Limiter</span>
          </button>

          <button
            onClick={() => setActiveTab('rc')}
            className={`px-3 py-2 rounded-lg flex items-center gap-2.5 transition-all text-left shrink-0 whitespace-nowrap lg:whitespace-normal ${
              activeTab === 'rc' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Waves className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>RC Cutoff & Time Constant</span>
          </button>

          <button
            onClick={() => setActiveTab('lc')}
            className={`px-3 py-2 rounded-lg flex items-center gap-2.5 transition-all text-left shrink-0 whitespace-nowrap lg:whitespace-normal ${
              activeTab === 'lc' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4 text-purple-400 shrink-0" />
            <span>LC Resonant Frequency</span>
          </button>

          <button
            onClick={() => setActiveTab('pcb')}
            className={`px-3 py-2 rounded-lg flex items-center gap-2.5 transition-all text-left shrink-0 whitespace-nowrap lg:whitespace-normal ${
              activeTab === 'pcb' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>PCB Trace Width (IPC-2152)</span>
          </button>
        </nav>

        <div className="hidden lg:block mt-auto p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-mono">
          <div className="text-emerald-400 font-bold mb-1">EI House R&D Lab</div>
          Validated closed-form engineering formulations based on IEC/IEEE and IPC standards.
        </div>
      </div>

      {/* Right Content Body */}
      <div className="flex-1 p-3 sm:p-6 overflow-y-auto min-w-0">
        {/* 1. NE555 ASTABLE CALCULATOR */}
        {activeTab === '555' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">NE555 Timer Astable Multivibrator</h3>
              <p className="text-xs text-slate-400 mt-1">
                Calculates output oscillation frequency, timing periods (T_high, T_low), and duty cycle.
              </p>
            </div>

            {/* Formula Banner */}
            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-emerald-300">
              f ≈ 1.44 / ((R_A + 2 · R_B) · C) &nbsp;|&nbsp; T_high = 0.693 · (R_A + R_B) · C &nbsp;|&nbsp; T_low = 0.693 · R_B · C
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Resistor R_A (Ω)</label>
                <input
                  type="number"
                  value={ra555}
                  onChange={(e) => setRa555(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Resistor R_B (Ω)</label>
                <input
                  type="number"
                  value={rb555}
                  onChange={(e) => setRb555(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Timing Capacitor C (µF)</label>
                <input
                  type="number"
                  value={c555}
                  onChange={(e) => setC555(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Results Grid */}
            {(() => {
              const res = calc555();
              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <div className="p-3 bg-slate-950 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Frequency</span>
                    <span className="text-xl font-bold font-mono text-emerald-400">{res.freq} Hz</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Period (T)</span>
                    <span className="text-xl font-bold font-mono text-cyan-400">{res.periodSec} s</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">T_High / T_Low</span>
                    <span className="text-sm font-bold font-mono text-slate-200">
                      {res.thSec}s / {res.tlSec}s
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Duty Cycle</span>
                    <span className="text-xl font-bold font-mono text-amber-400">{res.duty}%</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 2. OHM'S LAW CALCULATOR (MULTI-VARIABLE SOLVER) */}
        {activeTab === 'ohm' && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">Ohm&apos;s Law & Electrical Power Solver</h3>
              <p className="text-xs text-slate-400 mt-1">
                Multi-variable solver: Select any two known variables to dynamically calculate the remaining parameters.
              </p>
            </div>

            {/* Formula Banner */}
            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-yellow-300 flex flex-wrap gap-x-4 gap-y-1">
              <span>V = I · R</span>
              <span className="text-slate-600">|</span>
              <span>P = V · I</span>
              <span className="text-slate-600">|</span>
              <span>P = I² · R</span>
              <span className="text-slate-600">|</span>
              <span>P = V² / R</span>
              <span className="text-slate-600">|</span>
              <span>R = V² / P</span>
            </div>

            {/* Mode Selector */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-3">
              <label className="text-xs font-mono font-bold text-slate-300 block">
                Select Known Variables (Solve Mode):
              </label>
              <select
                value={ohmMode}
                onChange={(e) => setOhmMode(e.target.value as OhmMode)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-emerald-400 focus:border-emerald-500 focus:outline-none"
              >
                <option value="VR">Known: Voltage (V) &amp; Resistance (R) → Solve Current &amp; Power</option>
                <option value="VI">Known: Voltage (V) &amp; Current (I) → Solve Resistance &amp; Power</option>
                <option value="VP">Known: Voltage (V) &amp; Power (P) → Solve Current &amp; Resistance</option>
                <option value="IR">Known: Current (I) &amp; Resistance (R) → Solve Voltage &amp; Power</option>
                <option value="IP">Known: Current (I) &amp; Power (P) → Solve Voltage &amp; Resistance</option>
                <option value="RP">Known: Resistance (R) &amp; Power (P) → Solve Voltage &amp; Current</option>
              </select>
            </div>

            {/* Variable Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Voltage Input (when mode is VR, VI, VP) */}
              {(ohmMode === 'VR' || ohmMode === 'VI' || ohmMode === 'VP') && (
                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Voltage (V)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      value={ohmVVal}
                      onChange={(e) => setOhmVVal(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <select
                      value={ohmVUnit}
                      onChange={(e) => setOhmVUnit(e.target.value as 'mV' | 'V' | 'kV')}
                      className="bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-xs font-mono text-slate-300 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="mV">mV</option>
                      <option value="V">V</option>
                      <option value="kV">kV</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Current Input (when mode is VI, IR, IP) */}
              {(ohmMode === 'VI' || ohmMode === 'IR' || ohmMode === 'IP') && (
                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Current (I)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      value={ohmIVal}
                      onChange={(e) => setOhmIVal(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <select
                      value={ohmIUnit}
                      onChange={(e) => setOhmIUnit(e.target.value as 'uA' | 'mA' | 'A')}
                      className="bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-xs font-mono text-slate-300 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="uA">µA</option>
                      <option value="mA">mA</option>
                      <option value="A">A</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Resistance Input (when mode is VR, IR, RP) */}
              {(ohmMode === 'VR' || ohmMode === 'IR' || ohmMode === 'RP') && (
                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Resistance (R)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      value={ohmRVal}
                      onChange={(e) => setOhmRVal(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <select
                      value={ohmRUnit}
                      onChange={(e) => setOhmRUnit(e.target.value as 'mOhm' | 'Ohm' | 'kOhm' | 'MOhm')}
                      className="bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-xs font-mono text-slate-300 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="mOhm">mΩ</option>
                      <option value="Ohm">Ω</option>
                      <option value="kOhm">kΩ</option>
                      <option value="MOhm">MΩ</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Power Input (when mode is VP, IP, RP) */}
              {(ohmMode === 'VP' || ohmMode === 'IP' || ohmMode === 'RP') && (
                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Power (P)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      value={ohmPVal}
                      onChange={(e) => setOhmPVal(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <select
                      value={ohmPUnit}
                      onChange={(e) => setOhmPUnit(e.target.value as 'uW' | 'mW' | 'W' | 'kW')}
                      className="bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-xs font-mono text-slate-300 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="uW">µW</option>
                      <option value="mW">mW</option>
                      <option value="W">W</option>
                      <option value="kW">kW</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Results Grid */}
            {(() => {
              const res = calcOhmMulti();
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                    {/* Voltage */}
                    <div className="p-3 bg-slate-950 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Voltage (V)</span>
                      <span className="text-lg font-bold font-mono text-emerald-400">
                        {res.v >= 1000
                          ? `${(res.v / 1000).toFixed(3)} kV`
                          : res.v >= 1
                          ? `${res.v.toFixed(3)} V`
                          : `${(res.v * 1000).toFixed(2)} mV`}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                        {res.v.toFixed(4)} V
                      </span>
                    </div>

                    {/* Current */}
                    <div className="p-3 bg-slate-950 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Current (I)</span>
                      <span className="text-lg font-bold font-mono text-cyan-400">
                        {res.i >= 1
                          ? `${res.i.toFixed(3)} A`
                          : res.i >= 1e-3
                          ? `${(res.i * 1e3).toFixed(3)} mA`
                          : `${(res.i * 1e6).toFixed(2)} µA`}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                        {(res.i * 1e3).toFixed(4)} mA
                      </span>
                    </div>

                    {/* Resistance */}
                    <div className="p-3 bg-slate-950 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Resistance (R)</span>
                      <span className="text-lg font-bold font-mono text-purple-400">
                        {formatResistance(res.r)}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                        {res.r.toFixed(2)} Ω
                      </span>
                    </div>

                    {/* Power */}
                    <div className="p-3 bg-slate-950 rounded-lg">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Power (P)</span>
                      <span className="text-lg font-bold font-mono text-yellow-400">
                        {res.p >= 1
                          ? `${res.p.toFixed(3)} W`
                          : res.p >= 1e-3
                          ? `${(res.p * 1e3).toFixed(2)} mW`
                          : `${(res.p * 1e6).toFixed(1)} µW`}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                        {res.p.toFixed(4)} W
                      </span>
                    </div>
                  </div>

                  {/* Standard E12 Resistor Suggestion */}
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs font-mono gap-2">
                    <span className="text-slate-400">Nearest Standard E12 Resistor:</span>
                    <span className="text-emerald-400 font-bold bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                      {formatResistance(res.nearestE12)} (±10% standard tolerance)
                    </span>
                  </div>

                  {/* Thermal Dissipation Warning */}
                  {res.isOverheating && (
                    <div className="p-3 bg-amber-950/40 border border-amber-600/50 rounded-xl text-amber-200 text-xs flex items-center gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        <strong>Thermal Dissipation Warning:</strong> Power dissipation ({res.p >= 1 ? `${res.p.toFixed(2)}W` : `${(res.p * 1000).toFixed(1)}mW`}) exceeds standard 1/4-Watt (250mW) through-hole resistor ratings. Use a 1/2W, 1W or ceramic power resistor with thermal relief.
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* 3. VOLTAGE DIVIDER CALCULATOR */}
        {activeTab === 'divider' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">Resistive Voltage Divider</h3>
              <p className="text-xs text-slate-400 mt-1">
                Calculates output voltage V_out and Thevenin equivalent source impedance.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-blue-300">
              V_out = V_in · (R_2 / (R_1 + R_2)) &nbsp;|&nbsp; R_th = R_1 ∥ R_2
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Input Voltage (V)</label>
                <input
                  type="number"
                  value={divVin}
                  onChange={(e) => setDivVin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Top Resistor R1 (Ω)</label>
                <input
                  type="number"
                  value={divR1}
                  onChange={(e) => setDivR1(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Bottom Resistor R2 (Ω)</label>
                <input
                  type="number"
                  value={divR2}
                  onChange={(e) => setDivR2(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {(() => {
              const res = calcDivider();
              return (
                <div className="grid grid-cols-3 gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <div className="p-3 bg-slate-950 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Output Voltage</span>
                    <span className="text-xl font-bold font-mono text-emerald-400">{res.vout} V</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Thevenin R_th</span>
                    <span className="text-xl font-bold font-mono text-blue-400">{res.req} Ω</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Quiescent Current</span>
                    <span className="text-xl font-bold font-mono text-slate-300">{res.currentMa} mA</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 4. LED CURRENT LIMITER */}
        {activeTab === 'led' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">LED Current-Limiting Resistor</h3>
              <p className="text-xs text-slate-400 mt-1">
                Calculates required series ballast resistance and nearest standard E12 resistor value.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-rose-300">
              R = (V_supply - V_forward) / I_forward &nbsp;|&nbsp; P_res = I_f² · R
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Supply Voltage (V)</label>
                <input
                  type="number"
                  value={ledVs}
                  onChange={(e) => setLedVs(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Forward Drop Vf (V)</label>
                <input
                  type="number"
                  value={ledVf}
                  onChange={(e) => setLedVf(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Target Current If (mA)</label>
                <input
                  type="number"
                  value={ledIf}
                  onChange={(e) => setLedIf(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {(() => {
              const res = calcLed();
              return (
                <div className="grid grid-cols-3 gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <div className="p-3 bg-slate-950 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Exact Resistance</span>
                    <span className="text-xl font-bold font-mono text-rose-400">{res.rExact} Ω</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Nearest E12 Standard</span>
                    <span className="text-xl font-bold font-mono text-emerald-400">{res.nearestE12} Ω</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Resistor Power</span>
                    <span className="text-xl font-bold font-mono text-amber-400">{res.powerMw} mW</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 5. RC CUTOFF CALCULATOR */}
        {activeTab === 'rc' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">RC Lowpass / Highpass Cutoff & Time Constant</h3>
              <p className="text-xs text-slate-400 mt-1">Calculates corner frequency -3dB and step-response time constant $\tau$.</p>
            </div>

            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-cyan-300">
              τ = R · C &nbsp;|&nbsp; f_cutoff = 1 / (2 · π · R · C)
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Resistance (Ω)</label>
                <input
                  type="number"
                  value={rcR}
                  onChange={(e) => setRcR(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Capacitance (µF)</label>
                <input
                  type="number"
                  value={rcC}
                  onChange={(e) => setRcC(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {(() => {
              const res = calcRc();
              return (
                <div className="grid grid-cols-2 gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <div className="p-3 bg-slate-950 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Time Constant (τ)</span>
                    <span className="text-xl font-bold font-mono text-cyan-400">{res.tauMs} ms</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Cutoff Frequency (-3dB)</span>
                    <span className="text-xl font-bold font-mono text-emerald-400">{res.fcHz} Hz</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 6. LC RESONANT CALCULATOR */}
        {activeTab === 'lc' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">LC Tank Resonant Frequency</h3>
              <p className="text-xs text-slate-400 mt-1">Calculates undamped resonance frequency of parallel/series LC circuits.</p>
            </div>

            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-purple-300">
              f_0 = 1 / (2 · π · √(L · C))
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Inductance L (mH)</label>
                <input
                  type="number"
                  value={lcL}
                  onChange={(e) => setLcL(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Capacitance C (nF)</label>
                <input
                  type="number"
                  value={lcC}
                  onChange={(e) => setLcC(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {(() => {
              const res = calcLc();
              return (
                <div className="grid grid-cols-2 gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <div className="p-3 bg-slate-950 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Resonant Frequency</span>
                    <span className="text-xl font-bold font-mono text-purple-400">{res.f0Khz} kHz</span>
                    <span className="text-xs font-mono text-slate-500 block mt-1">({res.f0Hz} Hz)</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 7. PCB TRACE WIDTH CALCULATOR */}
        {activeTab === 'pcb' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">PCB Trace Width (IPC-2152 Standard)</h3>
              <p className="text-xs text-slate-400 mt-1">
                Calculates required copper trace width for target current and acceptable temperature rise.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-emerald-300">
              I = k · ΔT^0.44 · A^0.725 (IPC-2152 formulation)
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Current (Amperes)</label>
                <input
                  type="number"
                  value={pcbCurrent}
                  onChange={(e) => setPcbCurrent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Temp Rise ΔT (°C)</label>
                <input
                  type="number"
                  value={pcbTempRise}
                  onChange={(e) => setPcbTempRise(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Copper Weight (oz)</label>
                <select
                  value={pcbCuOz}
                  onChange={(e) => setPcbCuOz(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="1">1 oz (35 µm)</option>
                  <option value="2">2 oz (70 µm)</option>
                  <option value="0.5">0.5 oz (18 µm)</option>
                </select>
              </div>
            </div>

            {(() => {
              const res = calcPcbTrace();
              return (
                <div className="grid grid-cols-2 gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <div className="p-3 bg-slate-950 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">External Layer Width</span>
                    <span className="text-xl font-bold font-mono text-emerald-400">{res.extWidthMm} mm</span>
                    <span className="text-xs font-mono text-slate-500 block mt-1">({res.extWidthMils} mils)</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Internal Layer Width</span>
                    <span className="text-xl font-bold font-mono text-cyan-400">{res.intWidthMm} mm</span>
                    <span className="text-xs font-mono text-slate-500 block mt-1">({res.intWidthMils} mils)</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
