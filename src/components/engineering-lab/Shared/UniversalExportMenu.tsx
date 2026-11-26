'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  ChevronDown,
  Layers,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Save,
  Upload,
  Printer,
} from 'lucide-react';
import type { UniversalExportFormat } from '@/modules/engineering-lab/export-engine/universal-exporter';

export interface UniversalExportMenuProps {
  onExport: (format: UniversalExportFormat) => void;
  onSaveProject?: () => void;
  onTriggerImport?: () => void;
  onPrint?: () => void;
  activeMode?: string;
  testIdPrefix?: string;
  buttonClassName?: string;
  buttonText?: string;
  buttonTitle?: string;
  align?: 'left' | 'right';
}

export function UniversalExportMenu({
  onExport,
  onSaveProject,
  onTriggerImport,
  onPrint,
  activeMode = 'schematic',
  testIdPrefix = '',
  buttonClassName,
  buttonText = 'Export',
  buttonTitle = 'Universal Export Options',
  align = 'right',
}: UniversalExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left?: number; right?: number }>({
    top: 48,
    right: 12,
  });

  const pfx = testIdPrefix ? `${testIdPrefix}-` : '';

  // Calculate unclipped fixed position based on button bounding rect
  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 290;
    const padding = 8;

    const top = Math.min(rect.bottom + 4, window.innerHeight - 300);

    if (align === 'left') {
      const left = Math.min(Math.max(padding, rect.left), window.innerWidth - menuWidth - padding);
      setMenuPos({ top, left });
    } else {
      const right = Math.min(Math.max(padding, window.innerWidth - rect.right), window.innerWidth - menuWidth - padding);
      setMenuPos({ top, right });
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    updatePosition();
    setIsOpen((prev) => !prev);
  };

  // Close on outside click, window resize, or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !buttonRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleResize = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleGlobalClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  const handleSelect = (format: UniversalExportFormat) => {
    setIsOpen(false);
    onExport(format);
  };

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        data-testid={`${pfx}action-export-menu`}
        onClick={handleToggle}
        className={
          buttonClassName ||
          'h-8 px-2.5 flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold shadow-sm transition-colors border border-emerald-500/50 cursor-pointer'
        }
        title={buttonTitle}
      >
        <Download className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
        <span>{buttonText}</span>
        <ChevronDown className="w-3 h-3 text-emerald-200 shrink-0" />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          data-testid={`${pfx}export-dropdown-menu`}
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left !== undefined ? `${menuPos.left}px` : undefined,
            right: menuPos.right !== undefined ? `${menuPos.right}px` : undefined,
            zIndex: 9999,
          }}
          className="w-72 max-w-[calc(100vw-1rem)] max-h-[82vh] overflow-y-auto bg-[#0B1528] border border-slate-700/90 rounded-xl shadow-2xl p-2 font-sans text-xs text-slate-200 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 ring-1 ring-white/10 space-y-1"
          onClick={(e) => e.stopPropagation()}
        >
          {/* SECTION 1: PCB MANUFACTURING (JLCPCB / PCBWAY) */}
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between border-b border-slate-800/80">
            <span>PCB Manufacturing</span>
            <span className="text-[9px] font-mono bg-amber-950/80 text-amber-300 px-1.5 py-0.2 rounded border border-amber-800/50">
              JLCPCB / PCBWay
            </span>
          </div>

          <button
            type="button"
            data-testid={`${pfx}export-gerber-btn`}
            onClick={() => handleSelect('gerber-zip')}
            className="w-full px-2.5 py-1.5 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-2 group transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2 min-w-0">
              <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-xs truncate">Production Gerber Package</span>
            </span>
            <span className="shrink-0 text-[10px] font-mono text-amber-400 font-bold bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/50">
              .zip
            </span>
          </button>

          <button
            type="button"
            data-testid={`${pfx}export-bom-btn`}
            onClick={() => handleSelect('bom')}
            className="w-full px-2.5 py-1.5 text-left text-slate-300 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-2 group transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2 min-w-0">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-medium text-xs truncate">Bill of Materials (BOM)</span>
            </span>
            <span className="shrink-0 text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
              .csv
            </span>
          </button>

          <button
            type="button"
            data-testid={`${pfx}export-cpl-btn`}
            onClick={() => handleSelect('cpl')}
            className="w-full px-2.5 py-1.5 text-left text-slate-300 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-2 group transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2 min-w-0">
              <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="font-medium text-xs truncate">Pick &amp; Place Centroids (CPL)</span>
            </span>
            <span className="shrink-0 text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
              .csv
            </span>
          </button>

          {/* SECTION 2: CURRENT VIEW (CIRCUIT ONLY - NO UI) */}
          <div className="pt-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center justify-between border-t border-slate-800/80">
            <span>Visual Circuit Export</span>
            <span className="text-[9px] text-slate-400 font-normal">Circuit Only</span>
          </div>

          <button
            type="button"
            data-testid={`${pfx}export-pdf-btn`}
            onClick={() => handleSelect('pdf')}
            className="w-full px-2.5 py-1.5 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-2 group transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2 min-w-0">
              <FileText className="w-3.5 h-3.5 text-red-400 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-xs truncate">PDF Document (Vector A4)</span>
            </span>
            <span className="shrink-0 text-[10px] font-mono text-red-400/90 font-bold bg-red-950/80 px-1.5 py-0.5 rounded border border-red-800/50">
              .pdf
            </span>
          </button>

          <button
            type="button"
            data-testid={`${pfx}export-png-btn`}
            onClick={() => handleSelect('png')}
            className="w-full px-2.5 py-1.5 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-2 group transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2 min-w-0">
              <ImageIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="font-medium text-xs truncate">High-Resolution Snapshot</span>
            </span>
            <span className="shrink-0 text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
              .png
            </span>
          </button>

          <button
            type="button"
            data-testid={`${pfx}export-jpg-btn`}
            onClick={() => handleSelect('jpg')}
            className="w-full px-2.5 py-1.5 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-2 group transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2 min-w-0">
              <ImageIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="font-medium text-xs truncate">Compact Image File</span>
            </span>
            <span className="shrink-0 text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
              .jpg
            </span>
          </button>

          <button
            type="button"
            data-testid={`${pfx}export-svg-btn`}
            onClick={() => handleSelect('svg')}
            className="w-full px-2.5 py-1.5 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-2 group transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2 min-w-0">
              <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="font-medium text-xs truncate">Scalable Vector Graphic</span>
            </span>
            <span className="shrink-0 text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
              .svg
            </span>
          </button>

          {onPrint && (
            <button
              type="button"
              data-testid={`${pfx}export-print-btn`}
              onClick={() => {
                setIsOpen(false);
                onPrint();
              }}
              className="w-full px-2.5 py-1.5 text-left text-slate-300 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-2 group transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 min-w-0">
                <Printer className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-medium text-xs truncate">Print Sheet Dialog</span>
              </span>
              <span className="shrink-0 text-[10px] font-mono text-slate-500">Print</span>
            </button>
          )}

          {/* SECTION 3: LOCAL SAVE & RE-IMPORT */}
          <div className="pt-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between border-t border-slate-800/80">
            <span>Project File</span>
            <span className="text-[9px] text-slate-400 font-normal">Save &amp; Load</span>
          </div>

          <button
            type="button"
            data-testid={`${pfx}export-eihouse-btn`}
            onClick={() => {
              if (onSaveProject) {
                setIsOpen(false);
                onSaveProject();
              } else {
                handleSelect('eihouse');
              }
            }}
            className="w-full px-2.5 py-1.5 text-left text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-lg flex items-center justify-between gap-2 group transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2 min-w-0">
              <Save className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-medium text-xs truncate">Save Local Project</span>
            </span>
            <span className="shrink-0 text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/50 font-bold">
              Ctrl+S
            </span>
          </button>

          {onTriggerImport && (
            <button
              type="button"
              data-testid={`${pfx}action-import-btn`}
              onClick={() => {
                setIsOpen(false);
                onTriggerImport();
              }}
              className="w-full px-2.5 py-1.5 text-left text-emerald-400 hover:bg-emerald-950/60 hover:text-emerald-300 rounded-lg flex items-center justify-between gap-2 group transition-colors border border-emerald-500/25 mt-0.5 cursor-pointer"
            >
              <span className="flex items-center gap-2 min-w-0">
                <Upload className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-medium text-xs truncate">Import Project File...</span>
              </span>
              <span className="shrink-0 text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/40">
                Open
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
