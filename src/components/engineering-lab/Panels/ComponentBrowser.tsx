'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  COMPONENT_CATALOG,
  ComponentTemplate,
  createComponentInstance,
} from '@/modules/engineering-lab/circuit-engine/component-catalog';
import { CircuitComponent, ComponentCategory, SimulationSupportStatus } from '@/modules/engineering-lab/types';
import {
  Search,
  Plus,
  ChevronRight,
  Sparkles,
  Box,
  Download,
  Upload,
  Cpu,
  SlidersHorizontal,
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
  width = 300,
  onWidthChange,
}: ComponentBrowserProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ComponentCategory | 'all'>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<SimulationSupportStatus | 'all'>('all');
  const [customCatalog, setCustomCatalog] = useState<ComponentTemplate[]>([]);
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);

  // Custom component form state
  const [customName, setCustomName] = useState('');
  const [customValue, setCustomValue] = useState('10k');
  const [customCategory, setCustomCategory] = useState<ComponentCategory>('passive');
  const [customSubCategory, setCustomSubCategory] = useState('');
  const [customPinCount, setCustomPinCount] = useState(2);
  const [customPackage, setCustomPackage] = useState<'THT' | 'SMD' | 'Module'>('THT');
  const [customStatus, setCustomStatus] = useState<SimulationSupportStatus>('full_mna');

  // Drag-to-resize panel
  const isResizingRef = useRef(false);

  // Load custom library from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ei_lab_user_custom_library');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCustomCatalog(parsed);
        }
      }
    } catch {}
  }, []);

  // Save custom library to localStorage when updated
  const saveCustomCatalog = (updated: ComponentTemplate[]) => {
    setCustomCatalog(updated);
    try {
      localStorage.setItem('ei_lab_user_custom_library', JSON.stringify(updated));
    } catch {}
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !onWidthChange) return;
      const newWidth = Math.max(240, Math.min(550, e.clientX));
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

  // Dynamic available subcategories based on selected category
  const availableSubCategories = Array.from(
    new Set(
      allTemplates
        .filter((t) => selectedCategory === 'all' || t.category === selectedCategory)
        .map((t) => t.subCategory)
        .filter((s): s is string => Boolean(s))
    )
  );

  const filteredComponents = allTemplates.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSubCategory = selectedSubCategory === 'all' || item.subCategory === selectedSubCategory;
    const matchesStatus = selectedStatus === 'all' || item.simulationStatus === selectedStatus;
    const q = search.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.defaultValue.toLowerCase().includes(q) ||
      (item.subCategory && item.subCategory.toLowerCase().includes(q)) ||
      (item.manufacturerPartNumber && item.manufacturerPartNumber.toLowerCase().includes(q));

    return matchesCategory && matchesSubCategory && matchesStatus && matchesSearch;
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
      subCategory: customSubCategory.trim() || undefined,
      simulationStatus: customStatus,
      packageType: customPackage,
      defaultValue: customValue.trim(),
      defaultParams: { value: customValue.trim() },
      pins,
      footprint: customPackage === 'SMD' ? 'Package_SO:SOIC-8_3.9x4.9mm_P1.27mm' : 'Package_DIP:DIP-8_W7.62mm',
      model3d: 'dip8_integrated_circuit',
      width: 70,
      height: 50,
      symbolSvg: 'generic_ic',
      description: `User-defined custom component: ${customName}.`,
    };

    saveCustomCatalog([...customCatalog, newTemplate]);
    setIsAddCustomOpen(false);
    setCustomName('');
    toast.success(`Registered & saved custom component: ${newTemplate.name}`);
  };

  const handleExportCustomLibrary = () => {
    if (customCatalog.length === 0) {
      toast.info('No custom components to export');
      return;
    }
    const blob = new Blob([JSON.stringify(customCatalog, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ei_house_custom_library_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Custom library exported to JSON');
  };

  const handleImportCustomLibrary = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (Array.isArray(parsed)) {
          saveCustomCatalog([...customCatalog, ...parsed]);
          toast.success(`Imported ${parsed.length} custom components`);
        }
      } catch {
        toast.error('Invalid custom library JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // COLLAPSED DOCK TAB
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
          <Cpu className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
        </button>
      </div>
    );
  }

  return (
    <aside
      style={{ width: `${width}px` }}
      className="bg-[#0B1528] border-r border-slate-800 flex flex-col h-full z-20 select-none shadow-2xl text-slate-200 relative shrink-0 transition-[width] duration-75"
    >
      {/* Panel Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <div>
            <h3 className="font-semibold text-xs tracking-wider text-slate-100 uppercase font-mono">
              Component Library
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              {filteredComponents.length} of {allTemplates.length} verified devices
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleExportCustomLibrary}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
            title="Export Custom Library JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <label className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer" title="Import Custom Library JSON">
            <Upload className="w-3.5 h-3.5" />
            <input type="file" accept=".json" onChange={handleImportCustomLibrary} className="hidden" />
          </label>
          <button
            onClick={onToggleOpen}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors ml-1"
            title="Collapse Panel (B)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-2.5 border-b border-slate-800/80 bg-slate-900/30 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search parts, values, MPN, specs..."
            className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        {/* Simulation Status Filter */}
        <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-mono scrollbar-none pb-0.5">
          <SlidersHorizontal className="w-3 h-3 text-slate-500 shrink-0 mr-1" />
          {[
            { id: 'all', label: 'All Status' },
            { id: 'full_mna', label: 'SPICE MNA' },
            { id: 'transpiled_mcu', label: 'MCU VM' },
            { id: 'behavioral', label: 'Behavioral' },
            { id: 'design_only', label: 'CAD Only' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedStatus(st.id as SimulationSupportStatus | 'all')}
              className={`px-1.5 py-0.5 rounded whitespace-nowrap transition-colors ${
                selectedStatus === st.id
                  ? 'bg-cyan-900/80 text-cyan-200 border border-cyan-700/60 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Category Filter Tabs */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-800 overflow-x-auto text-[11px] font-mono scrollbar-none bg-slate-950/40">
        {[
          { id: 'all', label: 'All' },
          { id: 'passive', label: 'Passives' },
          { id: 'sources', label: 'Power' },
          { id: 'active', label: 'Semiconductors' },
          { id: 'logic', label: 'Digital Logic' },
          { id: 'microcontrollers', label: 'MCUs' },
          { id: 'sensors', label: 'Sensors' },
          { id: 'displays', label: 'Displays' },
          { id: 'actuators', label: 'Actuators' },
          { id: 'connectors', label: 'Connectors' },
          { id: 'instruments', label: 'Instruments' },
          { id: 'industrial', label: 'Industrial' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setSelectedCategory(cat.id as ComponentCategory | 'all');
              setSelectedSubCategory('all');
            }}
            className={`px-2 py-1 rounded font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat.id
                ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Subcategory Pills when specific category selected */}
      {availableSubCategories.length > 0 && selectedCategory !== 'all' && (
        <div className="flex items-center gap-1 px-2.5 py-1.5 border-b border-slate-800/80 bg-slate-900/20 overflow-x-auto text-[10px] font-mono scrollbar-none">
          <button
            onClick={() => setSelectedSubCategory('all')}
            className={`px-1.5 py-0.5 rounded whitespace-nowrap transition-colors ${
              selectedSubCategory === 'all'
                ? 'bg-slate-700 text-emerald-300 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Subcategories
          </button>
          {availableSubCategories.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubCategory(sub)}
              className={`px-1.5 py-0.5 rounded whitespace-nowrap transition-colors ${
                selectedSubCategory === sub
                  ? 'bg-slate-700 text-emerald-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sub.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      )}

      {/* Component Cards List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-800">
        {filteredComponents.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-500 font-mono">
            No components matching &quot;{search}&quot;.
          </div>
        ) : (
          filteredComponents.map((item) => (
            <div
              key={item.type + item.name}
              className="group bg-slate-900/60 hover:bg-slate-800/90 border border-slate-800/90 hover:border-emerald-500/60 rounded-lg p-2.5 transition-all flex flex-col justify-between gap-1.5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors truncate">
                      {item.name}
                    </h4>
                    {/* Status Badge */}
                    <span
                      className={`text-[9px] font-mono px-1 py-0.2 rounded border font-semibold ${
                        item.simulationStatus === 'full_mna'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                          : item.simulationStatus === 'transpiled_mcu'
                          ? 'bg-blue-950/80 text-blue-300 border-blue-800/60'
                          : item.simulationStatus === 'behavioral'
                          ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                          : 'bg-purple-950/80 text-purple-300 border-purple-800/60'
                      }`}
                      title={`Simulation Engine: ${item.simulationStatus || 'full_mna'}`}
                    >
                      {item.simulationStatus === 'full_mna'
                        ? 'SPICE'
                        : item.simulationStatus === 'transpiled_mcu'
                        ? 'MCU'
                        : item.simulationStatus === 'behavioral'
                        ? 'BEH'
                        : 'CAD'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-900/50">
                      {item.defaultValue}
                    </span>
                    {item.manufacturerPartNumber && (
                      <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/40 px-1 py-0.2 rounded border border-cyan-900/40 truncate max-w-[120px]">
                        {item.manufacturerPartNumber}
                      </span>
                    )}
                    <span className="text-[9px] font-mono text-slate-500 uppercase">
                      {item.packageType || 'THT'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleAdd(item)}
                  className="bg-emerald-600/80 hover:bg-emerald-500 text-white p-1.5 rounded-md transition-colors opacity-90 group-hover:opacity-100 flex items-center justify-center shrink-0 shadow cursor-pointer"
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
      <div className="p-2.5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-[11px] text-slate-400">
        <span className="font-mono">{filteredComponents.length} parts</span>
        <button
          onClick={() => setIsAddCustomOpen(true)}
          className="text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 text-[11px] bg-slate-800/80 px-2 py-1 rounded border border-slate-700 hover:border-emerald-500/50 transition-colors cursor-pointer"
        >
          <Sparkles className="w-3 h-3 text-emerald-400" />
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
                placeholder="e.g. MCP4725 12-Bit DAC / DRV8833 Motor Driver"
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
                  <option value="sources">Power & Sources</option>
                  <option value="active">Semiconductors</option>
                  <option value="logic">Digital Logic</option>
                  <option value="sensors">Sensors</option>
                  <option value="actuators">Actuators</option>
                  <option value="microcontrollers">Microcontrollers</option>
                  <option value="industrial">Industrial</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Subcategory:</label>
                <input
                  type="text"
                  value={customSubCategory}
                  onChange={(e) => setCustomSubCategory(e.target.value)}
                  placeholder="e.g. dac_i2c, motor_hbridge"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
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
                  <option value={16}>16 Pins (DIP-16)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Package:</label>
                <select
                  value={customPackage}
                  onChange={(e) => setCustomPackage(e.target.value as 'THT' | 'SMD' | 'Module')}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none"
                >
                  <option value="THT">THT</option>
                  <option value="SMD">SMD</option>
                  <option value="Module">Module</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Simulation:</label>
                <select
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value as SimulationSupportStatus)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none"
                >
                  <option value="full_mna">SPICE MNA</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="design_only">Design Only</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Default Nominal Value / Part Number:</label>
              <input
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="e.g. 10k, 5V, I2C 0x60"
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddCustomOpen(false)}
                className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
              >
                Save Part to Library
              </button>
            </div>
          </form>
        </div>
      )}
    </aside>
  );
}
