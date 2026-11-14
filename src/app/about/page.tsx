import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  GraduationCap,
  Wrench,
  Lightbulb,
  BookOpen,
  Users,
  Building2,
  CheckCircle2,
  Cpu,
  ArrowRight,
  ShieldCheck,
  Compass,
  Sparkles,
  UserCheck,
  Mail,
  Award,
  Layers,
} from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildAboutPageJsonLd, buildFounderJsonLd } from '@/lib/seo';
import { SITE_CONFIG } from '@/config/site';

export const metadata: Metadata = {
  title: `About EI House | Founded by Monu Prajapati — Engineering Innovation House`,
  description:
    'Engineering Innovation House (EI House / EIHOUSE INDIA) is an engineering and technology organization founded by Monu Prajapati (Founder & Proprietor). Dedicated to engineering education, hardware prototyping, products, R&D services, and a collaborative technology community.',
  keywords: [
    'EI House',
    'EI House India',
    'EIHOUSE INDIA',
    'Engineering Innovation House',
    'Monu Prajapati',
    'Er Monu Prajapati',
    'Monu Prajapati EI House',
    'Founder of EI House',
    'Who owns EI House',
    'Electronics Engineering India',
    'Embedded Systems Prototyping',
  ],
  alternates: { canonical: `${SITE_CONFIG.url}/about` },
};

