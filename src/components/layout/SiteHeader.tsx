'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Menu, X, PenLine, LayoutDashboard, ShieldCheck, LogOut, User } from 'lucide-react';
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
          className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#0B1528] whitespace-nowrap shrink-0 flex items-center gap-2.5"
        >
          <Image
            src="/images/logo.png"
            alt="EI HOUSE INDIA Logo"
            width={34}
            height={34}
            className="h-8 w-8 object-contain rounded"
            priority
          />
          <div className="flex flex-col">
            <span className="leading-tight font-extrabold text-[#0B1528]">EI HOUSE</span>
            <span className="text-[10px] tracking-wider font-semibold text-[#F59E0B] uppercase leading-none hidden sm:inline">
              Innovation House
            </span>
          </div>
        </Link>

        {/* Zone 2: Ecosystem Nav Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-3.5 xl:gap-5 text-xs xl:text-sm font-medium text-slate-600"
        >
          <Link
            href="/learn"
            className="hover:text-[#0B1528] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Learn
          </Link>
          <Link
            href="/projects"
            className="hover:text-[#0B1528] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Projects
          </Link>
          <Link
            href="/products"
            className="hover:text-[#0B1528] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Store
          </Link>
          <Link
            href="/tools"
            className="hover:text-[#0B1528] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 font-semibold text-[#172D4D] flex items-center gap-1"
          >
            <span>Engineering Tools</span>
            <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-1 py-0.2 rounded">
              New
            </span>
          </Link>
          <Link
            href="/library"
            className="hover:text-[#0B1528] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 font-semibold text-[#172D4D]"
          >
            Library
          </Link>
          <Link
            href="/services"
            className="hover:text-[#0B1528] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Services
          </Link>
          <Link
            href="/articles"
            className="hover:text-[#0B1528] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Blog
          </Link>
          <Link
            href="/community"
            className="hover:text-[#0B1528] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Community
          </Link>
          <Link
            href="/partnerships"
            className="hover:text-[#0B1528] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 text-slate-500"
          >
            Labs & Franchise
          </Link>
          <Link
            href="/about"
            className="hover:text-[#0B1528] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            About
          </Link>
        </nav>

        {/* Zone 3: Actions & Account Trigger */}
        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <Link
            href="/search"
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
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
          <nav className="flex flex-col space-y-2 text-sm font-medium text-slate-700">
            <Link href="/" onClick={() => setMobileOpen(false)} className="py-1.5 font-semibold text-[#0B1528]">
              Home
            </Link>
            <Link href="/learn" onClick={() => setMobileOpen(false)} className="py-1.5">
              Learn (Courses & Training)
            </Link>
            <Link href="/projects" onClick={() => setMobileOpen(false)} className="py-1.5">
              Projects & Prototyping
            </Link>
            <Link href="/products" onClick={() => setMobileOpen(false)} className="py-1.5">
              Store & Components
            </Link>
            <Link href="/tools" onClick={() => setMobileOpen(false)} className="py-1.5 font-semibold text-[#172D4D] flex items-center justify-between">
              <span>Engineering Tools &amp; Software Directory</span>
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">New</span>
            </Link>
            <Link href="/library" onClick={() => setMobileOpen(false)} className="py-1.5 font-semibold text-[#172D4D] flex items-center justify-between">
              <span>Engineering Library (Datasheets &amp; Code)</span>
              <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-bold">New</span>
            </Link>
            <Link href="/services" onClick={() => setMobileOpen(false)} className="py-1.5">
              Engineering Services & R&D
            </Link>
            <Link href="/articles" onClick={() => setMobileOpen(false)} className="py-1.5">
              Technical Blog & Articles
            </Link>
            <Link href="/community" onClick={() => setMobileOpen(false)} className="py-1.5">
              Community & Network
            </Link>
            <Link href="/partnerships" onClick={() => setMobileOpen(false)} className="py-1.5">
              Franchise & College Labs
            </Link>
            <Link href="/about" onClick={() => setMobileOpen(false)} className="py-1.5">
              About EI House
            </Link>
            <Link href="/search" onClick={() => setMobileOpen(false)} className="py-1.5 text-slate-500">
              Universal Search
            </Link>
          </nav>
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
