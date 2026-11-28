import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getAdminDb } from '@/config/firebase-admin';
import { db } from '@/config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { AdminEmailMessage } from '@/types';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_MAIN || process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 're_YOUR_RESEND_API_KEY') {
    return null;
  }
  return new Resend(apiKey);
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      clean[key] = val;
    }
  }
  return clean;
}

export async function POST() {
  try {
    const resend = getResendClient();
    if (!resend) {
      return NextResponse.json(
        { error: 'Resend API key not configured', syncedCount: 0 },
        { status: 503 }
      );
    }

    // List recent inbound emails stored on Resend infrastructure
    const listRes = await resend.emails.receiving.list();
    if (listRes.error) {
      console.warn('Resend receiving.list error:', listRes.error);
      return NextResponse.json(
        { error: listRes.error.message || 'Failed to list emails from Resend', syncedCount: 0 },
        { status: 400 }
      );
    }

    const items = listRes.data?.data || [];
    let syncedCount = 0;
    const adminDb = getAdminDb();

    for (const item of items) {
      const emailDocId = `inbound_${item.id}`;

      // Check if already synced in Firestore
      let alreadyExists = false;
      if (adminDb) {
        const snap = await adminDb.collection('adminEmails').doc(emailDocId).get();
        alreadyExists = snap.exists;
      } else {
        const snap = await getDoc(doc(db, 'adminEmails', emailDocId));
        alreadyExists = snap.exists();
      }

      if (!alreadyExists) {
        // Fetch full email content (HTML, text, headers) from Resend
        let bodyHtml = '';
        let bodyText = '';
        let senderEmail = item.from;
        let recipientTo = Array.isArray(item.to) ? item.to.join(', ') : String(item.to || 'info@eihouseindia.in');
        let subject = item.subject || 'Incoming Email';

        try {
          const detailRes = await resend.emails.receiving.get(item.id);
          if (detailRes.data) {
            bodyHtml = detailRes.data.html || '';
            bodyText = detailRes.data.text || '';
            senderEmail = detailRes.data.from || senderEmail;
            subject = detailRes.data.subject || subject;
            if (Array.isArray(detailRes.data.to)) {
              recipientTo = detailRes.data.to.join(', ');
            }
          }
        } catch (detailErr) {
          console.warn(`Could not retrieve full body for email ${item.id}:`, detailErr);
        }

        if (!bodyHtml && !bodyText) {
          bodyText = 'No message content available.';
          bodyHtml = '<p>No message content available.</p>';
        }

        const newEmail: AdminEmailMessage = {
          id: emailDocId,
          resendId: item.id,
          folder: 'inbox',
          from: senderEmail,
          to: recipientTo,
          subject,
          bodyHtml: bodyHtml || `<p>${bodyText}</p>`,
          bodyText: bodyText || bodyHtml.replace(/<[^>]*>?/gm, ''),
          status: 'unread',
          isStarred: false,
          createdAt: item.created_at || new Date().toISOString(),
          source: 'inbound_webhook',
          tags: ['resend_receiving'],
        };

        const cleanDoc = stripUndefined(newEmail as unknown as Record<string, unknown>);

        if (adminDb) {
          await adminDb.collection('adminEmails').doc(emailDocId).set(cleanDoc);
        } else {
          await setDoc(doc(db, 'adminEmails', emailDocId), cleanDoc);
        }

        syncedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      syncedCount,
      totalReceived: items.length,
      message: `Successfully synced ${syncedCount} new email(s) from Resend.`,
    });
  } catch (error) {
    console.error('Error in Resend mail sync:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed', syncedCount: 0 },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
