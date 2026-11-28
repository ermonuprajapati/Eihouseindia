import { Resend } from 'resend';
import { SITE_CONFIG } from '@/config/site';

export type EditorialEmailEvent =
  | 'WELCOME'
  | 'EMAIL_VERIFICATION_NOTICE'
  | 'ARTICLE_SUBMITTED'
  | 'ARTICLE_APPROVED'
  | 'ARTICLE_REJECTED'
  | 'CHANGES_REQUESTED'
  | 'ACCOUNT_NOTICE'
  | 'ADMIN_POST_SUBMITTED'
  | 'ADMIN_CONTACT_INQUIRY'
  | 'ADMIN_INQUIRY_REPLY'
  | 'PAYMENT_RECEIPT'
  | 'SUBSCRIPTION_RECEIPT'
  | 'COURSE_ACCESS'
  | 'PASSWORD_RESET_OTP';

export interface SendEditorialEmailInput {
  to: string;
  event: EditorialEmailEvent;
  recipientName: string;
  articleTitle?: string;
  articleSlug?: string;
  reason?: string;
  customMessage?: string;
  senderName?: string;
  senderEmail?: string;
  subject?: string;
  message?: string;
  authorName?: string;
  authorEmail?: string;
  category?: string;
  excerpt?: string;
  orderId?: string;
  amount?: string;
  currency?: string;
  planName?: string;
  courseName?: string;
  invoiceUrl?: string;
  otpCode?: string;
  fromAccount?: 'info' | 'admin' | 'founder';
}

