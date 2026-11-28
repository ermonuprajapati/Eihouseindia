'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/modules/auth/auth-context';
import { mapAuthError } from '@/lib/auth-errors';

function getSafeRedirectPath(): string {
  if (typeof window === 'undefined') return '/dashboard';
  const raw = new URLSearchParams(window.location.search).get('redirect') || '';
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return '/dashboard';
}

export default function LoginPage() {
  const router = useRouter();
  const { firebaseUser, loginWithEmail, loginWithGoogle } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const prefill = new URLSearchParams(window.location.search).get('identifier');
      if (prefill) setIdentifier(prefill);
    }
  }, []);

  useEffect(() => {
    if (firebaseUser) {
      router.replace(getSafeRedirectPath());
    }
  }, [firebaseUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error('Please enter your mobile number or email.');
      return;
    }
    setSubmitting(true);
    try {
      await loginWithEmail(identifier, password);
      toast.success('Signed in to EIHOUSE INDIA.');
      router.push(getSafeRedirectPath());
    } catch (error) {
      toast.error(mapAuthError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    try {
      await loginWithGoogle();
      toast.success('Signed in with Google.');
      router.push(getSafeRedirectPath());
    } catch (error) {
      toast.error(mapAuthError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-14">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
          <div className="space-y-3 text-center">
            <Link href="/" className="inline-block">
              <Image
                src="/images/logo.png"
                alt="EIHOUSE INDIA Logo"
                width={56}
                height={56}
                className="mx-auto h-14 w-14 object-contain rounded"
                priority
              />
            </Link>
            <h1 className="font-display text-2xl font-semibold text-[#0B1528]">
              Sign In to EIHOUSE INDIA
            </h1>
            <p className="text-sm text-slate-600">
              Sign in with your mobile number or email to access your projects, courses, and dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-identifier" className="text-slate-700 font-medium">
                Mobile Number or Email
              </Label>
              <div className="relative">
                <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="login-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="9876543210 or you@example.com"
                  className="pl-9"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password" className="text-slate-700 font-medium">
                  Password
                </Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs font-medium text-[#1D4ED8] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-9 pr-10"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full h-10 font-semibold" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-10"
            onClick={handleGoogle}
            disabled={submitting}
          >
            Continue with Google
          </Button>

          <p className="text-center text-sm text-slate-600">
            New here?{' '}
            <Link href="/auth/register" className="font-medium text-[#1D4ED8] hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
