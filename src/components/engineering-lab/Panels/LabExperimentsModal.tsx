'use client';

import React, { useState } from 'react';
import { GuidedExperiment } from '@/modules/engineering-lab/types';
import { GUIDED_EXPERIMENTS } from '@/modules/engineering-lab/templates/starter-templates';
import { BookOpen, X, CheckCircle2, ArrowRight, Target } from 'lucide-react';

interface LabExperimentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadExperiment: (exp: GuidedExperiment) => void;
}

export function LabExperimentsModal({ isOpen, onClose, onLoadExperiment }: LabExperimentsModalProps) {
  const [selectedExp, setSelectedExp] = useState<GuidedExperiment>(GUIDED_EXPERIMENTS[0]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#0B1528] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Guided Engineering Experiments</h2>
              <p className="text-[11px] text-slate-400">Hands-on interactive lab curricula for electronics, physics & firmware</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Left List + Right Details */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Experiment List */}
          <div className="w-full md:w-80 border-r border-slate-800 p-3 space-y-2 overflow-y-auto bg-slate-950/40">
            {GUIDED_EXPERIMENTS.map((exp) => (
              <div
                key={exp.id}
                onClick={() => setSelectedExp(exp)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedExp.id === exp.id
                    ? 'bg-slate-800 border-emerald-500 text-white shadow-lg'
                    : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                  <span className="text-emerald-400 uppercase font-semibold">{exp.category}</span>
                  <span className="bg-slate-950 px-1.5 py-0.5 rounded text-slate-400">{exp.difficulty}</span>
                </div>
                <div className="text-xs font-bold">{exp.title}</div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{exp.description}</p>
              </div>
            ))}
          </div>

          {/* Experiment Details & Steps */}
          <div className="flex-1 p-5 overflow-y-auto space-y-5 bg-[#070D18]">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-semibold uppercase mb-1">
                <Target className="w-4 h-4" />
                Curriculum Overview
              </div>
              <h3 className="text-lg font-bold text-white">{selectedExp.title}</h3>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{selectedExp.description}</p>
            </div>

            {/* Learning Objectives */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <h4 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider">
                Learning Objectives
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {selectedExp.learningObjectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Guided Step Walkthrough */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider">
                Laboratory Procedure Steps
              </h4>
              {selectedExp.guidedSteps.map((step, idx) => (
                <div key={idx} className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 space-y-1.5">
                  <div className="font-semibold text-xs text-emerald-400">{step.title}</div>
                  <p className="text-xs text-slate-300 leading-relaxed">{step.instruction}</p>
                  <div className="text-[11px] font-mono text-cyan-300 bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[9px] uppercase">Target Reading:</span>
                    {step.expectedMeasurement}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Selected: <span className="font-semibold text-slate-200">{selectedExp.title}</span>
          </div>
          <button
            onClick={() => {
              onLoadExperiment(selectedExp);
              onClose();
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg transition-all"
          >
            <span>Load Experiment Circuit</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
