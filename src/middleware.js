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
    pathname.startsWith("/staff/login") ||
    pathname.includes("/video") ||
    pathname.includes("/legal-record")
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
  if ((pathname === "/admin" || pathname.startsWith("/admin/")) && !pathname.startsWith("/admin/login")) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  // Chemist routes
  if ((pathname === "/chemist" || pathname.startsWith("/chemist/")) && !pathname.startsWith("/chemist/login")) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/chemist/login", req.url));
    }
  }

  // Lab routes (ensure /lab-reports is not matched)
  if ((pathname === "/lab" || pathname.startsWith("/lab/")) && !pathname.startsWith("/lab/login")) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/lab/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/chemist/:path*",
    "/lab/:path*",
  ],
};
