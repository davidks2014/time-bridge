/**
 * src/middleware.ts
 *
 * Global route protection for Time Bridge.
 *
 * New flow (simplified):
 * - Anyone not logged in → /login
 * - Logged in ADMIN → /admin/verification
 * - Logged in USER → dashboard always accessible
 *   - Profile completeness and verification are handled
 *     via banners on the dashboard, NOT by middleware redirects
 *   - Only memory CREATION is blocked until profile is complete
 *     (enforced at the API level in /api/memory)
 *
 * The /pending-verification page is now purely informational.
 * Users navigate there intentionally after completing their profile.
 * They are never forced there by middleware.
 */

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequestWithAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // ── Not logged in ────────────────────────────────────────────────────────
    // withAuth already handles this but we add explicit check for clarity
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const role = (token?.role as string | undefined) ?? "USER";

    // ── Admin routes ─────────────────────────────────────────────────────────
    // Only admins can access /admin/* pages
    if (pathname.startsWith("/admin")) {
      if (role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return NextResponse.next();
    }

    // ── Admin visiting dashboard ──────────────────────────────────────────────
    // Redirect admin to their own panel
    if (role === "ADMIN" && pathname === "/dashboard") {
      return NextResponse.redirect(new URL("/admin/verification", req.url));
    }

    // ── Receiver invite routes ────────────────────────────────────────────────
    // Always allow these — receiver may not be a registered user
    if (pathname.startsWith("/receiver")) {
      return NextResponse.next();
    }

    // ── All other logged-in users ─────────────────────────────────────────────
    // Allow access to everything — dashboard, complete-profile, pending-verification
    // Profile and verification state are handled via UI banners on the dashboard
    // Memory creation is blocked at the API level (/api/memory checks profile)
    return NextResponse.next();
  },
  {
    callbacks: {
      // Allow the middleware function above to handle all logic
      // Return true means "run the middleware function"
      authorized: () => true,
    },
  }
);

/**
 * Apply middleware to all app pages
 * Exclude API routes, Next.js internals, and static files
 */
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|uploads|.*\\..*).*)",
  ],
};
