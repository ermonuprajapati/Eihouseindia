import type { Metadata } from 'next';
import Link from 'next/link';
import {
  MessageSquare,
  Sparkles,
  PenLine,
  Calendar,
} from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { SITE_CONFIG } from '@/config/site';

export const metadata: Metadata = {
  title: 'Engineering Community & Network — EI House India',
  description:
    'Join the EI House technology network. Connect with engineers, discuss debugging challenges, showcase hardware prototypes, publish technical articles, and attend events.',
  alternates: { canonical: `${SITE_CONFIG.url}/community` },
};

export default function CommunityPage() {
  const groups = [
    { name: 'Embedded Systems & Firmware', members: '1.4k members', desc: 'STM32, FreeRTOS, bare-metal C, and MCU peripheral debugging.' },
    { name: 'Robotics & Autonomous Systems', members: '980 members', desc: 'ROS 2, kinematics, motor drivers, PID tuning, and LiDAR.' },
    { name: 'IoT & Telemetry Engineering', members: '1.1k members', desc: 'ESP32, LoRaWAN, MQTT pipelines, and edge sensor nodes.' },
    { name: 'PCB Design & Hardware Fabrication', members: '850 members', desc: 'KiCad, Altium, high-speed routing, and DFM optimization.' },
    { name: '3D Printing & Additive Prototyping', members: '720 members', desc: 'Filaments, slicer settings, mechanical CAD, and functional prints.' },
    { name: 'Final-Year Project Collaborators', members: '1.8k members', desc: 'Students sharing academic schematics, reports, and component ideas.' },
  ];

  const recentDiscussions = [
    {
      title: 'Troubleshooting SPI DMA Buffer Desync on STM32F4 with Fast ADC',
      category: 'Embedded Systems',
      author: 'Vikram Patel',
      replies: 14,
      time: '2 hours ago',
    },
    {
      title: 'Best Low-Noise LDO regulator for 24-bit ADC analog front-end?',
      category: 'PCB Design',
      author: 'Sneha R.',
      replies: 9,
      time: '5 hours ago',
    },
    {
      title: 'Overcoming LoRa SX1262 Range Issues in Dense Industrial Steel Sheds',
      category: 'IoT & Telemetry',
      author: 'Amitabh Sen',
      replies: 21,
      time: '1 day ago',
    },
    {
      title: 'Mecanum wheel PID tuning tips for smooth rotational movements in ROS 2',
      category: 'Robotics',
      author: 'Rohit K.',
      replies: 18,
      time: '2 days ago',
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
                EI House Collaborative Network
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0B1528] tracking-tight leading-[1.1]">
                Where Engineers Connect, Collaborate & Build.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Connect with passionate builders, students, mentors, and industry practitioners. Share your hardware
                builds, solve stubborn bench bugs, write peer-reviewed technical articles, and grow together.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild size="lg" className="bg-[#172D4D] hover:bg-[#0B1528] text-white">
                  <Link href="/dashboard/editor">
                    <PenLine className="h-4 w-4 mr-2" />
                    <span>Write An Article</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/auth/register">Create Free Account</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Community Pillars */}
        <section className="py-16 sm:py-20 border-b border-slate-200 bg-slate-50/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Groups & Topics */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="font-display text-2xl font-bold text-[#0B1528]">
                    Active Engineering Groups
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Focused domain channels for practical advice, code reviews, and hardware suggestions.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {groups.map((g, idx) => (
                    <div key={idx} className="p-5 rounded-xl border border-slate-200 bg-white space-y-2 hover:shadow-sm">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-[#0B1528] text-sm">{g.name}</h4>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{g.desc}</p>
                      <p className="text-[11px] font-semibold text-[#F59E0B] pt-1">{g.members}</p>
                    </div>
                  ))}
                </div>

                {/* Discussions stream preview */}
                <div className="pt-6 space-y-4">
                  <h3 className="font-display text-xl font-bold text-[#0B1528]">
                    Trending Technical Discussions
                  </h3>
                  <div className="space-y-3">
                    {recentDiscussions.map((d, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-[#172D4D] bg-[#172D4D]/10 px-2 py-0.5 rounded">
                            {d.category}
                          </span>
                          <h4 className="text-sm font-bold text-[#0B1528] pt-1 hover:text-[#172D4D] cursor-pointer">
                            {d.title}
                          </h4>
                          <p className="text-xs text-slate-500">By {d.author} · {d.time}</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>{d.replies} replies</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar: Guidelines & Events */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
                  <h3 className="font-display text-lg font-bold text-[#0B1528] flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#F59E0B]" />
                    <span>Become A Contributor</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Have you designed a circuit, solved a tricky embedded bug, or created an innovative open-source project?
                    Publish it on EI House to reach thousands of engineers.
                  </p>
                  <Button asChild size="sm" className="w-full bg-[#172D4D] hover:bg-[#0B1528] text-white">
                    <Link href="/dashboard/editor">Submit A Guide</Link>
                  </Button>
                  <Link href="/community-guidelines" className="block text-center text-xs text-slate-500 hover:underline">
                    Read Editorial Guidelines →
                  </Link>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
                  <h3 className="font-display text-base font-bold text-[#0B1528] flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#172D4D]" />
                    <span>Upcoming Tech Meetups</span>
                  </h3>
                  <div className="text-xs space-y-2 text-slate-600">
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
                      <p className="font-bold text-[#0B1528]">STM32 vs ESP32: Choosing the Right MCU</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">Online Webinar · Saturday, 4:00 PM IST</p>
                    </div>
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-100">
                      <p className="font-bold text-[#0B1528]">Hands-On KiCad 4-Layer PCB Routing</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">Live Workshop · Next Saturday</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