export default function AboutPage() {
  const domains = [
    { title: 'Electronics & Electrical', desc: 'Circuit theory, power electronics, analog & digital system design' },
    { title: 'Embedded Systems & MCUs', desc: 'ARM Cortex, STM32, ESP32, AVR, RISC-V firmware and RTOS' },
    { title: 'Internet of Things (IoT)', desc: 'Sensor networks, MQTT, cloud connectivity, wireless telemetry' },
    { title: 'Robotics & Automation', desc: 'Kinematics, motor control, industrial PLCs, autonomous rovers' },
    { title: 'PCB Design & Hardware', desc: 'High-speed schematic capture, multi-layer routing, DFM compliance' },
    { title: 'Artificial Intelligence & ML', desc: 'Edge AI inference, TinyML on microcontrollers, computer vision' },
    { title: 'Mechanical Design & 3D Printing', desc: 'CAD modeling, rapid additive manufacturing, functional enclosures' },
    { title: 'Programming for Engineers', desc: 'Embedded C, modern C++, Python scripting, Linux development' },
    { title: 'STEM Education & Innovation', desc: 'Hands-on practical kits, STEM curriculum, school & college workshops' },
    { title: 'Research & Product Development', desc: 'Concept ideation, proof-of-concept testing, turnkey industrial prototypes' },
  ];

  const values = [
    {
      title: 'Innovation',
      desc: 'Encouraging creative, out-of-the-box thinking to solve real-world technical problems with practical solutions.',
    },
    {
      title: 'Practical Learning',
      desc: 'Bridging classroom theory with hands-on bench experience, circuit assembly, testing, and debugging.',
    },
    {
      title: 'Knowledge Sharing',
      desc: 'Making high-level engineering insights, datasheets, and circuit designs openly accessible to all builders.',
    },
    {
      title: 'Quality & Reliability',
      desc: 'Maintaining rigorous standards in circuit schematics, hardware components, code, and documentation.',
    },
    {
      title: 'Collaboration',
      desc: 'Uniting students, engineers, educators, researchers, and institutions in a supportive shared ecosystem.',
    },
    {
      title: 'Continuous Growth',
      desc: 'Rapidly adapting to emerging technology frontiers, silicon architectures, and global industry standards.',
    },
  ];

  const missions = [
    'Make quality engineering knowledge and practical learning more accessible across India and globally.',
    'Bridge the critical gap between academic theoretical education and real-world industrial applications.',
    'Encourage hands-on experimentation, hardware prototyping, and project-based STEM education.',
    'Design, manufacture, and distribute dependable engineering products, development boards, and components.',
    'Support students, professionals, and educational institutions in their technical journey and careers.',
    'Build a vibrant, collaborative peer community for technical knowledge sharing and open-source innovation.',
    'Promote continuous learning, indigenous research, and early awareness of emerging technology paradigms.',
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <JsonLd data={buildAboutPageJsonLd()} />
      <JsonLd data={buildFounderJsonLd()} />
      <SiteHeader />

      <main className="flex-1">
        {/* 01. Hero Section with Hero Image */}
        <section className="border-b border-slate-200 bg-gradient-to-b from-white via-slate-50/50 to-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#172D4D]/10 px-3.5 py-1 text-xs font-semibold text-[#172D4D]">
                  <Sparkles className="h-3.5 w-3.5 text-[#F59E0B]" />
                  <span>{SITE_CONFIG.name}</span>
                </div>
                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0B1528] leading-[1.1]">
                  Where Ideas Become Things.
                </h1>
                <p className="text-xl font-medium text-[#172D4D]">
                  Integrated Engineering Education, Innovation, Products, Services and Technology Community.
                </p>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                  <strong>Engineering Innovation House (EI House)</strong> is an engineering-focused ecosystem dedicated
                  to bridging the gap between theoretical knowledge and practical engineering. We empower students, engineers,
                  and institutions to learn, experiment, design, develop, and transform concepts into real-world solutions.
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  <Button asChild size="lg" className="bg-[#172D4D] hover:bg-[#0B1528] text-white">
                    <Link href="/learn">
                      <span>Explore Learning Programs</span>
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/projects">Discover Projects</Link>
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-xl bg-slate-900">
                  <Image
                    src="/images/about/about-hero.jpg"
                    alt="About Engineering Innovation House (EI House) Hero"
                    width={1200}
                    height={675}
                    priority
                    className="aspect-[16/9] w-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                  <div className="p-4 bg-[#172D4D] text-white flex items-center justify-between text-xs">
                    <span className="font-medium text-[#F59E0B]">Engineering Innovation House</span>
                    <span className="text-slate-300">Where Ideas Become Things.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 02. Who We Are & Central Business Model with Who We Are Image */}
        <section className="py-16 sm:py-20 border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6 space-y-6">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                    Identity & Purpose
                  </span>
                  <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1528]">
                    Who We Are
                  </h2>
                </div>
                <div className="space-y-4 text-base leading-relaxed text-slate-700">
                  <p>
                    EI House is an integrated engineering platform serving engineering students, professionals,
                    educators, researchers, academic institutions, and technology enthusiasts across India and worldwide.
                  </p>
                  <p>
                    We operate across multiple domains—providing learning resources, practical laboratory training,
                    project development support, electronic components, development boards, robotics and IoT kits,
                    precision 3D printing, and custom R&D services.
                  </p>
                  <p>
                    We believe engineering is not just about understanding technology; it is about <strong>applying knowledge,
                    solving problems, and creating something meaningful.</strong>
                  </p>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <p className="font-semibold text-[#0B1528] text-sm flex items-center gap-2">
                    <Compass className="h-4 w-4 text-[#172D4D]" />
                    <span>The Interconnected EI House Philosophy</span>
                  </p>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    A student learns embedded firmware on an ESP32 → purchases development hardware from our store → builds
                    an IoT project → showcases it in our community → writes a peer-reviewed technical article → receives mentorship
                    and becomes a contributor.
                  </p>
                </div>
              </div>

              <div className="lg:col-span-6 space-y-6">
                <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-lg bg-slate-100">
                  <Image
                    src="/images/about/who-we-are.jpg"
                    alt="Who We Are — Engineering Innovation House"
                    width={1408}
                    height={768}
                    className="w-full object-cover hover:scale-102 transition-transform duration-500"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-[#172D4D] to-[#0B1528] p-6 text-white space-y-4 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-[#F59E0B]">Core Ethos</span>
                    <span className="text-xs text-slate-300">MSME / Udyam Registered</span>
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-200">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#F59E0B] shrink-0 mt-0.5" />
                      <span><strong>Hands-On Bench Skills:</strong> Real soldering, breadboard & logic analysis.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#F59E0B] shrink-0 mt-0.5" />
                      <span><strong>Indigenous Hardware R&D:</strong> Concept to prototype fabrication.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#F59E0B] shrink-0 mt-0.5" />
                      <span><strong>Open Technical Knowledge:</strong> Clean, verified schematics.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#F59E0B] shrink-0 mt-0.5" />
                      <span><strong>National STEM Impact:</strong> School & college lab setups.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Founder & Leadership Section */}
        <section id="founder" className="py-16 sm:py-24 border-b border-slate-200 bg-gradient-to-b from-white to-slate-50/70">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#172D4D]/10 px-3.5 py-1 text-xs font-semibold text-[#172D4D]">
                <UserCheck className="h-3.5 w-3.5 text-[#F59E0B]" />
                <span>Founder & Leadership</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0B1528] tracking-tight">
                {SITE_CONFIG.founder.fullNameWithPrefix}
              </h2>
              <p className="text-lg font-semibold text-[#172D4D]">
                {SITE_CONFIG.founder.designation} · {SITE_CONFIG.founder.organization}
              </p>
              <p className="text-xs sm:text-sm font-mono text-[#F59E0B] uppercase tracking-wider">
                {SITE_CONFIG.founder.professionalIdentity}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              {/* Profile Card & Identity */}
              <div className="lg:col-span-5 space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-lg space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-bl from-[#172D4D]/10 to-transparent rounded-bl-full pointer-events-none" />

                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0 overflow-hidden rounded-2xl border-2 border-amber-400/60 shadow-lg bg-slate-900 h-24 w-24">
                      <Image
                        src="/images/founder/monu-prajapati-square.jpg"
                        alt="Monu Prajapati — Founder & Proprietor, Engineering Innovation House"
                        width={192}
                        height={192}
                        priority
                        className="h-full w-full object-cover object-top hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent py-0.5 text-center">
                        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest font-mono">
                          Founder
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#F59E0B] uppercase tracking-wider">
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Leadership &amp; Founder</span>
                      </div>
                      <h3 className="font-display text-xl font-bold text-[#0B1528] leading-tight">
                        {SITE_CONFIG.founder.fullNameWithPrefix}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-0.5">
                        {SITE_CONFIG.founder.designation}
                      </p>
                      <p className="text-xs text-[#172D4D] font-medium pt-0.5">
                        {SITE_CONFIG.name}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                    <Award className="h-4 w-4 text-[#F59E0B] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Official Entity Ownership</p>
                      <p className="text-amber-800/90 text-[11px] leading-relaxed">
                        Registered Proprietorship under MSME / Udyam (Govt. of India), spearheading engineering innovation, hardware prototyping, and technical education.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Designation:</span>
                      <span className="font-semibold text-[#0B1528]">{SITE_CONFIG.founder.designation}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Organization:</span>
                      <span className="font-semibold text-[#0B1528]">EI House ({SITE_CONFIG.brandName})</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Jurisdiction:</span>
                      <span className="font-semibold text-[#0B1528]">India (Pan-India & Global Reach)</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Brand Tagline:</span>
                      <span className="font-semibold text-[#F59E0B]">{SITE_CONFIG.tagline}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-500 font-medium">Founder Email:</span>
                      <a href={`mailto:${SITE_CONFIG.founder.email}`} className="font-semibold text-[#172D4D] hover:underline">
                        {SITE_CONFIG.founder.email}
                      </a>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <Button asChild className="w-full bg-[#172D4D] hover:bg-[#0B1528] text-white">
                      <Link href="/contact#founder">
                        <Mail className="h-4 w-4 mr-2" />
                        <span>Contact Founder Desk</span>
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/services">
                        <span>Consult on R&D Services</span>
                        <ArrowRight className="h-4 w-4 ml-1.5" />
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Technical Areas of Specialization */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                    <Layers className="h-4 w-4 text-[#172D4D]" />
                    <span>Areas of Technical Specialization</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SITE_CONFIG.founder.expertise.map((exp, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-300 transition-colors"
                      >
                        {exp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Founder Narrative & Vision */}
              <div className="lg:col-span-7 space-y-8">
                <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 shadow-lg space-y-6">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                      Founder&apos;s Profile
                    </span>
                    <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1528]">
                      Architecting Practical Engineering Excellence
                    </h3>
                  </div>

                  <div className="space-y-4 text-base leading-relaxed text-slate-700">
                    <p>
                      <strong>{SITE_CONFIG.founder.name}</strong> is an Engineering Professional, Technology Entrepreneur, and the Founder &amp; Proprietor of <strong>Engineering Innovation House (EI House)</strong>, an engineering and technology-driven organization focused on advancing innovation, research, engineering development, and technological solutions.
                    </p>
                    <p>
                      With a strong professional orientation towards electronics engineering, research and development, and practical technology implementation, he brings together technical expertise, analytical thinking, and an innovation-driven approach to engineering challenges.
                    </p>
                    <p>
                      Driven by the belief that engineering education should extend beyond theoretical knowledge into practical innovation, he established EI House with the vision of creating an integrated ecosystem that connects technical education, research-oriented development, product innovation, engineering services, and emerging technologies.
                    </p>
                    <p>
                      As the Founder, he leads the organization&apos;s vision, strategic direction, and development, with an emphasis on building technical capabilities, encouraging innovation, fostering practical engineering knowledge, and exploring solutions to real-world technological challenges.
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-gradient-to-br from-[#172D4D] to-[#0B1528] text-white space-y-3 shadow-md relative overflow-hidden">
                    <div className="text-4xl font-serif text-[#F59E0B] leading-none select-none">&ldquo;</div>
                    <blockquote className="text-base sm:text-lg italic font-medium leading-relaxed text-slate-100">
                      {SITE_CONFIG.founder.quote}
                    </blockquote>
                    <div className="pt-2 flex items-center justify-between text-xs text-slate-300 border-t border-slate-700">
                      <span className="font-semibold text-white">{SITE_CONFIG.founder.fullNameWithPrefix}</span>
                      <span className="text-[#F59E0B] font-mono">{SITE_CONFIG.tagline}</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-display text-lg font-bold text-[#0B1528]">
                      Vision &amp; Leadership Direction
                    </h4>
                    <p className="text-sm sm:text-base leading-relaxed text-slate-600">
                      {SITE_CONFIG.founder.vision}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 03. What We Do — The 7 Pillars with What We Do Image */}
        <section className="py-16 sm:py-20 border-b border-slate-200 bg-[#FAFBFD]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                The Ecosystem
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1528]">
                What We Do at EI House
              </h2>
              <p className="text-base text-slate-600">
                Our operations span education, prototyping, hardware production, technical media, and institutional partnerships.
              </p>
            </div>

            {/* What We Do Visual Banner */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-md max-w-4xl mx-auto">
              <Image
                src="/images/about/what-we-do.jpg"
                alt="What We Do — Engineering Innovation House Ecosystem"
                width={1024}
                height={572}
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3 hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-[#172D4D]/10 flex items-center justify-center text-[#172D4D]">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-bold text-[#0B1528]">1. Engineering & STEM Education</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Structured 45-day practical training programs, offline laboratory sessions, and online certifications
                  in Embedded Systems, IoT, Robotics, PCB Design, and Industrial Automation.
                </p>
                <Link href="/learn" className="inline-flex items-center text-xs font-semibold text-[#172D4D] hover:underline pt-2">
                  Explore Courses →
                </Link>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3 hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B]">
                  <Wrench className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-bold text-[#0B1528]">2. Engineering Projects & Research</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Support for academic final-year projects, DIY hardware guides, circuit schematics, project reports,
                  and research documentation across Electronics, Robotics, and Computer Science.
                </p>
                <Link href="/projects" className="inline-flex items-center text-xs font-semibold text-[#172D4D] hover:underline pt-2">
                  Browse Projects →
                </Link>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3 hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-[#172D4D]/10 flex items-center justify-center text-[#172D4D]">
                  <Cpu className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-bold text-[#0B1528]">3. Products & Hardware Store</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Original EI House hardware, microcontroller development boards, sensors, STEM kits, 3D printing filaments,
                  tools, and electronic components for students and hardware developers.
                </p>
                <Link href="/products" className="inline-flex items-center text-xs font-semibold text-[#172D4D] hover:underline pt-2">
                  View Store Catalog →
                </Link>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3 hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B]">
                  <Lightbulb className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-bold text-[#0B1528]">4. Engineering & R&D Services</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Turnkey engineering services including multi-layer PCB design, embedded firmware development,
                  rapid 3D prototyping, IoT systems, product development, and technical consulting.
                </p>
                <Link href="/services" className="inline-flex items-center text-xs font-semibold text-[#172D4D] hover:underline pt-2">
                  Request a Quote →
                </Link>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3 hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-[#172D4D]/10 flex items-center justify-center text-[#172D4D]">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-bold text-[#0B1528]">5. Technical Knowledge & Library</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Peer-reviewed technical articles, pinout cheat-sheets, datasheets, circuit references, and technology
                  updates published by engineering practitioners and researchers.
                </p>
                <Link href="/articles" className="inline-flex items-center text-xs font-semibold text-[#172D4D] hover:underline pt-2">
                  Read Technical Blog →
                </Link>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3 hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B]">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-bold text-[#0B1528]">6. Collaborative Community</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  A dedicated network where students, engineers, researchers, and technology enthusiasts can ask questions,
                  solve debugging challenges, showcase builds, and collaborate.
                </p>
                <Link href="/community" className="inline-flex items-center text-xs font-semibold text-[#172D4D] hover:underline pt-2">
                  Join Discussion →
                </Link>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3 hover:shadow-md transition-shadow md:col-span-2 lg:col-span-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#172D4D]/10 flex items-center justify-center text-[#172D4D]">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#0B1528]">7. Franchise & Institutional Partnerships</h3>
                    <p className="text-xs text-[#F59E0B] font-semibold uppercase">Colleges · Schools · Training Centers</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Partnering with engineering colleges, polytechnics, and schools to establish cutting-edge Robotics,
                  Embedded Systems, and IoT Innovation Centers. We supply equipment, curriculum, lab setups, faculty training,
                  and student certification programs.
                </p>
                <Link href="/partnerships" className="inline-flex items-center text-xs font-semibold text-[#172D4D] hover:underline pt-2">
                  Explore Institutional Partnerships →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 04. Vision & Mission with Vision, Mission & Values Image */}
        <section className="py-16 sm:py-20 border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">Strategic Direction</span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1528]">Vision, Mission & Values</h2>
              <p className="text-base text-slate-600">Guiding our technology initiatives, courses, and engineering solutions.</p>
            </div>

            {/* Vision Mission Values Image */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-lg max-w-4xl mx-auto">
              <Image
                src="/images/about/vision-mission-values.jpg"
                alt="EI House Vision, Mission and Core Values"
                width={1792}
                height={1024}
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                  <Compass className="h-4 w-4" />
                  <span>Our Vision</span>
                </div>
                <h3 className="font-display text-2xl font-bold text-[#0B1528]">
                  Empowering Practical Technology For A Modern World
                </h3>
                <p className="text-base text-slate-700 leading-relaxed">
                  &ldquo;To build an interconnected engineering ecosystem that empowers people to learn, innovate, collaborate,
                  and develop technologies that contribute to a better, more technologically self-reliant future.&rdquo;
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#172D4D]">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Our Mission</span>
                </div>
                <ul className="space-y-2.5 text-sm text-slate-700">
                  {missions.map((m, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="font-bold text-[#F59E0B] shrink-0 mt-0.5">•</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 05. Core Values */}
        <section className="py-16 sm:py-20 border-b border-slate-200 bg-[#FAFBFD]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">Guiding Principles</span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1528]">Our Core Values</h2>
              <p className="text-base text-slate-600">The standards that drive every product, course, and technical resource we create.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {values.map((v, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-6 space-y-2">
                  <h3 className="font-display text-base font-bold text-[#0B1528] flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                    <span>{v.title}</span>
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 06. Technology Domains with Technology Domains Image */}
        <section className="py-16 sm:py-20 border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">Engineering Disciplines</span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1528]">Our Technology Domains</h2>
              <p className="text-base text-slate-600">Cross-disciplinary capabilities combining hardware, software, and mechanical design.</p>
            </div>

            {/* Technology Domains Visual Banner */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-md max-w-4xl mx-auto">
              <Image
                src="/images/about/technology-domains.jpg"
                alt="Technology Domains at Engineering Innovation House"
                width={1402}
                height={1122}
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {domains.map((d, i) => (
                <div key={i} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-1.5">
                  <p className="text-xs font-mono text-[#F59E0B] font-semibold">{String(i + 1).padStart(2, '0')}</p>
                  <h4 className="text-sm font-bold text-[#0B1528] leading-tight">{d.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{d.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 07. The Approach Process with Our Approach Image */}
        <section className="py-16 sm:py-20 border-b border-slate-200 bg-[#172D4D] text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10 text-center">
            <div className="space-y-3 max-w-2xl mx-auto">
              <span className="text-xs font-mono uppercase tracking-widest text-[#F59E0B]">Engineering Methodology</span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold">The Continuous Innovation Cycle</h2>
              <p className="text-slate-300 text-sm sm:text-base">
                Meaningful engineering breakthroughs occur when learning connects directly with design and testing.
              </p>
            </div>

            {/* Our Approach Image Visual */}
            <div className="overflow-hidden rounded-2xl border border-slate-700 shadow-xl max-w-4xl mx-auto bg-slate-800">
              <Image
                src="/images/about/our-approach.jpg"
                alt="Our Engineering Approach — Learn, Explore, Design, Develop, Test, Improve, Innovate"
                width={1536}
                height={1024}
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-4">
              {['Learn', 'Explore', 'Design', 'Develop', 'Test', 'Improve', 'Innovate'].map((step, idx) => (
                <div key={idx} className="rounded-lg border border-slate-700 bg-slate-800/80 p-4 flex flex-col items-center gap-1.5">
                  <span className="text-[11px] font-mono text-[#F59E0B] font-bold">STEP {idx + 1}</span>
                  <span className="text-base font-bold text-white">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 08. Be Part of EI House CTA with Join EI House Image */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-8 sm:p-12 space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">Join the Movement</span>
                  <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1528]">
                    Be Part of the Innovation Ecosystem
                  </h2>
                  <p className="text-base text-slate-600 leading-relaxed">
                    Whether you are a student developing practical skills, an engineer exploring microcontrollers,
                    an educator building modern laboratories, or an enterprise needing prototype design, EI House welcomes you.
                  </p>
                </div>

                <div className="lg:col-span-5 overflow-hidden rounded-2xl border border-slate-200 shadow-md">
                  <Image
                    src="/images/about/join-ei-house.jpg"
                    alt="Join Engineering Innovation House Community"
                    width={1333}
                    height={768}
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                  <p className="font-bold text-[#0B1528] text-sm">Students & Beginners</p>
                  <p className="text-xs text-slate-600">Join 45-day practical batches, learn electronics and build real hardware.</p>
                  <Button asChild size="sm" variant="outline" className="w-full text-xs">
                    <Link href="/learn">View Courses</Link>
                  </Button>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                  <p className="font-bold text-[#0B1528] text-sm">Engineers & Authors</p>
                  <p className="text-xs text-slate-600">Publish articles, share schematics, and earn recognition in our community.</p>
                  <Button asChild size="sm" variant="outline" className="w-full text-xs">
                    <Link href="/dashboard/editor">Write an Article</Link>
                  </Button>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                  <p className="font-bold text-[#0B1528] text-sm">Colleges & Schools</p>
                  <p className="text-xs text-slate-600">Set up an official Robotics & STEM Innovation Center with equipment and curriculum.</p>
                  <Button asChild size="sm" variant="outline" className="w-full text-xs">
                    <Link href="/partnerships">Partner With Us</Link>
                  </Button>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                  <p className="font-bold text-[#0B1528] text-sm">Businesses & Clients</p>
                  <p className="text-xs text-slate-600">Get PCB design, 3D printing, and rapid hardware development prototypes.</p>
                  <Button asChild size="sm" variant="outline" className="w-full text-xs">
                    <Link href="/services">Request Service</Link>
                  </Button>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
                <p>
                  <strong>Entity:</strong> {SITE_CONFIG.entity.legalType} · {SITE_CONFIG.entity.focus}
                </p>
                <p>
                  Inquiries: <a href={`mailto:${SITE_CONFIG.contactEmail}`} className="text-[#172D4D] font-semibold underline">{SITE_CONFIG.contactEmail}</a>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
