'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  COMPONENT_CATALOG,
  ComponentTemplate,
  createComponentInstance,
} from '@/modules/engineering-lab/circuit-engine/component-catalog';
import {
  CircuitComponent,
  ComponentCategory,
  SimulationSupportStatus,
} from '@/modules/engineering-lab/types';
import {
  Search,
  Plus,
  Box,
  Layers,
  Sparkles,
  Download,
  Upload,
  FileText,
  Filter,
  RotateCcw,
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
  width = 320,
  onWidthChange,
}: ComponentBrowserProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ComponentCategory | 'all'>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<SimulationSupportStatus | 'all'>('all');
  const [selectedPackage, setSelectedPackage] = useState<'all' | 'THT' | 'SMD' | 'Module' | 'Chassis'>('all');
  const [selectedPinCount, setSelectedPinCount] = useState<'all' | '2' | '3' | '4-8' | '9+'>('all');
  const [filterOnly3D, setFilterOnly3D] = useState(false);
  const [filterOnlyDatasheet, setFilterOnlyDatasheet] = useState(false);
  const [filterOnlyCustom, setFilterOnlyCustom] = useState(false);
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'mpn' | 'pins'>('name_asc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [customCatalog, setCustomCatalog] = useState<ComponentTemplate[]>([]);
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);

  // Custom component form state
  const [customName, setCustomName] = useState('');
  const [customValue, setCustomValue] = useState('10k');
  const [customCategory, setCustomCategory] = useState<ComponentCategory>('passive');
  const [customSubCategory, setCustomSubCategory] = useState('');
  const [customPinCount, setCustomPinCount] = useState(2);
  const [customPackage, setCustomPackage] = useState<'THT' | 'SMD' | 'Module' | 'Chassis'>('THT');
  const [customStatus, setCustomStatus] = useState<SimulationSupportStatus>('full_mna');
  const [customPartNumber, setCustomPartNumber] = useState('');
  const [customDatasheet, setCustomDatasheet] = useState('');

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
      const newWidth = Math.max(260, Math.min(600, e.clientX));
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

  // Reset all filters to default
  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedSubCategory('all');
    setSelectedStatus('all');
    setSelectedPackage('all');
    setSelectedPinCount('all');
    setFilterOnly3D(false);
    setFilterOnlyDatasheet(false);
    setFilterOnlyCustom(false);
    setSortBy('name_asc');
  };

  // Filter presets
  const applyPreset = (preset: 'all' | 'industrial' | 'mcu' | 'semiconductors' | 'protection') => {
    handleResetFilters();
    if (preset === 'industrial') {
      setSelectedCategory('industrial');
    } else if (preset === 'mcu') {
      setSelectedCategory('microcontrollers');
    } else if (preset === 'semiconductors') {
      setSelectedCategory('semiconductors');
    } else if (preset === 'protection') {
      setSelectedCategory('protection');
    }
  };

  const filteredComponents = allTemplates
    .filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSubCategory = selectedSubCategory === 'all' || item.subCategory === selectedSubCategory;
      const matchesStatus = selectedStatus === 'all' || item.simulationStatus === selectedStatus;
      const matchesPackage = selectedPackage === 'all' || item.packageType === selectedPackage;

      const pinLen = item.pins.length;
      let matchesPins = true;
      if (selectedPinCount === '2') matchesPins = pinLen === 2;
      else if (selectedPinCount === '3') matchesPins = pinLen === 3;
      else if (selectedPinCount === '4-8') matchesPins = pinLen >= 4 && pinLen <= 8;
      else if (selectedPinCount === '9+') matchesPins = pinLen >= 9;

      const matches3D = !filterOnly3D || Boolean(item.model3d);
      const matchesDatasheet = !filterOnlyDatasheet || Boolean(item.datasheetUrl);
      const isCustomPart = item.type.startsWith('CUSTOM_');
      const matchesCustom = !filterOnlyCustom || isCustomPart;

      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.defaultValue.toLowerCase().includes(q) ||
        (item.subCategory && item.subCategory.toLowerCase().includes(q)) ||
        (item.manufacturerPartNumber && item.manufacturerPartNumber.toLowerCase().includes(q)) ||
        (item.footprint && item.footprint.toLowerCase().includes(q));

      // If active search query matches across categories, allow search to discover components across categories
      const categoryMatch = selectedCategory === 'all' || (q ? (matchesCategory || item.category.toLowerCase().includes(q)) : matchesCategory);

      return (
        categoryMatch &&
        matchesSubCategory &&
        matchesStatus &&
        matchesPackage &&
        matchesPins &&
        matches3D &&
        matchesDatasheet &&
        matchesCustom &&
        matchesSearch
      );
    })
    .sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'mpn') return (a.manufacturerPartNumber || '').localeCompare(b.manufacturerPartNumber || '');
      if (sortBy === 'pins') return a.pins.length - b.pins.length;
      return 0;
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
        x: i === 1 ? -30 : i === 2 ? 30 : i % 2 === 0 ? 30 : -30,
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
      manufacturerPartNumber: customPartNumber.trim() || undefined,
      datasheetUrl: customDatasheet.trim() || undefined,
    };

    saveCustomCatalog([...customCatalog, newTemplate]);
    setIsAddCustomOpen(false);
    setCustomName('');
    toast.success(`Registered custom part: ${newTemplate.name}`);
  };

  const handleExportCustomLibrary = () => {
    if (customCatalog.length === 0) {
      toast.info('No custom components to export');
      return;
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(customCatalog, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `ei_lab_custom_components_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success(`Exported ${customCatalog.length} custom components`);
  };

  const handleImportCustomLibrary = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          const valid = imported.filter((item) => item.type && item.name && Array.isArray(item.pins));
          if (valid.length > 0) {
            const merged = [...customCatalog, ...valid];
            const deduped = merged.filter((item, idx, arr) => arr.findIndex((x) => x.type === item.type) === idx);
            saveCustomCatalog(deduped);
            toast.success(`Successfully imported ${valid.length} custom components`);
          } else {
            toast.error('No valid components found in JSON file');
          }
        }
      } catch {
        toast.error('Invalid component library JSON file');
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <aside
      style={{ width }}
      className="h-full bg-[#08101E] border-r border-slate-800 flex flex-col relative select-none z-20 shrink-0 text-slate-200"
    >
      {/* Header with Title and Import/Export Actions */}
      <div className="h-10 border-b border-slate-800/80 px-3 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-xs font-bold tracking-tight text-white uppercase">
            Component Ecosystem
          </span>
          <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold">
            {allTemplates.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleExportCustomLibrary}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
            title="Export Custom Library JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <label
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
            title="Import Custom Library JSON"
          >
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

      {/* Search Input & Advanced Filter Bar */}
      <div className="p-2 border-b border-slate-800/80 bg-slate-900/30 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search parts, MPN, MCU, category..."
            className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-20 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="p-1 text-slate-400 hover:text-white rounded text-[11px] font-mono leading-none"
                title="Clear Search"
              >
                ✕
              </button>
            )}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`p-1 rounded flex items-center gap-1 text-[10px] font-mono transition-colors ${
                showAdvancedFilters || filterOnly3D || filterOnlyDatasheet || selectedPackage !== 'all'
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/60'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Toggle Advanced Filters"
            >
              <Filter className="w-3 h-3" />
              <span>Filter</span>
            </button>
          </div>
        </div>
        {search && (
          <div className="text-[10px] font-mono text-emerald-400 px-1 flex items-center justify-between">
            <span>Found {filteredComponents.length} matching component{filteredComponents.length === 1 ? '' : 's'}</span>
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-slate-400 hover:text-white underline cursor-pointer"
            >
              Reset Search
            </button>
          </div>
        )}

        {/* Quick Filter Presets */}
        <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-mono scrollbar-none pb-0.5">
          <button
            onClick={() => applyPreset('all')}
            className={`px-1.5 py-0.5 rounded whitespace-nowrap transition-colors ${
              selectedCategory === 'all' && !filterOnly3D && selectedPackage === 'all'
                ? 'bg-slate-700 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Parts
          </button>
          <button
            onClick={() => applyPreset('industrial')}
            className={`px-1.5 py-0.5 rounded whitespace-nowrap transition-colors ${
              selectedCategory === 'industrial' ? 'bg-amber-900/80 text-amber-200 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Industrial & Power
          </button>
          <button
            onClick={() => applyPreset('mcu')}
            className={`px-1.5 py-0.5 rounded whitespace-nowrap transition-colors ${
              selectedCategory === 'microcontrollers' ? 'bg-blue-900/80 text-blue-200 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            MCUs & Boards
          </button>
          <button
            onClick={() => applyPreset('semiconductors')}
            className={`px-1.5 py-0.5 rounded whitespace-nowrap transition-colors ${
              selectedCategory === 'semiconductors' ? 'bg-emerald-900/80 text-emerald-200 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semiconductors
          </button>
          <button
            onClick={() => applyPreset('protection')}
            className={`px-1.5 py-0.5 rounded whitespace-nowrap transition-colors ${
              selectedCategory === 'protection' ? 'bg-rose-900/80 text-rose-200 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Protection Breakers
          </button>
        </div>

        {/* Advanced Filters Expandable Drawer */}
        {showAdvancedFilters && (
          <div className="p-2 bg-slate-950/80 border border-slate-800 rounded-md space-y-2 text-[10px] font-mono">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-0.5">Package Type:</label>
                <select
                  value={selectedPackage}
                  onChange={(e) => setSelectedPackage(e.target.value as 'all' | 'THT' | 'SMD' | 'Module' | 'Chassis')}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-200"
                >
                  <option value="all">All Packages</option>
                  <option value="THT">THT Through-Hole</option>
                  <option value="SMD">SMD Surface-Mount</option>
                  <option value="Module">Dev Module</option>
                  <option value="Chassis">DIN Rail / Chassis</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-0.5">Pin Count:</label>
                <select
                  value={selectedPinCount}
                  onChange={(e) => setSelectedPinCount(e.target.value as 'all' | '2' | '3' | '4-8' | '9+')}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-200"
                >
                  <option value="all">Any Pins</option>
                  <option value="2">2 Pins (Passives, Diodes)</option>
                  <option value="3">3 Pins (BJTs, Sensors)</option>
                  <option value="4-8">4 - 8 Pins (ICs, Relays)</option>
                  <option value="9+">9+ Pins (MCUs, PLCs)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1 flex-wrap">
              <label className="flex items-center gap-1 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterOnly3D}
                  onChange={(e) => setFilterOnly3D(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500"
                />
                <span>3D Model</span>
              </label>

              <label className="flex items-center gap-1 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterOnlyDatasheet}
                  onChange={(e) => setFilterOnlyDatasheet(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500"
                />
                <span>Datasheet</span>
              </label>

              <label className="flex items-center gap-1 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterOnlyCustom}
                  onChange={(e) => setFilterOnlyCustom(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500"
                />
                <span>Custom Parts</span>
              </label>

              <button
                onClick={handleResetFilters}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 ml-auto"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Primary Category Filter Tabs */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-800 overflow-x-auto text-[11px] font-mono scrollbar-none bg-slate-950/40">
        {[
          { id: 'all', label: 'All' },
          { id: 'passive', label: 'Passives' },
          { id: 'sources', label: 'Power' },
          { id: 'semiconductors', label: 'Semiconductors' },
          { id: 'analog_ics', label: 'Analog ICs' },
          { id: 'digital_logic', label: 'Logic' },
          { id: 'microcontrollers', label: 'MCUs' },
          { id: 'sensors', label: 'Sensors' },
          { id: 'displays', label: 'Displays' },
          { id: 'actuators', label: 'Actuators' },
          { id: 'switches', label: 'Switches' },
          { id: 'relays_contactors', label: 'Contactors/Relays' },
          { id: 'protection', label: 'Protection' },
          { id: 'motor_control', label: 'Motors & VFD' },
          { id: 'plc_automation', label: 'PLC Automation' },
          { id: 'connectors', label: 'Connectors' },
          { id: 'instruments', label: 'Instruments' },
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
          <div className="text-center py-12 text-xs text-slate-500 font-mono space-y-2">
            <div>No components matching active search & filters.</div>
            <button
              onClick={handleResetFilters}
              className="text-emerald-400 hover:underline text-[11px]"
            >
              Reset all filters
            </button>
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
                      title={`Simulation Support Status: ${item.simulationStatus || 'full_mna'}`}
                    >
                      {item.simulationStatus === 'full_mna'
                        ? 'SPICE'
                        : item.simulationStatus === 'transpiled_mcu'
                        ? 'MCU VM'
                        : item.simulationStatus === 'behavioral'
                        ? 'BEHAVIORAL'
                        : 'CAD ONLY'}
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
                    <span className="text-[9px] font-mono text-slate-500">
                      {item.pins.length}P
                    </span>

                    {/* 3D and Datasheet indicator icons */}
                    {item.model3d && (
                      <span title="3D CAD Model Included">
                        <Box className="w-3 h-3 text-amber-400" />
                      </span>
                    )}
                    {item.datasheetUrl && (
                      <a
                        href={item.datasheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-cyan-400 transition-colors"
                        title="View Official Datasheet"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FileText className="w-3 h-3" />
                      </a>
                    )}
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
        <span className="font-mono">{filteredComponents.length} verified parts</span>
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
                <label className="text-slate-400 block mb-1">Manufacturer Part Number:</label>
                <input
                  type="text"
                  value={customPartNumber}
                  onChange={(e) => setCustomPartNumber(e.target.value)}
                  placeholder="e.g. MCP4725A0T-E/CH"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Category:</label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value as ComponentCategory)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="passive">Passive</option>
                  <option value="semiconductors">Semiconductors</option>
                  <option value="analog_ics">Analog ICs</option>
                  <option value="digital_logic">Digital Logic</option>
                  <option value="microcontrollers">Microcontrollers</option>
                  <option value="sensors">Sensors</option>
                  <option value="industrial">Industrial</option>
                  <option value="switches">Switches</option>
                  <option value="relays_contactors">Relays & Contactors</option>
                  <option value="protection">Protection</option>
                  <option value="motor_control">Motor Control</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Subcategory (optional):</label>
              <input
                type="text"
                value={customSubCategory}
                onChange={(e) => setCustomSubCategory(e.target.value)}
                placeholder="e.g. optocouplers, motor_drivers, rfid"
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Pin Count:</label>
                <input
                  type="number"
                  min="2"
                  max="64"
                  value={customPinCount}
                  onChange={(e) => setCustomPinCount(parseInt(e.target.value) || 2)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Package Type:</label>
                <select
                  value={customPackage}
                  onChange={(e) => setCustomPackage(e.target.value as 'THT' | 'SMD' | 'Module' | 'Chassis')}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="THT">THT (Through-Hole)</option>
                  <option value="SMD">SMD (Surface-Mount)</option>
                  <option value="Module">Module Breakout</option>
                  <option value="Chassis">DIN Rail / Chassis</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Simulation Tier:</label>
                <select
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value as SimulationSupportStatus)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="full_mna">SPICE MNA Nodal Solver</option>
                  <option value="behavioral">Behavioral Logic</option>
                  <option value="transpiled_mcu">Virtual MCU Sandbox</option>
                  <option value="design_only">CAD / Layout Only</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Default Value:</label>
                <input
                  type="text"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder="e.g. 10k, 24V, 5A"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Datasheet URL (optional):</label>
              <input
                type="url"
                value={customDatasheet}
                onChange={(e) => setCustomDatasheet(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddCustomOpen(false)}
                className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors"
              >
                Save & Register
              </button>
            </div>
          </form>
        </div>
      )}
    </aside>
  );
}