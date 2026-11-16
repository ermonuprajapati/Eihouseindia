'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function NewsletterForm({ source = 'homepage' }: { source?: string }) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const [{ newsletterSchema }, { subscribeToNewsletter }] = await Promise.all([
        import('@/lib/validation'),
        import('@/modules/posts/post-service'),
      ]);
      const parsed = newsletterSchema.safeParse({ email });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message || 'Enter a valid email address');
        return;
      }

      await subscribeToNewsletter(parsed.data.email, source);
      setSubscribed(true);
      setEmail('');
      toast.success('Subscribed to the EIHOUSE INDIA technical briefing.');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not complete subscription right now.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (subscribed) {
    return (
      <div className="rounded-md border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
        Subscription confirmed. You will receive curated electronics, semiconductor, and AI briefings.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="engineer@company.com"
        aria-label="Email address for newsletter"
        required
        className="h-11 bg-white text-[#0B1528] border-slate-300"
      />
      <Button type="submit" variant="primary" size="lg" disabled={submitting}>
        {submitting ? 'Subscribing...' : 'Subscribe'}
      </Button>
    </form>
  );
}
