'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { getPublishedPostsPaginated } from '@/modules/posts/post-service';
import { ArticleCard } from '@/components/articles/ArticleCard';
import { Button } from '@/components/ui/button';
import type { Category, Post } from '@/types';

export function PaginatedArticlesList({
  initialPosts,
  categories,
  activeCategorySlug,
}: {
  initialPosts: Post[];
  categories: Category[];
  activeCategorySlug?: string;
}) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(initialPosts.length >= 9);
  const [loadingMore, setLoadingMore] = useState(false);

  const activeCategory = categories.find((c) => c.slug === activeCategorySlug);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await getPublishedPostsPaginated({
        categoryId: activeCategory?.id,
        pageSize: 9,
        cursor,
      });
      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const next = res.posts.filter((p) => !existingIds.has(p.id));
        return [...prev, ...next];
      });
      setCursor(res.lastDoc);
      setHasMore(res.hasMore);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Category Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
        <Link
          href="/articles"
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            !activeCategorySlug
              ? 'bg-[#0B1528] text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          All Topics
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/category/${cat.slug}`}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeCategorySlug === cat.slug
                ? 'bg-[#0B1528] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <h2 className="font-display text-2xl font-semibold text-[#0B1528]">
            No published articles yet
          </h2>
          <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
            {activeCategory
              ? `No articles have been published under ${activeCategory.name} yet.`
              : 'No articles have been published to EIHOUSE INDIA yet.'}{' '}
            Engineers and contributors can submit technical articles from the dashboard.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild variant="primary">
              <Link href="/dashboard/editor">Write an Article</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Return Home</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <ArticleCard key={post.id} post={post} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading more...' : 'Load More Articles'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
