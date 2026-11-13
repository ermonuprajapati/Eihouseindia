import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowRight, Search, PenLine, Cpu, Layers, Bot, Wrench } from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { ArticleCard, ArticleCoverMedia } from '@/components/articles/ArticleCard';
import { NewsletterForm } from '@/components/articles/NewsletterForm';
import { Button } from '@/components/ui/button';
import { SITE_CONFIG } from '@/config/site';
import {
  getFeaturedAuthors,
  getPublicCategories,
  getPublishedPosts,
} from '@/modules/posts/public-queries';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [categories, latestPosts, featuredPosts, featuredAuthors] = await Promise.all([
    getPublicCategories(),
    getPublishedPosts({ limitCount: 18 }),
    getPublishedPosts({ featuredOnly: true, limitCount: 3 }),
    getFeaturedAuthors(6),
  ]);

  const leadPost = featuredPosts[0] || latestPosts[0] || null;
  const secondaryPosts = latestPosts.filter((p) => p.id !== leadPost?.id).slice(0, 4);

  const electronicsPosts = latestPosts
    .filter((p) => p.categoryId === 'electronics-components' || p.categorySlug === 'electronics-components')
    .slice(0, 3);

  const semiconductorAndAiPosts = latestPosts
    .filter((p) =>
      [
        'semiconductor-technology',
        'artificial-intelligence',
      ].includes(p.categorySlug || p.categoryId)
    )
    .slice(0, 3);

  const tutorialsPosts = latestPosts
    .filter((p) => p.categoryId === 'tutorials-projects' || p.categorySlug === 'tutorials-projects')
    .slice(0, 3);

  const trendingTopics = Array.from(
    new Set(latestPosts.flatMap((p) => p.tags))
  ).slice(0, 10);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />

      <main className="flex-1">
        {/* Editorial Masthead & Search Band */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7 space-y-5">
                <p className="text-xs font-medium tracking-wider uppercase text-[#1D4ED8]">
                  {SITE_CONFIG.tagline}
                </p>
                <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.25rem] font-semibold tracking-tight text-[#0B1528] leading-[1.1] text-balance">
                  Engineering clarity for the next wave of silicon, hardware, and AI.
                </h1>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                  Peer-reviewed technical articles, circuit design notes, semiconductor briefings, and
                  production tutorials written by engineers, researchers, and builders.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <form action="/search" method="GET" className="relative flex-1 max-w-md">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="search"
                      name="q"
                      placeholder="Search semiconductors, MOSFETs, Edge AI, STM32..."
                      aria-label="Search articles"
                      className="h-11 w-full rounded-md border border-slate-200 bg-[#FAFBFD] pl-10 pr-4 text-sm text-[#0B1528] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                    />
                  </form>
                  <Button asChild size="lg" variant="primary">
                    <Link href="/dashboard/editor">
                      <PenLine className="h-4 w-4" />
                      <span>Submit Article</span>
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-[#0B1528]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/hero-semiconductor.jpg"
                    alt="Etched silicon semiconductor wafer on laboratory surface"
                    referrerPolicy="no-referrer"
                    className="aspect-[16/9] w-full object-cover"
                  />
                  <div className="border-t border-slate-800 px-5 py-3.5 flex items-center justify-between text-xs text-slate-300">
                    <span>Global Electronics & Deep-Tech Editorial</span>
                    <Link href="/articles" className="font-medium text-white hover:underline">
                      Browse Archive
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trending Topics / Category Bar */}
        <section className="border-b border-slate-200 bg-[#FAFBFD]">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {trendingTopics.length > 0 ? 'Trending Topics' : 'Editorial Desks'}
            </span>
            {trendingTopics.length > 0
              ? trendingTopics.map((tag) => (
                  <Link
                    key={tag}
                    href={`/search?tag=${encodeURIComponent(tag)}`}
                    className="text-slate-700 hover:text-[#1D4ED8] hover:underline underline-offset-4 transition-colors whitespace-nowrap"
                  >
                    {tag}
                  </Link>
                ))
              : categories.slice(0, 6).map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.slug}`}
                    className="text-slate-700 hover:text-[#1D4ED8] hover:underline underline-offset-4 transition-colors whitespace-nowrap"
                  >
                    {cat.name}
                  </Link>
                ))}
          </div>
        </section>

        {/* Featured Story + Latest Articles */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          {leadPost ? (
            <div className="space-y-12">
              {/* Featured Story */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-2xl font-semibold text-[#0B1528]">
                    Featured Dispatch
                  </h2>
                  <Link
                    href="/articles"
                    className="inline-flex items-center gap-1 text-sm font-medium text-[#1D4ED8] hover:underline"
                  >
                    <span>All Articles</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 rounded-lg border border-slate-200 bg-white p-6 sm:p-8 items-stretch">
                  <div className="lg:col-span-7">
                    <Link href={`/blog/${leadPost.slug}`} className="block h-full">
                      <ArticleCoverMedia
                        src={leadPost.coverImage}
                        alt={leadPost.title}
                        aspectClass="aspect-[16/9] lg:h-full"
                      />
                    </Link>
                  </div>
                  <div className="lg:col-span-5 flex flex-col justify-between space-y-5">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <Link
                          href={`/category/${leadPost.categorySlug || leadPost.categoryId}`}
                          className="font-semibold text-[#1D4ED8] hover:underline"
                        >
                          {leadPost.categoryName || 'Engineering'}
                        </Link>
                        <span aria-hidden="true">·</span>
                        <time dateTime={leadPost.publishedAt || leadPost.createdAt}>
                          {format(new Date(leadPost.publishedAt || leadPost.createdAt), 'MMM d, yyyy')}
                        </time>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{leadPost.readingTime} min read</span>
                      </div>
                      <h3 className="font-display text-2xl sm:text-3xl font-semibold text-[#0B1528] leading-snug text-balance">
                        <Link href={`/blog/${leadPost.slug}`} className="hover:text-[#1D4ED8] transition-colors">
                          {leadPost.title}
                        </Link>
                      </h3>
                      <p className="text-base text-slate-600 leading-relaxed">
                        {leadPost.excerpt}
                      </p>
                    </div>
                    <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                      <Link
                        href={`/author/${leadPost.authorUsername || 'editorial'}`}
                        className="text-sm font-medium text-[#0B1528] hover:underline"
                      >
                        By {leadPost.authorName || 'EIHOUSE INDIA Editorial'}
                      </Link>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/blog/${leadPost.slug}`}>Read Dispatch</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Latest Articles Grid */}
              {secondaryPosts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display text-2xl font-semibold text-[#0B1528]">
                      Latest Articles
                    </h2>
                    <Link
                      href="/articles"
                      className="text-sm font-medium text-[#1D4ED8] hover:underline"
                    >
                      View all
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {secondaryPosts.map((post) => (
                      <ArticleCard key={post.id} post={post} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Honest Empty State when Firestore has 0 published articles */
            <div className="rounded-lg border border-slate-200 bg-white p-8 sm:p-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Editorial Publication Desk
                  </p>
                  <h2 className="font-display text-3xl font-semibold text-[#0B1528] text-balance">
                    No articles have been published yet.
                  </h2>
                  <p className="text-base text-slate-600 leading-relaxed">
                    This publication pulls live dispatches from Cloud Firestore. Sign in to write
                    the inaugural article, save a draft, or approve queued submissions from the Admin
                    Console.
                  </p>
                  <div className="pt-2 flex flex-wrap gap-3">
                    <Button asChild variant="primary">
                      <Link href="/dashboard/editor">Write First Article</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/admin">Open Admin Console</Link>
                    </Button>
                  </div>
                </div>
                <div className="lg:col-span-5 grid grid-cols-2 gap-3">
                  <div className="overflow-hidden rounded-md border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/pcb-workbench.jpg"
                      alt="Hardware PCB workbench"
                      referrerPolicy="no-referrer"
                      className="aspect-[4/3] w-full object-cover"
                    />
                  </div>
                  <div className="overflow-hidden rounded-md border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/robotics-actuator.jpg"
                      alt="Robotics actuator assembly"
                      referrerPolicy="no-referrer"
                      className="aspect-[4/3] w-full object-cover"
                    />
                  </div>
                  <div className="overflow-hidden rounded-md border border-slate-200 col-span-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/embedded-sensors.jpg"
                      alt="Embedded microcontroller and sensors"
                      referrerPolicy="no-referrer"
                      className="aspect-[16/9] w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Specialized Editorial Desks */}
        <section className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 space-y-14">
            {/* Desk 1: Electronics Components */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
                <div className="flex items-center gap-2.5">
                  <Cpu className="h-5 w-5 text-[#1D4ED8]" />
                  <h2 className="font-display text-2xl font-semibold text-[#0B1528]">
                    Electronics Components
                  </h2>
                </div>
                <Link
                  href="/category/electronics-components"
                  className="text-sm font-medium text-[#1D4ED8] hover:underline"
                >
                  Explore desk
                </Link>
              </div>
              {electronicsPosts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {electronicsPosts.map((post) => (
                    <ArticleCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-[#FAFBFD] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <p className="text-sm text-slate-600">
                    Awaiting component breakdowns, datasheet teardowns, and passive/active device guides.
                  </p>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/dashboard/editor">Contribute Guide</Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Desk 2: Semiconductor & AI */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
                <div className="flex items-center gap-2.5">
                  <Layers className="h-5 w-5 text-[#1D4ED8]" />
                  <h2 className="font-display text-2xl font-semibold text-[#0B1528]">
                    Semiconductor Technology & AI
                  </h2>
                </div>
                <div className="flex items-center gap-4 text-sm font-medium">
                  <Link href="/category/semiconductor-technology" className="text-[#1D4ED8] hover:underline">
                    Semiconductors
                  </Link>
                  <Link href="/category/artificial-intelligence" className="text-[#1D4ED8] hover:underline">
                    Artificial Intelligence
                  </Link>
                </div>
              </div>
              {semiconductorAndAiPosts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {semiconductorAndAiPosts.map((post) => (
                    <ArticleCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-[#FAFBFD] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <p className="text-sm text-slate-600">
                    Coverage of wafer fabrication, GaN/SiC power silicon, NPUs, and Edge AI architectures will appear here once published.
                  </p>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/dashboard/editor">Submit Analysis</Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Desk 3: Tutorials & Projects */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
                <div className="flex items-center gap-2.5">
                  <Wrench className="h-5 w-5 text-[#1D4ED8]" />
                  <h2 className="font-display text-2xl font-semibold text-[#0B1528]">
                    Tutorials & Engineering Projects
                  </h2>
                </div>
                <Link
                  href="/category/tutorials-projects"
                  className="text-sm font-medium text-[#1D4ED8] hover:underline"
                >
                  All tutorials
                </Link>
              </div>
              {tutorialsPosts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {tutorialsPosts.map((post) => (
                    <ArticleCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-[#FAFBFD] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <p className="text-sm text-slate-600">
                    No build logs published yet. Share schematics, KiCad layouts, or RTOS firmware walkthroughs.
                  </p>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/dashboard/editor">Publish Tutorial</Link>
                  </Button>
                </div>
              )}
            </div>

            {/* All 10 Categories Directory */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
                <div className="flex items-center gap-2.5">
                  <Bot className="h-5 w-5 text-[#1D4ED8]" />
                  <h2 className="font-display text-2xl font-semibold text-[#0B1528]">
                    All Knowledge Domains
                  </h2>
                </div>
                <Link href="/components" className="text-sm font-medium text-slate-600 hover:text-[#0B1528]">
                  Future Component Directory
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.slug}`}
                    className="rounded-lg border border-slate-200 bg-[#FAFBFD] p-4 hover:border-slate-300 hover:bg-white transition-colors"
                  >
                    <h3 className="text-sm font-semibold text-[#0B1528]">{cat.name}</h3>
                    <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {cat.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Featured Authors */}
        <section className="border-t border-slate-200 bg-[#FAFBFD]">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl font-semibold text-[#0B1528]">
                  Community Contributors
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Engineers, researchers, and technical writers sharing verified field knowledge.
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/register">Become a Contributor</Link>
              </Button>
            </div>

            {featuredAuthors.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {featuredAuthors.map((author) => (
                  <Link
                    key={author.uid}
                    href={`/author/${author.username}`}
                    className="rounded-lg border border-slate-200 bg-white p-5 hover:border-slate-300 transition-colors flex items-start gap-4"
                  >
                    <div className="h-12 w-12 shrink-0 rounded-full bg-[#0B1528] text-white flex items-center justify-center font-display text-lg font-semibold overflow-hidden">
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
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-[#0B1528] truncate">
                        {author.displayName}
                      </h3>
                      <p className="text-xs text-slate-500 truncate">@{author.username}</p>
                      <p className="mt-2 text-xs text-slate-600 line-clamp-2">
                        {author.bio || 'Technical contributor at EIHOUSE INDIA.'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <span>No contributor profiles registered yet. Create an account to publish under your engineering byline.</span>
                <Button asChild size="sm">
                  <Link href="/auth/register">Create Author Profile</Link>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="border-t border-slate-200 bg-[#0B1528] text-white">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-xl space-y-2">
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white">
                The EIHOUSE INDIA Engineering Briefing
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Receive curated semiconductor updates, hardware design notes, and Edge AI tutorials directly in your inbox.
              </p>
            </div>
            <NewsletterForm source="homepage" />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
