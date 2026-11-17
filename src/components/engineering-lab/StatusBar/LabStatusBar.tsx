'use client';

import React from 'react';
import { Clock, Cpu, CheckCircle } from 'lucide-react';

interface LabStatusBarProps {
  isSimulating: boolean;
  simTime: number;
  compCount: number;
  wireCount: number;
  selectedCompLabel?: string | null;
}

export function LabStatusBar({
  isSimulating,
  simTime,
  compCount,
  wireCount,
  selectedCompLabel,
}: LabStatusBarProps) {
  return (
    <footer className="h-7 bg-[#070D18] text-slate-400 border-t border-slate-800/80 flex items-center justify-between px-3 text-[11px] font-mono select-none z-30">
      {/* Left Status Indicators */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isSimulating ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34D399]' : 'bg-slate-600'
            }`}
          />
          <span className={isSimulating ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
            {isSimulating ? 'SIMULATION SOLVING' : 'SIMULATION IDLE'}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-slate-400">
          <Clock className="w-3 h-3 text-slate-500" />
          <span>Sim Time: {(simTime).toFixed(3)}s</span>
        </div>

        <div className="hidden md:flex items-center gap-1 text-slate-400">
          <Cpu className="w-3 h-3 text-slate-500" />
          <span>Components: {compCount} | Wires: {wireCount}</span>
        </div>
      </div>

      {/* Center Selection Indicator */}
      <div className="hidden lg:block text-slate-400">
        {selectedCompLabel ? (
          <span>Selected: <strong className="text-slate-200">{selectedCompLabel}</strong></span>
        ) : (
          <span className="text-slate-600">No selection</span>
        )}
      </div>

      {/* Right Shortcuts & Performance info */}
      <div className="flex items-center gap-4 text-slate-500">
        <div className="hidden xl:flex items-center gap-3">
          <span><kbd className="bg-slate-900 border border-slate-800 px-1 py-0.5 rounded text-[10px] text-slate-300">R</kbd> Rotate</span>
          <span><kbd className="bg-slate-900 border border-slate-800 px-1 py-0.5 rounded text-[10px] text-slate-300">Del</kbd> Delete</span>
          <span><kbd className="bg-slate-900 border border-slate-800 px-1 py-0.5 rounded text-[10px] text-slate-300">Space</kbd> Run/Stop</span>
        </div>

        <div className="flex items-center gap-1 text-emerald-400/80">
          <CheckCircle className="w-3 h-3" />
          <span>Engine: MNA 60 FPS</span>
        </div>
      </div>
    </footer>
  );
}