export interface EmailDispatchResult {
  sent: boolean;
  provider: 'resend' | 'unconfigured';
  id?: string;
  reason?: string;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function wrapEmailTemplate(contentHtml: string, previewText: string = ''): string {
  const currentYear = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${SITE_CONFIG.name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0; mso-hide: all;">${previewText}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          <!-- Header -->
          <tr>
            <td style="background-color: #0B1528; padding: 24px 32px; text-align: left; border-bottom: 3px solid #1D4ED8;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align: middle; width: 48px;">
                    <img src="${SITE_CONFIG.url}/images/logo.png" width="40" height="40" alt="EIHOUSE INDIA Logo" style="display: block; border-radius: 6px; background-color: #ffffff; padding: 2px;" />
                  </td>
                  <td style="vertical-align: middle; padding-left: 14px;">
                    <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; text-transform: uppercase; display: inline-block;">
                      ${SITE_CONFIG.name}
                    </span>
                    <span style="display: block; font-size: 12px; color: #94A3B8; margin-top: 2px; font-weight: 500;">
                      India's Engineering &amp; Technology Publishing Platform
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 32px 28px 32px; color: #1E293B; font-size: 15px; line-height: 1.65;">
              ${contentHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 24px 32px; border-top: 1px solid #E2E8F0; text-align: center; color: #64748B; font-size: 13px; line-height: 1.5;">
              <p style="margin: 0 0 8px 0; font-weight: 500; color: #475569;">
                <strong>EIHOUSE INDIA</strong> &bull; <a href="${SITE_CONFIG.url}" style="color: #1D4ED8; text-decoration: none;">eihouseindia.in</a>
              </p>
              <p style="margin: 0 0 12px 0;">
                Have questions or need assistance? Reach out to us at <a href="mailto:${SITE_CONFIG.contactEmail}" style="color: #1D4ED8; text-decoration: none;">${SITE_CONFIG.contactEmail}</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #94A3B8;">
                &copy; ${currentYear} ${SITE_CONFIG.name}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getEmailCopy(input: SendEditorialEmailInput): { subject: string; html: string } {
  const siteUrl = SITE_CONFIG.url;

  switch (input.event) {
    case 'WELCOME': {
      const dashboardUrl = `${siteUrl}/dashboard`;
      const articlesUrl = `${siteUrl}/articles`;
      const newPostUrl = `${siteUrl}/dashboard/editor`;
      const content = `
        <h1 style="color: #0B1528; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.3;">
          Welcome to EIHOUSE INDIA, ${input.recipientName}! 🚀
        </h1>
        <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px;">
          We are thrilled to welcome you to our growing community of engineers, innovators, researchers, and technical creators across India.
        </p>
        <p style="margin: 0 0 24px 0; color: #334155; font-size: 15px;">
          At <strong>${SITE_CONFIG.name}</strong>, our mission is to empower engineers to share high-impact research, tutorials, and practical insights with peers worldwide.
        </p>

        <!-- Feature Highlights Box -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; margin: 0 0 24px 0; padding: 16px 20px;">
          <tr>
            <td style="padding: 10px 0;">
              <strong style="color: #0F172A; font-size: 14px;">✍️ Write &amp; Publish Articles</strong>
              <div style="color: #64748B; font-size: 13px; margin-top: 3px;">
                Draft in-depth engineering posts with our rich editor, code blocks, math formulas, and media support.
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-top: 1px solid #EDF2F7;">
              <strong style="color: #0F172A; font-size: 14px;">🔍 Explore Curated Tech</strong>
              <div style="color: #64748B; font-size: 13px; margin-top: 3px;">
                Discover peer-reviewed insights across Electronics, Mechanical, Software, and emerging tech fields.
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-top: 1px solid #EDF2F7;">
              <strong style="color: #0F172A; font-size: 14px;">📊 Track Your Readership</strong>
              <div style="color: #64748B; font-size: 13px; margin-top: 3px;">
                View article impressions, reader discussions, and submission review feedback from your contributor dashboard.
              </div>
            </td>
          </tr>
        </table>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 28px 0 24px 0;">
          <a href="${dashboardUrl}" style="background-color: #1D4ED8; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 2px 4px rgba(29, 78, 216, 0.25);">
            Go to Your Contributor Dashboard
          </a>
        </div>

        <p style="margin: 0 0 8px 0; text-align: center; font-size: 13px; color: #64748B;">
          Ready to write? You can <a href="${newPostUrl}" style="color: #1D4ED8; font-weight: 600; text-decoration: none;">start your first draft</a> or <a href="${articlesUrl}" style="color: #1D4ED8; font-weight: 600; text-decoration: none;">read latest articles</a>.
        </p>
      `;
      return {
        subject: `Welcome to ${SITE_CONFIG.name} — Engineer your vision with us! 🚀`,
        html: wrapEmailTemplate(content, `Welcome to ${SITE_CONFIG.name}, ${input.recipientName}! Your contributor account is active.`),
      };
    }

    case 'EMAIL_VERIFICATION_NOTICE': {
      const content = `
        <h2 style="color: #0B1528; font-size: 20px; font-weight: 700; margin: 0 0 16px 0;">Verify your contributor account</h2>
        <p style="color: #334155; margin: 0 0 16px 0;">Hello ${input.recipientName},</p>
        <p style="color: #334155; margin: 0 0 20px 0;">
          Welcome to <strong>${SITE_CONFIG.name}</strong>. Please complete Firebase email verification using the verification link sent to your inbox to unlock full contributor privileges and article publishing.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${siteUrl}/dashboard" style="background-color: #1D4ED8; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
            Open Dashboard
          </a>
        </div>
      `;
      return {
        subject: `Verify your ${SITE_CONFIG.name} contributor account`,
        html: wrapEmailTemplate(content, `Verify your ${SITE_CONFIG.name} contributor account.`),
      };
    }

    case 'ARTICLE_SUBMITTED': {
      const content = `
        <h2 style="color: #0B1528; font-size: 20px; font-weight: 700; margin: 0 0 16px 0;">Submission Received</h2>
        <p style="color: #334155; margin: 0 0 16px 0;">Hello ${input.recipientName},</p>
        <p style="color: #334155; margin: 0 0 20px 0;">
          Your article <strong>"${input.articleTitle || 'Untitled'}"</strong> has been received and added to the ${SITE_CONFIG.name} editorial review queue. Our editors will review your submission shortly.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${siteUrl}/dashboard" style="background-color: #1D4ED8; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
            Check Submission Status
          </a>
        </div>
      `;
      return {
        subject: `Submission received: "${input.articleTitle || 'Untitled'}"`,
        html: wrapEmailTemplate(content, `Your article has been submitted to ${SITE_CONFIG.name}.`),
      };
    }

    case 'ARTICLE_APPROVED': {
      const articleUrl = input.articleSlug ? `${siteUrl}/blog/${input.articleSlug}` : `${siteUrl}/articles`;
      const content = `
        <h2 style="color: #0B1528; font-size: 20px; font-weight: 700; margin: 0 0 16px 0;">🎉 Congratulations! Your Article is Published</h2>
        <p style="color: #334155; margin: 0 0 16px 0;">Hello ${input.recipientName},</p>
        <p style="color: #334155; margin: 0 0 20px 0;">
          Your article <strong>"${input.articleTitle || 'Your article'}"</strong> has been approved by the editorial team and is now live on ${SITE_CONFIG.name}!
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${articleUrl}" style="background-color: #10B981; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
            View Published Article
          </a>
        </div>
      `;
      return {
        subject: `Published on ${SITE_CONFIG.name}: "${input.articleTitle || 'Your article'}"`,
        html: wrapEmailTemplate(content, `Your article has been approved and published on ${SITE_CONFIG.name}!`),
      };
    }

    case 'ARTICLE_REJECTED': {
      const content = `
        <h2 style="color: #0B1528; font-size: 20px; font-weight: 700; margin: 0 0 16px 0;">Editorial Decision</h2>
        <p style="color: #334155; margin: 0 0 16px 0;">Hello ${input.recipientName},</p>
        <p style="color: #334155; margin: 0 0 16px 0;">
          Thank you for submitting <strong>"${input.articleTitle || 'Your article'}"</strong>. After review, it was not approved for publication at this time.
        </p>
        ${input.reason ? `
        <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 12px 16px; margin: 0 0 20px 0; border-radius: 4px;">
          <strong style="color: #991B1B; font-size: 13px;">Reviewer Feedback:</strong>
          <p style="color: #7F1D1D; margin: 4px 0 0 0; font-size: 14px;">${input.reason}</p>
        </div>` : ''}
        <p style="color: #334155; margin: 0 0 20px 0;">
          You can revise and resubmit your draft anytime from your contributor dashboard.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${siteUrl}/dashboard" style="background-color: #1D4ED8; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
            Open Contributor Dashboard
          </a>
        </div>
      `;
      return {
        subject: `Editorial decision for "${input.articleTitle || 'Your article'}"`,
        html: wrapEmailTemplate(content, `Editorial decision regarding your submission on ${SITE_CONFIG.name}.`),
      };
    }

    case 'CHANGES_REQUESTED': {
      const content = `
        <h2 style="color: #0B1528; font-size: 20px; font-weight: 700; margin: 0 0 16px 0;">Revisions Requested</h2>
        <p style="color: #334155; margin: 0 0 16px 0;">Hello ${input.recipientName},</p>
        <p style="color: #334155; margin: 0 0 16px 0;">
          An editor reviewed <strong>"${input.articleTitle || 'Your article'}"</strong> and requested some revisions before it can be published.
        </p>
        ${input.reason ? `
        <div style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px 16px; margin: 0 0 20px 0; border-radius: 4px;">
          <strong style="color: #92400E; font-size: 13px;">Requested Changes:</strong>
          <p style="color: #78350F; margin: 4px 0 0 0; font-size: 14px;">${input.reason}</p>
        </div>` : ''}
        <p style="color: #334155; margin: 0 0 20px 0;">
          Please update your draft in the editor and click resubmit when ready.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${siteUrl}/dashboard" style="background-color: #D97706; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
            Edit Draft &amp; Resubmit
          </a>
        </div>
      `;
      return {
        subject: `Revisions requested for "${input.articleTitle || 'Your article'}"`,
        html: wrapEmailTemplate(content, `Revisions requested for your article on ${SITE_CONFIG.name}.`),
      };
    }

    case 'ADMIN_POST_SUBMITTED': {
      const adminUrl = `${siteUrl}/admin`;
      const postPreviewUrl = input.articleSlug ? `${siteUrl}/blog/${input.articleSlug}` : adminUrl;
      const content = `
        <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
          <span style="font-size: 13px; font-weight: 700; color: #92400E; text-transform: uppercase; letter-spacing: 0.5px;">
            🔔 Editorial Action Required
          </span>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #78350F;">
            A new article has been submitted by a contributor and is waiting for your review and publication decision.
          </p>
        </div>

        <h2 style="color: #0B1528; font-size: 20px; font-weight: 700; margin: 0 0 16px 0;">
          New Article Submitted for Review
        </h2>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; margin: 0 0 24px 0; padding: 16px 20px; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #64748B; width: 120px; vertical-align: top;">Article Title:</td>
            <td style="padding: 8px 0; color: #0F172A; font-weight: 700; font-size: 15px;">
              ${escapeHtml(input.articleTitle || 'Untitled Article')}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-top: 1px solid #EDF2F7; color: #64748B; vertical-align: top;">Author:</td>
            <td style="padding: 8px 0; border-top: 1px solid #EDF2F7; color: #0F172A; font-weight: 600;">
              ${escapeHtml(input.authorName || 'Contributor')} &lt;<a href="mailto:${input.authorEmail || ''}" style="color: #1D4ED8; text-decoration: none;">${escapeHtml(input.authorEmail || 'N/A')}</a>&gt;
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-top: 1px solid #EDF2F7; color: #64748B; vertical-align: top;">Category:</td>
            <td style="padding: 8px 0; border-top: 1px solid #EDF2F7; color: #0F172A;">
              <span style="background-color: #E2E8F0; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                ${escapeHtml(input.category || 'Engineering / STEM')}
              </span>
            </td>
          </tr>
          ${input.excerpt ? `
          <tr>
            <td style="padding: 8px 0; border-top: 1px solid #EDF2F7; color: #64748B; vertical-align: top;">Excerpt:</td>
            <td style="padding: 8px 0; border-top: 1px solid #EDF2F7; color: #334155; line-height: 1.5;">
              ${escapeHtml(input.excerpt)}
            </td>
          </tr>` : ''}
          <tr>
            <td style="padding: 8px 0; border-top: 1px solid #EDF2F7; color: #64748B; vertical-align: top;">Status:</td>
            <td style="padding: 8px 0; border-top: 1px solid #EDF2F7; color: #D97706; font-weight: 700;">
              PENDING REVIEW
            </td>
          </tr>
        </table>

        <div style="text-align: center; margin: 28px 0 20px 0;">
          <a href="${adminUrl}" style="background-color: #1D4ED8; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 2px 4px rgba(29, 78, 216, 0.25); margin-right: 8px;">
            Open Admin Dashboard to Review &amp; Publish →
          </a>
          ${input.articleSlug ? `
          <a href="${postPreviewUrl}" style="background-color: #172D4D; color: #ffffff; text-decoration: none; padding: 14px 24px; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">
            View Preview
          </a>` : ''}
        </div>

        <p style="font-size: 12px; color: #94A3B8; text-align: center; margin: 16px 0 0 0;">
          Delivered to Founder &amp; Administrator: ${SITE_CONFIG.bootstrapAdminEmail}
        </p>
      `;
      return {
        subject: `🔔 [EI House Review Request] "${input.articleTitle || 'New Article'}" by ${input.authorName || 'Contributor'}`,
        html: wrapEmailTemplate(content, `New article "${input.articleTitle || 'Untitled'}" is waiting for your review on EI House.`),
      };
    }

    case 'ADMIN_CONTACT_INQUIRY': {
      const adminUrl = `${siteUrl}/admin`;
      const replyMailto = input.senderEmail
        ? `mailto:${input.senderEmail}?subject=Re:%20${encodeURIComponent(input.subject || 'Inquiry on EI House')}`
        : `mailto:${SITE_CONFIG.contactEmail}`;
      const content = `
        <div style="background-color: #EFF6FF; border: 1px solid #3B82F6; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
          <span style="font-size: 13px; font-weight: 700; color: #1E40AF; text-transform: uppercase; letter-spacing: 0.5px;">
            📩 Website Contact &amp; Business Inquiry
          </span>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #1E3A8A;">
            A visitor submitted an official inquiry on Engineering Innovation House (EI House).
          </p>
        </div>

        <h2 style="color: #0B1528; font-size: 20px; font-weight: 700; margin: 0 0 16px 0;">
          New Inquiry from ${escapeHtml(input.senderName || 'Visitor')}
        </h2>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; margin: 0 0 20px 0; padding: 16px 20px; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #64748B; width: 120px; vertical-align: top;">From:</td>
            <td style="padding: 8px 0; color: #0F172A; font-weight: 700;">
              ${escapeHtml(input.senderName || 'Visitor')}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-top: 1px solid #EDF2F7; color: #64748B; vertical-align: top;">Email Address:</td>
            <td style="padding: 8px 0; border-top: 1px solid #EDF2F7; color: #1D4ED8; font-weight: 600;">
              <a href="mailto:${input.senderEmail || ''}" style="color: #1D4ED8; text-decoration: underline;">
                ${escapeHtml(input.senderEmail || 'N/A')}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-top: 1px solid #EDF2F7; color: #64748B; vertical-align: top;">Subject:</td>
            <td style="padding: 8px 0; border-top: 1px solid #EDF2F7; color: #0F172A; font-weight: 600;">
              ${escapeHtml(input.subject || 'General Inquiry')}
            </td>
          </tr>
        </table>

        <div style="margin: 0 0 24px 0;">
          <strong style="color: #334155; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">
            Inquiry Message:
          </strong>
          <div style="background-color: #FFFFFF; border: 1px solid #CBD5E1; border-left: 4px solid #1D4ED8; border-radius: 6px; padding: 16px 18px; color: #1E293B; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
${escapeHtml(input.message || '')}
          </div>
        </div>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${replyMailto}" style="background-color: #10B981; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 700; font-size: 14px; display: inline-block; margin-right: 12px;">
                Reply Directly via Email ✉️
              </a>
              <a href="${adminUrl}" style="background-color: #172D4D; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
                Admin Panel
              </a>
            </td>
          </tr>
        </table>

        <p style="font-size: 12px; color: #94A3B8; text-align: center; margin: 16px 0 0 0;">
          Delivered to Founder &amp; Proprietor: ${SITE_CONFIG.bootstrapAdminEmail}
        </p>
      `;
      return {
        subject: `📩 [EI House Inquiry] ${input.subject || 'New Message'} from ${input.senderName || 'Visitor'}`,
        html: wrapEmailTemplate(content, `New inquiry from ${input.senderName} (${input.senderEmail}): ${input.subject || ''}`),
      };
    }

    case 'ADMIN_INQUIRY_REPLY': {
      const content = `
        <div style="background-color: #EFF6FF; border: 1px solid #3B82F6; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
          <span style="font-size: 13px; font-weight: 700; color: #1E40AF; text-transform: uppercase; letter-spacing: 0.5px;">
            💬 Response from EI HOUSE INDIA
          </span>
          <p style="margin: 6px 0 0 0; font-size: 14px; color: #1E3A8A;">
            Hello <strong>${escapeHtml(input.recipientName || 'Valued Visitor')}</strong>, thank you for reaching out to us. Here is our official response to your inquiry.
          </p>
        </div>

        <h2 style="color: #0B1528; font-size: 18px; font-weight: 700; margin: 0 0 12px 0;">
          Our Message:
        </h2>

        <div style="background-color: #FFFFFF; border: 1px solid #CBD5E1; border-left: 4px solid #10B981; border-radius: 6px; padding: 18px; color: #1E293B; font-size: 15px; line-height: 1.65; white-space: pre-wrap; margin-bottom: 24px;">
${escapeHtml(input.customMessage || '')}
        </div>

        ${
          input.message
            ? `
        <div style="margin: 24px 0 16px 0;">
          <strong style="color: #64748B; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">
            Regarding your inquiry (${escapeHtml(input.subject || 'Message')}):
          </strong>
          <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 14px 16px; color: #475569; font-size: 13px; line-height: 1.55; white-space: pre-wrap;">
${escapeHtml(input.message)}
          </div>
        </div>
        `
            : ''
        }

        <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 14px 18px; margin-top: 24px;">
          <p style="margin: 0; font-size: 13px; color: #166534; line-height: 1.5;">
            Need immediate assistance or direct consultation? You can also connect directly with our engineering &amp; hardware support on WhatsApp at <strong>${SITE_CONFIG.whatsappDisplay}</strong>.
          </p>
        </div>

        <p style="font-size: 13px; color: #475569; margin: 24px 0 0 0;">
          Warm regards,<br />
          <strong>Engineering Innovation House (EI House) Team</strong><br />
          <a href="${siteUrl}" style="color: #1D4ED8; text-decoration: none;">${siteUrl}</a>
        </p>
      `;
      return {
        subject: input.subject?.startsWith('Re:')
          ? input.subject
          : `Re: ${input.subject || 'Your Inquiry on EI House'}`,
        html: wrapEmailTemplate(
          content,
          `Response from EI House regarding: ${input.subject || 'Your Inquiry'}`
        ),
      };
    }

    case 'PAYMENT_RECEIPT': {
      const orderId = input.orderId || `ORD-${Date.now().toString(36).toUpperCase()}`;
      const amount = input.amount || 'INR';
      const itemTitle = input.courseName || input.articleTitle || 'EI HOUSE Engineering Course / Material';
      const content = `
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="background-color: #dcfce7; color: #15803d; font-size: 13px; font-weight: 700; padding: 6px 14px; border-radius: 20px; display: inline-block;">
            ✓ Payment Confirmed
          </span>
          <h1 style="color: #0B1528; font-size: 22px; font-weight: 700; margin: 16px 0 6px 0;">
            Thank you for your order, ${escapeHtml(input.recipientName)}!
          </h1>
          <p style="color: #64748b; font-size: 14px; margin: 0;">Order Reference: <strong style="color: #0b1528; font-family: monospace;">${escapeHtml(orderId)}</strong></p>
        </div>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 0 0 24px 0; padding: 18px 20px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Item Purchased:</td>
            <td style="padding: 6px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">${escapeHtml(itemTitle)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Amount Paid:</td>
            <td style="padding: 6px 0; color: #15803d; font-size: 15px; font-weight: 700; text-align: right;">${escapeHtml(amount)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Billing Entity:</td>
            <td style="padding: 6px 0; color: #334155; font-size: 13px; text-align: right;">EI HOUSE Admin &amp; Billing</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Billing Support:</td>
            <td style="padding: 6px 0; color: #1d4ed8; font-size: 13px; text-align: right;"><a href="mailto:admin@eihouseindia.in" style="color: #1d4ed8; text-decoration: none;">admin@eihouseindia.in</a></td>
          </tr>
        </table>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${siteUrl}/dashboard" style="background-color: #0B1528; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
            Access Your Course / Dashboard &rarr;
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
          Please retain this email as your official digital purchase receipt and tax invoice.
        </p>
      `;
      return {
        subject: `Payment Receipt: ${itemTitle} (${orderId})`,
        html: wrapEmailTemplate(content, `Payment confirmed for ${itemTitle}.`),
      };
    }

    case 'SUBSCRIPTION_RECEIPT': {
      const planName = input.planName || 'EI HOUSE Pro Access';
      const amount = input.amount || 'Subscription Active';
      const content = `
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="background-color: #dbeafe; color: #1d4ed8; font-size: 13px; font-weight: 700; padding: 6px 14px; border-radius: 20px; display: inline-block;">
            ⚡ Subscription Active
          </span>
          <h1 style="color: #0B1528; font-size: 22px; font-weight: 700; margin: 16px 0 6px 0;">
            Welcome to ${escapeHtml(planName)}
          </h1>
          <p style="color: #64748b; font-size: 14px; margin: 0;">Subscriber: <strong>${escapeHtml(input.recipientName)}</strong></p>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 0 0 24px 0;">
          <p style="margin: 0 0 12px 0; font-weight: 700; color: #0b1528; font-size: 14px;">Your Membership Benefits:</p>
          <ul style="margin: 0; padding-left: 20px; color: #334155; font-size: 14px; line-height: 1.8;">
            <li>Unlimited 3D Engineering Lab simulations and cloud exports</li>
            <li>Direct engineering author publishing rights</li>
            <li>Priority datasheet &amp; IC pinout library search</li>
          </ul>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <p style="margin: 0; font-size: 13px; color: #64748b;">
            Billing &amp; Invoices: <strong style="color: #0b1528;">${escapeHtml(amount)}</strong> &bull; Managed by <a href="mailto:admin@eihouseindia.in" style="color: #1d4ed8;">admin@eihouseindia.in</a>
          </p>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${siteUrl}/dashboard" style="background-color: #1D4ED8; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
            Launch Pro Tools Now &rarr;
          </a>
        </div>
      `;
      return {
        subject: `Subscription Activated: ${planName} — EI HOUSE INDIA`,
        html: wrapEmailTemplate(content, `Your ${planName} subscription is now active.`),
      };
    }

    case 'COURSE_ACCESS': {
      const courseName = input.courseName || 'Engineering Course';
      const content = `
        <h1 style="color: #0B1528; font-size: 22px; font-weight: 700; margin: 0 0 16px 0; line-height: 1.3;">
          You're enrolled in ${escapeHtml(courseName)}! 🎓
        </h1>
        <p style="color: #334155; margin: 0 0 16px 0; font-size: 15px;">
          Hello ${escapeHtml(input.recipientName)}, your course workspace is prepared and ready on <strong>EI HOUSE INDIA</strong>.
        </p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin: 0 0 24px 0;">
          <p style="margin: 0 0 8px 0; font-weight: 700; color: #0b1528; font-size: 14px;">Next steps to begin:</p>
          <ol style="margin: 0; padding-left: 20px; color: #334155; font-size: 14px; line-height: 1.8;">
            <li>Log into your account at <a href="${siteUrl}/auth/login" style="color: #1d4ed8;">${siteUrl}/auth/login</a></li>
            <li>Head to your <strong>My Courses</strong> library</li>
            <li>Start with Module 1: Core Fundamentals &amp; Simulation Setup</li>
          </ol>
        </div>
        <p style="color: #64748b; font-size: 13px; margin: 0 0 24px 0;">
          Need technical or lab support? Reply directly to this email (<a href="mailto:info@eihouseindia.in" style="color: #1d4ed8;">info@eihouseindia.in</a>).
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${siteUrl}/dashboard" style="background-color: #0B1528; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
            Open Course Library
          </a>
        </div>
      `;
      return {
        subject: `Welcome to ${courseName} — Access Your Course Material`,
        html: wrapEmailTemplate(content, `You are enrolled in ${courseName}.`),
      };
    }

    case 'PASSWORD_RESET_OTP': {
      const otp = escapeHtml(input.otpCode || '000000');
      const content = `
        <h2 style="color: #0B1528; font-size: 21px; font-weight: 700; margin: 0 0 12px 0;">Password Reset Verification Code</h2>
        <p style="color: #334155; margin: 0 0 16px 0;">Hello ${escapeHtml(input.recipientName)},</p>
        <p style="color: #334155; margin: 0 0 20px 0;">
          We received a request to reset your <strong>${SITE_CONFIG.name}</strong> account password. Use the 6-digit verification code below to proceed:
        </p>
        <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 10px; padding: 22px; text-align: center; margin: 0 0 24px 0;">
          <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0B1528;">
            ${otp}
          </span>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #64748b;">
            This OTP is valid for <strong>10 minutes</strong> and can only be used once.
          </p>
        </div>
        <p style="color: #64748b; font-size: 13px; margin: 0;">
          If you did not request a password reset, please ignore this email—your account remains secure.
        </p>
      `;
      return {
        subject: `${otp} is your ${SITE_CONFIG.name} password reset OTP`,
        html: wrapEmailTemplate(content, `Your password reset OTP is ${otp}.`),
      };
    }

    case 'ACCOUNT_NOTICE':
    default: {
      const content = `
        <h2 style="color: #0B1528; font-size: 20px; font-weight: 700; margin: 0 0 16px 0;">Important Account Notice</h2>
        <p style="color: #334155; margin: 0 0 16px 0;">Hello ${input.recipientName},</p>
        <p style="color: #334155; margin: 0 0 20px 0;">
          ${input.customMessage || 'There is an important update regarding your EIHOUSE INDIA account.'}
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${siteUrl}/dashboard" style="background-color: #1D4ED8; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
            Open Dashboard
          </a>
        </div>
      `;
      return {
        subject: `Important account notice from ${SITE_CONFIG.name}`,
        html: wrapEmailTemplate(content, `Account update from ${SITE_CONFIG.name}.`),
      };
    }
  }
}

export async function sendEditorialEmail(
  input: SendEditorialEmailInput
): Promise<EmailDispatchResult> {
  const apiKey = process.env.RESEND_API_MAIN || process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 're_YOUR_RESEND_API_KEY') {
    return {
      sent: false,
      provider: 'unconfigured',
      reason: 'RESEND_API_MAIN / RESEND_API_KEY is not configured in server environment.',
    };
  }

  try {
    const resend = new Resend(apiKey);
    
    // Determine appropriate sender identity according to 3-tier architecture:
    // admin@ -> Billing, payment receipts, subscriptions, financial invoices
    // founder@ -> Executive, partnerships, VIP outreach
    // info@ -> System onboarding, courses, inquiries, editorial notifications
    const targetAccount = input.fromAccount || (
      input.event === 'PAYMENT_RECEIPT' || input.event === 'SUBSCRIPTION_RECEIPT'
        ? 'admin'
        : 'info'
    );

    let from = process.env.RESEND_FROM_EMAIL || `${SITE_CONFIG.name} <info@eihouseindia.in>`;
    let replyTo = 'info@eihouseindia.in';

    if (targetAccount === 'admin') {
      from = 'EI HOUSE Admin & Billing <admin@eihouseindia.in>';
      replyTo = 'admin@eihouseindia.in';
    } else if (targetAccount === 'founder') {
      from = 'Monu Prajapati | Founder EI HOUSE <founder@eihouseindia.in>';
      replyTo = 'founder@eihouseindia.in';
    } else {
      from = process.env.RESEND_FROM_EMAIL || `${SITE_CONFIG.name} <info@eihouseindia.in>`;
      replyTo = 'info@eihouseindia.in';
    }

    const { subject, html } = getEmailCopy(input);
    const isAdminEvent = input.event === 'ADMIN_POST_SUBMITTED' || input.event === 'ADMIN_CONTACT_INQUIRY';
    const recipientTo = isAdminEvent ? (input.to || SITE_CONFIG.bootstrapAdminEmail) : input.to;

    const response = await resend.emails.send({
      from,
      to: recipientTo,
      subject,
      html,
      replyTo,
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
