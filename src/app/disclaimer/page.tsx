import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SITE_CONFIG } from '@/config/site';

export const metadata: Metadata = {
  title: 'Disclaimer',
  description:
    'Legal disclaimer for Engineering Innovation House (EI HOUSE INDIA) covering technical content, virtual lab simulations, safety, and advertising.',
  alternates: { canonical: `${SITE_CONFIG.url}/disclaimer` },
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 lg:px-8 space-y-6 text-slate-700 leading-relaxed">
        <header className="space-y-2 border-b border-slate-200 pb-6">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B1528]">
            Disclaimer
          </h1>
          <p className="text-sm text-slate-500">Last updated: November 2026</p>
        </header>

        <p>
          The information provided by <strong>{SITE_CONFIG.name}</strong> ({SITE_CONFIG.brandName}) on{' '}
          <Link href="/" className="text-[#1D4ED8] hover:underline">
            {SITE_CONFIG.domain}
          </Link>{' '}
          is for general educational, research, and engineering informational purposes only. All
          information on the site is provided in good faith; however, we make no representation or
          warranty of any kind, express or implied, regarding the accuracy, adequacy, validity,
          reliability, availability, or completeness of any technical schematics, code, or data.
        </p>

        <h2 className="font-display text-xl font-semibold text-[#0B1528] pt-2">
          1. Hardware, Electrical &amp; Engineering Safety Disclaimer
        </h2>
        <p>
          Tutorials, circuit diagrams, PCB layouts, firmware snippets, and 3D Virtual Engineering
          Lab simulations published on {SITE_CONFIG.shortName} are intended strictly for educational
          and prototyping use by qualified individuals or supervised learners. Working with mains
          voltage, high-power electronics, Li-ion batteries, and mechanical systems carries inherent
          physical risks. You are solely responsible for verifying component ratings, datasheets,
          thermal limits, and safety precautions before assembling or energizing any hardware.
        </p>

        <h2 className="font-display text-xl font-semibold text-[#0B1528] pt-2">
          2. External Links Disclaimer
        </h2>
        <p>
          The platform may contain links to external component datasheets, manufacturer websites,
          GitHub repositories, or third-party resources. We do not warrant, endorse, guarantee, or
          assume responsibility for the accuracy or reliability of any information offered by
          third-party websites linked through the site.
        </p>

        <h2 className="font-display text-xl font-semibold text-[#0B1528] pt-2">
          3. Advertising &amp; Affiliate Disclosure
        </h2>
        <p>
          {SITE_CONFIG.brandName} may display third-party advertisements (including Google AdSense)
          and sponsored content to support free engineering education and lab tools. Advertisers
          are solely responsible for the claims made in their respective ads. Some product links may
          be affiliate links, meaning we may earn a small commission at no additional cost to you.
        </p>

        <h2 className="font-display text-xl font-semibold text-[#0B1528] pt-2">
          4. Contact Us
        </h2>
        <p>
          If you have questions regarding this Disclaimer, please contact us at{' '}
          <a href={`mailto:${SITE_CONFIG.emails.info}`} className="text-[#1D4ED8] hover:underline">
            {SITE_CONFIG.emails.info}
          </a>
          .
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
