import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  FileText,
} from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { SITE_CONFIG } from '@/config/site';

export const metadata: Metadata = {
  title: 'Engineering Projects Hub — Practical Hardware & Research',
  description:
    'Explore verified engineering projects, schematics, source code, final-year project reports, and documentation across Embedded Systems, IoT, Robotics, and Electronics.',
  alternates: { canonical: `${SITE_CONFIG.url}/projects` },
};

export default function ProjectsPage() {
  const categories = [
    { name: 'All Domains', count: 48 },
    { name: 'Embedded Systems', count: 18 },
    { name: 'IoT & Telemetry', count: 14 },
    { name: 'Robotics & Automation', count: 12 },
    { name: 'Power Electronics & PCB', count: 9 },
    { name: 'Final-Year Projects', count: 22 },
  ];

  const featuredProjects = [
    {
      title: 'Autonomous Multi-Sensor Warehouse Rover with ROS 2 & LiDAR',
      category: 'Robotics & Automation',
      hardware: ['Raspberry Pi 4', 'RPLiDAR A1', 'STM32 Motor Driver', '4WD Chassis'],
      summary:
        'A functional indoor SLAM navigation robot with 2D occupancy grid mapping, dynamic obstacle avoidance, and ROS 2 Nav2 stack integration.',
      reportAvailable: true,
      codeAvailable: true,
      level: 'Advanced',
    },
    {
      title: 'Industrial LoRaWAN Multi-Node Environmental Telemetry Station',
      category: 'IoT & Telemetry',
      hardware: ['ESP32-S3', 'SX1262 LoRa', 'BME680 Sensor', 'Solar MPPT Charger'],
      summary:
        'Long-range 15km wireless agricultural sensing node featuring ultra-low-power deep sleep cycles, encrypted packet transmission, and ThingsBoard visualization.',
      reportAvailable: true,
      codeAvailable: true,
      level: 'Intermediate',
    },
    {
      title: 'GaN-Based 48V to 12V 500W Synchronous Buck Converter with Digital Control',
      category: 'Power Electronics & PCB',
      hardware: ['STM32G474 HRTIM', 'EPC GaN FETs', 'Custom 4-Layer PCB'],
      summary:
        'High-efficiency (98.2%) power converter operating at 500kHz with digital peak current-mode control, active thermal management, and full KiCad design files.',
      reportAvailable: true,
      codeAvailable: true,
      level: 'Expert / Research',
    },
    {
      title: 'Smart Home Automation Controller with Matter & Offline Voice Recognition',
      category: 'Embedded Systems',
      hardware: ['ESP32-S3 Voice', '4-Channel Solid State Relays', 'OLED Display'],
      summary:
        'Offline speech command processing with zero cloud reliance, local web server configuration, and seamless Apple Home & Google Home Matter bridge.',
      reportAvailable: true,
      codeAvailable: true,
      level: 'Intermediate',
    },
    {
      title: '6-Axis Desktop Robotic Arm with Inverse Kinematics & Gripper Control',
      category: 'Robotics & Automation',
      hardware: ['MG996R Servos', 'PCA9685 I2C Driver', 'Arduino Mega', '3D Printed Frame'],
      summary:
        'Precision pick-and-place manipulator supporting trajectory planning, teach-and-repeat mode, and Python desktop GUI over serial interface.',
      reportAvailable: true,
      codeAvailable: true,
      level: 'Academic / Capstone',
    },
    {
      title: 'Contactless ECG & Heart Rate Monitor with BLE Telemetry',
      category: 'Biomedical & Sensors',
      hardware: ['nRF52840 BLE SoC', 'ADS1292R Analog Front-End', 'Dry Electrodes'],
      summary:
        'Wearable low-power vital sign monitor with real-time waveform streaming to an Android Flutter application and automated QRS detection.',
      reportAvailable: true,
      codeAvailable: true,
      level: 'Final-Year Project',
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
                EI House Practical Engineering Repository
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0B1528] tracking-tight leading-[1.1]">
                Engineering Projects & Prototypes
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Step-by-step schematics, source code repositories, Bill of Materials, and comprehensive
                project reports. Designed to guide students through final-year submissions and empower engineers
                building functional hardware.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild size="lg" className="bg-[#172D4D] hover:bg-[#0B1528] text-white">
                  <a href="#projects-list">
                    <span>Explore Project Library</span>
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/contact?subject=Custom%20Project%20Enquiry">Request Custom Project Guidance</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Bar */}
        <section className="border-b border-slate-200 bg-slate-50 py-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {categories.map((cat, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`text-xs font-medium px-3.5 py-1.5 rounded-full border whitespace-nowrap transition-colors ${
                    idx === 0
                      ? 'bg-[#172D4D] text-white border-[#172D4D]'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {cat.name} ({cat.count})
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Projects Grid */}
        <section id="projects-list" className="py-16 sm:py-20 border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1528]">
                  Verified Hardware Projects
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Tested and verified on physical hardware by EI House engineering mentors.
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/editor">Submit Your Project</Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProjects.map((p, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 flex flex-col justify-between space-y-5 hover:shadow-md transition-shadow"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#F59E0B] uppercase tracking-wider">
                        {p.category}
                      </span>
                      <span className="text-[10px] font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">
                        {p.level}
                      </span>
                    </div>

                    <h3 className="font-display text-lg font-bold text-[#0B1528] leading-snug">
                      {p.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {p.summary}
                    </p>

                    <div className="pt-2 border-t border-slate-200 space-y-1.5">
                      <p className="text-[11px] font-bold uppercase text-slate-500">Key Silicon & Hardware:</p>
                      <div className="flex flex-wrap gap-1">
                        {p.hardware.map((hw, i) => (
                          <span key={i} className="text-[11px] bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded">
                            {hw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-500">
                      <FileText className="h-3.5 w-3.5 text-[#172D4D]" />
                      <span>Report + Schematics</span>
                    </div>
                    <Button asChild size="sm" variant="outline" className="text-xs">
                      <Link href={`/contact?subject=Project%20Docs%20for%20${encodeURIComponent(p.title)}`}>
                        <span>Get Report</span>
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Academic Final-Year Project Support Banner */}
        <section className="py-16 bg-[#172D4D] text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-3">
                <span className="text-xs font-mono uppercase tracking-widest text-[#F59E0B]">
                  For Diploma, B.Tech & M.Tech Students
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-bold">
                  Need Help With Your Final-Year Major Project?
                </h3>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                  EI House provides complete technical guidance, component kits, circuit fabrication,
                  firmware mentoring, IEEE paper references, and formal project documentation support.
                </p>
              </div>
              <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3">
                <Button asChild size="lg" className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0B1528] font-bold">
                  <Link href="/contact?subject=Final%20Year%20Project%20Guidance">
                    <span>Request Project Guidance</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-white border-slate-700 hover:bg-slate-800">
                  <Link href="/learn">Explore Related Courses</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
