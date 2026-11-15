import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { SITE_CONFIG } from '@/config/site';
import { ProductsCatalogClient } from '@/components/store/ProductsCatalogClient';

export const metadata: Metadata = {
  title: 'Hardware Store & Components — EI House India',
  description:
    'Shop authentic engineering development boards, IoT kits, sensors, robotics modules, 3D printing filaments, and electronic components directly or via verified suppliers.',
  alternates: { canonical: `${SITE_CONFIG.url}/products` },
};

export default function ProductsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-slate-200 bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                EI House Hardware &amp; Components Store
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0B1528] tracking-tight leading-[1.1]">
                Quality Silicon, Tested Tools &amp; Prototyping Hardware.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Hand-picked and verified engineering supplies. Buy directly from EI House lab or compare and order via our verified partner suppliers (Robu, Amazon, Quartz, DigiKey &amp; Mouser).
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild size="lg" className="bg-[#172D4D] hover:bg-[#0B1528] text-white">
                  <a href="#products-catalog">
                    <span>Browse Hardware Catalog</span>
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/contact?subject=Bulk%20Component%20Procurement">Bulk &amp; College Lab Orders</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits bar */}
        <section className="py-6 border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-slate-700">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[#F59E0B]" />
                <span><strong>100% Bench Tested Silicon:</strong> Every board pre-flashed &amp; verified.</span>
              </div>
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-[#172D4D]" />
                <span><strong>Fast Dispatch Across India:</strong> Dispatched from our central lab.</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#F59E0B]" />
                <span><strong>Trusted Suppliers Verified:</strong> Official genuine distributor links.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic Hardware Catalog with Direct Buy & Supplier Links */}
        <ProductsCatalogClient />

        {/* Bulk Ordering & College Kits */}
        <section className="py-16 bg-[#172D4D] text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-3">
                <span className="text-xs font-mono uppercase tracking-widest text-[#F59E0B]">
                  For Academic Institutions, Labs &amp; Startups
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-bold">
                  Custom Batch Hardware &amp; Component Bundles
                </h3>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                  Equipping an entire electronics, IoT, or robotics batch? We provide institutional volume pricing,
                  custom branded kits, pre-installed firmware, and tax-compliant GST invoicing.
                </p>
              </div>
              <div className="lg:col-span-4 flex flex-col gap-3">
                <Button asChild size="lg" className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0B1528] font-bold">
                  <Link href="/contact?subject=Institutional%20Bulk%20Order%20Quote">
                    <span>Request Institutional Quote</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-white border-slate-700 hover:bg-slate-800">
                  <Link href="/partnerships">Learn About College Labs</Link>
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
