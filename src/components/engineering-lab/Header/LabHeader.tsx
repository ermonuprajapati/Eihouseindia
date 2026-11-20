'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Cpu,
  Play,
  Square,
  RotateCcw,
  RotateCw,
  FolderOpen,
  Save,
  Download,
  BookOpen,
  Layers,
  Code2,
  Activity,
  Box,
  FileCode,
  FilePlus,
  RefreshCw,
  ArrowLeft,
  ChevronDown,
  Calculator,
  Sliders,
  LayoutGrid,
  Globe,
  Share2,
} from 'lucide-react';
import { WorkspaceMode } from '@/modules/engineering-lab/types';

interface LabHeaderProps {
  projectTitle: string;
  onTitleChange: (title: string) => void;
  activeMode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onResetSimulation: () => void;
  onNewProject: () => void;
  onSaveProject: () => void;
  onLoadProject: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportProject: (format: 'json' | 'gerber' | 'bom' | 'firmware') => void;
  onOpenExperiments: () => void;
  onOpenCommunityProjects?: () => void;
  onOpenShareModal?: () => void;
  hasUnsavedChanges: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isBrowserOpen?: boolean;
  onToggleBrowser?: () => void;
  isInspectorOpen?: boolean;
  onToggleInspector?: () => void;
  onResetLayout?: () => void;
}

