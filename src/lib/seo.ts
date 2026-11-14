import { SITE_CONFIG } from '@/config/site';
import type { Post, PublicAuthorProfile } from '@/types';

export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'ResearchOrganization'],
    name: SITE_CONFIG.name,
    alternateName: [...SITE_CONFIG.alternateNames],
    legalName: SITE_CONFIG.entity.legalName,
    url: SITE_CONFIG.url,
    logo: `${SITE_CONFIG.url}/icon-512.png`,
    description: SITE_CONFIG.description,
    slogan: SITE_CONFIG.tagline,
    email: SITE_CONFIG.contactEmail,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'IN',
    },
    founder: {
      '@type': 'Person',
      name: SITE_CONFIG.founder.name,
      honorificPrefix: SITE_CONFIG.founder.honorificPrefix,
      jobTitle: SITE_CONFIG.founder.designation,
      description: SITE_CONFIG.founder.bio,
      url: `${SITE_CONFIG.url}/about#founder`,
      email: SITE_CONFIG.founder.email,
      knowsAbout: [...SITE_CONFIG.founder.expertise],
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'General Inquiries & Customer Support',
        email: SITE_CONFIG.contactEmail,
        availableLanguage: ['English', 'Hindi'],
        areaServed: 'IN',
      },
      {
        '@type': 'ContactPoint',
        contactType: 'Founder & Executive Office',
        email: SITE_CONFIG.bootstrapAdminEmail,
        availableLanguage: ['English', 'Hindi'],
        areaServed: 'IN',
      },
    ],
  };
}

export function buildFounderJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: SITE_CONFIG.founder.name,
    honorificPrefix: SITE_CONFIG.founder.honorificPrefix,
    jobTitle: SITE_CONFIG.founder.designation,
    description: SITE_CONFIG.founder.bio,
    url: `${SITE_CONFIG.url}/about#founder`,
    email: SITE_CONFIG.founder.email,
    worksFor: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      alternateName: [...SITE_CONFIG.alternateNames],
      url: SITE_CONFIG.url,
    },
    knowsAbout: [...SITE_CONFIG.founder.expertise],
  };
}

export function buildAboutPageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: `About Engineering Innovation House (EI House) — Founded by Monu Prajapati`,
    url: `${SITE_CONFIG.url}/about`,
    description: SITE_CONFIG.description,
    mainEntity: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      alternateName: [...SITE_CONFIG.alternateNames],
      url: SITE_CONFIG.url,
      founder: {
        '@type': 'Person',
        name: SITE_CONFIG.founder.name,
        honorificPrefix: SITE_CONFIG.founder.honorificPrefix,
        jobTitle: SITE_CONFIG.founder.designation,
        description: SITE_CONFIG.founder.bio,
        url: `${SITE_CONFIG.url}/about#founder`,
      },
    },
  };
}

export function buildContactPageJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: `Contact Engineering Innovation House (EI House) & Founder Monu Prajapati`,
    url: `${SITE_CONFIG.url}/contact`,
    description: `Connect with Engineering Innovation House (EI House) and Founder & Proprietor Monu Prajapati for STEM education, hardware prototyping, R&D services, and partnerships.`,
    mainEntity: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      alternateName: [...SITE_CONFIG.alternateNames],
      url: SITE_CONFIG.url,
      founder: {
        '@type': 'Person',
        name: SITE_CONFIG.founder.name,
        jobTitle: SITE_CONFIG.founder.designation,
        email: SITE_CONFIG.founder.email,
      },
      contactPoint: [
        {
          '@type': 'ContactPoint',
          contactType: 'General Inquiries',
          email: SITE_CONFIG.contactEmail,
          availableLanguage: ['English', 'Hindi'],
        },
        {
          '@type': 'ContactPoint',
          contactType: 'Founder Desk',
          email: SITE_CONFIG.bootstrapAdminEmail,
          availableLanguage: ['English', 'Hindi'],
        },
      ],
    },
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
