'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  FilePlus,
  RefreshCw,
  ArrowLeft,
  ChevronDown,
  Calculator,
  Sliders,
  LayoutGrid,
  Globe,
  Share2,
  Image as ImageIcon,
  FileText,
  Upload,
  Sparkles,
  FileJson,
} from 'lucide-react';
import { WorkspaceMode } from '@/modules/engineering-lab/types';

export type ExportFormat =
  | 'eihouse'
  | 'json'
  | 'gerber'
  | 'bom'
  | 'firmware'
  | 'cpp'
  | 'png'
  | 'svg'
  | 'netlist'
  | 'netlist-json';

interface LabHeaderProps {
  projectTitle: string;
  onTitleChange: (title: string) => void;
  activeMode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onResetSimulation: () => void;
  onNewProject: () => void;
  onNewBlankProject?: () => void;
  onLoadTemplate?: () => void;
  onSaveProject: () => void;
  onLoadProject: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportProject: (format: ExportFormat) => void;
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
  onNewBlankProject,
  onLoadTemplate,
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
  const [showNewMenu, setShowNewMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close menus on outside click or Escape key
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setShowNewMenu(false);
      }
    };
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowExportMenu(false);
        setShowNewMenu(false);
      }
    };

    if (showExportMenu || showNewMenu) {
      document.addEventListener('mousedown', handleGlobalClick);
      document.addEventListener('keydown', handleGlobalKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [showExportMenu, showNewMenu]);

  const isSchematic = activeMode === 'schematic';
  const is3D = activeMode === 'virtual3d';
  const isPcb2D = activeMode === 'pcb2d';
  const isPcb3D = activeMode === 'pcb3d';
  const isFirmware = activeMode === 'firmware';

  return (
    <header className="h-14 bg-[#0B1528] text-white border-b border-slate-800 flex items-center justify-between px-2 sm:px-3 select-none z-50 w-full max-w-full overflow-visible relative flex-shrink-0">
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

        {/* Project Title Input & Save State Badge */}
        <div className="flex items-center gap-1.5 min-w-0">
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            className="bg-slate-900/80 hover:bg-slate-900 text-xs font-medium text-slate-200 px-1.5 sm:px-2 py-1 rounded border border-slate-700/80 focus:border-emerald-500 focus:outline-none transition-all w-20 sm:w-28 md:w-32 lg:w-36 xl:w-40 truncate"
            title="Click to rename project"
          />
          {hasUnsavedChanges ? (
            <span
              className="text-[9px] sm:text-[10px] text-amber-400 hidden sm:flex items-center gap-1 font-mono flex-shrink-0 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20"
              title="Workspace has unsaved changes. Press Ctrl+S to save."
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Unsaved
            </span>
          ) : (
            <span
              className="text-[9px] sm:text-[10px] text-emerald-400 hidden sm:flex items-center gap-1 font-mono flex-shrink-0 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20"
              title="Workspace saved in browser local storage."
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Saved
            </span>
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
          title="3D Virtual Electronics Studio & Breadboard Simulator"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">3D Studio</span>
        </button>

        <button
          onClick={() => onModeChange('instruments')}
          className={`px-1.5 xl:px-2 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition-all flex-shrink-0 ${
            activeMode === 'instruments'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
          title="Benchtop Virtual Instruments"
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
          title="PCB 2D Layout Editor & Autorouter"
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
            title="Explore EI House community projects & open in 1 click"
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
        {/* Undo / Redo & Workspace Layout Controls (Visible on laptops & desktops) */}
        <div className="hidden lg:flex items-center bg-slate-900 rounded p-0.5 border border-slate-800 gap-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded transition-colors ${
              canUndo
                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 opacity-40 cursor-not-allowed pointer-events-none'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded transition-colors ${
              canRedo
                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 opacity-40 cursor-not-allowed pointer-events-none'
            }`}
            title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
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
                  <span>Stop Sim</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Sim</span>
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

        {/* New Project / Reset Canvas Dropdown */}
        <div className="relative" ref={newMenuRef}>
          <button
            onClick={() => setShowNewMenu(!showNewMenu)}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700/80 transition-colors flex items-center gap-0.5"
            title="Create New Project / Reset Canvas"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
          </button>

          {showNewMenu && (
            <div className="absolute right-0 mt-1 w-52 bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl p-1 z-50 text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => {
                  if (onNewBlankProject) onNewBlankProject();
                  else onNewProject();
                  setShowNewMenu(false);
                }}
                className="w-full px-2.5 py-2 text-left text-slate-200 hover:bg-slate-800 hover:text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <FilePlus className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold text-xs">New Blank Project</div>
                  <div className="text-[10px] text-slate-400">Start fresh with empty canvas</div>
                </div>
              </button>

              {onLoadTemplate && (
                <button
                  onClick={() => {
                    onLoadTemplate();
                    setShowNewMenu(false);
                  }}
                  className="w-full px-2.5 py-2 text-left text-slate-200 hover:bg-slate-800 hover:text-white rounded-lg flex items-center gap-2 transition-colors border-t border-slate-800/70"
                >
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-xs">NE555 Astable Demo</div>
                    <div className="text-[10px] text-slate-400">Load sample 555 pulsing circuit</div>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Save Workspace to localStorage (Ctrl+S) */}
        <button
          onClick={onSaveProject}
          className="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700/80 transition-colors flex items-center gap-1.5 text-xs"
          title="Save Project to Local Storage (Ctrl+S)"
        >
          <Save className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline font-medium">Save</span>
        </button>

        {/* Hidden File Input for .eihouse.json and .json */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".eihouse.json,.json"
          onChange={onLoadProject}
          className="hidden"
        />

        {/* Open File / Load Project Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700/80 transition-colors"
          title="Import Project (.eihouse.json / .json)"
        >
          <FolderOpen className="w-3.5 h-3.5" />
        </button>

        {/* Universal Export Dropdown */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white rounded border border-slate-700/80 text-xs flex items-center gap-1 transition-colors font-medium"
            title="Universal Export Options"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Export</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showExportMenu && (
            <div className="absolute top-full right-0 mt-2 w-80 max-w-[calc(100vw-1rem)] bg-[#0B1528] border border-slate-700/90 rounded-xl shadow-2xl p-2 z-[100] text-xs backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto ring-1 ring-white/10 space-y-0.5">
              {/* 1. Complete Project File & Re-import */}
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                EI House Project
              </div>

              <button
                onClick={() => {
                  onExportProject('eihouse');
                  setShowExportMenu(false);
                }}
                className="w-full px-2.5 py-2 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-3 group transition-colors"
              >
                <span className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Sparkles className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform shrink-0" />
                  <span className="font-medium text-xs truncate">EI House Project</span>
                </span>
                <span className="shrink-0 text-[10px] font-mono text-cyan-400/90 font-bold bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/50">
                  .eihouse.json
                </span>
              </button>

              <button
                onClick={() => {
                  onExportProject('json');
                  setShowExportMenu(false);
                }}
                className="w-full px-2.5 py-2 text-left text-slate-300 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-3 group transition-colors"
              >
                <span className="flex items-center gap-2.5 min-w-0 flex-1">
                  <FileJson className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium text-xs truncate">Standard Project File</span>
                </span>
                <span className="shrink-0 text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                  .json
                </span>
              </button>

              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowExportMenu(false);
                }}
                className="w-full px-2.5 py-2 text-left text-emerald-400 hover:bg-emerald-950/60 hover:text-emerald-300 rounded-lg flex items-center justify-between gap-3 group transition-colors border border-emerald-500/25 my-1"
              >
                <span className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium text-xs truncate">Import Project...</span>
                </span>
                <span className="shrink-0 text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/40">
                  Load
                </span>
              </button>

              <div className="my-1.5 border-t border-slate-800" />

              {/* 2. Context-Aware Tab Export Options */}
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center justify-between">
                <span>Current View Exports</span>
                <span className="text-[9px] text-slate-400 font-normal">Context-Aware</span>
              </div>

              {isSchematic && (
                <>
                  <button
                    onClick={() => {
                      onExportProject('png');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-2.5 py-2 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-3 transition-colors"
                  >
                    <span className="flex items-center gap-2.5 min-w-0 flex-1">
                      <ImageIcon className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="font-medium text-xs truncate">Schematic Snapshot</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">PNG</span>
                  </button>
                  <button
                    onClick={() => {
                      onExportProject('svg');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-2.5 py-2 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-3 transition-colors"
                  >
                    <span className="flex items-center gap-2.5 min-w-0 flex-1">
                      <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                      <span className="font-medium text-xs truncate">Vector Drawing</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">SVG</span>
                  </button>
                </>
              )}

              {is3D && (
                <button
                  onClick={() => {
                    onExportProject('png');
                    setShowExportMenu(false);
                  }}
                  className="w-full px-2.5 py-2 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-3 transition-colors"
                >
                  <span className="flex items-center gap-2.5 min-w-0 flex-1">
                    <ImageIcon className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="font-medium text-xs truncate">3D Studio Photorealistic Shot</span>
                  </span>
                  <span className="shrink-0 text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">PNG</span>
                </button>
              )}

              {isPcb2D && (
                <>
                  <button
                    onClick={() => {
                      onExportProject('gerber');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-2.5 py-2 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-3 transition-colors"
                  >
                    <span className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="font-medium text-xs truncate">Gerber & Drill Package</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">.zip</span>
                  </button>
                  <button
                    onClick={() => {
                      onExportProject('svg');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-2.5 py-2 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-3 transition-colors"
                  >
                    <span className="flex items-center gap-2.5 min-w-0 flex-1">
                      <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                      <span className="font-medium text-xs truncate">PCB 2D Vector Blueprint</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">SVG</span>
                  </button>
                </>
              )}

              {isPcb3D && (
                <>
                  <button
                    onClick={() => {
                      onExportProject('png');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-2.5 py-2 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-3 transition-colors"
                  >
                    <span className="flex items-center gap-2.5 min-w-0 flex-1">
                      <ImageIcon className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="font-medium text-xs truncate">PCB 3D High-Res Snapshot</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">PNG</span>
                  </button>
                  <button
                    onClick={() => {
                      onExportProject('gerber');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-2.5 py-2 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-3 transition-colors"
                  >
                    <span className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="font-medium text-xs truncate">Gerber Fabrication Package</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">.zip</span>
                  </button>
                </>
              )}

              {isFirmware && (
                <>
                  <button
                    onClick={() => {
                      onExportProject('firmware');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-2.5 py-2 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-3 transition-colors"
                  >
                    <span className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Code2 className="w-4 h-4 text-purple-400 shrink-0" />
                      <span className="font-medium text-xs truncate">Arduino Sketch</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">.ino</span>
                  </button>
                  <button
                    onClick={() => {
                      onExportProject('cpp');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-2.5 py-2 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-3 transition-colors"
                  >
                    <span className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Code2 className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="font-medium text-xs truncate">C++ Source File</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">.cpp</span>
                  </button>
                </>
              )}

              <div className="my-1.5 border-t border-slate-800" />

              {/* 3. Engineering Deliverables & Netlists */}
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Deliverables & Netlists
              </div>

              <button
                onClick={() => {
                  onExportProject('bom');
                  setShowExportMenu(false);
                }}
                className="w-full px-2.5 py-2 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-3 transition-colors"
              >
                <span className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Cpu className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-medium text-xs truncate">Bill of Materials</span>
                </span>
                <span className="shrink-0 text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">.csv</span>
              </button>

              <button
                onClick={() => {
                  onExportProject('netlist');
                  setShowExportMenu(false);
                }}
                className="w-full px-2.5 py-2 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-3 transition-colors"
              >
                <span className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium text-xs truncate">SPICE Netlist</span>
                </span>
                <span className="shrink-0 text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/40">.cir</span>
              </button>

              <button
                onClick={() => {
                  onExportProject('netlist-json');
                  setShowExportMenu(false);
                }}
                className="w-full px-2.5 py-2 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-3 transition-colors"
              >
                <span className="flex items-center gap-2.5 min-w-0 flex-1">
                  <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="font-medium text-xs truncate">JSON Netlist</span>
                </span>
                <span className="shrink-0 text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/40">.json</span>
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
