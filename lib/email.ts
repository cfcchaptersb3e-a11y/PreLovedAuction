import "server-only";
import { formatMoney } from "@/lib/money";

/**
 * Email sending is deliberately optional, and supports two providers so a
 * chapter can send without owning a domain.
 *
 * - **Brevo** (BREVO_API_KEY) verifies a single sender address — the chapter's
 *   own Gmail, say — so no domain is needed.
 * - **Resend** (RESEND_API_KEY) needs a verified sending domain before it will
 *   deliver to anyone but the account owner.
 * - With neither set, messages are written to the server log, so local
 *   development and first-time setup still work end to end.
 *
 * A failed send is never swallowed. Sign-in is the case that matters most: if
 * the link cannot be sent, the person waiting for it must be told, rather than
 * being shown "check your inbox" for an email that will never arrive.
 */

type Mail = { to: string; subject: string; html: string; text: string };

/** Raised when a message could not be handed to the email provider. */
export class EmailError extends Error {
  constructor(
    message: string,
    /** Detail for the server log — never shown to the person who triggered it. */
    readonly detail?: string
  ) {
    super(message);
    this.name = "EmailError";
  }
}

const DEFAULT_FROM = "CFC SB3E Auction <onboarding@resend.dev>";

type Provider = "brevo" | "resend" | "none";

function provider(): Provider {
  if (process.env.BREVO_API_KEY) return "brevo";
  if (process.env.RESEND_API_KEY) return "resend";
  return "none";
}

/** Splits `Name <a@b.c>` into its parts. Brevo wants them separately. */
export function parseSender(from: string): { name?: string; email: string } {
  const match = from.trim().match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
  if (match) {
    const name = match[1].replace(/^["']|["']$/g, "").trim();
    return { name: name || undefined, email: match[2].trim() };
  }
  return { email: from.trim() };
}

/**
 * How the deployment is configured to send email, and what is wrong with it.
 * Shown to organizers so a misconfiguration is found before an auction opens
 * rather than by a bidder who never got their outbid alert.
 */
export function emailStatus(): {
  provider: Provider;
  configured: boolean;
  from: string;
  warning: string | null;
} {
  const which = provider();
  const from = process.env.EMAIL_FROM ?? DEFAULT_FROM;
  const senderIsResendDefault = /@resend\.dev>?\s*$/.test(from.trim());

  let warning: string | null = null;
  if (which === "none") {
    warning =
      "No email service is configured. Bidders can still sign in with their password, but nobody will get an outbid alert, a winner's notice or a password reset — those messages are written to the server log instead. Set BREVO_API_KEY (or RESEND_API_KEY) in the deployment settings before opening an auction.";
  } else if (which === "resend" && senderIsResendDefault) {
    warning =
      "Email is sent from Resend's shared address, which only delivers to the Resend account owner's own inbox — your bidders will receive nothing. Verify a sending domain in Resend and set EMAIL_FROM to an address at that domain.";
  } else if (which === "brevo" && (!process.env.EMAIL_FROM || senderIsResendDefault)) {
    warning =
      "EMAIL_FROM is not set to your Brevo sender. Set it to the address you verified in Brevo, for example \"CFC SB3E Auction <chapter@gmail.com>\", or Brevo will reject every message.";
  }

  return { provider: which, configured: which !== "none", from, warning };
}

export function appUrl(path = "/"): string {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Turns a Resend rejection into something a chapter organizer can act on. */
function explainResendFailure(status: number, body: string): string {
  const lower = body.toLowerCase();
  if (status === 403 && lower.includes("testing emails")) {
    return "Resend is still in testing mode for this account, so it will only deliver to the organizer's own address. Verify a sending domain in Resend to email everyone else.";
  }
  if (status === 401 || status === 403) {
    return "The email service rejected our API key. Check RESEND_API_KEY in the deployment settings.";
  }
  if (status === 422) {
    return "The email service rejected the sender address. Check EMAIL_FROM matches a domain verified in Resend.";
  }
  if (status === 429) {
    return "The email service is rate limiting us. Wait a moment and try again.";
  }
  return `The email service returned ${status}.`;
}

/** Turns a Brevo rejection into something a chapter organizer can act on. */
function explainBrevoFailure(status: number, body: string): string {
  const lower = body.toLowerCase();
  if (status === 401) {
    return "Brevo rejected our API key. Check BREVO_API_KEY in the deployment settings.";
  }
  if (lower.includes("sender") && (lower.includes("not valid") || lower.includes("not found"))) {
    return "Brevo does not recognize the sender address. Add it under Senders in Brevo and confirm the code it emails you, then make sure EMAIL_FROM matches it exactly.";
  }
  if (status === 402 || lower.includes("credit")) {
    return "Brevo's daily sending allowance for this account has run out. It resets tomorrow.";
  }
  if (status === 429) {
    return "Brevo is rate limiting us. Wait a moment and try again.";
  }
  if (status === 400) {
    return "Brevo rejected the message. Check EMAIL_FROM is a sender you have verified in Brevo.";
  }
  return `Brevo returned ${status}.`;
}

type ProviderCall = {
  url: string;
  headers: Record<string, string>;
  body: string;
  explain: (status: number, body: string) => string;
};

function brevoCall(mail: Mail, apiKey: string): ProviderCall {
  const sender = parseSender(process.env.EMAIL_FROM ?? DEFAULT_FROM);
  return {
    url: "https://api.brevo.com/v3/smtp/email",
    headers: { "api-key": apiKey, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: sender.name ? { name: sender.name, email: sender.email } : { email: sender.email },
      to: [{ email: mail.to }],
      subject: mail.subject,
      htmlContent: mail.html,
      textContent: mail.text,
    }),
    explain: explainBrevoFailure,
  };
}

function resendCall(mail: Mail, apiKey: string): ProviderCall {
  return {
    url: "https://api.resend.com/emails",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? DEFAULT_FROM,
      to: [mail.to],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    }),
    explain: explainResendFailure,
  };
}

