import { Resend } from 'resend';
import { SITE_CONFIG } from '@/config/site';

export type EditorialEmailEvent =
  | 'EMAIL_VERIFICATION_NOTICE'
  | 'ARTICLE_SUBMITTED'
  | 'ARTICLE_APPROVED'
  | 'ARTICLE_REJECTED'
  | 'CHANGES_REQUESTED'
  | 'ACCOUNT_NOTICE';

export interface SendEditorialEmailInput {
  to: string;
  event: EditorialEmailEvent;
  recipientName: string;
  articleTitle?: string;
  articleSlug?: string;
  reason?: string;
  customMessage?: string;
}

export interface EmailDispatchResult {
  sent: boolean;
  provider: 'resend' | 'unconfigured';
  id?: string;
  reason?: string;
}

function getEmailCopy(input: SendEditorialEmailInput): { subject: string; html: string } {
  const siteUrl = SITE_CONFIG.url;
  switch (input.event) {
    case 'EMAIL_VERIFICATION_NOTICE':
      return {
        subject: `Verify your ${SITE_CONFIG.name} contributor account`,
        html: `<p>Hello ${input.recipientName},</p><p>Welcome to <strong>${SITE_CONFIG.name}</strong>. Please complete Firebase email verification using the verification link sent to your inbox to unlock full contributor privileges.</p>`,
      };
    case 'ARTICLE_SUBMITTED':
      return {
        subject: `Submission received: "${input.articleTitle || 'Untitled'}"`,
        html: `<p>Hello ${input.recipientName},</p><p>Your article <strong>${input.articleTitle}</strong> has been submitted to the ${SITE_CONFIG.name} editorial review queue. An editor will review your submission shortly.</p>`,
      };
    case 'ARTICLE_APPROVED':
      return {
        subject: `Published on ${SITE_CONFIG.name}: "${input.articleTitle || 'Your article'}"`,
        html: `<p>Hello ${input.recipientName},</p><p>Congratulations! Your article <strong>${input.articleTitle}</strong> has been approved and published on ${SITE_CONFIG.name}.</p>${input.articleSlug ? `<p><a href="${siteUrl}/blog/${input.articleSlug}">Read published article</a></p>` : ''}`,
      };
    case 'ARTICLE_REJECTED':
      return {
        subject: `Editorial decision for "${input.articleTitle || 'Your article'}"`,
        html: `<p>Hello ${input.recipientName},</p><p>Thank you for submitting <strong>${input.articleTitle}</strong>. At this time it was not approved for publication.</p>${input.reason ? `<p><strong>Reviewer feedback:</strong> ${input.reason}</p>` : ''}<p>You can revise and resubmit from your author dashboard.</p>`,
      };
    case 'CHANGES_REQUESTED':
      return {
        subject: `Revisions requested for "${input.articleTitle || 'Your article'}"`,
        html: `<p>Hello ${input.recipientName},</p><p>An editor reviewed <strong>${input.articleTitle}</strong> and requested updates before publication.</p>${input.reason ? `<p><strong>Requested changes:</strong> ${input.reason}</p>` : ''}<p>Open your dashboard draft editor to update and resubmit.</p>`,
      };
    case 'ACCOUNT_NOTICE':
    default:
      return {
        subject: `Important account notice from ${SITE_CONFIG.name}`,
        html: `<p>Hello ${input.recipientName},</p><p>${input.customMessage || 'There is an important update regarding your EIHOUSE INDIA account.'}</p>`,
      };
  }
}

export async function sendEditorialEmail(
  input: SendEditorialEmailInput
): Promise<EmailDispatchResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 're_YOUR_RESEND_API_KEY') {
    return {
      sent: false,
      provider: 'unconfigured',
      reason: 'RESEND_API_KEY is not configured in server environment.',
    };
  }

  try {
    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM_EMAIL || `${SITE_CONFIG.name} <info@eihouseindia.in>`;
    const { subject, html } = getEmailCopy(input);

    const response = await resend.emails.send({
      from,
      to: input.to,
      subject,
      html,
    });

    if (response.error) {
      return {
        sent: false,
        provider: 'resend',
        reason: response.error.message,
      };
    }

    return {
      sent: true,
      provider: 'resend',
      id: response.data?.id,
    };
  } catch (error) {
    return {
      sent: false,
      provider: 'resend',
      reason: error instanceof Error ? error.message : 'Email dispatch failed',
    };
  }
}
