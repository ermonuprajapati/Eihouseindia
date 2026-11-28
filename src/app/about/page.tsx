import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ArrowUpRight,
  Cpu,
  FlaskConical,
  Wrench,
  Building2,
  Mail,
  ShieldCheck,
  Check,
  Quote,
  Compass,
} from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildAboutPageJsonLd, buildFounderJsonLd } from '@/lib/seo';
import { SITE_CONFIG } from '@/config/site';

export const metadata: Metadata = {
  title: 'About | Engineering Innovation House (EI House) — Deep-Tech R&D & EDA Enterprise',
  description:
    'Engineering Innovation House (EI House) is a full-spectrum deep-tech, multi-disciplinary R&D, digital EDA, and precision hardware engineering enterprise founded by Er. Monu Prajapati.',
  keywords: [
    'Engineering Innovation House',
    'EI House',
    'EIHOUSE INDIA',
    'Er. Monu Prajapati',
    'Deep-Tech R&D India',
    'Online EDA Virtual Engineering Lab',
    'Multi-layer PCB Design India',
    'Embedded Systems R&D',
  ],
  openGraph: {
    title: 'About Engineering Innovation House (EI House) | Where Ideas Become Things.',
    description:
      'A full-spectrum deep-tech, multi-disciplinary R&D, digital EDA & precision hardware engineering enterprise serving industrial, academic, and research ecosystems.',
    url: `${SITE_CONFIG.url}/about`,
    siteName: SITE_CONFIG.brandName,
    type: 'website',
  },
  alternates: { canonical: `${SITE_CONFIG.url}/about` },
};

const MANDATE_PILLARS = [
  {
    number: '01',
    icon: FlaskConical,
    title: 'Browser-Native Computational & Simulation Infrastructure',
    description:
      'Enabling engineers to model circuit topologies, validate breadboard behavior, visualize 3D CAD component footprints, and compute multi-domain parameters in real time prior to physical fabrication.',
  },
  {
    number: '02',
    icon: Cpu,
    title: 'Deep-Tech Cross-Disciplinary R&D',
    description:
      'Executing production-grade hardware architecture, EMC/EMI-compliant multi-layer PCBs, embedded firmware, mechanical CAD/CAM, civil/smart-infrastructure modeling, and enterprise software platforms.',
  },
  {
    number: '03',
    icon: Wrench,
    title: 'Indigenous Manufacturing & Engineered Systems',
    description:
      'Translating validated R&D into precision 3D-printed assemblies, datasheet-verified engineering project kits, and modular technical construction blocks.',
  },
];

