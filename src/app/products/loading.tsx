import React from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';

export default function ProductsLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header Skeleton */}
        <div className="space-y-3 mb-8">
          <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-96 bg-slate-100 rounded animate-pulse" />
        </div>

        {/* Filter bar Skeleton */}
        <div className="h-11 w-full bg-slate-100 rounded-lg animate-pulse mb-8" />

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
              <div className="h-44 w-full bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
              <div className="flex items-center justify-between pt-2">
                <div className="h-5 w-16 bg-slate-200 rounded animate-pulse" />
                <div className="h-8 w-20 bg-slate-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
