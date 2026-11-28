import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ArrowUpRight,
  Cpu,
  Layers,
  FlaskConical,
  Wrench,
  BookOpen,
  GraduationCap,
  Mail,
  ShieldCheck,
  Terminal,
  Check,
} from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildAboutPageJsonLd, buildFounderJsonLd } from '@/lib/seo';
import { SITE_CONFIG } from '@/config/site';

export const metadata: Metadata = {
  title: `About | Engineering Innovation House (EI HOUSE INDIA)`,
  description:
    'Engineering Innovation House (EI HOUSE INDIA) is an Indian deep-tech and engineering enterprise founded by Er. Monu Prajapati—advancing 3D virtual EDA simulation, embedded hardware R&D, component intelligence, and practical engineering systems.',
  keywords: [
    'Engineering Innovation House',
    'EI House India',
    'EIHOUSE INDIA',
    'Er. Monu Prajapati',
    'Monu Prajapati EI House',
    '3D Virtual Engineering Lab',
    'Embedded Systems R&D India',
    'Electronics Engineering Enterprise',
  ],
  alternates: { canonical: `${SITE_CONFIG.url}/about` },
};

const PHILOSOPHY_PILLARS = [
  {
    icon: FlaskConical,
    tag: '01 · SIMULATION',
    title: 'Deterministic Digital Simulation',
    description:
      'Validate circuit topologies, MCU firmware behavior, and electrical pinouts in our 3D Virtual Engineering Lab before committing to physical silicon or PCB fabrication.',
  },
  {
    icon: Cpu,
    tag: '02 · CROSS-DISCIPLINARY R&D',
    title: 'Hardware-Software Convergence',
    description:
      'Unified engineering workflows combining power electronics, STM32/ESP32/RISC-V firmware, industrial telemetry, and Edge AI inference under rigorous verification.',
  },
  {
    icon: Wrench,
    tag: '03 · INDIGENOUS MANUFACTURING',
    title: 'Concept-to-Prototype Execution',
    description:
      'Bridging academic theory and industrial production through DFM-compliant PCB layouts, curated component sourcing, and turnkey prototyping services.',
  },
];

const ENTERPRISE_DIVISIONS = [
  {
    number: '01',
    title: 'Virtual Engineering Lab & EDA Suite',
    subtitle: 'Browser-Native 3D Circuit & Embedded Simulation',
    href: '/engineering-lab',
    cta: 'Launch Engineering Lab',
    icon: FlaskConical,
    points: [
      'Real-time 3D interactive breadboard, schematic capture, and multi-instrument diagnostics.',
      'Pre-verified component library with electrical pinout mapping and datasheet integration.',
      'Cloud-synced project workspaces built for individual engineers and university cohorts.',
    ],
  },
  {
    number: '02',
    title: 'Hardware R&D, PCB Design & Prototyping',
    subtitle: 'Industrial Electronics & Turnkey Product Engineering',
    href: '/services',
    cta: 'Consult R&D Services',
    icon: Cpu,
    points: [
      'Multi-layer PCB schematic capture, impedance-controlled routing, and DFM validation.',
      'Custom embedded firmware development in C/C++, RTOS, and industrial IoT telemetry.',
      'Curated development boards, sensor modules, and precision prototyping hardware.',
    ],
  },
  {
    number: '03',
    title: 'Technical Knowledge Base & Datasheets',
    subtitle: 'Peer-Reviewed Documentation & Component Intelligence',
    href: '/datasheets',
    cta: 'Explore Datasheets',
    icon: BookOpen,
    points: [
      'Structured IC pinouts, power ratings, and semiconductor architecture references.',
      'In-depth engineering articles covering analog design, firmware, and robotics.',
      'Parametric engineering calculators for rapid bench verification and tolerance checks.',
    ],
  },
  {
    number: '04',
    title: 'Engineering Education & Institutional Labs',
    subtitle: 'Workforce Readiness & Academic Infrastructure',
    href: '/partnerships',
    cta: 'Institutional Partnerships',
    icon: GraduationCap,
    points: [
      'Structured hands-on curricula spanning embedded systems, IoT, and industrial automation.',
      'End-to-end Robotics and STEM Innovation Center deployment for colleges and institutes.',
      'Direct mentorship, bench evaluation, and project-based engineering certification.',
    ],
  },
];

