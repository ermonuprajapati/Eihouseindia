import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Building2,
  GraduationCap,
  Award,
  CheckCircle2,
  ArrowRight,
  Send,
  Cpu,
  Bot,
  Radio,
  Printer,
  Sparkles,
  Users,
  Compass,
  Wrench,
  HelpCircle,
} from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { SITE_CONFIG } from '@/config/site';
import { FranchiseLabAnimation } from '@/components/animations/FranchiseLabAnimation';

export const metadata: Metadata = {
  title: 'Institutional Partnerships & Franchise Innovation Labs — EI House',
  description:
    'Partner with Engineering Innovation House to establish state-of-the-art Robotics, IoT, and STEM Innovation Labs in your college, university, or school.',
  alternates: { canonical: `${SITE_CONFIG.url}/partnerships` },
};

export default function PartnershipsPage() {
  const stats = [
    { value: '50+', label: 'Colleges & Schools Supported', desc: 'Across 12+ States in India' },
    { value: '100%', label: 'NEP 2020 & NAAC/NBA Aligned', desc: 'Outcome-Based Education' },
    { value: 'Turnkey', label: 'End-to-End Setup Model', desc: 'Equipment + Curriculum + FDP' },
    { value: '10,000+', label: 'Students Certified Hands-On', desc: 'Direct Placement Boost' },
  ];

  const models = [
    {
      title: 'College Robotics & IoT Center of Excellence',
      target: 'Engineering Colleges, Universities & Polytechnics',
      badge: 'Higher Education',
      popular: true,
      desc: 'A complete institutional laboratory equipped with modern STM32 & ESP32 bench equipment, robotic arms, sensor suites, 3D printers, and test instruments.',
      equipment: 'DSO Oscilloscopes, Logic Analyzers, 6-DOF Robotic Arms, ROS 2 Rovers, CoreXY 3D Printers, Soldering Stations',
      curriculum: 'Embedded Firmware in C, Real-Time Operating Systems (FreeRTOS), Industrial IoT & LoRaWAN, High-Speed PCB Layout',
      features: [
        'Curriculum directly aligned with automotive, IoT, and embedded hiring needs',
        'Faculty Development Programs (FDP) & Trainer certification for professors',
        'Student semester capstone project mentorship & prototype patent support',
        'Annual college hackathons & regional engineering competitions',
        'Full NAAC Criterion 1 & 2 outcome documentation support',
      ],
      icon: Building2,
    },
    {
      title: 'School STEM & Tinkering Innovation Lab',
      target: 'K-12 Schools, CBSE/ICSE Academies & Trust Foundations',
      badge: 'School Education',
      popular: false,
      desc: 'Hands-on experiential learning kits covering electronics fundamentals, block coding, Arduino robotics, and creative 3D printing designed for young innovators.',
      equipment: 'Modular Safety-Tested Electronic Kits, Micro:bit & Arduino Benches, Educational 3D Printers, Block Coding Hub',
      curriculum: 'Electronics Fundamentals, Scratch/Block Coding, Autonomous Obstacle Avoidance Robots, Creative 3D CAD Modeling',
      features: [
        'Age-appropriate modular learning modules from Class 6th to 12th',
        'Safety-certified electronic kits & child-friendly prototyping tools',
        'Structured year-long lesson plans & semester teacher manuals',
        'Participation and mentoring in national robotics Olympiads',
        'Science exhibition and annual innovation day showcase kits',
      ],
      icon: GraduationCap,
    },
    {
      title: 'EI House Franchise & Regional Learning Center',
      target: 'Entrepreneurs, EdTech Founders & Technical Training Hubs',
      badge: 'Franchise Business Model',
      popular: false,
      desc: 'Operate an authorized EI House technical training and prototyping center in your city under our established brand name, course catalog, and hardware supply chain.',
      equipment: 'Turnkey Classroom & Hardware Lab Workbenches, Test Gear, Branded Merchandise, Prototyping Inventory',
      curriculum: 'EI House 45-Day Intensive Bootcamps, Weekend Professional Workshops, Student Project Guidance',
      features: [
        'Exclusive geographical territory rights for your target city',
        'Branded kits, components & course materials supplied at direct distributor prices',
        'Central marketing, digital LMS portal & verified certificate generation',
        'Direct dual revenue streams: training tuition fees + hardware kit retail',
        'Continuous operational guidance from EI House central team',
      ],
      icon: Award,
    },
  ];

  const deploymentSteps = [
    {
      step: '01',
      title: 'Site Survey & 3D Lab Blueprint',
      desc: 'Our lab architects inspect your available space, power wiring, ventilation, and ESD flooring to create a tailored 3D workbench floor plan.',
      icon: Compass,
    },
    {
      step: '02',
      title: 'Turnkey Hardware Procurement & Setup',
      desc: 'Every oscilloscope, robotic arm, 3D printer, and component kit is calibrated, bench-tested, and installed by our certified deployment engineers.',
      icon: Wrench,
    },
    {
      step: '03',
      title: 'Faculty Development Program (FDP)',
      desc: 'We conduct a certified 5-day hands-on immersion for your professors and lab assistants, covering troubleshooting, syllabus delivery, and evaluation.',
      icon: Users,
    },
    {
      step: '04',
      title: 'Hackathons, Capstones & Placement Linkages',
      desc: 'We integrate annual hackathons, continuous project review desks, and industry linkages to ensure maximum student placement and patent output.',
      icon: Sparkles,
    },
  ];

  const labWorkstations = [
    {
      station: 'Workstation 01: Embedded Firmware & DSP Bench',
      icon: Cpu,
      items: 'Dual-Channel Digital Storage Oscilloscopes (100MHz), 16-Channel Logic Analyzers, STM32F4/G4 Cortex-M4 Benches, ST-Link V2 Debuggers, Breadboards.',
    },
    {
      station: 'Workstation 02: Autonomous Robotics & Kinematics',
      icon: Bot,
      items: '6-DOF Precision Articulated Robotic Arms with Grippers, ROS 2 SLAM 4WD Rovers with RPLiDAR A1, Mecanum PID Wheels, High-Torque Servo Test Beds.',
    },
    {
      station: 'Workstation 03: Industrial IoT & Telemetry Bay',
      icon: Radio,
      items: 'ESP32-S3 Edge Computing Nodes, SX1262 LoRaWAN Gateways, Multi-Sensor Environmental Arrays (BME680, Gas, Current Clamps), ThingsBoard Telemetry Dashboards.',
    },
    {
      station: 'Workstation 04: Digital Additive Fabrication & SMD Bay',
      icon: Printer,
      items: 'High-Speed CoreXY 3D Printers, Carbon Fiber & PETG Filament Stock, Temperature-Controlled SMD Soldering & Hot-Air Rework Stations, Digital Microscopes.',
    },
  ];

  const faqs = [
    {
      q: 'How does an EI House Innovation Lab help in NAAC and NBA accreditation?',
      a: 'Our labs directly fulfill NAAC Criterion 1 (Curricular Aspects), Criterion 2 (Teaching-Learning & Evaluation), and Criterion 3 (Research, Innovations & Extension). For NBA, our outcome-based student projects and Faculty Development Programs directly boost Outcome-Based Education (OBE) compliance.',
    },
    {
      q: 'What is the typical timeline to set up a college Center of Excellence?',
      a: 'From proposal approval and purchase order to full physical installation, calibration, and faculty training, our standard turnkey deployment takes between 2 to 3 weeks.',
    },
    {
      q: 'Do you provide hardware warranty and annual maintenance (AMC)?',
      a: 'Yes. All heavy bench instruments (oscilloscopes, 3D printers, robotic arms) include a comprehensive 1-year replacement warranty, with optional extended AMC and continuous component replenishment.',
    },
    {
      q: 'Can the curriculum be customized according to our autonomous university syllabus?',
      a: 'Absolutely. We map the lab experiments and student exercises directly to your university board of studies syllabus, semester requirements, and credit framework.',
    },
    {
      q: 'What are the space and electrical requirements for a 30-student lab batch?',
      a: 'A standard 30-student college lab requires approximately 800 to 1,200 sq. ft. of space with single-phase 230V AC stabilized power points at each workbench and proper ventilation for 3D printers and soldering.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />

      <main className="flex-1">
        {/* 01. Hero with Innovation Lab Animation */}
        <section className="relative overflow-hidden border-b border-slate-200 bg-white py-14 sm:py-20">
          <FranchiseLabAnimation />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#172D4D]/10 px-3.5 py-1 text-xs font-semibold text-[#172D4D] border border-amber-500/20 backdrop-blur-xs">
                <Sparkles className="h-3.5 w-3.5 text-[#F59E0B]" />
                <span>EI House Institutional Ecosystem &amp; Centers of Excellence</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              <div className="space-y-3">
                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0B1528] tracking-tight leading-[1.08] text-balance">
                  Empower Your Institution With A World-Class Innovation Lab.
                </h1>
                <p className="text-xl sm:text-2xl font-semibold text-[#172D4D]">
                  Transform Traditional Classrooms Into Active Hardware Development Hubs.
                </p>
              </div>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                We partner with engineering colleges, universities, polytechnics, and schools to establish turnkey Robotics, IoT, and Embedded Innovation Labs. Equip your students with the practical hardware skills demanded by top engineering companies.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button asChild size="lg" className="bg-[#172D4D] hover:bg-[#0B1528] text-white shadow-md">
                  <a href="#models">
                    <span>Explore Partnership Models</span>
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-slate-300 hover:bg-slate-50">
                  <Link href="/contact?subject=College%20Lab%20Partnership%20Proposal">Request Institutional Proposal &amp; BOQ</Link>
                </Button>
                <Button asChild variant="ghost" size="lg" className="text-slate-700 hover:text-[#0B1528]">
                  <a href="#workstations">View Lab Inventory →</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* 02. Institutional Stats & Impact Bar */}
        <section className="py-8 border-b border-slate-200 bg-slate-50/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#0B1528] block">{item.value}</span>
                  <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                  <p className="text-[11px] text-[#F59E0B] font-mono font-medium">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 03. Partnership Models (3 Tiered Packages) */}
        <section id="models" className="py-16 sm:py-20 border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                Institutional Collaboration Paths
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0B1528]">
                Tailored Innovation Hubs Designed For Academic Excellence
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                Whether you are an engineering college aiming for NAAC/NBA A++ ranking, a premier school establishing a STEM tinkering lab, or an entrepreneur launching a tech center, we have a turnkey solution.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {models.map((m, idx) => {
                const IconComponent = m.icon;
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border p-7 flex flex-col justify-between space-y-6 transition-all duration-300 relative ${
                      m.popular
                        ? 'border-blue-500 bg-gradient-to-b from-blue-50/30 via-white to-white shadow-lg ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    {m.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#172D4D] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
                        Most Requested By Colleges
                      </div>
                    )}

                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#F59E0B] uppercase tracking-wider">
                          {m.badge}
                        </span>
                        <div className="h-11 w-11 rounded-xl bg-[#172D4D]/10 flex items-center justify-center text-[#172D4D]">
                          <IconComponent className="h-6 w-6" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h3 className="font-display text-2xl font-bold text-[#0B1528] leading-tight">{m.title}</h3>
                        <p className="text-xs font-semibold text-slate-500">{m.target}</p>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">{m.desc}</p>

                      {/* Equipment highlights */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                          Included Hardware &amp; Instruments:
                        </p>
                        <p className="text-xs text-slate-700 font-medium leading-relaxed">{m.equipment}</p>
                      </div>

                      {/* Curriculum highlights */}
                      <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 space-y-1">
                        <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800">
                          Curriculum &amp; Practical Modules:
                        </p>
                        <p className="text-xs text-amber-950 font-medium leading-relaxed">{m.curriculum}</p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Key Deliverables:
                        </p>
                        <ul className="space-y-1.5 text-xs text-slate-600">
                          {m.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-[#F59E0B] shrink-0 mt-0.5" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <Button
                        asChild
                        size="sm"
                        className={`w-full py-2.5 font-semibold text-xs shadow-xs ${
                          m.popular
                            ? 'bg-[#172D4D] hover:bg-[#0B1528] text-white'
                            : 'bg-white hover:bg-slate-50 text-[#172D4D] border border-slate-300'
                        }`}
                      >
                        <Link href={`/contact?subject=Proposal%20for%20${encodeURIComponent(m.title)}`}>
                          <span>Request Institutional Proposal &amp; BOQ</span>
                          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 04. Turnkey 4-Step Deployment Roadmap */}
        <section className="py-16 sm:py-20 border-b border-slate-200 bg-[#FAFBFD]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                Seamless Execution
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0B1528]">
                From Empty Room To Operating Innovation Lab In 3 Weeks
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                We handle the complete physical, technical, and curricular setup so your faculty can focus on teaching.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {deploymentSteps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl border border-slate-200 bg-white space-y-4 hover:border-blue-400 hover:shadow-md transition-all relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-3xl font-extrabold text-slate-200">{step.step}</span>
                      <div className="h-10 w-10 rounded-xl bg-[#172D4D]/10 text-[#172D4D] flex items-center justify-center">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="font-display text-lg font-bold text-[#0B1528]">{step.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 05. Standard Lab Workstation Equipment Inventory */}
        <section id="workstations" className="py-16 sm:py-20 border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                  Laboratory Hardware Matrix
                </span>
                <h2 className="font-display text-3xl font-extrabold text-[#0B1528]">
                  Modular Workstations Included In Every Lab
                </h2>
                <p className="text-sm text-slate-600 max-w-2xl">
                  Each workstation is engineered with dedicated test instruments, industrial safety standards, and real-world hardware.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="self-start sm:self-auto text-xs">
                <Link href="/contact?subject=Complete%20Lab%20BOQ%20Catalog">Download Full BOQ Catalog</Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {labWorkstations.map((ws, idx) => {
                const Icon = ws.icon;
                return (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl border border-slate-200 bg-[#FAFBFD] space-y-3 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-[#172D4D] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h4 className="font-display text-base font-bold text-[#0B1528]">{ws.station}</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed pl-13">{ws.items}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 06. Institutional FAQ Accordion */}
        <section className="py-16 sm:py-20 border-b border-slate-200 bg-[#FAFBFD]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                Frequently Asked Questions
              </span>
              <h2 className="font-display text-3xl font-extrabold text-[#0B1528]">
                Institutional Partnership Inquiries
              </h2>
              <p className="text-sm text-slate-600">
                Common questions from Principals, Deans, HODs, and Trustees.
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((f, idx) => (
                <div key={idx} className="p-6 rounded-2xl border border-slate-200 bg-white space-y-2 shadow-2xs">
                  <h4 className="text-base font-bold text-[#0B1528] flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-[#F59E0B] shrink-0" />
                    <span>{f.q}</span>
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed pl-6">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 07. Executive Consultation Scheduling Banner */}
        <section className="py-16 sm:py-20 bg-gradient-to-br from-[#172D4D] via-[#0B1528] to-[#172D4D] text-white">
          <div className="mx-auto max-w-4xl px-4 text-center space-y-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[#F59E0B] bg-white/10 px-3.5 py-1 rounded-full">
              <Award className="h-3.5 w-3.5" />
              Direct Leadership Engagement
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold leading-tight">
              Schedule An Institutional Strategy Meeting With Our Director
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              We provide customized proposals including equipment specification sheets, laboratory floor layouts,
              syllabus mapping, and budgetary breakdowns for academic council &amp; management approval.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0B1528] font-bold shadow-lg">
                <Link href="/contact?subject=Institutional%20Director%20Meeting">
                  <span>Schedule Lab Consultation</span>
                  <Send className="h-4 w-4 ml-1.5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-white border-slate-600 hover:bg-white/10">
                <Link href="/about">About EI House Leadership →</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
