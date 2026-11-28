import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getAdminDb } from '@/config/firebase-admin';
import { db } from '@/config/firebase';
import { collection, getDocs, doc, setDoc, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { SITE_CONFIG } from '@/config/site';
import type { AdminEmailMessage, EmailFolder } from '@/types';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_MAIN || process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 're_YOUR_RESEND_API_KEY') {
    return null;
  }
  return new Resend(apiKey);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = (searchParams.get('folder') || 'all') as EmailFolder | 'all';
    const filter = searchParams.get('filter') || 'all'; // 'all' | 'unread' | 'starred'
    const searchQuery = (searchParams.get('q') || '').toLowerCase().trim();

    const emails: AdminEmailMessage[] = [];
    const adminDb = getAdminDb();

    if (adminDb) {
      let q = adminDb.collection('adminEmails').orderBy('createdAt', 'desc').limit(200);
      const snapshot = await q.get();
      snapshot.forEach((d) => {
        emails.push({ id: d.id, ...d.data() } as AdminEmailMessage);
      });
    } else {
      // Fallback to client SDK Firestore
      const snap = await getDocs(query(collection(db, 'adminEmails'), orderBy('createdAt', 'desc'), limit(200)));
      snap.forEach((d) => {
        emails.push({ id: d.id, ...d.data() } as AdminEmailMessage);
      });
    }

    let filtered = emails;
    if (folder !== 'all') {
      filtered = filtered.filter((m) => (m.folder || 'inbox') === folder);
    }
    if (filter === 'unread') {
      filtered = filtered.filter((m) => m.status === 'unread');
    } else if (filter === 'starred') {
      filtered = filtered.filter((m) => Boolean(m.isStarred));
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (m) =>
          m.subject?.toLowerCase().includes(searchQuery) ||
          m.from?.toLowerCase().includes(searchQuery) ||
          m.to?.toLowerCase().includes(searchQuery) ||
          m.bodyText?.toLowerCase().includes(searchQuery)
      );
    }

    return NextResponse.json({
      success: true,
      emails: filtered,
      total: filtered.length,
      resendConfigured: Boolean(getResendClient()),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch admin emails',
        emails: [],
        resendConfigured: Boolean(getResendClient()),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, bodyHtml, bodyText, cc, bcc, fromName, inReplyTo } = body;

    if (!to || !subject || (!bodyHtml && !bodyText)) {
      return NextResponse.json({ error: 'Missing required email fields (to, subject, body)' }, { status: 400 });
    }

    const resend = getResendClient();
    const defaultFrom = process.env.RESEND_FROM_EMAIL || `${SITE_CONFIG.name} <info@eihouseindia.in>`;
    const senderDisplay = fromName ? `${fromName} <info@eihouseindia.in>` : defaultFrom;

    let resendId: string | undefined = undefined;

    if (resend) {
      const emailHtml = bodyHtml || `<p>${bodyText || ''}</p>`;
      const emailText = bodyText || (bodyHtml ? bodyHtml.replace(/<[^>]*>?/gm, '') : '');

      const payload: {
        from: string;
        to: string | string[];
        subject: string;
        html: string;
        text?: string;
        cc?: string[];
        bcc?: string[];
        replyTo?: string;
      } = {
        from: senderDisplay,
        to: to.includes(',') ? to.split(',').map((s: string) => s.trim()) : to.trim(),
        subject,
        html: emailHtml,
        text: emailText,
        replyTo: 'info@eihouseindia.in',
      };

      if (cc) {
        payload.cc = cc.split(',').map((s: string) => s.trim());
      }
      if (bcc) {
        payload.bcc = bcc.split(',').map((s: string) => s.trim());
      }

      const sendResponse = await resend.emails.send(payload as Parameters<typeof resend.emails.send>[0]);
      if (sendResponse.error) {
        return NextResponse.json({ error: sendResponse.error.message }, { status: 502 });
      }
      resendId = sendResponse.data?.id;
    }

    const emailId = `mail_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newRecord: AdminEmailMessage = {
      id: emailId,
      folder: 'sent',
      from: senderDisplay,
      to,
      cc,
      bcc,
      subject,
      bodyHtml: bodyHtml || `<p>${bodyText}</p>`,
      bodyText: bodyText || bodyHtml.replace(/<[^>]*>?/gm, ''),
      status: 'read',
      isStarred: false,
      createdAt: new Date().toISOString(),
      resendId,
      source: 'composer',
      inReplyTo,
    };

    const adminDb = getAdminDb();
    if (adminDb) {
      await adminDb.collection('adminEmails').doc(emailId).set({
        ...newRecord,
        serverTimestamp: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'adminEmails', emailId), {
        ...newRecord,
        serverTimestamp: serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      message: resend ? 'Email sent successfully via Resend' : 'Email saved in local sent box (Resend unconfigured)',
      email: newRecord,
      resendDispatched: Boolean(resend),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error while sending email' },
      { status: 500 }
    );
  }
}
