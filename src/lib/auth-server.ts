import crypto from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { isPhoneIdentifier, normalizePhoneNumber } from '@/lib/phone';

export function hashOtp(otp: string, email: string): string {
  return crypto
    .createHash('sha256')
    .update(`${otp.trim()}:${email.trim().toLowerCase()}`)
    .digest('hex');
}

export function hashEmailKey(email: string): string {
  return crypto
    .createHash('sha256')
    .update(email.trim().toLowerCase())
    .digest('hex');
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0] || '*'}***@${domain}`;
  return `${local.slice(0, 2)}${'*'.repeat(Math.min(5, Math.max(2, local.length - 2)))}@${domain}`;
}

/**
 * Resolves either an email address or a mobile number to a user's registered email & displayName.
 */
export async function resolveEmailFromIdentifier(
  adminDb: Firestore,
  rawIdentifier: string
): Promise<{ email: string; displayName: string } | { error: string; status: number }> {
  const identifier = rawIdentifier.trim();
  if (!identifier) {
    return { error: 'Please enter your mobile number or email address.', status: 400 };
  }

  if (!isPhoneIdentifier(identifier)) {
    if (!identifier.includes('@')) {
      return { error: 'Please enter a valid email address or 10-digit mobile number.', status: 400 };
    }
    const cleanEmail = identifier.toLowerCase();
    const snap = await adminDb
      .collection('users')
      .where('email', '==', cleanEmail)
      .limit(1)
      .get();
    const displayName = !snap.empty
      ? String(snap.docs[0].data()?.displayName || cleanEmail.split('@')[0])
      : cleanEmail.split('@')[0];
    return { email: cleanEmail, displayName };
  }

  const phone = normalizePhoneNumber(identifier);
  if (!phone.valid) {
    return { error: phone.error || 'Please enter a valid mobile number.', status: 400 };
  }

  let snap = await adminDb
    .collection('users')
    .where('phoneNormalized', '==', phone.normalized)
    .limit(1)
    .get();

  if (snap.empty) {
    snap = await adminDb
      .collection('users')
      .where('phone', '==', phone.e164)
      .limit(1)
      .get();
  }

  if (snap.empty) {
    return {
      error: 'No account found with this mobile number. Please check or create a new account.',
      status: 404,
    };
  }

  const data = snap.docs[0].data();
  const email = typeof data?.email === 'string' ? data.email.trim().toLowerCase() : '';
  if (!email) {
    return { error: 'No email linked to this mobile number.', status: 404 };
  }

  return {
    email,
    displayName: String(data?.displayName || email.split('@')[0]),
  };
}
