import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SITE_CONFIG } from '@/config/site';

export const metadata: Metadata = {
  title: 'Shipping & Digital Delivery Policy',
  description:
    'Delivery timelines for instant digital courses, engineering lab access, and physical hardware kits from EIHOUSE INDIA.',
  alternates: { canonical: `${SITE_CONFIG.url}/shipping-policy` },
};

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 lg:px-8 space-y-6 text-slate-700 leading-relaxed">
        <header className="space-y-2 border-b border-slate-200 pb-6">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B1528]">
            Shipping &amp; Digital Delivery Policy
          </h1>
          <p className="text-sm text-slate-500">Last updated: November 2026</p>
        </header>

        <h2 className="font-display text-xl font-semibold text-[#0B1528] pt-2">
          1. Instant Digital Course &amp; Software Delivery
        </h2>
        <p>
          All online courses, Pro memberships, digital datasheets, and Engineering Lab upgrades are
          delivered <strong>instantly</strong> upon successful payment confirmation. Access is
          automatically unlocked in your{' '}
          <a href="/dashboard" className="text-[#1D4ED8] hover:underline">
            EI HOUSE Dashboard
          </a>
          , and an official payment receipt is dispatched from{' '}
          <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
            {SITE_CONFIG.emails.admin}
          </span>{' '}
          along with onboarding instructions from{' '}
          <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
            {SITE_CONFIG.emails.info}
          </span>
          .
        </p>

        <h2 className="font-display text-xl font-semibold text-[#0B1528] pt-2">
          2. Physical Hardware Kits &amp; Components (India)
        </h2>
        <p>
          For physical electronics kits, development boards, or lab hardware ordered through our
          store:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            <strong>Order Processing:</strong> Orders are tested, ESD-safe packed, and dispatched
            within <strong>1 to 2 business days</strong>.
          </li>
          <li>
            <strong>Delivery Timeline:</strong> Standard pan-India courier delivery takes{' '}
            <strong>3 to 7 business days</strong> depending on pin code serviceability.
          </li>
          <li>
            <strong>Order Tracking:</strong> Tracking details and courier AWB numbers are emailed
            to your registered address once shipped.
          </li>
        </ul>

        <h2 className="font-display text-xl font-semibold text-[#0B1528] pt-2">
          3. Support &amp; Delivery Assistance
        </h2>
        <p>
          If you have not received digital course access within 15 minutes of payment, or need
          assistance with a physical shipment, contact{' '}
          <a href={`mailto:${SITE_CONFIG.emails.admin}`} className="text-[#1D4ED8] hover:underline font-medium">
            {SITE_CONFIG.emails.admin}
          </a>
          .
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
