import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/config/firebase-admin';
import { hashEmailKey, hashOtp, resolveEmailFromIdentifier } from '@/lib/auth-server';

const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const identifier = typeof body?.identifier === 'string' ? body.identifier.trim() : '';
    const otp = typeof body?.otp === 'string' ? body.otp.trim() : '';
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json({ error: 'Please enter the 6-digit OTP.' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

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

    const { email } = resolved;
    const docId = hashEmailKey(email);
    const otpRef = adminDb.collection('passwordResetOtps').doc(docId);
    const snap = await otpRef.get();

    if (!snap.exists) {
      return NextResponse.json(
        { error: 'OTP not found or already used. Please request a new OTP.' },
        { status: 400 }
      );
    }

    const data = snap.data() as {
      otpHash: string;
      expiresAt: number;
      attempts: number;
    };

    if (Date.now() > data.expiresAt) {
      await otpRef.delete().catch(() => undefined);
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new 6-digit OTP.' },
        { status: 400 }
      );
    }

    if ((data.attempts || 0) >= MAX_ATTEMPTS) {
      await otpRef.delete().catch(() => undefined);
      return NextResponse.json(
        { error: 'Too many invalid OTP attempts. Please request a new OTP.' },
        { status: 429 }
      );
    }

    const expectedBuf = Buffer.from(data.otpHash, 'hex');
    const actualBuf = Buffer.from(hashOtp(otp, email), 'hex');
    const isMatch =
      expectedBuf.length === actualBuf.length &&
      crypto.timingSafeEqual(expectedBuf, actualBuf);

    if (!isMatch) {
      const nextAttempts = (data.attempts || 0) + 1;
      await otpRef.update({ attempts: nextAttempts });
      const remaining = Math.max(0, MAX_ATTEMPTS - nextAttempts);
      return NextResponse.json(
        {
          error:
            remaining > 0
              ? `Invalid OTP. ${remaining} attempt(s) remaining.`
              : 'Too many invalid attempts. Please request a new OTP.',
        },
        { status: 400 }
      );
    }

    // Update user password in Firebase Auth
    const userRecord = await adminAuth.getUserByEmail(email);
    await adminAuth.updateUser(userRecord.uid, { password: newPassword });

    // Single-use guarantee: delete OTP document immediately
    await otpRef.delete().catch(() => undefined);

    return NextResponse.json({
      success: true,
      email,
      message: 'Password updated successfully! You can now sign in with your new password.',
    });
  } catch (error) {
    console.error('Verify password reset OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password. Please try again.' },
      { status: 500 }
    );
  }
}
