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

  // ── STEP 4: ADMIN — allow everything ─────────────────────────────────────
  if (role === "ADMIN") {
    return NextResponse.next();
  }

  // ── STEP 5: PENDING user ─────────────────────────────────────────────────
  if (verificationStatus === "PENDING") {
    const profileComplete = (token.profileComplete as boolean | undefined) ?? false;

    if (!profileComplete) {
      // Profile not yet submitted — must go to /complete-profile first
      if (pathname === "/complete-profile") return NextResponse.next();
      return NextResponse.redirect(new URL("/complete-profile", req.url));
    }

    // Profile submitted, awaiting admin review
    if (pathname === "/pending-verification" || pathname === "/complete-profile") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/pending-verification", req.url));
  }

  // ── STEP 6: REJECTED user — only pending-verification ────────────────────
  if (verificationStatus === "REJECTED") {
    if (pathname === "/pending-verification") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/pending-verification", req.url));
  }

  // ── STEP 7: APPROVED user — block admin and unverified-only pages ─────────
  if (
    pathname.startsWith("/admin") ||
    pathname === "/pending-verification" ||
    pathname === "/complete-profile"
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
