'use client';

import React from 'react';
import Link from 'next/link';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-[#FAFBFD] px-4 font-sans text-[#0B1528]">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 font-bold text-xl">
            !
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">System Notice</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              An application error occurred. Click below to reload the platform or return home.
            </p>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2 bg-[#172D4D] text-white text-sm font-medium rounded-lg hover:bg-[#0B1528] transition-colors cursor-pointer"
            >
              Reload Application
            </button>
            <Link
              href="/"
              className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors inline-block"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
