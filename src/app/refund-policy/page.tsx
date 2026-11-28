import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SITE_CONFIG } from '@/config/site';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy',
  description:
    'Refund, cancellation, and billing terms for courses, subscriptions, and hardware products on EIHOUSE INDIA.',
  alternates: { canonical: `${SITE_CONFIG.url}/refund-policy` },
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 lg:px-8 space-y-6 text-slate-700 leading-relaxed">
        <header className="space-y-2 border-b border-slate-200 pb-6">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B1528]">
            Refund &amp; Cancellation Policy
          </h1>
          <p className="text-sm text-slate-500">Last updated: November 2026</p>
        </header>

        <p>
          At <strong>{SITE_CONFIG.name}</strong> ({SITE_CONFIG.brandName}), we strive to deliver
          high-quality engineering courses, virtual lab tools, and hardware kits. Please review our
          refund and cancellation terms below before making a purchase.
        </p>

        <h2 className="font-display text-xl font-semibold text-[#0B1528] pt-2">
          1. Digital Courses &amp; Training Programs
        </h2>
        <p>
          If you are unsatisfied with an online course purchased on {SITE_CONFIG.domain}, you may
          request a refund within <strong>7 calendar days</strong> of the purchase date, provided
          less than <strong>20%</strong> of the course video content has been accessed and no course
          completion certificate or downloadable project bundle has been claimed.
        </p>

        <h2 className="font-display text-xl font-semibold text-[#0B1528] pt-2">
          2. Subscriptions &amp; Pro Memberships
        </h2>
        <p>
          You may cancel an active subscription at any time from your account dashboard before the
          next billing cycle. Cancellations stop future recurring charges; partial-month refunds for
          already-billed periods are not issued unless required by applicable law or due to a
          verified duplicate transaction.
        </p>

        <h2 className="font-display text-xl font-semibold text-[#0B1528] pt-2">
          3. Physical Hardware &amp; Prototyping Kits
        </h2>
        <p>
          Orders for physical hardware kits may be cancelled prior to dispatch. Once delivered,
          returns or replacements are accepted within <strong>7 days of delivery</strong> only if
          the item arrived damaged, defective, or incorrect (unboxing video/photo proof required).
        </p>

        <h2 className="font-display text-xl font-semibold text-[#0B1528] pt-2">
          4. Refund Processing Timeline
        </h2>
        <p>
          Approved refunds are processed to the original payment method (UPI, Credit/Debit Card,
          NetBanking) within <strong>5 to 7 business days</strong> via our payment gateway partner.
        </p>

        <h2 className="font-display text-xl font-semibold text-[#0B1528] pt-2">
          5. How to Request a Refund or Cancellation
        </h2>
        <p>
          To initiate a refund or report a billing issue, email our billing team with your Order ID
          and registered email/mobile at{' '}
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
