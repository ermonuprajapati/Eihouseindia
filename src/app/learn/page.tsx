import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  Clock,
  Award,
  Layers,
  CheckCircle2,
  Cpu,
  Bot,
  Zap,
  ArrowRight,
  Send,
} from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { SITE_CONFIG } from '@/config/site';

export const metadata: Metadata = {
  title: 'Engineering & STEM Education — Learn with EI House',
  description:
    'Structured 45-day practical training programs, hands-on workshops, and certifications in Embedded Systems, IoT, Robotics, PCB Design, and Industrial Automation.',
  alternates: { canonical: `${SITE_CONFIG.url}/learn` },
};

export default function LearnPage() {
  const courses = [
    {
      id: 'embedded-systems-stm32-esp32',
      title: 'Advanced Embedded Systems & Firmware Development',
      badge: 'Flagship 45-Day Program',
      duration: '45 Days / 90 Hours',
      level: 'Beginner to Advanced',
      image: '/images/learn/embedded-systems-dev.jpg',
      modes: ['Online Live Sessions', 'Offline Hands-on Lab'],
      description:
        'Master ARM Cortex-M architecture, STM32 registers, HAL drivers, FreeRTOS multi-threading, and ESP32 dual-core programming with real hardware debugging.',
      highlights: [
        'STM32F4 / ESP32 development hardware included',
        'Bare-metal C and RTOS task scheduling',
        'Hardware protocols: I2C, SPI, UART, CAN, DMA',
        'Live bench debugging with logic analyzers',
      ],
      icon: Cpu,
    },
    {
      id: 'iot-cloud-automation',
      title: 'Industrial Internet of Things (IoT) & Cloud Solutions',
      badge: 'Popular Training',
      duration: '45 Days / 80 Hours',
      level: 'Intermediate',
      modes: ['Online', 'Offline Lab'],
      description:
        'Architect end-to-end IoT sensor nodes, secure MQTT communication, AWS IoT Core / Firebase telemetry pipelines, and real-time dashboard visualization.',
      highlights: [
        'Wi-Fi, BLE, and LoRaWAN long-range telemetry',
        'Security: TLS certificate authentication on MCUs',
        'OTA (Over-The-Air) remote firmware updates',
        'Production edge-to-cloud hardware project',
      ],
      icon: Zap,
    },
    {
      id: 'robotics-ros2-autonomous',
      title: 'Robotics Engineering & Autonomous Systems',
      badge: 'Hands-on Hardware',
      duration: '45 Days / 90 Hours',
      level: 'All Levels',
      modes: ['Offline Lab Focused'],
      description:
        'Build multi-axis robotic arms, mobile rover kinematics, motor drivers, PID speed control, LiDAR mapping, and ROS 2 simulation & node development.',
      highlights: [
        'Custom 4WD rover and 6-DOF arm assembly',
        'Motor control: PWM, encoders, stepper drivers',
        'LiDAR integration & obstacle avoidance',
        'Comprehensive capstone robotics build',
      ],
      icon: Bot,
    },
    {
      id: 'pcb-design-fabrication',
      title: 'Professional Multi-Layer PCB Design & DFM',
      badge: 'Industry Essential',
      duration: '30 Days / 60 Hours',
      level: 'Beginner to Industry',
      modes: ['Online & Workshop'],
      description:
        'From schematic capture in KiCad / Altium to 4-layer high-speed differential routing, impedance matching, power plane decoupling, and fabrication Gerber generation.',
      highlights: [
        'Schematic design and component footprint creation',
        'Signal integrity, return paths, and EMC basics',
        'Bill of Materials (BOM) & fabrication outputs',
        'Students manufacture their own physical PCB',
      ],
      icon: Layers,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-slate-200 bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7 space-y-5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                  EI House Education & STEM Platform
                </span>
                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0B1528] tracking-tight leading-[1.1]">
                  Master Real Engineering On The Bench.
                </h1>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                  We believe engineering cannot be learned through slides alone. Our structured practical training,
                  hardware kits, and offline lab environments give you the skills needed to design, build, and debug
                  real-world technology.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button asChild size="lg" className="bg-[#172D4D] hover:bg-[#0B1528] text-white">
                    <a href="#courses">
                      <span>View Courses</span>
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/contact?subject=Course%20Enrollment%20Inquiry">Enrollment Inquiry</Link>
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-xl bg-slate-900">
                  <Image
                    src="/images/learn/learn-hero.jpg"
                    alt="Learn — Complete education platform at EI House"
                    width={1536}
                    height={1024}
                    priority
                    className="aspect-[4/3] w-full object-cover hover:scale-103 transition-transform duration-500"
                  />
                  <div className="p-3.5 bg-[#172D4D] text-white flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#F59E0B]">EI House Learning Platform</span>
                    <span className="text-slate-300">Hands-on Laboratory</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The 45-Day Training Model Features */}
        <section className="py-12 border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200">
                <div className="h-10 w-10 rounded-lg bg-[#172D4D]/10 flex items-center justify-center text-[#172D4D] shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-[#0B1528] text-sm">Flexible 45-Day Model</h4>
                  <p className="text-xs text-slate-600 mt-1">Morning and evening batches with comprehensive curriculum and weekend lab options.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200">
                <div className="h-10 w-10 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B] shrink-0">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-[#0B1528] text-sm">Verified Certification</h4>
                  <p className="text-xs text-slate-600 mt-1">Earn an industry-recognized certificate backed by project evaluation and code review.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200">
                <div className="h-10 w-10 rounded-lg bg-[#172D4D]/10 flex items-center justify-center text-[#172D4D] shrink-0">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-[#0B1528] text-sm">Hardware Kits Included</h4>
                  <p className="text-xs text-slate-600 mt-1">Students receive real development boards, sensors, and cables to keep and build with.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Courses Listing */}
        <section id="courses" className="py-16 sm:py-20 border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                Curriculum
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1528]">
                Featured Practical Courses
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                Designed for engineers, diploma holders, STEM students, and technology enthusiasts seeking real bench skills.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {courses.map((course) => {
                const IconComponent = course.icon;
                return (
                  <div
                    key={course.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 sm:p-8 flex flex-col justify-between space-y-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full bg-[#172D4D]/10 text-[#172D4D] text-xs font-bold px-3 py-1">
                          {course.badge}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">{course.duration}</span>
                      </div>

                      {course.image && (
                        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                          <Image
                            src={course.image}
                            alt={course.title}
                            width={690}
                            height={517}
                            className="aspect-[16/9] w-full object-cover hover:scale-103 transition-transform duration-300"
                          />
                        </div>
                      )}

                      <div className="flex items-start gap-3.5">
                        <div className="h-11 w-11 rounded-xl bg-[#172D4D] text-white flex items-center justify-center shrink-0">
                          <IconComponent className="h-5 w-5 text-[#F59E0B]" />
                        </div>
                        <div>
                          <h3 className="font-display text-xl font-bold text-[#0B1528]">{course.title}</h3>
                          <p className="text-xs text-[#F59E0B] font-semibold mt-0.5">Level: {course.level}</p>
                        </div>
                      </div>

                      <p className="text-sm text-slate-600 leading-relaxed">{course.description}</p>

                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-700">What You Build & Master:</p>
                        <ul className="space-y-1.5 text-xs sm:text-sm text-slate-600">
                          {course.highlights.map((h, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-[#F59E0B] shrink-0 mt-0.5" />
                              <span>{h}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-1.5">
                        {course.modes.map((m, idx) => (
                          <span key={idx} className="text-[11px] font-medium bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-700">
                            {m}
                          </span>
                        ))}
                      </div>
                      <Button asChild size="sm" className="bg-[#172D4D] hover:bg-[#0B1528] text-white">
                        <Link href={`/contact?subject=Inquiry%20for%20${encodeURIComponent(course.title)}`}>
                          <span>Enquire & Syllabus</span>
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

        {/* Enrollment & Inquiries CTA */}
        <section className="py-16 sm:py-20 bg-slate-900 text-white">
          <div className="mx-auto max-w-4xl px-4 text-center space-y-6">
            <span className="text-xs font-mono uppercase tracking-widest text-[#F59E0B]">
              Ready to level up your engineering skills?
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold">
              Join The Next Hands-on Batch at EI House
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              We offer personalized batch timings, college group discounts, and dedicated project mentoring.
              Speak with our training coordinator to review syllabus details and hardware kit options.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0B1528] font-bold">
                <Link href="/contact?subject=Batch%20Enrollment">
                  <span>Speak With An Advisor</span>
                  <Send className="h-4 w-4 ml-1.5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-white border-slate-700 hover:bg-slate-800">
                <Link href="/about">Learn About EI House</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
