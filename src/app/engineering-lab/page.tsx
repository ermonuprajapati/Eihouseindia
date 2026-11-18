import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/config/site';
import { EngineeringLabClientWrapper } from '@/components/engineering-lab/EngineeringLabClientWrapper';

export const metadata: Metadata = {
  title: 'Universal Engineering Lab — 2D/3D Circuit Simulation, PCB Design & Firmware IDE',
  description:
    'Free production-grade browser-based engineering lab for electronics design, real-time SPICE circuit simulation, 2D/3D PCB development, and embedded microcontroller firmware programming.',
  keywords: [
    'Universal Engineering Lab',
    'Circuit Simulator Online',
    'Web EDA',
    'PCB Design 3D',
    'Arduino Web Simulator',
    'SPICE Simulation Web',
    'Electronics Laboratory',
    'EI House Engineering',
    'Monu Prajapati',
  ],
  openGraph: {
    title: `Universal Engineering Lab | ${SITE_CONFIG.name}`,
    description:
      'Design electronic circuits, simulate analog/digital behaviour in real-time, route PCBs in 2D/3D, and write embedded firmware.',
    url: `${SITE_CONFIG.url}/engineering-lab`,
  },
  alternates: {
    canonical: `${SITE_CONFIG.url}/engineering-lab`,
  },
};

export default function EngineeringLabPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Universal Engineering Lab',
    url: `${SITE_CONFIG.url}/engineering-lab`,
    applicationCategory: 'DesignApplication',
    operatingSystem: 'All',
    description:
      'Free production-grade browser-based engineering lab for electronics design, real-time SPICE circuit simulation, 2D/3D PCB development, and embedded microcontroller firmware programming.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
    },
    author: {
      '@type': 'Person',
      name: 'Monu Prajapati',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* SSR Accessible Shell for SEO Crawlers */}
      <noscript>
        <div className="p-8 bg-slate-900 text-white font-sans max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Universal Engineering Lab — 2D/3D Electronics EDA &amp; Embedded Simulation</h1>
          <p className="mb-4">
            Professional browser-based computer-aided engineering platform featuring Modified Nodal Analysis (MNA) SPICE circuit simulation, genuine 3D breadboard virtual prototyping, interactive 2D PCB routing with DRC, 3D board viewer, RS-274X Gerber export, and embedded MCU co-simulation.
          </p>
        </div>
      </noscript>
      <EngineeringLabClientWrapper />
    </>
  );
}
