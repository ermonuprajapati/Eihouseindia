'use client';

import React from 'react';
import { ErcViolation } from '@/modules/engineering-lab/circuit-engine/schematic-erc';
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  Crosshair,
  Sparkles,
  X,
  FileCheck2,
} from 'lucide-react';

interface ErcReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  violations: ErcViolation[];
  onLocateViolation: (targetLocation?: { x: number; y: number }, compId?: string) => void;
  onAutoAnnotate?: () => void;
}

export function ErcReportModal({
  isOpen,
  onClose,
  violations,
  onLocateViolation,
  onAutoAnnotate,
}: ErcReportModalProps) {
  if (!isOpen) return null;

  const errors = violations.filter((v) => v.severity === 'error');
  const warnings = violations.filter((v) => v.severity === 'warning');
  const infos = violations.filter((v) => v.severity === 'info');

  const hasDuplicateDesignators = violations.some((v) => v.code === 'ERR_DUPLICATE_DESIGNATOR');

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B1528] border border-slate-700/90 rounded-2xl max-w-2xl w-full font-mono text-xs text-slate-200 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Electrical Rules Check (ERC)
                <span className="text-[10px] text-slate-400 font-normal">
                  — EDA Standard Diagnostic Report
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Automated schematic verification for shorts, floating pins, and designator collisions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Close ERC Report"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Severity Metrics Bar */}
        <div className="grid grid-cols-3 gap-2 px-5 py-3 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-950/40 border border-rose-900/50">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            <div>
              <span className="text-[10px] text-rose-300 block font-bold">ERRORS</span>
              <span className="text-base font-bold text-rose-200">{errors.length}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-950/40 border border-amber-900/50">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-[10px] text-amber-300 block font-bold">WARNINGS</span>
              <span className="text-base font-bold text-amber-200">{warnings.length}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-sky-950/40 border border-sky-900/50">
            <Info className="w-4 h-4 text-sky-400" />
            <div>
              <span className="text-[10px] text-sky-300 block font-bold">ADVISORIES</span>
              <span className="text-base font-bold text-sky-200">{infos.length}</span>
            </div>
          </div>
        </div>

        {/* Quick-Fix Action Banner */}
        {hasDuplicateDesignators && onAutoAnnotate && (
          <div className="px-5 py-2.5 bg-purple-950/50 border-b border-purple-800/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-purple-200 text-[11px]">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Duplicate designators detected. Auto-Annotate can re-sequence all components cleanly.</span>
            </div>
            <button
              onClick={() => {
                onAutoAnnotate();
                onClose();
              }}
              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[11px] font-bold transition-colors shrink-0 flex items-center gap-1 shadow"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Auto-Annotate Now
            </button>
          </div>
        )}

        {/* Violation Items Scrollable List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {violations.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-bold text-emerald-300">0 Electrical Rule Violations Found</h3>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                All component terminals are safely terminated, power nets are properly isolated, and reference designators are compliant with EDA standards.
              </p>
            </div>
          ) : (
            violations.map((v) => {
              const isErr = v.severity === 'error';
              const isWarn = v.severity === 'warning';
              const cardBg = isErr
                ? 'bg-rose-950/20 border-rose-800/60'
                : isWarn
                ? 'bg-amber-950/20 border-amber-800/60'
                : 'bg-slate-900/40 border-slate-800';

              return (
                <div
                  key={v.id}
                  className={`p-3 rounded-xl border ${cardBg} flex items-start justify-between gap-3 transition-colors`}
                >
                  <div className="flex items-start gap-2.5">
                    {isErr ? (
                      <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    ) : isWarn ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold text-xs text-slate-100 flex items-center gap-2">
                        <span>{v.title}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-bold ${
                            isErr
                              ? 'bg-rose-900/60 text-rose-300 border border-rose-700/60'
                              : isWarn
                              ? 'bg-amber-900/60 text-amber-300 border border-amber-700/60'
                              : 'bg-sky-900/60 text-sky-300 border border-sky-700/60'
                          }`}
                        >
                          {v.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{v.message}</p>
                    </div>
                  </div>

                  {v.targetLocation && (
                    <button
                      onClick={() => {
                        onLocateViolation(v.targetLocation, v.compIds?.[0]);
                        onClose();
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white rounded border border-slate-700 text-[10px] font-semibold flex items-center gap-1 transition-colors shrink-0"
                      title="Center and highlight this node on the schematic canvas"
                    >
                      <Crosshair className="w-3 h-3 text-cyan-400" />
                      Locate
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-mono">
            {violations.length} total diagnostic checks reported
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
