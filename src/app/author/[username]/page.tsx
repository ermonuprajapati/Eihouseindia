import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Globe } from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { ArticleCard } from '@/components/articles/ArticleCard';
import { JsonLd } from '@/components/seo/JsonLd';
import { SITE_CONFIG } from '@/config/site';
import { buildPersonJsonLd } from '@/lib/seo';
import {
  getPublicAuthorByUsername,
  getPublishedPostsByAuthorId,
} from '@/modules/posts/public-queries';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const author = await getPublicAuthorByUsername(username);
  if (!author) {
    return { title: 'Author Profile' };
  }

  return {
    title: `${author.displayName} (@${author.username})`,
    description:
      author.bio || `Technical articles and engineering publications by ${author.displayName} on EIHOUSE INDIA.`,
    alternates: {
      canonical: `${SITE_CONFIG.url}/author/${author.username}`,
    },
  };
}

export default async function AuthorProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const author = await getPublicAuthorByUsername(username);
  if (!author) {
    notFound();
  }

  const posts = await getPublishedPostsByAuthorId(author.uid, 24);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <JsonLd data={buildPersonJsonLd(author)} />
      <SiteHeader />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-slate-200 bg-white p-8 mb-10 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="h-20 w-20 shrink-0 rounded-full bg-[#0B1528] text-white flex items-center justify-center font-display text-3xl font-semibold overflow-hidden">
            {author.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={author.avatar}
                alt={author.displayName}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            ) : (
              author.displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>@{author.username}</span>
              <span aria-hidden="true">·</span>
              <span>{author.role}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{posts.length} published articles</span>
            </div>
            <h1 className="font-display text-3xl font-semibold text-[#0B1528]">
              {author.displayName}
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              {author.bio || 'Contributing author on EIHOUSE INDIA.'}
            </p>
            {author.website && (
              <Link
                href={author.website}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1D4ED8] hover:underline pt-1"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>{author.website}</span>
              </Link>
            )}
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold text-[#0B1528] mb-6">
            Published Articles
          </h2>
          {posts.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-600">
              No published articles from this contributor yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <ArticleCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
