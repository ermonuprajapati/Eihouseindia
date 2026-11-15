import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Layers,
  Cpu,
  Zap,
  Wrench,
  CheckCircle2,
  ArrowRight,
  Send,
  Building2,
  Sparkles,
} from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { SITE_CONFIG } from '@/config/site';
import { ServicesPcbRoutingAnimation } from '@/components/animations/ServicesPcbRoutingAnimation';

export const metadata: Metadata = {
  title: 'Engineering Services & Turnkey Hardware R&D — EI House',
  description:
    'Professional PCB design, embedded firmware development, rapid 3D prototyping, IoT hardware engineering, and academic lab setup services by EI House India.',
  alternates: { canonical: `${SITE_CONFIG.url}/services` },
};

export default function ServicesPage() {
  const services = [
    {
      title: 'Multi-Layer PCB Design & DFM',
      badge: 'Hardware Engineering',
      desc: 'Schematic capture, high-speed 2 to 6-layer PCB routing, impedance matching, thermal vias, and complete fabrication-ready Gerber/BOM packages using KiCad and Altium Designer.',
      deliverables: ['Schematics & Netlists', 'Fabrication Gerbers & Drill Files', 'Pick & Place Centroid Files', 'Interactive BOM & 3D STEP Models'],
      icon: Layers,
    },
    {
      title: 'Embedded Firmware & RTOS Development',
      badge: 'Firmware & Logic',
      desc: 'Production-grade embedded C/C++ firmware for STM32, ESP32, Nordic nRF, and Microchip MCUs. FreeRTOS task architecture, peripheral drivers, bootloaders, and low-power sleep profiling.',
      deliverables: ['Well-commented C/C++ Source Code', 'Automated Unit Tests & CI Pipeline', 'Hardware Abstraction Layer (HAL)', 'Over-the-Air (OTA) Flash Firmware'],
      icon: Cpu,
    },
    {
      title: 'Rapid 3D Prototyping & Enclosure Design',
      badge: 'Mechanical Engineering',
      desc: 'Parametric 3D CAD modeling, snap-fit PCB enclosures, functional prototypes printed in Carbon-Fiber PETG, ASA, or Nylon, and silicone molding preparation.',
      deliverables: ['CAD Solid Models (.STEP / .IGES)', 'High-Detail Functional Prototypes', 'Dimensional Inspection & Fit Testing', 'Manufacturing DFM Consultation'],
      icon: Wrench,
    },
    {
      title: 'Turnkey IoT & Telemetry Hardware',
      badge: 'Connected Systems',
      desc: 'End-to-end connected hardware solutions combining sensor telemetry, cellular/Wi-Fi/LoRa communication, battery optimization, and cloud ingestion via MQTT/HTTPS.',
      deliverables: ['Custom IoT Sensor Node Hardware', 'Cloud API & Webhook Integration', 'Low-power Battery Lifetime Analysis', 'Field Pilot Unit Deployment'],
      icon: Zap,
    },
    {
      title: 'College STEM & Robotics Innovation Labs',
      badge: 'Institutional Service',
      desc: 'Complete turnkey setup of modern robotics, embedded systems, and IoT laboratories in educational institutions. Includes equipment, workstations, syllabus, and faculty training.',
      deliverables: ['Full Workstation Layout & Bill of Quantities', 'Curriculum & Step-by-Step Lab Manuals', 'Faculty Development Programs (FDP)', 'Official EI House Innovation Center Signage'],
      icon: Building2,
    },
    {
      title: 'Hardware Reverse Engineering & Consulting',
      badge: 'Technical Advisory',
      desc: 'Bill of Materials cost optimization, obsolescence replacement for legacy chips, schematic reconstruction, and regulatory EMC/EMI pre-compliance guidance.',
      deliverables: ['Alternative Component Equivalents', 'EMC Noise Mitigation Strategy', 'Unit Production Cost Reductions', 'Comprehensive Engineering Audit Report'],
      icon: Sparkles,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-slate-200 bg-white py-14 sm:py-20">
          <ServicesPcbRoutingAnimation />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl space-y-5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                EI House Engineering & Turnkey R&D
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0B1528] tracking-tight leading-[1.1]">
                From Concept Ideation To Working Hardware.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Whether you need a custom multi-layer PCB, embedded firmware for high-reliability controllers,
                functional 3D printed enclosures, or a complete college robotics lab, EI House delivers dependable
                engineering solutions.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild size="lg" className="bg-[#172D4D] hover:bg-[#0B1528] text-white">
                  <a href="#services-list">
                    <span>Explore Our Services</span>
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/contact?subject=Engineering%20Service%20Quote">Request a Project Quote</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Services Listing */}
        <section id="services-list" className="py-16 sm:py-20 border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                Core Competencies
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1528]">
                Professional Engineering Capabilities
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                Backed by physical bench test equipment, calibrated instruments, and experienced hardware engineers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((s, idx) => {
                const IconComponent = s.icon;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 sm:p-7 flex flex-col justify-between space-y-6 hover:shadow-lg transition-all"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#F59E0B] uppercase tracking-wider">
                          {s.badge}
                        </span>
                        <div className="h-9 w-9 rounded-lg bg-[#172D4D]/10 flex items-center justify-center text-[#172D4D]">
                          <IconComponent className="h-4 w-4" />
                        </div>
                      </div>

                      <h3 className="font-display text-xl font-bold text-[#0B1528]">
                        {s.title}
                      </h3>

                      <p className="text-sm text-slate-600 leading-relaxed">
                        {s.desc}
                      </p>

                      <div className="space-y-2 pt-3 border-t border-slate-200">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Deliverables:</p>
                        <ul className="space-y-1 text-xs text-slate-600">
                          {s.deliverables.map((d, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#F59E0B] shrink-0" />
                              <span>{d}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200">
                      <Button asChild size="sm" variant="outline" className="w-full text-xs">
                        <Link href={`/contact?subject=Service%20Quote%20for%20${encodeURIComponent(s.title)}`}>
                          <span>Get Free Estimate & Feasibility</span>
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

        {/* Workflow & Guarantee */}
        <section className="py-16 bg-[#172D4D] text-white">
          <div className="mx-auto max-w-5xl px-4 text-center space-y-8">
            <div className="space-y-3">
              <span className="text-xs font-mono uppercase tracking-widest text-[#F59E0B]">
                How We Deliver
              </span>
              <h3 className="font-display text-2xl sm:text-3xl font-bold">
                Transparent Engineering Workflow
              </h3>
              <p className="text-slate-300 text-sm max-w-2xl mx-auto">
                No hidden costs or unverified handoffs. Every stage includes design reviews and physical testing.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-left">
              <div className="p-5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                <span className="text-xs font-mono text-[#F59E0B] font-bold">01. SCOPING</span>
                <p className="text-sm font-bold text-white">Feasibility & Architecture</p>
                <p className="text-xs text-slate-400">Review specs, select silicon, and define pinout & power budgets.</p>
              </div>
              <div className="p-5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                <span className="text-xs font-mono text-[#F59E0B] font-bold">02. DESIGN</span>
                <p className="text-sm font-bold text-white">Schematic & CAD Routing</p>
                <p className="text-xs text-slate-400">Detailed schematic drafting, multi-layer routing, and 3D enclosure check.</p>
              </div>
              <div className="p-5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                <span className="text-xs font-mono text-[#F59E0B] font-bold">03. PROTOTYPE</span>
                <p className="text-sm font-bold text-white">Fabrication & Assembly</p>
                <p className="text-xs text-slate-400">Physical PCB assembly, component soldering, and test bench bring-up.</p>
              </div>
              <div className="p-5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                <span className="text-xs font-mono text-[#F59E0B] font-bold">04. VALIDATE</span>
                <p className="text-sm font-bold text-white">Testing & Delivery</p>
                <p className="text-xs text-slate-400">Firmware flashing, thermal & logic analysis, and complete source handover.</p>
              </div>
            </div>

            <div className="pt-4">
              <Button asChild size="lg" className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0B1528] font-bold">
                <Link href="/contact?subject=New%20Service%20Project%20Inquiry">
                  <span>Start Your Engineering Project</span>
                  <Send className="h-4 w-4 ml-1.5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
