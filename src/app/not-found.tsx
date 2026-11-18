import React from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { Compass, Cpu, BookOpen, ShoppingBag, FileText, ArrowRight } from 'lucide-react';

export default function NotFoundPage() {
  const helpfulLinks = [
    { label: 'Universal Engineering Lab', href: '/engineering-lab', desc: '2D/3D circuit simulation & PCB CAD', icon: Cpu },
    { label: 'Courses & Training', href: '/learn', desc: 'Embedded systems, robotics & IoT modules', icon: BookOpen },
    { label: 'Prototyping Store', href: '/products', desc: 'Microcontrollers, sensors & components', icon: ShoppingBag },
    { label: 'Datasheet Finder', href: '/datasheets', desc: 'Technical specifications & pinouts', icon: FileText },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
        <div className="max-w-xl w-full text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-semibold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5" />
            <span>404 — Page Not Found</span>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1528] tracking-tight">
              We couldn’t find that page
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
              The link you clicked may be broken, or the page may have been moved or updated.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild size="default" className="bg-[#172D4D] hover:bg-[#0B1528] text-white font-medium">
              <Link href="/">
                <span>Back to Home</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="default" className="border-slate-300">
              <Link href="/engineering-lab">
                <span>Launch Engineering Lab</span>
              </Link>
            </Button>
          </div>

          {/* Helpful Navigation Cards */}
          <div className="border-t border-slate-200 pt-8 mt-8 text-left">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 text-center">
              Popular Platform Destinations
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {helpfulLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-sm transition-all group flex items-start gap-3"
                  >
                    <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-blue-50 text-slate-600 group-hover:text-blue-700 transition-colors shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#0B1528] group-hover:text-blue-700 transition-colors flex items-center justify-between">
                        <span>{item.label}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