const ENTERPRISE_DIVISIONS = [
  {
    number: '01',
    title: 'Digital Engineering Platforms & Parametric Intelligence',
    description:
      'EI House engineers cloud-accessible software tools and structured technical repositories built to accelerate hardware and systems design workflows globally:',
    href: '/engineering-lab',
    cta: 'Launch Engineering Lab',
    icon: FlaskConical,
    items: [
      {
        label: 'EI HOUSE Engineering Lab & Online EDA',
        text: 'Browser-native Electronic Design Automation and virtual laboratory environment featuring schematic capture, interactive breadboard emulation, 3D CAD component views, and real-time circuit simulation.',
      },
      {
        label: 'Parametric Component Directory & Datasheet Finder',
        text: 'Engineering-grade component catalog spanning passive, discrete, IC, MCU, power, and sensor families—mapped with exact pin configurations, JEDEC/IPC footprints, package geometries, mounting standards, and verified manufacturer datasheets.',
      },
      {
        label: 'Multi-Domain Engineering Tools & Calculators',
        text: 'High-precision computational engines for PCB trace impedance, power electronics and magnetics sizing, mechanical/structural load estimation, and embedded timing analysis.',
      },
    ],
  },
  {
    number: '02',
    title: 'Turnkey R&D & Multi-Disciplinary Product Engineering',
    description:
      'Anchored by deep Electronics R&D expertise, our Research and Development division partners with enterprises, startups, and research bodies to take mission-critical concepts from feasibility studies to production-ready prototypes:',
    href: '/services',
    cta: 'Explore R&D Services',
    icon: Cpu,
    items: [
      {
        label: 'Electronics Hardware & Embedded Systems',
        text: 'High-density multi-layer PCB design (DFM/DFA compliant), high-speed signal integrity, EMC/EMI compliance engineering, analog front-ends, circuit diagnostics, and bare-metal/RTOS firmware (ARM Cortex, STM32, ESP32, AVR, RISC-V).',
      },
      {
        label: 'Electrical Power & Industrial Systems',
        text: 'Power electronics converters, custom magnetics, BLDC/servo motor drives, industrial PLC automation, and grid-scale diagnostic architectures.',
      },
      {
        label: 'Mechanical Engineering & Additive Manufacturing',
        text: 'Parametric 3D CAD/CAM design, robotics and motion kinematics, thermal/fluid system prototyping, and precision industrial 3D printing for functional enclosures and mechanical assemblies.',
      },
      {
        label: 'Civil & Smart Infrastructure Systems',
        text: 'Precision architectural and structural scale modeling, IoT-enabled structural health telemetry, and smart-city instrumentation systems.',
      },
      {
        label: 'Computer Science & Enterprise IT',
        text: 'Edge AI and TinyML inference on resource-constrained silicon, embedded computer vision, industrial IoT cloud platforms (MQTT/telemetry), and full-stack enterprise software systems.',
      },
    ],
  },
  {
    number: '03',
    title: 'Engineered Products, Hardware Kits & Modular Technical Systems',
    description:
      'EI House designs, manufactures, and distributes standardized hardware platforms and technical systems engineered to strict tolerances:',
    href: '/products',
    cta: 'View Hardware Catalog',
    icon: Wrench,
    items: [
      {
        label: 'Indigenous Development Hardware & Store Catalog',
        text: 'Proprietary EI House microcontroller boards, industrial sensor modules, testing instruments, and verified electronic components.',
      },
      {
        label: 'Precision 3D-Printed Assemblies & Custom Fabrication',
        text: 'On-demand rapid prototyping and small-batch additive manufacturing utilizing engineering-grade polymers and resins.',
      },
      {
        label: 'Multi-Branch Engineering & DIY Project Kits',
        text: 'Thoroughly documented, production-grade project and development platforms spanning Electronics, Electrical, Mechanical, Robotics, Civil/Smart Infrastructure, and IoT/CS—complete with verified schematics, BOMs, and technical manuals.',
      },
      {
        label: 'Modular Technical Construction Blocks',
        text: 'Precision-engineered mechanical and programmable electronic building systems designed to instill structural logic, gear kinematics, sensor integration, and systems engineering across schools, innovation labs, and technical builders.',
      },
    ],
  },
  {
    number: '04',
    title: 'Institutional Infrastructure, Technical Publishing & Collaborative Network',
    description:
      'EI House strengthens national and global engineering capability through physical laboratory infrastructure, peer-reviewed literature, and an active practitioner network:',
    href: '/partnerships',
    cta: 'Institutional Partnerships',
    icon: Building2,
    items: [
      {
        label: 'Turnkey Institutional Innovation Centers',
        text: 'End-to-end establishment of multi-disciplinary Innovation Labs (Electronics & Embedded R&D, Robotics, IoT, Industrial 3D Printing, CAD/CAM, and AI) for universities, engineering colleges, polytechnics, and K12 institutions—encompassing precision lab equipment, structured curricula, certification frameworks, and faculty enablement.',
      },
      {
        label: 'The EI House Technical Library',
        text: 'An authoritative publication repository delivering peer-reviewed technical monographs, semiconductor technology analyses, power electronics guides, and verified reference schematics across core engineering domains.',
      },
      {
        label: 'Collaborative Engineering Network',
        text: 'A structured technical ecosystem enabling engineers, researchers, authors, and developers to resolve complex debugging challenges, publish peer-reviewed work, and showcase validated builds.',
      },
    ],
  },
];

const CAPABILITY_MATRIX = [
  {
    branch: 'Electronics & Embedded R&D',
    code: '01 · ELEC / EMBD',
    capabilities:
      'Multi-layer PCB architecture, EMC/EMI compliance, signal integrity, analog/mixed-signal design, ARM/STM32/ESP32/RISC-V firmware, RTOS, parametric component engineering',
  },
  {
    branch: 'Electrical & Power Systems',
    code: '02 · PWR / IND',
    capabilities:
      'Switch-mode power converters (SMPS), custom magnetics, BLDC/servo motor drives, industrial PLC automation, power protection, and grid-scale diagnostics',
  },
  {
    branch: 'Mechanical & Additive Mfg.',
    code: '03 · MECH / CAD',
    capabilities:
      'Parametric 3D CAD/CAM, robotics kinematics, thermal/fluid prototyping, precision industrial 3D printing, and modular mechanical system fabrication',
  },
  {
    branch: 'Civil & Smart Infrastructure',
    code: '04 · CIV / INFRA',
    capabilities:
      'Architectural & structural scale modeling, IoT-enabled structural health monitoring telemetry, environmental sensor arrays, and smart-city instrumentation',
  },
  {
    branch: 'Computer Science & Edge AI',
    code: '05 · CS / TINYML',
    capabilities:
      'Edge AI and TinyML inference on microcontrollers, embedded computer vision, deterministic real-time algorithms, and computational engineering solvers',
  },
  {
    branch: 'Information Technology & Cloud',
    code: '06 · IT / CLOUD',
    capabilities:
      'Browser-native WebGL/EDA platforms, high-throughput MQTT/telemetry backends, full-stack enterprise portals, and cloud-synced engineering workspaces',
  },
];

