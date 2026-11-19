import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { PaginatedArticlesList } from '@/components/articles/PaginatedArticlesList';
import { SITE_CONFIG } from '@/config/site';
import { getPublicCategories, getPublishedPostsFeed } from '@/modules/posts/public-queries';
import { BlogWaveformAnimation } from '@/components/animations/BlogWaveformAnimation';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Engineering Blog & Technical Articles',
  description:
    'Explore peer-reviewed articles across electronics components, semiconductor technology, embedded systems, robotics, and AI.',
  alternates: {
    canonical: `${SITE_CONFIG.url}/articles`,
  },
};

export default async function BlogIndexPage() {
  const [feed, categories] = await Promise.all([
    getPublishedPostsFeed({ limit: 9, offset: 0 }),
    getPublicCategories(),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-[#172D4D] to-slate-900 p-8 sm:p-10 text-white mb-8 shadow-md">
          <BlogWaveformAnimation />
          <div className="relative z-10 space-y-2">
            <h1 className="font-display text-3xl sm:text-4xl font-bold">
              Engineering Blog &amp; Technical Dispatches
            </h1>
            <p className="text-base text-slate-300 max-w-2xl">
              Curated engineering articles, hardware deep dives, circuit tutorials, and R&amp;D breakthroughs on EIHOUSE INDIA.
            </p>
          </div>
        </div>

        <PaginatedArticlesList
          initialPosts={feed.posts}
          categories={categories}
          totalCount={feed.total}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
