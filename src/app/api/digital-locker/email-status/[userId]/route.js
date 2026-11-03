import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(_req, { params }) {
  try {
    const { userId } = await params;

    if (!userId) {
      return failure("User ID is required.", null, 400);
    }

    const [userRow] = await sql`
      SELECT id, role, phone_number, email
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `.catch(() => []);

    const rows = await sql`
      SELECT id, email, is_verified, verified_at
      FROM email_verifications
      WHERE user_id = ${userId} AND is_verified = true
      ORDER BY verified_at DESC NULLS LAST
      LIMIT 1
    `.catch(() => []);

    const latestVerified = rows[0];
    // Patients authenticate via mobile OTP on login, or may have a verified record in email_verifications
    const isVerified =
      Boolean(latestVerified?.is_verified) || userRow?.role === "patient";

    return success("Email verification status retrieved.", {
      user_id: userId,
      verified: isVerified,
      email:
        latestVerified?.email ||
        userRow?.phone_number ||
        userRow?.email ||
        null,
      verified_at: latestVerified?.verified_at || null,
    });
  } catch (error) {
    console.error("Email Status Error:", error);
    return failure(
      "Failed to retrieve email verification status.",
      error.message,
      500
    );
  }
}
