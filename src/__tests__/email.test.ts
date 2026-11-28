import { describe, it, expect } from 'vitest';
import { sendEditorialEmail } from '@/modules/email/email-service';

describe('Email Service', () => {
  it('returns unconfigured gracefully when RESEND_API_MAIN or RESEND_API_KEY is not set or placeholder', async () => {
    const originalMain = process.env.RESEND_API_MAIN;
    const originalKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_MAIN;
    process.env.RESEND_API_KEY = 're_YOUR_RESEND_API_KEY';

    const result = await sendEditorialEmail({
      to: 'test@example.com',
      event: 'WELCOME',
      recipientName: 'Devang',
    });

    expect(result.sent).toBe(false);
    expect(result.provider).toBe('unconfigured');

    // Also test with RESEND_API_MAIN placeholder
    process.env.RESEND_API_MAIN = 're_YOUR_RESEND_API_KEY';
    delete process.env.RESEND_API_KEY;

    const resultMain = await sendEditorialEmail({
      to: 'test@example.com',
      event: 'WELCOME',
      recipientName: 'Devang',
    });

    expect(resultMain.sent).toBe(false);
    expect(resultMain.provider).toBe('unconfigured');

    process.env.RESEND_API_MAIN = originalMain;
    process.env.RESEND_API_KEY = originalKey;
  });

  it('handles ADMIN_POST_SUBMITTED and ADMIN_CONTACT_INQUIRY events gracefully', async () => {
    const originalMain = process.env.RESEND_API_MAIN;
    const originalKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_MAIN;
    process.env.RESEND_API_KEY = 're_YOUR_RESEND_API_KEY';

    const postResult = await sendEditorialEmail({
      to: 'er.monuprajapati.2024@gmail.com',
      event: 'ADMIN_POST_SUBMITTED',
      recipientName: 'Monu Prajapati',
      articleTitle: 'Advanced STM32 Firmware Architecture',
      articleSlug: 'advanced-stm32-firmware',
      authorName: 'Aarav Sharma',
      authorEmail: 'aarav@example.com',
      category: 'Embedded Systems',
      excerpt: 'Comprehensive guide to building real-time RTOS firmware.',
    });
    expect(postResult.sent).toBe(false);
    expect(postResult.provider).toBe('unconfigured');

    const inquiryResult = await sendEditorialEmail({
      to: 'er.monuprajapati.2024@gmail.com',
      event: 'ADMIN_CONTACT_INQUIRY',
      recipientName: 'Monu Prajapati',
      senderName: 'Rajesh Kumar',
      senderEmail: 'rajesh@college.edu',
      subject: 'Robotics Lab Franchise Inquiry',
      message: 'We are interested in setting up an EI House Robotics Lab at our campus.',
    });
    expect(inquiryResult.sent).toBe(false);
    expect(inquiryResult.provider).toBe('unconfigured');

    process.env.RESEND_API_MAIN = originalMain;
    process.env.RESEND_API_KEY = originalKey;
  });
});
