import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center space-y-4">
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
            404 — Not Found
          </p>
          <h1 className="font-display text-3xl font-semibold text-[#0B1528]">
            Dispatch Not Found
          </h1>
          <p className="text-sm text-slate-600">
            This article, category, or author profile could not be found or is not publicly published.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Button asChild variant="primary">
              <Link href="/articles">Browse Published Articles</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Return Home</Link>
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
