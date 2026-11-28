import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getAdminDb } from '@/config/firebase-admin';
import { db } from '@/config/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { AdminEmailMessage } from '@/types';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_MAIN || process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 're_YOUR_RESEND_API_KEY') {
    return null;
  }
  return new Resend(apiKey);
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let payload: Record<string, unknown> = {};

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Extract event details
    const eventType = String(payload.type || payload.event || 'email.received');
    const eventData = (payload.data || payload) as Record<string, unknown>;

    // We process received emails or any inbound notification
    const resendEmailId = String(eventData.email_id || eventData.id || '');
    let from = String(eventData.from || 'sender@example.com');
    const to = Array.isArray(eventData.to)
      ? eventData.to.join(', ')
      : String(eventData.to || 'info@eihouseindia.in');
    let subject = String(eventData.subject || 'Incoming Email');
    let bodyHtml = String(eventData.html || '');
    let bodyText = String(eventData.text || '');

    // If body is missing but we have an email_id, fetch full content from Resend API
    if ((!bodyHtml && !bodyText) && resendEmailId) {
      const resend = getResendClient();
      if (resend) {
        try {
          const fetched = await resend.emails.get(resendEmailId);
          if (fetched.data) {
            const dataObj = fetched.data as unknown as Record<string, unknown>;
            from = typeof dataObj.from === 'string' ? dataObj.from : from;
            subject = typeof dataObj.subject === 'string' ? dataObj.subject : subject;
            bodyHtml = typeof dataObj.html === 'string' ? dataObj.html : '';
            bodyText = typeof dataObj.text === 'string' ? dataObj.text : '';
          }
        } catch (fetchErr) {
          console.warn('Failed to retrieve full email from Resend API:', fetchErr);
        }
      }
    }

    if (!bodyHtml && !bodyText) {
      bodyText = String(eventData.snippet || 'No message content provided.');
      bodyHtml = `<p>${bodyText}</p>`;
    }

    const emailId = `inbound_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newRecord: AdminEmailMessage = {
      id: emailId,
      folder: 'inbox',
      from,
      to,
      subject,
      bodyHtml: bodyHtml || `<p>${bodyText}</p>`,
      bodyText: bodyText || bodyHtml.replace(/<[^>]*>?/gm, ''),
      status: 'unread',
      isStarred: false,
      createdAt: new Date().toISOString(),
      resendId: resendEmailId || undefined,
      source: 'inbound_webhook',
      tags: [eventType],
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
      received: true,
      id: emailId,
      message: 'Inbound email received and saved to admin inbox',
    });
  } catch (error) {
    console.error('Error processing Resend webhook:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse inbound email' },
      { status: 500 }
    );
  }
}

// Support GET for Resend webhook ping / health check verification
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhooks/resend',
    service: 'EI HOUSE Resend Inbound Receiver',
    timestamp: new Date().toISOString(),
  });
}
