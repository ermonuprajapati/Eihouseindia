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
import { USERNAME_PATTERN } from '@/lib/validation';

export default function RegisterPage() {
  const router = useRouter();
  const { firebaseUser, registerWithEmail, loginWithGoogle } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
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
    const cleanUsername = username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(cleanUsername)) {
      toast.error('Username must be 3-30 lowercase letters, numbers, or underscores.');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await registerWithEmail({
        email,
        password,
        displayName,
        username: cleanUsername,
      });
      toast.success('Account created! Please check your inbox to verify your email.');
      router.push('/dashboard');
    } catch (error) {
      const code = (error as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed') {
        toast.error('Enable Email/Password sign-in in Firebase Console (Authentication > Sign-in method).');
      } else if (code === 'auth/email-already-in-use') {
        toast.error('An account with this email already exists.');
      } else {
        toast.error(error instanceof Error ? error.message : 'Registration failed.');
      }
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
      toast.error(error instanceof Error ? error.message : 'Google sign-in failed.');
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
              Join EIHOUSE INDIA
            </h1>
            <p className="text-sm text-slate-600">
              Create your contributor profile to draft, submit, and publish engineering articles.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-name">Full Name</Label>
              <Input
                id="reg-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Rohan Kulkarni"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-username">Public Username</Label>
              <Input
                id="reg-username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="rohan_kulkarni"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rohan@company.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-password">Password (min 8 characters)</Label>
              <Input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>

            <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
              {submitting ? 'Creating account...' : 'Create Account'}
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
            Already registered?{' '}
            <Link href="/auth/login" className="font-medium text-[#1D4ED8] hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
