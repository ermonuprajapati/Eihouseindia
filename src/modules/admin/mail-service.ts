import { collection, query, orderBy, limit, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { AdminEmailMessage, EmailFolder } from '@/types';

export type SenderAccountType = 'info' | 'admin' | 'founder';

export interface SenderAccount {
  id: SenderAccountType;
  name: string;
  email: string;
  display: string;
  description: string;
  badge: string;
  role: string;
  recommendedFor: string[];
}

export const SENDER_ACCOUNTS: Record<SenderAccountType, SenderAccount> = {
  info: {
    id: 'info',
    name: 'EIHOUSE INDIA',
    email: 'info@eihouseindia.in',
    display: 'EIHOUSE INDIA <info@eihouseindia.in>',
    description: 'System Notifications, Inquiries, User Onboarding & Course Access',
    badge: 'Info / System',
    role: 'System & Inquiries',
    recommendedFor: ['General Inquiries', 'User Onboarding', 'Course Access & Welcome', 'Editorial Updates'],
  },
  admin: {
    id: 'admin',
    name: 'EI HOUSE Admin & Billing',
    email: 'admin@eihouseindia.in',
    display: 'EI HOUSE Admin & Billing <admin@eihouseindia.in>',
    description: 'Invoices, Payment Receipts, Subscriptions & Platform Operations',
    badge: 'Admin / Billing',
    role: 'Billing & Operations',
    recommendedFor: ['Course Purchases', 'Subscription Receipts', 'Invoices & Refunds', 'System Security'],
  },
  founder: {
    id: 'founder',
    name: 'Monu Prajapati | Founder',
    email: 'founder@eihouseindia.in',
    display: 'Monu Prajapati | Founder EI HOUSE <founder@eihouseindia.in>',
    description: 'Executive Partnerships, VIP Outreach & Direct Mentorship',
    badge: 'Founder / VIP',
    role: 'Executive & VIP',
    recommendedFor: ['Institutional Partnerships', 'VIP Students / Mentorship', 'High-Value Client Outreach', 'Media & Press'],
  },
};

export interface SendMailParams {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  cc?: string;
  bcc?: string;
  fromName?: string;
  fromAccount?: SenderAccountType;
  inReplyTo?: string;
}

export interface MailTemplate {
  id: string;
  title: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  defaultAccount?: SenderAccountType;
  category?: string;
}

export const PRESET_MAIL_TEMPLATES: MailTemplate[] = [
  {
    id: 'editorial_reply',
    title: 'Standard Editorial & Support Reply',
    category: 'General Support',
    defaultAccount: 'info',
    subject: 'Update regarding your inquiry at EI HOUSE INDIA',
    bodyText: `Dear Reader / Author,

Thank you for reaching out to EI HOUSE INDIA. We have received your message and our team is reviewing it.

We aim to reply thoroughly within 24 to 48 business hours. If you have any additional schematics, datasheets, or questions to share, please reply directly to this email.

Warm regards,
Support & Editorial Team
EI HOUSE INDIA (eihouseindia.in)`,
    bodyHtml: `<p>Dear Reader / Author,</p>
<p>Thank you for reaching out to <strong>EI HOUSE INDIA</strong>. We have received your message and our team is reviewing it.</p>
<p>We aim to reply thoroughly within 24 to 48 business hours. If you have any additional schematics, datasheets, or questions to share, please reply directly to this email.</p>
<br/>
<p>Warm regards,<br/><strong>Support &amp; Editorial Team</strong><br/>EI HOUSE INDIA (<a href="https://eihouseindia.in">eihouseindia.in</a>)</p>`,
  },
  {
    id: 'course_welcome',
    title: 'Course Enrollment Welcome & Access',
    category: 'Courses & Learning',
    defaultAccount: 'info',
    subject: 'Welcome to your Course! Access Your Engineering Curriculum on EI HOUSE',
    bodyText: `Hello Student / Engineer,

Congratulations and welcome to your new learning journey at EI HOUSE INDIA!

Your course enrollment has been confirmed. You now have full access to the video modules, hands-on simulation tools, and accompanying hardware project files.

To access your course:
1. Visit https://eihouseindia.in/dashboard
2. Navigate to "My Courses"
3. Launch your course player

If you have any questions or require lab assistance during the course, reply directly to this email.

Happy Building!
EI HOUSE Learning & Curriculum Team
EI HOUSE INDIA (eihouseindia.in)`,
    bodyHtml: `<p>Hello Student / Engineer,</p>
<p>Congratulations and welcome to your new learning journey at <strong>EI HOUSE INDIA</strong>! 🚀</p>
<p>Your course enrollment has been confirmed. You now have full access to the video modules, hands-on simulation tools, and accompanying hardware project files.</p>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 16px 0;">
  <p style="margin: 0 0 8px 0; font-weight: bold; color: #0b1528;">How to access your curriculum:</p>
  <ol style="margin: 0; padding-left: 20px; color: #334155;">
    <li>Visit <a href="https://eihouseindia.in/dashboard" style="color: #1d4ed8; font-weight: 600;">eihouseindia.in/dashboard</a></li>
    <li>Navigate to <strong>My Courses</strong></li>
    <li>Click <strong>Start Learning</strong> to open the player</li>
  </ol>
</div>
<p>If you have any questions or require lab assistance during the course, reply directly to this email.</p>
<br/>
<p>Happy Building!<br/><strong>EI HOUSE Learning &amp; Curriculum Team</strong><br/>EI HOUSE INDIA (<a href="https://eihouseindia.in">eihouseindia.in</a>)</p>`,
  },
  {
    id: 'course_receipt',
    title: 'Course Purchase Receipt & Tax Invoice',
    category: 'Billing & Receipts',
    defaultAccount: 'admin',
    subject: 'Payment Receipt & Order Confirmation: EI HOUSE Course Purchase',
    bodyText: `Dear Valued Customer,

Thank you for your purchase from EI HOUSE INDIA. This email confirms that your payment has been successfully processed.

Order Details:
- Platform: Engineering Innovation House (EI HOUSE INDIA)
- Transaction Status: Completed (Success)
- Issuer: EI HOUSE Admin & Billing (admin@eihouseindia.in)
- Access Period: Lifetime Access & Future Module Updates

Please retain this email as your official digital payment receipt and tax invoice. If you need a formal GST invoice or company reimbursement invoice, please reply with your company details.

Warm regards,
EI HOUSE Admin & Billing Department
Engineering Innovation House (eihouseindia.in)`,
    bodyHtml: `<p>Dear Valued Customer,</p>
<p>Thank you for your purchase from <strong>EI HOUSE INDIA</strong>. This email confirms that your payment has been successfully processed.</p>
<div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px 20px; margin: 16px 0;">
  <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #166534;">Payment Confirmed ✓</p>
  <table style="width: 100%; font-size: 14px; color: #334155;" cellpadding="4">
    <tr><td style="color: #64748b; width: 140px;">Platform:</td><td><strong>Engineering Innovation House (EI HOUSE INDIA)</strong></td></tr>
    <tr><td style="color: #64748b;">Status:</td><td><span style="color: #16a34a; font-weight: bold;">Completed</span></td></tr>
    <tr><td style="color: #64748b;">Issuer:</td><td>EI HOUSE Admin &amp; Billing (admin@eihouseindia.in)</td></tr>
    <tr><td style="color: #64748b;">Access:</td><td>Lifetime Access &amp; Future Updates Included</td></tr>
  </table>
</div>
<p style="font-size: 13px; color: #64748b;">Please retain this email as your official payment receipt. For GST invoices or reimbursement records, reply directly to this email.</p>
<br/>
<p>Warm regards,<br/><strong>EI HOUSE Admin &amp; Billing Department</strong><br/>Engineering Innovation House (<a href="https://eihouseindia.in">eihouseindia.in</a>)</p>`,
  },
  {
    id: 'subscription_receipt',
    title: 'Subscription Confirmation & Invoice',
    category: 'Billing & Receipts',
    defaultAccount: 'admin',
    subject: 'Subscription Activated: Your EI HOUSE Pro Access is Now Live',
    bodyText: `Dear Subscriber,

Your EI HOUSE subscription has been successfully activated!

Subscription Summary:
- Plan: EI HOUSE Engineering Suite Access
- Billing Managed By: EI HOUSE Admin & Billing (admin@eihouseindia.in)
- Status: Active
- Features Unlocked: 3D Engineering Lab Unlimited, Premium Datasheet Finder, Full Article Library

You can manage your subscription settings or download monthly statements at any time from your account settings.

Thank you for powering practical engineering innovation in India!

Sincerely,
EI HOUSE Admin & Finance Operations
EI HOUSE INDIA (eihouseindia.in)`,
    bodyHtml: `<p>Dear Subscriber,</p>
<p>Your <strong>EI HOUSE</strong> subscription has been successfully activated!</p>
<div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px 20px; margin: 16px 0;">
  <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #1e40af;">Pro Subscription Active ⚡</p>
  <ul style="margin: 0; padding-left: 20px; color: #334155; font-size: 14px; line-height: 1.8;">
    <li><strong>3D Engineering Lab:</strong> Unlimited Virtual Experiments &amp; Exports</li>
    <li><strong>Datasheet Finder:</strong> Unlimited Component Specifications &amp; Pinouts</li>
    <li><strong>Technical Publishing:</strong> Direct Submission &amp; Peer Recognition</li>
  </ul>
</div>
<p style="font-size: 13px; color: #64748b;">Billing inquiries: <a href="mailto:admin@eihouseindia.in" style="color: #1d4ed8;">admin@eihouseindia.in</a></p>
<br/>
<p>Sincerely,<br/><strong>EI HOUSE Admin &amp; Finance Operations</strong><br/>Engineering Innovation House (<a href="https://eihouseindia.in">eihouseindia.in</a>)</p>`,
  },
  {
    id: 'founder_outreach',
    title: 'Founder Executive & Lab Partnership',
    category: 'Founder / Strategic',
    defaultAccount: 'founder',
    subject: 'Partnership with EI HOUSE: Practical Engineering & Hardware Labs',
    bodyText: `Dear Partner / Colleague,

I am reaching out to explore potential synergies between your organization and Engineering Innovation House (EI HOUSE INDIA).

As the Founder of EI HOUSE, my vision has been to bridge the gap between theoretical engineering education and real-world hardware prototyping. Today, our 3D Virtual Engineering Lab, component taxonomy suite, and technical curriculum serve engineering students and designers across the country.

I would welcome a brief 15 to 20-minute discussion to understand your objectives and discuss how we might collaborate on lab infrastructure, content co-creation, or hardware workshops.

Please let me know a day and time that fits your calendar, or share your availability.

Warm personal regards,

Er. Monu Prajapati
Founder & Proprietor
Engineering Innovation House (EI HOUSE INDIA)
Email: founder@eihouseindia.in
Website: https://eihouseindia.in`,
    bodyHtml: `<p>Dear Partner / Colleague,</p>
<p>I am reaching out to explore potential synergies between your organization and <strong>Engineering Innovation House (EI HOUSE INDIA)</strong>.</p>
<p>As the Founder of EI HOUSE, my vision has been to bridge the gap between theoretical engineering education and real-world hardware prototyping. Today, our 3D Virtual Engineering Lab, component taxonomy suite, and technical curriculum serve engineering students and designers across the country.</p>
<p>I would welcome a brief 15 to 20-minute discussion to understand your objectives and discuss how we might collaborate on lab infrastructure, content co-creation, or hardware workshops.</p>
<p>Please let me know a day and time that fits your calendar, or share your availability.</p>
<br/>
<p>Warm personal regards,</p>
<p><strong>Er. Monu Prajapati</strong><br/>
Founder &amp; Proprietor<br/>
Engineering Innovation House (EI HOUSE INDIA)<br/>
<span style="font-size: 13px; color: #64748b;">Direct: <a href="mailto:founder@eihouseindia.in" style="color: #1d4ed8;">founder@eihouseindia.in</a> &bull; <a href="https://eihouseindia.in" style="color: #1d4ed8;">eihouseindia.in</a></span></p>`,
  },
  {
    id: 'founder_mentorship',
    title: 'Founder Direct Mentorship & VIP Welcome',
    category: 'Founder / Strategic',
    defaultAccount: 'founder',
    subject: 'Personal Welcome & Engineering Guidance from Monu Prajapati (Founder, EI HOUSE)',
    bodyText: `Hello,

I wanted to take a moment to personally welcome you to the EI HOUSE community.

Engineering is not just about studying theoretical concepts; it is about creating possibilities, solving hard challenges, and building things that matter. Whether you are designing your first PCB, writing firmware, or prototyping IoT systems, remember that practical experimentation is where true engineering excellence begins.

If you ever hit a roadblock in your hardware journey or need career direction in embedded electronics, feel free to reply directly to me at this email.

Wishing you great success with your innovations!

Best regards,

Er. Monu Prajapati
Founder & Proprietor, EI HOUSE INDIA
founder@eihouseindia.in`,
    bodyHtml: `<p>Hello,</p>
<p>I wanted to take a moment to personally welcome you to the <strong>EI HOUSE</strong> engineering community.</p>
<blockquote style="border-left: 3px solid #f59e0b; padding-left: 14px; margin: 16px 0; color: #475569; font-style: italic;">
  &ldquo;Engineering is not just about understanding technology; it is about creating possibilities, solving challenges and turning ideas into reality.&rdquo;
</blockquote>
<p>Whether you are designing your first PCB, writing firmware, or prototyping IoT systems, remember that practical experimentation is where true engineering excellence begins.</p>
<p>If you ever hit a roadblock in your hardware journey or need career direction in embedded electronics, feel free to reply directly to me at this email.</p>
<br/>
<p>Wishing you great success with your innovations!</p>
<br/>
<p>Best regards,</p>
<p><strong>Er. Monu Prajapati</strong><br/>
Founder &amp; Proprietor, EI HOUSE INDIA<br/>
<span style="font-size: 13px; color: #64748b;"><a href="mailto:founder@eihouseindia.in" style="color: #d97706; font-weight: 600;">founder@eihouseindia.in</a> &bull; <a href="https://eihouseindia.in" style="color: #1d4ed8;">eihouseindia.in</a></span></p>`,
  },
  {
    id: 'article_changes',
    title: 'Article Review: Requested Changes',
    category: 'Editorial',
    defaultAccount: 'info',
    subject: 'Feedback & Next Steps for your Article Submission on EI HOUSE INDIA',
    bodyText: `Hello Author,

Thank you for your valuable contribution to the EI HOUSE technical knowledge base.

Our peer-review editorial board has reviewed your submission. To ensure the highest standard for our engineering community, please address the following points in your dashboard editor:
1. Ensure all pinouts, component values, and formulas are explicitly defined.
2. Include high-resolution circuit diagrams or 3D view renders if applicable.
3. Cite reliable datasheet sources.

Once updated, you can re-submit for quick final publication!

Best regards,
EI HOUSE Editorial Board (info@eihouseindia.in)`,
    bodyHtml: `<p>Hello Author,</p>
<p>Thank you for your valuable contribution to the <strong>EI HOUSE</strong> technical knowledge base.</p>
<p>Our peer-review editorial board has reviewed your submission. To ensure the highest standard for our engineering community, please address the following points in your dashboard editor:</p>
<ol>
  <li>Ensure all pinouts, component values, and formulas are explicitly defined.</li>
  <li>Include high-resolution circuit diagrams or 3D view renders if applicable.</li>
  <li>Cite reliable datasheet sources.</li>
</ol>
<p>Once updated, you can re-submit for quick final publication!</p>
<br/>
<p>Best regards,<br/><strong>EI HOUSE Editorial Board</strong> (<a href="mailto:info@eihouseindia.in">info@eihouseindia.in</a>)</p>`,
  },
  {
    id: 'blank',
    title: 'Blank Custom Email',
    category: 'Custom',
    defaultAccount: 'info',
    subject: '',
    bodyText: '',
    bodyHtml: '',
  },
];

export async function fetchAdminEmails(params?: {
  folder?: EmailFolder | 'all';
  filter?: 'all' | 'unread' | 'starred';
  searchQuery?: string;
}): Promise<{ emails: AdminEmailMessage[]; resendConfigured: boolean }> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.folder) queryParams.set('folder', params.folder);
    if (params?.filter) queryParams.set('filter', params.filter);
    if (params?.searchQuery) queryParams.set('q', params.searchQuery);

    const res = await fetch(`/api/admin/mail?${queryParams.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return {
        emails: data.emails || [],
        resendConfigured: Boolean(data.resendConfigured),
      };
    }
  } catch (err) {
    console.warn('API fetch failed, reading direct from Firestore:', err);
  }

  // Fallback to client Firestore
  try {
    const snap = await getDocs(query(collection(db, 'adminEmails'), orderBy('createdAt', 'desc'), limit(150)));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminEmailMessage));
    return { emails: list, resendConfigured: true };
  } catch {
    return { emails: [], resendConfigured: false };
  }
}

export async function sendAdminMail(params: SendMailParams): Promise<{ success: boolean; email?: AdminEmailMessage; message?: string }> {
  const res = await fetch('/api/admin/mail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to dispatch email');
  }
  return data;
}

export async function updateAdminEmailStatus(
  id: string,
  updates: Partial<Pick<AdminEmailMessage, 'status' | 'isStarred' | 'folder' | 'tags'>>
): Promise<void> {
  try {
    const res = await fetch(`/api/admin/mail/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      throw new Error('API patch failed');
    }
  } catch {
    // Client-side fallback
    await updateDoc(doc(db, 'adminEmails', id), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function deleteAdminEmail(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/admin/mail/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      throw new Error('API delete failed');
    }
  } catch {
    await deleteDoc(doc(db, 'adminEmails', id));
  }
}

export async function simulateInboundEmail(sample?: {
  senderName?: string;
  senderEmail?: string;
  subject?: string;
  message?: string;
}): Promise<AdminEmailMessage> {
  const res = await fetch('/api/admin/mail/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sample || {}),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to simulate inbound email');
  }
  return data.email;
}

export async function syncInboundEmails(): Promise<{
  success: boolean;
  syncedCount: number;
  totalReceived?: number;
  message: string;
}> {
  const res = await fetch('/api/admin/mail/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to sync emails from Resend');
  }
  return data;
}