async function send(mail: Mail): Promise<void> {
  const which = provider();

  if (which === "none") {
    // No provider configured: the log is the mailbox. Deliberately a success,
    // so local development and first-time setup still work end to end.
    console.info(
      `\n--- EMAIL (not sent: no email service is configured) ---\nTo: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n--- end email ---\n`
    );
    return;
  }

  const call =
    which === "brevo"
      ? brevoCall(mail, process.env.BREVO_API_KEY!)
      : resendCall(mail, process.env.RESEND_API_KEY!);

  let response: Response;
  try {
    response = await fetch(call.url, {
      method: "POST",
      headers: call.headers,
      body: call.body,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`Email to ${mail.to} could not be sent: ${detail}`);
    throw new EmailError("We couldn't reach the email service.", detail);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const reason = call.explain(response.status, body);
    console.error(`Email to ${mail.to} rejected by ${which}: ${response.status} ${body}`);
    throw new EmailError(reason, `${response.status} ${body}`);
  }
}

function layout(heading: string, bodyHtml: string, cta?: { label: string; url: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f5f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2421">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f5f2;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;padding:28px;border:1px solid #e6e2da">
        <tr><td>
          <img src="${appUrl("/cfc-logo.png")}" alt="Couples for Christ" width="190" height="45" style="display:block;border:0;outline:none;height:auto;margin:0 0 14px" />
          <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8a8578">SB3E Chapter Pre-Loved Auction</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${escapeHtml(heading)}</h1>
          ${bodyHtml}
          ${
            cta
              ? `<p style="margin:24px 0 0"><a href="${cta.url}" style="display:inline-block;background:#2f6f4f;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">${escapeHtml(
                  cta.label
                )}</a></p>`
              : ""
          }
          <p style="margin:28px 0 0;font-size:12px;color:#8a8578">Thank you for supporting our chapter's fundraising.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function sendPasswordResetLink(email: string, token: string): Promise<void> {
  const url = appUrl(`/reset-password?token=${encodeURIComponent(token)}`);
  await send({
    to: email,
    subject: "Reset your CFC SB3E auction password",
    html: layout(
      "Set a new password",
      `<p style="margin:0;font-size:15px;line-height:1.6">Tap the button below to choose a new password. The link works once and expires in an hour.</p>
       <p style="margin:16px 0 0;font-size:13px;color:#6f6a5f;word-break:break-all">${url}</p>
       <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#6f6a5f">If you didn't ask for this, you can ignore this email — your password stays as it is.</p>`,
      { label: "Choose a new password", url }
    ),
    text: `Set a new password for the CFC SB3E Pre-Loved Auction:\n\n${url}\n\nThe link works once and expires in an hour. If you didn't ask for this, you can ignore this email.`,
  });
}

export async function sendWelcomeEmail(params: { to: string; name?: string | null }): Promise<void> {
  await send({
    to: params.to,
    subject: "Welcome to the CFC SB3E Pre-Loved Auction",
    html: layout(
      params.name ? `Welcome, ${escapeHtml(params.name.split(/\s+/)[0])}!` : "Welcome!",
      `<p style="margin:0;font-size:15px;line-height:1.6">Your account is ready. Sign in any time with your email address and password to browse the items and place bids.</p>
       <p style="margin:16px 0 0;font-size:15px;line-height:1.6">We'll email you if someone outbids you, and if you win.</p>`,
      { label: "Browse the auction", url: appUrl("/") }
    ),
    text: `Your account for the CFC SB3E Pre-Loved Auction is ready.\n\nSign in with your email address and password: ${appUrl("/login")}\n\nWe'll email you if someone outbids you, and if you win.`,
  });
}

export async function sendOutbidEmail(params: {
  to: string;
  itemTitle: string;
  itemId: string;
  newAmountCents: number;
  currency: string;
}): Promise<void> {
  const url = appUrl(`/items/${params.itemId}`);
  const amount = formatMoney(params.newAmountCents, params.currency);
  await send({
    to: params.to,
    subject: `You've been outbid on "${params.itemTitle}"`,
    html: layout(
      "Someone bid higher",
      `<p style="margin:0;font-size:15px;line-height:1.6">The bid on <strong>${escapeHtml(
        params.itemTitle
      )}</strong> is now <strong>${escapeHtml(amount)}</strong>. There's still time to place a higher bid.</p>`,
      { label: "Place a new bid", url }
    ),
    text: `You've been outbid on "${params.itemTitle}". The current bid is ${amount}.\n\nBid again: ${url}`,
  });
}

export async function sendWinnerEmail(params: {
  to: string;
  itemTitle: string;
  itemId: string;
  amountCents: number;
  currency: string;
  paymentInstructions?: string | null;
}): Promise<void> {
  const url = appUrl("/account");
  const amount = formatMoney(params.amountCents, params.currency);
  await send({
    to: params.to,
    subject: `You won "${params.itemTitle}"!`,
    html: layout(
      "Congratulations, you won!",
      `<p style="margin:0;font-size:15px;line-height:1.6">You had the winning bid of <strong>${escapeHtml(
        amount
      )}</strong> on <strong>${escapeHtml(params.itemTitle)}</strong>.</p>
       ${
         params.paymentInstructions
           ? `<div style="margin:18px 0 0;padding:14px 16px;background:#f6f5f2;border-radius:10px;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(
               params.paymentInstructions
             )}</div>`
           : `<p style="margin:16px 0 0;font-size:15px;line-height:1.6">A chapter organizer will be in touch about payment and pickup.</p>`
       }`,
      { label: "View my wins", url }
    ),
    text: `Congratulations! You won "${params.itemTitle}" with a bid of ${amount}.\n\n${
      params.paymentInstructions ?? "A chapter organizer will be in touch about payment and pickup."
    }\n\nSee your wins: ${url}`,
  });
}