const CORE_DISCIPLINES = [
  { code: 'ELEC', name: 'Power & Analog Electronics', scope: 'SMPS, gate drivers, signal conditioning, thermal management' },
  { code: 'EMBD', name: 'Embedded Systems & RTOS', scope: 'ARM Cortex-M, STM32, ESP32, RISC-V firmware & bare-metal drivers' },
  { code: 'PCBD', name: 'PCB Architecture & DFM', scope: 'High-speed multi-layer routing, EMI/EMC compliance, BOM optimization' },
  { code: 'IIOT', name: 'Industrial IoT & Telemetry', scope: 'MQTT, Modbus, LoRaWAN, edge gateways, cloud diagnostics' },
  { code: 'ROBO', name: 'Robotics & Motion Control', scope: 'BLDC/stepper control, kinematics, sensor fusion, autonomous systems' },
  { code: 'EDAI', name: 'Edge AI & TinyML', scope: 'On-device inference, quantized neural networks, predictive maintenance' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <JsonLd data={buildAboutPageJsonLd()} />
      <JsonLd data={buildFounderJsonLd()} />
      <SiteHeader />

      <main className="flex-1">
        {/* 1. Enterprise Hero Banner */}
        <section className="border-b border-slate-200 bg-[#FAFBFD] py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl space-y-6">
              <div className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-1 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-slate-700">
                <span className="h-1.5 w-1.5 rounded-full bg-[#1D4ED8]" />
                <span>Engineering &amp; Deep-Tech Enterprise · India</span>
              </div>

              <div className="space-y-3">
                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#0B1528] leading-[1.08]">
                  {SITE_CONFIG.name}
                </h1>
                <p className="font-mono text-sm sm:text-base font-semibold uppercase tracking-[0.12em] text-[#1D4ED8]">
                  {SITE_CONFIG.tagline}
                </p>
              </div>

              <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-3xl font-normal">
                Engineering Innovation House (<strong>EI HOUSE INDIA</strong>) builds integrated
                simulation software, hardware R&amp;D infrastructure, and technical knowledge
                systems—empowering engineers, researchers, and institutions to move deterministically
                from first principles to production-ready hardware.
              </p>

              <div className="pt-4 flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-[#0B1528] hover:bg-[#172D4D] text-white rounded-md px-6 font-medium"
                >
                  <Link href="/engineering-lab">
                    <span>Explore Ecosystem</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-slate-300 text-slate-800 hover:bg-slate-100 rounded-md px-6 font-medium bg-white"
                >
                  <Link href="/contact">Consult R&amp;D Desk</Link>
                </Button>
              </div>
            </div>

            {/* Minimal Enterprise Metrics Strip */}
            <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 border border-slate-200">
              {[
                { label: 'Core Focus', value: 'Hardware & EDA' },
                { label: 'Platform Architecture', value: '3D Virtual Lab + R&D' },
                { label: 'Engineering Disciplines', value: '10+ Domains' },
                { label: 'Operating Footprint', value: 'Pan-India & Global' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white px-6 py-5 space-y-1">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                    {stat.label}
                  </p>
                  <p className="text-base sm:text-lg font-semibold text-[#0B1528]">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2. Institutional Mandate & Engineering Philosophy (Two-Column Split) */}
        <section className="border-b border-slate-200 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
              {/* Left Column: Narrative Prose */}
              <div className="lg:col-span-6 space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-mono font-semibold uppercase tracking-[0.14em] text-[#1D4ED8]">
                    Institutional Mandate
                  </p>
                  <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1528]">
                    Closing the Gap Between Theory and Physical Execution
                  </h2>
                </div>

                <div className="space-y-4 text-base text-slate-600 leading-relaxed">
                  <p>
                    Modern hardware engineering demands precision across every stage of the product
                    lifecycle—from datasheet verification and schematic capture to embedded firmware
                    validation and physical bench testing. Yet traditional learning and prototyping
                    remain fragmented across disconnected tools.
                  </p>
                  <p>
                    {SITE_CONFIG.name} unifies this workflow into a single engineering environment.
                    Engineers and students test ideas inside a deterministic 3D simulation workspace,
                    reference verified component specifications, source dependable hardware, and
                    collaborate on peer-reviewed technical architectures.
                  </p>
                  <p>
                    Our mandate is straightforward: elevate indigenous hardware capability by making
                    industrial-grade tooling, structured R&amp;D, and practical laboratory rigor
                    accessible across academic and enterprise teams.
                  </p>
                </div>

                <div className="border-l-2 border-[#0B1528] pl-5 py-1">
                  <p className="text-sm text-slate-700 italic leading-relaxed">
                    &ldquo;{SITE_CONFIG.founder.quote}&rdquo;
                  </p>
                  <p className="text-xs font-mono text-slate-500 mt-2 uppercase tracking-wider">
                    — {SITE_CONFIG.founder.fullNameWithPrefix}, {SITE_CONFIG.founder.designation}
                  </p>
                </div>
              </div>

              {/* Right Column: 3 Structured Vertical Pillar Cards */}
              <div className="lg:col-span-6 space-y-4">
                {PHILOSOPHY_PILLARS.map((pillar) => {
                  const Icon = pillar.icon;
                  return (
                    <div
                      key={pillar.tag}
                      className="border border-slate-200 bg-[#FAFBFD] p-6 transition-colors hover:border-slate-300"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 shrink-0 border border-slate-200 bg-white flex items-center justify-center text-[#0B1528]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#1D4ED8]">
                            {pillar.tag}
                          </p>
                          <h3 className="font-display text-lg font-semibold text-[#0B1528]">
                            {pillar.title}
                          </h3>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {pillar.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Core Enterprise Divisions (2x2 Grid) */}
        <section className="border-b border-slate-200 bg-[#FAFBFD] py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-mono font-semibold uppercase tracking-[0.14em] text-[#1D4ED8]">
                Operating Architecture
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1528]">
                Core Enterprise Divisions
              </h2>
              <p className="text-base text-slate-600">
                Four integrated operating pillars supporting simulation, R&amp;D, technical publishing, and institutional capability building.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ENTERPRISE_DIVISIONS.map((div) => {
                const Icon = div.icon;
                return (
                  <div
                    key={div.number}
                    className="flex flex-col justify-between border border-slate-200 bg-white p-7 sm:p-8 transition-colors hover:border-slate-300"
                  >
                    <div className="space-y-5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <span className="font-mono text-2xl font-bold text-slate-300">
                          {div.number}
                        </span>
                        <div className="h-9 w-9 border border-slate-200 bg-[#FAFBFD] flex items-center justify-center text-[#0B1528]">
                          <Icon className="h-4 w-4" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h3 className="font-display text-xl font-bold text-[#0B1528]">
                          {div.title}
                        </h3>
                        <p className="text-xs font-mono text-slate-500 uppercase tracking-wide">
                          {div.subtitle}
                        </p>
                      </div>

                      <ul className="space-y-2.5 pt-1">
                        {div.points.map((pt, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
                            <Check className="h-4 w-4 text-[#1D4ED8] shrink-0 mt-0.5" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-100">
                      <Link
                        href={div.href}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#0B1528] hover:text-[#1D4ED8] transition-colors"
                      >
                        <span>{div.cta}</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 4. Technical Disciplines Matrix */}
        <section className="border-b border-slate-200 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-2 max-w-2xl">
                <p className="text-xs font-mono font-semibold uppercase tracking-[0.14em] text-[#1D4ED8]">
                  Domain Coverage
                </p>
                <h2 className="font-display text-3xl font-bold tracking-tight text-[#0B1528]">
                  Cross-Disciplinary Engineering Capabilities
                </h2>
              </div>
              <Link
                href="/components"
                className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#0B1528] hover:text-[#1D4ED8]"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>View Component Taxonomy</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200 border border-slate-200">
              {CORE_DISCIPLINES.map((item) => (
                <div key={item.code} className="bg-white p-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold tracking-widest text-[#1D4ED8]">
                      {item.code}
                    </span>
                    <Terminal className="h-3.5 w-3.5 text-slate-300" />
                  </div>
                  <h3 className="font-display text-base font-semibold text-[#0B1528]">
                    {item.name}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.scope}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Executive Leadership / Founder */}
        <section id="founder" className="border-b border-slate-200 bg-[#FAFBFD] py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              <div className="lg:col-span-4 space-y-5">
                <div className="border border-slate-200 bg-white p-6 space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden border border-slate-200 bg-slate-100">
                      <Image
                        src={SITE_CONFIG.founder.avatarImage}
                        alt={`${SITE_CONFIG.founder.fullNameWithPrefix} — ${SITE_CONFIG.founder.designation}`}
                        width={160}
                        height={160}
                        className="h-full w-full object-cover object-top"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-mono uppercase tracking-wider text-[#1D4ED8] font-semibold">
                        Executive Leadership
                      </p>
                      <h3 className="font-display text-lg font-bold text-[#0B1528] leading-snug">
                        {SITE_CONFIG.founder.fullNameWithPrefix}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {SITE_CONFIG.founder.designation}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Organization</span>
                      <span className="font-medium text-slate-800 text-right">{SITE_CONFIG.shortName}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Direct Desk</span>
                      <a
                        href={`mailto:${SITE_CONFIG.founder.email}`}
                        className="font-mono font-medium text-[#1D4ED8] hover:underline truncate"
                      >
                        {SITE_CONFIG.founder.email}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-mono font-semibold uppercase tracking-[0.14em] text-[#1D4ED8]">
                    Founder&apos;s Note &amp; Vision
                  </p>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1528]">
                    Building Self-Reliant Engineering Infrastructure
                  </h2>
                </div>

                <div className="space-y-4 text-sm sm:text-base text-slate-600 leading-relaxed">
                  <p>{SITE_CONFIG.founder.bio}</p>
                  <p>{SITE_CONFIG.founder.extendedBio}</p>
                </div>

                <div className="pt-2">
                  <p className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500 mb-3">
                    Core Technical Specializations
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SITE_CONFIG.founder.expertise.map((skill) => (
                      <span
                        key={skill}
                        className="border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Enterprise Consultation CTA */}
        <section className="bg-[#0B1528] text-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-blue-300">
                <ShieldCheck className="h-4 w-4" />
                <span>Enterprise &amp; Academic Desk</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                Partner with Engineering Innovation House
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                For custom hardware R&amp;D, institutional innovation lab deployments, or technical
                collaborations, connect directly with our engineering desk.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button
                asChild
                size="lg"
                className="bg-white text-[#0B1528] hover:bg-slate-100 font-semibold rounded-md"
              >
                <Link href="/contact">
                  <span>Consult R&amp;D Desk</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-slate-600 text-white hover:bg-slate-800 hover:text-white rounded-md bg-transparent"
              >
                <a href={`mailto:${SITE_CONFIG.emails.info}`}>
                  <Mail className="h-4 w-4 mr-2" />
                  <span>{SITE_CONFIG.emails.info}</span>
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
