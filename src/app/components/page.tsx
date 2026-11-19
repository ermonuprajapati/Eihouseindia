import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { FUTURE_COMPONENT_CATEGORIES, SITE_CONFIG } from '@/config/site';

export const metadata: Metadata = {
  title: 'Component Directory Architecture',
  description:
    'Planned electronics component parametric catalog architecture for EIHOUSE INDIA covering passive, discrete, IC, MCU, and sensor families.',
  alternates: { canonical: `${SITE_CONFIG.url}/components` },
  robots: {
    index: false,
    follow: true,
  },
};

export default function ComponentsRoadmapPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-10">
        <header className="space-y-3 border-b border-slate-200 pb-6 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
            Architecture Blueprint
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B1528]">
            Electronics Component Directory
          </h1>
          <p className="text-base text-slate-600 leading-relaxed">
            This structured taxonomy prepares EIHOUSE INDIA for a full parametric datasheet and
            manufacturer directory in the next phase, linking published engineering articles directly
            to component specifications.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FUTURE_COMPONENT_CATEGORIES.map((item) => (
            <div
              key={item.slug}
              className="rounded-lg border border-slate-200 bg-white p-6 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-[#0B1528]">{item.name}</h2>
                <span className="font-mono text-xs text-slate-400">/{item.slug}</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{item.summary}</p>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">Planned Specification Fields</p>
                <p className="text-xs font-mono text-slate-600">{item.plannedFields.join(' · ')}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm text-slate-600">
            Explore current component design guides and teardowns under Electronics Components.
          </p>
          <Link
            href="/category/electronics-components"
            className="text-sm font-medium text-[#1D4ED8] hover:underline whitespace-nowrap"
          >
            Read Electronics Components Articles
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
