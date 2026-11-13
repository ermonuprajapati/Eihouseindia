import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { SITE_CONFIG } from '@/config/site';

export const metadata: Metadata = {
  title: 'About EIHOUSE INDIA',
  description:
    'Learn about EIHOUSE INDIA, our editorial mission across electronics, semiconductors, AI, robotics, and community technical publishing.',
  alternates: { canonical: `${SITE_CONFIG.url}/about` },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 lg:px-8 space-y-10">
        <header className="space-y-4 border-b border-slate-200 pb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
            {SITE_CONFIG.tagline}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B1528]">
            About EIHOUSE INDIA
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            {SITE_CONFIG.description}
          </p>
        </header>

        <section className="space-y-4 text-base leading-relaxed text-slate-700">
          <h2 className="font-display text-2xl font-semibold text-[#0B1528]">
            Editorial Mission
          </h2>
          <p>
            Modern hardware and intelligent systems sit at the intersection of semiconductor
            physics, embedded firmware, power electronics, and applied AI. EIHOUSE INDIA exists to
            publish deep, verifiable technical writing that bridges academic theory and production
            engineering.
          </p>
          <p>
            Every community submission undergoes structured editorial review before publication. We
            welcome detailed circuit walkthroughs, component teardowns, fab ecosystem analysis,
            ROS 2 implementations, and reproducible bench tutorials from engineers worldwide.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-[#0B1528]">
              Write for EIHOUSE INDIA
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Create an author profile, draft your technical guide, and submit it for editorial review.
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="primary">
              <Link href="/dashboard/editor">Start Writing</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/community-guidelines">Editorial Standards</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
