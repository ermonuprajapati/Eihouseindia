import type { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/config/site';
import { getPublicCategories, getPublishedPosts } from '@/modules/posts/public-queries';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate at most every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_CONFIG.url.replace(/\/+$/, '');
  const now = new Date();

  // 1. High-value Core Static Landing & Hub Pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
      images: [
        `${baseUrl}/images/hero-semiconductor.jpg`,
        `${baseUrl}/icon.png`,
      ],
    },
    {
      url: `${baseUrl}/engineering-lab`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
      images: [
        `${baseUrl}/images/hero-semiconductor.jpg`,
      ],
    },
    {
      url: `${baseUrl}/articles`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.90,
    },
    {
      url: `${baseUrl}/tools`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.90,
    },
    {
      url: `${baseUrl}/datasheets`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.90,
    },
    {
      url: `${baseUrl}/learn`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.90,
      images: [
        `${baseUrl}/images/learn/embedded-systems-dev.jpg`,
      ],
    },
    {
      url: `${baseUrl}/projects`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.90,
    },
    {
      url: `${baseUrl}/library`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/services`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
      images: [
        `${baseUrl}/images/founder/dpp.jpeg`,
      ],
    },
    {
      url: `${baseUrl}/community`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.80,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/partnerships`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.70,
    },
    {
      url: `${baseUrl}/community-guidelines`,
      lastModified: new Date('2026-01-01'),
      changeFrequency: 'monthly',
      priority: 0.40,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date('2026-01-01'),
      changeFrequency: 'yearly',
      priority: 0.30,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date('2026-01-01'),
      changeFrequency: 'yearly',
      priority: 0.30,
    },
  ];

  // 2. Fetch categories and all published posts
  const [categories, publishedPosts] = await Promise.all([
    getPublicCategories(),
    getPublishedPosts({ limitCount: 2500 }),
  ]);

  // 3. Category Routes: Strictly include ONLY categories with >= 1 published article
  // Prevents Google Search Console "Crawled - currently not indexed" on empty taxonomy archives
  const categoryRoutes: MetadataRoute.Sitemap = categories
    .map((cat) => {
      const postsInCat = publishedPosts.filter(
        (p) => p.categoryId === cat.id || p.categorySlug === cat.slug
      );
      if (postsInCat.length === 0) return null;

      const latestPost = postsInCat.reduce((latest, p) => {
        const pDate = new Date(p.updatedAt || p.publishedAt || p.createdAt).getTime();
        const lDate = new Date(latest.updatedAt || latest.publishedAt || latest.createdAt).getTime();
        return pDate > lDate ? p : latest;
      }, postsInCat[0]);

      return {
        url: `${baseUrl}/category/${cat.slug}`,
        lastModified: new Date(latestPost.updatedAt || latestPost.publishedAt || latestPost.createdAt),
        changeFrequency: 'daily' as const,
        priority: 0.85,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  // 4. Article Routes: Strictly include ONLY published posts with actual dates and image URLs
  const articleRoutes: MetadataRoute.Sitemap = publishedPosts
    .filter((post) => post.status === 'PUBLISHED' && Boolean(post.slug))
    .map((post) => {
      const images: string[] = [];
      if (post.coverImage) {
        if (post.coverImage.startsWith('http')) {
          images.push(post.coverImage);
        } else {
          images.push(`${baseUrl}${post.coverImage.startsWith('/') ? '' : '/'}${post.coverImage}`);
        }
      }

      return {
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: new Date(post.updatedAt || post.publishedAt || post.createdAt),
        changeFrequency: 'weekly',
        priority: 0.85,
        ...(images.length > 0 ? { images } : {}),
      };
    });

  // 5. Author Profile Routes for active contributors with published articles
  const authorMap = new Map<string, Date>();
  publishedPosts
    .filter((post) => post.status === 'PUBLISHED' && Boolean(post.authorUsername))
    .forEach((post) => {
      const u = String(post.authorUsername).toLowerCase();
      const pDate = new Date(post.updatedAt || post.publishedAt || post.createdAt);
      const existing = authorMap.get(u);
      if (!existing || pDate > existing) {
        authorMap.set(u, pDate);
      }
    });

  const authorRoutes: MetadataRoute.Sitemap = Array.from(authorMap.entries()).map(
    ([username, lastMod]) => ({
      url: `${baseUrl}/author/${username}`,
      lastModified: lastMod,
      changeFrequency: 'weekly',
      priority: 0.75,
    })
  );

  return [...staticRoutes, ...categoryRoutes, ...articleRoutes, ...authorRoutes];
}
