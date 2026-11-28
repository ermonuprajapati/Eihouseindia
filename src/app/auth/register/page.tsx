'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, Phone, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/modules/auth/auth-context';
import { mapAuthError } from '@/lib/auth-errors';
import { normalizePhoneNumber } from '@/lib/phone';

function getSafeRedirectPath(): string {
  if (typeof window === 'undefined') return '/dashboard';
  const raw = new URLSearchParams(window.location.search).get('redirect') || '';
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return '/dashboard';
}

export default function RegisterPage() {
  const router = useRouter();
  const { firebaseUser, registerWithEmail, loginWithGoogle } = useAuth();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Popup state when user already has an account (by phone or email)
  const [existingDialog, setExistingDialog] = useState<{
    open: boolean;
    reason: string;
    identifier: string;
  }>({ open: false, reason: '', identifier: '' });

  useEffect(() => {
    if (firebaseUser) {
      router.replace(getSafeRedirectPath());
    }
  }, [firebaseUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedPhone = normalizePhoneNumber(phone);
    if (!parsedPhone.valid) {
      toast.error(parsedPhone.error || 'Please enter a valid 10-digit mobile number.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await registerWithEmail({
        phone: parsedPhone.e164,
        email: cleanEmail,
        password,
      });
      toast.success('Account created! Please check your email inbox to verify your account.');
      router.push(getSafeRedirectPath());
    } catch (error) {
      const code = (error as { code?: string })?.code || '';
      const msg = error instanceof Error ? error.message : String(error);

      if (
        code === 'auth/email-already-in-use' ||
        msg.toLowerCase().includes('already exists') ||
        msg.toLowerCase().includes('already registered')
      ) {
        const isPhoneConflict = msg.toLowerCase().includes('mobile') || msg.toLowerCase().includes('phone');
        setExistingDialog({
          open: true,
          reason: isPhoneConflict
            ? `The mobile number ${parsedPhone.e164} is already linked to an existing EI HOUSE account.`
            : `The email address ${cleanEmail} is already registered with an existing EI HOUSE account.`,
          identifier: isPhoneConflict ? parsedPhone.normalized : cleanEmail,
        });
      } else {
        toast.error(mapAuthError(error));
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
              Create Your Account
            </h1>
            <p className="text-sm text-slate-600">
              Save your 3D Engineering Lab projects, enroll in courses, and publish articles.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Mobile Number */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-phone" className="text-slate-700 font-medium">
                Mobile Number
              </Label>
              <div className="relative flex items-center">
                <span className="absolute left-3 flex items-center gap-1 text-xs font-semibold text-slate-500 select-none">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  +91
                </span>
                <Input
                  id="reg-phone"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="pl-14"
                  autoComplete="tel"
                  required
                />
              </div>
            </div>

            {/* 2. Email Address */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-email" className="text-slate-700 font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-9"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* 3. Create Password */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-password" className="text-slate-700 font-medium">
                Create Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="pl-9 pr-10"
                  minLength={8}
                  autoComplete="new-password"
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
            className="w-full h-10"
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

      {/* Account Already Exists Popup */}
      <Dialog
        open={existingDialog.open}
        onOpenChange={(open) => setExistingDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <UserCheck className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-xl font-bold text-[#0B1528]">
              Account Already Exists
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-slate-600">
              {existingDialog.reason}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-600 text-center">
            You can sign in directly using your mobile number or email, or reset your password via Email OTP if you forgot it.
          </div>

          <DialogFooter className="flex flex-col sm:flex-col gap-2 pt-2">
            <Button
              type="button"
              variant="primary"
              className="w-full h-10 font-semibold"
              onClick={() => {
                setExistingDialog((prev) => ({ ...prev, open: false }));
                router.push(`/auth/login?identifier=${encodeURIComponent(existingDialog.identifier)}`);
              }}
            >
              Sign In to Existing Account
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full h-10"
              onClick={() => {
                setExistingDialog((prev) => ({ ...prev, open: false }));
                router.push(`/auth/forgot-password?identifier=${encodeURIComponent(existingDialog.identifier)}`);
              }}
            >
              Forgot Password? Reset via Email OTP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
}
