import { NextResponse } from 'next/server';
import { isFirebaseAdminConfigured } from '@/config/firebase-admin';
import { firebaseConfig } from '@/config/firebase';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    projectId: firebaseConfig.projectId,
    firebaseAdminConfigured: isFirebaseAdminConfigured(),
    resendConfigured: Boolean(
      process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_YOUR_RESEND_API_KEY'
    ),
    timestamp: new Date().toISOString(),
  });
}
