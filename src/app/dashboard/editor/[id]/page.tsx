'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { TiptapEditor } from '@/components/editor/TiptapEditor';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/modules/auth/auth-context';
import { getAuthorPostById } from '@/modules/posts/post-service';
import type { Post } from '@/types';

export default function EditArticlePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { firebaseUser, loading: authLoading, isEditor } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loadingPost, setLoadingPost] = useState(true);

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.replace('/auth/login');
    }
  }, [authLoading, firebaseUser, router]);

  useEffect(() => {
    if (!firebaseUser || !params.id) return;
    getAuthorPostById(params.id)
      .then((found) => {
        if (!found) {
          toast.error('Article not found.');
          router.replace('/dashboard');
          return;
        }
        if (found.authorId !== firebaseUser.uid && !isEditor) {
          toast.error('You are not authorized to edit this article.');
          router.replace('/dashboard');
          return;
        }
        setPost(found);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Unable to load article.');
        router.replace('/dashboard');
      })
      .finally(() => setLoadingPost(false));
  }, [firebaseUser, params.id, isEditor, router]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-[#0B1528] mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#0B1528]">
            Edit Article
          </h1>
        </div>

        {authLoading || loadingPost || !post ? (
          <Skeleton className="h-[520px] w-full" />
        ) : (
          <TiptapEditor initialPost={post} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
