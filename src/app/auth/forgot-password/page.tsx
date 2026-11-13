'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/modules/auth/auth-context';

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
      toast.success('Password reset email dispatched via Firebase.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send reset email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-14">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 space-y-6">
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
              Reset Password
            </h1>
            <p className="text-sm text-slate-600">
              Enter your registered email address to receive a Firebase password reset link.
            </p>
          </div>

          {sent ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-3">
              <p>If an account exists for <strong>{email}</strong>, a password reset link has been sent.</p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/auth/login">Return to Sign In</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email Address</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@company.com"
                  required
                />
              </div>

              <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
                {submitting ? 'Sending link...' : 'Send Reset Link'}
              </Button>
            </form>
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
