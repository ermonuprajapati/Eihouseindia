'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { searchProvider, type SearchSuggestion } from '@/modules/search/search-service';
import { ArticleCard } from '@/components/articles/ArticleCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Category, Post } from '@/types';

export function SearchClient({
  initialQuery,
  initialTag,
  initialCategory,
  initialResults,
  categories,
}: {
  initialQuery: string;
  initialTag: string;
  initialCategory: string;
  initialResults: Post[];
  categories: Category[];
}) {
  const [queryText, setQueryText] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [activeTag, setActiveTag] = useState(initialTag);
  const [results, setResults] = useState<Post[]>(initialResults);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = queryText.trim();
    if (trimmed.length < 2) {
      return;
    }
    const timer = setTimeout(() => {
      searchProvider.getSuggestions(trimmed).then(setSuggestions).catch(() => setSuggestions([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [queryText]);

  const executeSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearching(true);
    try {
      const matched = await searchProvider.searchPublishedPosts({
        query: queryText,
        categorySlug: selectedCategory || undefined,
        tag: activeTag || undefined,
      });
      setResults(matched);
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-8">
      <form
        onSubmit={executeSearch}
        className="rounded-lg border border-slate-200 bg-white p-5 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="relative md:col-span-6">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              value={queryText}
              onChange={(e) => {
                const val = e.target.value;
                setQueryText(val);
                if (val.trim().length < 2) {
                  setSuggestions([]);
                }
              }}
              placeholder="Search by title, technology, tag, or author..."
              className="pl-9"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by category"
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-[#0B1528] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 flex gap-2">
            <Input
              value={activeTag}
              onChange={(e) => setActiveTag(e.target.value)}
              placeholder="Tag filter"
              aria-label="Filter by tag"
            />
            <Button type="submit" variant="primary" disabled={searching}>
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </div>

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Suggested Articles
            </p>
            <ul className="divide-y divide-slate-100">
              {suggestions.map((s) => (
                <li key={s.slug} className="py-2 flex items-center justify-between text-sm">
                  <Link href={`/blog/${s.slug}`} className="text-[#0B1528] hover:text-[#1D4ED8] font-medium">
                    {s.title}
                  </Link>
                  <span className="text-xs text-slate-500">{s.categoryName}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>

      <div>
        <p className="text-sm text-slate-600 mb-4 tabular-nums">
          {results.length} published {results.length === 1 ? 'article' : 'articles'} found
        </p>

        {results.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
            No published articles matched your search criteria. Try broadening your query or browsing{' '}
            <Link href="/articles" className="text-[#1D4ED8] hover:underline">
              all published articles
            </Link>
            .
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((post) => (
              <ArticleCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
