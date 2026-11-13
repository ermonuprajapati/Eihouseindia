'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application boundary caught error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFBFD] px-4">
      <div className="max-w-md w-full rounded-lg border border-slate-200 bg-white p-8 text-center space-y-4">
        <h1 className="font-display text-2xl font-semibold text-[#0B1528]">
          Something went wrong
        </h1>
        <p className="text-sm text-slate-600">
          An unexpected error interrupted this page. You can retry loading or return to the homepage.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button onClick={reset} variant="primary">
            Try Again
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Homepage</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
