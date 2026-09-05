// Shared branded shell for every transactional email the app sends — a
// single template so "welcome", "reminder", "buddy request", etc. all look
// like they came from the same product instead of each being a bespoke
// plain-text string. Inline styles throughout (not a <style> block) because
// that's what actually survives Gmail/Outlook/Apple Mail's varying levels
// of CSS support — this is the one place in the codebase where Tailwind
// classes don't apply.
const BRAND_RED = "#e11d48";
const TEXT_DARK = "#18181b";
const TEXT_MUTED = "#71717a";
const BORDER = "#e4e4e7";
const BG = "#f4f4f5";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderEmailHtml({
  heading,
  bodyText,
  ctaLabel,
  ctaUrl,
}: {
  heading: string;
  bodyText: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const safeHeading = escapeHtml(heading);
  // bodyText may contain simple newlines (e.g. a proof-rejection reason
  // appended on its own line) — render each as its own paragraph rather
  // than losing the line break, since HTML collapses whitespace.
  const paragraphs = bodyText
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map(
      (line) =>
        `<p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:${TEXT_DARK};">${escapeHtml(line)}</p>`,
    )
    .join("");

  const button =
    ctaLabel && ctaUrl
      ? `
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;">
          <tr>
            <td style="border-radius:8px;background:${BRAND_RED};">
              <a href="${ctaUrl}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                ${escapeHtml(ctaLabel)}
              </a>
            </td>
          </tr>
        </table>`
      : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
            <tr>
              <td style="padding-bottom:20px;">
                <span style="font-size:20px;font-weight:800;letter-spacing:-0.02em;color:${BRAND_RED};">LockedIn</span>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;border:1px solid ${BORDER};border-radius:12px;padding:28px;">
                <h1 style="margin:0 0 14px;font-size:18px;font-weight:700;color:${TEXT_DARK};">${safeHeading}</h1>
                ${paragraphs}
                ${button}
              </td>
            </tr>
            <tr>
              <td style="padding-top:20px;text-align:center;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:${TEXT_MUTED};">
                  You're receiving this because you have a LockedIn account.
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
