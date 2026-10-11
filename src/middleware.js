import { NextResponse } from "next/server";

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // Exclude static assets, Next.js internals, and public endpoints
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname === "/" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/chemist/login") ||
    pathname.startsWith("/chemist/onboarding") ||
    pathname.startsWith("/lab/login") ||
    pathname.startsWith("/lab/onboarding") ||
    pathname.startsWith("/doctor/login") ||
    pathname.startsWith("/partner/login") ||
    pathname.startsWith("/staff/login")
  ) {
    return NextResponse.next();
  }

  const sessionToken = req.cookies.get("session_id")?.value || req.cookies.get("sb-access-token")?.value;

  // Root /admin redirect
  if (pathname === "/admin" || pathname === "/admin/") {
    if (sessionToken) {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  // Admin routes
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  // Chemist routes
  if (pathname.startsWith("/chemist") && !pathname.startsWith("/chemist/login")) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/chemist/login", req.url));
    }
  }

  // Lab routes
  if (pathname.startsWith("/lab") && !pathname.startsWith("/lab/login")) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/lab/login", req.url));
    }
  }

  // Protected Patient routes
  const isPatientRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/medicine-order") ||
    pathname.startsWith("/appointments") ||
    pathname.startsWith("/lab-reports") ||
    pathname.startsWith("/digital-locker") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings");

  if (isPatientRoute) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/chemist/:path*",
    "/lab/:path*",
    "/dashboard/:path*",
    "/dashboard",
    "/medicine-order/:path*",
    "/medicine-order",
    "/appointments/:path*",
    "/appointments",
    "/lab-reports/:path*",
    "/lab-reports",
    "/digital-locker/:path*",
    "/digital-locker",
    "/profile/:path*",
    "/profile",
    "/settings/:path*",
    "/settings",
  ],
};
