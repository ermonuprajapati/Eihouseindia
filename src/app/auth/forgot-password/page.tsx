'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Lock, MailCheck, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'verify' | 'done'>('request');
  const [identifier, setIdentifier] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const prefill = new URLSearchParams(window.location.search).get('identifier');
      if (prefill) setIdentifier(prefill);
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) {
      toast.error('Please enter your registered mobile number or email.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Could not send OTP.');
        return;
      }

      setMaskedEmail(data.maskedEmail || identifier.trim());
      setStep('verify');
      setCooldown(30);
      toast.success(data.message || '6-digit OTP sent to your email.');
    } catch {
      toast.error('Network error while sending OTP.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      toast.error('Please enter the 6-digit OTP sent to your email.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/forgot-password/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          otp: cleanOtp,
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'OTP verification failed.');
        return;
      }

      setStep('done');
      toast.success('Password reset successfully!');
    } catch {
      toast.error('Network error while resetting password.');
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
              {step === 'done' ? 'Password Updated!' : 'Reset Password via Email OTP'}
            </h1>
            <p className="text-sm text-slate-600">
              {step === 'request' &&
                'Enter your registered mobile number or email address. We will send a 6-digit OTP to your email.'}
              {step === 'verify' &&
                `Enter the 6-digit OTP sent to ${maskedEmail} and create your new password.`}
              {step === 'done' &&
                'Your password has been updated. You can now sign in with your mobile number or email.'}
            </p>
          </div>

          {step === 'request' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reset-identifier" className="text-slate-700 font-medium">
                  Mobile Number or Email
                </Label>
                <div className="relative">
                  <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="reset-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="9876543210 or you@example.com"
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <Button type="submit" variant="primary" className="w-full h-10 font-semibold" disabled={submitting}>
                {submitting ? 'Sending OTP...' : 'Send Email OTP'}
              </Button>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex items-center gap-2.5 rounded-lg bg-blue-50 border border-blue-200 px-3.5 py-2.5 text-xs text-blue-800">
                <MailCheck className="h-4 w-4 shrink-0 text-blue-600" />
                <span>
                  OTP sent to <strong>{maskedEmail}</strong> (valid for 10 mins)
                </span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reset-otp" className="text-slate-700 font-medium">
                  6-Digit Email OTP
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="reset-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="pl-9 tracking-[0.25em] font-mono text-base font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-slate-700 font-medium">
                  New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-slate-700 font-medium">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="pl-9"
                    minLength={8}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <Button type="submit" variant="primary" className="w-full h-10 font-semibold" disabled={submitting}>
                {submitting ? 'Verifying & Resetting...' : 'Verify OTP & Reset Password'}
              </Button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep('request');
                    setOtp('');
                  }}
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Change email/mobile
                </button>
                <button
                  type="button"
                  disabled={cooldown > 0 || submitting}
                  onClick={() => void handleSendOtp()}
                  className="font-medium text-[#1D4ED8] hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                >
                  {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}

          {step === 'done' && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <Button
                type="button"
                variant="primary"
                className="w-full h-10 font-semibold"
                onClick={() => router.push(`/auth/login?identifier=${encodeURIComponent(identifier)}`)}
              >
                Go to Sign In
              </Button>
            </div>
          )}

          <p className="text-center text-sm text-slate-600">
            Remembered your password?{' '}
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
