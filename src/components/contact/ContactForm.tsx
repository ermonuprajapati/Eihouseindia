'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { contactSchema } from '@/lib/validation';
import { submitContactInquiry } from '@/modules/posts/post-service';

export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse({ name, email, subject, message });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Please check the form fields.');
      return;
    }

    setSending(true);
    try {
      await submitContactInquiry(parsed.data);

      // Non-blocking email dispatch to Founder & Administrator desk
      fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'ADMIN_CONTACT_INQUIRY',
          recipientName: 'Monu Prajapati',
          senderName: parsed.data.name,
          senderEmail: parsed.data.email,
          subject: parsed.data.subject,
          message: parsed.data.message,
        }),
      }).catch((err) => console.warn('Inquiry notification email dispatch:', err));

      setSent(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      toast.success('Message delivered to the executive & editorial desk.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to send message.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 space-y-3">
        <h2 className="font-display text-2xl font-semibold text-[#0B1528]">Message Received</h2>
        <p className="text-sm text-slate-600">
          Thank you for contacting EIHOUSE INDIA. Our editorial and engineering team will review
          your inquiry and respond via email.
        </p>
        <Button type="button" variant="outline" onClick={() => setSent(false)}>
          Send Another Inquiry
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-6 sm:p-8 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact-name">Full Name</Label>
          <Input
            id="contact-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ananya Sharma"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-email">Email Address</Label>
          <Input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ananya@example.com"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-subject">Subject</Label>
        <Input
          id="contact-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Editorial inquiry, partnership, or technical correction"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-message">Message</Label>
        <Textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Provide context, relevant links, or technical details..."
          rows={5}
          required
        />
      </div>

      <Button type="submit" variant="primary" disabled={sending}>
        {sending ? 'Sending...' : 'Send Message'}
      </Button>
    </form>
  );
}
