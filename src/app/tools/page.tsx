import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/config/site';
import { fetchTools } from '@/modules/tools/tool-service';
import { ToolsCatalogClient } from '@/components/tools/ToolsCatalogClient';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Engineering Software & Tools Directory — EI House India',
  description:
    'Directory of recommended engineering software and tools across Electronics, Mechanical CAD, 3D Printing, Programming, IT Networking, Simulation, and Interactive Calculators.',
  alternates: { canonical: `${SITE_CONFIG.url}/tools` },
};

export default async function ToolsPage() {
  const tools = await fetchTools();

  return <ToolsCatalogClient initialTools={tools} />;
}
