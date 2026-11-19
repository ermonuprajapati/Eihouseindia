import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { PaginatedArticlesList } from '@/components/articles/PaginatedArticlesList';
import { JsonLd } from '@/components/seo/JsonLd';
import { SITE_CONFIG } from '@/config/site';
import { buildBreadcrumbJsonLd } from '@/lib/seo';
import { getPublicCategories, getPublishedPostsFeed } from '@/modules/posts/public-queries';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const categories = await getPublicCategories();
  const category = categories.find((c) => c.slug === slug || c.id === slug);
  if (!category) {
    return { title: 'Category Not Found' };
  }
  const canonical = `${SITE_CONFIG.url}/category/${category.slug}`;

  // Check if category has articles to prevent Google from indexing thin/empty taxonomy pages
  const feed = await getPublishedPostsFeed({
    categoryId: category.id,
    limit: 1,
    offset: 0,
  });
  const hasArticles = feed.total > 0;

  return {
    title: category.name,
    description: category.description,
    alternates: { canonical },
    robots: {
      index: hasArticles,
      follow: true,
    },
    openGraph: {
      title: `${category.name} — ${SITE_CONFIG.name}`,
      description: category.description,
      url: canonical,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const categories = await getPublicCategories();
  const category = categories.find((c) => c.slug === slug || c.id === slug);
  if (!category) {
    notFound();
  }

  const feed = await getPublishedPostsFeed({
    categoryId: category.id,
    limit: 9,
    offset: 0,
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: 'Home', url: SITE_CONFIG.url },
          { name: category.name, url: `${SITE_CONFIG.url}/category/${category.slug}` },
        ])}
      />
      <SiteHeader />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-2 border-b border-slate-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
            Editorial Desk
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B1528]">
            {category.name}
          </h1>
          <p className="text-base text-slate-600 max-w-2xl">{category.description}</p>
        </div>

        <PaginatedArticlesList
          initialPosts={feed.posts}
          categories={categories}
          activeCategorySlug={category.slug}
          totalCount={feed.total}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
