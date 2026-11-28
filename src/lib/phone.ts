export interface NormalizedPhoneResult {
  valid: boolean;
  normalized: string;
  e164: string;
  error?: string;
}

/**
 * Normalizes an Indian or international mobile number.
 * - Strips spaces, hyphens, parentheses, and dots.
 * - Normalizes 10-digit Indian numbers (starting 6-9), 0-prefixed 11-digit,
 *   and +91/91-prefixed 12-digit numbers to a canonical 10-digit `normalized`
 *   key and `+91XXXXXXXXXX` E.164 string.
 */
export function normalizePhoneNumber(raw: string): NormalizedPhoneResult {
  const cleaned = String(raw || '').trim().replace(/[\s\-().]/g, '');

  if (!cleaned) {
    return { valid: false, normalized: '', e164: '', error: 'Mobile number is required.' };
  }

  // Indian 10-digit format: 6-9 followed by 9 digits
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return {
      valid: true,
      normalized: cleaned,
      e164: `+91${cleaned}`,
    };
  }

  // Indian with leading 0: 0 + 10 digits
  if (/^0[6-9]\d{9}$/.test(cleaned)) {
    const ten = cleaned.slice(1);
    return {
      valid: true,
      normalized: ten,
      e164: `+91${ten}`,
    };
  }

  // Indian with 91 or +91 prefix
  if (/^(?:\+?91)[6-9]\d{9}$/.test(cleaned)) {
    const ten = cleaned.slice(-10);
    return {
      valid: true,
      normalized: ten,
      e164: `+91${ten}`,
    };
  }

  // General international E.164 (+ followed by 8 to 15 digits)
  if (/^\+[1-9]\d{7,14}$/.test(cleaned)) {
    return {
      valid: true,
      normalized: cleaned.slice(1),
      e164: cleaned,
    };
  }

  return {
    valid: false,
    normalized: '',
    e164: '',
    error: 'Please enter a valid 10-digit mobile number (e.g. 9876543210).',
  };
}

/**
 * Returns true if the login identifier looks like a phone number rather than an email.
 */
export function isPhoneIdentifier(identifier: string): boolean {
  const trimmed = String(identifier || '').trim();
  if (!trimmed || trimmed.includes('@')) return false;
  const stripped = trimmed.replace(/[\s\-().+]/g, '');
  return /^\d{7,15}$/.test(stripped);
}
