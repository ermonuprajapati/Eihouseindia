import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SearchClient } from '@/components/search/SearchClient';
import { SITE_CONFIG } from '@/config/site';
import { getPublicCategories } from '@/modules/posts/public-queries';
import { searchProvider } from '@/modules/search/search-service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Search Articles',
  description:
    'Search published technical articles across electronics, semiconductors, embedded systems, robotics, and AI.',
  alternates: {
    canonical: `${SITE_CONFIG.url}/search`,
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q || '';
  const tag = sp.tag || '';
  const category = sp.category || '';

  const [categories, initialResults] = await Promise.all([
    getPublicCategories(),
    searchProvider.searchPublishedPosts({
      query: q,
      tag: tag || undefined,
      categorySlug: category || undefined,
    }),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B1528]">
            Search Knowledge Archive
          </h1>
          <p className="text-base text-slate-600">
            Filter published articles by title, category, technical tags, or contributor.
          </p>
        </div>

        <SearchClient
          initialQuery={q}
          initialTag={tag}
          initialCategory={category}
          initialResults={initialResults}
          categories={categories}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
