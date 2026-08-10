import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { user_id, phone_number, email, role, otp } = await req.json();

    if (!otp) {
      return failure("OTP is required.", null, 400, { headers: corsHeaders });
    }

    const isUserIdValid = user_id && user_id !== "undefined" && user_id !== "null";
    let resolvedUser = null;

    if (!isUserIdValid && !phone_number && !email) {
      return failure("User identification (user_id, phone_number, or email) is required.", null, 400, { headers: corsHeaders });
    }

    let user = resolvedUser;
    if (!user) {
      let query = supabase.from("users").select("*");
      if (isUserIdValid) {
        query = query.eq("id", user_id);
      } else if (phone_number) {
        const cleanPhone = phone_number.replace(/\D/g, "").slice(-10);
        query = query.like("phone_number", `%${cleanPhone}%`);
        if (role) {
          query = query.eq("role", role);
        }
      } else if (email) {
        // Find in patient_details
        const { data: detail, error: detailErr } = await supabase
          .from("patient_details")
          .select("id")
          .eq("email", email)
          .maybeSingle();
        if (detailErr) throw detailErr;
        if (!detail) return failure("User not found.", null, 404, { headers: corsHeaders });
        query = query.eq("id", detail.id);
      }

      const { data: dbUser, error: userError } = await query.maybeSingle();
      if (userError) throw userError;
      user = dbUser;
    }
    if (!user) return failure("User not found.", null, 404, { headers: corsHeaders });

    // Validate OTP against database record
    if (user.otp_code !== otp)
      return failure("Invalid OTP.", null, 400, { headers: corsHeaders });

    if (user.otp_expires_at && new Date(user.otp_expires_at) < new Date())
      return failure("OTP expired. Please request a new one.", null, 400, { headers: corsHeaders });

    const { error: updateError } = await supabase
      .from("users")
      .update({
        is_verified: true,
        otp_code: null,
        otp_expires_at: null,
        updated_at: new Date(),
      })
      .eq("id", user.id);

    if (updateError) throw updateError;

    const roleData = await getUserDetailsByRole(user.id, user.role);

    return success(
      "OTP verified successfully.",
      {
        user_id: user.id,
        role: user.role,
        user: { ...user, is_verified: true, details: roleData },
      },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Website OTP Verify Error:", error);
    return failure("Failed to verify OTP.", error.message, 500, { headers: corsHeaders });
  }
}

async function getUserDetailsByRole(userId, role) {
  const roleTables = {
    admin: "admin_details",
    patient: "patient_details",
    doctor: "doctor_details",
    chemist: "chemist_details",
    pharmacist: "pharmacist_details",
    lab: "lab_details",
  };

  const table = roleTables[role];
  if (!table) return null;

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
