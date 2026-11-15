import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  Building2,
  UserCheck,
  Clock,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Cpu,
} from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { ContactForm } from '@/components/contact/ContactForm';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildContactPageJsonLd, buildOrganizationJsonLd } from '@/lib/seo';
import { SITE_CONFIG } from '@/config/site';
import { ContactRadarAnimation } from '@/components/animations/ContactRadarAnimation';

export const metadata: Metadata = {
  title: `Contact EI House | Founder Monu Prajapati — Engineering Innovation House`,
  description:
    'Contact Engineering Innovation House (EI House / EIHOUSE INDIA) and Founder & Proprietor Monu Prajapati. Reach our founder desk, engineering R&D team, STEM education inquiries, or institutional partnerships.',
  keywords: [
    'Contact EI House',
    'Contact EIHOUSE INDIA',
    'EI House India Contact',
    'Monu Prajapati Contact',
    'Er Monu Prajapati Email',
    'Founder of EI House Contact',
    'Who owns EI House',
    'Engineering Innovation House Office',
    'EI House Support Desk',
  ],
  alternates: { canonical: `${SITE_CONFIG.url}/contact` },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <JsonLd data={buildContactPageJsonLd()} />
      <JsonLd data={buildOrganizationJsonLd()} />
      <SiteHeader />

      <main className="flex-1 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header Banner with Radar Telemetry Animation */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 shadow-xs space-y-4">
            <ContactRadarAnimation />
            <div className="relative z-10 max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#172D4D]/10 px-3.5 py-1 text-xs font-semibold text-[#172D4D]">
                <Sparkles className="h-3.5 w-3.5 text-[#F59E0B]" />
                <span>Executive &amp; Technical Directory</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0B1528] tracking-tight">
                Contact EI House
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Connect with <strong>Engineering Innovation House (EI House)</strong> and Founder &amp; Proprietor{' '}
                <strong>{SITE_CONFIG.founder.fullNameWithPrefix}</strong> for educational programs, hardware prototyping,
                industrial R&amp;D services, and institutional collaborations.
              </p>
            </div>
          </div>

          {/* 2-Column Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left Column: Leadership, Legal Entity & Channels */}
            <div className="lg:col-span-5 space-y-6">
              {/* Founder Desk Card */}
              <div id="founder" className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-5 relative overflow-hidden">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0 overflow-hidden rounded-xl border border-amber-400/50 shadow-md bg-slate-900 h-16 w-16">
                    <Image
                      src="/images/founder/monu-prajapati-square.jpg"
                      alt="Er. Monu Prajapati — Founder & Proprietor"
                      width={128}
                      height={128}
                      priority
                      className="h-full w-full object-cover object-top hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#F59E0B] uppercase tracking-wider">
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Executive Desk</span>
                    </div>
                    <h2 className="font-display text-xl font-bold text-[#0B1528]">
                      {SITE_CONFIG.founder.fullNameWithPrefix}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      {SITE_CONFIG.founder.designation} · {SITE_CONFIG.shortName}
                    </p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  For institutional partnerships, college lab setups, investor discussions, and bespoke hardware engineering consulting, reach the Founder directly:
                </p>

                <div className="space-y-2 rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Direct Founder Email:</span>
                    <a
                      href={`mailto:${SITE_CONFIG.founder.email}`}
                      className="font-semibold text-[#172D4D] hover:underline"
                    >
                      {SITE_CONFIG.founder.email}
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Official Office Desk:</span>
                    <a
                      href={`mailto:${SITE_CONFIG.contactEmail}`}
                      className="font-semibold text-[#172D4D] hover:underline"
                    >
                      {SITE_CONFIG.contactEmail}
                    </a>
                  </div>
                </div>

                <div className="pt-1">
                  <Link
                    href="/about#founder"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#172D4D] hover:underline"
                  >
                    <span>Read Complete Founder Bio &amp; Vision</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Legal Entity & Registration Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0B1528]">
                  <Building2 className="h-4 w-4 text-[#172D4D]" />
                  <span>Legal Entity &amp; Registration</span>
                </div>

                <div className="space-y-3 text-xs text-slate-600">
                  <div className="flex items-start justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Legal Enterprise:</span>
                    <span className="font-semibold text-[#0B1528] text-right">{SITE_CONFIG.name}</span>
                  </div>
                  <div className="flex items-start justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Trade Names:</span>
                    <span className="font-semibold text-[#0B1528] text-right">EI House / EIHOUSE INDIA</span>
                  </div>
                  <div className="flex items-start justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Business Constitution:</span>
                    <span className="font-semibold text-[#0B1528] text-right">{SITE_CONFIG.entity.legalType}</span>
                  </div>
                  <div className="flex items-start justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Sole Proprietor:</span>
                    <span className="font-semibold text-[#0B1528] text-right">{SITE_CONFIG.founder.fullNameWithPrefix}</span>
                  </div>
                  <div className="flex items-start justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Country of Incorporation:</span>
                    <span className="font-semibold text-[#0B1528] text-right">Republic of India</span>
                  </div>
                  <div className="flex items-start justify-between py-1">
                    <span className="text-slate-500">Official Portal:</span>
                    <a href={`https://${SITE_CONFIG.domain}`} className="font-semibold text-[#172D4D] hover:underline text-right">
                      https://{SITE_CONFIG.domain}
                    </a>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Verified Indian MSME / Udyam Engineering Enterprise</span>
                </div>
              </div>

              {/* Working Hours & Channels */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0B1528]">
                  <Clock className="h-4 w-4 text-[#F59E0B]" />
                  <span>Support Hours &amp; Operations</span>
                </div>

                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Working Days:</span>
                    <span className="font-semibold text-[#0B1528]">Monday &ndash; Saturday</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Operating Hours:</span>
                    <span className="font-semibold text-[#0B1528]">09:00 AM &ndash; 07:00 PM IST</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Response Standard:</span>
                    <span className="font-semibold text-emerald-700">Within 24 business hours</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <Link
                    href="/learn"
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 flex flex-col gap-1 transition-colors"
                  >
                    <GraduationCap className="h-4 w-4 text-[#172D4D]" />
                    <span className="font-semibold text-[#0B1528]">Course Desk</span>
                    <span className="text-[11px] text-slate-500">45-day practicals</span>
                  </Link>
                  <Link
                    href="/services"
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 flex flex-col gap-1 transition-colors"
                  >
                    <Cpu className="h-4 w-4 text-[#F59E0B]" />
                    <span className="font-semibold text-[#0B1528]">R&amp;D Services</span>
                    <span className="text-[11px] text-slate-500">PCB &amp; Prototypes</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Inquiry Form */}
            <div className="lg:col-span-7 space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-5">
                <div className="space-y-1.5 border-b border-slate-100 pb-4">
                  <h2 className="font-display text-2xl font-bold text-[#0B1528]">
                    Send an Official Inquiry
                  </h2>
                  <p className="text-sm text-slate-600">
                    Submit your inquiry below. Our team and leadership desk actively monitor incoming messages.
                  </p>
                </div>

                <ContactForm />
              </div>

              {/* Inquiry category guidance */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-3 text-xs text-slate-600">
                <p className="font-semibold text-[#0B1528]">Recommended Inquiry Types:</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#172D4D]" />
                    <span><strong>Founder Desk:</strong> Strategic collaborations &amp; labs</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                    <span><strong>STEM Training:</strong> Batch enrollment &amp; offline labs</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#172D4D]" />
                    <span><strong>Hardware &amp; R&amp;D:</strong> PCB design, 3D printing, IoT</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                    <span><strong>Technical Editorial:</strong> Author publishing &amp; errata</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
