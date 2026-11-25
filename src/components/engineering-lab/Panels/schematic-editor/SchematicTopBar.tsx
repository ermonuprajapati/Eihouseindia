'use client';

import React, { useState } from 'react';
import {
  Undo,
  Redo,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Copy,
  Trash2,
  Sparkles,
  CheckCircle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid as GridIcon,
  Download,
  Sun,
  Moon,
  Printer,
  AlignLeft,
  Search,
  FileSpreadsheet,
  Tag,
  Eye,
} from 'lucide-react';
import { SchematicEditorSheetConfig } from '@/modules/engineering-lab/types';

interface SchematicTopBarProps {
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onRotate?: () => void;
  onRotateCcw?: () => void;
  onMirrorH?: () => void;
  onMirrorV?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onAutoTidy?: () => void;
  onAutoAnnotate?: () => void;
  onRunErc?: () => void;
  onAlign?: (alignment: 'left' | 'top' | 'center' | 'distribute') => void;
  onOpenFind?: () => void;
  onOpenBomNetlist?: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomFit: () => void;
  sheetConfig: SchematicEditorSheetConfig & { showGrid?: boolean };
  onUpdateSheetConfig: (config: Partial<SchematicEditorSheetConfig & { showGrid?: boolean }>) => void;
  onExportSvg: () => void;
  onExportPng: () => void;
  onPrintPdf: () => void;
  selectedCompId?: string | null;
  selectedWireId?: string | null;
  selectedItemId?: string | null;
  selectedCompIds?: string[];
}

/**
 * Slim Compact Top Editor Action Bar
 * Single clean flex bar with zero overlap, supporting full EDA transforms, ERC, and export.
 */
