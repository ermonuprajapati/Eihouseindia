import { NextResponse } from 'next/server';
import { getAdminDb } from '@/config/firebase-admin';
import { normalizePhoneNumber } from '@/lib/phone';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const rawPhone = typeof body?.phone === 'string' ? body.phone.trim() : '';

    const parsed = normalizePhoneNumber(rawPhone);
    if (!parsed.valid) {
      return NextResponse.json(
        { available: false, error: parsed.error || 'Invalid mobile number.' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      // Allow signup to proceed if Admin SDK is not configured in local dev
      return NextResponse.json({
        available: true,
        normalized: parsed.normalized,
        e164: parsed.e164,
      });
    }

    const existing = await adminDb
      .collection('users')
      .where('phoneNormalized', '==', parsed.normalized)
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json(
        {
          available: false,
          error: 'An account with this mobile number already exists. Please sign in instead.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      available: true,
      normalized: parsed.normalized,
      e164: parsed.e164,
    });
  } catch (error) {
    console.error('Error checking phone availability:', error);
    return NextResponse.json(
      { available: true }, // Don't block signup on transient server error
      { status: 200 }
    );
  }
}
