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
    if (!phone_number || !role) return failure("Phone number and role are required.");

    // Validate phone number format
    const digitsOnly = String(phone_number).replace(/\D/g, "");
    let cleaned_phone = digitsOnly;
    if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
      cleaned_phone = digitsOnly.slice(2);
    }
    if (cleaned_phone.length !== 10 || !/^[6-9]\d{9}$/.test(cleaned_phone)) {
      return failure("Please enter a valid 10-digit mobile number.", null, 400);
    }

    const rateLimitKey = cleaned_phone || "unknown";
    const limitResult = rateLimit(`otp-send:${rateLimitKey}`, 3, 120000); // 3 requests per 2 minutes
    if (!limitResult.allowed) {
      return failure("Too many OTP requests. Please wait 2 minutes before requesting a new OTP.", null, 429);
    }

    let user = null;

    // 1. Direct query on users table
    const { data: directUser } = await supabase
      .from("users")
      .select("id, role, phone_number")
      .eq("role", role)
      .like("phone_number", `%${cleaned_phone}%`)
      .maybeSingle();

    if (directUser) {
      user = directUser;
    }

    // 2. If not found, check detail tables by role as fallback
    if (!user) {
      if (role === "chemist") {
        const { data: chem } = await supabase
          .from("chemist_details")
          .select("id")
          .or(`mobile.ilike.%${cleaned_phone}%,whatsapp.ilike.%${cleaned_phone}%`)
          .maybeSingle();
        if (chem) {
          const { data: u } = await supabase.from("users").select("id, role, phone_number").eq("id", chem.id).maybeSingle();
          if (u) user = u;
        }
      } else if (role === "lab") {
        const { data: lab } = await supabase
          .from("lab_details")
          .select("id")
          .ilike("phone_number", `%${cleaned_phone}%`)
          .maybeSingle();
        if (lab) {
          const { data: u } = await supabase.from("users").select("id, role, phone_number").eq("id", lab.id).maybeSingle();
          if (u) user = u;
        }
      } else if (role === "doctor") {
        const { data: doc } = await supabase
          .from("doctor_details")
          .select("id")
          .or(`phone_number.ilike.%${cleaned_phone}%,mobile.ilike.%${cleaned_phone}%`)
          .maybeSingle();
        if (doc) {
          const { data: u } = await supabase.from("users").select("id, role, phone_number").eq("id", doc.id).maybeSingle();
          if (u) user = u;
        }
      }
    }

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
