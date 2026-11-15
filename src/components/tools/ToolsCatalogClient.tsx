'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import {
  Wrench,
  Search,
  Sparkles,
  Cpu,
  Bot,
  Terminal,
  Network,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InteractiveToolModal } from '@/components/tools/InteractiveToolModal';
import { fetchTools, ENGINEERING_DOMAINS } from '@/modules/tools/tool-service';
import type { EngineeringDomain, EngineeringTool } from '@/types';

interface ToolsCatalogClientProps {
  initialTools: EngineeringTool[];
}

export function ToolsCatalogClient({ initialTools }: ToolsCatalogClientProps) {
  const [tools, setTools] = useState<EngineeringTool[]>(initialTools);
  const [selectedDomain, setSelectedDomain] = useState<string>('All Domains');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTool, setActiveTool] = useState<EngineeringTool | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchTools()
      .then((data) => {
        if (isMounted && data.length > 0) {
          setTools(data);
        }
      })
      .catch((err) => console.warn('Could not refresh tools from firestore:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const matchesDomain =
        selectedDomain === 'All Domains' || tool.domain === selectedDomain;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tool.name.toLowerCase().includes(q) ||
        tool.summary.toLowerCase().includes(q) ||
        (tool.tags && tool.tags.some((t) => t.toLowerCase().includes(q)));
      return matchesDomain && matchesSearch;
    });
  }, [tools, selectedDomain, searchQuery]);

  const domainIcons: Record<string, React.ReactNode> = {
    'Electronics & Embedded': <Cpu className="h-4 w-4" />,
    'Mechanical & Robotics': <Bot className="h-4 w-4" />,
    'Computer Science & IT': <Terminal className="h-4 w-4" />,
    'Networking & IoT': <Network className="h-4 w-4" />,
    '3D Printing & CAD': <Layers className="h-4 w-4" />,
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />

      <main className="flex-1">
        {/* 01. Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#0B1528] via-[#172D4D] to-[#0B1528] text-white py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold text-[#F59E0B] border border-[#F59E0B]/30">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Precision Engineering Utilities &amp; Calculators</span>
                </div>

                <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                  Engineering Tools Suite
                </h1>

                <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                  Essential interactive calculators and automated design utilities engineered for
                  Electronics, Embedded Firmware, Mechanical Systems, Programming, Networking, and 3D Printing.
                </p>

                {/* Instant Search Bar */}
                <div className="relative max-w-lg pt-2">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="search"
                    placeholder="Search tools (e.g. Ohm, 555 Timer, Torque, Subnet, 3D Print)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 bg-white/10 border-white/20 text-white placeholder:text-slate-400 pl-10 pr-4 text-sm focus:bg-white focus:text-[#0B1528] transition-colors"
                  />
                </div>
              </div>

              {/* Hero Visual Blueprint Card */}
              <div className="lg:col-span-5">
                <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-white/5 backdrop-blur-md p-6 space-y-4 shadow-2xl">
                  <div className="relative h-48 w-full rounded-xl overflow-hidden bg-[#070D18] border border-white/10">
                    <Image
                      src="/images/about/about-hero.jpg"
                      alt="Engineering Tools Suite"
                      fill
                      className="object-cover opacity-85 hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1528] via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-mono text-[#F59E0B]">
                      <span className="flex items-center gap-1.5">
                        <Wrench className="h-3.5 w-3.5" />
                        <span>Interactive Formula Solvers</span>
                      </span>
                      <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                        {tools.length} Tools Online
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-white/5 p-2 border border-white/10">
                      <p className="font-bold text-white text-base">6+</p>
                      <p className="text-slate-400 text-[10px]">Domains</p>
                    </div>
                    <div className="rounded-lg bg-white/5 p-2 border border-white/10">
                      <p className="font-bold text-emerald-400 text-base">100%</p>
                      <p className="text-slate-400 text-[10px]">Free &amp; Open</p>
                    </div>
                    <div className="rounded-lg bg-white/5 p-2 border border-white/10">
                      <p className="font-bold text-[#F59E0B] text-base">Instant</p>
                      <p className="text-slate-400 text-[10px]">Client-Side</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Background subtle glowing radial lights */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#F59E0B]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        </section>

        {/* 02. Domain Tabs & Catalog Grid */}
        <section className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Domain tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
            <button
              type="button"
              onClick={() => setSelectedDomain('All Domains')}
              className={`text-xs font-semibold px-4 py-2 rounded-full border whitespace-nowrap transition-colors ${
                selectedDomain === 'All Domains'
                  ? 'bg-[#172D4D] text-white border-[#172D4D] shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              All Domains ({tools.length})
            </button>
            {ENGINEERING_DOMAINS.map((domain) => {
              const count = tools.filter((t) => t.domain === domain).length;
              return (
                <button
                  key={domain}
                  type="button"
                  onClick={() => setSelectedDomain(domain)}
                  className={`text-xs font-semibold px-4 py-2 rounded-full border whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    selectedDomain === domain
                      ? 'bg-[#172D4D] text-white border-[#172D4D] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {domainIcons[domain]}
                  <span>{domain} ({count})</span>
                </button>
              );
            })}
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.length === 0 ? (
              <div className="col-span-full py-16 text-center rounded-2xl border border-dashed border-slate-300 bg-white p-8">
                <Wrench className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-base font-semibold text-[#0B1528]">No tools found matching your filter</p>
                <p className="text-xs text-slate-500 mt-1">Try searching with a different keyword or select All Domains.</p>
              </div>
            ) : (
              filteredTools.map((tool) => (
                <div
                  key={tool.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between space-y-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                        {tool.domain}
                      </span>
                      {tool.badge && (
                        <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                          {tool.badge}
                        </span>
                      )}
                    </div>

                    <h3 className="font-display text-lg font-bold text-[#0B1528] group-hover:text-primary transition-colors">
                      {tool.name}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {tool.summary}
                    </p>

                    {tool.tags && tool.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {tool.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <Button
                      size="sm"
                      onClick={() => setActiveTool(tool)}
                      className="w-full bg-[#172D4D] hover:bg-[#0B1528] text-white text-xs font-semibold flex items-center justify-center gap-1.5 py-2.5"
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      <span>Launch Interactive Calculator</span>
                      <ArrowRight className="h-3 w-3 ml-auto opacity-70 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Interactive Tool Modal */}
      <InteractiveToolModal tool={activeTool} onClose={() => setActiveTool(null)} />

      <SiteFooter />
    </div>
  );
}
