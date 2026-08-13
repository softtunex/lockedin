import { Resend } from "resend";

// Falls back to the console-log stub when RESEND_API_KEY isn't set (e.g. a
// contributor's local dev env with no email account configured) so nothing
// crashes — every "send an email" call in the app still routes through this
// single function either way.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Resend's shared sending domain — works with zero setup, no DNS/domain
// verification required. Swap to a verified custom domain address later via
// EMAIL_FROM once you've added one in the Resend dashboard.
const FROM = process.env.EMAIL_FROM ?? "LockedIn <onboarding@resend.dev>";

export async function sendEmail({ to, subject, body }: { to: string; subject: string; body: string }) {
  if (!resend) {
    console.log(`[email:stub] to=${to} subject="${subject}"\n${body}`);
    return;
  }

  const { error } = await resend.emails.send({ from: FROM, to, subject, text: body });
  if (error) {
    console.error(`[email] send failed to=${to} subject="${subject}":`, error);
  }
}
