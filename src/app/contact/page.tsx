import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { ContactForm } from '@/components/contact/ContactForm';
import { SITE_CONFIG } from '@/config/site';

export const metadata: Metadata = {
  title: 'Contact Editorial Desk',
  description: 'Reach the EIHOUSE INDIA editorial desk for technical submissions, corrections, or industry partnerships.',
  alternates: { canonical: `${SITE_CONFIG.url}/contact` },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 lg:px-8 space-y-8">
        <header className="space-y-3 border-b border-slate-200 pb-6">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B1528]">
            Contact Editorial Desk
          </h1>
          <p className="text-base text-slate-600">
            Questions about contributor reviews, technical errata, or industry collaborations? Reach us directly at{' '}
            <a href={`mailto:${SITE_CONFIG.contactEmail}`} className="text-[#1D4ED8] hover:underline">
              {SITE_CONFIG.contactEmail}
            </a>{' '}
            or submit the form below.
          </p>
        </header>

        <ContactForm />
      </main>
      <SiteFooter />
    </div>
  );
}
