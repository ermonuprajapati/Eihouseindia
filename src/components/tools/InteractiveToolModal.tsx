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
  RotateCcw,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import type { EngineeringTool } from '@/types';

interface InteractiveToolModalProps {
  tool: EngineeringTool | null;
  onClose: () => void;
}

export function InteractiveToolModal({ tool, onClose }: InteractiveToolModalProps) {
  // --- Ohm's Law State ---
  const [ohmsV, setOhmsV] = useState('12');
  const [ohmsI, setOhmsI] = useState('');
  const [ohmsR, setOhmsR] = useState('10');
  const [ohmsP, setOhmsP] = useState('');

  // --- Resistor Color Code State ---
  const [band1, setBand1] = useState(1); // Brown (1)
  const [band2, setBand2] = useState(0); // Black (0)
  const [bandMult, setBandMult] = useState(2); // Red (10^2 = 100)
  const [bandTol, setBandTol] = useState(5); // Gold (5%)

  // --- Voltage Divider State ---
  const [divVin, setDivVin] = useState('12');
  const [divR1, setDivR1] = useState('10'); // kOhm
  const [divR2, setDivR2] = useState('5'); // kOhm

  // --- LED Resistor State ---
  const [ledVs, setLedVs] = useState('5');
  const [ledVf, setLedVf] = useState('2.0'); // Standard Red LED ~2.0V
  const [ledIf, setLedIf] = useState('20'); // 20 mA

  // --- 555 Timer State ---
  const [timerR1, setTimerR1] = useState('10'); // kOhm
  const [timerR2, setTimerR2] = useState('100'); // kOhm
  const [timerC, setTimerC] = useState('10'); // uF

  // --- PCB Trace State ---
  const [pcbCurrent, setPcbCurrent] = useState('2.5'); // Amps
  const [pcbTempRise, setPcbTempRise] = useState('10'); // °C
  const [pcbOunce, setPcbOunce] = useState('1'); // 1 oz

  // --- Motor Torque State ---
  const [motorRPM, setMotorRPM] = useState('3000');
  const [motorTorque, setMotorTorque] = useState('1.5'); // Nm

  // --- Gear Ratio State ---
  const [gearT1, setGearT1] = useState('20'); // driving
  const [gearT2, setGearT2] = useState('60'); // driven
  const [gearInRPM, setGearInRPM] = useState('1500');

  // --- Cylinder Force State ---
  const [cylBore, setCylBore] = useState('50'); // mm
  const [cylPressure, setCylPressure] = useState('6'); // bar
  const [cylRod, setCylRod] = useState('20'); // mm

  // --- Base64 / URL State ---
  const [b64Input, setB64Input] = useState('Engineering Innovation House India');
  const [b64Mode, setB64Mode] = useState<'encode' | 'decode'>('encode');

  // --- Number Converter State ---
  const [decInput, setDecInput] = useState('255');

  // --- Subnet Calculator State ---
  const [subnetIP, setSubnetIP] = useState('192.168.1.100');
  const [subnetCIDR, setSubnetCIDR] = useState('24');

  // --- 3D Print Cost State ---
  const [printWeight, setPrintWeight] = useState('120'); // grams
  const [filamentPrice, setFilamentPrice] = useState('1200'); // INR/kg
  const [printHours, setPrintHours] = useState('4.5'); // hours
  const [machineWatts, setMachineWatts] = useState('150'); // Watts
  const [kwhRate, setKwhRate] = useState('8'); // INR/kWh

  // --- Stepper Steps State ---
  const [stepAngle, setStepAngle] = useState('1.8'); // deg (200 steps)
  const [microstepping, setMicrostepping] = useState('16'); // 1/16
  const [beltPitch, setBeltPitch] = useState('2'); // mm (GT2)
  const [pulleyTeeth, setPulleyTeeth] = useState('20');

  const [copied, setCopied] = useState(false);
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Result copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // --- Calculations ---

  // 1. Ohm's Law
  const ohmsResult = useMemo(() => {
    const v = parseFloat(ohmsV);
    const r = parseFloat(ohmsR);
    if (!isNaN(v) && !isNaN(r) && r > 0) {
      const i = v / r;
      const p = v * i;
      return {
        i: (i >= 1 ? `${i.toFixed(3)} A` : `${(i * 1000).toFixed(2)} mA`),
        p: (p >= 1 ? `${p.toFixed(3)} W` : `${(p * 1000).toFixed(2)} mW`),
        formula: `I = V / R = ${v}V / ${r}Ω, P = V × I`,
      };
    }
    return null;
  }, [ohmsV, ohmsR]);

  // 2. Resistor Color
  const resistorValue = useMemo(() => {
    const rawVal = (band1 * 10 + band2) * Math.pow(10, bandMult);
    let formatted = `${rawVal} Ω`;
    if (rawVal >= 1000000) {
      formatted = `${(rawVal / 1000000).toFixed(2)} MΩ`;
    } else if (rawVal >= 1000) {
      formatted = `${(rawVal / 1000).toFixed(2)} kΩ`;
    }
    return {
      value: formatted,
      raw: rawVal,
      tolerance: `±${bandTol}%`,
    };
  }, [band1, band2, bandMult, bandTol]);

  // 3. Voltage Divider
  const dividerResult = useMemo(() => {
    const vin = parseFloat(divVin);
    const r1 = parseFloat(divR1) * 1000;
    const r2 = parseFloat(divR2) * 1000;
    if (!isNaN(vin) && !isNaN(r1) && !isNaN(r2) && r1 + r2 > 0) {
      const vout = (vin * r2) / (r1 + r2);
      const ratio = r2 / (r1 + r2);
      const current = (vin / (r1 + r2)) * 1000;
      return {
        vout: `${vout.toFixed(3)} V`,
        ratio: ratio.toFixed(4),
        current: `${current.toFixed(3)} mA`,
      };
    }
    return null;
  }, [divVin, divR1, divR2]);

  // 4. LED Series Resistor
  const ledResult = useMemo(() => {
    const vs = parseFloat(ledVs);
    const vf = parseFloat(ledVf);
    const i_ma = parseFloat(ledIf);
    if (!isNaN(vs) && !isNaN(vf) && !isNaN(i_ma) && vs > vf && i_ma > 0) {
      const i_a = i_ma / 1000;
      const r = (vs - vf) / i_a;
      const power = (vs - vf) * i_a;
      return {
        exactR: `${r.toFixed(1)} Ω`,
        recommended: `${Math.ceil(r)} Ω`,
        power: `${(power * 1000).toFixed(1)} mW (Use min ${power < 0.25 ? '1/4W' : power < 0.5 ? '1/2W' : '1W'} resistor)`,
      };
    }
    return null;
  }, [ledVs, ledVf, ledIf]);

  // 5. 555 Timer
  const timerResult = useMemo(() => {
    const r1 = parseFloat(timerR1) * 1000;
    const r2 = parseFloat(timerR2) * 1000;
    const c = parseFloat(timerC) * 0.000001;
    if (!isNaN(r1) && !isNaN(r2) && !isNaN(c) && r1 > 0 && r2 > 0 && c > 0) {
      const freq = 1.44 / ((r1 + 2 * r2) * c);
      const th = 0.693 * (r1 + r2) * c;
      const tl = 0.693 * r2 * c;
      const duty = (th / (th + tl)) * 100;
      return {
        freq: freq >= 1000 ? `${(freq / 1000).toFixed(2)} kHz` : `${freq.toFixed(2)} Hz`,
        th: `${(th * 1000).toFixed(2)} ms`,
        tl: `${(tl * 1000).toFixed(2)} ms`,
        duty: `${duty.toFixed(1)}%`,
      };
    }
    return null;
  }, [timerR1, timerR2, timerC]);

  // 6. PCB Trace Width (IPC-2221)
  const pcbResult = useMemo(() => {
    const i = parseFloat(pcbCurrent);
    const dt = parseFloat(pcbTempRise);
    const oz = parseFloat(pcbOunce);
    if (!isNaN(i) && !isNaN(dt) && i > 0 && dt > 0) {
      // IPC-2221 External Layers: Area = (I / (0.048 * dt^0.44))^(1 / 0.725) in sq mils
      const area = Math.pow(i / (0.048 * Math.pow(dt, 0.44)), 1 / 0.725);
      const thickness = oz * 1.378; // mils for 1oz is approx 1.378 mils (35 um)
      const widthMils = area / thickness;
      const widthMm = widthMils * 0.0254;
      return {
        mils: `${widthMils.toFixed(1)} mils`,
        mm: `${widthMm.toFixed(3)} mm`,
      };
    }
    return null;
  }, [pcbCurrent, pcbTempRise, pcbOunce]);

  // 7. Motor Torque
  const motorResult = useMemo(() => {
    const rpm = parseFloat(motorRPM);
    const t = parseFloat(motorTorque);
    if (!isNaN(rpm) && !isNaN(t) && rpm > 0) {
      const watts = (2 * Math.PI * rpm * t) / 60;
      const hp = watts / 745.7;
      return {
        watts: `${watts.toFixed(1)} Watts`,
        hp: `${hp.toFixed(2)} HP`,
        kgcm: `${(t * 10.197).toFixed(2)} kg·cm`,
      };
    }
    return null;
  }, [motorRPM, motorTorque]);

  // 8. Gear Ratio
  const gearResult = useMemo(() => {
    const t1 = parseFloat(gearT1);
    const t2 = parseFloat(gearT2);
    const inRPM = parseFloat(gearInRPM);
    if (!isNaN(t1) && !isNaN(t2) && !isNaN(inRPM) && t1 > 0 && t2 > 0) {
      const ratio = t2 / t1;
      const outRPM = inRPM / ratio;
      return {
        ratio: `${ratio.toFixed(2)} : 1`,
        outRPM: `${outRPM.toFixed(1)} RPM`,
        torqueAdvantage: `${ratio.toFixed(2)}x Torque Multiplication`,
      };
    }
    return null;
  }, [gearT1, gearT2, gearInRPM]);

  // 9. Cylinder Force
  const cylinderResult = useMemo(() => {
    const d = parseFloat(cylBore); // mm
    const p = parseFloat(cylPressure); // bar (1 bar = 0.1 N/mm2)
    const d_rod = parseFloat(cylRod); // mm
    if (!isNaN(d) && !isNaN(p) && d > 0) {
      const areaPush = (Math.PI * Math.pow(d, 2)) / 4;
      const forcePushN = areaPush * (p * 0.1);
      const areaPull = areaPush - (Math.PI * Math.pow(d_rod, 2)) / 4;
      const forcePullN = areaPull * (p * 0.1);
      return {
        push: `${forcePushN.toFixed(1)} N (${(forcePushN / 9.80665).toFixed(1)} kgf)`,
        pull: `${forcePullN.toFixed(1)} N (${(forcePullN / 9.80665).toFixed(1)} kgf)`,
      };
    }
    return null;
  }, [cylBore, cylPressure, cylRod]);

  // 10. Base64
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

  // 11. Number Converter
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

  // 12. Subnet Calculator
  const subnetResult = useMemo(() => {
    const cidr = parseInt(subnetCIDR, 10);
    if (cidr >= 8 && cidr <= 30) {
      const totalIps = Math.pow(2, 32 - cidr);
      const usableHosts = totalIps - 2;
      return {
        hosts: usableHosts.toLocaleString(),
        totalIps: totalIps.toLocaleString(),
        mask: `/${cidr}`,
      };
    }
    return null;
  }, [subnetCIDR]);

  // 13. 3D Print Cost
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

  // 14. Stepper Steps
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
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
              {tool.domain}
            </span>
            {tool.badge && (
              <span className="text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                {tool.badge}
              </span>
            )}
          </div>
          <DialogTitle className="font-display text-xl sm:text-2xl font-bold text-[#0B1528] flex items-center gap-2 pt-1">
            <Calculator className="h-5 w-5 text-primary" />
            {tool.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 leading-relaxed">
            {tool.description || tool.summary}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-3">
          {/* 1. Ohm's Law Calculator */}
          {key === 'ohms-law' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Voltage (V in Volts)</Label>
                  <Input value={ohmsV} onChange={(e) => setOhmsV(e.target.value)} type="number" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Resistance (R in Ohms)</Label>
                  <Input value={ohmsR} onChange={(e) => setOhmsR(e.target.value)} type="number" />
                </div>
              </div>
              {ohmsResult && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Calculated Current (I):</span>
                    <span className="font-mono text-base font-bold text-[#0B1528]">{ohmsResult.i}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                    <span className="text-xs font-semibold text-slate-500">Power Dissipation (P):</span>
                    <span className="font-mono text-base font-bold text-emerald-700">{ohmsResult.p}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono pt-1">{ohmsResult.formula}</p>
                </div>
              )}
            </div>
          )}

          {/* 2. Resistor Color Code */}
          {key === 'resistor-color-code' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-[11px]">1st Band</Label>
                  <select
                    className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs"
                    value={band1}
                    onChange={(e) => setBand1(Number(e.target.value))}
                  >
                    {['Black (0)', 'Brown (1)', 'Red (2)', 'Orange (3)', 'Yellow (4)', 'Green (5)', 'Blue (6)', 'Violet (7)', 'Grey (8)', 'White (9)'].map((c, i) => (
                      <option key={i} value={i}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">2nd Band</Label>
                  <select
                    className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs"
                    value={band2}
                    onChange={(e) => setBand2(Number(e.target.value))}
                  >
                    {['Black (0)', 'Brown (1)', 'Red (2)', 'Orange (3)', 'Yellow (4)', 'Green (5)', 'Blue (6)', 'Violet (7)', 'Grey (8)', 'White (9)'].map((c, i) => (
                      <option key={i} value={i}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Multiplier</Label>
                  <select
                    className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs"
                    value={bandMult}
                    onChange={(e) => setBandMult(Number(e.target.value))}
                  >
                    <option value={0}>Black (×1)</option>
                    <option value={1}>Brown (×10)</option>
                    <option value={2}>Red (×100)</option>
                    <option value={3}>Orange (×1k)</option>
                    <option value={4}>Yellow (×10k)</option>
                    <option value={5}>Green (×100k)</option>
                    <option value={6}>Blue (×1M)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Tolerance</Label>
                  <select
                    className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs"
                    value={bandTol}
                    onChange={(e) => setBandTol(Number(e.target.value))}
                  >
                    <option value={1}>Brown (±1%)</option>
                    <option value={2}>Red (±2%)</option>
                    <option value={5}>Gold (±5%)</option>
                    <option value={10}>Silver (±10%)</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Nominal Resistance Value</p>
                  <p className="font-display text-2xl font-extrabold text-[#0B1528]">{resistorValue.value}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-amber-100 text-amber-900">
                    {resistorValue.tolerance}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Voltage Divider */}
          {key === 'voltage-divider' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Input Vin (V)</Label>
                  <Input value={divVin} onChange={(e) => setDivVin(e.target.value)} type="number" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Resistor R1 (kΩ)</Label>
                  <Input value={divR1} onChange={(e) => setDivR1(e.target.value)} type="number" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Resistor R2 (kΩ)</Label>
                  <Input value={divR2} onChange={(e) => setDivR2(e.target.value)} type="number" />
                </div>
              </div>
              {dividerResult && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Output Voltage (Vout):</span>
                    <span className="font-mono text-xl font-bold text-emerald-700">{dividerResult.vout}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
                    <span className="text-slate-500">Divider Ratio:</span>
                    <span className="font-mono font-semibold">{dividerResult.ratio}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
                    <span className="text-slate-500">Quiescent Current:</span>
                    <span className="font-mono font-semibold">{dividerResult.current}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. LED Resistor */}
          {key === 'led-resistor' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Supply Voltage (V)</Label>
                  <Input value={ledVs} onChange={(e) => setLedVs(e.target.value)} type="number" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">LED Vf (V)</Label>
                  <Input value={ledVf} onChange={(e) => setLedVf(e.target.value)} type="number" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Current (mA)</Label>
                  <Input value={ledIf} onChange={(e) => setLedIf(e.target.value)} type="number" />
                </div>
              </div>
              {ledResult && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Recommended Standard Resistor:</span>
                    <span className="font-mono text-xl font-bold text-emerald-700">{ledResult.recommended}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
                    <span className="text-slate-500">Exact Theoretical Value:</span>
                    <span className="font-mono font-semibold">{ledResult.exactR}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
                    <span className="text-slate-500">Resistor Power Dissipation:</span>
                    <span className="font-mono font-semibold">{ledResult.power}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. 555 Timer */}
          {key === '555-timer' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">R1 (kΩ)</Label>
                  <Input value={timerR1} onChange={(e) => setTimerR1(e.target.value)} type="number" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">R2 (kΩ)</Label>
                  <Input value={timerR2} onChange={(e) => setTimerR2(e.target.value)} type="number" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">C (µF)</Label>
                  <Input value={timerC} onChange={(e) => setTimerC(e.target.value)} type="number" />
                </div>
              </div>
              {timerResult && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Oscillation Frequency:</span>
                    <span className="font-mono text-xl font-bold text-emerald-700">{timerResult.freq}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
                    <span className="text-slate-500">High Pulse Time (Th):</span>
                    <span className="font-mono font-semibold">{timerResult.th}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
                    <span className="text-slate-500">Low Pulse Time (Tl):</span>
                    <span className="font-mono font-semibold">{timerResult.tl}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
                    <span className="text-slate-500">Duty Cycle:</span>
                    <span className="font-mono font-semibold">{timerResult.duty}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. PCB Trace Width */}
          {key === 'pcb-trace' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
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
                    <option value="1">1 oz (35 µm)</option>
                    <option value="2">2 oz (70 µm)</option>
                  </select>
                </div>
              </div>
              {pcbResult && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Minimum Trace Width (mm):</span>
                    <span className="font-mono text-xl font-bold text-emerald-700">{pcbResult.mm}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
                    <span className="text-slate-500">Imperial Width:</span>
                    <span className="font-mono font-semibold">{pcbResult.mils}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 7. Motor Torque */}
          {key === 'torque-power' && (
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

          {/* 8. Gear Ratio */}
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

          {/* 9. Cylinder Force */}
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

          {/* 10. Base64 & URL */}
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

          {/* 11. Number Converter */}
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

          {/* 12. Subnet Calculator */}
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

          {/* 13. 3D Print Cost */}
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

          {/* 14. Stepper Steps */}
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

          {/* Fallback for external or informational tools */}
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
