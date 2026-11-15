'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import {
  BookOpen,
  Search,
  Sparkles,
  Download,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  fetchLibraryItems,
  LIBRARY_CATEGORIES,
  getLibraryLogoUrl,
  getLibraryHeroImageUrl,
} from '@/modules/library/library-service';
import { ENGINEERING_DOMAINS } from '@/modules/tools/tool-service';
import type { LibraryItem } from '@/types';

interface LibraryCatalogClientProps {
  initialItems: LibraryItem[];
}

export function LibraryCatalogClient({ initialItems }: LibraryCatalogClientProps) {
  const [items, setItems] = useState<LibraryItem[]>(initialItems);
  const [selectedDomain, setSelectedDomain] = useState<string>('All Domains');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    fetchLibraryItems()
      .then((data) => {
        if (isMounted && data.length > 0) {
          setItems(data);
        }
      })
      .catch((err) => console.warn('Could not refresh library items:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesDomain =
        selectedDomain === 'All Domains' || item.domain === selectedDomain;
      const matchesCategory =
        selectedCategory === 'All Categories' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        (item.authorOrSource && item.authorOrSource.toLowerCase().includes(q)) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(q)));
      return matchesDomain && matchesCategory && matchesSearch;
    });
  }, [items, selectedDomain, selectedCategory, searchQuery]);

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
                  <span>Technical Documentation &amp; Reference Repository</span>
                </div>

                <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                  Engineering Library
                </h1>

                <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                  Curated hardware pinouts, open-source firmware drivers, schematics, mechanical CAD standards, and rapid cheat sheets for makers and engineers.
                </p>

                {/* Search Bar */}
                <div className="relative max-w-lg pt-2">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="search"
                    placeholder="Search datasheets, pinouts, KiCad, ESP32, FreeRTOS, NEMA..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 bg-white/10 border-white/20 text-white placeholder:text-slate-400 pl-10 pr-4 text-sm focus:bg-white focus:text-[#0B1528] transition-colors"
                  />
                </div>
              </div>

              {/* Hero Blueprint Visual */}
              <div className="lg:col-span-5">
                <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-white/5 backdrop-blur-md p-6 space-y-4 shadow-2xl">
                  <div className="relative h-48 w-full rounded-xl overflow-hidden bg-[#070D18] border border-white/10">
                    <Image
                      src="/images/about/about-hero.jpg"
                      alt="Engineering Library Architecture"
                      fill
                      className="object-cover opacity-85 hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1528] via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-mono text-[#F59E0B]">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Verified Engineering Schematics</span>
                      </span>
                      <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                        {items.length} Resources Available
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-white/5 p-2 border border-white/10">
                      <p className="font-bold text-white text-base">Pinouts</p>
                      <p className="text-slate-400 text-[10px]">Verified</p>
                    </div>
                    <div className="rounded-lg bg-white/5 p-2 border border-white/10">
                      <p className="font-bold text-emerald-400 text-base">Direct</p>
                      <p className="text-slate-400 text-[10px]">Downloads</p>
                    </div>
                    <div className="rounded-lg bg-white/5 p-2 border border-white/10">
                      <p className="font-bold text-[#F59E0B] text-base">Open</p>
                      <p className="text-slate-400 text-[10px]">Standards</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#F59E0B]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        </section>

        {/* 02. Filter Tabs & Resources Grid */}
        <section className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Domain Filter */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Filter by Engineering Domain:
            </p>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
                onClick={() => setSelectedDomain('All Domains')}
                className={`text-xs font-semibold px-4 py-2 rounded-full border whitespace-nowrap transition-colors ${
                  selectedDomain === 'All Domains'
                    ? 'bg-[#172D4D] text-white border-[#172D4D] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                All Domains
              </button>
              {ENGINEERING_DOMAINS.map((domain) => {
                const count = items.filter((i) => i.domain === domain).length;
                return (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => setSelectedDomain(domain)}
                    className={`text-xs font-semibold px-4 py-2 rounded-full border whitespace-nowrap transition-colors ${
                      selectedDomain === domain
                        ? 'bg-[#172D4D] text-white border-[#172D4D] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {domain} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Resource Category:
            </p>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                type="button"
                onClick={() => setSelectedCategory('All Categories')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border whitespace-nowrap transition-colors ${
                  selectedCategory === 'All Categories'
                    ? 'bg-[#0B1528] text-white border-[#0B1528]'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                All Categories
              </button>
              {LIBRARY_CATEGORIES.map((cat) => {
                const count = items.filter((i) => i.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-[#0B1528] text-white border-[#0B1528]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Library Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.length === 0 ? (
              <div className="col-span-full py-16 text-center rounded-2xl border border-dashed border-slate-300 bg-white p-8">
                <BookOpen className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-base font-semibold text-[#0B1528]">No library resources found</p>
                <p className="text-xs text-slate-500 mt-1">Try resetting the domain or category filter.</p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const logoUrl = getLibraryLogoUrl(item);
                const heroImg = getLibraryHeroImageUrl(item);
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200/90 bg-white shadow-xs hover:shadow-xl hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden group"
                  >
                    {/* Hero Image Header with Title and Real Logo ON TOP */}
                    <div className="relative h-36 sm:h-40 w-full overflow-hidden bg-gradient-to-br from-[#0B1528] via-[#12233D] to-[#172D4D]">
                      {/* Background Hero Banner */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={heroImg}
                        alt={item.title}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover opacity-35 group-hover:scale-105 group-hover:opacity-45 transition-all duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0B1528] via-[#0B1528]/60 to-transparent" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-sky-300 border border-sky-400/30">
                          {item.category}
                        </span>
                        {item.badge && (
                          <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-200 border border-amber-400/30 px-2 py-0.5 rounded-full backdrop-blur-md">
                            {item.badge}
                          </span>
                        )}
                      </div>

                      {/* Real Logo & Title directly on Hero Image */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3 z-10">
                        <div className="h-11 w-11 rounded-xl bg-white p-1.5 shadow-lg border border-white/90 shrink-0 flex items-center justify-center overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={logoUrl}
                            alt={`${item.title} logo`}
                            loading="lazy"
                            className="h-full w-full object-contain"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-white drop-shadow-md line-clamp-2 group-hover:text-sky-300 transition-colors leading-snug">
                            {item.title}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                          {item.summary}
                        </p>

                        <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100 flex-wrap">
                          {item.fileFormat && (
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              <FileText className="h-3 w-3 text-slate-500" />
                              <span>{item.fileFormat}</span>
                            </span>
                          )}
                          {item.fileSize && (
                            <span className="text-[11px] font-mono text-slate-400">
                              {item.fileSize}
                            </span>
                          )}
                          {item.version && (
                            <span className="text-[11px] text-slate-400 font-mono">
                              {item.version}
                            </span>
                          )}
                        </div>

                        {item.authorOrSource && (
                          <p className="text-[11px] text-slate-400 italic">
                            Source: {item.authorOrSource}
                          </p>
                        )}

                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {item.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-200"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                        {item.fileUrl ? (
                          <Button asChild size="sm" className="w-full bg-[#172D4D] text-white text-xs font-semibold">
                            <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" download>
                              <Download className="h-3.5 w-3.5 mr-1.5" />
                              <span>Download Resource</span>
                            </a>
                          </Button>
                        ) : item.externalUrl ? (
                          <Button asChild size="sm" variant="outline" className="w-full text-xs font-semibold border-slate-300">
                            <a href={item.externalUrl} target="_blank" rel="noopener noreferrer">
                              <span>View Official Specs</span>
                              <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                            </a>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="w-full text-xs font-semibold" disabled>
                            <span>Available in Lab Library</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
