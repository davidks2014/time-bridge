import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequestWithAuth } from "next-auth/middleware";

/**
 * Global route protection middleware
 *
 * Rules:
 * 1) Public pages:
 *    - /login
 *    - /register
 *    - /pending-verification
 *    - next-auth/api/static files
 *
 * 2) If not logged in:
 *    - redirect to /login
 *
 * 3) If ADMIN:
 *    - allow /admin/verification
 *    - if ADMIN goes to /dashboard, redirect to /admin/verification
 *
 * 4) If normal USER and verificationStatus !== APPROVED:
 *    - block protected pages
 *    - redirect to /pending-verification
 *
 * 5) If APPROVED USER tries to open /pending-verification:
 *    - redirect to /dashboard
 */

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl;

    const token = req.nextauth.token;
    const role = (token?.role as string | undefined) ?? "USER";
    const verificationStatus =
      (token?.verificationStatus as string | undefined) ?? "PENDING";

    // ===== Public routes =====
    const isPublicRoute =
      pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/pending-verification" ||
      pathname === "/complete-profile";

    if (isPublicRoute) {
      // If already logged in and approved/admin, don't let them stay on public pages unnecessarily
      if (token) {
        if (pathname === "/pending-verification") {
          if (role === "ADMIN") {
            return NextResponse.redirect(new URL("/admin/verification", req.url));
          }

          if (verificationStatus === "APPROVED") {
            return NextResponse.redirect(new URL("/dashboard", req.url));
          }
        }

        if (pathname === "/login" || pathname === "/register") {
          if (role === "ADMIN") {
            return NextResponse.redirect(new URL("/admin/verification", req.url));
          }

          if (verificationStatus === "APPROVED") {
            return NextResponse.redirect(new URL("/dashboard", req.url));
          }

          return NextResponse.redirect(new URL("/pending-verification", req.url));
        }
      }

      return NextResponse.next();
    }

    // ===== Not logged in =====
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // ===== Admin routes =====
    if (pathname.startsWith("/admin")) {
      if (role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return NextResponse.next();
    }

    // ===== Admin hitting normal dashboard =====
    if (role === "ADMIN") {
      if (pathname === "/dashboard") {
        return NextResponse.redirect(new URL("/admin/verification", req.url));
      }
      return NextResponse.next();
    }

    // ===== Normal users — check verification status =====
    if (verificationStatus !== "APPROVED") {
      // Allow access to complete-profile page
      if (pathname === "/complete-profile") {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/pending-verification", req.url));
    }

    // ===== Approved users — check profile completeness =====
    // Google users may be approved but have incomplete profiles
    const profileComplete = token?.profileComplete as boolean | undefined;

    if (profileComplete === false && pathname !== "/complete-profile" && pathname !== "/dashboard") {
      return NextResponse.redirect(new URL("/complete-profile", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      /**
       * This just checks whether a token exists.
       * Detailed access rules are handled above.
       */
      authorized: () => true,
    },
  }
);

/**
 * Matcher:
 * - Protect all app pages
 * - Exclude API routes, Next.js internals, and static files
 */
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|uploads|.*\\..*).*)",
  ],
};