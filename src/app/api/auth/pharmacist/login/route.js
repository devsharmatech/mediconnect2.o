import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

import { sendOTPViaGateway } from "@/lib/sms";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { phone_number } = await req.json();
    if (!phone_number) return failure("Phone number is required.");

    const cleanNumber = phone_number.replace(/\D/g, "").slice(-10);

    const { data: user, error } = await supabase
      .from("users")
      .select("id, role")
      .like("phone_number", `%${cleanNumber}%`)
      .eq("role", "pharmacist")
      .maybeSingle();

    if (error) throw error;
    if (!user) return failure("Pharmacist not found.", null, 404);

    await sendOTPViaGateway(user.id, phone_number);

    return success("OTP sent successfully.", {
      role: user.role,
      user_id: user.id,
    });
  } catch (error) {
    console.error("Pharmacist Login Error:", error);
    return failure("Login failed.", error.message, 500);
  }
}
