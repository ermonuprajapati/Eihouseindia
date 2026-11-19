'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  X,
  PenLine,
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  User,
  ChevronDown,
  ChevronRight,
  Search,
  Wrench,
  FileText,
  Layers,
  Sparkles,
  BookOpen,
  Users,
  Building2,
  Info,
  ShoppingBag,
  LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/modules/auth/auth-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MegaMenuItem {
  title: string;
  href: string;
  description: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

const TOOLS_REFERENCE_ITEMS: MegaMenuItem[] = [
  {
    title: 'Engineering Tools',
    href: '/tools',
    description: 'Online calculators, RF solvers & trace width calculators',
    icon: Wrench,
    iconBg: 'bg-amber-50 group-hover:bg-amber-100',
    iconColor: 'text-amber-600',
  },
  {
    title: 'Datasheet Finder',
    href: '/datasheets',
    description: 'Search 100,000+ verified electronic component pinouts & specs',
    icon: FileText,
    iconBg: 'bg-blue-50 group-hover:bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    title: 'Component Library',
    href: '/library',
    description: 'Schematic symbols, PCB footprints & reference architectures',
    icon: Layers,
    iconBg: 'bg-emerald-50 group-hover:bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  {
    title: 'Engineering Services',
    href: '/services',
    description: 'Turnkey PCB design, custom embedded firmware & hardware R&D',
    icon: Sparkles,
    iconBg: 'bg-indigo-50 group-hover:bg-indigo-100',
    iconColor: 'text-indigo-600',
  },
];

const ECOSYSTEM_ITEMS: MegaMenuItem[] = [
  {
    title: 'Technical Blog',
    href: '/articles',
    description: 'In-depth engineering tutorials, hardware teardowns & articles',
    icon: BookOpen,
    iconBg: 'bg-purple-50 group-hover:bg-purple-100',
    iconColor: 'text-purple-600',
  },
  {
    title: 'Community Network',
    href: '/community',
    description: 'Hardware innovators, student makers & engineering forums',
    icon: Users,
    iconBg: 'bg-cyan-50 group-hover:bg-cyan-100',
    iconColor: 'text-cyan-600',
  },
  {
    title: 'Labs & Franchise',
    href: '/partnerships',
    description: 'Institutional college labs, franchise & incubation hubs',
    icon: Building2,
    iconBg: 'bg-rose-50 group-hover:bg-rose-100',
    iconColor: 'text-rose-600',
  },
  {
    title: 'About EI House',
    href: '/about',
    description: 'Mission, founder story, company vision & contact details',
    icon: Info,
    iconBg: 'bg-slate-100 group-hover:bg-slate-200',
    iconColor: 'text-slate-700',
  },
];

export function SiteHeader() {
  const { firebaseUser, profile, loading, isEditor, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [mobileEcosystemOpen, setMobileEcosystemOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'tools' | 'ecosystem' | null>(null);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Handle logout
  const handleLogout = async () => {
    await logout();
    router.push('/');
    router.refresh();
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  // Hover Intent System: Open immediately, delay close by 180ms to bridge gaps
  const handleMouseEnter = useCallback((menu: 'tools' | 'ecosystem') => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setActiveMenu(menu);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 180);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setActiveMenu(null);
    setMobileOpen(false);
  }, [pathname]);

  // Keyboard shortcut listener: Cmd+K / Ctrl+K for search, Esc to close menus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        router.push('/search');
      } else if (e.key === 'Escape') {
        setActiveMenu(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  return (
    <>
      {/* BULLETPROOF FIXED TOP HEADER (Exact 64px height, z-50, solid white contrast) */}
      <header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 h-16 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md transition-colors"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Brand Wordmark with Logo */}
          <Link
            href="/"
            className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#0B1528] whitespace-nowrap shrink-0 flex items-center gap-2.5 group"
          >
            <div className="flex items-center justify-center shrink-0">
              <Image
                src="/images/logo.png"
                alt="EI HOUSE INDIA Logo"
                width={34}
                height={34}
                sizes="34px"
                className="h-8 w-8 object-contain transition-transform duration-200 group-hover:scale-105"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="leading-tight font-extrabold text-[#0B1528] group-hover:text-blue-700 transition-colors">
                EI HOUSE
              </span>
              <span className="text-[10px] tracking-wider font-semibold text-[#B45309] uppercase leading-none hidden sm:inline">
                Innovation House
              </span>
            </div>
          </Link>

          {/* Zone 2: Primary Navigation (Desktop >= 1280px ONLY for zero-overlap guarantee) */}
          <nav
            aria-label="Primary navigation"
            className="hidden xl:flex items-center gap-1 2xl:gap-2 text-sm font-semibold text-slate-800 shrink-0 whitespace-nowrap"
          >
            {/* 1. Flagship Destination: Virtual Lab */}
            <Link
              href="/engineering-lab"
              prefetch={false}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all mr-1 ${
                pathname.startsWith('/engineering-lab')
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-blue-50/90 hover:bg-blue-100 text-blue-700 border border-blue-200/80'
              }`}
              title="Launch Universal Engineering Lab (2D/3D Circuit Sim & PCB CAD)"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
              </span>
              <span>Virtual Lab</span>
            </Link>

            {/* 2. Store */}
            <Link
              href="/products"
              prefetch={false}
              className={`px-3 py-2 rounded-md transition-colors whitespace-nowrap shrink-0 font-semibold ${
                pathname.startsWith('/products')
                  ? 'text-[#0B1528] font-bold bg-slate-100/80'
                  : 'text-slate-800 hover:text-blue-700 hover:bg-slate-50'
              }`}
            >
              Store
            </Link>

            {/* 3. Learn */}
            <Link
              href="/learn"
              prefetch={false}
              className={`px-3 py-2 rounded-md transition-colors whitespace-nowrap shrink-0 font-semibold ${
                pathname.startsWith('/learn')
                  ? 'text-[#0B1528] font-bold bg-slate-100/80'
                  : 'text-slate-800 hover:text-blue-700 hover:bg-slate-50'
              }`}
            >
              Learn
            </Link>

            {/* 4. Projects */}
            <Link
              href="/projects"
              prefetch={false}
              className={`px-3 py-2 rounded-md transition-colors whitespace-nowrap shrink-0 font-semibold ${
                pathname.startsWith('/projects')
                  ? 'text-[#0B1528] font-bold bg-slate-100/80'
                  : 'text-slate-800 hover:text-blue-700 hover:bg-slate-50'
              }`}
            >
              Projects
            </Link>

            {/* 5. Tools & Reference Dropdown */}
            <div
              className="relative shrink-0"
              onMouseEnter={() => handleMouseEnter('tools')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                onClick={() => setActiveMenu((prev) => (prev === 'tools' ? null : 'tools'))}
                aria-expanded={activeMenu === 'tools'}
                aria-haspopup="true"
                className={`flex items-center gap-1 px-3 py-2 rounded-md transition-colors whitespace-nowrap shrink-0 outline-none cursor-pointer font-semibold ${
                  activeMenu === 'tools' ||
                  ['/tools', '/datasheets', '/library', '/services'].some((r) => pathname.startsWith(r))
                    ? 'text-[#0B1528] font-bold bg-slate-100/80'
                    : 'text-slate-800 hover:text-blue-700 hover:bg-slate-50'
                }`}
              >
                <span>Tools &amp; Reference</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${
                    activeMenu === 'tools' ? 'rotate-180 text-blue-600' : ''
                  }`}
                />
              </button>

              {/* Mega Menu Dropdown */}
              {activeMenu === 'tools' && (
                <div
                  className="absolute top-full left-0 mt-1.5 w-[380px] rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-2xl backdrop-blur-xl animate-in fade-in-50 zoom-in-95 duration-150 z-50"
                  onMouseEnter={() => handleMouseEnter('tools')}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="grid grid-cols-1 gap-1">
                    {TOOLS_REFERENCE_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={false}
                          onClick={() => setActiveMenu(null)}
                          className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                        >
                          <div
                            className={`p-2 rounded-lg ${item.iconBg} ${item.iconColor} shrink-0 transition-transform duration-200 group-hover:scale-105`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-slate-900 group-hover:text-blue-700 transition-colors flex items-center justify-between">
                              <span>{item.title}</span>
                              <ChevronRight className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                            </div>
                            <p className="text-[11px] text-slate-500 font-normal leading-relaxed mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 6. Ecosystem Dropdown */}
            <div
              className="relative shrink-0"
              onMouseEnter={() => handleMouseEnter('ecosystem')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                onClick={() => setActiveMenu((prev) => (prev === 'ecosystem' ? null : 'ecosystem'))}
                aria-expanded={activeMenu === 'ecosystem'}
                aria-haspopup="true"
                className={`flex items-center gap-1 px-3 py-2 rounded-md transition-colors whitespace-nowrap shrink-0 outline-none cursor-pointer font-semibold ${
                  activeMenu === 'ecosystem' ||
                  ['/articles', '/blog', '/community', '/partnerships', '/about'].some((r) =>
                    pathname.startsWith(r)
                  )
                    ? 'text-[#0B1528] font-bold bg-slate-100/80'
                    : 'text-slate-800 hover:text-blue-700 hover:bg-slate-50'
                }`}
              >
                <span>Ecosystem</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${
                    activeMenu === 'ecosystem' ? 'rotate-180 text-blue-600' : ''
                  }`}
                />
              </button>

              {/* Mega Menu Dropdown */}
              {activeMenu === 'ecosystem' && (
                <div
                  className="absolute top-full right-0 mt-1.5 w-[380px] rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-2xl backdrop-blur-xl animate-in fade-in-50 zoom-in-95 duration-150 z-50"
                  onMouseEnter={() => handleMouseEnter('ecosystem')}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="grid grid-cols-1 gap-1">
                    {ECOSYSTEM_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={false}
                          onClick={() => setActiveMenu(null)}
                          className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                        >
                          <div
                            className={`p-2 rounded-lg ${item.iconBg} ${item.iconColor} shrink-0 transition-transform duration-200 group-hover:scale-105`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-slate-900 group-hover:text-blue-700 transition-colors flex items-center justify-between">
                              <span>{item.title}</span>
                              <ChevronRight className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                            </div>
                            <p className="text-[11px] text-slate-500 font-normal leading-relaxed mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Zone 3: Actions & Account Trigger (Desktop & Mobile) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 whitespace-nowrap">
            {/* Universal Search Button */}
            <Link
              href="/search"
              prefetch={false}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 hover:text-blue-700 transition-colors shrink-0 whitespace-nowrap"
              title="Search Platform (⌘K / Ctrl+K)"
            >
              <Search className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline xl:hidden">Search</span>
              <span className="hidden xl:inline">Search...</span>
              <kbd className="hidden xl:inline-flex items-center font-mono text-[9px] bg-white border border-slate-200 px-1 rounded text-slate-400">
                ⌘K
              </kbd>
            </Link>

            {/* Quick Store / Hardware Link on screens < 1280px */}
            <Link
              href="/products"
              prefetch={false}
              className="xl:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 hover:text-blue-700 transition-colors shrink-0 whitespace-nowrap"
              title="Hardware Store"
            >
              <ShoppingBag className="h-3.5 w-3.5 text-slate-600" />
              <span className="hidden sm:inline">Store</span>
            </Link>

            {/* Desktop Only: Write Article Button */}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden xl:inline-flex border-slate-200 text-slate-800 hover:bg-slate-50 h-8 text-xs font-semibold shrink-0 whitespace-nowrap"
            >
              <Link href="/dashboard/editor">
                <PenLine className="h-3.5 w-3.5 mr-1 text-slate-600" />
                <span>Write</span>
              </Link>
            </Button>

            {/* Desktop Only: User Auth Trigger */}
            <div className="hidden xl:flex items-center gap-2 shrink-0 whitespace-nowrap">
              {loading ? (
                <div className="h-8 w-20 rounded-md bg-slate-100 animate-pulse" />
              ) : firebaseUser ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 h-8 text-xs border-slate-200 font-semibold text-slate-800 shrink-0 whitespace-nowrap">
                      <User className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                      <span className="max-w-[100px] truncate">
                        {profile?.displayName || firebaseUser.displayName || 'Account'}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-xl border-slate-200">
                    <div className="px-2.5 py-2">
                      <p className="text-xs font-semibold text-[#0B1528] truncate">
                        {profile?.displayName || firebaseUser.displayName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        @{profile?.username || 'contributor'}
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="cursor-pointer text-xs">
                        <LayoutDashboard className="h-3.5 w-3.5 text-slate-500 mr-2" />
                        <span>Author Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/editor" className="cursor-pointer text-xs">
                        <PenLine className="h-3.5 w-3.5 text-slate-500 mr-2" />
                        <span>Write Article</span>
                      </Link>
                    </DropdownMenuItem>
                    {isEditor && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="cursor-pointer text-xs">
                          <ShieldCheck className="h-3.5 w-3.5 text-[#1D4ED8] mr-2" />
                          <span>Admin Console</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-700 focus:text-red-700 cursor-pointer text-xs"
                    >
                      <LogOut className="h-3.5 w-3.5 mr-2" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                  <Button asChild variant="ghost" size="sm" className="h-8 px-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 shrink-0">
                    <Link href="/auth/login">Sign In</Link>
                  </Button>
                  <Button asChild size="sm" className="h-8 px-3 text-xs bg-[#172D4D] hover:bg-[#0B1528] text-white font-semibold shrink-0">
                    <Link href="/auth/register">Join</Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile / Tablet / Desktop Mode Hamburger Button (< 1280px) */}
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="xl:hidden inline-flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* SLIDE-OVER DRAWER FOR ALL SCREENS < 1280px (Full-height, z-[60], zero-overlap guarantee) */}
      {mobileOpen && (
        <div className="xl:hidden fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fixed inset-y-0 right-0 w-full max-w-sm sm:max-w-md bg-white h-[100dvh] shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
            {/* Drawer Header with Clean Logo & Close Button */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 shrink-0 bg-white">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5"
              >
                <Image
                  src="/images/logo.png"
                  alt="EI HOUSE"
                  width={30}
                  height={30}
                  className="h-7 w-7 object-contain"
                />
                <span className="font-extrabold text-slate-900 text-base">EI HOUSE</span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body Scroll */}
            <div className="flex-1 overflow-y-auto touch-scroll overscroll-contain px-5 py-5 space-y-5">
              {/* Flagship Product Card: Virtual Lab */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5">
                <Link
                  href="/engineering-lab"
                  prefetch={false}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-start gap-3"
                >
                  <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0 mt-0.5">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-200 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-blue-900">Universal Engineering Lab</span>
                    </div>
                    <p className="text-xs text-blue-700/90 mt-0.5">
                      2D/3D Circuit Simulation, Interactive PCB Routing &amp; Firmware IDE
                    </p>
                  </div>
                </Link>
              </div>

              {/* Core Direct Links */}
              <div className="space-y-1 border-b border-slate-100 pb-3">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="block py-2 text-sm font-semibold text-slate-900 hover:text-blue-700"
                >
                  Home
                </Link>
                <Link
                  href="/products"
                  onClick={() => setMobileOpen(false)}
                  className="block py-2 text-sm font-medium text-slate-700 hover:text-blue-700"
                >
                  Store &amp; Prototyping Hardware
                </Link>
                <Link
                  href="/learn"
                  onClick={() => setMobileOpen(false)}
                  className="block py-2 text-sm font-medium text-slate-700 hover:text-blue-700"
                >
                  Learn (Courses &amp; Training)
                </Link>
                <Link
                  href="/projects"
                  onClick={() => setMobileOpen(false)}
                  className="block py-2 text-sm font-medium text-slate-700 hover:text-blue-700"
                >
                  Projects &amp; Open Hardware
                </Link>
              </div>

              {/* Tools & Reference Section */}
              <div className="space-y-2 border-b border-slate-100 pb-3">
                <button
                  type="button"
                  onClick={() => setMobileToolsOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 py-1 cursor-pointer"
                >
                  <span>Tools &amp; Reference</span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform ${
                      mobileToolsOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <div className={`pt-1 space-y-1.5 sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0 ${mobileToolsOpen ? 'block' : 'hidden'}`}>
                  {TOOLS_REFERENCE_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 py-2 px-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className={`p-1.5 rounded-md ${item.iconBg} ${item.iconColor} shrink-0`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-800">{item.title}</div>
                          <div className="text-[11px] text-slate-500 truncate">{item.description}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Ecosystem & Company Section */}
              <div className="space-y-2 border-b border-slate-100 pb-3">
                <button
                  type="button"
                  onClick={() => setMobileEcosystemOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 py-1 cursor-pointer"
                >
                  <span>Ecosystem &amp; Company</span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform ${
                      mobileEcosystemOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <div className={`pt-1 space-y-1.5 sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0 ${mobileEcosystemOpen ? 'block' : 'hidden'}`}>
                  {ECOSYSTEM_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 py-2 px-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className={`p-1.5 rounded-md ${item.iconBg} ${item.iconColor} shrink-0`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-800">{item.title}</div>
                          <div className="text-[11px] text-slate-500 truncate">{item.description}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Auth Actions */}
              <div className="pt-2 flex flex-col gap-2">
                {firebaseUser ? (
                  <>
                    <Button asChild variant="outline" className="w-full justify-start text-xs h-9 font-semibold text-slate-800">
                      <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                        <LayoutDashboard className="h-3.5 w-3.5 mr-2 text-slate-600" />
                        <span>Author Dashboard</span>
                      </Link>
                    </Button>
                    <Button asChild className="w-full justify-start text-xs h-9 bg-[#172D4D] text-white font-semibold">
                      <Link href="/dashboard/editor" onClick={() => setMobileOpen(false)}>
                        <PenLine className="h-3.5 w-3.5 mr-2" />
                        <span>Write Article</span>
                      </Link>
                    </Button>
                    {isEditor && (
                      <Button asChild variant="secondary" className="w-full justify-start text-xs h-9 font-semibold text-blue-700">
                        <Link href="/admin" onClick={() => setMobileOpen(false)}>
                          <ShieldCheck className="h-3.5 w-3.5 mr-2 text-[#1D4ED8]" />
                          <span>Admin Console</span>
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setMobileOpen(false);
                        handleLogout();
                      }}
                      className="w-full justify-start text-xs text-red-700 hover:text-red-800 hover:bg-red-50 h-9 font-semibold"
                    >
                      <LogOut className="h-3.5 w-3.5 mr-2" />
                      <span>Sign Out</span>
                    </Button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button asChild variant="outline" className="text-xs h-9 font-semibold text-slate-800">
                      <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                        Sign In
                      </Link>
                    </Button>
                    <Button asChild className="text-xs h-9 bg-[#172D4D] hover:bg-[#0B1528] text-white font-semibold">
                      <Link href="/auth/register" onClick={() => setMobileOpen(false)}>
                        Join
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
