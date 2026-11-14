import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Search,
  PenLine,
  Cpu,
  Bot,
  Wrench,
  GraduationCap,
  Lightbulb,
  BookOpen,
  Users,
  Building2,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  Zap,
} from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { ArticleCard } from '@/components/articles/ArticleCard';
import { NewsletterForm } from '@/components/articles/NewsletterForm';
import { Button } from '@/components/ui/button';
import { getPublishedPosts } from '@/modules/posts/public-queries';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const latestPosts = await getPublishedPosts({ limitCount: 12 });

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />

      <main className="flex-1">
        {/* 01. Hero Section */}
        <section className="border-b border-slate-200 bg-gradient-to-b from-white via-slate-50/50 to-white py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#172D4D]/10 px-3.5 py-1 text-xs font-semibold text-[#172D4D]">
                  <Sparkles className="h-3.5 w-3.5 text-[#F59E0B]" />
                  <span>Engineering Innovation House · India</span>
                </div>

                <div className="space-y-2">
                  <h1 className="font-display text-4xl sm:text-6xl lg:text-[4rem] font-extrabold tracking-tight text-[#0B1528] leading-[1.08] text-balance">
                    Where Ideas Become Things.
                  </h1>
                  <p className="text-xl sm:text-2xl font-semibold text-[#172D4D]">
                    Engineering Knowledge. Practical Innovation. Real-World Solutions.
                  </p>
                </div>

                <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                  EI House brings together engineering education, practical projects, innovative products,
                  technical services, and a collaborative technology community under one unified ecosystem.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button asChild size="lg" className="bg-[#172D4D] hover:bg-[#0B1528] text-white">
                    <Link href="/learn">
                      <span>Explore Courses</span>
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/projects">Discover Projects</Link>
                  </Button>
                  <Button asChild variant="ghost" size="lg" className="text-slate-700 hover:text-[#0B1528]">
                    <Link href="/products">Visit Store →</Link>
                  </Button>
                </div>

                {/* Quick Search Band */}
                <div className="pt-4 max-w-lg">
                  <form action="/search" method="GET" className="relative flex items-center">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="search"
                      name="q"
                      placeholder="Search courses, projects, STM32, IoT, PCB, or guides..."
                      aria-label="Universal Search"
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-24 text-sm text-[#0B1528] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#172D4D]"
                    />
                    <button
                      type="submit"
                      className="absolute right-1.5 h-8 px-3 rounded-md bg-[#172D4D] text-xs font-semibold text-white hover:bg-[#0B1528]"
                    >
                      Search
                    </button>
                  </form>
                </div>
              </div>

              {/* Hero Visual Card */}
              <div className="lg:col-span-5">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#0B1528] shadow-2xl text-white">
                  <Image
                    src="/images/about/about-hero.jpg"
                    alt="Engineering Innovation House (EI House) Ecosystem"
                    width={1200}
                    height={675}
                    priority
                    className="aspect-[16/9] w-full object-cover"
                  />
                  <div className="p-7 space-y-5 bg-gradient-to-br from-[#172D4D] to-[#0B1528]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-[#F59E0B] font-bold uppercase tracking-wider">
                        EI House Ecosystem
                      </span>
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-display text-2xl font-bold">The Innovation Loop</h3>
                      <p className="text-xs text-slate-300">Six integrated pillars designed to take you from student to hardware innovator.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-2 text-xs">
                      <div className="p-3 rounded-lg bg-white/10 backdrop-blur-sm space-y-1">
                        <GraduationCap className="h-4 w-4 text-[#F59E0B]" />
                        <p className="font-bold">1. Learn</p>
                        <p className="text-[11px] text-slate-300">45-day practical programs</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/10 backdrop-blur-sm space-y-1">
                        <Wrench className="h-4 w-4 text-[#F59E0B]" />
                        <p className="font-bold">2. Build</p>
                        <p className="text-[11px] text-slate-300">Real verified hardware</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/10 backdrop-blur-sm space-y-1">
                        <Lightbulb className="h-4 w-4 text-[#F59E0B]" />
                        <p className="font-bold">3. Innovate</p>
                        <p className="text-[11px] text-slate-300">Products & turnkey R&D</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/10 backdrop-blur-sm space-y-1">
                        <Users className="h-4 w-4 text-[#F59E0B]" />
                        <p className="font-bold">4. Connect</p>
                        <p className="text-[11px] text-slate-300">Vibrant peer network</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
                      <span>MSME Registered Platform</span>
                      <Link href="/about" className="text-[#F59E0B] font-semibold hover:underline">
                        About EI House →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 02. Explore EI House — The Six Pillars Grid */}
        <section className="py-16 sm:py-20 border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                Core Ecosystem
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1528]">
                Explore Engineering Innovation House
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                Six specialized business pillars working together to empower modern technology builders.
              </p>
            </div>

            {/* Ecosystem Showcase Visual Infographic */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-lg max-w-4xl mx-auto bg-white p-2 sm:p-4 flex items-center justify-center">
              <Image
                src="/images/ecosystem/integrated-ecosystem.jpg"
                alt="Integrated Engineering Education, Innovation, Products, Services and Technology Community Ecosystem"
                width={1024}
                height={1024}
                className="w-full h-auto max-h-[460px] object-contain rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-7 space-y-4 hover:shadow-lg transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#F59E0B] uppercase tracking-wider">Education</span>
                    <div className="h-10 w-10 rounded-lg bg-[#172D4D]/10 flex items-center justify-center text-[#172D4D]">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="font-display text-xl font-bold text-[#0B1528]">LEARN</h3>
                  <p className="text-xs font-semibold text-[#172D4D]">Engineering & STEM Education</p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Structured 45-day practical training programs, hands-on offline laboratory sessions, and verified certifications in Embedded Systems, IoT, Robotics, and PCB Design.
                  </p>
                </div>
                <Link href="/learn" className="inline-flex items-center text-xs font-bold text-[#172D4D] hover:underline pt-2">
                  <span>Browse Programs</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-7 space-y-4 hover:shadow-lg transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#F59E0B] uppercase tracking-wider">Hardware</span>
                    <div className="h-10 w-10 rounded-lg bg-[#172D4D]/10 flex items-center justify-center text-[#172D4D]">
                      <Wrench className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="font-display text-xl font-bold text-[#0B1528]">BUILD</h3>
                  <p className="text-xs font-semibold text-[#172D4D]">Projects & Prototyping Hub</p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Verified schematics, source code repositories, and complete documentation for academic final-year major projects and DIY open-source builds.
                  </p>
                </div>
                <Link href="/projects" className="inline-flex items-center text-xs font-bold text-[#172D4D] hover:underline pt-2">
                  <span>Explore Projects</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-7 space-y-4 hover:shadow-lg transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#F59E0B] uppercase tracking-wider">Commerce</span>
                    <div className="h-10 w-10 rounded-lg bg-[#172D4D]/10 flex items-center justify-center text-[#172D4D]">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="font-display text-xl font-bold text-[#0B1528]">STORE</h3>
                  <p className="text-xs font-semibold text-[#172D4D]">Hardware Store & Components</p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Authentic development boards, microcontroller modules, sensors, robotics kits, and high-strength 3D printing filaments bench-tested for reliability.
                  </p>
                </div>
                <Link href="/products" className="inline-flex items-center text-xs font-bold text-[#172D4D] hover:underline pt-2">
                  <span>Shop Hardware</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-7 space-y-4 hover:shadow-lg transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#F59E0B] uppercase tracking-wider">Solutions</span>
                    <div className="h-10 w-10 rounded-lg bg-[#172D4D]/10 flex items-center justify-center text-[#172D4D]">
                      <Lightbulb className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="font-display text-xl font-bold text-[#0B1528]">INNOVATE</h3>
                  <p className="text-xs font-semibold text-[#172D4D]">Engineering Services & R&D</p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Turnkey multi-layer PCB design, embedded firmware development, functional 3D enclosures, and custom IoT hardware prototyping for businesses and innovators.
                  </p>
                </div>
                <Link href="/services" className="inline-flex items-center text-xs font-bold text-[#172D4D] hover:underline pt-2">
                  <span>Request Service Quote</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-7 space-y-4 hover:shadow-lg transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#F59E0B] uppercase tracking-wider">Community</span>
                    <div className="h-10 w-10 rounded-lg bg-[#172D4D]/10 flex items-center justify-center text-[#172D4D]">
                      <Users className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="font-display text-xl font-bold text-[#0B1528]">CONNECT</h3>
                  <p className="text-xs font-semibold text-[#172D4D]">Community & Peer Network</p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    A collaborative platform to discuss bench problems, ask technical questions, review code, share project builds, and network with fellow engineers.
                  </p>
                </div>
                <Link href="/community" className="inline-flex items-center text-xs font-bold text-[#172D4D] hover:underline pt-2">
                  <span>Join Community</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-7 space-y-4 hover:shadow-lg transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#F59E0B] uppercase tracking-wider">Institutions</span>
                    <div className="h-10 w-10 rounded-lg bg-[#172D4D]/10 flex items-center justify-center text-[#172D4D]">
                      <Building2 className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="font-display text-xl font-bold text-[#0B1528]">GROW</h3>
                  <p className="text-xs font-semibold text-[#172D4D]">Franchise & College Labs</p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Partnering with universities, polytechnics, and schools to establish cutting-edge Robotics & STEM Innovation Centers with equipment and curriculum.
                  </p>
                </div>
                <Link href="/partnerships" className="inline-flex items-center text-xs font-bold text-[#172D4D] hover:underline pt-2">
                  <span>Partner With Us</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 03. Featured Courses Preview */}
        <section className="py-16 sm:py-20 border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                  Practical Education
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1528]">
                  Featured Hands-on Courses
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Available in 45-day intensive models with real hardware and laboratory sessions.
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/learn">View All Courses →</Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-[#172D4D]/10 flex items-center justify-center text-[#172D4D]">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#F59E0B] uppercase">Flagship Program</span>
                  <h3 className="font-display text-lg font-bold text-[#0B1528]">Advanced Embedded Systems & STM32</h3>
                  <p className="text-xs text-slate-500 mt-0.5">45 Days · Bare-Metal C & FreeRTOS</p>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Learn ARM Cortex-M architecture, peripheral HAL drivers, interrupt controllers, and FreeRTOS multi-threading.
                </p>
                <Link href="/learn" className="inline-flex items-center text-xs font-bold text-[#172D4D] hover:underline pt-1">
                  View Syllabus & Hardware Included →
                </Link>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B]">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#F59E0B] uppercase">Industry Ready</span>
                  <h3 className="font-display text-lg font-bold text-[#0B1528]">Industrial IoT & Cloud Telemetry</h3>
                  <p className="text-xs text-slate-500 mt-0.5">45 Days · ESP32, LoRa & MQTT</p>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Design end-to-end edge sensor nodes, secure MQTT communication, TLS authentication, and real-time cloud dashboards.
                </p>
                <Link href="/learn" className="inline-flex items-center text-xs font-bold text-[#172D4D] hover:underline pt-1">
                  View Syllabus & Hardware Included →
                </Link>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4 hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-[#172D4D]/10 flex items-center justify-center text-[#172D4D]">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#F59E0B] uppercase">Robotics</span>
                  <h3 className="font-display text-lg font-bold text-[#0B1528]">Robotics Engineering & Autonomous Systems</h3>
                  <p className="text-xs text-slate-500 mt-0.5">45 Days · ROS 2, Encoders & LiDAR</p>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Assemble mobile rovers and multi-axis arms with PID control, encoder feedback, 2D SLAM mapping, and ROS 2 nodes.
                </p>
                <Link href="/learn" className="inline-flex items-center text-xs font-bold text-[#172D4D] hover:underline pt-1">
                  View Syllabus & Hardware Included →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 04. Technical Blog & Latest Publications (Real Firestore Data) */}
        <section className="py-16 sm:py-20 border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                  Technical Publication
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1528]">
                  Latest Engineering Articles & Guides
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Written by engineers, researchers, and community contributors.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button asChild variant="outline" size="sm">
                  <Link href="/articles">Browse All Articles</Link>
                </Button>
                <Button asChild size="sm" className="bg-[#172D4D] hover:bg-[#0B1528] text-white">
                  <Link href="/dashboard/editor">
                    <PenLine className="h-3.5 w-3.5 mr-1" />
                    <span>Write An Article</span>
                  </Link>
                </Button>
              </div>
            </div>

            {latestPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {latestPosts.slice(0, 6).map((post) => (
                  <ArticleCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center space-y-4">
                <BookOpen className="h-10 w-10 text-slate-400 mx-auto" />
                <h3 className="font-display text-lg font-bold text-[#0B1528]">No articles published yet</h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Be the first author to publish a technical guide or project walkthrough on EI House.
                </p>
                <Button asChild size="sm">
                  <Link href="/dashboard/editor">Start Writing Now</Link>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* 05. College Labs & Franchise Banner */}
        <section className="py-16 sm:py-20 bg-slate-900 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-8 space-y-4">
                <span className="text-xs font-mono uppercase tracking-widest text-[#F59E0B]">
                  Institutional Collaboration
                </span>
                <h2 className="font-display text-3xl sm:text-4xl font-bold">
                  Setup An Official Robotics & IoT Innovation Lab In Your Institution
                </h2>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                  We supply engineering colleges and schools with turnkey equipment, workstation design,
                  accredited curriculum, faculty training, and student certification to drive practical research.
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <div className="flex items-center gap-2 text-xs text-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-[#F59E0B]" />
                    <span>Curriculum & Lab Manuals</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-[#F59E0B]" />
                    <span>Faculty Development Training</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-[#F59E0B]" />
                    <span>Annual Hackathon Sponsorship</span>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-4 flex flex-col gap-3">
                <Button asChild size="lg" className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0B1528] font-bold">
                  <Link href="/partnerships">
                    <span>Explore Lab Partnerships</span>
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-white border-slate-700 hover:bg-slate-800">
                  <Link href="/contact?subject=Institutional%20Proposal%20Request">Contact Lab Director</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* 06. Newsletter & Community Signup */}
        <section className="py-16 sm:py-20 border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
              Stay Connected
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1528]">
              Join The EI House Engineering Movement
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
              Receive curated technical articles, new course batch announcements, open-source project schematics,
              and hardware updates directly in your inbox.
            </p>
            <div className="max-w-md mx-auto pt-2">
              <NewsletterForm />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
