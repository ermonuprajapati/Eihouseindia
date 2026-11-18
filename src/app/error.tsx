'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log sanitized error details to console in development
    console.error('Captured client application error:', error?.message);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFBFD] px-4 py-12">
      <div className="max-w-md w-full rounded-2xl border border-slate-200/90 bg-white p-8 text-center shadow-lg space-y-6">
        {/* Warning Icon Emblem */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold text-[#0B1528] tracking-tight">
            Unexpected Interruption
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            A temporary issue interrupted the current page. You can safely try reloading or return to the main dashboard.
          </p>
        </div>

        {error?.digest && (
          <p className="font-mono text-[11px] text-slate-400 bg-slate-50 border border-slate-100 rounded py-1 px-2 select-all">
            Reference Code: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          <Button
            onClick={reset}
            className="bg-[#172D4D] hover:bg-[#0B1528] text-white flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </Button>
          <Button asChild variant="outline" className="border-slate-300 flex items-center justify-center gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
