'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  COMPONENT_CATALOG,
  ComponentTemplate,
  createComponentInstance,
} from '@/modules/engineering-lab/circuit-engine/component-catalog';
import { CircuitComponent, ComponentCategory } from '@/modules/engineering-lab/types';
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  Box,
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

export function ComponentBrowser({
  onAddComponent,
  existingComponents,
  isOpen,
  onToggleOpen,
  width = 288,
  onWidthChange,
}: ComponentBrowserProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ComponentCategory | 'all'>('all');
  const [customCatalog, setCustomCatalog] = useState<ComponentTemplate[]>([]);
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);

  // Custom component form state
  const [customName, setCustomName] = useState('');
  const [customValue, setCustomValue] = useState('10k');
  const [customCategory, setCustomCategory] = useState<ComponentCategory>('passive');
  const [customPinCount, setCustomPinCount] = useState(2);

  // Drag-to-resize panel
  const isResizingRef = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !onWidthChange) return;
      const newWidth = Math.max(220, Math.min(500, e.clientX));
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

  const allTemplates = [...COMPONENT_CATALOG, ...customCatalog];

  const filteredComponents = allTemplates.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.type.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.defaultValue.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAdd = (template: ComponentTemplate) => {
    const randomOffset = () => Math.floor(Math.random() * 80) - 40;
    const instance = createComponentInstance(template, 350 + randomOffset(), 250 + randomOffset(), existingComponents);
    onAddComponent(instance);
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      toast.error('Please enter component name');
      return;
    }

    const typeKey = `CUSTOM_${customName.replace(/\s+/g, '_').toUpperCase()}`;
    const pins = [];
    for (let i = 1; i <= customPinCount; i++) {
      pins.push({
        id: String(i),
        name: `P${i}`,
        x: i === 1 ? -30 : i === 2 ? 30 : (i % 2 === 0 ? 30 : -30),
        y: (Math.floor((i - 1) / 2) - 1) * 20,
        pinType: 'passive' as const,
      });
    }

    const newTemplate: ComponentTemplate = {
      type: typeKey,
      name: customName.trim(),
      designatorPrefix: 'U_CUST',
      category: customCategory,
      defaultValue: customValue.trim(),
      defaultParams: { value: customValue.trim() },
      pins,
      footprint: 'Package_DIP:DIP-8_W7.62mm',
      model3d: 'dip8_integrated_circuit',
      width: 70,
      height: 50,
      symbolSvg: 'generic_ic',
      description: `Custom user-defined ${customName} component.`,
    };

    setCustomCatalog((prev) => [...prev, newTemplate]);
    setIsAddCustomOpen(false);
    setCustomName('');
    toast.success(`Registered custom component: ${newTemplate.name}`);
  };

  // COLLAPSED DOCK TAB: ALWAYS ACCESSIBLE & VISIBLE
  if (!isOpen) {
    return (
      <div className="relative z-30 shrink-0">
        <button
          onClick={onToggleOpen}
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-[#0B1528] hover:bg-slate-800 border-y border-r border-slate-700 text-slate-300 hover:text-white py-3 px-2 rounded-r-lg shadow-2xl transition-all flex flex-col items-center gap-2 group cursor-pointer"
          title="Open Component Library (Shortcut: B)"
        >
          <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:scale-125 transition-transform" />
          <span className="[writing-mode:vertical-lr] font-mono tracking-widest text-[11px] font-bold uppercase text-slate-300 group-hover:text-emerald-400">
            Components [B]
          </span>
          <Layers className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
        </button>
      </div>
    );
  }

  return (
    <aside
      style={{ width: `${width}px` }}
      className="bg-[#0B1528] border-r border-slate-800 flex flex-col h-full z-20 select-none shadow-2xl relative shrink-0 transition-[width] duration-75"
    >
      {/* Panel Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <h3 className="font-semibold text-xs tracking-wide text-slate-100 uppercase font-mono">
            Component Library
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsAddCustomOpen(true)}
            className="p-1 text-slate-400 hover:text-emerald-400 rounded hover:bg-slate-800 transition-colors"
            title="Create Custom Component"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleOpen}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
            title="Collapse Library (B)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-slate-800/80 bg-slate-900/30">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search (Uno, 555, LM358, 74HC...)"
            className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1 p-2 overflow-x-auto border-b border-slate-800/80 scrollbar-none text-[11px] bg-slate-900/20">
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'passive', label: 'Passive' },
            { id: 'sources', label: 'Sources' },
            { id: 'active', label: 'Active ICs' },
            { id: 'logic', label: 'Logic Gates' },
            { id: 'microcontrollers', label: 'MCUs' },
            { id: 'instruments', label: 'Meters' },
            { id: 'sensors', label: 'Sensors' },
          ] as const
        ).map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2 py-1 rounded font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat.id
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Component Cards List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredComponents.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No components matching &quot;{search}&quot;.
          </div>
        ) : (
          filteredComponents.map((item) => (
            <div
              key={item.type + item.name}
              className="group bg-slate-900/70 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/50 rounded-lg p-2.5 transition-all flex flex-col justify-between gap-1.5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-900/50">
                      {item.defaultValue}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      {item.category}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleAdd(item)}
                  className="bg-emerald-600/80 hover:bg-emerald-500 text-white p-1.5 rounded-md transition-colors opacity-90 group-hover:opacity-100 flex items-center justify-center shrink-0 shadow"
                  title="Add to Schematic Canvas"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-[11px] text-slate-400 leading-tight line-clamp-2">
                {item.description}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Footer Status Bar with Custom Component Action */}
      <div className="p-2 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-[11px] text-slate-400">
        <span>{filteredComponents.length} components</span>
        <button
          onClick={() => setIsAddCustomOpen(true)}
          className="text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 text-[11px]"
        >
          <Sparkles className="w-3 h-3" />
          <span>+ Custom Part</span>
        </button>
      </div>

      {/* Draggable Resize Handle on Right Edge */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          isResizingRef.current = true;
        }}
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-emerald-500/60 active:bg-emerald-500 transition-colors z-30"
        title="Drag to resize panel"
      />

      {/* MODAL: ADD CUSTOM COMPONENT */}
      {isAddCustomOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCustom}
            className="bg-[#0B1528] border border-slate-700 rounded-xl w-full max-w-md shadow-2xl p-5 font-mono text-xs text-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Create Custom Component</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCustomOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Component Name:</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. MCP4725 DAC / Motor Driver"
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Category:</label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value as ComponentCategory)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none"
                >
                  <option value="passive">Passive</option>
                  <option value="active">Active IC</option>
                  <option value="logic">Logic</option>
                  <option value="sensors">Sensor</option>
                  <option value="microcontrollers">MCU</option>
                  <option value="instruments">Instrument</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Pin Count:</label>
                <select
                  value={customPinCount}
                  onChange={(e) => setCustomPinCount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none"
                >
                  <option value={2}>2 Pins</option>
                  <option value={3}>3 Pins</option>
                  <option value={4}>4 Pins</option>
                  <option value={6}>6 Pins</option>
                  <option value={8}>8 Pins (DIP-8)</option>
                  <option value={14}>14 Pins (DIP-14)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Default Value / Model:</label>
              <input
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="e.g. 10k, 5V, I2C"
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddCustomOpen(false)}
                className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                Create Part
              </button>
            </div>
          </form>
        </div>
      )}
    </aside>
  );
}
