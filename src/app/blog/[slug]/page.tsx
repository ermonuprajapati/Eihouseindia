import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { ArticleCard, ArticleCoverMedia } from '@/components/articles/ArticleCard';
import { CommentsSection } from '@/components/articles/CommentsSection';
import { ArticleViewTracker } from '@/components/articles/ArticleViewTracker';
import { JsonLd } from '@/components/seo/JsonLd';
import { SITE_CONFIG } from '@/config/site';
import { TiptapArticleRenderer } from '@/lib/tiptap-renderer';
import { buildBlogPostingJsonLd, buildBreadcrumbJsonLd } from '@/lib/seo';
import {
  getPublicAuthorByUsername,
  getPublishedPostBySlug,
  getRelatedPublishedPosts,
  getVisibleCommentsForPost,
} from '@/modules/posts/public-queries';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) {
    return {
      title: 'Article Not Found',
      robots: { index: false, follow: false },
    };
  }

  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt;
  const canonical = post.canonicalUrl || `${SITE_CONFIG.url}/blog/${post.slug}`;
  const ogImage = post.coverImage || '/images/hero-semiconductor.jpg';

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      url: canonical,
      title,
      description,
      publishedTime: post.publishedAt || post.createdAt,
      modifiedTime: post.updatedAt,
      authors: [post.authorName || 'EIHOUSE INDIA Contributor'],
      tags: post.tags,
      images: [{ url: ogImage, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post || post.status !== 'PUBLISHED') {
    notFound();
  }

  const [author, relatedPosts, comments] = await Promise.all([
    post.authorUsername ? getPublicAuthorByUsername(post.authorUsername) : Promise.resolve(null),
    getRelatedPublishedPosts(post.id, post.categoryId, 3),
    getVisibleCommentsForPost(post.id),
  ]);

  const publishedDate = post.publishedAt || post.createdAt;
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', url: SITE_CONFIG.url },
    {
      name: post.categoryName || 'Articles',
      url: `${SITE_CONFIG.url}/category/${post.categorySlug || post.categoryId}`,
    },
    { name: post.title, url: `${SITE_CONFIG.url}/blog/${post.slug}` },
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <JsonLd data={buildBlogPostingJsonLd(post, author)} />
      <JsonLd data={breadcrumbJsonLd} />
      <ArticleViewTracker postId={post.id} />

      <SiteHeader />

      <main className="flex-1">
        <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Link href="/" className="hover:text-[#0B1528]">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href={`/category/${post.categorySlug || post.categoryId}`}
              className="hover:text-[#0B1528]"
            >
              {post.categoryName || 'Articles'}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-slate-700 truncate max-w-[260px]">{post.title}</span>
          </nav>

          {/* Header */}
          <header className="space-y-4 border-b border-slate-200 pb-8">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Link
                href={`/category/${post.categorySlug || post.categoryId}`}
                className="font-semibold text-[#1D4ED8] hover:underline"
              >
                {post.categoryName || 'Engineering'}
              </Link>
              <span aria-hidden="true">·</span>
              <time dateTime={publishedDate}>{format(new Date(publishedDate), 'MMMM d, yyyy')}</time>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{post.readingTime} min read</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{post.wordCount} words</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-tight text-[#0B1528] leading-[1.15] text-balance">
              {post.title}
            </h1>

            <p className="text-lg text-slate-600 leading-relaxed">{post.excerpt}</p>

            <div className="pt-2 flex items-center justify-between">
              <Link
                href={`/author/${post.authorUsername || 'editorial'}`}
                className="flex items-center gap-3 group"
              >
                <div className="h-10 w-10 rounded-full bg-[#0B1528] text-white flex items-center justify-center font-display font-semibold overflow-hidden">
                  {post.authorAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.authorAvatar}
                      alt={post.authorName || 'Author'}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (post.authorName || 'E').charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0B1528] group-hover:underline">
                    {post.authorName || 'EIHOUSE INDIA Contributor'}
                  </p>
                  <p className="text-xs text-slate-500">@{post.authorUsername || 'editorial'}</p>
                </div>
              </Link>
            </div>
          </header>

          {/* Cover Image */}
          {post.coverImage && (
            <div className="my-8">
              <ArticleCoverMedia src={post.coverImage} alt={post.title} aspectClass="aspect-[16/9]" />
            </div>
          )}

          {/* Sanitized Tiptap Body */}
          <div className="mx-auto max-w-3xl py-4">
            <TiptapArticleRenderer document={post.content} />
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-8 border-t border-slate-200 pt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
              <span className="font-semibold uppercase tracking-wider text-slate-500">Topics</span>
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/search?tag=${encodeURIComponent(tag)}`}
                  className="text-[#1D4ED8] hover:underline"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Author Bio Box */}
          <aside className="mt-10 rounded-lg border border-slate-200 bg-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                About the Author
              </p>
              <h2 className="mt-1 font-display text-lg font-semibold text-[#0B1528]">
                <Link href={`/author/${post.authorUsername || 'editorial'}`} className="hover:underline">
                  {author?.displayName || post.authorName || 'EIHOUSE INDIA Contributor'}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {author?.bio || 'Contributing engineer and technical author at EIHOUSE INDIA.'}
              </p>
            </div>
            <Link
              href={`/author/${post.authorUsername || 'editorial'}`}
              className="text-sm font-medium text-[#1D4ED8] hover:underline whitespace-nowrap shrink-0"
            >
              View Profile
            </Link>
          </aside>

          {/* Comments & Report */}
          <CommentsSection postId={post.id} postTitle={post.title} initialComments={comments} />
        </article>

        {/* Related Articles */}
        {relatedPosts.length > 0 && (
          <section className="border-t border-slate-200 bg-white">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
              <h2 className="font-display text-2xl font-semibold text-[#0B1528] mb-6">
                Related in {post.categoryName || 'Engineering'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedPosts.map((rel) => (
                  <ArticleCard key={rel.id} post={rel} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