export function SchematicTopBar({
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onRotate,
  onRotateCcw,
  onMirrorH,
  onMirrorV,
  onDuplicate,
  onDelete,
  onAutoTidy,
  onAutoAnnotate,
  onRunErc,
  onAlign,
  onOpenFind,
  onOpenBomNetlist,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomFit,
  sheetConfig,
  onUpdateSheetConfig,
  onExportSvg,
  onExportPng,
  onPrintPdf,
  selectedCompId,
  selectedWireId,
  selectedItemId,
  selectedCompIds = [],
}: SchematicTopBarProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAlignMenu, setShowAlignMenu] = useState(false);
  const hasCompSelection = Boolean(selectedCompId || selectedCompIds.length > 0);
  const hasDeleteSelection = Boolean(selectedCompId || selectedWireId || selectedItemId || selectedCompIds.length > 0);

  return (
    <div
      data-testid="sch-top-bar"
      className="h-10 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-2.5 z-20 shrink-0 gap-1 text-xs select-none overflow-x-auto no-scrollbar"
    >
      {/* 1. History Group: Undo / Redo */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          data-testid="action-undo"
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-1.5 rounded transition-colors ${
            canUndo ? 'text-slate-200 hover:bg-slate-800 hover:text-white' : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-3.5 h-3.5" />
        </button>

        <button
          data-testid="action-redo"
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-1.5 rounded transition-colors ${
            canRedo ? 'text-slate-200 hover:bg-slate-800 hover:text-white' : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Y)"
        >
          <Redo className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-slate-800 mx-1" />

        {/* 2. Transform Group: Rotate, Mirror H/V, Duplicate, Delete */}
        <button
          data-testid="action-rotate"
          onClick={onRotate}
          disabled={!hasCompSelection}
          className={`p-1.5 rounded transition-colors flex items-center gap-1 ${
            hasCompSelection ? 'text-slate-200 hover:bg-slate-800 hover:text-emerald-400' : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Rotate 90° (R)"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        <button
          data-testid="action-rotate-ccw"
          onClick={onRotateCcw}
          disabled={!hasCompSelection}
          className={`p-1.5 rounded transition-colors flex items-center gap-1 ${
            hasCompSelection ? 'text-slate-200 hover:bg-slate-800 hover:text-emerald-400' : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Rotate CCW (Shift+R)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          data-testid="action-mirror-h"
          onClick={onMirrorH}
          disabled={!hasCompSelection}
          className={`p-1.5 rounded transition-colors ${
            hasCompSelection ? 'text-slate-200 hover:bg-slate-800 hover:text-emerald-400' : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Mirror Horizontal (X)"
        >
          <FlipHorizontal className="w-3.5 h-3.5" />
        </button>

        <button
          data-testid="action-mirror-v"
          onClick={onMirrorV}
          disabled={!hasCompSelection}
          className={`p-1.5 rounded transition-colors ${
            hasCompSelection ? 'text-slate-200 hover:bg-slate-800 hover:text-emerald-400' : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Mirror Vertical (Y)"
        >
          <FlipVertical className="w-3.5 h-3.5" />
        </button>

        <button
          data-testid="action-duplicate"
          onClick={onDuplicate}
          disabled={!hasCompSelection}
          className={`p-1.5 rounded transition-colors ${
            hasCompSelection ? 'text-slate-200 hover:bg-slate-800 hover:text-emerald-400' : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Duplicate (Ctrl+D)"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        <button
          data-testid="action-delete"
          onClick={onDelete}
          disabled={!hasDeleteSelection}
          className={`p-1.5 rounded transition-colors ${
            hasDeleteSelection ? 'text-rose-400 hover:bg-rose-950/60' : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Delete Selection (Del / Backspace)"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* Alignment Dropdown */}
        <div className="relative">
          <button
            data-testid="action-align"
            onClick={() => setShowAlignMenu((p) => !p)}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors flex items-center gap-1"
            title="Align Selected Components"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          {showAlignMenu && (
            <div className="absolute left-0 top-8 bg-slate-900 border border-slate-700 rounded-md p-1 shadow-2xl z-50 flex flex-col gap-1 w-32 text-[10px] font-mono">
              <button
                data-testid="action-align-left"
                onClick={() => {
                  onAlign?.('left');
                  setShowAlignMenu(false);
                }}
                className="px-2 py-1 rounded text-left text-slate-200 hover:bg-slate-800 hover:text-emerald-400"
              >
                Align Left
              </button>
              <button
                data-testid="action-align-top"
                onClick={() => {
                  onAlign?.('top');
                  setShowAlignMenu(false);
                }}
                className="px-2 py-1 rounded text-left text-slate-200 hover:bg-slate-800 hover:text-emerald-400"
              >
                Align Top
              </button>
              <button
                data-testid="action-align-center"
                onClick={() => {
                  onAlign?.('center');
                  setShowAlignMenu(false);
                }}
                className="px-2 py-1 rounded text-left text-slate-200 hover:bg-slate-800 hover:text-emerald-400"
              >
                Align Center
              </button>
              <button
                data-testid="action-distribute"
                onClick={() => {
                  onAlign?.('distribute');
                  setShowAlignMenu(false);
                }}
                className="px-2 py-1 rounded text-left text-slate-200 hover:bg-slate-800 hover:text-emerald-400"
              >
                Distribute H
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2B. Search & BOM */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          data-testid="action-find"
          onClick={onOpenFind}
          className="px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center gap-1 text-[11px] font-mono border border-slate-700 transition-colors"
          title="Quick Find (Ctrl+F)"
        >
          <Search className="w-3 h-3 text-cyan-400" />
          <span className="hidden sm:inline">Find</span>
        </button>

        <button
          data-testid="action-bom-netlist"
          onClick={onOpenBomNetlist}
          className="px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center gap-1 text-[11px] font-mono border border-slate-700 transition-colors"
          title="Bill of Materials & Netlist"
        >
          <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
          <span className="hidden sm:inline">BOM</span>
        </button>
      </div>

      {/* 3. Engineering Group: Auto-Tidy & ERC */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-[1px] h-4 bg-slate-800 mx-1" />

        <button
          data-testid="action-autotidy"
          onClick={onAutoTidy}
          className="px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center gap-1 text-[11px] font-mono border border-slate-700 transition-colors"
          title="Auto-Tidy: Zero-overlap layout + 90° Manhattan wire routing"
        >
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Auto-Tidy</span>
        </button>

        <button
          data-testid="action-auto-annotate"
          onClick={onAutoAnnotate}
          className="px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center gap-1 text-[11px] font-mono border border-slate-700 transition-colors"
          title="Auto-Annotate: Sequential component designators"
        >
          <Tag className="w-3 h-3 text-cyan-400" />
          <span>Annotate</span>
        </button>

        <button
          data-testid="action-erc"
          onClick={onRunErc}
          className="px-2 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/60 flex items-center gap-1 text-[11px] font-mono transition-colors"
          title="Electrical Rules Check (ERC) diagnostic audit"
        >
          <CheckCircle className="w-3 h-3 text-emerald-400" />
          <span>ERC</span>
        </button>
      </div>

      {/* 4. Sheet Settings Group: Sheet Size, Grid, Theme */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-[1px] h-4 bg-slate-800 mx-1" />

        {/* Sheet Size */}
        <select
          data-testid="select-sheet-size"
          value={sheetConfig.size}
          onChange={(e) => onUpdateSheetConfig({ size: e.target.value as 'A4' | 'A3' | 'Letter' })}
          className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-300 focus:outline-none focus:border-emerald-500"
          title="Standard Sheet Frame Size"
        >
          <option value="A4">A4 (1100x780)</option>
          <option value="A3">A3 (1400x950)</option>
          <option value="Letter">Letter (1050x800)</option>
        </select>

        {/* Grid Step */}
        <select
          data-testid="select-grid-step"
          value={sheetConfig.gridStep}
          onChange={(e) => onUpdateSheetConfig({ gridStep: Number(e.target.value) })}
          className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-300 focus:outline-none focus:border-emerald-500"
          title="Grid Pitch"
        >
          <option value="10">10px Grid</option>
          <option value="20">20px Grid</option>
          <option value="40">40px Grid</option>
        </select>

        {/* Show/Hide Grid Toggle */}
        <button
          data-testid="toggle-show-grid"
          onClick={() => onUpdateSheetConfig({ showGrid: sheetConfig.showGrid === false ? true : false })}
          className={`p-1 rounded transition-colors ${
            sheetConfig.showGrid !== false ? 'bg-cyan-600/80 text-white' : 'text-slate-400 hover:bg-slate-800'
          }`}
          title={`Show/Hide Grid: ${sheetConfig.showGrid !== false ? 'ON' : 'OFF'}`}
        >
          <Eye className="w-3.5 h-3.5" />
        </button>

        {/* Grid Snap Toggle */}
        <button
          data-testid="toggle-grid-snap"
          onClick={() => onUpdateSheetConfig({ snapToGrid: !sheetConfig.snapToGrid })}
          className={`p-1 rounded transition-colors ${
            sheetConfig.snapToGrid ? 'bg-emerald-600/80 text-white' : 'text-slate-400 hover:bg-slate-800'
          }`}
          title={`Snap to Grid: ${sheetConfig.snapToGrid ? 'ON' : 'OFF'}`}
        >
          <GridIcon className="w-3.5 h-3.5" />
        </button>
        <button
          data-testid="toggle-snap"
          onClick={() => onUpdateSheetConfig({ snapToGrid: !sheetConfig.snapToGrid })}
          className="hidden"
          aria-hidden="true"
        />

        {/* Sheet Theme Toggle (Dark Blueprint / Eye-Comfort Light Paper) */}
        <button
          data-testid="toggle-sheet-theme"
          onClick={() => onUpdateSheetConfig({ theme: sheetConfig.theme === 'dark' ? 'light' : 'dark' })}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={`Theme: ${sheetConfig.theme === 'dark' ? 'Dark Blueprint' : 'Eye-Comfort Warm Light Paper'}`}
        >
          {sheetConfig.theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-cyan-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
        </button>
      </div>

      {/* 5. View & Export Group: Zoom & Export Dropdown */}
      <div className="flex items-center gap-1 shrink-0">
        <div className="w-[1px] h-4 bg-slate-800 mx-1" />

        <button
          data-testid="action-zoom-out"
          onClick={onZoomOut}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          data-testid="action-zoom-reset"
          onClick={onZoomReset}
          className="font-mono text-[10px] text-slate-300 px-1 hover:text-emerald-400"
          title="Reset Zoom to 100%"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          data-testid="action-zoom-in"
          onClick={onZoomIn}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          data-testid="action-zoom-fit"
          onClick={onZoomFit}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Zoom to Fit Sheet"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            data-testid="action-export-menu"
            onClick={() => setShowExportMenu((prev) => !prev)}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded flex items-center gap-1 text-[11px] font-mono border border-slate-700 transition-colors ml-1"
            title="Export Schematic"
          >
            <Download className="w-3 h-3 text-cyan-400" />
            <span>Export</span>
          </button>

          {showExportMenu && (
            <div className="absolute right-0 top-8 bg-slate-900 border border-slate-700 rounded-md p-1 shadow-2xl z-50 flex flex-col gap-1 w-36 text-[10px] font-mono">
              <button
                data-testid="export-svg-btn"
                onClick={() => {
                  onExportSvg();
                  setShowExportMenu(false);
                }}
                className="px-2 py-1 rounded text-left text-slate-200 hover:bg-slate-800 hover:text-cyan-400 flex items-center gap-1.5"
              >
                <Download className="w-3 h-3" /> Standalone SVG
              </button>
              <button
                data-testid="export-png-btn"
                onClick={() => {
                  onExportPng();
                  setShowExportMenu(false);
                }}
                className="px-2 py-1 rounded text-left text-slate-200 hover:bg-slate-800 hover:text-emerald-400 flex items-center gap-1.5"
              >
                <Download className="w-3 h-3" /> High-Res PNG (2x)
              </button>
              <button
                data-testid="export-print-btn"
                onClick={() => {
                  onPrintPdf();
                  setShowExportMenu(false);
                }}
                className="px-2 py-1 rounded text-left text-slate-200 hover:bg-slate-800 hover:text-amber-400 flex items-center gap-1.5"
              >
                <Printer className="w-3 h-3" /> Print / PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
