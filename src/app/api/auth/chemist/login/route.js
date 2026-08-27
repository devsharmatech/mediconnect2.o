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

    let user = null;

    const { data: directUser } = await supabase
      .from("users")
      .select("id, role, phone_number")
      .like("phone_number", `%${cleanNumber}%`)
      .eq("role", "chemist")
      .maybeSingle();

    if (directUser) {
      user = directUser;
    } else {
      const { data: chem } = await supabase
        .from("chemist_details")
        .select("id")
        .or(`mobile.ilike.%${cleanNumber}%,whatsapp.ilike.%${cleanNumber}%`)
        .maybeSingle();
      if (chem) {
        const { data: u } = await supabase.from("users").select("id, role, phone_number").eq("id", chem.id).maybeSingle();
        if (u) user = u;
      }
    }

    if (!user) return failure("Chemist not found.", null, 404);

    await sendOTPViaGateway(user.id, phone_number);

    return success("OTP sent successfully.", {
      role: user.role,
      user_id: user.id,
    });
  } catch (error) {
    console.error("Chemist Login Error:", error);
    return failure("Login failed.", error.message, 500);
  }
}
