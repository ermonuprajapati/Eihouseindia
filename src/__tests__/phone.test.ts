import { describe, it, expect } from 'vitest';
import { normalizePhoneNumber, isPhoneIdentifier } from '@/lib/phone';

describe('Phone normalization and identifier detection', () => {
  it('normalizes 10-digit Indian mobile numbers', () => {
    const res = normalizePhoneNumber('9876543210');
    expect(res.valid).toBe(true);
    expect(res.normalized).toBe('9876543210');
    expect(res.e164).toBe('+919876543210');
  });

  it('normalizes +91, 91, and 0-prefixed Indian mobile numbers', () => {
    expect(normalizePhoneNumber('+91 98765-43210')).toMatchObject({
      valid: true,
      normalized: '9876543210',
      e164: '+919876543210',
    });
    expect(normalizePhoneNumber('09876543210')).toMatchObject({
      valid: true,
      normalized: '9876543210',
      e164: '+919876543210',
    });
    expect(normalizePhoneNumber('919876543210')).toMatchObject({
      valid: true,
      normalized: '9876543210',
      e164: '+919876543210',
    });
  });

  it('rejects invalid mobile numbers', () => {
    expect(normalizePhoneNumber('12345').valid).toBe(false);
    expect(normalizePhoneNumber('1234567890').valid).toBe(false);
    expect(normalizePhoneNumber('').valid).toBe(false);
  });

  it('correctly distinguishes phone identifiers from email addresses', () => {
    expect(isPhoneIdentifier('9876543210')).toBe(true);
    expect(isPhoneIdentifier('+91 98765 43210')).toBe(true);
    expect(isPhoneIdentifier('user@eihouseindia.in')).toBe(false);
    expect(isPhoneIdentifier('98765@gmail.com')).toBe(false);
  });
});
