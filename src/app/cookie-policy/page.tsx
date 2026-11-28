import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SITE_CONFIG } from '@/config/site';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description:
    'Information on how EIHOUSE INDIA uses essential cookies, analytics, and Google AdSense advertising cookies.',
  alternates: { canonical: `${SITE_CONFIG.url}/cookie-policy` },
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 lg:px-8 space-y-6 text-slate-700 leading-relaxed">
        <header className="space-y-2 border-b border-slate-200 pb-6">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B1528]">
            Cookie Policy
          </h1>
          <p className="text-sm text-slate-500">Last updated: November 2026</p>
        </header>

        <p>
          This Cookie Policy explains how <strong>{SITE_CONFIG.name}</strong> ({SITE_CONFIG.domain})
          uses cookies, local storage, and similar technologies when you visit or interact with our
          platform, including the 3D Virtual Engineering Lab and learning portal.
        </p>

        <h2 className="font-display text-xl font-semibold text-[#0B1528] pt-2">
          1. Essential &amp; Functional Cookies
        </h2>
        <p>
          We use essential browser storage and authentication cookies (via Firebase Auth) to keep
          you signed in securely, remember your session preferences, and store temporary drafts in
          the Engineering Lab before syncing to your cloud account.
        </p>

        <h2 className="font-display text-xl font-semibold text-[#0B1528] pt-2">
          2. Analytics &amp; Performance Cookies
        </h2>
        <p>
          We may use privacy-friendly analytics (such as Google Analytics and Vercel Speed Insights)
          to understand which technical articles, calculators, and datasheets are most helpful to
          engineers and students, allowing us to improve site speed and content quality.
        </p>

        <h2 className="font-display text-xl font-semibold text-[#0B1528] pt-2">
          3. Google AdSense &amp; Third-Party Advertising Cookies
        </h2>
        <p>
          Third-party vendors, including Google, use cookies to serve ads based on a user&apos;s
          prior visits to this website or other websites. Google&apos;s use of advertising cookies
          (such as the DoubleClick DART cookie) enables it and its partners to serve ads to you
          based on your visit to {SITE_CONFIG.domain} and/or other sites on the Internet.
        </p>
        <p>
          You may opt out of personalized advertising by visiting{' '}
          <a
            href="https://www.google.com/settings/ads"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#1D4ED8] hover:underline"
          >
            Google Ads Settings
          </a>
          .
        </p>

        <h2 className="font-display text-xl font-semibold text-[#0B1528] pt-2">
          4. Managing Cookies in Your Browser
        </h2>
        <p>
          Most web browsers allow you to control, block, or clear cookies through browser settings.
          Please note that disabling essential cookies or local storage may affect login persistence
          and local saving inside the Engineering Lab.
        </p>

        <p className="text-sm text-slate-500 pt-2">
          For more details on how we handle personal data, see our{' '}
          <Link href="/privacy-policy" className="text-[#1D4ED8] hover:underline">
            Privacy Policy
          </Link>{' '}
          or email{' '}
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