export function LabHeader({
  projectTitle,
  onTitleChange,
  activeMode,
  onModeChange,
  isSimulating,
  onToggleSimulation,
  onResetSimulation,
  onNewProject,
  onSaveProject,
  onLoadProject,
  onExportProject,
  onOpenExperiments,
  onOpenCommunityProjects,
  onOpenShareModal,
  hasUnsavedChanges,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isBrowserOpen,
  onToggleBrowser,
  isInspectorOpen,
  onToggleInspector,
  onResetLayout,
}: LabHeaderProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);

  return (
    <header className="h-14 bg-[#0B1528] text-white border-b border-slate-800 flex items-center justify-between px-2 sm:px-3 select-none z-30 w-full max-w-full overflow-hidden flex-shrink-0">
      {/* Brand & Project Info */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0 min-w-0">
        <Link
          href="/"
          className="flex items-center gap-1.5 group text-slate-300 hover:text-white transition-colors pr-1.5 sm:pr-2 border-r border-slate-700/60"
          title="Back to EI House Home"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-[11px] sm:text-xs text-emerald-400">
              EI
            </div>
            <div className="hidden xl:block leading-none">
              <span className="font-semibold text-xs tracking-tight text-white block">EI HOUSE</span>
              <span className="text-[9px] text-emerald-400 tracking-wider uppercase font-mono">ENG LAB</span>
            </div>
          </div>
        </Link>

        {/* Project Title Input */}
        <div className="flex items-center gap-1.5 min-w-0">
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            className="bg-slate-900/80 hover:bg-slate-900 text-xs font-medium text-slate-200 px-1.5 sm:px-2 py-1 rounded border border-slate-700/80 focus:border-emerald-500 focus:outline-none transition-all w-20 sm:w-28 md:w-32 lg:w-36 xl:w-40 truncate"
            title="Click to rename project"
          />
          {hasUnsavedChanges ? (
            <span className="text-[9px] sm:text-[10px] text-amber-400 hidden sm:flex items-center gap-1 font-mono flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Unsaved
            </span>
          ) : (
            <span className="text-[9px] sm:text-[10px] text-slate-400 hidden sm:inline font-mono flex-shrink-0">Saved</span>
          )}
        </div>
      </div>

      {/* Mobile/Tablet View Mode Dropdown (sm screens < 768px) */}
      <div className="md:hidden flex items-center">
        <select
          value={activeMode}
          onChange={(e) => onModeChange(e.target.value as WorkspaceMode)}
          className="bg-slate-900 border border-slate-700 text-emerald-400 text-xs rounded px-2 py-1 font-semibold focus:outline-none cursor-pointer"
        >
          <option value="schematic">⚡ Schematic</option>
          <option value="virtual3d">📦 3D Studio</option>
          <option value="instruments">📊 Instruments</option>
          <option value="pcb2d">📐 PCB 2D</option>
          <option value="pcb3d">🧊 PCB 3D</option>
          <option value="firmware">💻 MCU</option>
          <option value="calculators">🧮 Calc</option>
        </select>
      </div>

      {/* Desktop & Laptop Mode Switcher (Icon-only on laptops/tablets, full text on wide xl: screens) */}
      <nav className="hidden md:flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-800 text-xs flex-shrink-0">
        <button
          onClick={() => onModeChange('schematic')}
          className={`px-1.5 xl:px-2 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition-all flex-shrink-0 ${
            activeMode === 'schematic'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
          title="Schematic Circuit Designer"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Schematic</span>
        </button>

        <button
          onClick={() => onModeChange('virtual3d')}
          className={`px-1.5 xl:px-2 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition-all flex-shrink-0 ${
            activeMode === 'virtual3d'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
          title="Direct 3D-First Virtual Electronics Studio (Breadboard, Wiring & Boards)"
        >
          <Box className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden xl:inline">3D Studio</span>
        </button>

        <button
          onClick={() => onModeChange('instruments')}
          className={`px-1.5 xl:px-2 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition-all flex-shrink-0 ${
            activeMode === 'instruments'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
          title="Virtual Instruments (Scope, DMM, AWG, Logic Analyzer)"
        >
          <Activity className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Instruments</span>
        </button>

        <button
          onClick={() => onModeChange('pcb2d')}
          className={`px-1.5 xl:px-2 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition-all flex-shrink-0 ${
            activeMode === 'pcb2d'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
          title="PCB 2D Layout & Autorouter"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">PCB 2D</span>
        </button>

        <button
          onClick={() => onModeChange('pcb3d')}
          className={`px-1.5 xl:px-2 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition-all flex-shrink-0 ${
            activeMode === 'pcb3d'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
          title="PCB 3D Photorealistic Inspection"
        >
          <Box className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">PCB 3D</span>
        </button>

        <button
          onClick={() => onModeChange('firmware')}
          className={`px-1.5 xl:px-2 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition-all flex-shrink-0 ${
            activeMode === 'firmware'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
          title="Embedded Microcontroller Firmware IDE"
        >
          <Code2 className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">MCU</span>
        </button>

        <button
          onClick={() => onModeChange('calculators')}
          className={`px-1.5 xl:px-2 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition-all flex-shrink-0 ${
            activeMode === 'calculators'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
          title="R&D Engineering Calculators"
        >
          <Calculator className="w-3.5 h-3.5" />
          <span className="hidden 2xl:inline">Calculators</span>
        </button>

        <button
          onClick={onOpenExperiments}
          className="px-1.5 xl:px-2 py-1.5 rounded-md flex items-center gap-1 font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 transition-all border-l border-slate-800 ml-0.5 flex-shrink-0"
          title="Guided Electronics Experiments"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden 2xl:inline">Experiments</span>
        </button>

        {onOpenCommunityProjects && (
          <button
            onClick={onOpenCommunityProjects}
            className="px-1.5 xl:px-2 py-1.5 rounded-md flex items-center gap-1 font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 transition-all border-l border-slate-800 relative group flex-shrink-0"
            title="Explore Wokwi-grade community projects & open in 1 click"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-12 transition-transform" />
            <span className="hidden 2xl:inline">Community Hub</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping absolute top-1 right-1" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-1 right-1" />
          </button>
        )}
      </nav>

      {/* Primary Actions: Simulation Controls & File Operations (Always visible, flex-shrink-0) */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
        {/* Undo / Redo & Workspace Layout Controls */}
        <div className="hidden 2xl:flex items-center bg-slate-900 rounded p-0.5 border border-slate-800 gap-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none rounded transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

          {/* Panel Visibility Toggles */}
          {onToggleBrowser && (
            <button
              onClick={onToggleBrowser}
              className={`p-1.5 rounded transition-colors ${
                isBrowserOpen
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Toggle Component Library (B)"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          )}

          {onToggleInspector && (
            <button
              onClick={onToggleInspector}
              className={`p-1.5 rounded transition-colors ${
                isInspectorOpen
                  ? 'bg-sky-950/80 text-sky-400 border border-sky-700/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Toggle Properties Inspector (I)"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}

          {onResetLayout && (
            <button
              onClick={onResetLayout}
              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
              title="Reset Workspace Layout (Restore Default Panels)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Master Simulation Run / Stop Button (Hidden on PCB 2D & PCB 3D tabs) */}
        {activeMode !== 'pcb2d' && activeMode !== 'pcb3d' && (
          <>
            <button
              onClick={onToggleSimulation}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-semibold text-xs shadow-md transition-all ${
                isSimulating
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
              title="Toggle Simulation (Spacebar)"
            >
              {isSimulating ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Stop Sim
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Run Sim
                </>
              )}
            </button>

            {/* Reset Sim */}
            <button
              onClick={onResetSimulation}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-700/80 transition-colors"
              title="Reset Simulation Clock & Nodes"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {/* New Project */}
        <button
          onClick={onNewProject}
          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-700/80 transition-colors"
          title="Create New Project"
        >
          <FilePlus className="w-3.5 h-3.5" />
        </button>

        {/* Save */}
        <button
          onClick={onSaveProject}
          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700/80 transition-colors"
          title="Save Project (Ctrl+S)"
        >
          <Save className="w-4 h-4" />
        </button>

        {/* Open File / Load Project */}
        <label
          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700/80 transition-colors cursor-pointer"
          title="Open Project JSON"
        >
          <FolderOpen className="w-4 h-4" />
          <input type="file" accept=".json" onChange={onLoadProject} className="hidden" />
        </label>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700/80 text-xs flex items-center gap-1 transition-colors"
            title="Export Options"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showExportMenu && (
            <div
              className="absolute right-0 mt-1 w-48 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl py-1 z-50 text-xs"
              onMouseLeave={() => setShowExportMenu(false)}
            >
              <button
                onClick={() => {
                  onExportProject('json');
                  setShowExportMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
              >
                <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                Project File (.json)
              </button>
              <button
                onClick={() => {
                  onExportProject('gerber');
                  setShowExportMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                RS-274X Gerber Top (.gtl)
              </button>
              <button
                onClick={() => {
                  onExportProject('bom');
                  setShowExportMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
              >
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                Bill of Materials (.csv)
              </button>
              <button
                onClick={() => {
                  onExportProject('firmware');
                  setShowExportMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
              >
                <Code2 className="w-3.5 h-3.5 text-purple-400" />
                Arduino Firmware (.ino)
              </button>
            </div>
          )}
        </div>

        {/* Share & Cloud Community Button */}
        {onOpenShareModal && (
          <button
            onClick={onOpenShareModal}
            className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded font-medium text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 border border-emerald-500/30 transition-all hover:scale-102"
            title="Share Project Link, Embed Snippet or Publish to Community Web"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>
        )}
      </div>
    </header>
  );
}
