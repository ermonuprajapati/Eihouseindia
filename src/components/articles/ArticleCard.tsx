'use client';

import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Edit3 } from 'lucide-react';
import { useOptionalAuth } from '@/modules/auth/auth-context';
import type { Post } from '@/types';
import { ArticleCoverMedia } from './ArticleCoverMedia';

export { ArticleCoverMedia };

export function ArticleCard({ post }: { post: Post }) {
  const auth = useOptionalAuth();
  const isEditor = Boolean(auth?.isEditor);
  const dateLabel = format(new Date(post.publishedAt || post.createdAt), 'MMM d, yyyy');

  return (
    <article className="group flex flex-col justify-between border-b border-slate-200 pb-6 sm:border sm:rounded-lg sm:bg-white sm:p-5 sm:hover:border-slate-300 transition-colors">
      <div>
        <Link href={`/blog/${post.slug}`} prefetch={false} className="block mb-4">
          <ArticleCoverMedia src={post.coverImage} alt={post.title} aspectClass="aspect-[4/3]" />
        </Link>

        {/* Zero-pill metadata */}
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <Link
            href={`/category/${post.categorySlug || post.categoryId}`}
            prefetch={false}
            className="font-medium text-[#1D4ED8] hover:underline py-0.5"
          >
            {post.categoryName || 'Engineering'}
          </Link>
          <span aria-hidden="true">·</span>
          <time dateTime={post.publishedAt || post.createdAt}>{dateLabel}</time>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{post.readingTime} min read</span>
        </div>

        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-xl font-semibold leading-snug text-[#0B1528] group-hover:text-[#1D4ED8] transition-colors text-balance">
            <Link href={`/blog/${post.slug}`} prefetch={false} className="inline-block py-0.5">
              {post.title}
            </Link>
          </h3>
          {isEditor && (
            <Link
              href={`/dashboard/editor/${post.id}`}
              prefetch={false}
              className="shrink-0 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-[#0B1528] hover:text-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 transition-colors mt-1"
              title="Edit this article"
            >
              <Edit3 className="h-3 w-3" />
              <span>Edit</span>
            </Link>
          )}
        </div>

        <p className="mt-2.5 text-sm leading-relaxed text-slate-600 line-clamp-3">
          {post.excerpt}
        </p>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <Link
          href={`/author/${post.authorUsername || 'editorial'}`}
          prefetch={false}
          className="font-medium text-slate-700 hover:text-[#0B1528] transition-colors py-1"
        >
          {post.authorName || 'EIHOUSE INDIA Editorial'}
        </Link>
        {post.tags.length > 0 && (
          <span className="truncate max-w-[140px] text-slate-500">
            {post.tags.slice(0, 2).join(', ')}
          </span>
        )}
      </div>
    </article>
  );
}
