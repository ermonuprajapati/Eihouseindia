import { describe, it, expect } from 'vitest';
import { sendEditorialEmail } from '@/modules/email/email-service';

describe('Email Service', () => {
  it('returns unconfigured gracefully when RESEND_API_KEY is not set or placeholder', async () => {
    const originalKey = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = 're_YOUR_RESEND_API_KEY';

    const result = await sendEditorialEmail({
      to: 'test@example.com',
      event: 'WELCOME',
      recipientName: 'Devang',
    });

    expect(result.sent).toBe(false);
    expect(result.provider).toBe('unconfigured');

    process.env.RESEND_API_KEY = originalKey;
  });
});
