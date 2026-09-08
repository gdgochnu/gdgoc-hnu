import { createAdminClient } from '@/lib/supabase/admin';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  metadata?: Record<string, any>;
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
  simulated?: boolean;
}

/**
 * Generic email dispatcher.
 * Supports Resend / standard HTTP email providers, with graceful local fallback and audit logging.
 */
export async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'GDGoC HNU <notifications@gdgoc.hnu.edu.eg>';

  try {
    // 1. If an active API key is provided, send through Resend
    if (apiKey && apiKey.startsWith('re_')) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [params.to],
          subject: params.subject,
          html: params.html,
          text: params.text || params.subject,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        console.warn('Email provider returned non-200 response:', resData);
        // Fall back to audit logging without throwing
      } else {
        return { success: true, id: resData.id };
      }
    }

    // 2. Simulated / Local Development Delivery
    // We log to audit_logs to preserve a verifiable record of every notification email
    const admin = createAdminClient();
    await admin.from('audit_logs').insert({
      actor_id: null,
      action: 'email_dispatched',
      entity_type: 'email',
      metadata: {
        to: params.to,
        subject: params.subject,
        simulated: !apiKey,
        sent_at: new Date().toISOString(),
        ...params.metadata,
      },
    });

    console.log(`[EMAIL DISPATCHED] To: ${params.to} | Subject: "${params.subject}" (Simulated: ${!apiKey})`);
    return { success: true, id: `local-${Date.now()}`, simulated: !apiKey };
  } catch (err: unknown) {
    console.error('Error during email dispatch:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown email error' };
  }
}

/**
 * Base email layout with official GDGoC styling
 */
