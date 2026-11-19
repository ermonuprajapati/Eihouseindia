'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Calculator,
  Copy,
  Check,
  ExternalLink,
  Cpu,
  Layers,
  ArrowRightLeft,
  Sparkles,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import type { EngineeringTool } from '@/types';

// ============================================================================
// CONSTANTS & COLOR DATA FOR RESISTOR SOLVER
// ============================================================================

interface ColorBandDef {
  name: string;
  hex: string;
  textDark?: boolean;
  digit?: number;
  multiplier?: number;
  multiplierLabel?: string;
  tolerance?: number;
  toleranceLabel?: string;
  tcr?: number; // ppm/K
  tcrLabel?: string;
}

const COLOR_PALETTE: ColorBandDef[] = [
  { name: 'Black', hex: '#111827', digit: 0, multiplier: 1, multiplierLabel: '×1 Ω' },
  { name: 'Brown', hex: '#854D0E', digit: 1, multiplier: 10, multiplierLabel: '×10 Ω', tolerance: 1, toleranceLabel: '±1%', tcr: 100, tcrLabel: '100 ppm/K' },
  { name: 'Red', hex: '#DC2626', digit: 2, multiplier: 100, multiplierLabel: '×100 Ω', tolerance: 2, toleranceLabel: '±2%', tcr: 50, tcrLabel: '50 ppm/K' },
  { name: 'Orange', hex: '#EA580C', digit: 3, multiplier: 1000, multiplierLabel: '×1 kΩ', tolerance: 0.05, toleranceLabel: '±0.05%', tcr: 15, tcrLabel: '15 ppm/K' },
  { name: 'Yellow', hex: '#FACC15', textDark: true, digit: 4, multiplier: 10000, multiplierLabel: '×10 kΩ', tcr: 25, tcrLabel: '25 ppm/K' },
  { name: 'Green', hex: '#16A34A', digit: 5, multiplier: 100000, multiplierLabel: '×100 kΩ', tolerance: 0.5, toleranceLabel: '±0.5%' },
  { name: 'Blue', hex: '#2563EB', digit: 6, multiplier: 1000000, multiplierLabel: '×1 MΩ', tolerance: 0.25, toleranceLabel: '±0.25%', tcr: 10, tcrLabel: '10 ppm/K' },
  { name: 'Violet', hex: '#7C3AED', digit: 7, multiplier: 10000000, multiplierLabel: '×10 MΩ', tolerance: 0.1, toleranceLabel: '±0.1%', tcr: 5, tcrLabel: '5 ppm/K' },
  { name: 'Grey', hex: '#6B7280', digit: 8, multiplier: 100000000, multiplierLabel: '×100 MΩ', tolerance: 0.05, toleranceLabel: '±0.05%' },
  { name: 'White', hex: '#F8FAFC', textDark: true, digit: 9, multiplier: 1000000000, multiplierLabel: '×1 GΩ' },
  { name: 'Gold', hex: '#D4AF37', textDark: true, multiplier: 0.1, multiplierLabel: '×0.1 Ω', tolerance: 5, toleranceLabel: '±5%' },
  { name: 'Silver', hex: '#CBD5E1', textDark: true, multiplier: 0.01, multiplierLabel: '×0.01 Ω', tolerance: 10, toleranceLabel: '±10%' },
];

const STANDARD_E24 = [
  1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0,
  3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1,
];

function formatResistance(val: number): string {
  if (val >= 1000000000) return `${(val / 1000000000).toFixed(2)} GΩ`;
  if (val >= 1000000) return `${(val / 1000000).toFixed(2)} MΩ`;
  if (val >= 1000) return `${(val / 1000).toFixed(2)} kΩ`;
  if (val < 1) return `${val.toFixed(2)} Ω`;
  return `${val.toFixed(1)} Ω`;
}

