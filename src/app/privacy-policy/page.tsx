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

        <h2 className="font-display text-xl font-semibold text-[#0B1528] pt-2">3. Newsletter & Contact Inquiries</h2>
        <p>
          Email addresses submitted for newsletter updates or editorial inquiries are used strictly
          for dispatching technical briefings or replying to your request.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
