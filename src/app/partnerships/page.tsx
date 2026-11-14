import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Building2,
  GraduationCap,
  Award,
  CheckCircle2,
  ArrowRight,
  Send,
} from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { SITE_CONFIG } from '@/config/site';

export const metadata: Metadata = {
  title: 'Institutional Partnerships & Franchise Innovation Labs — EI House',
  description:
    'Partner with Engineering Innovation House to establish state-of-the-art Robotics, IoT, and STEM Innovation Labs in your college, university, or school.',
  alternates: { canonical: `${SITE_CONFIG.url}/partnerships` },
};

export default function PartnershipsPage() {
  const models = [
    {
      title: 'College Robotics & IoT Center of Excellence',
      target: 'Engineering Colleges & Polytechnics',
      badge: 'Higher Education',
      desc: 'A complete institutional laboratory equipped with modern STM32 & ESP32 bench equipment, robotic arms, sensor suites, 3D printers, and test instruments.',
      features: [
        'Curriculum aligned with industry hiring requirements',
        'Faculty Development Programs (FDP) & Trainer certification',
        'Student semester capstone project mentorship',
        'Annual college hackathons & technical workshops',
      ],
      icon: Building2,
    },
    {
      title: 'School STEM & Tinkering Innovation Lab',
      target: 'K-12 Schools & STEM Academies',
      badge: 'School Education',
      desc: 'Hands-on experiential learning kits covering electronics fundamentals, block coding, Arduino robotics, and creative 3D printing designed for young innovators.',
      features: [
        'Age-appropriate modular learning modules',
        'Safety-certified electronic kits & tools',
        'Structured lesson plans for class 6th to 12th',
        'Participation in national robotics competitions',
      ],
      icon: GraduationCap,
    },
    {
      title: 'EI House Franchise & Regional Learning Center',
      target: 'Entrepreneurs, Trainers & Tech Centers',
      badge: 'Franchise Model',
      desc: 'Operate an authorized EI House technical training and prototyping center in your city under our established brand name, course catalog, and hardware supply chain.',
      features: [
        'Exclusive geographical territory rights',
        'Branded kits, components & course materials supplied',
        'Central marketing, digital platform & certificate support',
        'Direct revenue sharing on courses and hardware sales',
      ],
      icon: Award,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-slate-200 bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                EI House Institutional Ecosystem
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0B1528] tracking-tight leading-[1.1]">
                Empower Your Institution With A World-Class Innovation Lab.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Transform traditional classrooms into active hardware development hubs. We partner with colleges,
                universities, polytechnics, and schools to establish turnkey Robotics, IoT, and Embedded Innovation Labs.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild size="lg" className="bg-[#172D4D] hover:bg-[#0B1528] text-white">
                  <a href="#models">
                    <span>Explore Partnership Models</span>
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/contact?subject=College%20Lab%20Partnership%20Proposal">Request Institutional Proposal</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Partnership Models */}
        <section id="models" className="py-16 sm:py-20 border-b border-slate-200 bg-slate-50/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                Collaboration Paths
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1528]">
                How We Partner With You
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                Tailored setups designed for institutional budgets, accreditation standards (NAAC/NBA), and student employability.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {models.map((m, idx) => {
                const IconComponent = m.icon;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200 bg-white p-7 flex flex-col justify-between space-y-6 hover:shadow-lg transition-all"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#F59E0B] uppercase tracking-wider">
                          {m.badge}
                        </span>
                        <div className="h-10 w-10 rounded-lg bg-[#172D4D]/10 flex items-center justify-center text-[#172D4D]">
                          <IconComponent className="h-5 w-5" />
                        </div>
                      </div>

                      <div>
                        <h3 className="font-display text-xl font-bold text-[#0B1528]">{m.title}</h3>
                        <p className="text-xs font-semibold text-slate-500 mt-1">{m.target}</p>
                      </div>

                      <p className="text-sm text-slate-600 leading-relaxed">{m.desc}</p>

                      <div className="space-y-2 pt-3 border-t border-slate-100">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Key Deliverables:</p>
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
                      <Button asChild size="sm" className="w-full bg-[#172D4D] hover:bg-[#0B1528] text-white">
                        <Link href={`/contact?subject=Proposal%20for%20${encodeURIComponent(m.title)}`}>
                          <span>Request Proposal & BOQ</span>
                          <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Institutional Inquiries Banner */}
        <section className="py-16 bg-[#172D4D] text-white">
          <div className="mx-auto max-w-4xl px-4 text-center space-y-6">
            <span className="text-xs font-mono uppercase tracking-widest text-[#F59E0B]">
              Let&apos;s Build The Next Generation of Engineers
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold">
              Schedule A Consultation With Our Lab Director
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              We provide customized proposals including equipment specification sheets, laboratory floor layouts,
              syllabus mapping, and budgetary breakdowns for academic approval.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0B1528] font-bold">
                <Link href="/contact?subject=Institutional%20Director%20Meeting">
                  <span>Schedule Consultation</span>
                  <Send className="h-4 w-4 ml-1.5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-white border-slate-700 hover:bg-slate-800">
                <Link href="/about">About EI House</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
