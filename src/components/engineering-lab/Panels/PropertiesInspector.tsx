'use client';

import React from 'react';
import { CircuitComponent } from '@/modules/engineering-lab/types';
import { Sliders, RotateCw, Trash2, Zap, X } from 'lucide-react';

interface PropertiesInspectorProps {
  component: CircuitComponent | null;
  onUpdateComponent: (updated: CircuitComponent) => void;
  onRotateComponent: (id: string) => void;
  onDeleteComponent: (id: string) => void;
  onClose: () => void;
  simState?: { voltage: number; current: number; on?: boolean };
}

export function PropertiesInspector({
  component,
  onUpdateComponent,
  onRotateComponent,
  onDeleteComponent,
  onClose,
  simState,
}: PropertiesInspectorProps) {
  if (!component) {
    return (
      <aside className="w-64 bg-[#0B1528] border-l border-slate-800 flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs select-none">
        <Sliders className="w-8 h-8 text-slate-700 mb-2 stroke-1" />
        <p className="font-medium text-slate-400">No Item Selected</p>
        <p className="text-[11px] text-slate-600 mt-1">
          Click any component on the canvas to inspect and edit its physical parameters.
        </p>
      </aside>
    );
  }

  const handleValueChange = (val: string) => {
    // Parse numeric prefix
    let numVal = parseFloat(val);
    if (val.toLowerCase().includes('k')) numVal *= 1000;
    if (val.toLowerCase().includes('m')) numVal *= 1000000;
    if (val.toLowerCase().includes('u') || val.includes('µ')) numVal /= 1000000;
    if (val.toLowerCase().includes('n')) numVal /= 1000000000;

    const updatedParams = { ...component.parameters };
    if (component.type === 'RESISTOR' || component.type === 'POTENTIOMETER') {
      updatedParams.resistance = isNaN(numVal) ? 1000 : numVal;
    } else if (component.type === 'CAPACITOR') {
      updatedParams.capacitance = isNaN(numVal) ? 0.00001 : numVal;
    } else if (component.type === 'DC_VOLTAGE' || component.type === 'BATTERY') {
      updatedParams.voltage = isNaN(numVal) ? 5.0 : numVal;
    }

    onUpdateComponent({
      ...component,
      value: val,
      parameters: updatedParams,
    });
  };

  const powerMw = simState ? Math.abs(simState.voltage * simState.current * 1000) : 0;

  return (
    <aside className="w-72 bg-[#0B1528] border-l border-slate-800 flex flex-col h-full z-20 select-none shadow-2xl">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <h3 className="font-semibold text-xs tracking-wide text-slate-100 uppercase font-mono">Properties</h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-800">
        {/* Component Title & Type */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-mono text-slate-500 font-semibold">Component Label</label>
          <input
            type="text"
            value={component.label}
            onChange={(e) => onUpdateComponent({ ...component, label: e.target.value })}
            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>

        {/* Electrical Nominal Value */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-mono text-slate-500 font-semibold">Nominal Value</label>
          <input
            type="text"
            value={component.value}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="e.g. 10k, 100u, 5V"
            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Live Electrical Telemetry */}
        {simState && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] font-semibold">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Real-Time Telemetry</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                <div className="text-slate-500 text-[9px]">VOLTAGE DROP</div>
                <div className="text-cyan-400 font-bold text-sm mt-0.5">{simState.voltage.toFixed(3)} V</div>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                <div className="text-slate-500 text-[9px]">BRANCH CURRENT</div>
                <div className="text-amber-400 font-bold text-sm mt-0.5">{(simState.current * 1000).toFixed(2)} mA</div>
              </div>
            </div>
            <div className="bg-slate-950 p-2 rounded border border-slate-800/80 text-[11px] font-mono flex items-center justify-between">
              <span className="text-slate-500 text-[9px]">DISSIPATED POWER</span>
              <span className="text-purple-400 font-bold">{powerMw.toFixed(2)} mW</span>
            </div>
          </div>
        )}

        {/* Footprint & Package */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-mono text-slate-500 font-semibold">PCB Footprint Package</label>
          <input
            type="text"
            value={component.footprint}
            onChange={(e) => onUpdateComponent({ ...component, footprint: e.target.value })}
            className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 font-mono text-[11px]"
          />
        </div>

        {/* Pinout Details */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-mono text-slate-500 font-semibold">Pinout Connections ({component.pins.length})</label>
          <div className="bg-slate-900 border border-slate-800 rounded divide-y divide-slate-800/60 font-mono text-[10px]">
            {component.pins.map((pin) => (
              <div key={pin.id} className="p-2 flex items-center justify-between text-slate-300">
                <span>{pin.name}</span>
                <span className="text-slate-500 uppercase text-[9px] bg-slate-950 px-1.5 py-0.5 rounded">
                  {pin.pinType}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/50 flex items-center gap-2">
        <button
          onClick={() => onRotateComponent(component.id)}
          className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center gap-1.5 font-medium transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Rotate 90°
        </button>
        <button
          onClick={() => onDeleteComponent(component.id)}
          className="py-1.5 px-3 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded border border-rose-800/50 transition-colors"
          title="Delete Component"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