const TECHNICAL_COMMAND_2X2 = [
  {
    title: 'Hardware & PCB Architecture',
    detail:
      'High-density multi-layer schematic capture, analog front-ends, mixed-signal layout, and DFM/EMC compliance engineering.',
  },
  {
    title: 'Embedded Firmware & Silicon',
    detail:
      'Bare-metal & RTOS firmware across ARM Cortex-M, STM32, ESP32, AVR, and RISC-V microcontroller ecosystems.',
  },
  {
    title: 'Power, Robotics & Industrial IoT',
    detail:
      'Industrial automation, BLDC/stepper motion control, power electronics diagnostics, and resilient telemetry networks.',
  },
  {
    title: 'Virtual EDA & STEM Systems',
    detail:
      'Architecting browser-based 3D simulation infrastructure and hands-on laboratory curricula for academic and industrial readiness.',
  },
];

const LIFECYCLE_STAGES = [
  {
    step: '01',
    title: 'Concept & Feasibility',
    desc: 'Requirements engineering, physics-based feasibility checks, and component selection via parametric datasheets.',
  },
  {
    step: '02',
    title: 'Digital Simulation & EDA',
    desc: 'Behavioral circuit modeling, pinout verification, and breadboard emulation inside the 3D Virtual Lab.',
  },
  {
    step: '03',
    title: 'Multi-Domain Architecture',
    desc: 'Multi-layer PCB routing, mechanical CAD enclosure design, and embedded firmware architecture.',
  },
  {
    step: '04',
    title: 'Prototyping & Fabrication',
    desc: 'DFM-compliant board assembly, precision 3D additive manufacturing, and custom harness fabrication.',
  },
  {
    step: '05',
    title: 'Bench Validation & QA',
    desc: 'Oscilloscope, logic analyzer, thermal stress, and EMC/EMI pre-compliance bench diagnostics.',
  },
  {
    step: '06',
    title: 'Production & Deployment',
    desc: 'Complete BOMs, verified documentation, turnkey hardware kits, and field telemetry deployment.',
  },
];

const GOVERNANCE_FACTS = [
  { label: 'Official Entity Name', value: 'Engineering Innovation House (EI House)' },
  { label: 'Enterprise Classification', value: 'Deep-Tech, Multi-Disciplinary R&D & Digital EDA Enterprise' },
  { label: 'Founder & Principal Architect', value: 'Er. Monu Prajapati (Founder & Proprietor)' },
  {
    label: 'Core Engineering Disciplines',
    value: 'Electronics, Electrical, Mechanical, Civil, Computer Science & Information Technology',
  },
  {
    label: 'Operating Divisions',
    value: 'Digital EDA Platforms · Turnkey R&D · Engineered Products & Kits · Institutional Labs & Library',
  },
  { label: 'Headquarters & Jurisdiction', value: 'India (Pan-India & Global Digital Footprint)' },
  {
    label: 'Official Executive & Support Desks',
    value: `${SITE_CONFIG.founder.email}  |  ${SITE_CONFIG.emails.info}`,
  },
];

