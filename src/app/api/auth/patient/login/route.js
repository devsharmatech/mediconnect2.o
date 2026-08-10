import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { sendOTPViaGateway } from "@/lib/sms";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders() });
}

export async function POST(req) {
  try {
    const { phone_number } = await req.json();
    if (!phone_number) return failure("Phone number is required.");

    const cleanNumber = phone_number.replace(/\D/g, "").slice(-10);

    const { data: users, error } = await supabase
      .from("users")
      .select("id, role, phone_number")
      .eq("role", "patient")
      .like("phone_number", `%${cleanNumber}%`);

    if (error) throw error;
    if (!users || users.length === 0) return failure("Patient not found.", null, 404);

    const user = users[0];

    // Send real OTP via gateway
    await sendOTPViaGateway(user.id, user.phone_number, 'patient');

    return success("OTP sent successfully.", {
      role: user.role,
      user_id: user.id,
    });
  } catch (error) {
    console.error("Patient Login Error:", error);
    return failure("Login failed.", error.message, 500);
  }
}

