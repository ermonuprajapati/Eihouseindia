'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
        {/* Zone 1: Brand wordmark (single line, no descriptor) */}
        <Link
          href="/"
          className="font-display text-xl font-bold tracking-tight text-[#0B1528] whitespace-nowrap shrink-0"
        >
          EIHOUSE INDIA
        </Link>

        {/* Zone 2: 5 concise single-line nav links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          <Link
            href="/articles"
            className="hover:text-[#0B1528] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Articles
          </Link>
          <Link
            href="/category/semiconductor-technology"
            className="hover:text-[#0B1528] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Semiconductors
          </Link>
          <Link
            href="/category/artificial-intelligence"
            className="hover:text-[#0B1528] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            AI & Robotics
          </Link>
          <Link
            href="/category/tutorials-projects"
            className="hover:text-[#0B1528] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Tutorials
          </Link>
          <Link
            href="/search"
            className="hover:text-[#0B1528] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Search
          </Link>
        </nav>

        {/* Zone 3: 1 primary action / account trigger */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
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
            <Button asChild size="sm">
              <Link href="/auth/login">Sign In</Link>
            </Button>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
          <nav className="flex flex-col space-y-2 text-sm font-medium text-slate-700">
            <Link href="/articles" onClick={() => setMobileOpen(false)} className="py-2">
              Articles
            </Link>
            <Link
              href="/category/semiconductor-technology"
              onClick={() => setMobileOpen(false)}
              className="py-2"
            >
              Semiconductors
            </Link>
            <Link
              href="/category/artificial-intelligence"
              onClick={() => setMobileOpen(false)}
              className="py-2"
            >
              AI & Robotics
            </Link>
            <Link
              href="/category/tutorials-projects"
              onClick={() => setMobileOpen(false)}
              className="py-2"
            >
              Tutorials
            </Link>
            <Link href="/search" onClick={() => setMobileOpen(false)} className="py-2">
              Search
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
