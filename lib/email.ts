import "server-only";
import { formatMoney } from "@/lib/money";

/**
 * Email sending is deliberately optional. With RESEND_API_KEY set, mail goes
 * out through Resend; without it the message is written to the server log so
 * the whole app still works during setup and local testing.
 */

type Mail = { to: string; subject: string; html: string; text: string };

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

async function send(mail: Mail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(
      `\n--- EMAIL (not sent: RESEND_API_KEY is not set) ---\nTo: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n--- end email ---\n`
    );
    return;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "CFC SB3E Auction <onboarding@resend.dev>",
        to: [mail.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }),
    });
    if (!response.ok) {
      console.error(`Email to ${mail.to} failed: ${response.status} ${await response.text()}`);
    }
  } catch (error) {
    // A bidder's action must never fail because the mail server is down.
    console.error("Email send failed:", error);
  }
}

function layout(heading: string, bodyHtml: string, cta?: { label: string; url: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f5f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2421">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f5f2;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;padding:28px;border:1px solid #e6e2da">
        <tr><td>
          <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8a8578">CFC SB3E Pre-Loved Auction</p>
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

export async function sendLoginLink(email: string, token: string): Promise<void> {
  const url = appUrl(`/api/auth/verify?token=${encodeURIComponent(token)}`);
  await send({
    to: email,
    subject: "Your sign-in link for the CFC SB3E auction",
    html: layout(
      "Sign in to bid",
      `<p style="margin:0;font-size:15px;line-height:1.6">Tap the button below to sign in. The link works once and expires in 20 minutes.</p>
       <p style="margin:16px 0 0;font-size:13px;color:#6f6a5f;word-break:break-all">${url}</p>`,
      { label: "Sign in", url }
    ),
    text: `Sign in to the CFC SB3E Pre-Loved Auction:\n\n${url}\n\nThe link works once and expires in 20 minutes. If you did not request it, you can ignore this email.`,
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
           : `<p style="margin:16px 0 0;font-size:15px;line-height:1.6">A chapter organiser will be in touch about payment and pickup.</p>`
       }`,
      { label: "View my wins", url }
    ),
    text: `Congratulations! You won "${params.itemTitle}" with a bid of ${amount}.\n\n${
      params.paymentInstructions ?? "A chapter organiser will be in touch about payment and pickup."
    }\n\nSee your wins: ${url}`,
  });
}
