import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true, message: "Logged out successfully" });

  // Delete all session and auth cookies on the server response
  const cookiesToClear = [
    "session_id",
    "token",
    "authToken",
    "sb-access-token",
    "sb-refresh-token",
    "lab_catalog_consent",
  ];

  cookiesToClear.forEach((name) => {
    res.cookies.set(name, "", {
      path: "/",
      expires: new Date(0),
      maxAge: 0,
      sameSite: "lax",
    });
  });

  return res;
}
