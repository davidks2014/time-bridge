/**
 * src/middleware.ts
 *
 * Global route protection for Time Bridge.
 *
 * Simplified rules:
 * 1. Public routes — always accessible without login
 * 2. Not logged in + protected route → redirect to /login
 * 3. Admin → redirect to /admin/verification when hitting /dashboard
 * 4. All other logged-in users → allow everything
 *    Profile and verification shown as UI banners, not middleware redirects
 *    Memory creation blocked at API level only
 */

import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Always public — no auth needed ───────────────────────────────────────
  const publicRoutes = [
    "/login",
    "/register",
    "/pending-verification",
    "/complete-profile",
  ];

  // Also allow receiver invite routes publicly
  if (
    publicRoutes.includes(pathname) ||
    pathname.startsWith("/receiver")
  ) {
    return NextResponse.next();
  }

  // ── Get JWT token ─────────────────────────────────────────────────────────
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // ── Not logged in → redirect to login ────────────────────────────────────
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  const role = (token?.role as string | undefined) ?? "USER";

  // ── Admin routes — only admins allowed ───────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // ── Admin on dashboard → send to admin panel ─────────────────────────────
  if (role === "ADMIN" && pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/admin/verification", req.url));
  }

  // ── All other logged-in users → allow ────────────────────────────────────
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|uploads|.*\\..*).*)",
  ],
};
