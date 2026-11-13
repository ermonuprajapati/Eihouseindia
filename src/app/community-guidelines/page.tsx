import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SITE_CONFIG } from '@/config/site';

export const metadata: Metadata = {
  title: 'Community Guidelines',
  description: 'Technical accuracy, citation, and respectful peer discussion standards for EIHOUSE INDIA contributors.',
  alternates: { canonical: `${SITE_CONFIG.url}/community-guidelines` },
};

export default function CommunityGuidelinesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 lg:px-8 space-y-8 text-slate-700 leading-relaxed">
        <header className="space-y-3 border-b border-slate-200 pb-6">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B1528]">
            Community & Editorial Guidelines
          </h1>
          <p className="text-base text-slate-600">
            Maintaining engineering rigor across every published article and technical thread.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#0B1528]">01. Technical Accuracy & Reproducibility</h2>
          <p>
            Cite component part numbers, datasheet revisions, silicon errata, and firmware toolchains
            accurately. Hardware safety notes (especially mains AC, high-voltage DC buses, and Li-ion
            cells) must be stated clearly.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#0B1528]">02. Originality & Attribution</h2>
          <p>
            Submissions must be original engineering writing authored by you. Quote third-party
            datasheets, benchmarks, and schematics with proper attribution.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#0B1528]">03. Review Workflow</h2>
          <p>
            Submitted articles enter editorial review. Editors may approve, request technical
            revisions, or reject submissions with written feedback. Substantive edits to an already
            published article require re-verification.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-[#0B1528]">04. Constructive Peer Discussion</h2>
          <p>
            Critique circuits, architectures, and benchmarks constructively. Harassment, spam,
            promotional link-stuffing, or unverified claims will result in comment removal or account
            suspension.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
