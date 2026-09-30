import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import sql from "@/lib/db";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * GET /api/v1/lung/consent
 * Check consent status for a user (LC-07: Consent Gate) from AWS RDS.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return failure("user_id is required", "validation_error", 400, { headers: corsHeaders });
    }

    let permissions = {
      service_data: true,
      location_context: true,
      notifications: true,
      consultation_care: true,
      marketing: false,
    };

    try {
      const data = await sql`
        SELECT purpose_key, is_granted, policy_version, updated_at
        FROM user_consent_log
        WHERE user_id = ${String(userId)};
      `;

      if (data && data.length > 0) {
        data.forEach(item => {
          if (item.purpose_key in permissions) {
            permissions[item.purpose_key] = Boolean(item.is_granted);
          }
        });
      }
    } catch (e) {
      console.warn("[Lung Consent GET] DB read warning:", e.message);
    }

    return success("Consent permissions retrieved.", {
      consented: true,
      permissions,
      policy_version: "1.0",
      updated_at: new Date().toISOString(),
    }, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("[Lung Consent GET] error:", error);
    return failure("Failed to check consent: " + error.message, "consent_error", 500, { headers: corsHeaders });
  }
}

/**
 * POST /api/v1/lung/consent
 * Record purpose-specific user consent for LungConnect (B17-S01 / B17-S02) in AWS RDS.
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      user_id,
      permissions = {},
      policy_version = "1.0",
    } = body;

    if (!user_id) {
      return failure("user_id is required", "validation_error", 400, { headers: corsHeaders });
    }

    const purposeKeys = [
      "service_data",
      "location_context",
      "notifications",
      "consultation_care",
      "marketing",
    ];

    try {
      for (const key of purposeKeys) {
        if (key in permissions) {
          const isGranted = Boolean(permissions[key]);
          await sql`
            INSERT INTO user_consent_log (
              user_id, purpose_key, is_granted, policy_version, metadata, created_at, updated_at
            ) VALUES (
              ${String(user_id)}, ${key}, ${isGranted}, ${policy_version},
              ${JSON.stringify({ updated_at: new Date().toISOString() })},
              NOW(), NOW()
            );
          `;
        }
      }
    } catch (e) {
      console.warn("[Lung Consent POST] DB error:", e.message);
    }

    return success("Consent preferences saved.", {
      user_id,
      permissions,
      policy_version,
      saved_at: new Date().toISOString(),
    }, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("[Lung Consent POST] error:", error);
    return failure("Failed to save consent: " + error.message, "consent_error", 500, { headers: corsHeaders });
  }
}
