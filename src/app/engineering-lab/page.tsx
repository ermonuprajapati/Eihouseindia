import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/config/site';
import { EngineeringLabApp } from '@/components/engineering-lab/EngineeringLabApp';

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
  return <EngineeringLabApp />;
}
