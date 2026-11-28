import { NextResponse } from 'next/server';
import { getAdminDb } from '@/config/firebase-admin';
import { db } from '@/config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import type { AdminEmailMessage } from '@/types';

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      clean[key] = val;
    }
  }
  return clean;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const senderName = body.senderName || 'Dr. Vikram Malhotra';
    const senderEmail = body.senderEmail || 'v.malhotra@iitd.ac.in';
    const subject = body.subject || 'Inquiry: Collaboration on Hardware Engineering Lab & RTOS Research';
    const message =
      body.message ||
      `Dear EI HOUSE Editorial Team,

I recently explored your Virtual Engineering Lab and Component Taxonomy for STM32 and Power Electronics. The depth of the simulation and technical accuracy is outstanding.

Our research group at IIT Delhi is keen to collaborate on creating practical educational modules for Indian engineering students. Could you please let us know the best time for a brief discussion?

Warm regards,
${senderName}
Department of Electrical Engineering
IIT Delhi`;

    const emailId = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newRecord: AdminEmailMessage = {
      id: emailId,
      folder: 'inbox',
      from: `${senderName} <${senderEmail}>`,
      to: 'EIHOUSE INDIA <info@eihouseindia.in>',
      subject,
      bodyText: message,
      bodyHtml: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
        <p>Dear EI HOUSE Editorial Team,</p>
        <p>I recently explored your <strong>Virtual Engineering Lab</strong> and Component Taxonomy for STM32 and Power Electronics. The depth of the simulation and technical accuracy is outstanding.</p>
        <p>Our research group at IIT Delhi is keen to collaborate on creating practical educational modules for Indian engineering students. Could you please let us know the best time for a brief discussion?</p>
        <p style="margin-top: 24px;">Warm regards,<br/><strong>${senderName}</strong><br/>Department of Electrical Engineering<br/>IIT Delhi</p>
      </div>`,
      status: 'unread',
      isStarred: false,
      createdAt: new Date().toISOString(),
      source: 'simulation',
      tags: ['Test Inbound', 'Collaboration'],
    };

    const docData = stripUndefined(newRecord as unknown as Record<string, unknown>);

    const adminDb = getAdminDb();
    if (adminDb) {
      await adminDb.collection('adminEmails').doc(emailId).set(docData);
    } else {
      await setDoc(doc(db, 'adminEmails', emailId), docData);
    }

    return NextResponse.json({
      success: true,
      message: 'Simulated inbound email created in inbox',
      email: newRecord,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Simulation failed' },
      { status: 500 }
    );
  }
}
