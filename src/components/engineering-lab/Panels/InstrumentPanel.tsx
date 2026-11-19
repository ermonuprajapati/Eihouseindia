'use client';

import React, { useState } from 'react';
import {
  SimulationWaveformPoint,
  VirtualInstrumentState,
  CircuitComponent,
  CircuitWire,
} from '@/modules/engineering-lab/types';
import {
  Activity,
  Gauge,
  Radio,
  Binary,
  Play,
  Pause,
} from 'lucide-react';
import { Oscilloscope4CH } from './VirtualInstruments/Oscilloscope4CH';
import { DigitalMultimeter65 } from './VirtualInstruments/DigitalMultimeter65';
import { DdsFunctionGenerator } from './VirtualInstruments/DdsFunctionGenerator';
import { DigitalLogicAnalyzer16 } from './VirtualInstruments/DigitalLogicAnalyzer16';

export interface InstrumentPanelProps {
  instruments: VirtualInstrumentState;
  onUpdateInstruments: (updated: VirtualInstrumentState) => void;
  waveformData: Record<string, SimulationWaveformPoint[]>;
  isSimulating: boolean;
  components?: CircuitComponent[];
  wires?: CircuitWire[];
  simStates?: Record<string, { voltage: number; current: number; on?: boolean }>;
  wireCurrents?: Record<string, number>;
  onToggleSimulation?: () => void;
}

export function InstrumentPanel({
  instruments,
  onUpdateInstruments,
  waveformData,
  isSimulating,
  components = [],
  wires = [],
  simStates = {},
  wireCurrents = {},
  onToggleSimulation,
}: InstrumentPanelProps) {
  const [activeTab, setActiveTab] = useState<'scope' | 'multimeter' | 'funcgen' | 'logic'>('scope');

  return (
    <div className="flex-1 flex flex-col bg-[#070D18] text-slate-200 select-none overflow-hidden h-full">
      {/* Benchtop Chassis Sub-Navigation Bar */}
      <div className="h-11 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between px-4 shrink-0 shadow-lg backdrop-blur">
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <button
            onClick={() => setActiveTab('scope')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold cursor-pointer transition-all ${
              activeTab === 'scope'
                ? 'bg-amber-500/20 text-yellow-300 border border-yellow-500/60 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-yellow-400" />
            <span>4-CH Storage Oscilloscope (DSO)</span>
          </button>

          <button
            onClick={() => setActiveTab('multimeter')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold cursor-pointer transition-all ${
              activeTab === 'multimeter'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/60 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            <span>6.5-Digit True-RMS Multimeter</span>
          </button>

          <button
            onClick={() => setActiveTab('funcgen')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold cursor-pointer transition-all ${
              activeTab === 'funcgen'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/60 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-purple-400" />
            <span>Dual DDS Function Gen (AWG)</span>
          </button>

          <button
            onClick={() => setActiveTab('logic')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold cursor-pointer transition-all ${
              activeTab === 'logic'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Binary className="w-3.5 h-3.5 text-cyan-400" />
            <span>16-CH Logic Analyzer</span>
          </button>
        </div>

        {/* Global Simulation & Virtual Rack Live Indicator */}
        <div className="flex items-center gap-3 text-xs font-mono">
          {onToggleSimulation && (
            <button
              onClick={onToggleSimulation}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold cursor-pointer transition-all shadow-md ${
                isSimulating
                  ? 'bg-emerald-950 border border-emerald-500 text-emerald-300 hover:bg-emerald-900'
                  : 'bg-rose-950 border border-rose-500 text-rose-300 hover:bg-rose-900 animate-pulse'
              }`}
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isSimulating ? 'SIM ACTIVE (30 FPS)' : 'SIM PAUSED'}</span>
            </button>
          )}

          <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>MNA Solver Bench Online</span>
          </div>
        </div>
      </div>

      {/* Active Instrument Main Workspace */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {activeTab === 'scope' && (
          <Oscilloscope4CH
            instruments={instruments}
            onUpdateInstruments={onUpdateInstruments}
            waveformData={waveformData}
            isSimulating={isSimulating}
            components={components}
            wires={wires}
          />
        )}

        {activeTab === 'multimeter' && (
          <DigitalMultimeter65
            instruments={instruments}
            onUpdateInstruments={onUpdateInstruments}
            components={components}
            wires={wires}
            simStates={simStates}
            wireCurrents={wireCurrents}
            waveformData={waveformData}
          />
        )}

        {activeTab === 'funcgen' && (
          <DdsFunctionGenerator
            instruments={instruments}
            onUpdateInstruments={onUpdateInstruments}
            components={components}
            wires={wires}
          />
        )}

        {activeTab === 'logic' && (
          <DigitalLogicAnalyzer16
            instruments={instruments}
            onUpdateInstruments={onUpdateInstruments}
            components={components}
            wires={wires}
            waveformData={waveformData}
            isSimulating={isSimulating}
          />
        )}
      </div>
    </div>
  );
}

// Re-export alias for VirtualInstrumentsPanel
export { InstrumentPanel as VirtualInstrumentsPanel };