function findNearestE24(targetVal: number): { standard: number; errorPercent: number } {
  if (targetVal <= 0) return { standard: 0, errorPercent: 0 };
  const exp = Math.floor(Math.log10(targetVal));
  const normalized = targetVal / Math.pow(10, exp);

  let closest = STANDARD_E24[0];
  let minDiff = Math.abs(normalized - closest);
  for (const s of STANDARD_E24) {
    const diff = Math.abs(normalized - s);
    if (diff < minDiff) {
      minDiff = diff;
      closest = s;
    }
  }

  const standardActual = closest * Math.pow(10, exp);
  const errorPercent = ((standardActual - targetVal) / targetVal) * 100;
  return { standard: standardActual, errorPercent };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface InteractiveToolModalProps {
  tool: EngineeringTool | null;
  onClose: () => void;
}

export function InteractiveToolModal({ tool, onClose }: InteractiveToolModalProps) {
  // --------------------------------------------------------------------------
  // 1. Resistor Solver State (High-Level 3/4/5/6-Band & Reverse Solver)
  // --------------------------------------------------------------------------
  const [resistorMode, setResistorMode] = useState<'forward' | 'reverse' | 'smd'>('forward');
  const [bandCount, setBandCount] = useState<3 | 4 | 5 | 6>(4);
  const [band1, setBand1] = useState(1); // Brown (1)
  const [band2, setBand2] = useState(0); // Black (0)
  const [band3, setBand3] = useState(0); // Black (0) for 5/6 band
  const [bandMult, setBandMult] = useState(2); // Red (10^2 = 100)
  const [bandTol, setBandTol] = useState(5); // Gold (±5%)
  const [bandTcr, setBandTcr] = useState(100); // Brown (100 ppm/K)

  // Reverse Resistor Inputs
  const [reverseTarget, setReverseTarget] = useState('4.7');
  const [reverseUnit, setReverseUnit] = useState<'ohm' | 'kohm' | 'mohm'>('kohm');
  const [reverseBands, setReverseBands] = useState<4 | 5>(4);
  const [reverseTol, setReverseTol] = useState(5);

  // SMD Resistor & Capacitor Decoders
  const [smdCode, setSmdCode] = useState('472');
  const [capCode, setCapCode] = useState('104');

  // --------------------------------------------------------------------------
  // 2. Ohm's Law Wheel State (4-Variable Wheel)
  // --------------------------------------------------------------------------
  const [ohmsKnownMode, setOhmsKnownMode] = useState<'vr' | 'vi' | 'vp' | 'ir' | 'ip' | 'rp'>('vr');
  const [wheelV, setWheelV] = useState('12');
  const [wheelI, setWheelI] = useState('2.5');
  const [wheelR, setWheelR] = useState('10');
  const [wheelP, setWheelP] = useState('50');

  // --------------------------------------------------------------------------
  // 3. Voltage Divider State (Unloaded & Loaded with Sag Analysis)
  // --------------------------------------------------------------------------
  const [divMode, setDivMode] = useState<'simulate' | 'target'>('simulate');
  const [divVin, setDivVin] = useState('12');
  const [divR1, setDivR1] = useState('10'); // kOhm
  const [divR2, setDivR2] = useState('5'); // kOhm
  const [divRL, setDivRL] = useState('100'); // kOhm (load)
  const [hasLoad, setHasLoad] = useState(false);
  const [divTargetVout, setDivTargetVout] = useState('3.3');

  // --------------------------------------------------------------------------
  // 4. LED Series Resistor State (Multi-LED, Color Presets, Wattage Headroom)
  // --------------------------------------------------------------------------
  const [ledPreset, setLedPreset] = useState<'red' | 'green' | 'blue' | 'white' | 'amber' | 'ir' | 'custom'>('red');
  const [ledVs, setLedVs] = useState('12');
  const [ledVf, setLedVf] = useState('2.0');
  const [ledIf, setLedIf] = useState('20'); // mA
  const [ledCount, setLedCount] = useState('1'); // series count
  const [ledStrings, setLedStrings] = useState('1'); // parallel strings

  // --------------------------------------------------------------------------
  // 5. 555 Timer State (Astable & Monostable Modes)
  // --------------------------------------------------------------------------
  const [timerMode, setTimerMode] = useState<'astable' | 'monostable'>('astable');
  const [timerR1, setTimerR1] = useState('10'); // kOhm
  const [timerR2, setTimerR2] = useState('100'); // kOhm
  const [timerC, setTimerC] = useState('10'); // uF
  const [timerMonoR, setTimerMonoR] = useState('47'); // kOhm
  const [timerMonoC, setTimerMonoC] = useState('100'); // uF

  // --------------------------------------------------------------------------
  // 6. PCB Trace State (IPC-2221 External vs Internal, Drop & Power Loss)
  // --------------------------------------------------------------------------
  const [pcbLayer, setPcbLayer] = useState<'external' | 'internal'>('external');
  const [pcbCurrent, setPcbCurrent] = useState('2.5'); // Amps
  const [pcbTempRise, setPcbTempRise] = useState('10'); // °C
  const [pcbOunce, setPcbOunce] = useState('1'); // 1 oz
  const [pcbLengthMm, setPcbLengthMm] = useState('100'); // mm

  // --------------------------------------------------------------------------
  // 7-14. Other Existing Solvers
  // --------------------------------------------------------------------------
  const [motorRPM, setMotorRPM] = useState('3000');
  const [motorTorque, setMotorTorque] = useState('1.5');
  const [gearT1, setGearT1] = useState('20');
  const [gearT2, setGearT2] = useState('60');
  const [gearInRPM, setGearInRPM] = useState('1500');
  const [cylBore, setCylBore] = useState('50');
  const [cylPressure, setCylPressure] = useState('6');
  const [cylRod, setCylRod] = useState('20');
  const [b64Input, setB64Input] = useState('Engineering Innovation House India');
  const [b64Mode, setB64Mode] = useState<'encode' | 'decode'>('encode');
  const [decInput, setDecInput] = useState('255');
  const [subnetIP, setSubnetIP] = useState('192.168.1.100');
  const [subnetCIDR, setSubnetCIDR] = useState('24');
  const [printWeight, setPrintWeight] = useState('120');
  const [filamentPrice, setFilamentPrice] = useState('1200');
  const [printHours, setPrintHours] = useState('4.5');
  const [machineWatts, setMachineWatts] = useState('150');
  const [kwhRate, setKwhRate] = useState('8');
  const [stepAngle, setStepAngle] = useState('1.8');
  const [microstepping, setMicrostepping] = useState('16');
  const [beltPitch, setBeltPitch] = useState('2');
  const [pulleyTeeth, setPulleyTeeth] = useState('20');

  const [copied, setCopied] = useState(false);
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // ==========================================================================
  // CALCULATIONS
  // ==========================================================================

  // 1. Resistor Color Code Forward
  const resistorForwardResult = useMemo(() => {
    let rawDigits = 0;
    if (bandCount === 3 || bandCount === 4) {
      rawDigits = band1 * 10 + band2;
    } else {
      rawDigits = band1 * 100 + band2 * 10 + band3;
    }

    const multDef = COLOR_PALETTE.find((c) => c.digit === bandMult) ||
      COLOR_PALETTE.find((c) => c.multiplier === Math.pow(10, bandMult)) ||
      COLOR_PALETTE[bandMult] ||
      COLOR_PALETTE[0];
    const multiplierVal = multDef.multiplier ?? Math.pow(10, bandMult);
    const nominal = rawDigits * multiplierVal;

    const tolVal = bandCount === 3 ? 20 : bandTol;
    const minVal = nominal * (1 - tolVal / 100);
    const maxVal = nominal * (1 + tolVal / 100);

    const b1Def = COLOR_PALETTE.find((c) => c.digit === band1) || COLOR_PALETTE[0];
    const b2Def = COLOR_PALETTE.find((c) => c.digit === band2) || COLOR_PALETTE[0];
    const b3Def = COLOR_PALETTE.find((c) => c.digit === band3) || COLOR_PALETTE[0];
    const tolDef = COLOR_PALETTE.find((c) => c.tolerance === bandTol) || COLOR_PALETTE[10];
    const tcrDef = COLOR_PALETTE.find((c) => c.tcr === bandTcr) || COLOR_PALETTE[1];

    const sequence: ColorBandDef[] = [b1Def, b2Def];
    if (bandCount >= 5) sequence.push(b3Def);
    sequence.push(multDef);
    if (bandCount >= 4) sequence.push(tolDef);
    if (bandCount === 6) sequence.push(tcrDef);

    return {
      nominalFormatted: formatResistance(nominal),
      nominalRaw: nominal,
      tolerance: `±${tolVal}%`,
      minFormatted: formatResistance(minVal),
      maxFormatted: formatResistance(maxVal),
      tcr: bandCount === 6 ? `${bandTcr} ppm/K` : null,
      sequence,
    };
  }, [bandCount, band1, band2, band3, bandMult, bandTol, bandTcr]);

  // Reverse Resistor Solver
  const reverseResistorResult = useMemo(() => {
    const num = parseFloat(reverseTarget);
    if (isNaN(num) || num <= 0) return null;

    let multiplier = 1;
    if (reverseUnit === 'kohm') multiplier = 1000;
    if (reverseUnit === 'mohm') multiplier = 1000000;
    const totalOhms = num * multiplier;

    const e24Match = findNearestE24(totalOhms);

    // Decompose into digits and exponent
    const exp = Math.floor(Math.log10(totalOhms));
    let baseDigits = 0;
    let expMult = 0;

    if (reverseBands === 4) {
      expMult = exp - 1;
      baseDigits = Math.round(totalOhms / Math.pow(10, expMult));
      if (baseDigits >= 100) {
        baseDigits = Math.round(baseDigits / 10);
        expMult += 1;
      }
      const d1 = Math.floor(baseDigits / 10);
      const d2 = baseDigits % 10;

      const b1 = COLOR_PALETTE.find((c) => c.digit === d1) || COLOR_PALETTE[1];
      const b2 = COLOR_PALETTE.find((c) => c.digit === d2) || COLOR_PALETTE[0];
      const bm = COLOR_PALETTE.find((c) => c.multiplier === Math.pow(10, expMult)) || COLOR_PALETTE[2];
      const bt = COLOR_PALETTE.find((c) => c.tolerance === reverseTol) || COLOR_PALETTE[10];

      return {
        totalOhms,
        formatted: formatResistance(totalOhms),
        bands: [b1, b2, bm, bt],
        e24: e24Match,
      };
    } else {
      expMult = exp - 2;
      baseDigits = Math.round(totalOhms / Math.pow(10, expMult));
      if (baseDigits >= 1000) {
        baseDigits = Math.round(baseDigits / 10);
        expMult += 1;
      }
      const d1 = Math.floor(baseDigits / 100);
      const d2 = Math.floor((baseDigits % 100) / 10);
      const d3 = baseDigits % 10;

      const b1 = COLOR_PALETTE.find((c) => c.digit === d1) || COLOR_PALETTE[1];
      const b2 = COLOR_PALETTE.find((c) => c.digit === d2) || COLOR_PALETTE[0];
      const b3 = COLOR_PALETTE.find((c) => c.digit === d3) || COLOR_PALETTE[0];
      const bm = COLOR_PALETTE.find((c) => c.multiplier === Math.pow(10, expMult)) || COLOR_PALETTE[2];
      const bt = COLOR_PALETTE.find((c) => c.tolerance === reverseTol) || COLOR_PALETTE[1];

      return {
        totalOhms,
        formatted: formatResistance(totalOhms),
        bands: [b1, b2, b3, bm, bt],
        e24: e24Match,
      };
    }
  }, [reverseTarget, reverseUnit, reverseBands, reverseTol]);

  // SMD Resistor Decoder
  const smdResult = useMemo(() => {
    const code = smdCode.trim().toUpperCase();
    if (!code) return null;

    // 3-digit: e.g. 472 -> 47 * 10^2 = 4.7k
    if (/^\d{3}$/.test(code)) {
      const d = parseInt(code.slice(0, 2), 10);
      const m = parseInt(code.slice(2), 10);
      const val = d * Math.pow(10, m);
      return {
        type: '3-Digit EIA Standard (±5% Tolerance)',
        resistance: formatResistance(val),
        rawOhms: val,
      };
    }

    // 4-digit: e.g. 1002 -> 100 * 10^2 = 10k
    if (/^\d{4}$/.test(code)) {
      const d = parseInt(code.slice(0, 3), 10);
      const m = parseInt(code.slice(3), 10);
      const val = d * Math.pow(10, m);
      return {
        type: '4-Digit Precision Standard (±1% Tolerance)',
        resistance: formatResistance(val),
        rawOhms: val,
      };
    }

    // R notation: e.g. 4R7 = 4.7, 0R22 = 0.22
    if (/^\d*R\d+$/.test(code)) {
      const val = parseFloat(code.replace('R', '.'));
      return {
        type: 'Sub-Ohm / Precision Decimal Resistor',
        resistance: `${val} Ω`,
        rawOhms: val,
      };
    }

    return null;
  }, [smdCode]);

  // Ceramic Capacitor Decoder
  const capResult = useMemo(() => {
    const code = capCode.trim();
    if (!/^\d{3}$/.test(code)) return null;

    const base = parseInt(code.slice(0, 2), 10);
    const mult = parseInt(code.slice(2), 10);
    const pf = base * Math.pow(10, mult);
    const nf = pf / 1000;
    const uf = nf / 1000;

    return {
      pf: `${pf.toLocaleString()} pF`,
      nf: `${nf >= 1 ? nf.toFixed(2) : nf.toFixed(3)} nF`,
      uf: `${uf >= 0.001 ? uf.toFixed(4) : uf.toExponential(2)} µF`,
    };
  }, [capCode]);

  // --------------------------------------------------------------------------
  // 2. Ohm's Law Solver Wheel (4-Variable)
  // --------------------------------------------------------------------------
  const ohmsWheelResult = useMemo(() => {
    let v = 0;
    let i = 0;
    let r = 0;
    let p = 0;

    const valV = parseFloat(wheelV);
    const valI = parseFloat(wheelI);
    const valR = parseFloat(wheelR);
    const valP = parseFloat(wheelP);

    if (ohmsKnownMode === 'vr' && !isNaN(valV) && !isNaN(valR) && valR > 0) {
      v = valV;
      r = valR;
      i = v / r;
      p = v * i;
    } else if (ohmsKnownMode === 'vi' && !isNaN(valV) && !isNaN(valI) && valI > 0) {
      v = valV;
      i = valI;
      r = v / i;
      p = v * i;
    } else if (ohmsKnownMode === 'vp' && !isNaN(valV) && !isNaN(valP) && valV > 0) {
      v = valV;
      p = valP;
      i = p / v;
      r = Math.pow(v, 2) / p;
    } else if (ohmsKnownMode === 'ir' && !isNaN(valI) && !isNaN(valR)) {
      i = valI;
      r = valR;
      v = i * r;
      p = Math.pow(i, 2) * r;
    } else if (ohmsKnownMode === 'ip' && !isNaN(valI) && !isNaN(valP) && valI > 0) {
      i = valI;
      p = valP;
      v = p / i;
      r = p / Math.pow(i, 2);
    } else if (ohmsKnownMode === 'rp' && !isNaN(valR) && !isNaN(valP) && valR > 0 && valP >= 0) {
      r = valR;
      p = valP;
      v = Math.sqrt(p * r);
      i = Math.sqrt(p / r);
    } else {
      return null;
    }

    return {
      voltage: `${v.toFixed(3)} V`,
      current: i >= 1 ? `${i.toFixed(3)} A` : `${(i * 1000).toFixed(2)} mA`,
      resistance: formatResistance(r),
      power: p >= 1 ? `${p.toFixed(3)} W` : `${(p * 1000).toFixed(2)} mW`,
    };
  }, [ohmsKnownMode, wheelV, wheelI, wheelR, wheelP]);

  // --------------------------------------------------------------------------
  // 3. Voltage Divider (Unloaded & Loaded with Sag Analysis)
  // --------------------------------------------------------------------------
  const dividerFullResult = useMemo(() => {
    const vin = parseFloat(divVin);
    const r1 = parseFloat(divR1) * 1000;
    const r2 = parseFloat(divR2) * 1000;
    const rl = parseFloat(divRL) * 1000;

    if (isNaN(vin) || isNaN(r1) || isNaN(r2) || r1 + r2 <= 0) return null;

    // Unloaded
    const voutNoLoad = (vin * r2) / (r1 + r2);
    const currentNoLoadMa = (vin / (r1 + r2)) * 1000;
    const zOut = (r1 * r2) / (r1 + r2);

    // Loaded
    let voutLoaded = voutNoLoad;
    let sagPercent = 0;
    let loadCurrentMa = 0;

    if (hasLoad && !isNaN(rl) && rl > 0) {
      const r2Parallel = (r2 * rl) / (r2 + rl);
      voutLoaded = (vin * r2Parallel) / (r1 + r2Parallel);
      sagPercent = ((voutNoLoad - voutLoaded) / voutNoLoad) * 100;
      loadCurrentMa = (voutLoaded / rl) * 1000;
    }

    // Power
    const pR1 = Math.pow(vin - (hasLoad ? voutLoaded : voutNoLoad), 2) / r1;
    const pR2 = Math.pow(hasLoad ? voutLoaded : voutNoLoad, 2) / r2;

    return {
      voutNoLoad: `${voutNoLoad.toFixed(3)} V`,
      voutLoaded: `${voutLoaded.toFixed(3)} V`,
      sagPercent: `${sagPercent.toFixed(2)}%`,
      quiescentCurrent: `${currentNoLoadMa.toFixed(3)} mA`,
      loadCurrent: `${loadCurrentMa.toFixed(3)} mA`,
      outputImpedance: formatResistance(zOut),
      pR1: pR1 >= 1 ? `${pR1.toFixed(3)} W` : `${(pR1 * 1000).toFixed(1)} mW`,
      pR2: pR2 >= 1 ? `${pR2.toFixed(3)} W` : `${(pR2 * 1000).toFixed(1)} mW`,
    };
  }, [divVin, divR1, divR2, divRL, hasLoad]);

  // Target Vout Calculator
  const dividerTargetResult = useMemo(() => {
    const vin = parseFloat(divVin);
    const targetV = parseFloat(divTargetVout);
    const r1 = parseFloat(divR1) * 1000;

    if (isNaN(vin) || isNaN(targetV) || isNaN(r1) || targetV >= vin || targetV <= 0) return null;

    const r2Exact = (targetV * r1) / (vin - targetV);
    const e24 = findNearestE24(r2Exact);
    const actualVoutWithE24 = (vin * e24.standard) / (r1 + e24.standard);

    return {
      r2Exact: formatResistance(r2Exact),
      e24Resistor: formatResistance(e24.standard),
      actualVout: `${actualVoutWithE24.toFixed(3)} V`,
      error: `${e24.errorPercent.toFixed(2)}%`,
    };
  }, [divVin, divTargetVout, divR1]);

  // --------------------------------------------------------------------------
  // 4. LED Series Resistor (Multi-LED, Safety Headroom)
  // --------------------------------------------------------------------------
  const ledFullResult = useMemo(() => {
    const vs = parseFloat(ledVs);
    const vf = parseFloat(ledVf);
    const iMa = parseFloat(ledIf);
    const nLeds = parseInt(ledCount, 10) || 1;
    const nStrings = parseInt(ledStrings, 10) || 1;

    if (isNaN(vs) || isNaN(vf) || isNaN(iMa) || iMa <= 0) return null;

    const totalVf = vf * nLeds;
    if (vs <= totalVf) {
      return { error: `Supply voltage (${vs}V) must be greater than total LED forward voltage (${totalVf.toFixed(1)}V).` };
    }

    const vDropResistor = vs - totalVf;
    const iAmps = iMa / 1000;
    const rExact = vDropResistor / iAmps;
    const e24 = findNearestE24(rExact);

    const actualI = (vDropResistor / e24.standard) * 1000;
    const pResistor = Math.pow(iAmps, 2) * rExact;
    const pRecommendedWattage = pResistor * 2; // 2x safety headroom

    let rating = '1/8W (0.125W)';
    if (pRecommendedWattage > 2) rating = '5W Ceramic Wirewound';
    else if (pRecommendedWattage > 1) rating = '2W Flameproof Metal Oxide';
    else if (pRecommendedWattage > 0.5) rating = '1W Through-Hole';
    else if (pRecommendedWattage > 0.25) rating = '1/2W (0.5W)';
    else if (pRecommendedWattage > 0.125) rating = '1/4W (0.25W)';

    const pLedTotal = totalVf * iAmps * nStrings;
    const pTotalCircuit = vs * iAmps * nStrings;
    const efficiency = (pLedTotal / pTotalCircuit) * 100;

    return {
      rExactFormatted: formatResistance(rExact),
      e24Formatted: formatResistance(e24.standard),
      actualCurrent: `${actualI.toFixed(1)} mA`,
      powerResistor: `${(pResistor * 1000).toFixed(1)} mW`,
      recommendedRating: rating,
      efficiency: `${efficiency.toFixed(1)}%`,
      totalCircuitPower: `${(pTotalCircuit * 1000).toFixed(1)} mW`,
    };
  }, [ledVs, ledVf, ledIf, ledCount, ledStrings]);

  // --------------------------------------------------------------------------
  // 5. 555 Timer IC (Astable & Monostable Modes)
  // --------------------------------------------------------------------------
  const timerFullResult = useMemo(() => {
    if (timerMode === 'astable') {
      const r1 = parseFloat(timerR1) * 1000;
      const r2 = parseFloat(timerR2) * 1000;
      const c = parseFloat(timerC) * 0.000001;
      if (isNaN(r1) || isNaN(r2) || isNaN(c) || r1 <= 0 || r2 <= 0 || c <= 0) return null;

      const freq = 1.44 / ((r1 + 2 * r2) * c);
      const th = 0.693 * (r1 + r2) * c;
      const tl = 0.693 * r2 * c;
      const period = th + tl;
      const duty = (th / period) * 100;

      return {
        freq: freq >= 1000 ? `${(freq / 1000).toFixed(2)} kHz` : `${freq.toFixed(2)} Hz`,
        th: th >= 1 ? `${th.toFixed(3)} s` : `${(th * 1000).toFixed(2)} ms`,
        tl: tl >= 1 ? `${tl.toFixed(3)} s` : `${(tl * 1000).toFixed(2)} ms`,
        period: period >= 1 ? `${period.toFixed(3)} s` : `${(period * 1000).toFixed(2)} ms`,
        duty: `${duty.toFixed(1)}%`,
      };
    } else {
      const r = parseFloat(timerMonoR) * 1000;
      const c = parseFloat(timerMonoC) * 0.000001;
      if (isNaN(r) || isNaN(c) || r <= 0 || c <= 0) return null;

      const tPulse = 1.1 * r * c;
      return {
        pulseWidth: tPulse >= 1 ? `${tPulse.toFixed(3)} seconds` : `${(tPulse * 1000).toFixed(2)} ms`,
        freqLimit: `${(1 / tPulse).toFixed(2)} Hz max trigger frequency`,
      };
    }
  }, [timerMode, timerR1, timerR2, timerC, timerMonoR, timerMonoC]);

  // --------------------------------------------------------------------------
  // 6. PCB Trace Width (IPC-2221 Standards with Voltage Drop & Power Loss)
  // --------------------------------------------------------------------------
  const pcbFullResult = useMemo(() => {
    const i = parseFloat(pcbCurrent);
    const dt = parseFloat(pcbTempRise);
    const oz = parseFloat(pcbOunce);
    const lengthMm = parseFloat(pcbLengthMm);

    if (isNaN(i) || isNaN(dt) || i <= 0 || dt <= 0 || isNaN(lengthMm)) return null;

    // IPC-2221 constant: k = 0.048 for external, 0.024 for internal
    const k = pcbLayer === 'external' ? 0.048 : 0.024;
    const b = 0.44;
    const c = 0.725;

    const areaMils2 = Math.pow(i / (k * Math.pow(dt, b)), 1 / c);
    const thicknessMils = oz * 1.378; // 1 oz ~ 1.378 mils (35 um)
    const widthMils = areaMils2 / thicknessMils;
    const widthMm = widthMils * 0.0254;

    // Copper resistivity: 1.72e-8 ohm-m at 25°C
    const areaM2 = (widthMm / 1000) * ((oz * 35e-6));
    const lengthM = lengthMm / 1000;
    const resistanceOhms = (1.72e-8 * lengthM) / areaM2;
    const voltageDropV = i * resistanceOhms;
    const powerLossW = Math.pow(i, 2) * resistanceOhms;

    return {
      widthMm: `${widthMm.toFixed(3)} mm`,
      widthMils: `${widthMils.toFixed(1)} mils`,
      areaMm2: `${(widthMm * oz * 0.035).toFixed(4)} mm²`,
      resistance: `${(resistanceOhms * 1000).toFixed(2)} mΩ`,
      voltageDrop: `${(voltageDropV * 1000).toFixed(2)} mV`,
      powerLoss: `${(powerLossW * 1000).toFixed(1)} mW`,
    };
  }, [pcbLayer, pcbCurrent, pcbTempRise, pcbOunce, pcbLengthMm]);

  // Preset handlers for LED
  const handleLedPresetChange = (preset: typeof ledPreset) => {
    setLedPreset(preset);
    if (preset === 'red') { setLedVf('2.0'); setLedIf('20'); }
    else if (preset === 'green') { setLedVf('2.2'); setLedIf('20'); }
    else if (preset === 'blue') { setLedVf('3.2'); setLedIf('20'); }
    else if (preset === 'white') { setLedVf('3.3'); setLedIf('20'); }
    else if (preset === 'amber') { setLedVf('2.1'); setLedIf('20'); }
    else if (preset === 'ir') { setLedVf('1.2'); setLedIf('50'); }
  };

  // --------------------------------------------------------------------------
  // Other Solvers Calculations (Motor, Gear, Cylinder, Number, Subnet, 3D, Stepper)
  // --------------------------------------------------------------------------
  const motorResult = useMemo(() => {
    const rpm = parseFloat(motorRPM);
    const t = parseFloat(motorTorque);
    if (!isNaN(rpm) && !isNaN(t) && rpm > 0) {
      const watts = (2 * Math.PI * rpm * t) / 60;
      return {
        watts: `${watts.toFixed(1)} Watts`,
        hp: `${(watts / 745.7).toFixed(2)} HP`,
        kgcm: `${(t * 10.197).toFixed(2)} kg·cm`,
      };
    }
    return null;
  }, [motorRPM, motorTorque]);

  const gearResult = useMemo(() => {
    const t1 = parseFloat(gearT1);
    const t2 = parseFloat(gearT2);
    const inRPM = parseFloat(gearInRPM);
    if (!isNaN(t1) && !isNaN(t2) && !isNaN(inRPM) && t1 > 0 && t2 > 0) {
      const ratio = t2 / t1;
      return {
        ratio: `${ratio.toFixed(2)} : 1`,
        outRPM: `${(inRPM / ratio).toFixed(1)} RPM`,
        torqueAdvantage: `${ratio.toFixed(2)}x Torque Multiplication`,
      };
    }
    return null;
  }, [gearT1, gearT2, gearInRPM]);

  const cylinderResult = useMemo(() => {
    const d = parseFloat(cylBore);
    const p = parseFloat(cylPressure);
    const dRod = parseFloat(cylRod);
    if (!isNaN(d) && !isNaN(p) && d > 0) {
      const areaPush = (Math.PI * Math.pow(d, 2)) / 4;
      const forcePushN = areaPush * (p * 0.1);
      const areaPull = areaPush - (Math.PI * Math.pow(dRod, 2)) / 4;
      const forcePullN = areaPull * (p * 0.1);
      return {
        push: `${forcePushN.toFixed(1)} N (${(forcePushN / 9.80665).toFixed(1)} kgf)`,
        pull: `${forcePullN.toFixed(1)} N (${(forcePullN / 9.80665).toFixed(1)} kgf)`,
      };
    }
    return null;
  }, [cylBore, cylPressure, cylRod]);

  const b64Result = useMemo(() => {
    try {
      if (b64Mode === 'encode') {
        return btoa(unescape(encodeURIComponent(b64Input)));
      } else {
        return decodeURIComponent(escape(atob(b64Input)));
      }
    } catch {
      return 'Error: Invalid base64 sequence.';
    }
  }, [b64Input, b64Mode]);

  const numberResult = useMemo(() => {
    const num = parseInt(decInput, 10);
    if (!isNaN(num)) {
      return {
        bin: num.toString(2).padStart(8, '0'),
        hex: `0x${num.toString(16).toUpperCase()}`,
        oct: `0o${num.toString(8)}`,
        ascii: num >= 32 && num <= 126 ? String.fromCharCode(num) : 'Non-printable',
      };
    }
    return null;
  }, [decInput]);

  const subnetResult = useMemo(() => {
    const cidr = parseInt(subnetCIDR, 10);
    if (cidr >= 8 && cidr <= 30) {
      const totalIps = Math.pow(2, 32 - cidr);
      return {
        hosts: (totalIps - 2).toLocaleString(),
        totalIps: totalIps.toLocaleString(),
        mask: `/${cidr}`,
      };
    }
    return null;
  }, [subnetCIDR]);

  const printCostResult = useMemo(() => {
    const weightG = parseFloat(printWeight);
    const priceKg = parseFloat(filamentPrice);
    const hours = parseFloat(printHours);
    const watts = parseFloat(machineWatts);
    const rate = parseFloat(kwhRate);
    if (!isNaN(weightG) && !isNaN(priceKg) && !isNaN(hours) && !isNaN(watts) && !isNaN(rate)) {
      const filamentCost = (weightG / 1000) * priceKg;
      const energyKwh = (watts * hours) / 1000;
      const electricityCost = energyKwh * rate;
      const total = filamentCost + electricityCost;
      return {
        filamentCost: `₹${filamentCost.toFixed(2)}`,
        electricityCost: `₹${electricityCost.toFixed(2)} (${energyKwh.toFixed(2)} kWh)`,
        total: `₹${total.toFixed(2)}`,
      };
    }
    return null;
  }, [printWeight, filamentPrice, printHours, machineWatts, kwhRate]);

  const stepperResult = useMemo(() => {
    const angle = parseFloat(stepAngle);
    const ustep = parseFloat(microstepping);
    const pitch = parseFloat(beltPitch);
    const teeth = parseFloat(pulleyTeeth);
    if (!isNaN(angle) && !isNaN(ustep) && !isNaN(pitch) && !isNaN(teeth) && angle > 0) {
      const fullSteps = 360 / angle;
      const stepsPerRev = fullSteps * ustep;
      const mmPerRev = pitch * teeth;
      const stepsPerMm = stepsPerRev / mmPerRev;
      return {
        stepsPerMm: `${stepsPerMm.toFixed(2)} steps/mm`,
        stepsPerRev: `${stepsPerRev} microsteps/rev`,
      };
    }
    return null;
  }, [stepAngle, microstepping, beltPitch, pulleyTeeth]);

  if (!tool) return null;
  const key = tool.calculatorKey;

  return (
    <Dialog open={Boolean(tool)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto p-0 gap-0 border-slate-200 touch-scroll">
        {/* Sticky Modal Header */}
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                {tool.domain}
              </span>
              {tool.badge && (
                <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                  {tool.badge}
                </span>
              )}
            </div>
            <DialogTitle className="font-display text-lg sm:text-xl font-bold text-[#0B1528] flex items-center gap-2 pt-1">
              <Calculator className="h-5 w-5 text-primary" />
              <span>{tool.name}</span>
            </DialogTitle>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close Solver
          </Button>
        </div>

        <div className="p-6 space-y-6">
          <DialogHeader className="p-0 text-left">
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              {tool.description || tool.summary}
            </DialogDescription>
          </DialogHeader>

          {/* ================================================================ */}
          {/* 1. HIGH-LEVEL RESISTOR COLOR CODE & REVERSE SOLVER               */}
          {/* ================================================================ */}
          {key === 'resistor-color-code' && (
            <div className="space-y-6">
              {/* Mode Toggle: Forward vs Reverse vs SMD */}
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                <Button
                  size="sm"
                  variant={resistorMode === 'forward' ? 'primary' : 'outline'}
                  onClick={() => setResistorMode('forward')}
                  className="text-xs gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Color Bands → Value</span>
                </Button>
                <Button
                  size="sm"
                  variant={resistorMode === 'reverse' ? 'primary' : 'outline'}
                  onClick={() => setResistorMode('reverse')}
                  className="text-xs gap-1.5"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>Value → Bands (Reverse Solver)</span>
                </Button>
                <Button
                  size="sm"
                  variant={resistorMode === 'smd' ? 'primary' : 'outline'}
                  onClick={() => setResistorMode('smd')}
                  className="text-xs gap-1.5"
                >
                  <Cpu className="h-3.5 w-3.5" />
                  <span>SMD &amp; Capacitor Decoder</span>
                </Button>
              </div>

              {/* FORWARD MODE: VISUAL COLOR BAND SELECTOR */}
              {resistorMode === 'forward' && (
                <div className="space-y-5">
                  {/* Band Count Selection */}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Resistor Type &amp; Band Count:
                    </Label>
                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                      {([3, 4, 5, 6] as const).map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setBandCount(b)}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                            bandCount === b
                              ? 'bg-[#172D4D] text-white shadow-sm'
                              : 'text-slate-600 hover:text-[#0B1528]'
                          }`}
                        >
                          {b} Bands
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* VISUAL 3D AXIAL RESISTOR GRAPHIC */}
                  <div className="relative rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 p-6 flex flex-col items-center justify-center overflow-hidden shadow-inner">
                    <div className="relative flex items-center justify-center w-full max-w-md h-24">
                      {/* Left Metal Lead */}
                      <div className="h-2 w-20 bg-gradient-to-b from-slate-300 via-slate-100 to-slate-400 rounded-l shadow-sm" />

                      {/* Resistor Body with flared ends */}
                      <div className="relative flex items-center justify-between h-14 w-64 bg-[#e8decb] rounded-full border border-amber-900/20 shadow-md px-6 overflow-hidden">
                        {/* Highlight Reflection */}
                        <div className="absolute inset-x-0 top-0 h-3 bg-white/40 rounded-t-full pointer-events-none" />
                        <div className="absolute inset-x-0 bottom-0 h-3 bg-black/10 rounded-b-full pointer-events-none" />

                        {/* Band Stripes */}
                        {resistorForwardResult.sequence.map((band, idx) => (
                          <div
                            key={idx}
                            className="relative h-full w-4 flex items-center justify-center shadow-sm transition-all"
                            style={{ backgroundColor: band.hex }}
                            title={`${band.name}`}
                          >
                            <div className="absolute inset-x-0 top-0 h-3 bg-white/30" />
                          </div>
                        ))}
                      </div>

                      {/* Right Metal Lead */}
                      <div className="h-2 w-20 bg-gradient-to-b from-slate-300 via-slate-100 to-slate-400 rounded-r shadow-sm" />
                    </div>

                    {/* Band Sequence Label Preview */}
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-600">
                      <span>Color Sequence:</span>
                      {resistorForwardResult.sequence.map((b, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px]"
                          style={{
                            borderColor: b.hex,
                            backgroundColor: `${b.hex}15`,
                            color: b.textDark ? '#000' : b.hex,
                          }}
                        >
                          <span
                            className="h-2 w-2 rounded-full inline-block"
                            style={{ backgroundColor: b.hex }}
                          />
                          {b.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* INTERACTIVE COLOR SWATCH PALETTES FOR EACH BAND */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Band 1 */}
                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-[#0B1528]">1st Significant Digit</Label>
                        <span className="text-[11px] font-mono font-bold text-primary">
                          {COLOR_PALETTE.find((c) => c.digit === band1)?.name} ({band1})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {COLOR_PALETTE.filter((c) => c.digit !== undefined && c.digit > 0).map((c) => (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => setBand1(c.digit!)}
                            className={`h-7 w-7 rounded-md border flex items-center justify-center text-[10px] font-bold transition-transform hover:scale-110 ${
                              band1 === c.digit ? 'ring-2 ring-primary ring-offset-1 scale-105' : 'border-slate-300'
                            }`}
                            style={{
                              backgroundColor: c.hex,
                              color: c.textDark ? '#000' : '#fff',
                            }}
                            title={`${c.name} (${c.digit})`}
                          >
                            {c.digit}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Band 2 */}
                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-[#0B1528]">2nd Significant Digit</Label>
                        <span className="text-[11px] font-mono font-bold text-primary">
                          {COLOR_PALETTE.find((c) => c.digit === band2)?.name} ({band2})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {COLOR_PALETTE.filter((c) => c.digit !== undefined).map((c) => (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => setBand2(c.digit!)}
                            className={`h-7 w-7 rounded-md border flex items-center justify-center text-[10px] font-bold transition-transform hover:scale-110 ${
                              band2 === c.digit ? 'ring-2 ring-primary ring-offset-1 scale-105' : 'border-slate-300'
                            }`}
                            style={{
                              backgroundColor: c.hex,
                              color: c.textDark ? '#000' : '#fff',
                            }}
                            title={`${c.name} (${c.digit})`}
                          >
                            {c.digit}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Band 3 (Only for 5 or 6 Band Resistors) */}
                    {bandCount >= 5 && (
                      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-[#0B1528]">3rd Significant Digit</Label>
                          <span className="text-[11px] font-mono font-bold text-primary">
                            {COLOR_PALETTE.find((c) => c.digit === band3)?.name} ({band3})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {COLOR_PALETTE.filter((c) => c.digit !== undefined).map((c) => (
                            <button
                              key={c.name}
                              type="button"
                              onClick={() => setBand3(c.digit!)}
                              className={`h-7 w-7 rounded-md border flex items-center justify-center text-[10px] font-bold transition-transform hover:scale-110 ${
                                band3 === c.digit ? 'ring-2 ring-primary ring-offset-1 scale-105' : 'border-slate-300'
                              }`}
                              style={{
                                backgroundColor: c.hex,
                                color: c.textDark ? '#000' : '#fff',
                              }}
                              title={`${c.name} (${c.digit})`}
                            >
                              {c.digit}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Multiplier Band */}
                    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-[#0B1528]">Multiplier Band</Label>
                        <span className="text-[11px] font-mono font-bold text-primary">
                          {COLOR_PALETTE.find((c) => c.digit === bandMult)?.name || 'Custom'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {COLOR_PALETTE.filter((c) => c.multiplier !== undefined).map((c) => (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => setBandMult(c.digit !== undefined ? c.digit : c.multiplier === 0.1 ? -1 : -2)}
                            className={`h-7 px-2 rounded-md border flex items-center justify-center text-[10px] font-bold transition-transform hover:scale-105 ${
                              bandMult === c.digit || (bandMult === -1 && c.name === 'Gold') || (bandMult === -2 && c.name === 'Silver')
                                ? 'ring-2 ring-primary ring-offset-1 scale-105'
                                : 'border-slate-300'
                            }`}
                            style={{
                              backgroundColor: c.hex,
                              color: c.textDark ? '#000' : '#fff',
                            }}
                            title={`${c.name} (${c.multiplierLabel})`}
                          >
                            {c.multiplierLabel?.replace(' Ω', '')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tolerance Band (4, 5, 6 Bands) */}
                    {bandCount >= 4 && (
                      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-[#0B1528]">Tolerance Band</Label>
                          <span className="text-[11px] font-mono font-bold text-primary">
                            ±{bandTol}%
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {COLOR_PALETTE.filter((c) => c.tolerance !== undefined).map((c) => (
                            <button
                              key={c.name}
                              type="button"
                              onClick={() => setBandTol(c.tolerance!)}
                              className={`h-7 px-2 rounded-md border flex items-center justify-center text-[10px] font-bold transition-transform hover:scale-105 ${
                                bandTol === c.tolerance ? 'ring-2 ring-primary ring-offset-1 scale-105' : 'border-slate-300'
                              }`}
                              style={{
                                backgroundColor: c.hex,
                                color: c.textDark ? '#000' : '#fff',
                              }}
                              title={`${c.name} (±${c.tolerance}%)`}
                            >
                              ±{c.tolerance}%
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TCR Band (6 Bands Only) */}
                    {bandCount === 6 && (
                      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-[#0B1528]">Temperature Coeff (TCR)</Label>
                          <span className="text-[11px] font-mono font-bold text-primary">
                            {bandTcr} ppm/K
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {COLOR_PALETTE.filter((c) => c.tcr !== undefined).map((c) => (
                            <button
                              key={c.name}
                              type="button"
                              onClick={() => setBandTcr(c.tcr!)}
                              className={`h-7 px-2 rounded-md border flex items-center justify-center text-[10px] font-bold transition-transform hover:scale-105 ${
                                bandTcr === c.tcr ? 'ring-2 ring-primary ring-offset-1 scale-105' : 'border-slate-300'
                              }`}
                              style={{
                                backgroundColor: c.hex,
                                color: c.textDark ? '#000' : '#fff',
                              }}
                              title={`${c.name} (${c.tcr} ppm/K)`}
                            >
                              {c.tcr} ppm
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CALCULATED RESULTS DASHBOARD */}
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/70 pb-4">
                      <div>
                        <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                          Nominal Resistance Value
                        </span>
                        <div className="font-display text-3xl font-extrabold text-[#0B1528] pt-0.5">
                          {resistorForwardResult.nominalFormatted}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-mono text-sm font-bold shadow-sm">
                          {resistorForwardResult.tolerance}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(`${resistorForwardResult.nominalFormatted} ${resistorForwardResult.tolerance}`)}
                          className="h-8 text-xs border-emerald-300 bg-white"
                        >
                          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          <span className="ml-1">Copy</span>
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="rounded-xl border border-emerald-200/80 bg-white p-3">
                        <span className="text-slate-500 font-medium">Minimum Tolerance Limit (Rmin):</span>
                        <p className="font-mono text-sm font-bold text-slate-800 pt-0.5">
                          {resistorForwardResult.minFormatted}
                        </p>
                      </div>
                      <div className="rounded-xl border border-emerald-200/80 bg-white p-3">
                        <span className="text-slate-500 font-medium">Maximum Tolerance Limit (Rmax):</span>
                        <p className="font-mono text-sm font-bold text-slate-800 pt-0.5">
                          {resistorForwardResult.maxFormatted}
                        </p>
                      </div>
                      {resistorForwardResult.tcr && (
                        <div className="rounded-xl border border-emerald-200/80 bg-white p-3 col-span-2 sm:col-span-1">
                          <span className="text-slate-500 font-medium">Thermal Drift (TCR):</span>
                          <p className="font-mono text-sm font-bold text-purple-700 pt-0.5">
                            {resistorForwardResult.tcr}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* REVERSE MODE: RESISTANCE VALUE -> COLOR BANDS & E-SERIES */}
              {resistorMode === 'reverse' && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900 leading-relaxed flex items-start gap-2.5">
                    <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                    <div>
                      <span className="font-bold">Reverse Resistor Color Band Calculator:</span> Enter any target resistance value to automatically discover the exact color band sequence and check the nearest standard EIA E24 standard component.
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Target Resistance</Label>
                      <Input
                        value={reverseTarget}
                        onChange={(e) => setReverseTarget(e.target.value)}
                        placeholder="e.g. 4.7"
                        type="number"
                        step="any"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Unit</Label>
                      <select
                        className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs"
                        value={reverseUnit}
                        onChange={(e) => setReverseUnit(e.target.value as typeof reverseUnit)}
                      >
                        <option value="ohm">Ohms (Ω)</option>
                        <option value="kohm">kilo-Ohms (kΩ)</option>
                        <option value="mohm">Mega-Ohms (MΩ)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Band Count</Label>
                      <select
                        className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs"
                        value={reverseBands}
                        onChange={(e) => setReverseBands(Number(e.target.value) as 4 | 5)}
                      >
                        <option value={4}>4-Band Resistor</option>
                        <option value={5}>5-Band Precision</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Desired Tolerance</Label>
                      <select
                        className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs"
                        value={reverseTol}
                        onChange={(e) => setReverseTol(Number(e.target.value))}
                      >
                        <option value={1}>±1% (Brown)</option>
                        <option value={2}>±2% (Red)</option>
                        <option value={5}>±5% (Gold)</option>
                        <option value={10}>±10% (Silver)</option>
                      </select>
                    </div>
                  </div>

                  {reverseResistorResult && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Required Color Band Sequence
                        </span>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {reverseResistorResult.bands.map((b, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 rounded-lg border px-3 py-2 bg-white shadow-sm"
                            >
                              <span
                                className="h-5 w-5 rounded-md border border-black/10 shadow-inner"
                                style={{ backgroundColor: b.hex }}
                              />
                              <div className="text-left">
                                <p className="text-xs font-bold text-[#0B1528]">{b.name}</p>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  {idx === reverseResistorResult.bands.length - 1
                                    ? `Tol (±${reverseTol}%)`
                                    : idx === reverseResistorResult.bands.length - 2
                                    ? 'Multiplier'
                                    : `Digit`}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-slate-200 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <span className="text-slate-500">Nearest Standard EIA E24 Resistor:</span>
                          <p className="font-mono text-base font-bold text-emerald-700 pt-0.5">
                            {formatResistance(reverseResistorResult.e24.standard)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <span className="text-slate-500">Standard Deviation / Tolerance Error:</span>
                          <p className="font-mono text-base font-bold text-slate-800 pt-0.5">
                            {reverseResistorResult.e24.errorPercent.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SMD & CAPACITOR DECODER MODE */}
              {resistorMode === 'smd' && (
                <div className="space-y-6">
                  {/* SMD Resistor Code */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-wider text-[#0B1528] flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-primary" />
                      <span>SMD Chip Resistor 3/4-Digit Code Decoder</span>
                    </Label>
                    <div className="flex gap-3">
                      <Input
                        value={smdCode}
                        onChange={(e) => setSmdCode(e.target.value)}
                        placeholder="e.g. 472, 1002, 4R7"
                        className="font-mono font-bold text-base max-w-xs"
                      />
                    </div>
                    {smdResult && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] text-emerald-800 font-semibold">{smdResult.type}</p>
                          <p className="font-display text-2xl font-extrabold text-[#0B1528]">{smdResult.resistance}</p>
                        </div>
                        <span className="font-mono text-xs text-slate-500">{smdResult.rawOhms} Ohms</span>
                      </div>
                    )}
                  </div>

                  {/* Ceramic Capacitor 3-Digit Code */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-wider text-[#0B1528] flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      <span>Ceramic / Film Capacitor 3-Digit Code Decoder</span>
                    </Label>
                    <div className="flex gap-3">
                      <Input
                        value={capCode}
                        onChange={(e) => setCapCode(e.target.value)}
                        placeholder="e.g. 104, 221, 473"
                        className="font-mono font-bold text-base max-w-xs"
                      />
                    </div>
                    {capResult && (
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <span className="text-slate-500 font-medium">Picofarads (pF):</span>
                          <p className="font-mono text-base font-bold text-[#0B1528] pt-1">{capResult.pf}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <span className="text-slate-500 font-medium">Nanofarads (nF):</span>
                          <p className="font-mono text-base font-bold text-emerald-700 pt-1">{capResult.nf}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <span className="text-slate-500 font-medium">Microfarads (µF):</span>
                          <p className="font-mono text-base font-bold text-blue-700 pt-1">{capResult.uf}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* 2. OHM'S LAW WHEEL (4-VARIABLE COMPLETE SOLVER)                  */}
          {/* ================================================================ */}
          {key === 'ohms-law' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Any 2 Known Electrical Variables:
                </Label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { id: 'vr', label: 'V & R' },
                    { id: 'vi', label: 'V & I' },
                    { id: 'vp', label: 'V & P' },
                    { id: 'ir', label: 'I & R' },
                    { id: 'ip', label: 'I & P' },
                    { id: 'rp', label: 'R & P' },
                  ].map((m) => (
                    <Button
                      key={m.id}
                      type="button"
                      size="sm"
                      variant={ohmsKnownMode === m.id ? 'primary' : 'outline'}
                      onClick={() => setOhmsKnownMode(m.id as typeof ohmsKnownMode)}
                      className="text-xs font-bold"
                    >
                      {m.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Dynamic Inputs based on selected 2 variables */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ohmsKnownMode.includes('v') && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Voltage (V in Volts)</Label>
                    <Input value={wheelV} onChange={(e) => setWheelV(e.target.value)} type="number" step="any" />
                  </div>
                )}
                {ohmsKnownMode.includes('i') && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Current (I in Amperes)</Label>
                    <Input value={wheelI} onChange={(e) => setWheelI(e.target.value)} type="number" step="any" />
                  </div>
                )}
                {ohmsKnownMode.includes('r') && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Resistance (R in Ohms)</Label>
                    <Input value={wheelR} onChange={(e) => setWheelR(e.target.value)} type="number" step="any" />
                  </div>
                )}
                {ohmsKnownMode.includes('p') && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Power (P in Watts)</Label>
                    <Input value={wheelP} onChange={(e) => setWheelP(e.target.value)} type="number" step="any" />
                  </div>
                )}
              </div>

              {/* All 4 Outputs Dashboard */}
              {ohmsWheelResult && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Complete 4-Variable Solution:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <span className="text-slate-400 text-xs">Voltage (V):</span>
                      <p className="font-mono text-base font-bold text-[#0B1528] pt-0.5">{ohmsWheelResult.voltage}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <span className="text-slate-400 text-xs">Current (I):</span>
                      <p className="font-mono text-base font-bold text-blue-700 pt-0.5">{ohmsWheelResult.current}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <span className="text-slate-400 text-xs">Resistance (R):</span>
                      <p className="font-mono text-base font-bold text-amber-700 pt-0.5">{ohmsWheelResult.resistance}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <span className="text-slate-400 text-xs">Power (P):</span>
                      <p className="font-mono text-base font-bold text-emerald-700 pt-0.5">{ohmsWheelResult.power}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* 3. VOLTAGE DIVIDER (UNLOADED & LOADED + TARGET SOLVER)            */}
          {/* ================================================================ */}
          {key === 'voltage-divider' && (
            <div className="space-y-5">
              <div className="flex gap-2 border-b border-slate-200 pb-3">
                <Button
                  size="sm"
                  variant={divMode === 'simulate' ? 'primary' : 'outline'}
                  onClick={() => setDivMode('simulate')}
                  className="text-xs"
                >
                  Circuit Simulation (Loaded &amp; Unloaded)
                </Button>
                <Button
                  size="sm"
                  variant={divMode === 'target' ? 'primary' : 'outline'}
                  onClick={() => setDivMode('target')}
                  className="text-xs"
                >
                  Target Vout Solver (E24 Selector)
                </Button>
              </div>

              {divMode === 'simulate' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Input Voltage Vin (V)</Label>
                      <Input value={divVin} onChange={(e) => setDivVin(e.target.value)} type="number" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Top Resistor R1 (kΩ)</Label>
                      <Input value={divR1} onChange={(e) => setDivR1(e.target.value)} type="number" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Bottom Resistor R2 (kΩ)</Label>
                      <Input value={divR2} onChange={(e) => setDivR2(e.target.value)} type="number" />
                    </div>
                  </div>

                  {/* Load Resistor Toggle */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="has-load" className="text-xs font-semibold cursor-pointer">
                        Connect Load Resistance (RL) to analyze voltage sag?
                      </Label>
                      <input
                        id="has-load"
                        type="checkbox"
                        checked={hasLoad}
                        onChange={(e) => setHasLoad(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-primary cursor-pointer"
                      />
                    </div>
                    {hasLoad && (
                      <div className="pt-2">
                        <Label className="text-xs">Load Resistance RL (kΩ)</Label>
                        <Input
                          value={divRL}
                          onChange={(e) => setDivRL(e.target.value)}
                          type="number"
                          placeholder="e.g. 100"
                          className="max-w-xs mt-1"
                        />
                      </div>
                    )}
                  </div>

                  {dividerFullResult && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <span className="text-slate-500">Unloaded Vout:</span>
                          <p className="font-mono text-xl font-bold text-emerald-700 pt-0.5">{dividerFullResult.voutNoLoad}</p>
                        </div>
                        {hasLoad && (
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <span className="text-slate-500">Loaded Vout:</span>
                            <p className="font-mono text-xl font-bold text-blue-700 pt-0.5">{dividerFullResult.voutLoaded}</p>
                          </div>
                        )}
                        {hasLoad && (
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <span className="text-slate-500">Voltage Sag under Load:</span>
                            <p className="font-mono text-base font-bold text-amber-700 pt-0.5">{dividerFullResult.sagPercent}</p>
                          </div>
                        )}
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <span className="text-slate-500">Quiescent Branch Current:</span>
                          <p className="font-mono text-sm font-bold text-slate-800 pt-0.5">{dividerFullResult.quiescentCurrent}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <span className="text-slate-500">Thevenin Output Z:</span>
                          <p className="font-mono text-sm font-bold text-slate-800 pt-0.5">{dividerFullResult.outputImpedance}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <span className="text-slate-500">Power Dissipated in R1:</span>
                          <p className="font-mono text-sm font-bold text-slate-800 pt-0.5">{dividerFullResult.pR1}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Target Vout Mode */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Supply Vin (V)</Label>
                      <Input value={divVin} onChange={(e) => setDivVin(e.target.value)} type="number" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Desired Output Vout (V)</Label>
                      <Input value={divTargetVout} onChange={(e) => setDivTargetVout(e.target.value)} type="number" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Chosen R1 (kΩ)</Label>
                      <Input value={divR1} onChange={(e) => setDivR1(e.target.value)} type="number" />
                    </div>
                  </div>

                  {dividerTargetResult && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <span className="text-slate-500">Exact Theoretical R2:</span>
                          <p className="font-mono text-sm font-bold text-slate-800 pt-0.5">{dividerTargetResult.r2Exact}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <span className="text-slate-500">Nearest E24 Resistor:</span>
                          <p className="font-mono text-base font-bold text-emerald-700 pt-0.5">{dividerTargetResult.e24Resistor}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <span className="text-slate-500">Actual Vout with E24:</span>
                          <p className="font-mono text-base font-bold text-blue-700 pt-0.5">{dividerTargetResult.actualVout}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <span className="text-slate-500">Vout Error:</span>
                          <p className="font-mono text-base font-bold text-slate-800 pt-0.5">{dividerTargetResult.error}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* 4. LED SERIES RESISTOR (MULTI-LED, WATTAGE SAFETY HEADROOM)      */}
          {/* ================================================================ */}
          {key === 'led-resistor' && (
            <div className="space-y-5">
              {/* Presets */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Quick LED Color &amp; Forward Voltage Presets:
                </Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'red', label: 'Red (2.0V)' },
                    { id: 'green', label: 'Green (2.2V)' },
                    { id: 'blue', label: 'Blue (3.2V)' },
                    { id: 'white', label: 'White (3.3V)' },
                    { id: 'amber', label: 'Amber (2.1V)' },
                    { id: 'ir', label: 'Infrared (1.2V)' },
                  ].map((p) => (
                    <Button
                      key={p.id}
                      type="button"
                      size="sm"
                      variant={ledPreset === p.id ? 'primary' : 'outline'}
                      onClick={() => handleLedPresetChange(p.id as typeof ledPreset)}
                      className="text-xs"
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Supply Vs (V)</Label>
                  <Input value={ledVs} onChange={(e) => setLedVs(e.target.value)} type="number" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">LED Vf (V)</Label>
                  <Input value={ledVf} onChange={(e) => setLedVf(e.target.value)} type="number" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Current (mA)</Label>
                  <Input value={ledIf} onChange={(e) => setLedIf(e.target.value)} type="number" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Series LEDs</Label>
                  <Input value={ledCount} onChange={(e) => setLedCount(e.target.value)} type="number" min={1} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Parallel Strings</Label>
                  <Input value={ledStrings} onChange={(e) => setLedStrings(e.target.value)} type="number" min={1} />
                </div>
              </div>

              {ledFullResult && 'error' in ledFullResult && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
                  {ledFullResult.error}
                </div>
              )}

              {ledFullResult && !('error' in ledFullResult) && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Recommended Standard Resistor
                      </span>
                      <div className="font-display text-3xl font-extrabold text-emerald-700 pt-0.5">
                        {ledFullResult.e24Formatted}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-500">Exact Theoretical Value:</span>
                      <p className="font-mono text-sm font-bold text-slate-800">{ledFullResult.rExactFormatted}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <span className="text-slate-500">Resistor Power Dissipation:</span>
                      <p className="font-mono text-sm font-bold text-slate-800 pt-0.5">{ledFullResult.powerResistor}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <span className="text-slate-500">Recommended Rating (2x Safety):</span>
                      <p className="font-mono text-sm font-bold text-purple-700 pt-0.5">{ledFullResult.recommendedRating}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <span className="text-slate-500">Actual Forward Current:</span>
                      <p className="font-mono text-sm font-bold text-blue-700 pt-0.5">{ledFullResult.actualCurrent}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <span className="text-slate-500">Circuit Energy Efficiency:</span>
                      <p className="font-mono text-sm font-bold text-emerald-700 pt-0.5">{ledFullResult.efficiency}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* 5. 555 TIMER IC (ASTABLE & MONOSTABLE MODES)                      */}
          {/* ================================================================ */}
          {key === '555-timer' && (
            <div className="space-y-5">
              <div className="flex gap-2 border-b border-slate-200 pb-3">
                <Button
                  size="sm"
                  variant={timerMode === 'astable' ? 'primary' : 'outline'}
                  onClick={() => setTimerMode('astable')}
                  className="text-xs"
                >
                  Astable Oscillator (Square Wave)
                </Button>
                <Button
                  size="sm"
                  variant={timerMode === 'monostable' ? 'primary' : 'outline'}
                  onClick={() => setTimerMode('monostable')}
                  className="text-xs"
                >
                  Monostable One-Shot Pulse
                </Button>
              </div>

              {timerMode === 'astable' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Resistor R1 (kΩ)</Label>
                      <Input value={timerR1} onChange={(e) => setTimerR1(e.target.value)} type="number" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Resistor R2 (kΩ)</Label>
                      <Input value={timerR2} onChange={(e) => setTimerR2(e.target.value)} type="number" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Capacitor C (µF)</Label>
                      <Input value={timerC} onChange={(e) => setTimerC(e.target.value)} type="number" />
                    </div>
                  </div>

                  {timerFullResult && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Oscillation Frequency
                        </span>
                        <div className="font-display text-2xl font-extrabold text-emerald-700">
                          {timerFullResult.freq}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <span className="text-slate-500">High Time (Th):</span>
                          <p className="font-mono text-sm font-bold text-slate-800 pt-0.5">{timerFullResult.th}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <span className="text-slate-500">Low Time (Tl):</span>
                          <p className="font-mono text-sm font-bold text-slate-800 pt-0.5">{timerFullResult.tl}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <span className="text-slate-500">Total Period (T):</span>
                          <p className="font-mono text-sm font-bold text-slate-800 pt-0.5">{timerFullResult.period}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <span className="text-slate-500">Duty Cycle:</span>
                          <p className="font-mono text-sm font-bold text-blue-700 pt-0.5">{timerFullResult.duty}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Timing Resistor R (kΩ)</Label>
                      <Input value={timerMonoR} onChange={(e) => setTimerMonoR(e.target.value)} type="number" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Timing Capacitor C (µF)</Label>
                      <Input value={timerMonoC} onChange={(e) => setTimerMonoC(e.target.value)} type="number" />
                    </div>
                  </div>

                  {timerFullResult && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Output Pulse Duration (T = 1.1 × R × C)
                        </span>
                        <div className="font-display text-2xl font-extrabold text-emerald-700">
                          {timerFullResult.pulseWidth}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 font-mono pt-1">
                        Trigger limit: {timerFullResult.freqLimit}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* 6. PCB TRACE WIDTH (IPC-2221 STANDARDS + LOSS & VOLTAGE DROP)    */}
          {/* ================================================================ */}
          {key === 'pcb-trace' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Layer Position</Label>
                  <select
                    className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs"
                    value={pcbLayer}
                    onChange={(e) => setPcbLayer(e.target.value as typeof pcbLayer)}
                  >
                    <option value="external">External (Air)</option>
                    <option value="internal">Internal (Embedded)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Current (Amps)</Label>
                  <Input value={pcbCurrent} onChange={(e) => setPcbCurrent(e.target.value)} type="number" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Temp Rise (°C)</Label>
                  <Input value={pcbTempRise} onChange={(e) => setPcbTempRise(e.target.value)} type="number" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Copper Thickness</Label>
                  <select
                    className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs"
                    value={pcbOunce}
                    onChange={(e) => setPcbOunce(e.target.value)}
                  >
                    <option value="0.5">0.5 oz (17.5 µm)</option>
                    <option value="1">1 oz (35 µm)</option>
                    <option value="2">2 oz (70 µm)</option>
                    <option value="3">3 oz (105 µm)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Trace Length (mm)</Label>
                  <Input value={pcbLengthMm} onChange={(e) => setPcbLengthMm(e.target.value)} type="number" />
                </div>
              </div>

              {pcbFullResult && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Minimum Required Trace Width
                      </span>
                      <div className="font-display text-3xl font-extrabold text-emerald-700 pt-0.5">
                        {pcbFullResult.widthMm}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-500">Imperial Width:</span>
                      <p className="font-mono text-base font-bold text-slate-800">{pcbFullResult.widthMils}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <span className="text-slate-500">Cross-Section Area:</span>
                      <p className="font-mono text-sm font-bold text-slate-800 pt-0.5">{pcbFullResult.areaMm2}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <span className="text-slate-500">Trace Resistance:</span>
                      <p className="font-mono text-sm font-bold text-slate-800 pt-0.5">{pcbFullResult.resistance}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <span className="text-slate-500">Trace Voltage Drop:</span>
                      <p className="font-mono text-sm font-bold text-blue-700 pt-0.5">{pcbFullResult.voltageDrop}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <span className="text-slate-500">Trace Power Dissipation:</span>
                      <p className="font-mono text-sm font-bold text-amber-700 pt-0.5">{pcbFullResult.powerLoss}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* 7. MOTOR TORQUE & POWER                                          */}
          {/* ================================================================ */}
          {key === 'motor-torque' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Motor Speed (RPM)</Label>
                  <Input value={motorRPM} onChange={(e) => setMotorRPM(e.target.value)} type="number" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Torque (N·m)</Label>
                  <Input value={motorTorque} onChange={(e) => setMotorTorque(e.target.value)} type="number" />
                </div>
              </div>
              {motorResult && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Calculated Mechanical Power:</span>
                    <span className="font-mono text-xl font-bold text-emerald-700">{motorResult.watts}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
                    <span className="text-slate-500">Horsepower:</span>
                    <span className="font-mono font-semibold">{motorResult.hp}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
                    <span className="text-slate-500">Torque in kg·cm:</span>
                    <span className="font-mono font-semibold">{motorResult.kgcm}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* 8. GEAR RATIO                                                    */}
          {/* ================================================================ */}
          {key === 'gear-ratio' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Driving Gear (T1)</Label>
                  <Input value={gearT1} onChange={(e) => setGearT1(e.target.value)} type="number" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Driven Gear (T2)</Label>
                  <Input value={gearT2} onChange={(e) => setGearT2(e.target.value)} type="number" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Input RPM</Label>
                  <Input value={gearInRPM} onChange={(e) => setGearInRPM(e.target.value)} type="number" />
                </div>
              </div>
              {gearResult && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Gear Transmission Ratio:</span>
                    <span className="font-mono text-xl font-bold text-emerald-700">{gearResult.ratio}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
                    <span className="text-slate-500">Output Shaft Speed:</span>
                    <span className="font-mono font-semibold">{gearResult.outRPM}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
                    <span className="text-slate-500">Torque Advantage:</span>
                    <span className="font-mono font-semibold">{gearResult.torqueAdvantage}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* 9. CYLINDER FORCE                                                */}
          {/* ================================================================ */}
          {key === 'cylinder-force' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Bore Diameter (mm)</Label>
                  <Input value={cylBore} onChange={(e) => setCylBore(e.target.value)} type="number" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pressure (bar)</Label>
                  <Input value={cylPressure} onChange={(e) => setCylPressure(e.target.value)} type="number" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Rod Diameter (mm)</Label>
                  <Input value={cylRod} onChange={(e) => setCylRod(e.target.value)} type="number" />
                </div>
              </div>
              {cylinderResult && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Extension (Push) Force:</span>
                    <span className="font-mono text-lg font-bold text-emerald-700">{cylinderResult.push}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
                    <span className="text-slate-500">Retraction (Pull) Force:</span>
                    <span className="font-mono font-bold text-blue-700">{cylinderResult.pull}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* 10. BASE64 & URL ENCODER/DECODER                                 */}
          {/* ================================================================ */}
          {key === 'base64-encoder' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={b64Mode === 'encode' ? 'primary' : 'outline'}
                  onClick={() => setB64Mode('encode')}
                >
                  Encode to Base64
                </Button>
                <Button
                  size="sm"
                  variant={b64Mode === 'decode' ? 'primary' : 'outline'}
                  onClick={() => setB64Mode('decode')}
                >
                  Decode from Base64
                </Button>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Source Text</Label>
                <textarea
                  className="w-full rounded-md border border-slate-200 p-2 text-xs font-mono"
                  rows={3}
                  value={b64Input}
                  onChange={(e) => setB64Input(e.target.value)}
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Converted Output:</span>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(b64Result)}>
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span className="text-xs ml-1">Copy</span>
                  </Button>
                </div>
                <p className="font-mono text-xs text-[#0B1528] break-all bg-white p-2 rounded border border-slate-200">
                  {b64Result}
                </p>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* 11. NUMBER & RADIX CONVERTER                                     */}
          {/* ================================================================ */}
          {key === 'number-converter' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Enter Decimal Number</Label>
                <Input value={decInput} onChange={(e) => setDecInput(e.target.value)} type="number" />
              </div>
              {numberResult && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
                    <span className="text-slate-400">Binary (Base 2):</span>
                    <p className="font-mono font-bold text-[#0B1528]">{numberResult.bin}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
                    <span className="text-slate-400">Hexadecimal (Base 16):</span>
                    <p className="font-mono font-bold text-emerald-700">{numberResult.hex}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
                    <span className="text-slate-400">Octal (Base 8):</span>
                    <p className="font-mono font-bold text-[#0B1528]">{numberResult.oct}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
                    <span className="text-slate-400">ASCII Character:</span>
                    <p className="font-mono font-bold text-blue-700">{numberResult.ascii}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* 12. SUBNET CALCULATOR                                            */}
          {/* ================================================================ */}
          {key === 'subnet-calculator' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">IPv4 Address</Label>
                  <Input value={subnetIP} onChange={(e) => setSubnetIP(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">CIDR Prefix</Label>
                  <select
                    className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs"
                    value={subnetCIDR}
                    onChange={(e) => setSubnetCIDR(e.target.value)}
                  >
                    {[8, 16, 20, 24, 25, 26, 27, 28, 29, 30].map((c) => (
                      <option key={c} value={c}>/{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              {subnetResult && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Usable Host IPs:</span>
                    <span className="font-mono text-xl font-bold text-emerald-700">{subnetResult.hosts}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
                    <span className="text-slate-500">Total IP Addresses:</span>
                    <span className="font-mono font-semibold">{subnetResult.totalIps}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* 13. 3D PRINTING MANUFACTURING COST                               */}
          {/* ================================================================ */}
          {key === '3d-print-cost' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Part Weight (g)</Label>
                  <Input value={printWeight} onChange={(e) => setPrintWeight(e.target.value)} type="number" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Filament (₹/kg)</Label>
                  <Input value={filamentPrice} onChange={(e) => setFilamentPrice(e.target.value)} type="number" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Print Hours</Label>
                  <Input value={printHours} onChange={(e) => setPrintHours(e.target.value)} type="number" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Machine Power (W)</Label>
                  <Input value={machineWatts} onChange={(e) => setMachineWatts(e.target.value)} type="number" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Power Rate (₹/kWh)</Label>
                  <Input value={kwhRate} onChange={(e) => setKwhRate(e.target.value)} type="number" />
                </div>
              </div>
              {printCostResult && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Estimated Total Manufacturing Cost:</span>
                    <span className="font-display text-2xl font-extrabold text-emerald-700">{printCostResult.total}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
                    <span className="text-slate-500">Material Cost:</span>
                    <span className="font-mono font-semibold">{printCostResult.filamentCost}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
                    <span className="text-slate-500">Electricity Cost:</span>
                    <span className="font-mono font-semibold">{printCostResult.electricityCost}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* 14. STEPPER CALIBRATION (STEPS/MM)                               */}
          {/* ================================================================ */}
          {key === 'stepper-steps' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-[11px]">Step Angle</Label>
                  <select
                    className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs"
                    value={stepAngle}
                    onChange={(e) => setStepAngle(e.target.value)}
                  >
                    <option value="1.8">1.8° (200 steps)</option>
                    <option value="0.9">0.9° (400 steps)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Microstepping</Label>
                  <select
                    className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs"
                    value={microstepping}
                    onChange={(e) => setMicrostepping(e.target.value)}
                  >
                    <option value="16">1/16</option>
                    <option value="32">1/32</option>
                    <option value="64">1/64</option>
                    <option value="8">1/8</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Belt Pitch (mm)</Label>
                  <Input value={beltPitch} onChange={(e) => setBeltPitch(e.target.value)} type="number" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Pulley Teeth</Label>
                  <Input value={pulleyTeeth} onChange={(e) => setPulleyTeeth(e.target.value)} type="number" />
                </div>
              </div>
              {stepperResult && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Calculated Calibration Value:</span>
                    <span className="font-mono text-xl font-bold text-emerald-700">{stepperResult.stepsPerMm}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
                    <span className="text-slate-500">Microsteps per full revolution:</span>
                    <span className="font-mono font-semibold">{stepperResult.stepsPerRev}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* External / Informational Fallback */}
          {(!key || ['hash-json', 'bandwidth-calc'].includes(key)) && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                {tool.description}
              </p>
              {tool.externalUrl && (
                <Button asChild size="sm" className="bg-[#172D4D] text-white">
                  <a href={tool.externalUrl} target="_blank" rel="noopener noreferrer">
                    <span>Open External Resource</span>
                    <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
