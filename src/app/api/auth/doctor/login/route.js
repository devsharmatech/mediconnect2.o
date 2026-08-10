import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { sendOTPViaGateway } from "@/lib/sms";

// 🟢 Handle CORS preflight
export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders() });
}

export async function POST(req) {
  try {
    const { phone_number, email } = await req.json();
    if (!phone_number && !email) return failure("Phone number or email is required.");

    let user = null;
    let authPhone = null;

    if (phone_number) {
      const cleanNumber = phone_number.replace(/\D/g, "").slice(-10);
      const { data, error } = await supabase
        .from("users")
        .select("id, role, phone_number")
        .ilike("role", "doctor")
        .like("phone_number", `%${cleanNumber}%`);

      if (error) throw error;
      
      if (data && data.length > 0) {
        user = data[0];
        authPhone = user.phone_number;
      }
    } else if (email) {
      const { data: details, error: detailsError } = await supabase
        .from("doctor_details")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (detailsError) throw detailsError;
      if (details) {
        const { data, error } = await supabase
          .from("users")
          .select("id, role, phone_number")
          .eq("id", details.id)
          .ilike("role", "doctor")
          .maybeSingle();
        if (error) throw error;
        user = data;
        authPhone = user?.phone_number;
      }
    }


    if (!user) return failure("Doctor not found.", null, 404);

    // Check onboarding status
    const { data: statusData } = await supabase
      .from("doctor_onboarding_status")
      .select("status, allowed_to_consult")
      .eq("doctor_id", user.id)
      .maybeSingle();

    if (statusData) {
      if (statusData.status === "REJECTED" || statusData.status === "REVIEW_REQUIRED") {
         return failure("Your profile is under review or rejected. Please contact admin.", null, 403);
      }
    }


    // Send real OTP via gateway
    await sendOTPViaGateway(user.id, authPhone, 'doctor');

    return success("OTP sent successfully.", {
      role: user.role,
      user_id: user.id,
    });
  } catch (error) {
    console.error("Doctor Login Error:", error);
    return failure("Login failed.", error.message, 500);
  }
}

