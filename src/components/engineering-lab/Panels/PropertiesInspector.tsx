'use client';

import React from 'react';
import { CircuitComponent } from '@/modules/engineering-lab/types';
import { Sliders, RotateCw, Trash2, Zap, X, FlipHorizontal } from 'lucide-react';

interface PropertiesInspectorProps {
  component: CircuitComponent | null;
  onUpdateComponent: (updated: CircuitComponent) => void;
  onRotateComponent: (id: string) => void;
  onMirrorComponent?: (id: string) => void;
  onDeleteComponent: (id: string) => void;
  onClose: () => void;
  simState?: { voltage: number; current: number; on?: boolean };
}

const FOOTPRINT_OPTIONS = [
  { value: 'Resistor_SMD:R_0805_2012Metric', label: 'SMD 0805 (2012 Metric)' },
  { value: 'Resistor_SMD:R_1206_3216Metric', label: 'SMD 1206 (3216 Metric)' },
  { value: 'Resistor_THT:R_Axial_DIN0207_P7.62mm_Horizontal', label: 'Through-Hole Axial (1/4W, 7.62mm)' },
  { value: 'Capacitor_SMD:C_0805_2012Metric', label: 'Capacitor SMD 0805' },
  { value: 'Capacitor_THT:CP_Radial_D6.3mm_P2.50mm', label: 'Capacitor Radial Electrolytic (6.3mm)' },
  { value: 'Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P5.00mm', label: 'Capacitor Disc Ceramic (5.0mm)' },
  { value: 'Package_DIP:DIP-8_W7.62mm', label: 'DIP-8 (Through-Hole, 7.62mm pitch)' },
  { value: 'Package_TO_SOT_THT:TO-92_Inline', label: 'TO-92 Transistor Package' },
  { value: 'Package_TO_SOT_THT:TO-220-3_Vertical', label: 'TO-220 Power Package' },
  { value: 'LED_THT:LED_D5.0mm', label: 'LED 5mm Through-Hole' },
  { value: 'Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical', label: 'Pin Header 1x02 (2.54mm)' },
  { value: 'BatteryHolder_Keystone_2460_1xAA', label: 'Battery Clip / Holder 9V' },
  { value: 'TestPoint_Pad_D1.0mm', label: 'GND Test Point Pad (1.0mm)' },
];

const MODEL_3D_OPTIONS = [
  { value: 'resistor_axial_horiz', label: 'Resistor Axial 1/4W' },
  { value: 'resistor_smd_0805', label: 'Resistor SMD 0805' },
  { value: 'capacitor_disc_ceramic', label: 'Capacitor Disc Ceramic' },
  { value: 'capacitor_radial_can', label: 'Capacitor Radial Can' },
  { value: 'dip8_integrated_circuit', label: 'DIP-8 IC Package' },
  { value: 'to92_transistor', label: 'TO-92 Small Signal BJT' },
  { value: 'to220_mosfet', label: 'TO-220 Power FET' },
  { value: 'led_5mm_diffused', label: 'LED 5mm Diffused' },
  { value: 'battery_9v_block', label: 'Battery 9V Alkaline Block' },
  { value: 'header_2pin_2.54mm', label: 'Header 2-Pin Terminal' },
];

