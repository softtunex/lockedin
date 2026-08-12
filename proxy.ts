import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const AUTH_PAGES = ["/login", "/register", "/forgot-password"];
const PUBLIC_PAGES = [...AUTH_PAGES, "/"];

// Edge runtime: only decodes the JWT session cookie via the provider-less
// authConfig, so it never needs Prisma/bcrypt. Onboarding-complete and
// penalty-lock gates live in server components/route handlers instead,
// where the Node runtime and the SQLite driver adapter are available.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  // Token-based, independent of session state — accessible whether or not
  // the visitor is logged in, but (unlike login/register/forgot-password)
  // never redirects a logged-in user away from it.
  const isResetPasswordPage = pathname.startsWith("/reset-password/");
  const isPublicPage = PUBLIC_PAGES.includes(pathname) || isResetPasswordPage;
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (!isLoggedIn && !isPublicPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.json).*)"],
};
