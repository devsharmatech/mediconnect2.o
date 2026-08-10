import { NextResponse } from "next/server";

export async function middleware(req) {
  const url = req.nextUrl.clone();
  const { pathname } = req.nextUrl;
  console.log(`[Middleware] Path: ${pathname}`);

  // Exclude public routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname === "/" ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/chemist/login") ||
    pathname.startsWith("/chemist/onboarding") ||
    pathname.startsWith("/lab/login") ||
    pathname.startsWith("/lab/onboarding")
  ) {
    return NextResponse.next();
  }

    // Get structural auth session signatures from cookies
    const sessionToken = req.cookies.get("sb-access-token")?.value || req.cookies.get("session_id")?.value || null;

    let verifiedRole = null;

    if (sessionToken) {
        try {
            // Call the internal verification API since database connection isn't supported in Edge middleware
            const verifyUrl = new URL("/api/auth/verify-session", req.url);
            verifyUrl.searchParams.set("token", sessionToken);
            
            const res = await fetch(verifyUrl.toString());
            if (res.ok) {
                const data = await res.json();
                verifiedRole = data.role;
                console.log(`[Middleware] User token verified, Role: ${verifiedRole}`);
            } else {
                console.error(`[Middleware] Verify session API error: ${res.status}`);
            }
        } catch (err) {
            console.error(`[Middleware] Exception during session verification: ${err.message}`);
        }
    } else {
        console.log(`[Middleware] No session token found for ${pathname}`);
    }

    // Admin routes
    if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
        if (verifiedRole !== "admin") {
            console.log(`[Middleware] Redirecting unauthorized access to ${pathname} (Role: ${verifiedRole})`);
            return NextResponse.redirect(new URL("/admin/login", req.url));
        }
    }

    // Chemist routes
    if (pathname.startsWith("/chemist") && !pathname.startsWith("/chemist/login")) {
        if (verifiedRole !== "chemist") {
            console.log(`[Middleware] Redirecting unauthorized access to ${pathname} (Role: ${verifiedRole})`);
            return NextResponse.redirect(new URL("/chemist/login", req.url));
        }
    }

    // Lab routes
    if (pathname.startsWith("/lab") && !pathname.startsWith("/lab/login")) {
        if (verifiedRole !== "lab") {
            console.log(`[Middleware] Redirecting unauthorized access to ${pathname} (Role: ${verifiedRole})`);
            return NextResponse.redirect(new URL("/lab/login", req.url));
        }
    }

  return NextResponse.next();
}

// Apply middleware to all dashboard routes
export const config = {
  matcher: ["/admin/:path*", "/chemist/:path*", "/lab/:path*"],
};
