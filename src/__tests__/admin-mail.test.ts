import { describe, it, expect } from 'vitest';
import { PRESET_MAIL_TEMPLATES, SENDER_ACCOUNTS } from '@/modules/admin/mail-service';
import type { AdminEmailMessage, EmailFolder } from '@/types';

describe('Admin Mail Suite', () => {
  it('configures all 3 sender accounts properly (info, admin, founder)', () => {
    expect(SENDER_ACCOUNTS.info).toBeDefined();
    expect(SENDER_ACCOUNTS.admin).toBeDefined();
    expect(SENDER_ACCOUNTS.founder).toBeDefined();

    expect(SENDER_ACCOUNTS.info.email).toBe('info@eihouseindia.in');
    expect(SENDER_ACCOUNTS.admin.email).toBe('admin@eihouseindia.in');
    expect(SENDER_ACCOUNTS.founder.email).toBe('founder@eihouseindia.in');

    expect(SENDER_ACCOUNTS.info.role).toBe('System & Inquiries');
    expect(SENDER_ACCOUNTS.admin.role).toBe('Billing & Operations');
    expect(SENDER_ACCOUNTS.founder.role).toBe('Executive & VIP');
  });

  it('loads preset mail templates properly with account routing', () => {
    expect(PRESET_MAIL_TEMPLATES.length).toBeGreaterThanOrEqual(6);
    const editorial = PRESET_MAIL_TEMPLATES.find((t) => t.id === 'editorial_reply');
    expect(editorial).toBeDefined();
    expect(editorial?.defaultAccount).toBe('info');
    expect(editorial?.subject).toContain('EI HOUSE INDIA');
    expect(editorial?.bodyText).toContain('eihouseindia.in');

    const courseReceipt = PRESET_MAIL_TEMPLATES.find((t) => t.id === 'course_receipt');
    expect(courseReceipt).toBeDefined();
    expect(courseReceipt?.defaultAccount).toBe('admin');
    expect(courseReceipt?.bodyText).toContain('admin@eihouseindia.in');

    const founderOutreach = PRESET_MAIL_TEMPLATES.find((t) => t.id === 'founder_outreach');
    expect(founderOutreach).toBeDefined();
    expect(founderOutreach?.defaultAccount).toBe('founder');
    expect(founderOutreach?.bodyText).toContain('Er. Monu Prajapati');
  });

  it('validates AdminEmailMessage structure and folder assignments', () => {
    const sampleMessage: AdminEmailMessage = {
      id: 'mail_test_123',
      folder: 'inbox',
      from: 'Dr. Vikram Malhotra <v.malhotra@iitd.ac.in>',
      to: 'EIHOUSE INDIA <info@eihouseindia.in>',
      subject: 'Collaboration Inquiry',
      bodyText: 'Looking forward to lab collaboration.',
      bodyHtml: '<p>Looking forward to lab collaboration.</p>',
      status: 'unread',
      isStarred: true,
      createdAt: new Date().toISOString(),
      source: 'inbound_webhook',
    };

    expect(sampleMessage.folder).toBe('inbox');
    expect(sampleMessage.status).toBe('unread');
    expect(sampleMessage.isStarred).toBe(true);
    expect(sampleMessage.from).toContain('iitd.ac.in');
  });

  it('verifies folder types supported', () => {
    const folders: EmailFolder[] = ['inbox', 'sent', 'trash'];
    expect(folders).toContain('inbox');
    expect(folders).toContain('sent');
    expect(folders).toContain('trash');
  });
});
