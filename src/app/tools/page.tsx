import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/config/site';
import { fetchTools } from '@/modules/tools/tool-service';
import { ToolsCatalogClient } from '@/components/tools/ToolsCatalogClient';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Engineering Tools & Calculators — EI House India',
  description:
    'Free interactive engineering calculators and tools for Electronics, Embedded Systems, Mechanical Engineering, Computer Science, Networking, and 3D Printing.',
  alternates: { canonical: `${SITE_CONFIG.url}/tools` },
};

export default async function ToolsPage() {
  const tools = await fetchTools();

  return <ToolsCatalogClient initialTools={tools} />;
}
