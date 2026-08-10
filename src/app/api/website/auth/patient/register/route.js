import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { sendOTPViaGateway } from "@/lib/sms";


export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { phone_number, full_name, email, gender, date_of_birth, address } = body;

    if (!phone_number || !full_name) {
      return failure("Phone number and full name are required.", null, 400, { headers: corsHeaders });
    }

    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(phone_number)) {
      return failure("Invalid phone number format.", null, 400, { headers: corsHeaders });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return failure("Invalid email format.", null, 400, { headers: corsHeaders });
    }

    const { data: phoneExists, error: phoneError } = await supabase
      .from("users")
      .select("id")
      .eq("phone_number", phone_number)
      .maybeSingle();

    if (phoneError) throw phoneError;
    if (phoneExists) {
      return failure("Phone number already registered.", null, 409, { headers: corsHeaders });
    }

    if (email) {
      const { data: emailExists, error: emailError } = await supabase
        .from("patient_details")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (emailError) throw emailError;
      if (emailExists) {
        return failure("Email already registered.", null, 409, { headers: corsHeaders });
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

    // Send real OTP via gateway (OTP saved to DB regardless of SMS success)
    await sendOTPViaGateway(user.id, phone_number);

    return success(
      "Registration successful. Use the OTP sent to your phone number for verification.",
      {
        phone_number: user.phone_number,
        role: user.role,
      },
      201,
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error("Website Registration Error:", error);
    return failure("Registration failed.", error.message, 500, { headers: corsHeaders });
  }
}
