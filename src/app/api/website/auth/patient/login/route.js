import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { sendOTPViaGateway } from "@/lib/sms";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { phone_number, email } = await req.json();
    
    if (!phone_number && !email) {
      return failure("Phone number or email is required.", null, 400, { headers: corsHeaders });
    }

    let query = supabase
      .from("users")
      .select("id, role, phone_number, is_verified")
      .eq("role", "patient");

    if (phone_number) {
      const digitsOnly = String(phone_number).replace(/\D/g, "");
      let cleanPhone = digitsOnly;
      if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
        cleanPhone = digitsOnly.slice(2);
      }
      if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
        return failure("Please enter a valid 10-digit mobile number.", null, 400, { headers: corsHeaders });
      }
      query = query.like("phone_number", `%${cleanPhone}%`);
    } else if (email) {
      const { data: patientDetails, error: detailsError } = await supabase
        .from("patient_details")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (detailsError) throw detailsError;
      if (!patientDetails) {
        return failure("Patient not found with this email.", null, 404, { headers: corsHeaders });
      }

      query = query.eq("id", patientDetails.id);
    }

    const { data: user, error } = await query.maybeSingle();

    if (error) throw error;
    if (!user) {
      return failure("No patient account found with this phone number. Please register first.", null, 404, { headers: corsHeaders });
    }

    // Send real OTP via gateway if phone_number is provided
    if (phone_number) {
      await sendOTPViaGateway(user.id, phone_number);
    } else {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const { error: updateError } = await supabase
        .from("users")
        .update({ otp_code: otp, otp_expires_at: expiresAt })
        .eq("id", user.id);

      if (updateError) throw updateError;
    }

    const isVerified = user.is_verified !== false;

    return success("OTP sent successfully.", {
      role: user.role,
      user_id: user.id,
      is_verified: isVerified,
      message: !isVerified
        ? "Account pending registration verification. An OTP has been sent to complete your verification and log in."
        : phone_number 
          ? `OTP sent to phone number ending in ${phone_number.slice(-4)}`
          : `OTP sent to email ${email}`
    }, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Website Patient Login Error:", error);
    return failure("Login failed.", error.message, 500, { headers: corsHeaders });
  }
}
