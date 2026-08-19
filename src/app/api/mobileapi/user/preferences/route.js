import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";

export async function POST(req) {
  try {
    const { user_id, preferences } = await req.json();

    if (!user_id || !preferences) {
      return failure("user_id and preferences are required", null, 400);
    }

    // Fetch existing preferences
    const { data: existing } = await supabase
      .from("patient_details")
      .select("id, meta")
      .eq("id", user_id)
      .maybeSingle();

    const currentMeta = existing?.meta || {};
    const updatedMeta = { ...currentMeta, preferences: { ...(currentMeta.preferences || {}), ...preferences } };

    const { error } = await supabase
      .from("patient_details")
      .update({ meta: updatedMeta, updated_at: new Date().toISOString() })
      .eq("id", user_id);

    if (error) throw error;

    return success("Preferences saved", { preferences: updatedMeta.preferences }, 200);
  } catch (err) {
    console.error("[UserPreferences] Error:", err.message);
    return failure("Failed to save preferences: " + err.message, null, 500);
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) return failure("user_id is required", null, 400);

    const { data, error } = await supabase
      .from("patient_details")
      .select("meta")
      .eq("id", user_id)
      .maybeSingle();

    if (error) throw error;

    return success("Preferences fetched", data?.meta?.preferences || {}, 200);
  } catch (err) {
    console.error("[UserPreferences] GET Error:", err.message);
    return failure("Failed to fetch preferences: " + err.message, null, 500);
  }
}
