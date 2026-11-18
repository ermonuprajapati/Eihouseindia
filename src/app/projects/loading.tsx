import React from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';

export default function ProjectsLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header Skeleton */}
        <div className="space-y-3 mb-8">
          <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-72 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-96 bg-slate-100 rounded animate-pulse" />
        </div>

        {/* Filter bar Skeleton */}
        <div className="h-10 w-full max-w-md bg-slate-100 rounded-lg animate-pulse mb-8" />

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="h-48 w-full bg-slate-100 animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
                <div className="h-5 w-4/5 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-slate-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
