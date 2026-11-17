'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  FileText,
  ExternalLink,
  ShieldCheck,
  Cpu,
  X,
  Compass,
  BookOpen,
  Edit3,
  Plus,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useOptionalAuth } from '@/modules/auth/auth-context';
import { DatasheetAdminModal } from '@/components/datasheets/DatasheetAdminModal';
import {
  fetchDatasheets,
  DEFAULT_DATASHEETS,
  DATASHEET_CATEGORIES,
  getAllDataSheetSearchUrl,
  getDigiKeySearchUrl,
  getMouserSearchUrl,
} from '@/modules/datasheets/datasheet-service';
import type { ComponentDatasheet } from '@/types';

const POPULAR_SEARCH_CHIPS = [
  'LM358',
  'NE555',
  'ESP32-S3',
  'ATmega328P',
  'STM32F103C8T6',
  'IRFZ44N',
  'LM7805',
  '2N2222',
  '1N4007',
  'TL431',
  'AMS1117-3.3',
  'MAX485',
];

export function DatasheetsPortalClient() {
  const auth = useOptionalAuth();
  const isEditor = Boolean(auth?.isEditor);

  const [datasheets, setDatasheets] = useState<ComponentDatasheet[]>(DEFAULT_DATASHEETS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [adminModalState, setAdminModalState] = useState<{
    open: boolean;
    item: Partial<ComponentDatasheet> | null;
    isNew: boolean;
  }>({ open: false, item: null, isNew: false });

  const reloadDatasheets = () => {
    fetchDatasheets().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setDatasheets(data);
      }
    });
  };

  useEffect(() => {
    let mounted = true;
    fetchDatasheets().then((data) => {
      if (mounted && Array.isArray(data) && data.length > 0) {
        setDatasheets(data);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Filtered component results
  const filteredComponents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const normalizedQ = q.toUpperCase().replace(/[^A-Z0-9]/g, '');

    return datasheets.filter((comp) => {
      // Category filter
      if (selectedCategory !== 'All Categories' && comp.category !== selectedCategory) {
        return false;
      }

      // Keyword / Part number search
      if (!q) return true;

      const partUpper = comp.partNumber.toUpperCase();
      const normPart = comp.normalizedPartNumber;
      const mfrLower = comp.manufacturer.toLowerCase();
      const catLower = comp.category.toLowerCase();
      const descLower = comp.description.toLowerCase();
      const pkgLower = (comp.package || '').toLowerCase();

      return (
        partUpper.includes(q.toUpperCase()) ||
        normPart.includes(normalizedQ) ||
        mfrLower.includes(q) ||
        catLower.includes(q) ||
        descLower.includes(q) ||
        pkgLower.includes(q)
      );
    });
  }, [datasheets, searchQuery, selectedCategory]);

  // Dynamic counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'All Categories': datasheets.length };
    for (const d of datasheets) {
      counts[d.category] = (counts[d.category] || 0) + 1;
    }
    return counts;
  }, [datasheets]);

  const activeQuery = searchQuery.trim();

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Hero & Search Header */}
      <section className="relative border-b border-slate-200/80 bg-white py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
              <li>
                <Link href="/" className="hover:text-slate-900 transition-colors">
                  Home
                </Link>
              </li>
              <li className="text-slate-400">/</li>
              <li>
                <Link href="/library" className="hover:text-slate-900 transition-colors">
                  Resources
                </Link>
              </li>
              <li className="text-slate-400">/</li>
              <li className="text-slate-900 font-semibold" aria-current="page">
                Datasheets
              </li>
            </ol>
          </nav>

          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3 py-1 text-xs font-semibold text-blue-800">
              <Cpu className="h-3.5 w-3.5 text-blue-600" />
              <span>Official Electronics Component Reference</span>
            </div>

            <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#0B1528] sm:text-4xl md:text-5xl">
              Find Electronic Component Datasheets
            </h1>

            <p className="text-sm sm:text-base leading-relaxed text-slate-600 font-normal">
              Search electronic components by part number, manufacturer or component name. Access
              technical datasheets, specifications and engineering documentation from verified manufacturer archives
              and official AllDataSheet indexing.
            </p>

            {isEditor && (
              <div className="pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setAdminModalState({ open: true, item: null, isNew: true })}
                  className="bg-[#172D4D] hover:bg-[#0B1528] text-white text-xs font-semibold gap-1.5 h-8.5 shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Component Datasheet</span>
                </Button>
              </div>
            )}
          </div>

          {/* Search Box Card */}
          <div className="mt-8 max-w-3xl rounded-2xl border border-slate-200 bg-white p-3 shadow-md sm:p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
              }}
              className="relative flex items-center gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Enter part number or manufacturer (e.g. LM358, ESP32, NE555, IRFZ44N)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 sm:h-12 pl-10 pr-9 text-sm font-medium border-slate-200 focus-visible:ring-[#172D4D]"
                  aria-label="Component Part Number Search"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <Button
                type="submit"
                className="h-11 sm:h-12 bg-[#172D4D] hover:bg-[#0B1528] text-white px-5 text-sm font-semibold shadow-xs"
              >
                Search
              </Button>
            </form>

            {/* Popular Search Chips */}
            <div className="mt-3 flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 text-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1">
                Popular:
              </span>
              {POPULAR_SEARCH_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setSearchQuery(chip)}
                  className={`rounded-md px-2 py-0.5 text-xs font-mono font-medium transition cursor-pointer ${
                    searchQuery.trim().toUpperCase() === chip.toUpperCase()
                      ? 'bg-[#172D4D] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Category Filter Carousel / Pills */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Browse by Component Category
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredComponents.length} component{filteredComponents.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {DATASHEET_CATEGORIES.map((cat) => {
              const count = categoryCounts[cat.name] || (cat.name === 'All Categories' ? datasheets.length : 0);
              const isActive = selectedCategory === cat.name;

              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold border transition cursor-pointer ${
                    isActive
                      ? 'bg-[#172D4D] text-white border-[#172D4D] shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Global AllDataSheet / External Engine Banner if Searching */}
        {activeQuery && (
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-slate-50 to-amber-50/60 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                  <Compass className="h-3 w-3" />
                  Live External Lookup
                </span>
                <span className="text-xs text-slate-500">Official AllDataSheet.com Direct Query</span>
              </div>
              <p className="text-sm font-semibold text-[#0B1528]">
                Looking for <span className="font-mono text-blue-700 font-bold">&quot;{activeQuery}&quot;</span> across millions of global datasheets?
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <Button
                asChild
                size="sm"
                className="bg-[#0B1528] hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 h-9"
              >
                <a
                  href={getAllDataSheetSearchUrl(activeQuery)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Search on AllDataSheet</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>

              <Button
                asChild
                size="sm"
                variant="outline"
                className="text-xs font-semibold border-slate-300 gap-1.5 h-9 bg-white"
              >
                <a
                  href={getDigiKeySearchUrl(activeQuery)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>DigiKey</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>

              <Button
                asChild
                size="sm"
                variant="outline"
                className="text-xs font-semibold border-slate-300 gap-1.5 h-9 bg-white"
              >
                <a
                  href={getMouserSearchUrl(activeQuery)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Mouser</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>
        )}

        {/* Component Cards Grid */}
        {filteredComponents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredComponents.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 flex flex-col justify-between space-y-4 shadow-2xs hover:shadow-md hover:border-[#172D4D]/30 transition-all"
              >
                <div className="space-y-3">
                  {/* Top Header: Part Number, Verified Pill, Category */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-extrabold text-[#0B1528] tracking-tight">
                          {item.partNumber}
                        </span>
                        {item.verified && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded"
                            title="Verified by EI House Technical Team"
                          >
                            <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-[#0090FF] mt-0.5">
                        {item.manufacturer}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isEditor && (
                        <button
                          type="button"
                          onClick={() => setAdminModalState({ open: true, item, isNew: false })}
                          className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 hover:bg-[#0B1528] hover:text-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 transition-colors cursor-pointer"
                          title={`Edit ${item.partNumber}`}
                        >
                          <Edit3 className="h-2.5 w-2.5" />
                          <span>Edit</span>
                        </button>
                      )}
                      <span className="text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full shrink-0">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Technical Specifications Matrix */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 space-y-1.5 text-[11px]">
                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      {item.package && (
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Package:</span>
                          <span className="font-medium text-slate-800">{item.package}</span>
                        </div>
                      )}
                      {item.pinCount && (
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Pin Count:</span>
                          <span className="font-medium text-slate-800">{item.pinCount} Pins</span>
                        </div>
                      )}
                    </div>

                    {item.specs && Object.keys(item.specs).length > 0 && (
                      <div className="pt-1.5 border-t border-slate-200/60 space-y-1">
                        {Object.entries(item.specs).slice(0, 3).map(([key, val]) => (
                          <div key={key} className="flex items-center justify-between gap-2 text-[10px]">
                            <span className="text-slate-500 font-medium truncate">{key}:</span>
                            <span className="font-mono text-slate-900 font-semibold truncate text-right">{val}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      asChild
                      size="sm"
                      className="bg-[#172D4D] hover:bg-[#0B1528] text-white text-xs font-semibold h-8.5 gap-1.5 shadow-2xs"
                    >
                      <a
                        href={item.datasheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`View ${item.partNumber} Datasheet PDF`}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Datasheet PDF</span>
                      </a>
                    </Button>

                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-8.5 gap-1"
                    >
                      <a
                        href={item.allDataSheetUrl || getAllDataSheetSearchUrl(item.partNumber)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Open ${item.partNumber} on AllDataSheet`}
                      >
                        <span>AllDataSheet</span>
                        <ExternalLink className="h-3 w-3 text-slate-400" />
                      </a>
                    </Button>
                  </div>

                  {item.manufacturerUrl && (
                    <a
                      href={item.manufacturerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-center font-medium text-slate-500 hover:text-blue-700 hover:underline flex items-center justify-center gap-1 py-0.5"
                    >
                      <span>Official Manufacturer Landing Page</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty Search State with Quick AllDataSheet CTA */
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 sm:p-12 text-center space-y-4 max-w-2xl mx-auto">
            <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <Search className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#0B1528]">
                No verified local records found for &quot;{searchQuery}&quot;
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Engineering Innovation House maintains a curated local archive of common ICs, but you can
                search the complete global database directly on AllDataSheet.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                asChild
                className="bg-[#172D4D] hover:bg-[#0B1528] text-white text-xs font-semibold h-9 gap-1.5"
              >
                <a
                  href={getAllDataSheetSearchUrl(searchQuery)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Search AllDataSheet for &quot;{searchQuery}&quot;</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSearchQuery('')}
                className="text-xs font-semibold h-9"
              >
                Reset Search
              </Button>
            </div>
          </div>
        )}

        {/* Informative Educational Engineering Reference Section */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#172D4D]" />
            <h2 className="font-display text-lg font-bold text-[#0B1528]">
              About the Component Datasheet Finder &amp; Source Integration
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600 leading-relaxed">
            <div className="space-y-1.5">
              <h3 className="font-bold text-slate-900">Verified Technical Reference</h3>
              <p>
                Every component catalogued directly by EI House includes verified electrical characteristics,
                pinout topologies, package variants, and official manufacturer documentation links.
              </p>
            </div>

            <div className="space-y-1.5">
              <h3 className="font-bold text-slate-900">AllDataSheet.com Integration</h3>
              <p>
                Seamless integration with the global AllDataSheet electronic component indexing engine, providing
                instant lookup across over 50 million electronic component datasheets and manufacturer errata.
              </p>
            </div>

            <div className="space-y-1.5">
              <h3 className="font-bold text-slate-900">Direct Engineering Links</h3>
              <p>
                Datasheets open directly in new browser tabs from authorized manufacturer repositories and
                verified archival hosts. No background downloads or tracking scripts.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Admin Datasheet Management Modal */}
      <DatasheetAdminModal
        open={adminModalState.open}
        item={adminModalState.item}
        isNew={adminModalState.isNew}
        onOpenChange={(open) => setAdminModalState((prev) => ({ ...prev, open }))}
        onSaved={reloadDatasheets}
      />
    </div>
  );
}
