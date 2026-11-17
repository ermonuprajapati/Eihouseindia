'use client';

import React, { useState } from 'react';
import {
  COMPONENT_CATALOG,
  ComponentTemplate,
  createComponentInstance,
} from '@/modules/engineering-lab/circuit-engine/component-catalog';
import { CircuitComponent, ComponentCategory } from '@/modules/engineering-lab/types';
import { Search, Plus, ChevronLeft, ChevronRight, Layers } from 'lucide-react';

interface ComponentBrowserProps {
  onAddComponent: (comp: CircuitComponent) => void;
  existingComponents?: CircuitComponent[];
  isOpen: boolean;
  onToggleOpen: () => void;
}

export function ComponentBrowser({ onAddComponent, existingComponents, isOpen, onToggleOpen }: ComponentBrowserProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ComponentCategory | 'all'>('all');

  const filteredComponents = COMPONENT_CATALOG.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.type.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAdd = (template: ComponentTemplate) => {
    // Generate randomized initial position around the canvas center
    const randomOffset = () => Math.floor(Math.random() * 80) - 40;
    const instance = createComponentInstance(template, 350 + randomOffset(), 250 + randomOffset(), existingComponents);
    onAddComponent(instance);
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggleOpen}
        className="absolute left-0 top-1/2 -translate-y-1/2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white p-2 rounded-r-lg shadow-xl z-20 flex items-center gap-1 text-xs"
        title="Open Component Library"
      >
        <ChevronRight className="w-4 h-4" />
        <span className="[writing-mode:vertical-lr] font-mono tracking-wider text-[11px] uppercase">Components</span>
      </button>
    );
  }

  return (
    <aside className="w-72 bg-[#0B1528] border-r border-slate-800 flex flex-col h-full z-20 select-none shadow-2xl">
      {/* Panel Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <h3 className="font-semibold text-xs tracking-wide text-slate-100 uppercase font-mono">Component Library</h3>
        </div>
        <button
          onClick={onToggleOpen}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          title="Collapse Panel"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-slate-800/80">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search parts (e.g. 555, LED, R)..."
            className="w-full bg-slate-900 border border-slate-800 rounded-md pl-8 pr-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1 p-2 overflow-x-auto border-b border-slate-800/80 scrollbar-none text-[11px]">
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'passive', label: 'Passive' },
            { id: 'sources', label: 'Sources' },
            { id: 'active', label: 'Active' },
            { id: 'logic', label: 'Logic' },
            { id: 'microcontrollers', label: 'MCUs' },
          ] as const
        ).map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2 py-1 rounded font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat.id
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Component Grid */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
        {filteredComponents.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">No components match your search.</div>
        ) : (
          filteredComponents.map((item) => (
            <div
              key={item.type}
              onClick={() => handleAdd(item)}
              className="group bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 rounded-lg p-2.5 cursor-pointer transition-all flex items-start justify-between"
            >
              <div className="flex-1 pr-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-slate-200 group-hover:text-emerald-400 transition-colors">
                    {item.name}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{item.description}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[9px] font-mono text-slate-500">
                  <span className="bg-slate-950 px-1 py-0.5 rounded border border-slate-800">{item.defaultValue}</span>
                  <span>{item.footprint}</span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAdd(item);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 bg-emerald-500 text-slate-950 hover:bg-emerald-400 rounded transition-all shadow"
                title="Add to Schematic"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 bg-slate-900/60 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
        <span>{filteredComponents.length} parts available</span>
        <span className="font-mono text-emerald-400">Click to place</span>
      </div>
    </aside>
  );
}
