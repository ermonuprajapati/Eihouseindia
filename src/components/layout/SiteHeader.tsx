'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Menu, X, PenLine, LayoutDashboard, ShieldCheck, LogOut, User, ChevronDown } from 'lucide-react';
import { useAuth } from '@/modules/auth/auth-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function SiteHeader() {
  const { firebaseUser, profile, loading, isEditor, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand wordmark with logo */}
        <Link
          href="/"
          className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#0B1528] whitespace-nowrap shrink-0 flex items-center gap-2.5 group"
        >
          <div className="flex items-center justify-center shrink-0">
            <Image
              src="/images/logo.png"
              alt="EI HOUSE INDIA Logo"
              width={36}
              height={36}
              sizes="36px"
              className="h-8 w-8 object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="leading-tight font-extrabold text-[#0B1528] group-hover:text-blue-700 transition-colors">EI HOUSE</span>
            <span className="text-[10px] tracking-wider font-semibold text-[#B45309] uppercase leading-none hidden sm:inline">
              Innovation House
            </span>
          </div>
        </Link>

        {/* Zone 2: Ecosystem Nav Links (Clean, Uniform Information Architecture) */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-5 xl:gap-6 text-sm font-medium text-slate-600"
        >
          <Link
            href="/learn"
            prefetch={false}
            className="hover:text-[#0B1528] transition-colors whitespace-nowrap shrink-0"
          >
            Learn
          </Link>

          <Link
            href="/projects"
            prefetch={false}
            className="hover:text-[#0B1528] transition-colors whitespace-nowrap shrink-0"
          >
            Projects
          </Link>

          <Link
            href="/products"
            prefetch={false}
            className="hover:text-[#0B1528] transition-colors whitespace-nowrap shrink-0"
          >
            Store
          </Link>

          {/* Virtual Lab with Subtle Refined Indicator */}
          <Link
            href="/engineering-lab"
            prefetch={false}
            className="hover:text-blue-700 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 text-blue-700 font-semibold"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
            </span>
            <span>Virtual Lab</span>
          </Link>

          {/* Platform / Labs Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 hover:text-[#0B1528] transition-colors whitespace-nowrap shrink-0 outline-none cursor-pointer">
              <span>Platform</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 transition-transform duration-200" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-2 shadow-xl border-slate-200">
              <DropdownMenuItem asChild>
                <Link href="/engineering-lab" className="flex flex-col items-start gap-0.5 p-2 rounded-md hover:bg-slate-50">
                  <div className="flex items-center gap-1.5 font-semibold text-blue-700 text-xs">
                    <span>Universal Engineering Lab</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-normal">2D/3D Circuit Sim, PCB CAD &amp; Firmware IDE</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/tools" className="flex flex-col items-start gap-0.5 p-2 rounded-md hover:bg-slate-50">
                  <span className="font-semibold text-slate-900 text-xs">Engineering Tools</span>
                  <span className="text-[11px] text-slate-500 font-normal">Calculators, RF solvers &amp; design utilities</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/library" className="flex flex-col items-start gap-0.5 p-2 rounded-md hover:bg-slate-50">
                  <span className="font-semibold text-slate-900 text-xs">Component Library</span>
                  <span className="text-[11px] text-slate-500 font-normal">Reference symbols, footprints &amp; modules</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/datasheets" className="flex flex-col items-start gap-0.5 p-2 rounded-md hover:bg-slate-50">
                  <span className="font-semibold text-slate-900 text-xs">Datasheet Finder</span>
                  <span className="text-[11px] text-slate-500 font-normal">Search millions of verified component sheets</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/services" className="flex flex-col items-start gap-0.5 p-2 rounded-md hover:bg-slate-50">
                  <span className="font-semibold text-slate-900 text-xs">Engineering Services</span>
                  <span className="text-[11px] text-slate-500 font-normal">Custom hardware R&amp;D, PCB prototyping</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Resources Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 hover:text-[#0B1528] transition-colors whitespace-nowrap shrink-0 outline-none cursor-pointer">
              <span>Resources</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 transition-transform duration-200" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 p-2 shadow-xl border-slate-200">
              <DropdownMenuItem asChild>
                <Link href="/articles" className="flex flex-col items-start gap-0.5 p-2 rounded-md hover:bg-slate-50">
                  <span className="font-semibold text-slate-900 text-xs">Technical Blog</span>
                  <span className="text-[11px] text-slate-500 font-normal">Electronics tutorials &amp; deep-dives</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/community" className="flex flex-col items-start gap-0.5 p-2 rounded-md hover:bg-slate-50">
                  <span className="font-semibold text-slate-900 text-xs">Community Hub</span>
                  <span className="text-[11px] text-slate-500 font-normal">Discussions, projects &amp; mentorship</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/partnerships" className="flex flex-col items-start gap-0.5 p-2 rounded-md hover:bg-slate-50">
                  <span className="font-semibold text-slate-900 text-xs">Labs &amp; Franchise</span>
                  <span className="text-[11px] text-slate-500 font-normal">Institutional labs &amp; incubation hubs</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            href="/about"
            prefetch={false}
            className="hover:text-[#0B1528] transition-colors whitespace-nowrap shrink-0"
          >
            About
          </Link>
        </nav>

        {/* Zone 3: Actions & Account Trigger */}
        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <Link
            href="/search"
            prefetch={false}
            className="p-2 text-slate-500 hover:text-[#0B1528] rounded-md hover:bg-slate-100 transition-colors"
            title="Search Platform"
          >
            <span className="sr-only">Search</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Link>

          <Button asChild variant="outline" size="sm" className="hidden xl:inline-flex border-[#0B1528]/20">
            <Link href="/dashboard/editor">
              <PenLine className="h-3.5 w-3.5 mr-1" />
              <span>Write</span>
            </Link>
          </Button>

          {loading ? (
            <div className="h-9 w-24 rounded-md bg-slate-100 animate-pulse" />
          ) : firebaseUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="h-4 w-4 text-slate-600" />
                  <span className="max-w-[120px] truncate">
                    {profile?.displayName || firebaseUser.displayName || 'Account'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2.5 py-2">
                  <p className="text-sm font-medium text-[#0B1528] truncate">
                    {profile?.displayName || firebaseUser.displayName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    @{profile?.username || 'contributor'}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
                    <LayoutDashboard className="h-4 w-4 text-slate-500" />
                    <span>Author Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/editor">
                    <PenLine className="h-4 w-4 text-slate-500" />
                    <span>Write Article</span>
                  </Link>
                </DropdownMenuItem>
                {isEditor && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <ShieldCheck className="h-4 w-4 text-[#1D4ED8]" />
                      <span>Admin Console</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-700 focus:text-red-700">
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/auth/login">Sign In</Link>
              </Button>
              <Button asChild size="sm" className="bg-[#172D4D] hover:bg-[#0B1528] text-white">
                <Link href="/auth/register">Join</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
          {/* Main Navigation Links */}
          <div className="space-y-1">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-semibold text-[#0B1528] hover:text-blue-700 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/learn"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700 hover:text-[#0B1528] transition-colors"
            >
              Learn (Courses &amp; Training)
            </Link>
            <Link
              href="/projects"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700 hover:text-[#0B1528] transition-colors"
            >
              Projects &amp; Prototyping
            </Link>
            <Link
              href="/products"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-medium text-slate-700 hover:text-[#0B1528] transition-colors"
            >
              Store &amp; Components
            </Link>
            <Link
              href="/engineering-lab"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 py-2 text-sm font-semibold text-blue-700 hover:text-blue-800 transition-colors"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
              </span>
              <span>Universal Engineering Lab</span>
            </Link>
          </div>

          {/* Platform & Tools Section */}
          <div className="border-t border-slate-100 pt-3 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1 mb-1">
              Platform &amp; Tools
            </p>
            <Link
              href="/tools"
              onClick={() => setMobileOpen(false)}
              className="block py-1.5 text-sm font-medium text-slate-700 hover:text-[#0B1528] transition-colors"
            >
              Engineering Tools &amp; Utilities
            </Link>
            <Link
              href="/library"
              onClick={() => setMobileOpen(false)}
              className="block py-1.5 text-sm font-medium text-slate-700 hover:text-[#0B1528] transition-colors"
            >
              Component Library &amp; Pinouts
            </Link>
            <Link
              href="/datasheets"
              onClick={() => setMobileOpen(false)}
              className="block py-1.5 text-sm font-medium text-slate-700 hover:text-[#0B1528] transition-colors"
            >
              Datasheet Finder
            </Link>
            <Link
              href="/services"
              onClick={() => setMobileOpen(false)}
              className="block py-1.5 text-sm font-medium text-slate-700 hover:text-[#0B1528] transition-colors"
            >
              Engineering Services &amp; R&amp;D
            </Link>
          </div>

          {/* Resources & Community Section */}
          <div className="border-t border-slate-100 pt-3 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1 mb-1">
              Resources &amp; Network
            </p>
            <Link
              href="/articles"
              onClick={() => setMobileOpen(false)}
              className="block py-1.5 text-sm font-medium text-slate-700 hover:text-[#0B1528] transition-colors"
            >
              Technical Blog &amp; Articles
            </Link>
            <Link
              href="/community"
              onClick={() => setMobileOpen(false)}
              className="block py-1.5 text-sm font-medium text-slate-700 hover:text-[#0B1528] transition-colors"
            >
              Community Hub
            </Link>
            <Link
              href="/partnerships"
              onClick={() => setMobileOpen(false)}
              className="block py-1.5 text-sm font-medium text-slate-700 hover:text-[#0B1528] transition-colors"
            >
              Labs &amp; Franchise
            </Link>
            <Link
              href="/about"
              onClick={() => setMobileOpen(false)}
              className="block py-1.5 text-sm font-medium text-slate-700 hover:text-[#0B1528] transition-colors"
            >
              About EI House
            </Link>
            <Link
              href="/search"
              onClick={() => setMobileOpen(false)}
              className="block py-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              Universal Search
            </Link>
          </div>

          <div className="border-t border-slate-200 pt-3 flex flex-col gap-2">
            {firebaseUser ? (
              <>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                    Author Dashboard
                  </Link>
                </Button>
                <Button asChild variant="primary" className="w-full justify-start">
                  <Link href="/dashboard/editor" onClick={() => setMobileOpen(false)}>
                    Write Article
                  </Link>
                </Button>
                {isEditor && (
                  <Button asChild variant="secondary" className="w-full justify-start">
                    <Link href="/admin" onClick={() => setMobileOpen(false)}>
                      Admin Console
                    </Link>
                  </Button>
                )}
                <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-red-700">
                  Sign Out
                </Button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline">
                  <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                    Sign In
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/register" onClick={() => setMobileOpen(false)}>
                    Register
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
