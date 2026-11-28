import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SITE_CONFIG } from '@/config/site';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How EIHOUSE INDIA handles authentication data, contributor profiles, and reader privacy.',
  alternates: { canonical: `${SITE_CONFIG.url}/privacy-policy` },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 lg:px-8 space-y-6 text-slate-700 leading-relaxed">
        <header className="space-y-2 border-b border-slate-200 pb-6">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B1528]">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-500">Last updated: November 2026</p>
        </header>

        <p>
          {SITE_CONFIG.name} ({SITE_CONFIG.domain}) respects your privacy. This policy outlines what
          data is collected when you read, register, or publish technical content on the platform.
        </p>

        <h2 className="font-display text-xl font-semibold text-[#0B1528] pt-2">1. Account Information</h2>
        <p>
          When you register via Firebase Authentication, we store your email address privately in
          access-controlled user documents accessible only to you and authorized administrators.
          Public author profiles display only your chosen display name, username, bio, avatar, and
          optional website.
        </p>

        <h2 className="font-display text-xl font-semibold text-[#0B1528] pt-2">2. Editorial Content & Media</h2>
        <p>
          Draft articles remain private to their authors and authorized editorial reviewers until
          approved and published. Uploaded images are securely stored and served via Cloudinary CDN.
        </p>

        <h2 className="font-display text-xl font-semibold text-[#0B1528] pt-2">3. Newsletter &amp; Contact Inquiries</h2>
        <p>
          Email addresses submitted for newsletter updates or editorial inquiries are used strictly
          for dispatching technical briefings or replying to your request.
        </p>

        <h2 className="font-display text-xl font-semibold text-[#0B1528] pt-2">4. Google AdSense &amp; Third-Party Advertising</h2>
        <p>
          We may partner with Google AdSense to display advertisements. Google, as a third-party
          vendor, uses cookies (including the DoubleClick DART cookie) to serve ads based on your
          prior visits to {SITE_CONFIG.domain} or other websites. You may opt out of personalized
          advertising by visiting Google&apos;s{' '}
          <a
            href="https://www.google.com/settings/ads"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#1D4ED8] hover:underline"
          >
            Ads Settings
          </a>
          .
        </p>

        <h2 className="font-display text-xl font-semibold text-[#0B1528] pt-2">5. Payments &amp; Contact</h2>
        <p>
          Course and store payments are processed via PCI-DSS compliant payment gateways; we do not
          store card numbers or UPI PINs on our servers. For privacy requests, contact{' '}
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
