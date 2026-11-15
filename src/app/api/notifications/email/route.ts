import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendEditorialEmail } from '@/modules/email/email-service';
import { SITE_CONFIG } from '@/config/site';

const emailRequestSchema = z.object({
  to: z.string().email().optional(),
  event: z.enum([
    'WELCOME',
    'EMAIL_VERIFICATION_NOTICE',
    'ARTICLE_SUBMITTED',
    'ARTICLE_APPROVED',
    'ARTICLE_REJECTED',
    'CHANGES_REQUESTED',
    'ACCOUNT_NOTICE',
    'ADMIN_POST_SUBMITTED',
    'ADMIN_CONTACT_INQUIRY',
    'ADMIN_INQUIRY_REPLY',
  ]),
  recipientName: z.string().min(1).max(100),
  articleTitle: z.string().max(160).optional(),
  articleSlug: z.string().max(140).optional(),
  reason: z.string().max(500).optional(),
  customMessage: z.string().max(2000).optional(),
  senderName: z.string().max(120).optional(),
  senderEmail: z.string().email().optional(),
  subject: z.string().max(200).optional(),
  message: z.string().max(5000).optional(),
  authorName: z.string().max(120).optional(),
  authorEmail: z.string().email().optional(),
  category: z.string().max(100).optional(),
  excerpt: z.string().max(1000).optional(),
});

// Cache recently dispatched welcome emails to prevent duplicate sends during fast reloads
const sentWelcomeCache = new Set<string>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = emailRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid email payload' },
        { status: 400 }
      );
    }

    const { event } = parsed.data;
    const targetTo =
      parsed.data.to ||
      (event === 'ADMIN_POST_SUBMITTED' || event === 'ADMIN_CONTACT_INQUIRY'
        ? SITE_CONFIG.bootstrapAdminEmail
        : '');

    if (!targetTo) {
      return NextResponse.json({ error: 'Recipient email address is required.' }, { status: 400 });
    }

    if (event === 'WELCOME') {
      const normalizedTo = targetTo.trim().toLowerCase();
      if (sentWelcomeCache.has(normalizedTo)) {
        return NextResponse.json(
          { sent: true, provider: 'resend', reason: 'Welcome email already delivered to this recipient.' },
          { status: 200 }
        );
      }
      sentWelcomeCache.add(normalizedTo);
    }

    const result = await sendEditorialEmail({
      ...parsed.data,
      to: targetTo,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process email notification' },
      { status: 500 }
    );
  }
}
