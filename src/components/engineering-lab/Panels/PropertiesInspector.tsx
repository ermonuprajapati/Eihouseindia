'use client';

import React, { useRef, useEffect } from 'react';
import { CircuitComponent, CircuitWire } from '@/modules/engineering-lab/types';
import { Sliders, RotateCw, Trash2, Zap, X, FlipHorizontal, ChevronLeft, ChevronRight, Copy, Scissors, Cable, Check } from 'lucide-react';

interface PropertiesInspectorProps {
  component: CircuitComponent | null;
  selectedWire?: CircuitWire | null;
  components?: CircuitComponent[];
  onUpdateComponent: (updated: CircuitComponent) => void;
  onUpdateWire?: (updated: CircuitWire) => void;
  onRotateComponent: (id: string) => void;
  onMirrorComponent?: (id: string) => void;
  onDeleteComponent: (id: string) => void;
  onDeleteWire?: (wireId: string) => void;
  onDisconnectWire?: (wireId: string) => void;
  onDuplicateComponent?: (id: string) => void;
  onClose: () => void;
  simState?: { voltage: number; current: number; on?: boolean };
  wireCurrent?: number;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  width?: number;
  onWidthChange?: (width: number) => void;
}

const FOOTPRINT_OPTIONS = [
  { value: 'Resistor_SMD:R_0805_2012Metric', label: 'SMD 0805 (2012 Metric)' },
  { value: 'Resistor_SMD:R_1206_3216Metric', label: 'SMD 1206 (3216 Metric)' },
  { value: 'Resistor_THT:R_Axial_DIN0207_P7.62mm_Horizontal', label: 'Through-Hole Axial Resistor (1/4W, 7.62mm)' },
  { value: 'Inductor_THT:L_Axial_L7.0mm_D3.3mm_P10.16mm_Horizontal', label: 'Through-Hole Axial Inductor (10.16mm)' },
  { value: 'Diode_THT:D_DO-35_SOD27_P7.62mm_Horizontal', label: 'Through-Hole Diode DO-35 (1N4148)' },
  { value: 'Diode_THT:D_DO-41_SOD81_P10.16mm_Horizontal', label: 'Through-Hole Diode DO-41 (1N4007)' },
  { value: 'Potentiometer_THT:Potentiometer_Bourns_3386P_Vertical', label: 'Bourns 3386P 3-Pin Trimmer' },
  { value: 'Capacitor_SMD:C_0805_2012Metric', label: 'Capacitor SMD 0805' },
  { value: 'Capacitor_THT:CP_Radial_D6.3mm_P2.50mm', label: 'Capacitor Radial Electrolytic (6.3mm)' },
  { value: 'Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P5.00mm', label: 'Capacitor Disc Ceramic (5.0mm)' },
  { value: 'Package_DIP:DIP-8_W7.62mm', label: 'DIP-8 (Through-Hole, 7.62mm pitch)' },
  { value: 'Package_TO_SOT_THT:TO-92_Inline', label: 'TO-92 Transistor Package' },
  { value: 'Package_TO_SOT_THT:TO-220-3_Vertical', label: 'TO-220 Power Package (7805/MOSFET)' },
  { value: 'LED_THT:LED_D5.0mm', label: 'LED 5mm Through-Hole' },
  { value: 'LED_THT:LED_D5.0mm-4', label: 'RGB LED 4-Pin Through-Hole' },
  { value: 'Relay_THT:Relay_SPDT_Songle_SRD-Series', label: 'Songle SRD SPDT Relay' },
  { value: 'Connector_PinHeader_2.54mm:PinHeader_1x02_P2.54mm_Vertical', label: 'Pin Header 1x02 (2.54mm)' },
  { value: 'TerminalBlock:TerminalBlock_bornier-2_P5.08mm', label: 'Terminal Block 2-Pin 5.08mm' },
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
  selectedWire,
  components,
  onUpdateComponent,
  onUpdateWire,
  onRotateComponent,
  onMirrorComponent,
  onDeleteComponent,
  onDeleteWire,
  onDisconnectWire,
  onDuplicateComponent,
  onClose,
  simState,
  wireCurrent,
  isOpen = true,
  onToggleOpen,
  width = 320,
  onWidthChange,
}: PropertiesInspectorProps) {
  const isResizingRef = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !onWidthChange) return;
      const newWidth = Math.max(240, Math.min(550, window.innerWidth - e.clientX));
      onWidthChange(newWidth);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onWidthChange]);

  // PERSISTENT COLLAPSED TAB ON RIGHT EDGE
  if (!isOpen) {
    return (
      <div className="relative z-30 shrink-0">
        <button
          onClick={onToggleOpen || onClose}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#0B1528] hover:bg-slate-800 border-y border-l border-slate-700 text-slate-300 hover:text-white py-3 px-2 rounded-l-lg shadow-2xl transition-all flex flex-col items-center gap-2 group cursor-pointer"
          title="Open Properties Inspector (Shortcut: I)"
        >
          <ChevronLeft className="w-4 h-4 text-sky-400 group-hover:scale-125 transition-transform" />
          <span className="[writing-mode:vertical-lr] font-mono tracking-widest text-[11px] font-bold uppercase text-slate-300 group-hover:text-sky-400">
            Inspector [I]
          </span>
          <Sliders className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400" />
        </button>
      </div>
    );
  }

  // DEDICATED WIRE CONNECTION INSPECTOR VIEW
  if (!component && selectedWire) {
    const fromComp = components?.find((c) => c.id === selectedWire.fromCompId);
    const toComp = components?.find((c) => c.id === selectedWire.toCompId);
    const fromPin = fromComp?.pins.find((p) => p.id === selectedWire.fromPinId);
    const toPin = toComp?.pins.find((p) => p.id === selectedWire.toPinId);

    const wireColors = [
      { name: 'Red (+5V / VCC)', hex: '#EF4444' },
      { name: 'Black (GND / 0V)', hex: '#1E293B' },
      { name: 'Blue (Signal / Net)', hex: '#3B82F6' },
      { name: 'Green (Data)', hex: '#10B981' },
      { name: 'Yellow (Clock / PWM)', hex: '#F59E0B' },
      { name: 'Orange (Analog)', hex: '#F97316' },
      { name: 'Purple (Digital)', hex: '#A855F7' },
      { name: 'White (Neutral)', hex: '#F8FAFC' },
    ];

    const currentAmps = wireCurrent ?? 0;
    const currentMa = Math.abs(currentAmps) * 1000;

    return (
      <aside
        style={{ width: `${width}px` }}
        className="bg-[#0B1528] border-l border-slate-800 flex flex-col h-full text-slate-200 text-xs select-none relative shrink-0 overflow-y-auto"
      >
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            isResizingRef.current = true;
          }}
          className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-sky-500/60 active:bg-sky-500 transition-colors z-30"
          title="Drag to resize inspector"
        />

        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Cable className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Wire Connection</h3>
              <span className="text-[10px] text-slate-400 font-mono">Net ID: {selectedWire.id}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
            title="Collapse Inspector (I)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5 flex-1">
          {/* Terminals Connection Card */}
          <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-3 font-mono">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Connected Terminals</span>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500">From Source</span>
                <strong className="text-emerald-400">{fromComp?.label || selectedWire.fromCompId}</strong>
                <span className="text-[11px] text-slate-300">Pin: {fromPin?.name || selectedWire.fromPinId}</span>
              </div>
              <span className="text-slate-600 text-base">➔</span>
              <div className="flex flex-col text-right">
                <span className="text-[10px] text-slate-500">To Destination</span>
                <strong className="text-sky-400">{toComp?.label || selectedWire.toCompId}</strong>
                <span className="text-[11px] text-slate-300">Pin: {toPin?.name || selectedWire.toPinId}</span>
              </div>
            </div>
          </div>

          {/* Real-time Wire Telemetry */}
          <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-2 font-mono">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Net Telemetry</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Conduction Current</span>
                <span className="text-amber-400 font-bold text-sm">
                  {currentMa < 1 && currentMa > 0.001 ? `${(currentMa * 1000).toFixed(1)} µA` : `${currentMa.toFixed(3)} mA`}
                </span>
              </div>
              <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Current Direction</span>
                <span className={`font-bold text-sm ${currentAmps >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {Math.abs(currentAmps) < 0.000001 ? 'Idle (0 A)' : currentAmps >= 0 ? 'Forward (➔)' : 'Reverse (⬅)'}
                </span>
              </div>
            </div>
          </div>

          {/* Wire Color Chooser */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Wire Insulation Color</span>
              <span className="font-mono text-[10px] text-slate-400">{selectedWire.color || '#10B981'}</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {wireColors.map((col) => (
                <button
                  key={col.hex}
                  type="button"
                  onClick={() => onUpdateWire?.({ ...selectedWire, color: col.hex })}
                  className={`h-7 rounded border flex items-center justify-center transition-all cursor-pointer ${
                    (selectedWire.color || '#10B981') === col.hex ? 'border-white ring-2 ring-white/50 scale-105' : 'border-slate-700 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: col.hex }}
                  title={col.name}
                >
                  {(selectedWire.color || '#10B981') === col.hex && <Check className="w-3.5 h-3.5 text-white drop-shadow stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Operations: Delete and Disconnect */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Wire Actions</span>

            {/* Disconnect and Reconnect Button */}
            {onDisconnectWire && (
              <button
                type="button"
                onClick={() => onDisconnectWire(selectedWire.id)}
                className="w-full py-2 px-3 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-600/60 text-sky-200 font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5 text-sky-400" />
                <span>Disconnect &amp; Re-route End</span>
              </button>
            )}

            {/* Delete Wire Button */}
            {onDeleteWire && (
              <button
                type="button"
                onClick={() => onDeleteWire(selectedWire.id)}
                className="w-full py-2 px-3 rounded-lg bg-rose-950/90 hover:bg-rose-900 border border-rose-600/80 text-rose-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Delete Wire [Delete Key]</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    );
  }

  if (!component) {
    return (
      <aside
        style={{ width: `${width}px` }}
        className="bg-[#0B1528] border-l border-slate-800 flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs select-none relative shrink-0"
      >
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            isResizingRef.current = true;
          }}
          className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-sky-500/60 active:bg-sky-500 transition-colors z-30"
          title="Drag to resize inspector"
        />
        <div className="absolute top-3 right-3">
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
            title="Collapse Inspector (I)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
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
    <aside
      style={{ width: `${width}px` }}
      className="bg-[#0B1528] border-l border-slate-800 flex flex-col h-full z-20 select-none shadow-2xl text-slate-200 relative shrink-0 transition-[width] duration-75"
    >
      {/* Draggable Resize Handle on Left Edge */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          isResizingRef.current = true;
        }}
        className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-sky-500/60 active:bg-sky-500 transition-colors z-30"
        title="Drag to resize inspector"
      />
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

              {type === 'POTENTIOMETER' && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-semibold uppercase font-mono">Wiper Division (Terminal A ↔ B)</span>
                    <span className="font-mono text-cyan-400 font-bold">
                      {Math.round(Number(parameters.wiperPosition ?? 0.5) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={Number(parameters.wiperPosition ?? 0.5)}
                    onChange={(e) => updateParameter('wiperPosition', parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>Pin 1 (A: 0%)</span>
                    <span>Wiper (Mid)</span>
                    <span>Pin 3 (B: 100%)</span>
                  </div>
                </div>
              )}
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
                    <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold">Preset Color</label>
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
                      <option value="Cyan">Cyan (505nm)</option>
                      <option value="Purple">Purple (405nm)</option>
                    </select>
                  </div>
                )}
              </div>

              {type === 'LED' && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-semibold flex items-center justify-between">
                    <span>RGB & Custom HEX Color</span>
                    <span className="text-cyan-400 font-mono text-[11px] font-bold">
                      {String(parameters.color ?? 'Red').startsWith('#') ? parameters.color : `${parameters.color} LED`}
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={
                        String(parameters.color ?? '#EF4444').startsWith('#')
                          ? String(parameters.color)
                          : String(parameters.color ?? '').toLowerCase().includes('green')
                          ? '#10B981'
                          : String(parameters.color ?? '').toLowerCase().includes('blue')
                          ? '#3B82F6'
                          : String(parameters.color ?? '').toLowerCase().includes('amber')
                          ? '#F59E0B'
                          : String(parameters.color ?? '').toLowerCase().includes('white')
                          ? '#F8FAFC'
                          : String(parameters.color ?? '').toLowerCase().includes('cyan')
                          ? '#06B6D4'
                          : String(parameters.color ?? '').toLowerCase().includes('purple')
                          ? '#A855F7'
                          : '#EF4444'
                      }
                      onChange={(e) => updateParameter('color', e.target.value, `Custom ${e.target.value}`)}
                      className="w-9 h-8 bg-slate-950 border border-slate-700 rounded cursor-pointer p-0.5 shrink-0"
                      title="Pick Custom RGB Color"
                    />
                    <input
                      type="text"
                      placeholder="#RRGGBB"
                      value={String(parameters.color ?? 'Red')}
                      onChange={(e) => updateParameter('color', e.target.value, `LED ${e.target.value}`)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500 uppercase"
                    />
                  </div>
                  {/* Preset Quick Chips */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {[
                      { name: 'Red', hex: '#EF4444' },
                      { name: 'Green', hex: '#10B981' },
                      { name: 'Blue', hex: '#3B82F6' },
                      { name: 'Amber', hex: '#F59E0B' },
                      { name: 'White', hex: '#F8FAFC' },
                      { name: 'Cyan', hex: '#06B6D4' },
                      { name: 'Purple', hex: '#A855F7' },
                    ].map((chip) => (
                      <button
                        key={chip.name}
                        type="button"
                        onClick={() => updateParameter('color', chip.hex, `${chip.name} LED`)}
                        className="w-5 h-5 rounded-full border border-slate-600 hover:scale-125 transition-transform"
                        style={{ backgroundColor: chip.hex }}
                        title={`Select ${chip.name} (${chip.hex})`}
                      />
                    ))}
                  </div>
                </div>
              )}
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

          {/* INDUCTOR */}
          {type === 'INDUCTOR' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold uppercase font-mono">Inductance</span>
                  <span className="font-mono text-cyan-400 font-bold">{component.value}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    value={
                      Number(parameters.inductance ?? 0.01) >= 1
                        ? Number(parameters.inductance ?? 0.01)
                        : Number(parameters.inductance ?? 0.01) >= 0.001
                        ? Number(parameters.inductance ?? 0.01) * 1000
                        : Number(parameters.inductance ?? 0.01) * 1000000
                    }
                    onChange={(e) => {
                      const raw = parseFloat(e.target.value);
                      if (isNaN(raw) || raw <= 0) return;
                      const isUh = component.value.includes('µ') || component.value.includes('u');
                      const isMh = component.value.includes('m') || (!component.value.includes('µ') && !component.value.includes('H'));
                      const mult = isUh ? 1e-6 : isMh ? 1e-3 : 1;
                      const unitStr = isUh ? 'µH' : isMh ? 'mH' : 'H';
                      updateParameter('inductance', raw * mult, `${raw}${unitStr}`);
                    }}
                    className="col-span-2 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                  <select
                    value={
                      component.value.includes('µ') || component.value.includes('u')
                        ? 'uH'
                        : component.value.endsWith('H') && !component.value.includes('m')
                        ? 'H'
                        : 'mH'
                    }
                    onChange={(e) => {
                      const cur = Number(parameters.inductance ?? 0.01);
                      let base = cur * 1000;
                      if (e.target.value === 'uH') base = cur * 1e6;
                      else if (e.target.value === 'H') base = cur;
                      const mult = e.target.value === 'uH' ? 1e-6 : e.target.value === 'H' ? 1 : 1e-3;
                      const raw = parseFloat(base.toFixed(1));
                      const unitStr = e.target.value === 'uH' ? 'µH' : e.target.value;
                      updateParameter('inductance', raw * mult, `${raw}${unitStr}`);
                    }}
                    className="col-span-1 bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="uH">µH</option>
                    <option value="mH">mH</option>
                    <option value="H">H</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* SWITCHES & BUTTONS */}
          {(type.startsWith('SWITCH_') || type.startsWith('PUSHBUTTON_') || type === 'EMERGENCY_STOP') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-semibold uppercase font-mono">Contact State</span>
                <span className={`font-mono font-bold ${
                  type === 'PUSHBUTTON_NO'
                    ? (parameters.closed ? 'text-emerald-400' : 'text-amber-400')
                    : (parameters.closed !== false ? 'text-emerald-400' : 'text-amber-400')
                }`}>
                  {type === 'PUSHBUTTON_NO'
                    ? (parameters.closed ? 'PRESSED (Conducting)' : 'RELEASED (Open NO)')
                    : (parameters.closed !== false ? 'CLOSED (Conducting)' : 'OPEN (Interrupted)')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextState = type === 'PUSHBUTTON_NO' ? !parameters.closed : !(parameters.closed !== false);
                  updateParameter('closed', nextState, nextState ? 'Closed' : 'Open');
                }}
                className={`w-full py-2 px-3 rounded font-mono text-xs font-bold transition-all border ${
                  (type === 'PUSHBUTTON_NO' ? parameters.closed : parameters.closed !== false)
                    ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 hover:bg-emerald-900/80'
                    : 'bg-amber-950/60 border-amber-600 text-amber-300 hover:bg-amber-900/80'
                }`}
              >
                {type === 'PUSHBUTTON_NO'
                  ? (parameters.closed ? 'Button is PRESSED (Click to Release)' : 'Button is RELEASED (Click to Press)')
                  : type === 'EMERGENCY_STOP'
                  ? (parameters.closed !== false ? 'ESTOP Armed (Click to Trigger Emergency Stop)' : 'ESTOP TRIGGERED (Click to Twist Reset)')
                  : (parameters.closed !== false ? 'Contact CLOSED (Click to Open)' : 'Contact OPEN (Click to Close)')}
              </button>
            </div>
          )}

          {/* CIRCUIT BREAKERS & PROTECTION */}
          {type.startsWith('PROTECTION_') && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold uppercase font-mono">Rated Breaker Current</span>
                  <span className="font-mono text-cyan-400 font-bold">{Number(parameters.ratedCurrentA ?? 16)} A</span>
                </div>
                <select
                  value={Number(parameters.ratedCurrentA ?? 16)}
                  onChange={(e) => updateParameter('ratedCurrentA', Number(e.target.value), `${e.target.value}A`)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs"
                >
                  <option value={6}>6 A (Lighting / Low-Power)</option>
                  <option value={10}>10 A (General Control)</option>
                  <option value={16}>16 A (Standard Branch)</option>
                  <option value={25}>25 A (Small Motors)</option>
                  <option value={32}>32 A (Main Feed / 3-Phase)</option>
                  <option value={63}>63 A (Distribution Panel)</option>
                  <option value={100}>100 A (Main MCCB Incomer)</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-semibold uppercase font-mono">Breaker Mechanism</span>
                <span className={`font-mono font-bold ${parameters.tripped ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {parameters.tripped ? 'TRIPPED (Fault)' : 'ENGAGED (Armed)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => updateParameter('tripped', !parameters.tripped, parameters.tripped ? 'Normal' : 'Tripped')}
                className={`w-full py-2 px-3 rounded font-mono text-xs font-bold transition-all border ${
                  parameters.tripped
                    ? 'bg-rose-950/80 border-rose-600 text-rose-300 hover:bg-rose-900'
                    : 'bg-emerald-950/60 border-emerald-600 text-emerald-300 hover:bg-emerald-900/80'
                }`}
              >
                {parameters.tripped ? 'Breaker Tripped (Click to Reset Lever)' : 'Breaker Normal (Click to Test Trip)'}
              </button>
            </div>
          )}

          {/* VFD DRIVE */}
          {type === 'VFD_DRIVE' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold uppercase font-mono">Output Frequency</span>
                  <span className="font-mono text-cyan-400 font-bold">{Number(parameters.targetFreqHz ?? 50.0).toFixed(1)} Hz</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="0.5"
                  value={Number(parameters.targetFreqHz ?? 50.0)}
                  onChange={(e) => updateParameter('targetFreqHz', parseFloat(e.target.value), `${e.target.value} Hz`)}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold uppercase font-mono">Estimated Motor Speed</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {Math.round((Number(parameters.targetFreqHz ?? 50.0) / 50.0) * 1440)} RPM
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* BJT TRANSISTOR */}
          {(type === 'BJT_NPN' || type === 'TRANSISTOR_BJT_NPN') && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold uppercase font-mono">Current Gain (β / hFE)</span>
                  <span className="font-mono text-cyan-400 font-bold">{Number(parameters.beta ?? 100)}</span>
                </div>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={Number(parameters.beta ?? 100)}
                  onChange={(e) => updateParameter('beta', Math.max(10, parseInt(e.target.value) || 100))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          {/* VOLTAGE REGULATORS */}
          {type.startsWith('REGULATOR_') && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold uppercase font-mono">Regulated VOUT</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {Number(parameters.vOut ?? (type.includes('7805') ? 5.0 : type.includes('7812') ? 12.0 : 3.3)).toFixed(1)} V
                  </span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={Number(parameters.vOut ?? (type.includes('7805') ? 5.0 : type.includes('7812') ? 12.0 : 3.3))}
                  onChange={(e) => updateParameter('vOut', parseFloat(e.target.value) || 5.0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          {/* RELAY ACTUATOR & INDUSTRIAL RELAY */}
          {(type.includes('RELAY') || type.includes('CONTACTOR')) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-semibold uppercase font-mono">Coil Excitation</span>
                <span className={`font-mono font-bold ${parameters.energized ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {parameters.energized ? 'ENERGIZED (Active)' : 'DE-ENERGIZED (Relaxed)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => updateParameter('energized', !parameters.energized)}
                className={`w-full py-2 px-3 rounded font-mono text-xs font-bold transition-all border ${
                  parameters.energized
                    ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {parameters.energized ? 'Coil Active (Click to De-energize)' : 'Coil Relaxed (Click to Energize)'}
              </button>
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

        {onDuplicateComponent && (
          <button
            onClick={() => onDuplicateComponent(component.id)}
            className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center gap-1.5 font-medium transition-colors text-xs"
            title="Duplicate component (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            <span>Duplicate</span>
          </button>
        )}

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
