import { supabase } from "@/lib/supabaseAdmin";
import { corsHeaders } from "@/lib/cors";
import { sendOTPViaGateway } from "@/lib/sms";
import { respondMobileSuccess, respondMobileFailure } from "@/lib/mobileApiGuard";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders() });
}

export async function POST(req) {
  try {
    const { phone_number } = await req.json();
    if (!phone_number) return respondMobileFailure("Phone number is required.", null, 400);

    const cleanNumber = phone_number.replace(/\D/g, "").slice(-10);

    const { data: users, error } = await supabase
      .from("users")
      .select("id, role, phone_number")
      .eq("role", "patient")
      .like("phone_number", `%${cleanNumber}%`);

    if (error) throw error;
    if (!users || users.length === 0) return respondMobileFailure("Patient not found.", null, 404);

    const user = users[0];

    // Send real OTP via gateway
    await sendOTPViaGateway(user.id, user.phone_number, 'patient');

    return respondMobileSuccess("OTP sent successfully.", {
      role: user.role,
      user_id: user.id,
    });
  } catch (error) {
    console.error("Mobile Patient Login Error:", error);
    return respondMobileFailure("Login failed.", error.message, 500);
  }
}
