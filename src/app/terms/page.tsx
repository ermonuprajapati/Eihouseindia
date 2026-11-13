import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SITE_CONFIG } from '@/config/site';

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description: 'Terms of service, content licensing, and contributor responsibilities on EIHOUSE INDIA.',
  alternates: { canonical: `${SITE_CONFIG.url}/terms` },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 lg:px-8 space-y-6 text-slate-700 leading-relaxed">
        <header className="space-y-2 border-b border-slate-200 pb-6">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B1528]">
            Terms & Conditions
          </h1>
          <p className="text-sm text-slate-500">Last updated: November 2026</p>
        </header>

        <p>
          By accessing or contributing to {SITE_CONFIG.name} ({SITE_CONFIG.domain}), you agree to
          comply with these Terms & Conditions and our Community Guidelines.
        </p>

        <h2 className="font-display text-xl font-semibold text-[#0B1528] pt-2">1. Contributor Content Rights</h2>
        <p>
          Contributors retain ownership of their original technical writing and schematics. By
          submitting an article for review and publication, you grant {SITE_CONFIG.name} a
          non-exclusive, worldwide license to publish, display, and distribute the work on the
          platform with attribution to your author profile.
        </p>

        <h2 className="font-display text-xl font-semibold text-[#0B1528] pt-2">2. Editorial Moderation</h2>
        <p>
          The editorial board reserves the right to approve, reject, request changes, or archive
          submissions and moderate comments that violate technical accuracy or community standards.
        </p>

        <h2 className="font-display text-xl font-semibold text-[#0B1528] pt-2">3. Engineering Disclaimer</h2>
        <p>
          All technical tutorials, circuit schematics, and firmware examples are provided for
          educational and engineering reference. Always validate component ratings, thermal margins,
          and electrical safety standards independently before deploying hardware.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
