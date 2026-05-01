/**
 * src/middleware.ts
 *
 * Route protection for Time Bridge.
 *
 * Access matrix:
 *   NOT_LOGGED_IN  → PUBLIC routes only, else → /login
 *   ADMIN          → all routes allowed
 *   PENDING        → /pending-verification, /complete-profile only, else → /pending-verification
 *   REJECTED       → /pending-verification only, else → /pending-verification
 *   APPROVED user  → all routes except /admin/* and unverified-only pages
 */

import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── STEP 1: Public routes — no auth needed ───────────────────────────────
  const PUBLIC = [
    "/",
    "/login",
    "/register",
    "/privacy",
    "/terms",
    "/data-deletion",
    "/contact",
  ];

  if (
    PUBLIC.includes(pathname) ||
    pathname.startsWith("/receiver") ||
    pathname.startsWith("/claim")
  ) {
    return NextResponse.next();
  }

  // ── STEP 2: Require login ─────────────────────────────────────────────────
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ── STEP 3: Extract role and verificationStatus ───────────────────────────
  const role               = (token.role               as string | undefined) ?? "USER";
  const verificationStatus = (token.verificationStatus as string | undefined) ?? "PENDING";
  const profileComplete    = (token.profileComplete    as boolean | undefined) ?? false;

  // ── STEP 4: ADMIN — allow everything ─────────────────────────────────────
  if (role === "ADMIN") {
    return NextResponse.next();
  }

  // ── STEP 5: Non-APPROVED users — limited to key pages ───────────────────

  // If profile not complete, allow /onboarding and /complete-profile only
  // New users must go through onboarding wizard before completing their profile
  if (!profileComplete) {
    if (pathname === "/onboarding" || pathname === "/complete-profile") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // If profile complete but not yet approved, redirect to pending-verification
  if (verificationStatus !== "APPROVED") {
    return NextResponse.redirect(new URL("/pending-verification", req.url));
  }

  // ── STEP 7: APPROVED user — block admin and unverified-only pages ─────────
  if (
    pathname.startsWith("/admin") ||
    pathname === "/pending-verification" ||
    pathname === "/complete-profile" ||
    pathname === "/onboarding"
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
