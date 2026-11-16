import type { Metadata } from 'next';
import Link from 'next/link';
import {
  MessageSquare,
  Sparkles,
  PenLine,
  Calendar,
  Cpu,
  Bot,
  Radio,
  Layers,
  Printer,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  ThumbsUp,
  Eye,
  Award,
  MessageCircle,
  ExternalLink,
  Code,
  Flame,
} from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { SITE_CONFIG } from '@/config/site';
import { CommunityNetworkAnimation } from '@/components/animations/CommunityNetworkAnimation';

export const metadata: Metadata = {
  title: 'Engineering Community & Network — EI House India',
  description:
    'Join the EI House technology network. Connect with engineers, discuss debugging challenges, showcase hardware prototypes, publish technical articles, and attend events.',
  alternates: { canonical: `${SITE_CONFIG.url}/community` },
};

export default function CommunityPage() {
  const stats = [
    { label: 'Active Hardware Engineers', value: '4,850+', change: 'Pan-India Network' },
    { label: 'College Maker Chapters', value: '28+', change: 'Across 14 States' },
    { label: 'Verified Hardware Articles', value: '180+', change: 'Peer-Reviewed' },
    { label: 'Bench Debug Resolution', value: '98.4%', change: 'Avg < 3h Response' },
  ];

  const groups = [
    {
      name: 'Embedded Systems & Firmware',
      icon: Cpu,
      members: '1.4k members',
      topics: 'STM32 · FreeRTOS · Bare-metal C · Register Level · DMA',
      desc: 'Deep firmware debugging, clock tree configuration, ISR latency, and driver development.',
      accent: 'border-blue-500/30 text-blue-600 bg-blue-50/50',
    },
    {
      name: 'Robotics & Autonomous Systems',
      icon: Bot,
      members: '980 members',
      topics: 'ROS 2 · Kinematics · Motor Drivers · PID Tuning · LiDAR',
      desc: 'Mobile rovers, inverse kinematics, robot arms, SLAM navigation, and motor control circuits.',
      accent: 'border-amber-500/30 text-amber-600 bg-amber-50/50',
    },
    {
      name: 'IoT & Telemetry Engineering',
      icon: Radio,
      members: '1.1k members',
      topics: 'ESP32 · LoRaWAN · MQTT · Edge Nodes · Power Saving',
      desc: 'Long-range field telemetry, deep-sleep optimizations, cloud pipelines, and antenna tuning.',
      accent: 'border-emerald-500/30 text-emerald-600 bg-emerald-50/50',
    },
    {
      name: 'PCB Design & Signal Integrity',
      icon: Layers,
      members: '850 members',
      topics: 'KiCad 8 · Altium · 4-Layer Stackup · 90Ω Diff Pairs · DFM',
      desc: 'High-speed routing, ground plane stitching, thermal dissipation, and fab manufacturing review.',
      accent: 'border-indigo-500/30 text-indigo-600 bg-indigo-50/50',
    },
    {
      name: '3D Printing & Additive Fabrication',
      icon: Printer,
      members: '720 members',
      topics: 'CoreXY · PETG/Carbon Fiber · Slicer Profiles · CAD Tolerance',
      desc: 'Structural enclosures, mechanical gears, tolerances, and additive manufacturing optimization.',
      accent: 'border-purple-500/30 text-purple-600 bg-purple-50/50',
    },
    {
      name: 'Final-Year Project Collaborators',
      icon: GraduationCap,
      members: '1.8k members',
      topics: 'Capstone Schematics · BOM · Code Repos · Project Reports',
      desc: 'Mentorship and component sourcing for B.Tech, Diploma, and M.Tech major project submissions.',
      accent: 'border-teal-500/30 text-teal-600 bg-teal-50/50',
    },
  ];

  const recentDiscussions = [
    {
      title: 'Troubleshooting SPI DMA Buffer Desync on STM32F4 with Fast 1MSPS ADC',
      category: 'Embedded Systems',
      author: 'Vikram Patel',
      role: 'Firmware Engineer, Pune',
      replies: 16,
      views: '420',
      upvotes: 24,
      time: '2 hours ago',
      solved: true,
      tag: 'STM32F4 · DMA',
    },
    {
      title: 'Best Low-Noise LDO Regulator for 24-Bit ADC Precision Analog Front-End?',
      category: 'PCB Design',
      author: 'Sneha R.',
      role: 'Hardware Designer, Bengaluru',
      replies: 11,
      views: '315',
      upvotes: 18,
      time: '5 hours ago',
      solved: true,
      tag: 'Power · Analog',
    },
    {
      title: 'Overcoming LoRa SX1262 15km Packet Loss in Dense Industrial Steel Sheds',
      category: 'IoT & Telemetry',
      author: 'Amitabh Sen',
      role: 'IoT Researcher, Kolkata',
      replies: 23,
      views: '580',
      upvotes: 31,
      time: '1 day ago',
      solved: false,
      tag: 'SX1262 · RF',
    },
    {
      title: 'Mecanum Wheel PID Speed Tuning for Drift-Free Rotation in ROS 2 Nav2',
      category: 'Robotics',
      author: 'Rohit K.',
      role: 'Robotics Lead, Delhi',
      replies: 19,
      views: '490',
      upvotes: 27,
      time: '2 days ago',
      solved: true,
      tag: 'ROS 2 · Kinematics',
    },
    {
      title: 'KiCad 8 Design Rule Check (DRC) Setup for 4-Layer 0.15mm Micro-Via Routing',
      category: 'PCB Design',
      author: 'Manish Sharma',
      role: 'PCB Layout Engineer, Hyderabad',
      replies: 14,
      views: '380',
      upvotes: 22,
      time: '3 days ago',
      solved: true,
      tag: 'KiCad 8 · DRC',
    },
  ];

  const topContributors = [
    { name: 'Er. Monu Prajapati', role: 'EI House Founder & Lead Architect', points: '4,280 pts', badges: 'Founder · 42 Guides' },
    { name: 'Dr. Ramesh Chandra', role: 'Professor & Robotics Mentor', points: '2,940 pts', badges: 'Mentor · 28 Answers' },
    { name: 'Ananya Deshmukh', role: 'Embedded Systems Contributor', points: '2,150 pts', badges: 'Top Author · 14 Articles' },
    { name: 'Karthik S.', role: 'IoT Firmware Developer', points: '1,890 pts', badges: 'Code Reviewer' },
  ];

  const upcomingEvents = [
    {
      title: 'STM32 vs ESP32-S3: Architectural Benchmark & Hands-On Deep Dive',
      date: 'Saturday, Nov 21 · 4:00 PM IST',
      type: 'Live Technical Webinar',
      speaker: 'EI House Hardware Engineering Team',
    },
    {
      title: 'Hands-On KiCad 8: Routing 90Ω Controlled-Impedance USB Differential Pairs',
      date: 'Saturday, Nov 28 · 5:30 PM IST',
      type: 'Online Interactive Workshop',
      speaker: 'Senior PCB Layout Specialist',
    },
    {
      title: 'Pan-India Student Hardware Hackathon: Autonomous Mobile Rovers',
      date: 'Dec 15 - 18, 2026',
      type: 'National Hardware Challenge',
      speaker: 'Grand Finale & Lab Prototyping Grants',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />

      <main className="flex-1">
        {/* 01. Hero with Hardware Network Animation */}
        <section className="relative overflow-hidden border-b border-slate-200 bg-white py-14 sm:py-20">
          <CommunityNetworkAnimation />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#172D4D]/10 px-3.5 py-1 text-xs font-semibold text-[#172D4D] border border-emerald-500/20 backdrop-blur-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Pan-India Hardware &amp; Maker Ecosystem</span>
                <span className="text-slate-400">·</span>
                <span className="text-[#F59E0B] font-bold">4,850+ Active Members</span>
              </div>

              <div className="space-y-3">
                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0B1528] tracking-tight leading-[1.08] text-balance">
                  Where Engineers Connect, Collaborate &amp; Build Real Hardware.
                </h1>
                <p className="text-xl sm:text-2xl font-semibold text-[#172D4D]">
                  Solve bench bugs, publish verified guides, and bring prototypes to life.
                </p>
              </div>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                Connect with passionate builders, students, mentors, and industry practitioners across India.
                Share your hardware builds, review KiCad schematics, debug stubborn firmware issues, and collaborate on national projects.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button asChild size="lg" className="bg-[#172D4D] hover:bg-[#0B1528] text-white shadow-md">
                  <Link href="/dashboard/editor">
                    <PenLine className="h-4 w-4 mr-2" />
                    <span>Write An Article</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-slate-300 hover:bg-slate-50">
                  <Link href="/auth/register">Create Free Developer Profile</Link>
                </Button>
                <Button asChild variant="ghost" size="lg" className="text-slate-700 hover:text-[#0B1528]">
                  <a href="#discussions">Browse Active Discussions →</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* 02. Live Network Telemetry Bar */}
        <section className="py-8 border-b border-slate-200 bg-slate-50/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((s, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#0B1528] block">{s.value}</span>
                  <p className="text-xs font-semibold text-slate-700">{s.label}</p>
                  <p className="text-[11px] text-[#F59E0B] font-mono font-medium">{s.change}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 03. Focused Engineering Domain Channels */}
        <section className="py-16 sm:py-20 border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                  Domain Working Groups
                </span>
                <h2 className="font-display text-3xl font-extrabold text-[#0B1528]">
                  Explore Specialized Hardware Channels
                </h2>
                <p className="text-sm text-slate-600 max-w-2xl">
                  Connect with engineers working directly in your engineering specialization. Real-time feedback, schematic peer reviews, and verified code repositories.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 self-start sm:self-auto">
                6 Active Working Channels
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map((g, idx) => {
                const Icon = g.icon;
                return (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between space-y-4 hover:border-blue-400 hover:shadow-md transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center border ${g.accent}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-[#F59E0B] bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                          {g.members}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h3 className="font-display text-base font-bold text-[#0B1528] group-hover:text-blue-600 transition-colors">
                          {g.name}
                        </h3>
                        <p className="text-[11px] font-mono text-slate-500 font-medium">{g.topics}</p>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">{g.desc}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 text-[11px] font-semibold">Active Discussions Daily</span>
                      <Link
                        href="#discussions"
                        className="font-bold text-[#172D4D] group-hover:text-blue-600 flex items-center gap-1 hover:underline"
                      >
                        <span>Enter Group</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 04. Main Feed: Trending Discussions + Expert Sidebar */}
        <section id="discussions" className="py-16 sm:py-20 border-b border-slate-200 bg-[#FAFBFD]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Trending Discussions */}
              <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-[#F59E0B]" />
                    <h3 className="font-display text-xl font-bold text-[#0B1528]">
                      Trending Hardware Bench Discussions
                    </h3>
                  </div>
                  <Button asChild size="sm" variant="outline" className="text-xs">
                    <Link href="/contact?subject=Community%20Discussion%20Topic">Start A Discussion</Link>
                  </Button>
                </div>

                <div className="space-y-3.5">
                  {recentDiscussions.map((d, idx) => (
                    <div
                      key={idx}
                      className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-[#172D4D] bg-[#172D4D]/10 px-2.5 py-0.5 rounded-full border border-blue-500/10">
                            {d.category}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {d.tag}
                          </span>
                        </div>

                        {d.solved && (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Bench Solved ✓
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-[#0B1528] hover:text-blue-600 transition-colors cursor-pointer leading-snug">
                        {d.title}
                      </h4>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-[#172D4D] text-white flex items-center justify-center font-bold text-[10px]">
                            {d.author.slice(0, 1)}
                          </div>
                          <span>
                            <strong>{d.author}</strong> <span className="text-slate-400">({d.role})</span> · {d.time}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono">
                          <span className="flex items-center gap-1 text-slate-600">
                            <ThumbsUp className="h-3.5 w-3.5 text-[#F59E0B]" />
                            {d.upvotes}
                          </span>
                          <span className="flex items-center gap-1 text-slate-600">
                            <Eye className="h-3.5 w-3.5 text-slate-400" />
                            {d.views}
                          </span>
                          <span className="flex items-center gap-1 text-blue-600 font-semibold">
                            <MessageSquare className="h-3.5 w-3.5" />
                            {d.replies} replies
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Community Sidebar */}
              <div className="lg:col-span-4 space-y-6">
                {/* Instant WhatsApp Community Join */}
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 p-6 space-y-4 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-emerald-950 text-sm">Official WhatsApp Developer Group</h4>
                      <p className="text-[11px] text-emerald-700">Live hardware debugging chat</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Join our moderated WhatsApp &amp; Discord community channels to get real-time help on STM32, ESP32, PCB routing, and robotics.
                  </p>
                  <Button asChild size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                    <a
                      href={`https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent('Hello EI House India, I want to join the official EI House Engineering Developer Group.')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5"
                    >
                      <span>Join WhatsApp Group</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>

                {/* Become An Author / Contributor */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-2xs">
                  <h3 className="font-display text-base font-bold text-[#0B1528] flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#F59E0B]" />
                    <span>Publish An Engineering Guide</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Have you designed a custom PCB, solved a tricky driver bug, or built an autonomous rover?
                    Share your teardown on EI House to reach thousands of peers.
                  </p>
                  <Button asChild size="sm" className="w-full bg-[#172D4D] hover:bg-[#0B1528] text-white">
                    <Link href="/dashboard/editor">Open Markdown Editor</Link>
                  </Button>
                  <Link
                    href="/community-guidelines"
                    className="block text-center text-xs text-slate-500 hover:text-[#172D4D] hover:underline"
                  >
                    Read Editorial Guidelines &amp; Review Policy →
                  </Link>
                </div>

                {/* Upcoming Tech Meetups & Hackathons */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-2xs">
                  <h3 className="font-display text-base font-bold text-[#0B1528] flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#172D4D]" />
                    <span>Upcoming Engineering Meetups</span>
                  </h3>
                  <div className="space-y-3">
                    {upcomingEvents.map((evt, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="text-[10px] font-mono font-bold uppercase text-[#F59E0B]">
                          {evt.type}
                        </span>
                        <h5 className="font-bold text-xs text-[#0B1528] leading-snug">{evt.title}</h5>
                        <p className="text-[11px] text-slate-500">{evt.date}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Community Contributors */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-2xs">
                  <h3 className="font-display text-base font-bold text-[#0B1528] flex items-center gap-2">
                    <Award className="h-4 w-4 text-[#F59E0B]" />
                    <span>Top Hardware Contributors</span>
                  </h3>
                  <div className="space-y-3">
                    {topContributors.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <p className="font-bold text-[#0B1528]">{c.name}</p>
                          <p className="text-[11px] text-slate-500">{c.role}</p>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {c.points}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 05. National Hardware Showcase Call to Action */}
        <section className="py-16 sm:py-20 bg-[#172D4D] text-white">
          <div className="mx-auto max-w-4xl px-4 text-center space-y-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[#F59E0B] bg-white/10 px-3.5 py-1 rounded-full">
              <Code className="h-3.5 w-3.5" />
              Open Hardware Innovation In India
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold leading-tight">
              Built An Outstanding Hardware Project?
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Submit your project schematic, bill of materials, and firmware repository to the EI House community repository.
              Get featured nationally, receive mentor feedback, and showcase your engineering talent to hiring teams.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0B1528] font-bold shadow-lg">
                <Link href="/dashboard/editor">
                  <span>Submit Project Teardown</span>
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-white border-slate-600 hover:bg-white/10">
                <Link href="/projects">Explore Projects Repository</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