const INSTITUTIONAL_PRINCIPLES = [
  {
    number: '01',
    title: 'First-Principles Rigor',
    desc: 'Every schematic, simulation model, and firmware routine is verified against physics, silicon datasheets, and empirical bench measurements.',
  },
  {
    number: '02',
    title: 'Cross-Disciplinary Unity',
    desc: 'We eliminate artificial boundaries between electronics, power, mechanics, civil infrastructure, and cloud software.',
  },
  {
    number: '03',
    title: 'Indigenous Self-Reliance',
    desc: 'Empowering Indian engineers, startups, and universities to design, simulate, and manufacture production-grade hardware locally.',
  },
  {
    number: '04',
    title: 'Open Technical Integrity',
    desc: 'Maintaining transparent documentation, reproducible schematics, and peer-reviewed engineering knowledge for builders worldwide.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <JsonLd data={buildAboutPageJsonLd()} />
      <JsonLd data={buildFounderJsonLd()} />
      <SiteHeader />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="border-b border-slate-200 bg-[#FAFBFD] py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl space-y-6">
              <div className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3.5 py-1 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-slate-700">
                <span className="h-1.5 w-1.5 rounded-full bg-[#1D4ED8]" />
                <span>Engineering &amp; Deep-Tech Enterprise · India &amp; Global</span>
              </div>

              <div className="space-y-3">
                <h1 className="font-display text-4xl sm:text-5xl lg:text-[54px] font-bold tracking-tight text-[#0B1528] leading-[1.08]">
                  Engineering Innovation House (EI House)
                </h1>
                <p className="font-mono text-sm sm:text-base font-semibold uppercase tracking-[0.14em] text-[#1D4ED8]">
                  Where Ideas Become Things.
                </p>
              </div>

              <p className="text-xl sm:text-2xl font-medium text-[#0B1528] leading-snug max-w-4xl">
                A Full-Spectrum Deep-Tech, Multi-Disciplinary R&amp;D, Digital EDA &amp; Precision
                Hardware Engineering Enterprise.
              </p>

              <div className="space-y-4 text-base sm:text-lg text-slate-600 leading-relaxed max-w-4xl">
                <p>
                  Engineering Innovation House (EI House) is an integrated, research-driven
                  engineering and technology enterprise operating at the convergence of{' '}
                  <strong className="text-[#0B1528] font-semibold">
                    Electronics, Electrical, Mechanical, Civil, Computer Science, and Information
                    Technology
                  </strong>
                  . Architected by seasoned Electronics R&amp;D leadership, EI House unifies
                  cloud-based Electronic Design Automation (EDA), interactive virtual laboratories,
                  parametric semiconductor intelligence, turnkey industrial R&amp;D, precision 3D
                  additive manufacturing, engineered hardware kits, and modular technical
                  construction systems under a single institutional framework.
                </p>
                <p>
                  Headquartered in India with a global digital footprint, EI House serves industrial
                  enterprises, hardware startups, infrastructure developers, research laboratories,
                  and premier academic institutions—bridging deep theoretical science with
                  production-grade engineering execution.
                </p>
              </div>

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
          </div>
        </section>

        {/* SECTION 1: Institutional Mandate & Engineering Philosophy */}
        <section className="border-b border-slate-200 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
              {/* Left: Narrative Prose */}
              <div className="lg:col-span-5 space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-mono font-semibold uppercase tracking-[0.14em] text-[#1D4ED8]">
                    01 · Institutional Mandate &amp; Philosophy
                  </p>
                  <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1528]">
                    Eliminating Silos Across Physical and Digital Engineering
                  </h2>
                </div>

                <div className="space-y-4 text-base text-slate-600 leading-relaxed">
                  <p>
                    Modern technological breakthroughs rarely occur within an isolated engineering
                    discipline. True industrial innovation emerges where{' '}
                    <strong className="text-[#0B1528] font-semibold">
                      high-reliability electronics, power systems and magnetics, mechanical
                      kinematics, structural integrity, and intelligent software
                    </strong>{' '}
                    operate as a single unified architecture. Conventional workflows, however,
                    remain fractured across disconnected software suites, unverified component
                    databases, and fragmented prototyping vendors.
                  </p>
                  <p>
                    Engineering Innovation House eliminates these operational bottlenecks through a
                    vertically integrated engineering continuum:
                  </p>
                </div>
              </div>

              {/* Right: 3 Structured Vertical Pillar Cards */}
              <div className="lg:col-span-7 space-y-4">
                {MANDATE_PILLARS.map((pillar) => {
                  const Icon = pillar.icon;
                  return (
                    <div
                      key={pillar.number}
                      className="border border-slate-200 bg-[#FAFBFD] p-6 transition-colors hover:border-slate-300"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 shrink-0 border border-slate-200 bg-white flex items-center justify-center text-[#0B1528]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#1D4ED8]">
                            Pillar {pillar.number}
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

        {/* SECTION 2: Core Enterprise Divisions (2x2 Grid) */}
        <section className="border-b border-slate-200 bg-[#FAFBFD] py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="max-w-3xl space-y-2">
              <p className="text-xs font-mono font-semibold uppercase tracking-[0.14em] text-[#1D4ED8]">
                02 · Operating Architecture
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1528]">
                Core Enterprise Divisions
              </h2>
              <p className="text-base text-slate-600">
                Four synergistic, institutional-grade divisions structured to deliver scalable value
                across industrial, commercial, and academic ecosystems.
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

                      <div className="space-y-2">
                        <h3 className="font-display text-xl font-bold text-[#0B1528] leading-snug">
                          {div.title}
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed">{div.description}</p>
                      </div>

                      <ul className="space-y-3 pt-1">
                        {div.items.map((item) => (
                          <li key={item.label} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
                            <Check className="h-4 w-4 text-[#1D4ED8] shrink-0 mt-1" />
                            <span>
                              <strong className="text-[#0B1528] font-semibold">{item.label}:</strong>{' '}
                              {item.text}
                            </span>
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

        {/* SECTION 3: Multi-Disciplinary Capability Matrix */}
        <section className="border-b border-slate-200 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-mono font-semibold uppercase tracking-[0.14em] text-[#1D4ED8]">
                03 · Technical Scope
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1528]">
                Multi-Disciplinary Capability Matrix
              </h2>
              <p className="text-base text-slate-600">
                Cross-domain engineering execution across six foundational branches.
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#FAFBFD]">
                    <th className="py-3.5 px-5 text-xs font-mono font-semibold uppercase tracking-wider text-slate-500 w-56">
                      Discipline Code
                    </th>
                    <th className="py-3.5 px-5 text-xs font-mono font-semibold uppercase tracking-wider text-slate-500 w-72">
                      Engineering Branch
                    </th>
                    <th className="py-3.5 px-5 text-xs font-mono font-semibold uppercase tracking-wider text-slate-500">
                      Core Capabilities &amp; Technical Deliverables
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {CAPABILITY_MATRIX.map((row) => (
                    <tr key={row.branch} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-5 font-mono text-xs font-semibold text-[#1D4ED8] whitespace-nowrap align-top">
                        {row.code}
                      </td>
                      <td className="py-4 px-5 font-display font-semibold text-[#0B1528] align-top">
                        {row.branch}
                      </td>
                      <td className="py-4 px-5 text-slate-600 leading-relaxed align-top">
                        {row.capabilities}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECTION 4: Founder & Principal R&D Leadership Dossier */}
        <section id="founder" className="border-b border-slate-200 bg-[#FAFBFD] py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-mono font-semibold uppercase tracking-[0.14em] text-[#1D4ED8]">
                04 · Executive Leadership Dossier
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1528]">
                Founder &amp; Principal R&amp;D Architect
              </h2>
            </div>

            <div className="border border-slate-200 bg-white p-7 sm:p-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                {/* Identity Column */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-24 w-24 shrink-0 overflow-hidden border border-slate-200 bg-slate-100">
                      <Image
                        src={SITE_CONFIG.founder.avatarImage}
                        alt={`${SITE_CONFIG.founder.fullNameWithPrefix} — Founder, Proprietor & Principal R&D Architect`}
                        width={192}
                        height={192}
                        className="h-full w-full object-cover object-top"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#1D4ED8]">
                        Principal R&amp;D Architect
                      </p>
                      <h3 className="font-display text-2xl font-bold text-[#0B1528] leading-tight">
                        {SITE_CONFIG.founder.fullNameWithPrefix}
                      </h3>
                      <p className="text-xs font-medium text-slate-500 mt-1">
                        Founder, Proprietor &amp; Principal R&amp;D Architect
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    {SITE_CONFIG.founder.bio}
                  </p>

                  <div className="border-t border-slate-100 pt-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Executive Email</span>
                      <a
                        href={`mailto:${SITE_CONFIG.founder.email}`}
                        className="font-mono font-semibold text-[#1D4ED8] hover:underline"
                      >
                        {SITE_CONFIG.founder.email}
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Primary Domain</span>
                      <span className="font-medium text-[#0B1528]">Electronics &amp; Embedded R&amp;D</span>
                    </div>
                  </div>
                </div>

                {/* Executive Quote + 2x2 Core Technical Command */}
                <div className="lg:col-span-8 space-y-8">
                  <blockquote className="border-l-2 border-[#0B1528] bg-[#FAFBFD] p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                      <Quote className="h-5 w-5 text-[#1D4ED8] shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <p className="text-base sm:text-lg text-[#0B1528] font-medium leading-relaxed">
                          &ldquo;{SITE_CONFIG.founder.quote}&rdquo;
                        </p>
                        <footer className="text-xs font-mono uppercase tracking-wider text-slate-500">
                          — {SITE_CONFIG.founder.fullNameWithPrefix}, {SITE_CONFIG.name}
                        </footer>
                      </div>
                    </div>
                  </blockquote>

                  <div className="space-y-4">
                    <p className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500">
                      Core Technical Command
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {TECHNICAL_COMMAND_2X2.map((cmd) => (
                        <div key={cmd.title} className="border border-slate-200 bg-[#FAFBFD] p-4 space-y-1.5">
                          <h4 className="font-display text-sm font-bold text-[#0B1528]">
                            {cmd.title}
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed">{cmd.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: The EI House Engineering Lifecycle (01 to 06) */}
        <section className="border-b border-slate-200 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-mono font-semibold uppercase tracking-[0.14em] text-[#1D4ED8]">
                05 · Methodology
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1528]">
                The EI House Engineering Lifecycle
              </h2>
              <p className="text-base text-slate-600">
                A deterministic, six-stage engineering methodology taking systems from theoretical
                first principles to validated physical deployment.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200 border border-slate-200">
              {LIFECYCLE_STAGES.map((stage) => (
                <div key={stage.step} className="bg-white p-6 sm:p-7 space-y-3">
                  <span className="inline-block font-mono text-xs font-bold text-[#1D4ED8] border border-blue-200 bg-blue-50 px-2 py-0.5">
                    STAGE {stage.step}
                  </span>
                  <h3 className="font-display text-lg font-bold text-[#0B1528]">{stage.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{stage.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 6: Corporate Fact Sheet & Governance Table */}
        <section className="border-b border-slate-200 bg-[#FAFBFD] py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-mono font-semibold uppercase tracking-[0.14em] text-[#1D4ED8]">
                06 · Institutional Registry
              </p>
              <h2 className="font-display text-3xl font-bold tracking-tight text-[#0B1528]">
                Corporate Fact Sheet &amp; Governance
              </h2>
            </div>

            <div className="border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-left border-collapse">
                <tbody className="divide-y divide-slate-200 text-sm">
                  {GOVERNANCE_FACTS.map((item) => (
                    <tr key={item.label} className="flex flex-col sm:table-row">
                      <th className="py-3.5 px-6 font-mono text-xs font-semibold uppercase tracking-wider text-slate-500 bg-[#FAFBFD] sm:w-72 align-top">
                        {item.label}
                      </th>
                      <td className="py-3.5 px-6 text-[#0B1528] font-medium align-top">
                        {item.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECTION 7: Strategic Vision & Institutional Principles */}
        <section className="border-b border-slate-200 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="border border-slate-200 bg-[#0B1528] text-white p-8 sm:p-12 space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-blue-300">
                <Compass className="h-4 w-4" />
                <span>Strategic Vision</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight max-w-4xl leading-snug">
                &ldquo;To build an interconnected engineering ecosystem that empowers engineers,
                researchers, and institutions to learn, simulate, innovate, and manufacture
                technologies for a self-reliant future.&rdquo;
              </h2>
            </div>

            <div className="space-y-6">
              <h3 className="font-display text-2xl font-bold text-[#0B1528]">
                Institutional Principles
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {INSTITUTIONAL_PRINCIPLES.map((p) => (
                  <div key={p.number} className="border border-slate-200 bg-[#FAFBFD] p-6 space-y-2.5">
                    <span className="font-mono text-xs font-bold text-[#1D4ED8]">{p.number}</span>
                    <h4 className="font-display text-base font-bold text-[#0B1528]">{p.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Enterprise CTA Strip */}
        <section className="bg-[#FAFBFD] py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#1D4ED8]">
                <ShieldCheck className="h-4 w-4" />
                <span>Enterprise &amp; Academic R&amp;D Desk</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1528]">
                Ready to Build with Engineering Innovation House?
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                Connect with our engineering team for custom R&amp;D prototyping, institutional lab
                deployments, or technical partnerships.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button asChild size="lg" className="bg-[#0B1528] hover:bg-[#172D4D] text-white rounded-md">
                <Link href="/contact">
                  <span>Consult R&amp;D Desk</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-slate-300 bg-white rounded-md">
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
