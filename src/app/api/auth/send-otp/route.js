import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { sendOTPViaGateway } from "@/lib/sms";
import { rateLimit } from "@/lib/rateLimit";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { phone_number, role } = await req.json();
    console.log("SEND-OTP RECEIVED:", { phone_number, role });
    if (!phone_number || !role) return failure("Phone number and role are required.");

    // Clean phone number (strip spaces, remove +91 prefix, keep last 10 digits)
    let cleaned_phone = phone_number.replace(/\D/g, "").slice(-10);

    const rateLimitKey = cleaned_phone || "unknown";
    const limitResult = rateLimit(`otp-send:${rateLimitKey}`, 3, 120000); // 3 requests per 2 minutes
    if (!limitResult.allowed) {
      return failure("Too many OTP requests. Please wait 2 minutes before requesting a new OTP.", null, 429);
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("id, role")
      .like("phone_number", `%${cleaned_phone}%`)
      .eq("role", role)
      .maybeSingle();

    if (error) throw error;
    if (!user) return failure(`${role} not found.`, null, 404);

    // Send real OTP via gateway
    await sendOTPViaGateway(user.id, phone_number, user.role);

    return success("OTP sent successfully.", {
      role: user.role,
      user_id: user.id,
    });
  } catch (error) {
    console.error("Send OTP Error:", error);
    return failure("Failed to send OTP.", error.message, 500);
  }
}
