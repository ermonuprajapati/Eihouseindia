import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/config/site';
import { fetchLibraryItems } from '@/modules/library/library-service';
import { LibraryCatalogClient } from '@/components/library/LibraryCatalogClient';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Engineering Library & Standards Hub — EI House India',
  description:
    'Curated engineering datasheets, pinout diagrams, firmware drivers, 3D CAD STEP files, mechanical fastener standards, and cheat sheets.',
  alternates: { canonical: `${SITE_CONFIG.url}/library` },
};

export default async function LibraryPage() {
  const items = await fetchLibraryItems();

  return <LibraryCatalogClient initialItems={items} />;
}
