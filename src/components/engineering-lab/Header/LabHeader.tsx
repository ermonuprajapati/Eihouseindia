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
  FileCode2,
} from 'lucide-react';
import { WorkspaceMode } from '@/modules/engineering-lab/types';
import { VIRTUAL_LAB_NAV_ITEMS } from '@/modules/engineering-lab/navigation-config';

export type ExportFormat =
  | 'eihouse'
  | 'json'
  | 'gerber'
  | 'gerber-zip'
  | 'pdf'
  | 'bom'
  | 'cpl'
  | 'firmware'
  | 'cpp'
  | 'png'
  | 'jpg'
  | 'jpeg'
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
    <>
      <header className="w-full max-w-[100vw] flex items-center justify-between gap-1.5 px-2 h-11 box-border bg-[#0B1528] text-white border-b border-slate-800 select-none z-50 shrink-0 relative">
      {/* Zone A: Left Brand & Project (Compact shrink-0, max ~185px on < 1480px) */}
      <div className="shrink-0 flex items-center gap-1.5 sm:gap-2 min-w-0">
        <Link
          href="/"
          className="flex items-center gap-1.5 group text-slate-300 hover:text-white transition-colors pr-1.5 sm:pr-2 border-r border-slate-700/60 shrink-0"
          title="Back to EI House Home"
        >
          <div className="w-6 h-6 flex items-center justify-center rounded text-emerald-400 group-hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:-translate-x-0.5 transition-transform shrink-0" />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-[11px] text-emerald-400 shrink-0" title="EI House Virtual Engineering Lab">
              EI
            </div>
            <div className="hidden 2xl:block leading-none">
              <span className="font-semibold text-xs tracking-tight text-white block">EI HOUSE</span>
              <span className="text-[9px] text-emerald-400 tracking-wider uppercase font-mono">ENG LAB</span>
            </div>
          </div>
        </Link>

        {/* Project Title Input & Save State Badge */}
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            className="bg-slate-900/80 hover:bg-slate-900 text-[11px] font-medium text-slate-200 px-1.5 py-0.5 rounded border border-slate-700/80 focus:border-emerald-500 focus:outline-none transition-all w-14 sm:w-20 md:w-24 max-w-[65px] sm:max-w-[140px] xl:max-w-[125px] 2xl:max-w-[175px] truncate"
            title="Click to rename project"
          />
          {hasUnsavedChanges ? (
            <span
              className="flex items-center gap-1 font-mono flex-shrink-0 cursor-default"
              title="Workspace has unsaved changes. Press Ctrl+S to save."
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="hidden 2xl:inline text-[10px] text-amber-400 px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20">Unsaved</span>
            </span>
          ) : (
            <span
              className="flex items-center gap-1 font-mono flex-shrink-0 cursor-default"
              title="Workspace saved in browser local storage."
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="hidden 2xl:inline text-[10px] text-emerald-400 px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">Saved</span>
            </span>
          )}
        </div>
      </div>

      {/* Zone B: Center Navigation Tabs (flex-1 min-w-0 overflow-x-auto no-scrollbar flex items-center justify-center gap-0.5) */}
      <nav
        aria-label="Workspace tabs desktop"
        className="hidden lg:flex flex-1 min-w-0 overflow-x-auto no-scrollbar items-center justify-center gap-0.5 py-0.5 select-none"
      >
        <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-800 gap-0.5 shrink-0">
          {VIRTUAL_LAB_NAV_ITEMS.map((item) => {
            const active =
              activeMode === item.mode ||
              (item.id === 'studio3d' && (activeMode === 'virtual3d' || activeMode === 'studio3d')) ||
              (item.id === 'mcu' && (activeMode === 'firmware' || activeMode === 'mcu'));
            return (
              <button
                key={item.id}
                onClick={() => onModeChange(item.mode)}
                className={`px-1.5 py-1 text-[11px] rounded-md flex items-center gap-1 font-medium transition-all shrink-0 whitespace-nowrap ${
                  active
                    ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title={item.title}
              >
                {item.iconName === 'Cpu' && <Cpu className="w-3.5 h-3.5 shrink-0 text-cyan-400" />}
                {item.iconName === 'Layers' && <Layers className="w-3.5 h-3.5 shrink-0 text-emerald-400" />}
                {item.iconName === 'FileCode2' && <FileCode2 className="w-3.5 h-3.5 shrink-0 text-blue-400" />}
                {item.iconName === 'Grid' && <LayoutGrid className="w-3.5 h-3.5 shrink-0 text-teal-400" />}
                {item.iconName === 'Box' && <Box className="w-3.5 h-3.5 shrink-0 text-sky-400" />}
                {item.iconName === 'Activity' && <Activity className="w-3.5 h-3.5 shrink-0 text-yellow-400" />}
                {item.iconName === 'Code2' && <Code2 className="w-3.5 h-3.5 shrink-0 text-purple-400" />}
                <span>{item.name}</span>
              </button>
            );
          })}

          {/* Icon Tabs: Calculators, Experiments, Community */}
          <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5 shrink-0" />

          <button
            onClick={() => onModeChange('calculators')}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all shrink-0 ${
              activeMode === 'calculators'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-orange-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="R&D Engineering Calculators"
          >
            <Calculator className="w-3.5 h-3.5 shrink-0" />
          </button>

          <button
            onClick={onOpenExperiments}
            className="w-7 h-7 rounded-md flex items-center justify-center text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 transition-all shrink-0"
            title="Guided Electronics Experiments"
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
          </button>

          {onOpenCommunityProjects && (
            <button
              onClick={onOpenCommunityProjects}
              className="w-7 h-7 rounded-md flex items-center justify-center text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 transition-all relative shrink-0 group"
              title="Explore EI House community projects & open in 1 click"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-12 transition-transform shrink-0" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping absolute top-1 right-1" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-1 right-1" />
            </button>
          )}
        </div>
      </nav>

      {/* Zone C: Right Action Cluster (shrink-0 flex items-center gap-1 - ALWAYS 100% ON-SCREEN) */}
      <div className="shrink-0 flex items-center gap-1">
        {/* Undo / Redo & Workspace Layout Controls (Visible on laptops & desktops >= xl) */}
        <div className="hidden xl:flex items-center bg-slate-900 rounded p-0.5 border border-slate-800 gap-0.5 shrink-0">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
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
            className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
              canRedo
                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 opacity-40 cursor-not-allowed pointer-events-none'
            }`}
            title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5" />

          {/* Panel Visibility Toggles */}
          {onToggleBrowser && (
            <button
              onClick={onToggleBrowser}
              className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
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
              className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
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
              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
              title="Reset Workspace Layout (Restore Default Panels)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Mobile & Tablet Slide-Over Drawer Toggles (< lg: < 1024px, hidden on small mobile) */}
        <div className="hidden sm:flex lg:hidden items-center gap-0.5 shrink-0">
          {onToggleBrowser && (
            <button
              onClick={onToggleBrowser}
              className={`w-6 h-6 flex items-center justify-center rounded transition-colors border border-slate-700/80 ${
                isBrowserOpen
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/50'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
              title="Toggle Component Library Drawer"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          )}

          {onToggleInspector && (
            <button
              onClick={onToggleInspector}
              className={`w-6 h-6 flex items-center justify-center rounded transition-colors border border-slate-700/80 ${
                isInspectorOpen
                  ? 'bg-sky-950/80 text-sky-400 border-sky-700/50'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
              title="Toggle Properties Inspector Drawer"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Master Simulation Run / Stop Button (Hidden on PCB 2D, PCB 3D, and Schematic Editor tabs) */}
        {activeMode !== 'pcb2d' && activeMode !== 'pcb3d' && activeMode !== 'schematicEditor' && (
          <>
            <button
              onClick={onToggleSimulation}
              className={`px-1.5 sm:px-2 py-1 rounded-md flex items-center gap-1 font-semibold text-[11px] shadow-md transition-all shrink-0 whitespace-nowrap ${
                isSimulating
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
              title="Toggle Simulation (Spacebar)"
            >
              {isSimulating ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span className="2xl:hidden">Stop</span>
                  <span className="hidden 2xl:inline">Stop Sim</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span className="2xl:hidden">Run</span>
                  <span className="hidden 2xl:inline">Run Sim</span>
                </>
              )}
            </button>

            {/* Reset Sim */}
            <button
              onClick={onResetSimulation}
              className="w-6 h-6 hidden sm:flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-700/80 transition-colors shrink-0"
              title="Reset Simulation Clock & Nodes"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {/* New Project / Reset Canvas Dropdown */}
        <div className="relative hidden sm:block shrink-0" ref={newMenuRef}>
          <button
            onClick={() => setShowNewMenu(!showNewMenu)}
            className="w-6 h-6 flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700/80 transition-colors shrink-0"
            title="Create New Project / Reset Canvas"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>

          {showNewMenu && (
            <div className="fixed top-12 right-24 sm:right-32 mt-1 w-52 bg-slate-900/95 border border-slate-800 rounded-xl shadow-2xl p-1 z-[100] text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
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
          className="w-6 h-6 sm:w-auto px-0 sm:px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700/80 transition-colors flex items-center justify-center gap-1 text-[11px] shrink-0 whitespace-nowrap"
          title="Save Project to Local Storage (Ctrl+S)"
        >
          <Save className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="hidden xl:inline font-medium">Save</span>
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
          className="w-6 h-6 hidden sm:flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700/80 transition-colors shrink-0"
          title="Import Project (.eihouse.json / .json)"
        >
          <FolderOpen className="w-3.5 h-3.5" />
        </button>

        {/* Universal Export Dropdown */}
        <div className="relative shrink-0" ref={exportMenuRef}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="w-6 h-6 sm:w-auto px-0 sm:px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white rounded border border-slate-700/80 text-[11px] flex items-center justify-center gap-1 transition-colors font-medium shrink-0 whitespace-nowrap"
            title="Universal Export Options"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="hidden sm:inline">Export</span>
            <ChevronDown className="hidden sm:inline w-3 h-3 text-slate-400 shrink-0" />
          </button>

          {showExportMenu && (
            <div className="fixed top-12 right-2 sm:right-4 mt-1 w-80 max-w-[calc(100vw-1rem)] bg-[#0B1528] border border-slate-700/90 rounded-xl shadow-2xl p-2 z-[100] text-xs backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto ring-1 ring-white/10 space-y-0.5">
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
                      onExportProject('jpg');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-2.5 py-2 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-3 transition-colors"
                  >
                    <span className="flex items-center gap-2.5 min-w-0 flex-1">
                      <ImageIcon className="w-4 h-4 text-teal-400 shrink-0" />
                      <span className="font-medium text-xs truncate">Crisp Image</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">JPG</span>
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
                      <span className="font-medium text-xs truncate">3D Studio Photorealistic Shot</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">PNG</span>
                  </button>
                  <button
                    onClick={() => {
                      onExportProject('jpg');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-2.5 py-2 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-3 transition-colors"
                  >
                    <span className="flex items-center gap-2.5 min-w-0 flex-1">
                      <ImageIcon className="w-4 h-4 text-teal-400 shrink-0" />
                      <span className="font-medium text-xs truncate">3D Studio Crisp Image</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">JPG</span>
                  </button>
                </>
              )}

              {isPcb2D && (
                <>
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
                  <button
                    onClick={() => {
                      onExportProject('png');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-2.5 py-2 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-3 transition-colors"
                  >
                    <span className="flex items-center gap-2.5 min-w-0 flex-1">
                      <ImageIcon className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="font-medium text-xs truncate">PCB 2D Layout PNG</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">PNG</span>
                  </button>
                  <button
                    onClick={() => {
                      onExportProject('jpg');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-2.5 py-2 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-3 transition-colors"
                  >
                    <span className="flex items-center gap-2.5 min-w-0 flex-1">
                      <ImageIcon className="w-4 h-4 text-teal-400 shrink-0" />
                      <span className="font-medium text-xs truncate">PCB 2D Layout JPG</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">JPG</span>
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
                      onExportProject('jpg');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-2.5 py-2 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-3 transition-colors"
                  >
                    <span className="flex items-center gap-2.5 min-w-0 flex-1">
                      <ImageIcon className="w-4 h-4 text-teal-400 shrink-0" />
                      <span className="font-medium text-xs truncate">PCB 3D Crisp Image</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">JPG</span>
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
                  onExportProject('gerber');
                  setShowExportMenu(false);
                }}
                className="w-full px-2.5 py-2 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-3 transition-colors"
              >
                <span className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-medium text-xs truncate">Production Gerber & Drill (.zip)</span>
                </span>
                <span className="shrink-0 text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">JLCPCB / PCBWay</span>
              </button>

              <button
                onClick={() => {
                  onExportProject('pdf');
                  setShowExportMenu(false);
                }}
                className="w-full px-2.5 py-2 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-3 transition-colors"
              >
                <span className="flex items-center gap-2.5 min-w-0 flex-1">
                  <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-medium text-xs truncate">Engineering Drawing PDF</span>
                </span>
                <span className="shrink-0 text-[10px] font-mono text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/40">.pdf</span>
              </button>

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
                  onExportProject('cpl');
                  setShowExportMenu(false);
                }}
                className="w-full px-2.5 py-2 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-3 transition-colors"
              >
                <span className="flex items-center gap-2.5 min-w-0 flex-1">
                  <FileCode2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="font-medium text-xs truncate">Centroid / CPL Placement</span>
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
            className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded font-semibold text-[11px] flex items-center gap-1 shadow-md shadow-emerald-950/40 border border-emerald-500/30 transition-all shrink-0 hover:scale-102 whitespace-nowrap"
            title="Share Project Link, Embed Snippet or Publish to Community Web"
          >
            <Share2 className="w-3.5 h-3.5 shrink-0" />
            <span className="inline">Share</span>
          </button>
        )}
      </div>
    </header>

    {/* Row 2: Mobile & Tablet Mode Switcher (< lg: < 1024px) */}
    <nav
      aria-label="Workspace tabs mobile"
      className="flex lg:hidden items-center bg-[#070D18] border-b border-slate-800 px-2 h-9 overflow-x-auto no-scrollbar touch-scroll gap-1 text-xs shrink-0 select-none shadow-inner w-full box-border"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {VIRTUAL_LAB_NAV_ITEMS.map((item) => {
        const active =
          activeMode === item.mode ||
          (item.id === 'studio3d' && (activeMode === 'virtual3d' || activeMode === 'studio3d')) ||
          (item.id === 'mcu' && (activeMode === 'firmware' || activeMode === 'mcu'));
        return (
          <button
            key={`mobile-${item.id}`}
            onClick={() => onModeChange(item.mode)}
            className={`px-2 py-1 rounded-md flex items-center gap-1 text-[11px] font-medium transition-all shrink-0 whitespace-nowrap ${
              active
                ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 bg-slate-900/60 border border-slate-800/80'
            }`}
            title={item.title}
          >
            {item.iconName === 'Cpu' && <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
            {item.iconName === 'Layers' && <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
            {item.iconName === 'FileCode2' && <FileCode2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
            {item.iconName === 'Grid' && <LayoutGrid className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
            {item.iconName === 'Box' && <Box className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
            {item.iconName === 'Activity' && <Activity className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
            {item.iconName === 'Code2' && <Code2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
            <span>{item.name}</span>
          </button>
        );
      })}

      <button
        onClick={() => onModeChange('calculators')}
        className={`px-2 py-1 rounded-md flex items-center gap-1 text-[11px] font-medium transition-all shrink-0 whitespace-nowrap ${
          activeMode === 'calculators'
            ? 'bg-emerald-600 text-white shadow-sm font-semibold'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 bg-slate-900/60 border border-slate-800/80'
        }`}
        title="R&D Engineering Calculators"
      >
        <Calculator className="w-3.5 h-3.5 text-orange-400 shrink-0" />
        <span>Calculators</span>
      </button>

      <button
        onClick={onOpenExperiments}
        className="px-2 py-1 rounded-md flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 bg-slate-900/60 border border-slate-800/80 transition-all shrink-0 whitespace-nowrap"
        title="Guided Electronics Experiments"
      >
        <BookOpen className="w-3.5 h-3.5 shrink-0" />
        <span>Experiments</span>
      </button>

      {onOpenCommunityProjects && (
        <button
          onClick={onOpenCommunityProjects}
          className="px-2 py-1 rounded-md flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 bg-slate-900/60 border border-slate-800/80 transition-all relative shrink-0 whitespace-nowrap"
          title="Explore EI House community projects & open in 1 click"
        >
          <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Community Hub</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping ml-0.5" />
        </button>
      )}
    </nav>
    </>
  );
}
