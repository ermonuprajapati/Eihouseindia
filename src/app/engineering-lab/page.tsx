import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/config/site';
import { EngineeringLabClientWrapper } from '@/components/engineering-lab/EngineeringLabClientWrapper';

export const metadata: Metadata = {
  title: 'EI HOUSE Engineering Lab — 2D/3D Circuit Simulator, PCB Design & Embedded IDE | EIHOUSE INDIA',
  description:
    'EI HOUSE Engineering Lab (Universal Engineering Lab) is India’s flagship browser-based virtual electronics laboratory by EI HOUSE INDIA. Simulate SPICE analog & digital circuits in real-time, prototype with genuine 3D breadboards, design 2D/3D PCBs with DRC, and program embedded microcontrollers online for free.',
  keywords: [
    'EI HOUSE Engineering Lab',
    'EI House Engineering Lab',
    'EIHOUSE Engineering Lab',
    'ei house engineering lab',
    'EI House Virtual Lab',
    'EI HOUSE Circuit Simulator',
    'EI HOUSE EDA',
    'Universal Engineering Lab',
    'Circuit Simulator Online',
    'Web EDA India',
    'PCB Design 3D',
    'Arduino Web Simulator',
    'SPICE Simulation Web',
    'Electronics Laboratory Online',
    'EI House Engineering',
    'Monu Prajapati',
    'EIHOUSE INDIA',
    'Electronic Innovation House',
  ],
  openGraph: {
    title: `EI HOUSE Engineering Lab — 2D/3D Circuit Simulator & PCB Design | ${SITE_CONFIG.name}`,
    description:
      'Official EI HOUSE Engineering Lab — Design circuits, simulate SPICE analog/digital electronics in real-time, route 2D/3D PCBs, and write embedded microcontroller firmware online.',
    url: `${SITE_CONFIG.url}/engineering-lab`,
    siteName: 'EI HOUSE INDIA',
    type: 'website',
    images: [
      {
        url: `${SITE_CONFIG.url}/images/hero-semiconductor.jpg`,
        width: 1200,
        height: 630,
        alt: 'EI HOUSE Engineering Lab',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `EI HOUSE Engineering Lab | ${SITE_CONFIG.name}`,
    description:
      'Official EI HOUSE Engineering Lab — 2D/3D circuit simulation, PCB routing, and embedded firmware programming online.',
    images: [`${SITE_CONFIG.url}/images/hero-semiconductor.jpg`],
  },
  alternates: {
    canonical: `${SITE_CONFIG.url}/engineering-lab`,
  },
};

export default function EngineeringLabPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${SITE_CONFIG.url}/engineering-lab#app`,
        name: 'EI HOUSE Engineering Lab',
        alternateName: [
          'EI House Engineering Lab',
          'EIHOUSE Engineering Lab',
          'EI House Virtual Lab',
          'Universal Engineering Lab',
        ],
        url: `${SITE_CONFIG.url}/engineering-lab`,
        applicationCategory: 'DesignApplication, EducationalApplication',
        operatingSystem: 'All modern web browsers',
        description:
          'EI HOUSE Engineering Lab is a free, web-based electronic circuit simulation, 2D/3D PCB design, and embedded firmware programming platform developed by EI HOUSE INDIA.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'INR',
        },
        provider: {
          '@type': 'Organization',
          name: 'EI HOUSE INDIA',
          url: SITE_CONFIG.url,
          logo: `${SITE_CONFIG.url}/icon.png`,
        },
        author: {
          '@type': 'Person',
          name: 'Monu Prajapati',
          jobTitle: 'Founder',
          url: SITE_CONFIG.url,
        },
        featureList: [
          'Real-time SPICE circuit simulation (analog & digital)',
          'Genuine 3D breadboard virtual prototyping',
          'Interactive 2D PCB layout routing with Design Rule Checking (DRC)',
          'Photorealistic 3D PCB visualization',
          'Industry-standard RS-274X Gerber file export',
          'Embedded MCU firmware co-simulation (C/C++ Arduino)',
        ],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: SITE_CONFIG.url,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'EI HOUSE Engineering Lab',
            item: `${SITE_CONFIG.url}/engineering-lab`,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is EI HOUSE Engineering Lab?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'EI HOUSE Engineering Lab is India’s free online browser-based electronics engineering laboratory by EI HOUSE INDIA. It offers real-time SPICE circuit simulation, 3D breadboard prototyping, 2D/3D PCB design, Gerber export, and embedded microcontroller programming.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is EI HOUSE Engineering Lab free to use?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes, EI HOUSE Engineering Lab is 100% free with no software installation required. It runs directly inside modern web browsers like Google Chrome, Mozilla Firefox, Microsoft Edge, and Safari.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can I design and export PCBs in EI HOUSE Engineering Lab?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes, the lab includes an interactive 2D PCB layout routing suite with multi-layer trace routing, DRC validation, 3D board rendering, and standard RS-274X Gerber file export for manufacturing.',
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Semantic Content for Search Engines & Accessibility */}
      <section className="sr-only">
        <h1>EI HOUSE Engineering Lab — Online Electronics EDA, 2D/3D Circuit Simulation &amp; PCB Design</h1>
        <p>
          Welcome to the official EI HOUSE Engineering Lab by EI HOUSE INDIA. A comprehensive browser-based computer-aided engineering suite featuring real-time Modified Nodal Analysis (MNA) SPICE circuit simulation, genuine 3D breadboard virtual prototyping, interactive 2D PCB layout routing with Design Rule Checking (DRC), photorealistic 3D board rendering, RS-274X Gerber manufacturing export, and embedded MCU firmware co-simulation.
        </p>
        <h2>Key Capabilities of EI HOUSE Engineering Lab</h2>
        <ul>
          <li>Real-time SPICE circuit simulation with virtual oscilloscopes, multimeters, and function generators.</li>
          <li>Genuine 3D breadboard and interactive component wiring for electronics learning.</li>
          <li>Full-featured 2D PCB editor with multi-layer routing, vias, netlists, and DRC validation.</li>
          <li>3D photorealistic board visualization and standard Gerber production file export.</li>
          <li>Online microcontroller firmware IDE with live embedded code execution and serial terminal.</li>
        </ul>
        <h2>About EI HOUSE INDIA</h2>
        <p>
          Founded by Monu Prajapati, EI HOUSE INDIA is dedicated to advancing electronics engineering, hardware innovation, and open-access engineering tools across India and worldwide.
        </p>
      </section>

      {/* Interactive Client Laboratory Workspace */}
      <EngineeringLabClientWrapper />
    </>
  );
}
