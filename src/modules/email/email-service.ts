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
  | 'ADMIN_CONTACT_INQUIRY';

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
    const isAdminEvent = input.event === 'ADMIN_POST_SUBMITTED' || input.event === 'ADMIN_CONTACT_INQUIRY';
    const recipientTo = isAdminEvent ? (input.to || SITE_CONFIG.bootstrapAdminEmail) : input.to;

    const response = await resend.emails.send({
      from,
      to: recipientTo,
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
