import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/* -----------------------------------------------------------
   🟢 GET → Fetch all settings (grouped by key)
   ----------------------------------------------------------- */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .order("key", { ascending: true });

    if (error) throw error;

    const settings = {};
    data?.forEach((row) => {
      settings[row.key] = row.value;
    });

    return success("Settings fetched successfully.", settings, 200, {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("GET /settings error:", err);
    return failure("Failed to fetch settings. " + err.message, "settings_fetch_failed", 500, {
      headers: corsHeaders,
    });
  }
}

/* -----------------------------------------------------------
   🟢 POST → Create or Update settings (like smtp, openai, etc.)
   ----------------------------------------------------------- */
export async function POST(req) {
  try {
    const body = await req.json();
    const { key, value } = body;

    if (!key || typeof value !== "object") {
      return failure("Missing or invalid fields (key, value).", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    // Ensure valid keys (optional — whitelist common keys)
    const allowedKeys = ["smtp", "openai", "app", "notifications"];
    if (!allowedKeys.includes(key)) {
      console.warn(`⚠️ Warning: unlisted key '${key}' inserted.`);
    }

    const now = new Date().toISOString();

    // Upsert the setting (create or update existing)
    const { data, error } = await supabase
      .from("settings")
      .upsert(
        {
          key,
          value,
          updated_at: now,
          created_at: now,
        },
        { onConflict: "key" }
      )
      .select()
      .single();

    if (error) throw error;

    return success("Setting updated successfully.", data, 200, {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("POST /settings error:", err);
    return failure("Failed to update setting. " + err.message, "settings_update_failed", 500, {
      headers: corsHeaders,
    });
  }
}
