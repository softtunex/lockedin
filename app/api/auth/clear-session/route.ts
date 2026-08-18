import { NextResponse } from "next/server";

// Reached when a request carries a cryptographically valid session JWT
// whose userId no longer exists in the database (e.g. the DB was reset/
// migrated out from under an already-logged-in browser — see
// lib/session.ts's requireUser). redirect() from a Server Component can't
// mutate cookies, and proxy.ts's edge middleware can't check DB existence,
// so without this, a stale-but-valid cookie bounces the user between
// /dashboard (page redirects to /login, user not found) and /login
// (middleware redirects logged-in-looking sessions away from it) forever.
// This route handler runs in the Node runtime, where cookies *can* be
// cleared, breaking the loop by signing the stale session out before
// sending the user to /login for real.
export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  const cookieNames = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "authjs.csrf-token",
    "__Host-authjs.csrf-token",
    "authjs.callback-url",
  ];
  for (const name of cookieNames) {
    response.cookies.delete(name);
  }
  return response;
}
