'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/modules/auth/auth-context';

function mapAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code || '';
  if (code === 'auth/operation-not-allowed') {
    return 'This sign-in provider is not enabled yet in Firebase Console (Authentication > Sign-in method).';
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Invalid email or password.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Google sign-in popup was closed before completion.';
  }
  return error instanceof Error ? error.message : 'Authentication failed.';
}

export default function LoginPage() {
  const router = useRouter();
  const { firebaseUser, loginWithEmail, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (firebaseUser) {
      router.replace('/dashboard');
    }
  }, [firebaseUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await loginWithEmail(email, password);
      toast.success('Signed in to EIHOUSE INDIA.');
      router.push('/dashboard');
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
      router.push('/dashboard');
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
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 space-y-6">
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-semibold text-[#0B1528]">
              Sign In to EIHOUSE INDIA
            </h1>
            <p className="text-sm text-slate-600">
              Access your contributor dashboard, drafts, and technical discussions.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="engineer@company.com"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password">Password</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs font-medium text-[#1D4ED8] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
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
            className="w-full"
            onClick={handleGoogle}
            disabled={submitting}
          >
            Continue with Google
          </Button>

          <p className="text-center text-sm text-slate-600">
            New contributor?{' '}
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
