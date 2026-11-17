import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/config/site';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { DatasheetsPortalClient } from '@/components/datasheets/DatasheetsPortalClient';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Component Datasheet Finder | EI House India',
  description:
    'Search electronic components by part number, manufacturer or component name. Access technical datasheets, specifications and engineering documentation from trusted sources.',
  alternates: {
    canonical: `${SITE_CONFIG.url}/datasheets`,
  },
  openGraph: {
    type: 'website',
    url: `${SITE_CONFIG.url}/datasheets`,
    title: 'Component Datasheet Finder | EI House India',
    description:
      'Search electronic components by part number, manufacturer or component name. Access technical datasheets, specifications and engineering documentation from trusted sources.',
    siteName: SITE_CONFIG.name,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Component Datasheet Finder | EI House India',
    description:
      'Search electronic components by part number, manufacturer or component name. Access technical datasheets, specifications and engineering documentation from trusted sources.',
  },
};

export default function DatasheetsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Component Datasheet Finder | EI House India',
    description:
      'Search electronic components by part number, manufacturer or component name. Access technical datasheets, specifications and engineering documentation from trusted sources.',
    url: `${SITE_CONFIG.url}/datasheets`,
    publisher: {
      '@type': 'Organization',
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_CONFIG.url}/favicon-96x96.png`,
      },
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <DatasheetsPortalClient />
      <SiteFooter />
    </>
  );
}