export function PropertiesInspector({
  component,
  onUpdateComponent,
  onRotateComponent,
  onMirrorComponent,
  onDeleteComponent,
  onClose,
  simState,
}: PropertiesInspectorProps) {
  if (!component) {
    return (
      <aside className="w-80 bg-[#0B1528] border-l border-slate-800 flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs select-none">
        <Sliders className="w-8 h-8 text-slate-700 mb-2 stroke-1" />
        <p className="font-semibold text-slate-400">No Component Selected</p>
        <p className="text-[11px] text-slate-600 mt-1 max-w-[200px]">
          Click any placed component on the schematic to inspect and edit its physical, electrical, and simulation properties.
        </p>
      </aside>
    );
  }

  const { type, designator, parameters } = component;
  const currentDesignator = designator || component.label.split(' ')[0] || type.slice(0, 3);

  // Helper to update specific parameter and value
  const updateParameter = (key: string, val: number | string | boolean, formattedValue?: string) => {
    const updatedParams = { ...component.parameters, [key]: val };
    const nextComp: CircuitComponent = {
      ...component,
      parameters: updatedParams,
    };
    if (formattedValue !== undefined) {
      nextComp.value = formattedValue;
    }
    onUpdateComponent(nextComp);
  };

  const powerMw = simState ? Math.abs(simState.voltage * simState.current * 1000) : 0;

  return (
    <aside className="w-80 bg-[#0B1528] border-l border-slate-800 flex flex-col h-full z-20 select-none shadow-2xl text-slate-200">
      {/* Panel Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <div>
            <h3 className="font-semibold text-xs tracking-wider text-slate-100 uppercase font-mono">
              Inspector: {currentDesignator}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">{type.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-800">
        {/* SECTION 1: REFERENCE DESIGNATOR & LABEL */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-2.5">
          <div className="text-[10px] uppercase font-mono text-emerald-400 font-bold tracking-wider flex items-center justify-between">
            <span>Reference &amp; Identity</span>
            <span className="text-slate-500 font-normal">IEEE 315</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold">Designator</label>
              <input
                type="text"
                value={currentDesignator}
                onChange={(e) =>
                  onUpdateComponent({
                    ...component,
                    designator: e.target.value.toUpperCase().trim(),
                    label: e.target.value.toUpperCase().trim(),
                  })
                }
                placeholder="e.g. R1, C1, BT1"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold">User Note</label>
              <input
                type="text"
                value={component.label}
                onChange={(e) => onUpdateComponent({ ...component, label: e.target.value })}
                placeholder="e.g. Pullup"
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: ELECTRICAL & SIMULATION PARAMETERS */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-3">
          <div className="text-[10px] uppercase font-mono text-cyan-400 font-bold tracking-wider flex items-center justify-between">
            <span>Electrical Parameters</span>
            <span className="text-slate-500 font-normal">MNA Solver</span>
          </div>

          {/* VOLTAGE SOURCES / BATTERY */}
          {(type === 'DC_VOLTAGE' || type === 'BATTERY') && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold uppercase font-mono">Nominal Source Voltage</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {Number(parameters.voltage ?? 9.0).toFixed(1)} V
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1000"
                    value={Number(parameters.voltage ?? 9.0)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      const safeV = isNaN(v) ? 0 : v;
                      updateParameter('voltage', safeV, `${safeV}V`);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-slate-400 font-mono text-xs px-2 py-1.5 bg-slate-950 border border-slate-800 rounded">
                    Volts
                  </span>
                </div>
              </div>

              {/* Internal Resistance */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold">
                  Internal Resistance (Rint)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={Number(parameters.internalResistance ?? 0.1)}
                    onChange={(e) => {
                      const r = parseFloat(e.target.value);
                      updateParameter('internalResistance', isNaN(r) ? 0.1 : r);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-slate-400 font-mono text-xs px-2 py-1.5 bg-slate-950 border border-slate-800 rounded">
                    Ω
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* RESISTOR & POTENTIOMETER */}
          {(type === 'RESISTOR' || type === 'POTENTIOMETER') && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold uppercase font-mono">Resistance Value</span>
                  <span className="font-mono text-cyan-400 font-bold">{component.value}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={
                      Number(parameters.resistance ?? 1000) >= 1000000
                        ? Number(parameters.resistance ?? 1000) / 1000000
                        : Number(parameters.resistance ?? 1000) >= 1000
                        ? Number(parameters.resistance ?? 1000) / 1000
                        : Number(parameters.resistance ?? 1000)
                    }
                    onChange={(e) => {
                      const raw = parseFloat(e.target.value);
                      if (isNaN(raw) || raw <= 0) return;
                      const unitMult = component.value.includes('M')
                        ? 1000000
                        : component.value.includes('k') || component.value.includes('K')
                        ? 1000
                        : 1;
                      const finalOhms = raw * unitMult;
                      const fmt =
                        unitMult === 1000000
                          ? `${raw}MΩ`
                          : unitMult === 1000
                          ? `${raw}kΩ`
                          : `${raw}Ω`;
                      updateParameter('resistance', finalOhms, fmt);
                    }}
                    className="col-span-2 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                  <select
                    value={
                      component.value.includes('M')
                        ? 'M'
                        : component.value.includes('k') || component.value.includes('K')
                        ? 'k'
                        : 'ohm'
                    }
                    onChange={(e) => {
                      const currentOhms = Number(parameters.resistance ?? 1000);
                      let baseVal = currentOhms;
                      if (component.value.includes('M')) baseVal = currentOhms / 1000000;
                      else if (component.value.includes('k') || component.value.includes('K')) baseVal = currentOhms / 1000;

                      let newOhms = baseVal;
                      let unitStr = 'Ω';
                      if (e.target.value === 'k') {
                        newOhms = baseVal * 1000;
                        unitStr = 'kΩ';
                      } else if (e.target.value === 'M') {
                        newOhms = baseVal * 1000000;
                        unitStr = 'MΩ';
                      }
                      updateParameter('resistance', newOhms, `${baseVal}${unitStr}`);
                    }}
                    className="col-span-1 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ohm">Ω</option>
                    <option value="k">kΩ</option>
                    <option value="M">MΩ</option>
                  </select>
                </div>
              </div>

              {/* Power Rating & Tolerance */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold">Tolerance</label>
                  <select
                    value={Number(parameters.tolerancePercent ?? 5)}
                    onChange={(e) => updateParameter('tolerancePercent', Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-300 font-mono text-xs"
                  >
                    <option value={1}>±1% (Metal)</option>
                    <option value={2}>±2%</option>
                    <option value={5}>±5% (Carbon)</option>
                    <option value={10}>±10%</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold">Power Rating</label>
                  <select
                    value={Number(parameters.powerRatingW ?? 0.25)}
                    onChange={(e) => updateParameter('powerRatingW', Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-300 font-mono text-xs"
                  >
                    <option value={0.125}>0.125 W (1/8W)</option>
                    <option value={0.25}>0.25 W (1/4W)</option>
                    <option value={0.5}>0.5 W (1/2W)</option>
                    <option value={1.0}>1.0 W</option>
                    <option value={2.0}>2.0 W</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* CAPACITOR */}
          {type === 'CAPACITOR' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold uppercase font-mono">Capacitance</span>
                  <span className="font-mono text-cyan-400 font-bold">{component.value}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    value={
                      Number(parameters.capacitance ?? 0.00001) >= 0.001
                        ? Number(parameters.capacitance ?? 0.00001) * 1000
                        : Number(parameters.capacitance ?? 0.00001) >= 0.000000001
                        ? Number(parameters.capacitance ?? 0.00001) * 1000000
                        : Number(parameters.capacitance ?? 0.00001) * 1000000000000
                    }
                    onChange={(e) => {
                      const raw = parseFloat(e.target.value);
                      if (isNaN(raw) || raw <= 0) return;
                      const isUf = component.value.includes('µ') || component.value.includes('u');
                      const isNf = component.value.includes('n');
                      const isPf = component.value.includes('p');
                      const mult = isUf ? 1e-6 : isNf ? 1e-9 : isPf ? 1e-12 : 1e-6;
                      const finalF = raw * mult;
                      const unitStr = isUf ? 'µF' : isNf ? 'nF' : isPf ? 'pF' : 'µF';
                      updateParameter('capacitance', finalF, `${raw}${unitStr}`);
                    }}
                    className="col-span-2 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                  <select
                    value={
                      component.value.includes('p')
                        ? 'pF'
                        : component.value.includes('n')
                        ? 'nF'
                        : 'uF'
                    }
                    onChange={(e) => {
                      const cur = Number(parameters.capacitance ?? 0.00001);
                      let base = cur * 1e6;
                      if (e.target.value === 'pF') base = cur * 1e12;
                      else if (e.target.value === 'nF') base = cur * 1e9;
                      const mult = e.target.value === 'pF' ? 1e-12 : e.target.value === 'nF' ? 1e-9 : 1e-6;
                      const raw = parseFloat((base).toFixed(1));
                      updateParameter('capacitance', raw * mult, `${raw}${e.target.value.replace('u', 'µ')}`);
                    }}
                    className="col-span-1 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="pF">pF</option>
                    <option value="nF">nF</option>
                    <option value="uF">µF</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold">Voltage Rating</label>
                  <select
                    value={Number(parameters.voltageRatingV ?? 25)}
                    onChange={(e) => updateParameter('voltageRatingV', Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-300 font-mono text-xs"
                  >
                    <option value={16}>16 V</option>
                    <option value={25}>25 V</option>
                    <option value={50}>50 V</option>
                    <option value={100}>100 V</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold">Polarity</label>
                  <select
                    value={parameters.polarized ? 'yes' : 'no'}
                    onChange={(e) => updateParameter('polarized', e.target.value === 'yes')}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-300 font-mono text-xs"
                  >
                    <option value="no">Non-Polarized</option>
                    <option value="yes">Polarized (+/-)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* LED / DIODE */}
          {(type === 'LED' || type === 'DIODE') && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold">
                    Forward Drop (Vf)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.2"
                    max="5.0"
                    value={Number(parameters.forwardVoltageV ?? (type === 'LED' ? 2.0 : 0.7))}
                    onChange={(e) => updateParameter('forwardVoltageV', parseFloat(e.target.value) || 2.0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono text-xs"
                  />
                </div>

                {type === 'LED' && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold">LED Color</label>
                    <select
                      value={String(parameters.color ?? 'Red')}
                      onChange={(e) => updateParameter('color', e.target.value, `${e.target.value} LED`)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-300 font-mono text-xs"
                    >
                      <option value="Red">Red (630nm)</option>
                      <option value="Green">Green (525nm)</option>
                      <option value="Blue">Blue (470nm)</option>
                      <option value="Amber">Amber (590nm)</option>
                      <option value="White">White (Warm)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* NE555 TIMER */}
          {type === 'TIMER_555' && (
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold">Operating IC Model</label>
              <select
                value={String(component.value || 'NE555P')}
                onChange={(e) => onUpdateComponent({ ...component, value: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 font-mono text-xs"
              >
                <option value="NE555P">NE555P (Bipolar Standard, 4.5V-16V)</option>
                <option value="TLC555">TLC555 (CMOS Low-Power, 2V-15V)</option>
                <option value="LM555CN">LM555CN (National Semi)</option>
              </select>
            </div>
          )}
        </div>

        {/* SECTION 3: REAL-TIME ELECTRICAL TELEMETRY */}
        {simState && (
          <div className="rounded-lg border border-cyan-900/60 bg-cyan-950/20 p-3 space-y-2.5">
            <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[11px] font-bold">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Real-Time In-Circuit Telemetry</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="bg-slate-950/90 p-2 rounded border border-slate-800">
                <div className="text-slate-500 text-[9px] font-semibold">VOLTAGE DROP</div>
                <div className="text-cyan-300 font-bold text-sm mt-0.5">
                  {simState.voltage >= 0 ? simState.voltage.toFixed(3) : simState.voltage.toFixed(3)} V
                </div>
              </div>
              <div className="bg-slate-950/90 p-2 rounded border border-slate-800">
                <div className="text-slate-500 text-[9px] font-semibold">BRANCH CURRENT</div>
                <div className="text-amber-400 font-bold text-sm mt-0.5">
                  {(simState.current * 1000).toFixed(2)} mA
                </div>
              </div>
            </div>
            <div className="bg-slate-950/90 p-2 rounded border border-slate-800 text-[11px] font-mono flex items-center justify-between">
              <span className="text-slate-500 text-[9px] font-semibold">POWER DISSIPATION</span>
              <span className="text-purple-300 font-bold">{powerMw.toFixed(2)} mW</span>
            </div>
          </div>
        )}

        {/* SECTION 4: PCB FOOTPRINT & 3D CAD MODEL MAPPING */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-3">
          <div className="text-[10px] uppercase font-mono text-purple-400 font-bold tracking-wider flex items-center justify-between">
            <span>Physical Representation</span>
            <span className="text-slate-500 font-normal">IPC-7351</span>
          </div>

          {/* PCB Footprint Selection */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold flex items-center justify-between">
              <span>PCB Footprint Package</span>
              <span className="text-slate-500">2D Layout</span>
            </label>
            <select
              value={component.footprint}
              onChange={(e) => onUpdateComponent({ ...component, footprint: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 font-mono text-[11px] focus:outline-none focus:border-purple-500"
            >
              {FOOTPRINT_OPTIONS.map((fp) => (
                <option key={fp.value} value={fp.value}>
                  {fp.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3D CAD Model Mapping */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold flex items-center justify-between">
              <span>3D CAD Model Mapping</span>
              <span className="text-slate-500">WebGL 3D</span>
            </label>
            <select
              value={component.model3d || 'resistor_axial_horiz'}
              onChange={(e) => onUpdateComponent({ ...component, model3d: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 font-mono text-[11px] focus:outline-none focus:border-purple-500"
            >
              {MODEL_3D_OPTIONS.map((m3d) => (
                <option key={m3d.value} value={m3d.value}>
                  {m3d.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SECTION 5: ELECTRICAL PIN CONNECTIONS */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-2">
          <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold flex items-center justify-between">
            <span>Terminal Pins ({component.pins.length})</span>
            <span className="text-slate-500">Netlist Nodes</span>
          </label>
          <div className="bg-slate-950 border border-slate-800 rounded divide-y divide-slate-800/80 font-mono text-[10px]">
            {component.pins.map((pin) => (
              <div key={pin.id} className="p-2 flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="font-bold">{pin.name}</span>
                  <span className="text-slate-500">[{pin.id}]</span>
                </div>
                <span className="text-slate-400 uppercase text-[9px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                  {pin.pinType}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/80 flex items-center gap-2">
        <button
          onClick={() => onRotateComponent(component.id)}
          className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center gap-1.5 font-medium transition-colors text-xs"
          title="Rotate 90 degrees clockwise (R key)"
        >
          <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
          <span>Rotate 90°</span>
        </button>

        {onMirrorComponent && (
          <button
            onClick={() => onMirrorComponent(component.id)}
            className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center gap-1.5 font-medium transition-colors text-xs"
            title="Mirror horizontally"
          >
            <FlipHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mirror</span>
          </button>
        )}

        <button
          onClick={() => onDeleteComponent(component.id)}
          className="py-1.5 px-3 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded border border-rose-800/60 transition-colors text-xs"
          title="Delete Component (Del key)"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
