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
}: InstrumentPanelProps) {
  const [activeTab, setActiveTab] = useState<'scope' | 'multimeter' | 'funcgen' | 'logic'>('scope');

  return (
    <div className="flex-1 flex flex-col bg-[#070D18] text-slate-200 select-none overflow-hidden h-full">
      {/* Benchtop Chassis Sub-Navigation Bar */}
      <div className="h-11 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between px-3 sm:px-4 shrink-0 shadow-lg backdrop-blur overflow-x-auto min-w-0 max-w-full">
        <div className="flex items-center gap-1.5 text-xs font-mono min-w-0 shrink-0">
          <button
            onClick={() => setActiveTab('scope')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg flex items-center gap-1.5 sm:gap-2 font-bold cursor-pointer transition-all shrink-0 ${
              activeTab === 'scope'
                ? 'bg-amber-500/20 text-yellow-300 border border-yellow-500/60 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-yellow-400" />
            <span className="hidden xl:inline">4-CH Storage Oscilloscope (DSO)</span>
            <span className="xl:hidden">Oscilloscope</span>
          </button>

          <button
            onClick={() => setActiveTab('multimeter')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg flex items-center gap-1.5 sm:gap-2 font-bold cursor-pointer transition-all shrink-0 ${
              activeTab === 'multimeter'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/60 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xl:inline">6.5-Digit True-RMS Multimeter</span>
            <span className="xl:hidden">Multimeter</span>
          </button>

          <button
            onClick={() => setActiveTab('funcgen')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg flex items-center gap-1.5 sm:gap-2 font-bold cursor-pointer transition-all shrink-0 ${
              activeTab === 'funcgen'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/60 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden xl:inline">Dual DDS Function Gen (AWG)</span>
            <span className="xl:hidden">Function Gen</span>
          </button>

          <button
            onClick={() => setActiveTab('logic')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg flex items-center gap-1.5 sm:gap-2 font-bold cursor-pointer transition-all shrink-0 ${
              activeTab === 'logic'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Binary className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xl:inline">16-CH Logic Analyzer</span>
            <span className="xl:hidden">Logic Analyzer</span>
          </button>
        </div>

        {/* Global Simulation & Virtual Rack Live Indicator */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono shrink-0 pl-2">
          {/* Clean Read-Only Engine Status Badge (Navbar controls Sim Run/Stop) */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ${
              isSimulating
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSimulating ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-500'
              }`}
            />
            <span>{isSimulating ? 'ENGINE RUNNING (60 FPS)' : 'ENGINE PAUSED'}</span>
          </div>

          <div className="text-[11px] font-mono text-cyan-400 flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
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
