'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  COMPONENT_CATALOG,
  ComponentTemplate,
  createComponentInstance,
} from '@/modules/engineering-lab/circuit-engine/component-catalog';
import { CircuitComponent } from '@/modules/engineering-lab/types';
import {
  Search,
  Plus,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

interface ComponentBrowserProps {
  onAddComponent: (comp: CircuitComponent) => void;
  existingComponents?: CircuitComponent[];
  isOpen: boolean;
  onToggleOpen: () => void;
  width?: number;
  onWidthChange?: (width: number) => void;
}

// Compact IEEE Schematic Symbol Preview for EDA Library Grid
function LibrarySymbolGlyph({ type }: { type: string; symbolSvg?: string }) {
  const stroke = '#34D399';
  const fill = '#0F172A';

  switch (type) {
    case 'RESISTOR':
      return (
        <svg viewBox="-25 -10 50 20" className="w-9 h-5">
          <path d="M -22,0 L -14,0 L -10,-6 L -4,6 L 2,-6 L 8,6 L 14,0 L 22,0" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'POTENTIOMETER':
      return (
        <svg viewBox="-25 -15 50 30" className="w-9 h-6">
          <path d="M -22,0 L -14,0 L -10,-5 L -4,5 L 2,-5 L 8,5 L 14,0 L 22,0" fill="none" stroke={stroke} strokeWidth="1.6" />
          <path d="M 0,10 L 0,2 M -3,5 L 0,2 L 3,5" fill="none" stroke="#F59E0B" strokeWidth="1.6" />
        </svg>
      );
    case 'CAPACITOR':
      return (
        <svg viewBox="-20 -12 40 24" className="w-9 h-5">
          <line x1="-16" y1="0" x2="-5" y2="0" stroke={stroke} strokeWidth="1.8" />
          <line x1="-5" y1="-9" x2="-5" y2="9" stroke={stroke} strokeWidth="2" />
          <line x1="5" y1="-9" x2="5" y2="9" stroke={stroke} strokeWidth="2" />
          <line x1="5" y1="0" x2="16" y2="0" stroke={stroke} strokeWidth="1.8" />
        </svg>
      );
    case 'INDUCTOR':
      return (
        <svg viewBox="-22 -10 44 20" className="w-9 h-5">
          <path d="M -20,0 L -14,0 A 3.5,3.5 0 0,1 -7,0 A 3.5,3.5 0 0,1 0,0 A 3.5,3.5 0 0,1 7,0 A 3.5,3.5 0 0,1 14,0 L 20,0" fill="none" stroke={stroke} strokeWidth="1.8" />
        </svg>
      );
    case 'DIODE':
    case 'ZENER_DIODE':
    case 'SCHOTTKY_DIODE':
      return (
        <svg viewBox="-20 -10 40 20" className="w-9 h-5">
          <line x1="-16" y1="0" x2="-6" y2="0" stroke={stroke} strokeWidth="1.5" />
          <polygon points="-6,-7 6,0 -6,7" fill={fill} stroke={stroke} strokeWidth="1.6" />
          <line x1="6" y1="-7" x2="6" y2="7" stroke={stroke} strokeWidth="2" />
          <line x1="6" y1="0" x2="16" y2="0" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'LED':
    case 'LED_RGB':
      return (
        <svg viewBox="-20 -12 40 24" className="w-9 h-6">
          <line x1="-16" y1="0" x2="-6" y2="0" stroke="#EF4444" strokeWidth="1.5" />
          <polygon points="-6,-6 6,0 -6,6" fill="#EF4444" stroke="#EF4444" strokeWidth="1.6" />
          <line x1="6" y1="-6" x2="6" y2="6" stroke="#EF4444" strokeWidth="2" />
          <line x1="6" y1="0" x2="16" y2="0" stroke="#EF4444" strokeWidth="1.5" />
          <path d="M 2,-7 L 8,-12 M 7,-12 L 8,-12 L 8,-10" fill="none" stroke="#F59E0B" strokeWidth="1.2" />
        </svg>
      );
    case 'BJT_NPN':
    case 'BJT_PNP':
      return (
        <svg viewBox="-15 -15 30 30" className="w-7 h-7">
          <circle cx="0" cy="0" r="12" fill={fill} stroke={stroke} strokeWidth="1.2" />
          <line x1="-6" y1="-8" x2="-6" y2="8" stroke={stroke} strokeWidth="2" />
          <line x1="-12" y1="0" x2="-6" y2="0" stroke={stroke} strokeWidth="1.5" />
          <line x1="-6" y1="-4" x2="7" y2="-10" stroke={stroke} strokeWidth="1.5" />
          <line x1="-6" y1="4" x2="7" y2="10" stroke={stroke} strokeWidth="1.5" />
          <polygon points="7,10 2,7 4,11" fill={stroke} />
        </svg>
      );
    case 'MOSFET_N':
    case 'MOSFET_P':
      return (
        <svg viewBox="-15 -15 30 30" className="w-7 h-7">
          <circle cx="0" cy="0" r="12" fill={fill} stroke={stroke} strokeWidth="1.2" />
          <line x1="-6" y1="-7" x2="-6" y2="7" stroke={stroke} strokeWidth="2" />
          <line x1="-2" y1="-8" x2="-2" y2="-3" stroke={stroke} strokeWidth="1.5" />
          <line x1="-2" y1="-1" x2="-2" y2="1" stroke={stroke} strokeWidth="1.5" />
          <line x1="-2" y1="3" x2="-2" y2="8" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'GROUND':
    case 'GND':
      return (
        <svg viewBox="-12 -8 24 20" className="w-6 h-5">
          <line x1="0" y1="-6" x2="0" y2="2" stroke={stroke} strokeWidth="2" />
          <line x1="-9" y1="2" x2="9" y2="2" stroke={stroke} strokeWidth="2" />
          <line x1="-6" y1="6" x2="6" y2="6" stroke={stroke} strokeWidth="1.6" />
          <line x1="-3" y1="10" x2="3" y2="10" stroke={stroke} strokeWidth="1.2" />
        </svg>
      );
    case 'DC_VOLTAGE':
    case 'BATTERY':
      return (
        <svg viewBox="-15 -10 30 20" className="w-7 h-5">
          <line x1="0" y1="-9" x2="0" y2="-3" stroke={stroke} strokeWidth="1.5" />
          <line x1="-8" y1="-3" x2="8" y2="-3" stroke="#10B981" strokeWidth="2" />
          <line x1="-4" y1="3" x2="4" y2="3" stroke={stroke} strokeWidth="3" />
          <line x1="0" y1="3" x2="0" y2="9" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
    case 'SWITCH_SPST':
    case 'PUSHBUTTON':
      return (
        <svg viewBox="-15 -10 30 20" className="w-7 h-5">
          <circle cx="-9" cy="0" r="2" fill="none" stroke={stroke} strokeWidth="1.5" />
          <circle cx="9" cy="0" r="2" fill="none" stroke={stroke} strokeWidth="1.5" />
          <line x1="-7" y1="-2" x2="6" y2="-7" stroke="#F59E0B" strokeWidth="1.8" />
        </svg>
      );
    default:
      // Generic IC / MCU box
      return (
        <svg viewBox="-16 -12 32 24" className="w-8 h-6">
          <rect x="-12" y="-9" width="24" height="18" rx="2" fill={fill} stroke={stroke} strokeWidth="1.5" />
          <path d="M -15,-6 L -12,-6 M -15,0 L -12,0 M -15,6 L -12,6 M 12,-6 L 15,-6 M 12,0 L 15,0 M 12,6 L 15,6" stroke="#94A3B8" strokeWidth="1.2" />
        </svg>
      );
  }
}

export function ComponentBrowser({
  onAddComponent,
  existingComponents,
  isOpen,
  onToggleOpen,
  width = 300,
  onWidthChange,
}: ComponentBrowserProps) {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [customCatalog, setCustomCatalog] = useState<ComponentTemplate[]>([]);
  const isResizingRef = useRef(false);

  // Load custom library
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ei_lab_user_custom_library');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setCustomCatalog(parsed);
      }
    } catch {}
  }, []);

  // Panel resize listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !onWidthChange) return;
      const newWidth = Math.max(260, Math.min(500, e.clientX));
      onWidthChange(newWidth);
    };
    const handleMouseUp = () => {
      isResizingRef.current = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onWidthChange]);

  const allTemplates = useMemo(() => {
    return [...COMPONENT_CATALOG, ...customCatalog];
  }, [customCatalog]);

  // Clean deduped electrical types for the component browser
  const displayTemplates = useMemo(() => {
    // Filter by single category dropdown
    let list = allTemplates.filter((item) => {
      if (selectedGroup === 'all') return true;
      if (selectedGroup === 'passives') {
        return item.category === 'passive';
      }
      if (selectedGroup === 'semiconductors') {
        return (
          ['semiconductors', 'active'].includes(item.category) ||
          ['DIODE', 'ZENER_DIODE', 'SCHOTTKY_DIODE', 'LED', 'LED_RGB', 'BJT_NPN', 'BJT_PNP', 'MOSFET_N', 'MOSFET_P'].includes(item.type)
        );
      }
      if (selectedGroup === 'mcus') {
        return item.category === 'microcontrollers' || item.subCategory?.includes('mcu');
      }
      if (selectedGroup === 'logic') {
        return (
          ['analog_ics', 'digital_logic', 'logic'].includes(item.category) ||
          ['TIMER_555', 'OPAMP', 'OPAMP_DUAL', 'LOGIC_AND', 'LOGIC_OR', 'LOGIC_NOT', 'LOGIC_NAND', 'LOGIC_NOR', 'LOGIC_XOR'].includes(item.type)
        );
      }
      if (selectedGroup === 'sensors') {
        return ['sensors', 'actuators', 'displays'].includes(item.category);
      }
      if (selectedGroup === 'power') {
        return ['sources', 'power', 'switches', 'connectors', 'relays_contactors', 'protection'].includes(item.category);
      }
      return true;
    });

    // Filter by search query
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q) ||
          item.defaultValue.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.manufacturerPartNumber && item.manufacturerPartNumber.toLowerCase().includes(q))
      );
    }

    // Deduplicate duplicate fixed resistors & duplicate capacitors to prevent visual clutter
    const seenTypes = new Set<string>();
    const deduped: ComponentTemplate[] = [];

    list.forEach((item) => {
      // If user is searching specifically for an MPN or value, don't deduplicate
      if (q) {
        deduped.push(item);
        return;
      }

      // Group identical types together into clean component types
      const key = `${item.type}_${item.subCategory || ''}`;
      if (['RESISTOR', 'CAPACITOR'].includes(item.type)) {
        if (!seenTypes.has(key)) {
          seenTypes.add(key);
          deduped.push(item);
        }
      } else {
        deduped.push(item);
      }
    });

    return deduped;
  }, [allTemplates, selectedGroup, search]);

  const handleAdd = (template: ComponentTemplate) => {
    const randomOffset = () => Math.floor(Math.random() * 60) - 30;
    const instance = createComponentInstance(template, 350 + randomOffset(), 250 + randomOffset(), existingComponents);
    onAddComponent(instance);
    toast.success(`Placed ${instance.designator || instance.label}`);
  };

  if (!isOpen) return null;

  return (
    <aside
      style={{ width }}
      className="h-full bg-[#08101E] border-r border-slate-800 flex flex-col relative select-none z-20 shrink-0 text-slate-200"
    >
      {/* Header */}
      <div className="h-10 border-b border-slate-800/80 px-3 flex items-center justify-between bg-slate-900/70">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-xs font-bold tracking-tight text-white uppercase">
            Component Library
          </span>
          <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold">
            {displayTemplates.length}
          </span>
        </div>

        <button
          onClick={onToggleOpen}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          title="Collapse Panel (B)"
        >
          ✕
        </button>
      </div>

      {/* STEP 1: SINGLE CLEAN, MULTI-FUNCTIONAL FILTER BAR */}
      <div className="p-2 border-b border-slate-800/80 bg-slate-900/40 space-y-1.5">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search parts, type, MPN..."
            className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-7 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs leading-none"
            >
              ✕
            </button>
          )}
        </div>

        {/* Single Clean Category Dropdown */}
        <div className="relative">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full appearance-none bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-md px-2.5 py-1 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer pr-7"
          >
            <option value="all">⚡ All Categories</option>
            <option value="passives">📐 Passives (Resistors, Caps, Inductors)</option>
            <option value="semiconductors">🔬 Active &amp; Semiconductors (Diodes, BJTs, FETs)</option>
            <option value="mcus">💻 Microcontrollers &amp; Boards (Mega 2560, Uno, ESP32)</option>
            <option value="logic">🔲 Digital Logic &amp; Analog ICs (Gates, 555, OpAmps)</option>
            <option value="sensors">📡 Sensors &amp; Displays (LDR, Ultrasonic, LCD)</option>
            <option value="power">⚡ Power &amp; Connectors (Batt, VCC, Regulators, Relays)</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* STEP 1: PRO EDA COMPACT 2-COLUMN GRID DISPLAY */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-800">
        {displayTemplates.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-500 font-mono space-y-2">
            <div>No components matching active search &amp; filter.</div>
            <button
              onClick={() => {
                setSearch('');
                setSelectedGroup('all');
              }}
              className="text-emerald-400 hover:underline text-[11px]"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {displayTemplates.map((item) => {
              const shortName = item.name
                .replace(/\(ATmega2560\)/gi, '')
                .replace(/\(ATmega328P\)/gi, '')
                .replace(/R3|V3/gi, '')
                .replace(/\s+/g, ' ')
                .trim();

              return (
                <div
                  key={item.type + item.name}
                  onClick={() => handleAdd(item)}
                  className="group bg-slate-900/70 hover:bg-slate-800/90 border border-slate-800/80 hover:border-emerald-500/70 rounded-lg p-2 transition-all flex flex-col justify-between gap-1 shadow-sm cursor-pointer select-none relative"
                  title={`${item.name} (${item.defaultValue}) — Click to place on schematic`}
                >
                  {/* Top: IEEE Vector Symbol Glyph */}
                  <div className="h-7 w-full flex items-center justify-center bg-slate-950/60 rounded border border-slate-800/60 group-hover:border-emerald-500/40 transition-colors">
                    <LibrarySymbolGlyph symbolSvg={item.symbolSvg} type={item.type} />
                  </div>

                  {/* Middle: Short Name & Default Value */}
                  <div className="min-w-0">
                    <h4 className="text-[11px] font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors truncate">
                      {shortName}
                    </h4>
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mt-0.5">
                      <span className="text-emerald-400 font-semibold truncate max-w-[65px]">
                        {item.defaultValue}
                      </span>
                      <span className="text-slate-500 uppercase">{item.packageType || 'THT'}</span>
                    </div>
                  </div>

                  {/* Subtle hover plus badge */}
                  <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-600 text-white rounded p-0.5">
                    <Plus className="w-2.5 h-2.5" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Status Bar */}
      <div className="p-2 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <span>{displayTemplates.length} distinct types</span>
        <span className="text-slate-500">Click to place</span>
      </div>

      {/* Draggable Resize Handle */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          isResizingRef.current = true;
        }}
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-emerald-500/60 active:bg-emerald-500 transition-colors z-30"
        title="Drag to resize library panel"
      />
    </aside>
  );
}
