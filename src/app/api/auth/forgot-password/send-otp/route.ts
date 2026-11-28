import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/config/firebase-admin';
import { hashEmailKey, hashOtp, maskEmail, resolveEmailFromIdentifier } from '@/lib/auth-server';
import { sendEditorialEmail } from '@/modules/email/email-service';

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const identifier = typeof body?.identifier === 'string' ? body.identifier.trim() : '';

    const adminDb = getAdminDb();
    const adminAuth = getAdminAuth();
    if (!adminDb || !adminAuth) {
      return NextResponse.json(
        { error: 'Password reset service is not configured on this server.' },
        { status: 503 }
      );
    }

    const resolved = await resolveEmailFromIdentifier(adminDb, identifier);
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const { email, displayName } = resolved;

    // Verify user actually exists in Firebase Auth
    try {
      await adminAuth.getUserByEmail(email);
    } catch {
      return NextResponse.json(
        { error: 'No account found with this email or mobile number.' },
        { status: 404 }
      );
    }

    const docId = hashEmailKey(email);
    const otpRef = adminDb.collection('passwordResetOtps').doc(docId);
    const existingSnap = await otpRef.get();

    if (existingSnap.exists) {
      const existingData = existingSnap.data();
      const lastSentAt = typeof existingData?.createdAt === 'number' ? existingData.createdAt : 0;
      const elapsed = Date.now() - lastSentAt;
      if (elapsed < RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        return NextResponse.json(
          { error: `Please wait ${waitSec}s before requesting another OTP.` },
          { status: 429 }
        );
      }
    }

    const otpCode = crypto.randomInt(100000, 999999).toString();
    const now = Date.now();

    await otpRef.set({
      email,
      otpHash: hashOtp(otpCode, email),
      expiresAt: now + OTP_EXPIRY_MS,
      attempts: 0,
      createdAt: now,
    });

    const mailRes = await sendEditorialEmail({
      to: email,
      event: 'PASSWORD_RESET_OTP',
      recipientName: displayName,
      otpCode,
      fromAccount: 'info',
    });

    if (!mailRes.sent) {
      return NextResponse.json(
        { error: mailRes.reason || 'Failed to send OTP email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      maskedEmail: maskEmail(email),
      message: `6-digit OTP sent to ${maskEmail(email)}`,
    });
  } catch (error) {
    console.error('Send password reset OTP error:', error);
    return NextResponse.json(
      { error: 'Unable to send password reset OTP right now.' },
      { status: 500 }
    );
  }
}
