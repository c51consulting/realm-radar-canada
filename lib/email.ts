/**
 * Transactional email wrapper.
 *
 * Wraps Resend so callers don't have to care whether the env is configured
 * or not. If RESEND_API_KEY is missing we DO NOT throw — we log a clear
 * warning and return { ok: false, reason: 'not_configured' }. Callers
 * decide whether that's an error (e.g. subscribe flow → user-visible error)
 * or fine-to-skip (e.g. dev branch with no creds).
 *
 * We never invent a "sent" success when nothing actually went out.
 */
import { Resend } from 'resend';

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'not_configured' | 'send_failed'; error?: string };

const FROM = process.env.RADAR_FROM_EMAIL || 'REALM Radar <radar@realmgroup.global>';

let cachedClient: Resend | null = null;
function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!cachedClient) cachedClient = new Resend(key);
  return cachedClient;
}

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<SendResult> {
  const c = client();
  if (!c) {
    console.warn(
      '[email] RESEND_API_KEY not set — email send skipped for',
      args.to,
      'subject:',
      args.subject,
    );
    return { ok: false, reason: 'not_configured' };
  }

  try {
    const result = await c.emails.send({
      from: FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      replyTo: args.replyTo,
    });
    if (result.error) {
      console.error('[email] Resend error:', result.error);
      return { ok: false, reason: 'send_failed', error: result.error.message };
    }
    return { ok: true, id: result.data?.id || '' };
  } catch (e: any) {
    console.error('[email] send threw:', e);
    return { ok: false, reason: 'send_failed', error: e?.message || String(e) };
  }
}

// ---------- Templates ----------
//
// Plain inline HTML — no React Email yet. Branded restraint: serif heading,
// short copy, one clear CTA, plus plain-text URL for clients that strip links.

export function confirmEmailHtml(args: { confirmUrl: string; email: string }) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1F1B16;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#FFFFFF;border:1px solid #E8E0D2;border-radius:14px;padding:32px;">
            <tr>
              <td>
                <p style="margin:0 0 16px 0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#B2563F;font-weight:600;">REALM Radar Canada</p>
                <h1 style="margin:0 0 16px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.3;font-weight:500;">Confirm your subscription</h1>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;">Thanks for subscribing to REALM Radar Canada. Click the button below to confirm <strong>${escapeHtml(args.email)}</strong> and start receiving the weekly briefing.</p>
                <p style="margin:24px 0;">
                  <a href="${escapeAttr(args.confirmUrl)}" style="display:inline-block;background:#586B4A;color:#FAF7F2;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:500;">Confirm my subscription</a>
                </p>
                <p style="margin:0 0 8px 0;font-size:13px;color:#1F1B16;opacity:0.65;">Or paste this link in your browser:</p>
                <p style="margin:0 0 24px 0;font-size:12px;word-break:break-all;color:#586B4A;">${escapeHtml(args.confirmUrl)}</p>
                <hr style="border:none;border-top:1px solid #E8E0D2;margin:24px 0;" />
                <p style="margin:0;font-size:12px;color:#1F1B16;opacity:0.55;line-height:1.6;">
                  If you didn&rsquo;t request this, ignore the email and you won&rsquo;t be subscribed.
                  Questions or takedowns: <a href="mailto:radar@realmgroup.global" style="color:#586B4A;">radar@realmgroup.global</a>.
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

export function confirmEmailText(args: { confirmUrl: string; email: string }) {
  return `REALM Radar Canada — confirm your subscription

Thanks for subscribing. Click the link below to confirm ${args.email} and start receiving the weekly briefing:

${args.confirmUrl}

If you didn't request this, ignore the email and you won't be subscribed.

Questions or takedowns: radar@realmgroup.global
`;
}

// ---------- Saved-search confirmation (CROSS-6) ----------

