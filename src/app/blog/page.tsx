import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { PaginatedArticlesList } from '@/components/articles/PaginatedArticlesList';
import { SITE_CONFIG } from '@/config/site';
import { getPublicCategories, getPublishedPosts } from '@/modules/posts/public-queries';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Engineering Blog & Technical Articles',
  description:
    'Explore peer-reviewed articles across electronics components, semiconductor technology, embedded systems, robotics, and AI.',
  alternates: {
    canonical: `${SITE_CONFIG.url}/blog`,
  },
};

export default async function BlogIndexPage() {
  const [posts, categories] = await Promise.all([
    getPublishedPosts({ limitCount: 9 }),
    getPublicCategories(),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B1528]">
            Engineering Blog &amp; Technical Dispatches
          </h1>
          <p className="text-base text-slate-600 max-w-2xl">
            Curated engineering articles, hardware deep dives, circuit tutorials, and R&amp;D breakthroughs on EIHOUSE INDIA.
          </p>
        </div>

        <PaginatedArticlesList initialPosts={posts} categories={categories} />
      </main>
      <SiteFooter />
    </div>
  );
}
