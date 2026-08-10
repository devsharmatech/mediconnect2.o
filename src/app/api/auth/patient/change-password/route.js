import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import bcrypt from "bcryptjs";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { user_id, current_password, new_password } = await req.json();

    if (!user_id || !current_password || !new_password) {
      return failure("user_id, current_password and new_password are required", null, 400, { headers: corsHeaders });
    }

    if (new_password.length < 8) {
      return failure("New password must be at least 8 characters", null, 400, { headers: corsHeaders });
    }

    // Fetch the user's current hashed password
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("id, password")
      .eq("id", user_id)
      .maybeSingle();

    if (fetchError || !user) {
      return failure("User not found", null, 404, { headers: corsHeaders });
    }

    // Verify current password
    const isMatch = user.password
      ? await bcrypt.compare(current_password, user.password)
      : false;

    if (!isMatch) {
      return failure("Current password is incorrect", null, 401, { headers: corsHeaders });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 12);

    // Update password
    const { error: updateError } = await supabase
      .from("users")
      .update({ password: hashedPassword, updated_at: new Date().toISOString() })
      .eq("id", user_id);

    if (updateError) throw updateError;

    console.log(`[Security] Password changed for user ${user_id}`);

    return success("Password changed successfully", null, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("[ChangePassword] Error:", err.message);
    return failure("Failed to change password: " + err.message, null, 500, { headers: corsHeaders });
  }
}