export function savedSearchConfirmHtml(args: { confirmUrl: string; email: string; description: string }) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1F1B16;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#FFFFFF;border:1px solid #E8E0D2;border-radius:14px;padding:32px;">
          <tr><td>
            <p style="margin:0 0 16px 0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#B2563F;font-weight:600;">REALM Radar · Saved search</p>
            <h1 style="margin:0 0 16px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.3;font-weight:500;">Confirm your saved search</h1>
            <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;">We&rsquo;ll email <strong>${escapeHtml(args.email)}</strong> whenever new listings match:</p>
            <p style="margin:0 0 20px 0;padding:12px 14px;background:#FAF7F2;border-left:3px solid #586B4A;font-size:14px;line-height:1.5;color:#1F1B16;">${escapeHtml(args.description)}</p>
            <p style="margin:24px 0;">
              <a href="${escapeAttr(args.confirmUrl)}" style="display:inline-block;background:#586B4A;color:#FAF7F2;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:500;">Confirm this alert</a>
            </p>
            <p style="margin:0 0 8px 0;font-size:13px;color:#1F1B16;opacity:0.65;">Or paste this link in your browser:</p>
            <p style="margin:0 0 24px 0;font-size:12px;word-break:break-all;color:#586B4A;">${escapeHtml(args.confirmUrl)}</p>
            <hr style="border:none;border-top:1px solid #E8E0D2;margin:24px 0;" />
            <p style="margin:0;font-size:12px;color:#1F1B16;opacity:0.55;line-height:1.6;">If you didn&rsquo;t request this, ignore the email. Questions: <a href="mailto:radar@realmgroup.global" style="color:#586B4A;">radar@realmgroup.global</a>.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function savedSearchConfirmText(args: { confirmUrl: string; email: string; description: string }) {
  return `REALM Radar — confirm your saved search

We'll email ${args.email} when new listings match:
  ${args.description}

Confirm: ${args.confirmUrl}

If you didn't request this, ignore the email.
Questions: radar@realmgroup.global
`;
}

// ---------- Weekly digest ----------

type DigestItem = {
  id: string;
  clean_title?: string | null;
  raw_title?: string | null;
  state?: string | null;
  category?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  display_url?: string | null;
  realm_take?: string | null;
  sale_date?: string | null;
};

