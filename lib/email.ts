// No SMTP/Resend account configured yet (see README "Known MVP limitations").
// Every "send an email" call in the app routes through here so there is a
// single swap point later: replace the console.log with a real provider
// call and nothing else in the codebase has to change.
export async function sendEmail({ to, subject, body }: { to: string; subject: string; body: string }) {
  console.log(`[email:stub] to=${to} subject="${subject}"\n${body}`);
}
