'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search,
  Sparkles,
  Cpu,
  Bot,
  Terminal,
  Network,
  Layers,
  Activity,
  Calculator,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Laptop,
  SlidersHorizontal,
  Table,
  LayoutGrid,
  Info,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  Code2,
  Edit3,
  Plus,
} from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InteractiveToolModal } from '@/components/tools/InteractiveToolModal';
import { ToolAdminModal } from '@/components/tools/ToolAdminModal';
import { useAuth } from '@/modules/auth/auth-context';
import {
  fetchTools,
  TOOL_LICENSES,
  getToolLogoUrl,
  getToolHeroImageUrl,
} from '@/modules/tools/tool-service';
import { ToolsBlueprintAnimation } from '@/components/animations/ToolsBlueprintAnimation';
import type { EngineeringTool } from '@/types';

interface ToolsCatalogClientProps {
  initialTools: EngineeringTool[];
}

export function ToolsCatalogClient({ initialTools }: ToolsCatalogClientProps) {
  const { isEditor } = useAuth();
  const [tools, setTools] = useState<EngineeringTool[]>(initialTools);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedLicense, setSelectedLicense] = useState<string>('All Licenses');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [activeCalculatorTool, setActiveCalculatorTool] = useState<EngineeringTool | null>(null);
  const [editingTool, setEditingTool] = useState<Partial<EngineeringTool> | null>(null);
  const [isCreatingTool, setIsCreatingTool] = useState(false);
  const [failedLogoIds, setFailedLogoIds] = useState<Set<string>>(new Set());

  const reloadTools = useCallback(() => {
    fetchTools()
      .then((data) => {
        if (data.length > 0) {
          setTools(data);
        }
      })
      .catch((err) => console.warn('Could not refresh tools from firestore:', err));
  }, []);

  useEffect(() => {
    reloadTools();
  }, [reloadTools]);

  // Filtered tools
  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      // Category match
      let matchesCategory = true;
      if (selectedCategory !== 'All') {
        if (selectedCategory === 'Simulation') {
          // Simulation matches either category === 'Simulation' or tags/domain
          matchesCategory =
            tool.category === 'Simulation' ||
            Boolean(tool.tags?.some((t) => t.toLowerCase().includes('simulat') || t.toLowerCase() === 'spice' || t.toLowerCase() === 'fea' || t.toLowerCase() === 'cfd'));
        } else if (selectedCategory === 'Calculators') {
          matchesCategory =
            tool.category === 'Calculators' ||
            tool.toolType === 'interactive' ||
            tool.toolType === 'built-in';
        } else {
          matchesCategory = tool.category === selectedCategory;
        }
      }

      // License match
      const matchesLicense =
        selectedLicense === 'All Licenses' || tool.licenseType === selectedLicense;

      // Search match
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tool.name.toLowerCase().includes(q) ||
        (tool.mainApplication && tool.mainApplication.toLowerCase().includes(q)) ||
        tool.summary.toLowerCase().includes(q) ||
        (tool.tags && tool.tags.some((t) => t.toLowerCase().includes(q))) ||
        (tool.licenseType && tool.licenseType.toLowerCase().includes(q));

      return matchesCategory && matchesLicense && matchesSearch;
    });
  }, [tools, selectedCategory, selectedLicense, searchQuery]);

  // Top 12 Featured Tools
  const featuredTools = useMemo(() => {
    return tools.filter((t) => t.featured).slice(0, 12);
  }, [tools]);

  // Category Icon Resolver
  const getCategoryIcon = (cat?: string) => {
    switch (cat) {
      case 'Electronics':
        return <Cpu className="h-4 w-4" />;
      case 'Mechanical':
        return <Bot className="h-4 w-4" />;
      case '3D Printing':
        return <Layers className="h-4 w-4" />;
      case 'Programming':
        return <Terminal className="h-4 w-4" />;
      case 'IT & Networking':
        return <Network className="h-4 w-4" />;
      case 'Simulation':
        return <Activity className="h-4 w-4" />;
      case 'Calculators':
        return <Calculator className="h-4 w-4" />;
      default:
        return <Code2 className="h-4 w-4" />;
    }
  };

  // License Pill Style
  const getLicenseBadgeStyle = (lic?: string) => {
    switch (lic) {
      case 'Open Source':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300';
      case 'Free':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300';
      case 'Freemium':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300';
      case 'Commercial / Paid':
        return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300';
      case 'Student License':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/50 dark:text-slate-300';
    }
  };

  const navCategories = [
    { key: 'All', label: 'All Tools & Software' },
    { key: 'Electronics', label: 'Electronics & Embedded', icon: <Cpu className="h-3.5 w-3.5" /> },
    { key: 'Mechanical', label: 'Mechanical & CAD', icon: <Bot className="h-3.5 w-3.5" /> },
    { key: '3D Printing', label: '3D Printing', icon: <Layers className="h-3.5 w-3.5" /> },
    { key: 'Programming', label: 'Programming & CS', icon: <Terminal className="h-3.5 w-3.5" /> },
    { key: 'IT & Networking', label: 'IT & Networking', icon: <Network className="h-3.5 w-3.5" /> },
    { key: 'Simulation', label: 'Simulation & Analysis', icon: <Activity className="h-3.5 w-3.5" /> },
    { key: 'Calculators', label: 'Calculators & Solvers', icon: <Calculator className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />

      <main className="flex-1">
        {/* ========================================================= */}
        {/* 01. HERO SECTION */}
        {/* ========================================================= */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#0B1528] via-[#12233D] to-[#0B1528] text-white py-14 sm:py-20 border-b border-white/10">
          <ToolsBlueprintAnimation />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#F59E0B]/15 px-3.5 py-1 text-xs font-semibold text-[#F59E0B] border border-[#F59E0B]/30">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>EI House Recommended Engineering Directory</span>
                </div>

                <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                  Engineering Software &amp; Tools Directory
                </h1>

                <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                  Curated ecosystem of professional CAD suites, circuit simulators, embedded IDEs,
                  programming utilities, and interactive engineering calculators with direct official website links.
                </p>

                {/* Instant Search Bar */}
                <div className="relative max-w-lg pt-2">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="search"
                    placeholder="Search software (e.g. KiCad, Fusion, FreeCAD, EI House Lab, Ansys, Docker)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 bg-white/10 border-white/20 text-white placeholder:text-slate-400 pl-10 pr-4 text-sm focus:bg-white focus:text-[#0B1528] transition-colors"
                  />
                </div>

                {/* Quick Directory Metrics */}
                <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-300">
                  <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-md">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <strong>{tools.length}+</strong> Verified Engineering Tools
                  </span>
                  <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-md">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                    Open Source &amp; Free Tiers Identified
                  </span>
                  <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-md">
                    <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
                    Official Vendor Links
                  </span>
                </div>
              </div>

              {/* Hero Blueprint Visual Card */}
              <div className="lg:col-span-5">
                <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-white/5 backdrop-blur-md p-5 space-y-4 shadow-2xl">
                  <div className="relative h-44 w-full rounded-xl overflow-hidden bg-[#070D18] border border-white/10">
                    <Image
                      src="/images/about/about-hero.jpg"
                      alt="EI House Engineering Directory"
                      fill
                      className="object-cover opacity-85 hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1528] via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-mono text-[#F59E0B]">
                      <span>EI-HOUSE // DIRECTORY</span>
                      <span className="bg-[#F59E0B]/20 px-2 py-0.5 rounded border border-[#F59E0B]/40 text-amber-200">
                        Top 12 Featured
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Directory Disciplines
                    </p>
                    <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-200">
                      <span className="px-2 py-0.5 rounded bg-white/10">Electronics &amp; PCB</span>
                      <span className="px-2 py-0.5 rounded bg-white/10">Mechanical &amp; CAD</span>
                      <span className="px-2 py-0.5 rounded bg-white/10">3D Printing Slicers</span>
                      <span className="px-2 py-0.5 rounded bg-white/10">Simulation &amp; FEA/CFD</span>
                      <span className="px-2 py-0.5 rounded bg-white/10">Networking &amp; DevOps</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 02. IMPORTANT WEBSITE PUBLISHING NOTICE BANNER */}
        {/* ========================================================= */}
        <section className="bg-amber-50/80 border-b border-amber-200/80 text-amber-950 py-4 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-start md:items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
              <Info className="h-5 w-5" />
            </div>
            <div className="text-xs sm:text-sm text-amber-900 leading-relaxed">
              <strong className="font-semibold text-amber-950">
                Important for website publishing &amp; software usage:
              </strong>{' '}
              Not every tool is free or browser-based. Some require local installation, paid licences,
              student eligibility, or account registration. For example, <strong>FreeCAD</strong> and{' '}
              <strong>KiCad</strong> are completely open-source, whereas commercial CAD &amp; simulation
              platforms (like SOLIDWORKS, Ansys, or MATLAB) have their own licensing terms and student editions.
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 02B. EI HOUSE UNIVERSAL ENGINEERING LAB LAUNCH BANNER */}
        {/* ========================================================= */}
        <section className="bg-gradient-to-r from-[#070D18] via-[#0B1528] to-[#172D4D] text-white py-8 px-4 sm:px-6 lg:px-8 border-b border-white/10 relative overflow-hidden">
          <div className="absolute -right-24 -top-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Now Live • 100% Free &amp; Browser-Based</span>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-white tracking-tight">
                EI House Universal Engineering Lab
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Design interactive electronics circuits with live Modified Nodal Analysis (MNA), write &amp; run virtual Arduino MCU C/C++ firmware with UART telemetry, route 2D PCB traces, inspect 3D boards, and export production-ready RS-274X Gerber &amp; NC Drill files directly in your web browser.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
              <Link
                href="/engineering-lab"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <span>Launch Engineering Lab</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 03. TOP 12 FEATURED TOOLS HIGHLIGHT */}
        {/* ========================================================= */}
        {selectedCategory === 'All' && !searchQuery && selectedLicense === 'All Licenses' && (
          <section className="py-12 bg-white border-b border-slate-200">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F59E0B] tracking-wide uppercase">
                    <Sparkles className="h-3.5 w-3.5" />
                    Recommended Homepage Selection
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#0B1528] tracking-tight mt-1">
                    Top 12 Featured Engineering Tools
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    The core engineering software and simulation platforms highlighted for every engineer and student.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {featuredTools.map((tool) => {
                  const logoUrl = getToolLogoUrl(tool);
                  return (
                    <div
                      key={tool.id}
                      className="group relative rounded-xl border border-slate-200 bg-white p-4 hover:border-[#F59E0B] hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-9 w-9 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                              {!failedLogoIds.has(tool.id) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={logoUrl}
                                  alt={`${tool.name} official logo`}
                                  className="max-h-full max-w-full object-contain"
                                  onError={() =>
                                    setFailedLogoIds((prev) => new Set(prev).add(tool.id))
                                  }
                                />
                              ) : (
                                getCategoryIcon(tool.category)
                              )}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-[#0B1528] group-hover:text-[#F59E0B] transition-colors leading-tight truncate">
                                {tool.name}
                              </h3>
                              <span className="text-[11px] text-slate-500 font-medium block truncate">
                                {tool.category || tool.domain}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isEditor && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCreatingTool(false);
                                  setEditingTool(tool);
                                }}
                                title={`Edit ${tool.name}`}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-[#0B1528] hover:text-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 transition-colors cursor-pointer"
                              >
                                <Edit3 className="h-3 w-3" />
                                <span>Edit</span>
                              </button>
                            )}
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getLicenseBadgeStyle(
                                tool.licenseType
                              )}`}
                            >
                              {tool.licenseType || 'Tool'}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {tool.mainApplication || tool.summary}
                        </p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 truncate max-w-[120px]">
                          <Laptop className="h-3 w-3 shrink-0" />
                          <span className="truncate">{tool.platform || 'Cross-Platform'}</span>
                        </span>

                        {tool.officialWebsite ? (
                          <a
                            href={tool.officialWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-[#0B1528] hover:text-[#F59E0B] transition-colors"
                          >
                            <span>Official website</span>
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </a>
                        ) : tool.toolType === 'interactive' ? (
                          <button
                            onClick={() => setActiveCalculatorTool(tool)}
                            className="inline-flex items-center gap-1 font-semibold text-[#0B1528] hover:text-[#F59E0B]"
                          >
                            <span>Launch Solver</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* 04. DIRECTORY BROWSE & FILTER BAR */}
        {/* ========================================================= */}
        <section className="py-8 bg-[#FAFBFD]" id="directory">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
            {/* Contextual Admin Quick Management Bar (Only visible to authenticated Editors/Admins) */}
            {isEditor && (
              <div className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white/95 backdrop-blur-sm px-4 py-2.5 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#0B1528]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Admin Quick Edit Mode — Click &ldquo;Edit&rdquo; on any tool card to upload logos, screenshots, or update details.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setIsCreatingTool(true);
                      setEditingTool({
                        name: '',
                        slug: '',
                        domain: 'Electronics & Embedded',
                        category: 'Electronics',
                        licenseType: 'Free',
                        platform: 'Desktop (Windows / Mac / Linux)',
                        badge: 'Recommended',
                        toolType: 'software',
                        order: tools.length + 1,
                      });
                    }}
                    className="h-8 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    <span>Add New Tool</span>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                    <Link href="/admin">Admin Console</Link>
                  </Button>
                </div>
              </div>
            )}

            {/* Suggested Menu / Category Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
              {navCategories.map((cat) => {
                const isActive = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#0B1528] text-white shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {cat.icon}
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* License Pills & View Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
                  <SlidersHorizontal className="h-3.5 w-3.5" /> License:
                </span>
                {['All Licenses', ...TOOL_LICENSES].map((lic) => {
                  const isActive = selectedLicense === lic;
                  return (
                    <button
                      key={lic}
                      onClick={() => setSelectedLicense(lic)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                        isActive
                          ? 'bg-amber-100 border-amber-300 text-amber-900 font-semibold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {lic}
                    </button>
                  );
                })}
              </div>

              {/* View Switcher: Grid vs Table */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-500 font-medium">
                  Showing <strong>{filteredTools.length}</strong> items
                </span>
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                  <button
                    onClick={() => setViewMode('grid')}
                    title="Grid Card View"
                    className={`p-1.5 rounded-md text-xs font-medium ${
                      viewMode === 'grid'
                        ? 'bg-[#0B1528] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    title="Directory Table View"
                    className={`p-1.5 rounded-md text-xs font-medium ${
                      viewMode === 'table'
                        ? 'bg-[#0B1528] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Table className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Empty State */}
            {filteredTools.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-[#0B1528]">No tools or software match</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try clearing search keywords or switching filters to view the complete catalog.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory('All');
                    setSelectedLicense('All Licenses');
                    setSearchQuery('');
                  }}
                >
                  Reset All Filters
                </Button>
              </div>
            )}

            {/* ========================================================= */}
            {/* VIEW A: DIRECTORY TABLE VIEW */}
            {/* ========================================================= */}
            {filteredTools.length > 0 && viewMode === 'table' && (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Software / Tool</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Main Application</th>
                      <th className="py-3 px-4">License Type</th>
                      <th className="py-3 px-4">Platform</th>
                      <th className="py-3 px-4 text-right">Official Website</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal">
                    {filteredTools.map((tool) => (
                      <tr key={tool.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-[#0B1528]">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-md bg-white border border-slate-200 p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={getToolLogoUrl(tool)}
                                alt={`${tool.name} official logo`}
                                className="h-full w-full object-contain"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>
                            <span>{tool.name}</span>
                            {tool.badge && (
                              <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 font-semibold px-1.5 py-0.2 rounded">
                                {tool.badge}
                              </span>
                            )}
                            {isEditor && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCreatingTool(false);
                                  setEditingTool(tool);
                                }}
                                className="inline-flex items-center gap-1 rounded border border-slate-300 bg-slate-50 hover:bg-[#0B1528] hover:text-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 transition-colors cursor-pointer"
                              >
                                <Edit3 className="h-2.5 w-2.5" />
                                <span>Edit</span>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-medium">
                          {tool.category || tool.domain}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate">
                          {tool.mainApplication || tool.summary}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getLicenseBadgeStyle(
                              tool.licenseType
                            )}`}
                          >
                            {tool.licenseType || 'Free'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {tool.platform || 'Cross-Platform'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {tool.officialWebsite ? (
                            <a
                              href={tool.officialWebsite}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              <span>Visit</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : tool.toolType === 'interactive' ? (
                            <button
                              onClick={() => setActiveCalculatorTool(tool)}
                              className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:text-amber-900 hover:underline"
                            >
                              <span>Open Solver</span>
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          ) : (
                            <span className="text-slate-400 italic">Built-in</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ========================================================= */}
            {/* VIEW B: GRID CARD VIEW */}
            {/* ========================================================= */}
            {filteredTools.length > 0 && viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTools.map((tool) => {
                  const logoUrl = getToolLogoUrl(tool);
                  const heroImg = getToolHeroImageUrl(tool);
                  return (
                    <div
                      key={tool.id}
                      className="group rounded-2xl border border-slate-200/90 bg-white shadow-xs hover:shadow-xl hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden"
                    >
                      {/* 16:9 Actual Software Interface / Product Image */}
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0B1528] border-b border-slate-200/80">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={heroImg}
                          alt={tool.imageAlt || `${tool.name} interface screenshot`}
                          loading="lazy"
                          className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        />

                        {/* Top Badges & Contextual Admin Edit Button */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 z-10">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#0B1528]/85 backdrop-blur-md text-amber-300 border border-amber-400/30 shadow-xs">
                            {tool.category || tool.domain}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border backdrop-blur-md shadow-xs ${getLicenseBadgeStyle(
                                tool.licenseType
                              )}`}
                            >
                              {tool.licenseType || 'Software'}
                            </span>

                            {isEditor && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCreatingTool(false);
                                  setEditingTool(tool);
                                }}
                                title={`Edit ${tool.name}`}
                                className="inline-flex items-center gap-1 rounded-full bg-white/95 hover:bg-[#F59E0B] text-[#0B1528] border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold shadow-md transition-colors cursor-pointer"
                              >
                                <Edit3 className="h-3 w-3" />
                                <span>Edit</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Content Body with Dedicated Official Logo & Identity */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-3">
                          {/* Official Software Logo + Name Header */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-11 w-11 rounded-xl bg-white p-1.5 shadow-2xs border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden">
                                {!failedLogoIds.has(tool.id) ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={logoUrl}
                                    alt={`${tool.name} official logo`}
                                    loading="lazy"
                                    className="max-h-full max-w-full object-contain"
                                    onError={() =>
                                      setFailedLogoIds((prev) => new Set(prev).add(tool.id))
                                    }
                                  />
                                ) : (
                                  <span className="text-[#172D4D]">{getCategoryIcon(tool.category)}</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-base font-bold text-[#0B1528] truncate group-hover:text-[#172D4D] transition-colors">
                                    {tool.name}
                                  </h3>
                                  {isEditor && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsCreatingTool(false);
                                        setEditingTool(tool);
                                      }}
                                      className="text-[11px] font-semibold text-blue-600 hover:underline shrink-0 cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                  )}
                                </div>
                                {tool.badge && (
                                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded inline-block mt-0.5">
                                    {tool.badge}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Main Application */}
                          {tool.mainApplication && (
                            <div className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
                              {tool.mainApplication}
                            </div>
                          )}

                          {/* Summary */}
                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                            {tool.summary || tool.description}
                          </p>

                          {/* Platform */}
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                            <span className="flex items-center gap-1">
                              <Laptop className="h-3 w-3 text-slate-400" />
                              <span>{tool.platform || 'Cross-Platform'}</span>
                            </span>
                          </div>

                          {/* Tags */}
                          {tool.tags && tool.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {tool.tags.slice(0, 4).map((t, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Footer Action */}
                        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 font-medium">Official Link</span>
                          {tool.officialWebsite ? (
                            <a
                              href={tool.officialWebsite}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#172D4D] hover:text-[#0B1528] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <span>Official Website</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : tool.toolType === 'interactive' ? (
                            <button
                              onClick={() => setActiveCalculatorTool(tool)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              <span>Open Solver</span>
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Built-in Solver</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Interactive Solver Dialog */}
      <InteractiveToolModal
        tool={activeCalculatorTool}
        onClose={() => setActiveCalculatorTool(null)}
      />

      {/* Contextual Admin Add/Edit Tool Modal */}
      <ToolAdminModal
        tool={editingTool}
        isNew={isCreatingTool}
        open={Boolean(editingTool)}
        onOpenChange={(open) => !open && setEditingTool(null)}
        onSaved={reloadTools}
        defaultOrder={tools.length + 1}
      />

      <SiteFooter />
    </div>
  );
}
