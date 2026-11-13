'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Cpu } from 'lucide-react';
import type { Post } from '@/types';

const DEFAULT_FALLBACK_IMAGES = [
  '/images/pcb-workbench.jpg',
  '/images/robotics-actuator.jpg',
  '/images/embedded-sensors.jpg',
  '/images/hero-semiconductor.jpg',
];

export function ArticleCoverMedia({
  src,
  alt,
  aspectClass = 'aspect-[4/3]',
}: {
  src?: string;
  alt: string;
  aspectClass?: string;
}) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = src && src.trim().length > 0 ? src : DEFAULT_FALLBACK_IMAGES[0];

  if (failed) {
    return (
      <div
        className={`${aspectClass} w-full rounded-md border border-slate-200 bg-gradient-to-br from-[#0B1528] to-slate-800 flex flex-col items-center justify-center p-6 text-center text-slate-300`}
      >
        <Cpu className="h-8 w-8 text-slate-400 mb-2" />
        <span className="text-xs font-medium text-slate-300 line-clamp-2 max-w-[220px]">{alt}</span>
      </div>
    );
  }

  return (
    <div className={`${aspectClass} w-full overflow-hidden rounded-md border border-slate-200 bg-slate-100`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        loading="lazy"
      />
    </div>
  );
}

export function ArticleCard({ post }: { post: Post }) {
  const dateLabel = format(new Date(post.publishedAt || post.createdAt), 'MMM d, yyyy');

  return (
    <article className="group flex flex-col justify-between border-b border-slate-200 pb-6 sm:border sm:rounded-lg sm:bg-white sm:p-5 sm:hover:border-slate-300 transition-colors">
      <div>
        <Link href={`/blog/${post.slug}`} className="block mb-4">
          <ArticleCoverMedia src={post.coverImage} alt={post.title} aspectClass="aspect-[4/3]" />
        </Link>

        {/* Zero-pill metadata */}
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <Link
            href={`/category/${post.categorySlug || post.categoryId}`}
            className="font-medium text-[#1D4ED8] hover:underline"
          >
            {post.categoryName || 'Engineering'}
          </Link>
          <span aria-hidden="true">·</span>
          <time dateTime={post.publishedAt || post.createdAt}>{dateLabel}</time>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{post.readingTime} min read</span>
        </div>

        <h3 className="font-display text-xl font-semibold leading-snug text-[#0B1528] group-hover:text-[#1D4ED8] transition-colors text-balance">
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>

        <p className="mt-2.5 text-sm leading-relaxed text-slate-600 line-clamp-3">
          {post.excerpt}
        </p>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <Link
          href={`/author/${post.authorUsername || 'editorial'}`}
          className="font-medium text-slate-700 hover:text-[#0B1528] transition-colors"
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
