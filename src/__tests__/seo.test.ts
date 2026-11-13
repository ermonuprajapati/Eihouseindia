import { describe, it, expect } from 'vitest';
import { buildBlogPostingJsonLd, buildBreadcrumbJsonLd, buildPersonJsonLd } from '@/lib/seo';
import type { Post, PublicAuthorProfile } from '@/types';

describe('SEO Structured Data Builders', () => {
  const samplePost: Post = {
    id: 'post_123',
    authorId: 'user_1',
    authorName: 'Arjun Mehta',
    authorUsername: 'arjun_mehta',
    authorAvatar: '',
    title: 'Wide-Bandgap GaN FET Switching Losses Explained',
    slug: 'wide-bandgap-gan-fet-switching-losses',
    excerpt: 'An analytical guide to parasitic inductance and ZVS transitions in GaN half-bridges.',
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Analysis' }] }] },
    coverImage: '/images/pcb-workbench.jpg',
    categoryId: 'semiconductor-technology',
    categoryName: 'Semiconductor Technology',
    categorySlug: 'semiconductor-technology',
    tags: ['GaN', 'Power Electronics'],
    status: 'PUBLISHED',
    metaTitle: 'GaN FET Switching Losses Explained',
    metaDescription: 'Analytical guide to GaN half-bridge layout and switching optimization.',
    canonicalUrl: 'https://eihouseindia.in/blog/wide-bandgap-gan-fet-switching-losses',
    locale: 'en-IN',
    readingTime: 6,
    wordCount: 1200,
    featured: true,
    viewCount: 42,
    reviewerId: 'admin_1',
    rejectionReason: null,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-02T00:00:00.000Z',
    submittedAt: '2026-11-01T12:00:00.000Z',
    publishedAt: '2026-11-02T08:00:00.000Z',
  };

  it('builds valid BlogPosting JSON-LD schema', () => {
    const jsonLd = buildBlogPostingJsonLd(samplePost);
    expect(jsonLd['@type']).toBe('BlogPosting');
    expect(jsonLd.headline).toBe('GaN FET Switching Losses Explained');
    expect(jsonLd.wordCount).toBe(1200);
    expect(jsonLd.author.name).toBe('Arjun Mehta');
  });

  it('builds valid BreadcrumbList JSON-LD', () => {
    const crumbs = buildBreadcrumbJsonLd([
      { name: 'Home', url: 'https://eihouseindia.in' },
      { name: 'Semiconductor Technology', url: 'https://eihouseindia.in/category/semiconductor-technology' },
    ]);
    expect(crumbs['@type']).toBe('BreadcrumbList');
    expect(crumbs.itemListElement).toHaveLength(2);
    expect(crumbs.itemListElement[1].position).toBe(2);
  });

  it('builds valid Person JSON-LD schema', () => {
    const author: PublicAuthorProfile = {
      uid: 'user_1',
      username: 'arjun_mehta',
      displayName: 'Arjun Mehta',
      avatar: '',
      bio: 'Power electronics engineer',
      website: 'https://arjunmehta.dev',
      role: 'USER',
      status: 'ACTIVE',
      createdAt: '2026-10-01T00:00:00.000Z',
    };
    const person = buildPersonJsonLd(author);
    expect(person['@type']).toBe('Person');
    expect(person.name).toBe('Arjun Mehta');
    expect(person.sameAs).toEqual(['https://arjunmehta.dev']);
  });
});
