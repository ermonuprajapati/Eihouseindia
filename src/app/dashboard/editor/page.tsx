'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { TiptapEditor } from '@/components/editor/TiptapEditor';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/modules/auth/auth-context';

export default function NewArticleEditorPage() {
  const router = useRouter();
  const { firebaseUser, loading } = useAuth();

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace('/auth/login');
    }
  }, [loading, firebaseUser, router]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-[#0B1528] mb-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Dashboard</span>
            </Link>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#0B1528]">
              Write New Article
            </h1>
          </div>
        </div>

        {loading || !firebaseUser ? (
          <Skeleton className="h-[520px] w-full" />
        ) : (
          <TiptapEditor />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
