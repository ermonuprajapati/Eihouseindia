import React from 'react';
import Image from 'next/image';

export default function GlobalLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFBFD] px-4">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center">
        {/* Animated Brand Emblem */}
        <div className="relative flex items-center justify-center h-16 w-16">
          <div className="absolute inset-0 rounded-2xl bg-blue-100/60 animate-ping opacity-30" />
          <div className="relative h-14 w-14 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-center p-2.5">
            <Image
              src="/images/logo.png"
              alt="EI House India"
              width={40}
              height={40}
              className="h-9 w-9 object-contain"
              priority
            />
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-1 mt-2">
          <div className="font-display text-base font-bold text-[#0B1528] tracking-tight">
            EI HOUSE INDIA
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Loading next generation engineering platform...
          </p>
        </div>

        {/* Subtle Progress Bar */}
        <div className="w-40 h-1 bg-slate-200 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-full animate-[shimmer_1.5s_infinite_linear] w-full" />
        </div>
      </div>
    </div>
  );
}
