import type { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_CONFIG.url.replace(/\/+$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/dashboard/*',
          '/admin',
          '/admin/*',
          '/auth',
          '/auth/*',
          '/api',
          '/api/*',
          '/search',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/dashboard',
          '/dashboard/*',
          '/admin',
          '/admin/*',
          '/auth',
          '/auth/*',
          '/api',
          '/api/*',
          '/search',
        ],
      },
      {
        userAgent: 'Googlebot-Image',
        allow: [
          '/',
          '/images/*',
          '/*.jpg$',
          '/*.jpeg$',
          '/*.png$',
          '/*.webp$',
          '/*.svg$',
        ],
        disallow: [
          '/dashboard/*',
          '/admin/*',
          '/api/*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