export function weeklyDigestHtml(args: {
  intro: string;
  groups: { heading: string; items: DigestItem[] }[];
  unsubscribeUrl: string;
  siteUrl: string;
  weekLabel: string;
}) {
  const groupBlocks = args.groups
    .map(
      (g) => `
      <h2 style="margin:28px 0 12px 0;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:500;color:#1F1B16;border-bottom:1px solid #E8E0D2;padding-bottom:8px;">${escapeHtml(g.heading)}</h2>
      ${g.items
        .map((i) => {
          const title = i.clean_title || i.raw_title || 'Listing';
          const href = i.display_url || i.source_url || `${args.siteUrl}/radar`;
          const meta = [i.source_name, i.sale_date].filter(Boolean).join(' · ');
          return `
          <div style="margin:0 0 16px 0;">
            <p style="margin:0 0 4px 0;font-size:15px;font-weight:500;"><a href="${escapeAttr(href)}" style="color:#1F1B16;text-decoration:none;">${escapeHtml(title)}</a></p>
            ${meta ? `<p style="margin:0 0 4px 0;font-size:12px;color:#1F1B16;opacity:0.55;">${escapeHtml(meta)}</p>` : ''}
            ${i.realm_take ? `<p style="margin:0;font-size:13px;line-height:1.5;color:#1F1B16;opacity:0.85;border-left:2px solid #A8B89A;padding-left:10px;"><em>REALM Take.</em> ${escapeHtml(i.realm_take)}</p>` : ''}
          </div>`;
        })
        .join('')}`,
    )
    .join('');

  return `<!doctype html>
<html>
  <body style="margin:0;background:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1F1B16;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="620" style="max-width:620px;background:#FFFFFF;border:1px solid #E8E0D2;border-radius:14px;padding:32px;">
          <tr><td>
            <p style="margin:0 0 8px 0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#B2563F;font-weight:600;">REALM Radar Canada · ${escapeHtml(args.weekLabel)}</p>
            <h1 style="margin:0 0 16px 0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;font-weight:500;">What’s moving across the Canadian ag market</h1>
            <p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;">${escapeHtml(args.intro)}</p>
            ${groupBlocks}
            <hr style="border:none;border-top:1px solid #E8E0D2;margin:28px 0;" />
            <p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;">See more on <a href="${escapeAttr(args.siteUrl)}/radar" style="color:#586B4A;">REALM Radar</a>. Have a listing? <a href="${escapeAttr(args.siteUrl)}/radar/submit" style="color:#586B4A;">Submit it here</a>.</p>
            <p style="margin:16px 0 0 0;font-size:11px;color:#1F1B16;opacity:0.55;line-height:1.6;">REALM Radar curates publicly available listings. We do not own or guarantee third-party sales. <a href="${escapeAttr(args.unsubscribeUrl)}" style="color:#586B4A;">Unsubscribe</a> · <a href="mailto:radar@realmgroup.global" style="color:#586B4A;">radar@realmgroup.global</a></p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function weeklyDigestText(args: {
  intro: string;
  groups: { heading: string; items: DigestItem[] }[];
  unsubscribeUrl: string;
  siteUrl: string;
  weekLabel: string;
}) {
  const groupTxt = args.groups
    .map((g) => `\n## ${g.heading}\n${g.items
      .map((i) => {
        const t = i.clean_title || i.raw_title || 'Listing';
        const href = i.display_url || i.source_url || `${args.siteUrl}/radar`;
        const meta = [i.source_name, i.sale_date].filter(Boolean).join(' · ');
        return `- ${t}\n  ${href}${meta ? `\n  ${meta}` : ''}${i.realm_take ? `\n  REALM Take: ${i.realm_take}` : ''}`;
      })
      .join('\n')}`)
    .join('\n');
  return `REALM RADAR CANADA — ${args.weekLabel}\n\n${args.intro}\n${groupTxt}\n\nMore: ${args.siteUrl}/radar\nSubmit: ${args.siteUrl}/radar/submit\nUnsubscribe: ${args.unsubscribeUrl}\n`;
}

// ---------- Submission notification ----------

export function submissionNotificationHtml(args: {
  businessName: string;
  contactName?: string | null;
  email: string;
  phone?: string | null;
  website?: string | null;
  listingUrl: string;
  state?: string | null;
  category?: string | null;
  saleDate?: string | null;
  description?: string | null;
  permissionToFeature: boolean;
  paidFeatureInterest: boolean;
  adminUrl: string;
}) {
  const row = (k: string, v: string | null | undefined) =>
    v ? `<tr><td style="padding:6px 10px 6px 0;font-size:12px;color:#1F1B16;opacity:0.55;vertical-align:top;">${escapeHtml(k)}</td><td style="padding:6px 0;font-size:14px;">${escapeHtml(v)}</td></tr>` : '';
  return `<!doctype html><html><body style="margin:0;background:#FAF7F2;font-family:-apple-system,sans-serif;color:#1F1B16;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:32px 16px;"><tr><td align="center">
      <table cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#fff;border:1px solid #E8E0D2;border-radius:14px;padding:28px;"><tr><td>
        <p style="margin:0 0 8px 0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#B2563F;font-weight:600;">REALM Radar · New submission</p>
        <h1 style="margin:0 0 16px 0;font-family:Georgia,serif;font-size:22px;font-weight:500;">${escapeHtml(args.businessName)}</h1>
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
          ${row('Contact', args.contactName)}
          ${row('Email', args.email)}
          ${row('Phone', args.phone)}
          ${row('Website', args.website)}
          ${row('Listing URL', args.listingUrl)}
          ${row('State', args.state)}
          ${row('Category', args.category)}
          ${row('Sale date', args.saleDate)}
          ${row('Permission to feature', args.permissionToFeature ? 'Yes' : 'No')}
          ${row('Paid feature interest', args.paidFeatureInterest ? 'Yes' : 'No')}
        </table>
        ${args.description ? `<p style="margin:16px 0 0 0;font-size:14px;line-height:1.6;background:#FAF7F2;padding:12px;border-radius:8px;">${escapeHtml(args.description)}</p>` : ''}
        <p style="margin:24px 0 0 0;"><a href="${escapeAttr(args.adminUrl)}" style="display:inline-block;background:#586B4A;color:#FAF7F2;text-decoration:none;padding:10px 18px;border-radius:999px;font-size:13px;font-weight:500;">Review in admin</a></p>
      </td></tr></table>
    </td></tr></table>
  </body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeAttr(s: string): string {
  return escapeHtml(s);
}
