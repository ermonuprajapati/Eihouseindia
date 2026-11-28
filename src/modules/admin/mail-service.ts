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
}

export const SENDER_ACCOUNTS: Record<SenderAccountType, SenderAccount> = {
  info: {
    id: 'info',
    name: 'EIHOUSE INDIA',
    email: 'info@eihouseindia.in',
    display: 'EIHOUSE INDIA <info@eihouseindia.in>',
    description: 'Official Info & Editorial Communications',
    badge: 'Info',
  },
  admin: {
    id: 'admin',
    name: 'EI HOUSE Admin',
    email: 'admin@eihouseindia.in',
    display: 'EI HOUSE Admin <admin@eihouseindia.in>',
    description: 'System & Platform Administration',
    badge: 'Admin',
  },
  founder: {
    id: 'founder',
    name: 'EI HOUSE Founder',
    email: 'founder@eihouseindia.in',
    display: 'Monu Prajapati | Founder EI HOUSE <founder@eihouseindia.in>',
    description: 'Executive & Strategic Outreach',
    badge: 'Founder',
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
}

export const PRESET_MAIL_TEMPLATES: MailTemplate[] = [
  {
    id: 'editorial_reply',
    title: 'Standard Editorial Reply',
    subject: 'Update regarding your inquiry at EI HOUSE INDIA',
    bodyText: `Dear Reader / Author,

Thank you for reaching out to EI HOUSE INDIA. We have received your message and our editorial engineering team is reviewing it.

We aim to reply thoroughly within 24 to 48 business hours. If you have any additional schematics, datasheets, or details to share, please feel free to reply directly to this email.

Warm regards,
Editorial & Engineering Team
EI HOUSE INDIA (eihouseindia.in)`,
    bodyHtml: `<p>Dear Reader / Author,</p>
<p>Thank you for reaching out to <strong>EI HOUSE INDIA</strong>. We have received your message and our editorial engineering team is reviewing it.</p>
<p>We aim to reply thoroughly within 24 to 48 business hours. If you have any additional schematics, datasheets, or details to share, please feel free to reply directly to this email.</p>
<br/>
<p>Warm regards,<br/><strong>Editorial & Engineering Team</strong><br/>EI HOUSE INDIA (<a href="https://eihouseindia.in">eihouseindia.in</a>)</p>`,
  },
  {
    id: 'article_changes',
    title: 'Article Review: Requested Changes',
    subject: 'Feedback & Next Steps for your Article Submission on EI HOUSE INDIA',
    bodyText: `Hello Author,

Thank you for your valuable contribution to the EI HOUSE technical knowledge base.

Our peer-review editorial board has reviewed your submission. To ensure the highest standard for our engineering community, please address the following points in your dashboard editor:
1. Ensure all pinouts, component values, and formulas are explicitly defined.
2. Include high-resolution circuit diagrams or 3D view renders if applicable.
3. Cite reliable datasheet sources.

Once updated, you can re-submit for quick final publication!

Best regards,
EI HOUSE Editorial Board`,
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
<p>Best regards,<br/><strong>EI HOUSE Editorial Board</strong></p>`,
  },
  {
    id: 'lab_partnership',
    title: 'Hardware & Lab Partnership Discussion',
    subject: 'EI HOUSE Hardware Engineering Lab & Educational Partnership',
    bodyText: `Dear Partner / Institution,

Thank you for your interest in partnering with EI HOUSE INDIA. 

Our interactive 3D Virtual Engineering Lab, component taxonomy suite, and embedded hardware curriculum are currently supporting students and hardware designers across India.

We would be delighted to schedule a 20-minute introductory call to explore how our platforms can support your academic or industrial prototyping goals.

Please let us know your preferred date and time slot.

Warm regards,
EI HOUSE Partnerships & Outreach`,
    bodyHtml: `<p>Dear Partner / Institution,</p>
<p>Thank you for your interest in partnering with <strong>EI HOUSE INDIA</strong>.</p>
<p>Our interactive 3D Virtual Engineering Lab, component taxonomy suite, and embedded hardware curriculum are currently supporting students and hardware designers across India.</p>
<p>We would be delighted to schedule a 20-minute introductory call to explore how our platforms can support your academic or industrial prototyping goals.</p>
<p>Please let us know your preferred date and time slot.</p>
<br/>
<p>Warm regards,<br/><strong>EI HOUSE Partnerships & Outreach</strong></p>`,
  },
  {
    id: 'blank',
    title: 'Blank Custom Email',
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
