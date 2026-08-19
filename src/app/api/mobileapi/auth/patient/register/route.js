import { supabase } from "@/lib/supabaseAdmin";
import { corsHeaders } from "@/lib/cors";
import { sendOTPViaGateway } from "@/lib/sms";
import { respondMobileSuccess, respondMobileFailure } from "@/lib/mobileApiGuard";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { phone_number, full_name, email, gender, date_of_birth, address } = body;

    if (!phone_number || !full_name) {
      return respondMobileFailure("Phone number and full name are required.", null, 400);
    }

    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(phone_number)) {
      return respondMobileFailure("Invalid phone number format.", null, 400);
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return respondMobileFailure("Invalid email format.", null, 400);
    }

    const { data: phoneExists, error: phoneError } = await supabase
      .from("users")
      .select("id")
      .eq("phone_number", phone_number)
      .eq("role", "patient")
      .maybeSingle();

    if (phoneError) throw phoneError;
    if (phoneExists) {
      return respondMobileFailure("Phone number already registered.", null, 409);
    }

    if (email) {
      const { data: emailExists, error: emailError } = await supabase
        .from("patient_details")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (emailError) throw emailError;
      if (emailExists) {
        return respondMobileFailure("Email already registered.", null, 409);
      }
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .insert([
        {
          phone_number,
          role: "patient",
          is_verified: false,
          created_at: new Date(),
        },
      ])
      .select()
      .single();

    if (userError) throw userError;

    const { error: detailsError } = await supabase.from("patient_details").insert([
      {
        id: user.id,
        full_name,
        email: email || null,
        gender: gender || null,
        date_of_birth: date_of_birth || null,
        address: address || null,
      },
    ]);

    if (detailsError) {
      await supabase.from("users").delete().eq("id", user.id);
      throw detailsError;
    }

    // Send real OTP via gateway
    await sendOTPViaGateway(user.id, phone_number, 'patient');

    return respondMobileSuccess(
      "Registration successful. OTP sent for verification.",
      {
        user_id: user.id,
        phone_number: user.phone_number,
        role: user.role,
      },
      201
    );
  } catch (error) {
    console.error("Mobile Registration Error:", error);
    return respondMobileFailure("Registration failed.", error.message, 500);
  }
}
