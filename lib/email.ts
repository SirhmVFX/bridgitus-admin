/**
 * Bridgitus email — SendGrid (active provider) + Amazon SES (kept for switch-over).
 *
 * TO ENABLE SENDGRID:
 * 1. Set SENDGRID_API_KEY in .env.local (from https://app.sendgrid.com/settings/api_keys)
 * 2. Verify EMAIL_FROM domain/sender in SendGrid
 * 3. Set EMAIL_ENABLED = true below
 *
 * TO SWITCH BACK TO AMAZON SES later:
 * - Comment out the SendGrid block in sendEmail()
 * - Uncomment the Amazon SES block
 * - Ensure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, EMAIL_FROM are set
 */

// import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

/** Set to `true` when your SendGrid API key is ready and you want emails to send. */
export const EMAIL_ENABLED = true;

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string | string[];
  from?: string;
}

function defaultFrom(): string {
  return (
    process.env.EMAIL_FROM ||
    process.env.AWS_SES_FROM_EMAIL ||
    "noreply@bridgitus.com"
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeList(value?: string | string[]): string[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value])
    .map((s) => s.trim())
    .filter(Boolean);
}

/*
// ── Amazon SES helpers (kept for switch-over — do not delete) ───────────────
function getSesClient(): SESClient {
  const region = process.env.AWS_REGION || process.env.AWS_SES_REGION || "ap-southeast-2";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set for SES email.");
  }

  return new SESClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
}
// ────────────────────────────────────────────────────────────────────────────
*/

/** Send one email via SendGrid. (No-ops while EMAIL_ENABLED=false.) */
export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  if (!EMAIL_ENABLED) {
    console.warn(
      "[email] Skipped (EMAIL_ENABLED=false):",
      opts.subject,
      "→",
      opts.to,
    );
    return;
  }

  const to = normalizeList(opts.to);
  if (to.length === 0) throw new Error("No email recipients provided.");

  const from = opts.from || defaultFrom();
  const text = opts.text || stripHtml(opts.html);
  const replyTo = normalizeList(opts.replyTo);

  // ── SendGrid (active) ─────────────────────────────────────────────────────
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  if (!apiKey || apiKey === "your_sendgrid_api_key") {
    throw new Error("SENDGRID_API_KEY is not configured in .env.local");
  }

  const payload: Record<string, unknown> = {
    personalizations: [{ to: to.map((email) => ({ email })) }],
    from: { email: from, name: "Bridgitus Learning" },
    subject: opts.subject,
    content: [
      { type: "text/plain", value: text },
      { type: "text/html", value: opts.html },
    ],
  };
  if (replyTo[0]) {
    payload.reply_to = { email: replyTo[0] };
  }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(
      `SendGrid error ${res.status}: ${errBody || res.statusText}`,
    );
  }
  // ──────────────────────────────────────────────────────────────────────────

  /*
  // ── Amazon SES (commented — uncomment to switch back) ─────────────────────
  const client = getSesClient();
  await client.send(
    new SendEmailCommand({
      Source: from,
      Destination: { ToAddresses: to },
      ReplyToAddresses: replyTo.length ? replyTo : undefined,
      Message: {
        Subject: { Data: opts.subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: opts.html, Charset: "UTF-8" },
          Text: { Data: text, Charset: "UTF-8" },
        },
      },
    })
  );
  // ──────────────────────────────────────────────────────────────────────────
  */
}

/** Send the same message to many recipients (one call per address). */
export async function sendEmailToMany(
  recipients: string[],
  opts: Omit<SendEmailOptions, "to">,
): Promise<{ sent: number; failed: number; errors: string[] }> {
  if (!EMAIL_ENABLED) {
    console.warn(
      "[email] Skipped batch (EMAIL_ENABLED=false):",
      opts.subject,
      "→",
      recipients.length,
      "recipients",
    );
    return { sent: 0, failed: 0, errors: ["Email temporarily disabled"] };
  }

  const unique = [
    ...new Set(recipients.map((e) => e.trim().toLowerCase()).filter(Boolean)),
  ];
  const errors: string[] = [];
  let sent = 0;
  let failed = 0;

  const batchSize = 5;
  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((to) => sendEmail({ ...opts, to })),
    );
    for (const r of results) {
      if (r.status === "fulfilled") sent++;
      else {
        failed++;
        errors.push(
          r.reason instanceof Error ? r.reason.message : String(r.reason),
        );
      }
    }
  }

  return { sent, failed, errors };
}

/** True when outbound email is enabled and SendGrid is configured. */
export function isEmailConfigured(): boolean {
  if (!EMAIL_ENABLED) return false;
  const key = process.env.SENDGRID_API_KEY?.trim();
  return Boolean(key && key !== "your_sendgrid_api_key" && defaultFrom());

  /*
  // Amazon SES check (use if you switch providers):
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      (process.env.EMAIL_FROM || process.env.AWS_SES_FROM_EMAIL)
  );
  */
}

/** @deprecated Alias — prefer isEmailConfigured(). Kept so existing API routes keep working. */
export function isSesConfigured(): boolean {
  return isEmailConfigured();
}

/** Shared branded HTML wrapper for Bridgitus emails. */
export function brandedEmail(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',sans-serif;background:#f8fafc;">
  <div style="max-width:600px;margin:0 auto;background:#fff;">
    <div style="background:#00369b;padding:28px 36px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:20px;">${title}</h1>
    </div>
    <div style="padding:32px 36px;color:#334155;font-size:15px;line-height:1.6;">
      ${bodyHtml}
      <p style="margin-top:28px;">Best regards,<br><strong>The Bridgitus Team</strong></p>
    </div>
    <div style="padding:16px 36px;background:#f1f5f9;text-align:center;font-size:12px;color:#94a3b8;">
      © ${new Date().getFullYear()} Bridgitus Learning
    </div>
  </div>
</body></html>`;
}
