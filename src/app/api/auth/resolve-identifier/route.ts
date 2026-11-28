import { NextResponse } from 'next/server';
import { getAdminDb } from '@/config/firebase-admin';
import { isPhoneIdentifier, normalizePhoneNumber } from '@/lib/phone';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const identifier = typeof body?.identifier === 'string' ? body.identifier.trim() : '';

    if (!identifier) {
      return NextResponse.json(
        { error: 'Please enter your mobile number or email address.' },
        { status: 400 }
      );
    }

    // If it's already an email, return it directly
    if (!isPhoneIdentifier(identifier)) {
      if (!identifier.includes('@')) {
        return NextResponse.json(
          { error: 'Please enter a valid email address or 10-digit mobile number.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ email: identifier.toLowerCase(), type: 'email' });
    }

    const phone = normalizePhoneNumber(identifier);
    if (!phone.valid) {
      return NextResponse.json(
        { error: phone.error || 'Please enter a valid mobile number.' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Mobile number lookup is unavailable right now. Please sign in with your email address.' },
        { status: 503 }
      );
    }

    // Query by normalized 10-digit phone first
    let snap = await adminDb
      .collection('users')
      .where('phoneNormalized', '==', phone.normalized)
      .limit(1)
      .get();

    // Fallback to E.164 format
    if (snap.empty) {
      snap = await adminDb
        .collection('users')
        .where('phone', '==', phone.e164)
        .limit(1)
        .get();
    }

    if (snap.empty) {
      return NextResponse.json(
        { error: 'No account found with this mobile number. Please check or create a new account.' },
        { status: 404 }
      );
    }

    const userData = snap.docs[0].data();
    const email = typeof userData?.email === 'string' ? userData.email.trim() : '';
    if (!email) {
      return NextResponse.json(
        { error: 'Account email could not be resolved. Please sign in with your email address.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ email, type: 'phone' });
  } catch (error) {
    console.error('Error resolving login identifier:', error);
    return NextResponse.json(
      { error: 'Failed to verify mobile number. Please try again.' },
      { status: 500 }
    );
  }
}