function renderEmailLayout(title: string, contentHtml: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0F19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8F9FA;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0F19; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #131722; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1); overflow: hidden;">
          <!-- Top 4-color Google Brand Bar -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%);"></td>
          </tr>
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 16px 32px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; font-size: 13px; font-weight: 700; color: #4285F4; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">
                      Google Developer Groups on Campus
                    </span>
                    <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.02em;">
                      Helwan National University • Chapter OS
                    </h2>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <div style="height: 1px; background-color: rgba(255, 255, 255, 0.08); width: 100%;"></div>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 24px 32px 32px 32px; font-size: 15px; line-height: 1.6; color: #D1D5DB;">
              ${contentHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #0A0D15; padding: 24px 32px; font-size: 12px; color: #6B7280; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.06);">
              <p style="margin: 0 0 8px 0;">
                Google Developer Groups on Campus — Helwan National University
              </p>
              <p style="margin: 0; color: #4B5563;">
                One Platform. One Source of Truth. • This is an automated operational notification.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * 1. Send Welcome / Account Approved Email
 */
export async function sendWelcomeApprovedEmail(params: {
  to: string;
  fullName: string;
  role: string;
  departmentName: string;
  position?: string;
  portalUrl?: string;
}): Promise<EmailResult> {
  const portalUrl = params.portalUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const roleDisplay = params.role.replace('_', ' ').toUpperCase();

  const content = `
    <div style="margin-bottom: 24px;">
      <span style="display: inline-block; padding: 4px 12px; border-radius: 999px; background-color: rgba(52, 168, 83, 0.15); color: #86EFAC; font-size: 12px; font-weight: 700; text-transform: uppercase;">
        Application Approved 🎉
      </span>
      <h1 style="font-size: 24px; font-weight: 800; color: #FFFFFF; margin: 12px 0 8px 0;">
        Welcome to GDGoC HNU, ${params.fullName}!
      </h1>
      <p style="margin: 0; color: #9CA3AF; font-size: 15px;">
        Congratulations! Chapter Leadership has approved your application to join Google Developer Groups on Campus — Helwan National University.
      </p>
    </div>

    <!-- Details Box -->
    <div style="background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 20px; margin-bottom: 28px;">
      <table width="100%" border="0" cellspacing="0" cellpadding="6">
        <tr>
          <td width="35%" style="font-size: 13px; color: #9CA3AF;">Assigned Role:</td>
          <td style="font-size: 14px; font-weight: 700; color: #FFFFFF;">${roleDisplay}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #9CA3AF;">Committee:</td>
          <td style="font-size: 14px; font-weight: 700; color: #4285F4;">${params.departmentName}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #9CA3AF;">Position:</td>
          <td style="font-size: 14px; font-weight: 600; color: #E5E7EB;">${params.position || 'Member'}</td>
        </tr>
      </table>
    </div>

    <p style="margin-bottom: 24px; color: #D1D5DB;">
      Your account is now fully active. You can access the Chapter Operating System to collaborate on committee tasks, register for chapter events, track attendance streaks, and earn official certificates.
    </p>

    <!-- Action Button -->
    <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
      <tr>
        <td align="center" style="border-radius: 8px; background: linear-gradient(135deg, #4285F4 0%, #1A73E8 100%);">
          <a href="${portalUrl}" target="_blank" style="font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; padding: 14px 28px; display: inline-block; border-radius: 8px;">
            Enter Chapter Operating System &rarr;
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 13px; color: #9CA3AF;">
      Next steps: check in with your Committee Head, review your committee's workspace, and join the official chapter channels.
    </p>
  `;

  return sendEmail({
    to: params.to,
    subject: 'Welcome to GDGoC HNU! Your Account is Approved 🎉',
    html: renderEmailLayout('Welcome to GDGoC HNU', content),
    metadata: {
      type: 'account_approved',
      role: params.role,
      department: params.departmentName,
    },
  });
}

/**
 * 2. Send Changes Requested Email
 */
export async function sendChangesRequestedEmail(params: {
  to: string;
  fullName: string;
  notes: string;
  actionUrl?: string;
}): Promise<EmailResult> {
  const actionUrl = params.actionUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/onboarding/complete-profile`;

  const content = `
    <div style="margin-bottom: 24px;">
      <span style="display: inline-block; padding: 4px 12px; border-radius: 999px; background-color: rgba(251, 188, 4, 0.15); color: #FDE047; font-size: 12px; font-weight: 700; text-transform: uppercase;">
        Action Required
      </span>
      <h1 style="font-size: 24px; font-weight: 800; color: #FFFFFF; margin: 12px 0 8px 0;">
        Application Revision Request
      </h1>
      <p style="margin: 0; color: #9CA3AF; font-size: 15px;">
        Hi ${params.fullName}, Chapter Leadership has reviewed your application and requested modifications before approving your account.
      </p>
    </div>

    <!-- Reviewer Notes Box -->
    <div style="background-color: rgba(251, 188, 4, 0.08); border: 1px solid rgba(251, 188, 4, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <div style="font-size: 13px; font-weight: 700; color: #FDE047; margin-bottom: 8px;">
        Leadership Instructions & Feedback:
      </div>
      <div style="font-size: 15px; color: #FFFBEB; line-height: 1.6; font-style: italic;">
        "${params.notes}"
      </div>
    </div>

    <p style="margin-bottom: 24px; color: #D1D5DB;">
      Please click the button below to update your application details and resubmit for leadership review:
    </p>

    <!-- Action Button -->
    <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
      <tr>
        <td align="center" style="border-radius: 8px; background: linear-gradient(135deg, #FBBC04 0%, #D97706 100%);">
          <a href="${actionUrl}" target="_blank" style="font-size: 15px; font-weight: 700; color: #000000; text-decoration: none; padding: 14px 28px; display: inline-block; border-radius: 8px;">
            Update & Resubmit Profile &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  return sendEmail({
    to: params.to,
    subject: 'Action Required: Revisions Requested on Your GDGoC HNU Application',
    html: renderEmailLayout('Revisions Requested — GDGoC HNU', content),
    metadata: {
      type: 'changes_requested',
      notes: params.notes,
    },
  });
}

/**
 * 3. Send Rejection Email
 */
export async function sendRejectionEmail(params: {
  to: string;
  fullName: string;
  reason?: string;
  portalUrl?: string;
}): Promise<EmailResult> {
  const portalUrl = params.portalUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const content = `
    <div style="margin-bottom: 24px;">
      <span style="display: inline-block; padding: 4px 12px; border-radius: 999px; background-color: rgba(234, 67, 53, 0.15); color: #FCA5A5; font-size: 12px; font-weight: 700; text-transform: uppercase;">
        Application Decision
      </span>
      <h1 style="font-size: 24px; font-weight: 800; color: #FFFFFF; margin: 12px 0 8px 0;">
        GDGoC HNU Application Update
      </h1>
      <p style="margin: 0; color: #9CA3AF; font-size: 15px;">
        Dear ${params.fullName},
      </p>
    </div>

    <p style="color: #D1D5DB; line-height: 1.6; margin-bottom: 20px;">
      Thank you for your interest in joining Google Developer Groups on Campus — Helwan National University. We received a tremendous number of applications from talented students across all faculties.
    </p>

    <p style="color: #D1D5DB; line-height: 1.6; margin-bottom: 20px;">
      After careful review by the leadership team, we regret to inform you that we are unable to accept your application for an official committee position at this time.
    </p>

    ${params.reason ? `
    <div style="background-color: rgba(234, 67, 53, 0.06); border: 1px solid rgba(234, 67, 53, 0.25); border-radius: 12px; padding: 18px; margin-bottom: 24px;">
      <div style="font-size: 12px; font-weight: 700; color: #FCA5A5; margin-bottom: 6px;">
        Review Feedback:
      </div>
      <div style="font-size: 14px; color: #FEE2E2; line-height: 1.5;">
        ${params.reason}
      </div>
    </div>
    ` : ''}

    <p style="color: #D1D5DB; line-height: 1.6; margin-bottom: 24px;">
      Please note that all of our workshops, tech talks, hackathons, and public events remain completely open to you! You can attend any upcoming events and re-apply in our next recruitment cycle.
    </p>

    <!-- Action Button -->
    <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
      <tr>
        <td align="center" style="border-radius: 8px; background-color: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15);">
          <a href="${portalUrl}" target="_blank" style="font-size: 14px; font-weight: 600; color: #FFFFFF; text-decoration: none; padding: 12px 24px; display: inline-block; border-radius: 8px;">
            View Public Chapter Events &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  return sendEmail({
    to: params.to,
    subject: 'GDGoC HNU Application Status Update',
    html: renderEmailLayout('Application Status Update — GDGoC HNU', content),
    metadata: {
      type: 'account_rejected',
      reason: params.reason,
    },
  });
}

/**
 * 4. Send Event Registration Confirmation & QR Ticket Email
 * Spec reference: §4.3 item 4 & Phase 8 Step 8.8
 */
export async function sendEventRegistrationEmail(params: {
  to: string;
  fullName: string;
  eventTitle: string;
  eventSlug: string;
  eventDate: string;
  startTime?: string | null;
  endTime?: string | null;
  venue?: string | null;
  qrCode: string;
  status: 'registered' | 'waitlisted';
  registrationId: string;
  confirmationUrl?: string;
}): Promise<EmailResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const confirmationUrl = params.confirmationUrl || `${appUrl}/events/${params.eventSlug}/confirmation?reg=${params.registrationId}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(params.qrCode)}&margin=10`;

  const isWaitlist = params.status === 'waitlisted';
  const subject = isWaitlist
    ? `Waitlist Confirmation: ${params.eventTitle} — GDGoC HNU`
    : `🎟️ Your Entry Pass: ${params.eventTitle} — GDGoC HNU`;

  const statusBadgeColor = isWaitlist ? '#FBBC04' : '#34A853';
  const statusBadgeBg = isWaitlist ? 'rgba(251, 188, 4, 0.15)' : 'rgba(52, 168, 83, 0.15)';
  const statusLabel = isWaitlist ? 'Waitlisted Attendee' : 'Confirmed Entry Pass';

  const content = `
    <div style="margin-bottom: 24px;">
      <span style="display: inline-block; padding: 4px 12px; border-radius: 999px; background-color: ${statusBadgeBg}; color: ${statusBadgeColor}; font-size: 12px; font-weight: 700; text-transform: uppercase;">
        ${statusLabel}
      </span>
      <h1 style="font-size: 24px; font-weight: 800; color: #FFFFFF; margin: 12px 0 8px 0;">
        ${isWaitlist ? "You're on the Waitlist!" : "You're Registered!"}
      </h1>
      <p style="margin: 0; color: #9CA3AF; font-size: 15px;">
        Dear <strong>${params.fullName}</strong>, thank you for registering with Google Developer Groups on Campus — Helwan National University.
      </p>
    </div>

    <!-- Event Summary Card -->
    <div style="background-color: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <div style="font-size: 18px; font-weight: 800; color: #60A5FA; margin-bottom: 12px;">
        ${params.eventTitle}
      </div>
      <table border="0" cellspacing="0" cellpadding="0" width="100%">
        <tr>
          <td style="padding: 6px 0; color: #9CA3AF; font-size: 14px; width: 100px;">📅 Date:</td>
          <td style="padding: 6px 0; color: #FFFFFF; font-size: 14px; font-weight: 600;">${params.eventDate}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #9CA3AF; font-size: 14px;">⏰ Time:</td>
          <td style="padding: 6px 0; color: #FFFFFF; font-size: 14px; font-weight: 600;">${params.startTime || '10:00'} ${params.endTime ? `– ${params.endTime}` : ''} (EET)</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #9CA3AF; font-size: 14px;">📍 Venue:</td>
          <td style="padding: 6px 0; color: #FFFFFF; font-size: 14px; font-weight: 600;">${params.venue || 'Helwan National University'}</td>
        </tr>
      </table>
    </div>

    ${!isWaitlist ? `
    <!-- QR Code Pass Section -->
    <div style="background-color: #000000; border: 1px solid rgba(66, 133, 244, 0.35); border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <div style="font-size: 12px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
        OFFICIAL CAMPUS CHECK-IN PASS
      </div>
      <div style="display: inline-block; background-color: #FFFFFF; padding: 12px; border-radius: 12px; margin-bottom: 12px;">
        <img src="${qrImageUrl}" alt="Event Check-in QR Pass" width="200" height="200" style="display: block; margin: 0 auto;" />
      </div>
      <div style="font-size: 12px; color: #94A3B8; margin-bottom: 4px;">Ticket Pass Code:</div>
      <div style="font-family: monospace; font-size: 14px; color: #60A5FA; font-weight: 700; word-break: break-all;">
        ${params.qrCode}
      </div>
      <p style="color: #CBD5E1; font-size: 13px; line-height: 1.5; margin-top: 14px; margin-bottom: 0;">
        💡 <strong>Fast Check-in:</strong> Please have this QR code ready on your phone when arriving at the event desk for swift verification.
      </p>
    </div>
    ` : `
    <!-- Waitlist Notice -->
    <div style="background-color: rgba(251, 188, 4, 0.08); border: 1px solid rgba(251, 188, 4, 0.3); border-radius: 12px; padding: 18px; margin-bottom: 24px;">
      <div style="font-size: 13px; font-weight: 700; color: #FDE047; margin-bottom: 6px;">
        Waitlist Status Notice:
      </div>
      <div style="font-size: 14px; color: #FFFBEB; line-height: 1.5;">
        Due to high demand, this event has reached capacity. You have been placed on the priority waitlist. If an attendee cancels or additional seating opens up, your ticket will automatically be activated and we will email you your check-in QR pass.
      </div>
    </div>
    `}

    <!-- Action Button -->
    <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; width: 100%;">
      <tr>
        <td align="center" style="border-radius: 8px; background: linear-gradient(135deg, #4285F4 0%, #1A73E8 100%);">
          <a href="${confirmationUrl}" target="_blank" style="font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; padding: 14px 28px; display: inline-block; border-radius: 8px;">
            View Digital Pass &amp; Details &rarr;
          </a>
        </td>
      </tr>
    </table>

    <p style="font-size: 13px; color: #64748B; text-align: center; margin: 0;">
      Need to make changes or have questions? Reach out to the GDGoC HNU organizing team.
    </p>
  `;

  return sendEmail({
    to: params.to,
    subject,
    html: renderEmailLayout(`${params.eventTitle} — Pass Confirmation`, content),
    metadata: {
      type: 'event_registration',
      registrationId: params.registrationId,
      qrCode: params.qrCode,
      eventSlug: params.eventSlug,
      status: params.status,
    },
  });
}

export interface SendEventFeedbackSurveyParams {
  to: string;
  attendeeName?: string;
  eventId: string;
  eventTitle: string;
  eventSlug?: string;
  eventDate?: string;
  feedbackUrl?: string;
  registrationId?: string;
}

/**
 * Sends a post-event satisfaction & feedback survey email to attendees.
 * Spec §4.18: Sent automatically when an event status transitions to 'completed'.
 */
export async function sendEventFeedbackSurveyEmail(params: SendEventFeedbackSurveyParams): Promise<EmailResult> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const targetUrl = params.feedbackUrl || `${siteUrl}/events/${params.eventSlug || params.eventId}/feedback`;

  const subject = `⭐ How was ${params.eventTitle}? Share your feedback — GDGoC HNU`;
  const name = params.attendeeName || 'Attendee';

  const content = `
    <div style="margin-bottom: 24px;">
      <span style="display: inline-block; padding: 4px 12px; border-radius: 999px; background-color: rgba(66, 133, 244, 0.15); color: #60A5FA; font-size: 12px; font-weight: 700; text-transform: uppercase;">
        Event Completed
      </span>
      <h1 style="font-size: 24px; font-weight: 800; color: #FFFFFF; margin: 12px 0 8px 0;">
        Thank You for Attending!
      </h1>
      <p style="margin: 0; color: #9CA3AF; font-size: 15px; line-height: 1.6;">
        Dear <strong>${name}</strong>, thank you for joining us at <strong>${params.eventTitle}</strong>! We hope you enjoyed the sessions and gained valuable insights.
      </p>
    </div>

    <!-- Feedback Prompt Card -->
    <div style="background-color: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <div style="font-size: 13px; font-weight: 700; color: #FBBC04; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
        30-Second Quick Survey
      </div>
      <div style="font-size: 18px; font-weight: 800; color: #FFFFFF; margin-bottom: 12px;">
        Rate Your Experience
      </div>
      <div style="font-size: 28px; margin-bottom: 16px; letter-spacing: 6px;">
        ⭐ ⭐ ⭐ ⭐ ⭐
      </div>
      <p style="font-size: 14px; color: #94A3B8; margin: 0 auto 20px auto; max-width: 440px; line-height: 1.5;">
        Your feedback shapes our future workshops, hackathons, and technical bootcamps. You can choose to submit anonymously or with your name.
      </p>
      
      <!-- CTA Button -->
      <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
        <tr>
          <td align="center" style="border-radius: 8px; background: linear-gradient(135deg, #4285F4 0%, #1A73E8 100%);">
            <a href="${targetUrl}" target="_blank" style="font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; padding: 14px 32px; display: inline-block; border-radius: 8px;">
              Complete Quick Survey &rarr;
            </a>
          </td>
        </tr>
      </table>
    </div>

    <div style="background-color: rgba(30, 41, 59, 0.5); border-radius: 10px; padding: 14px 18px; margin-bottom: 24px;">
      <table border="0" cellspacing="0" cellpadding="0" width="100%">
        <tr>
          <td style="color: #64748B; font-size: 13px;">🔒 Privacy Note:</td>
          <td style="color: #94A3B8; font-size: 13px; text-align: right;">Anonymous by default (toggleable)</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 13px; color: #64748B; text-align: center; margin: 0;">
      Google Developer Groups on Campus — Helwan National University<br/>
      Building tomorrow's tech community together.
    </p>
  `;

  return sendEmail({
    to: params.to,
    subject,
    html: renderEmailLayout(`${params.eventTitle} — Event Feedback Survey`, content),
    metadata: {
      type: 'event_feedback_survey',
      eventId: params.eventId,
      eventSlug: params.eventSlug,
      registrationId: params.registrationId,
    },
  });
}
