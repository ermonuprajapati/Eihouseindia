import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  Truck,
  CheckCircle2,
  Cpu,
  Zap,
  Award,
  Layers,
  Sparkles,
  FileCheck,
  Headphones,
} from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { SITE_CONFIG } from '@/config/site';
import { ProductsCatalogClient } from '@/components/store/ProductsCatalogClient';
import { ProductsHardwareAnimation } from '@/components/animations/ProductsHardwareAnimation';

export const metadata: Metadata = {
  title: 'Hardware Store & Components — EI House India',
  description:
    'Shop authentic engineering development boards, IoT kits, sensors, robotics modules, 3D printing filaments, and electronic components directly or via verified suppliers.',
  alternates: { canonical: `${SITE_CONFIG.url}/products` },
};

export default function ProductsPage() {
  const storeHighlights = [
    {
      icon: ShieldCheck,
      title: '100% Bench Tested Silicon',
      desc: 'Every board is booted, pre-flashed with test firmware, and verified with diagnostic logs.',
    },
    {
      icon: Truck,
      title: 'Priority Dispatch Across India',
      desc: 'Dispatched securely within 24-48 hours from our central electronics prototyping lab.',
    },
    {
      icon: CheckCircle2,
      title: 'Genuine Authorized Sourcing',
      desc: 'Verified component authenticity directly from certified global and national distributors.',
    },
    {
      icon: FileCheck,
      title: 'GST Compliant Invoicing',
      desc: 'Full tax-compliant invoices for college reimbursements, R&D labs, and startup procurement.',
    },
  ];

  const labAdvantages = [
    {
      icon: Cpu,
      title: 'Pre-Loaded Test Firmware',
      desc: 'Unlike standard vendors selling unverified clones, every EI House board runs peripheral hardware self-tests before boxing.',
    },
    {
      icon: Layers,
      title: 'ESD-Safe Lab Packaging',
      desc: 'Packaged in multi-layer antistatic shielding bags with desiccant pouches to guarantee factory-fresh silicon integrity.',
    },
    {
      icon: Headphones,
      title: 'Direct Engineering Support',
      desc: 'Stuck on pinouts or drivers? Our lab engineers provide direct WhatsApp and email assistance to get your setup running.',
    },
    {
      icon: Award,
      title: 'Academic & Hackathon Bundles',
      desc: 'Special volume pricing and turnkey hardware bundles tailored for diploma, B.Tech, and M.Tech capstone batches.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />

      <main className="flex-1">
        {/* 01. Hero with Hardware Animation */}
        <section className="relative overflow-hidden border-b border-slate-200 bg-white py-14 sm:py-20">
          <ProductsHardwareAnimation />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#172D4D]/10 px-3.5 py-1 text-xs font-semibold text-[#172D4D] border border-blue-500/20 backdrop-blur-xs">
                <Sparkles className="h-3.5 w-3.5 text-[#F59E0B]" />
                <span>EI House Hardware &amp; Silicon Supply Chain</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              <div className="space-y-3">
                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0B1528] tracking-tight leading-[1.08] text-balance">
                  Quality Silicon, Tested Tools &amp; Prototyping Hardware.
                </h1>
                <p className="text-xl sm:text-2xl font-semibold text-[#172D4D]">
                  Curated for Builders, Student Innovators &amp; Engineering Labs.
                </p>
              </div>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                Hand-picked and verified engineering supplies. Buy directly from EI House lab or compare and order via our verified partner suppliers (Robu, Amazon, Quartz, DigiKey &amp; Mouser).
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button asChild size="lg" className="bg-[#172D4D] hover:bg-[#0B1528] text-white shadow-md">
                  <a href="#products-catalog">
                    <span>Browse Hardware Catalog</span>
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-slate-300 hover:bg-slate-50">
                  <Link href="/contact?subject=Bulk%20Component%20Procurement">Bulk &amp; College Lab Orders</Link>
                </Button>
                <Button asChild variant="ghost" size="lg" className="text-slate-700 hover:text-[#0B1528]">
                  <a href="#lab-advantages">Why EI House Lab? →</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* 02. Executive Trust & Guarantee Bar */}
        <section className="py-6 border-b border-slate-200 bg-slate-50/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs text-slate-700">
              {storeHighlights.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                      <Icon className="h-4 w-4 text-[#F59E0B]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#0B1528]">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 03. Dynamic Hardware Catalog with Direct Buy, Multi-Image Gallery & External Supplier Sourcing */}
        <ProductsCatalogClient />

        {/* 04. Engineering Quality Assurance (Why Buy from EI House Lab) */}
        <section id="lab-advantages" className="py-16 sm:py-20 border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                The Engineering Standard
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0B1528]">
                Why Engineers &amp; Labs Choose EI House
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                Standard consumer marketplaces are flooded with unverified clones and untested microcontrollers.
                At EI House, every piece of silicon is treated as a mission-critical prototyping asset.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {labAdvantages.map((adv, idx) => {
                const Icon = adv.icon;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200 bg-[#FAFBFD] p-6 space-y-4 hover:border-blue-400 hover:shadow-md transition-all group"
                  >
                    <div className="h-12 w-12 rounded-xl bg-[#172D4D]/10 text-[#172D4D] group-hover:bg-[#172D4D] group-hover:text-white transition-colors flex items-center justify-center">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-display text-lg font-bold text-[#0B1528]">{adv.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{adv.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 05. Bulk Ordering & Institutional Hardware Bundles */}
        <section className="py-16 sm:py-20 bg-gradient-to-br from-[#172D4D] via-[#0B1528] to-[#172D4D] text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[#F59E0B] bg-white/10 px-3 py-1 rounded-full">
                  <Zap className="h-3 w-3" />
                  Institutional &amp; Academic Supply Chain
                </span>
                <h3 className="font-display text-3xl sm:text-4xl font-extrabold leading-tight">
                  Equipping An Entire Electronics Batch or Innovation Lab?
                </h3>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                  We supply turnkey component batches for colleges, polytechnics, and maker labs across India.
                  Get customized bill of materials (BOM), pre-programmed firmware kits, warranty replacements, and GST invoicing.
                </p>
                <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#F59E0B]" />
                    <span>Special Batch Volume Pricing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#F59E0B]" />
                    <span>Custom Silkscreen &amp; Packaging</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#F59E0B]" />
                    <span>Replacement &amp; Bench Warranty</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 flex flex-col gap-3">
                <Button asChild size="lg" className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0B1528] font-bold shadow-lg">
                  <Link href="/contact?subject=Institutional%20Bulk%20Order%20Quote">
                    <span>Request Institutional Quote</span>
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-white border-slate-600 hover:bg-white/10">
                  <Link href="/partnerships">Explore Lab Partnerships →</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
