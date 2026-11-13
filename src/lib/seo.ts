import { SITE_CONFIG } from '@/config/site';
import type { Post, PublicAuthorProfile } from '@/types';

export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
    description: SITE_CONFIG.description,
    email: SITE_CONFIG.contactEmail,
  };
}

export function buildWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
    description: SITE_CONFIG.description,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_CONFIG.url}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildBlogPostingJsonLd(post: Post, author?: PublicAuthorProfile | null) {
  const url = `${SITE_CONFIG.url}/blog/${post.slug}`;
  const imageUrl = post.coverImage
    ? post.coverImage.startsWith('http')
      ? post.coverImage
      : `${SITE_CONFIG.url}${post.coverImage}`
    : `${SITE_CONFIG.url}/images/hero-semiconductor.jpg`;

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    headline: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt,
    image: [imageUrl],
    datePublished: post.publishedAt || post.createdAt,
    dateModified: post.updatedAt,
    wordCount: post.wordCount,
    inLanguage: post.locale || 'en-IN',
    keywords: post.tags.join(', '),
    articleSection: post.categoryName || 'Technology',
    author: {
      '@type': 'Person',
      name: author?.displayName || post.authorName || 'EIHOUSE INDIA Contributor',
      url: `${SITE_CONFIG.url}/author/${author?.username || post.authorUsername || 'editorial'}`,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
  };
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildPersonJsonLd(author: PublicAuthorProfile) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.displayName,
    alternateName: author.username,
    description: author.bio || undefined,
    url: `${SITE_CONFIG.url}/author/${author.username}`,
    sameAs: author.website ? [author.website] : undefined,
  };
}
