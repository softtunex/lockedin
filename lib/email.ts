import { Resend } from "resend";
import { renderEmailHtml } from "./email-template";

// Falls back to the console-log stub when RESEND_API_KEY isn't set (e.g. a
// contributor's local dev env with no email account configured) so nothing
// crashes — every "send an email" call in the app still routes through this
// single function either way.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Resend's shared sending domain — works with zero setup, no DNS/domain
// verification required. Swap to a verified custom domain address later via
// EMAIL_FROM once you've added one in the Resend dashboard.
const FROM = process.env.EMAIL_FROM ?? "LockedIn <onboarding@resend.dev>";

// Low-level send — takes fully-formed text/html. Prefer sendNotificationEmail
// below for anything user-facing; this exists for the couple of call sites
// (password reset) that build their own copy instead of using the shared
// {heading, body, cta} shape.
export async function sendEmail({
  to,
  subject,
  body,
  html,
}: {
  to: string;
  subject: string;
  body: string;
  html?: string;
}) {
  if (!resend) {
    console.log(`[email:stub] to=${to} subject="${subject}"\n${body}`);
    return;
  }

  const { error } = await resend.emails.send({ from: FROM, to, subject, text: body, html });
  if (error) {
    console.error(`[email] send failed to=${to} subject="${subject}":`, error);
  }
}

// The shared shape behind almost every email the app sends: a title, a body
// (rendered as one paragraph per newline), and an optional call-to-action
// button linking back into the app. Wraps the plain body in the branded
// HTML template (lib/email-template.ts) and sends both the HTML and a
// plain-text fallback in one multipart message — mail clients that block
// images/CSS still get a readable email, and multipart HTML+text scores
// meaningfully better with spam filters than a text-only send.
export async function sendNotificationEmail({
  to,
  heading,
  body,
  ctaLabel,
  ctaUrl,
}: {
  to: string;
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  const absoluteCtaUrl = ctaUrl ? `${process.env.NEXTAUTH_URL ?? ""}${ctaUrl}` : undefined;
  await sendEmail({
    to,
    subject: heading,
    body: ctaLabel && absoluteCtaUrl ? `${body}\n\n${ctaLabel}: ${absoluteCtaUrl}` : body,
    html: renderEmailHtml({ heading, bodyText: body, ctaLabel, ctaUrl: absoluteCtaUrl }),
  });
}
