import { NextResponse } from 'next/server';
import { isFirebaseAdminConfigured } from '@/config/firebase-admin';
import { firebaseConfig } from '@/config/firebase';

export async function GET() {
  const resendApiKey = process.env.RESEND_API_MAIN || process.env.RESEND_API_KEY;
  return NextResponse.json({
    status: 'ok',
    projectId: firebaseConfig.projectId,
    firebaseAdminConfigured: isFirebaseAdminConfigured(),
    resendConfigured: Boolean(
      resendApiKey && resendApiKey !== 're_YOUR_RESEND_API_KEY'
    ),
    timestamp: new Date().toISOString(),
  });
}
