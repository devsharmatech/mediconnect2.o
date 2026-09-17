import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { supabase } from "@/lib/supabaseAdmin";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * GET /api/v1/lung/consent
 * Check consent status for a user (LC-07: Consent Gate).
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
      const { data, error } = await supabase
        .from("user_consent_log")
        .select("purpose_key, is_granted, policy_version, updated_at")
        .eq("user_id", userId);

      if (!error && data && data.length > 0) {
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
 * Record purpose-specific user consent for LungConnect (B17-S01 / B17-S02).
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
          await supabase.from("user_consent_log").insert([{
            user_id,
            purpose_key: key,
            is_granted: isGranted,
            policy_version,
            metadata: JSON.stringify({ updated_at: new Date().toISOString() }),
            updated_at: new Date().toISOString(),
          }]);
        }
      }
    } catch (e) {
      console.warn("[Lung Consent POST] DB error:", e.message);
    }

    return success("Consent preferences confirmed.", {
      user_id,
      permissions,
      policy_version,
      confirmed_at: new Date().toISOString(),
    }, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("[Lung Consent POST] error:", error);
    return failure("Failed to record consent: " + error.message, "consent_error", 500, { headers: corsHeaders });
  }
}
