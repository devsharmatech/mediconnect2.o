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

    const cleanPhone = phone_number.replace(/\D/g, "").slice(-10);
    if (!/^[0-9]{10}$/.test(cleanPhone)) {
      return failure("Invalid phone number format. Please enter a 10-digit mobile number.", null, 400, { headers: corsHeaders });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return failure("Invalid email format.", null, 400, { headers: corsHeaders });
    }

    // Check if user already exists
    const { data: phoneExists, error: phoneError } = await supabase
      .from("users")
      .select("id, is_verified, phone_number, role")
      .like("phone_number", `%${cleanPhone}%`)
      .maybeSingle();

    if (phoneError) throw phoneError;

    if (phoneExists) {
      // User exists — check verification status
      if (phoneExists.is_verified) {
        return failure("This phone number is already registered and verified. Please log in using OTP.", null, 409, { headers: corsHeaders });
      }

      // User exists but is UNVERIFIED — update details & send new OTP to complete verification
      await supabase
        .from("patient_details")
        .upsert({
          id: phoneExists.id,
          full_name,
          email: email || null,
          gender: gender || null,
          date_of_birth: date_of_birth || null,
          address: address || null,
          updated_at: new Date(),
        });

      // Send fresh OTP to complete registration verification
      await sendOTPViaGateway(phoneExists.id, phoneExists.phone_number);

      return success(
        "Account pending verification. OTP sent to your registered phone number.",
        {
          user_id: phoneExists.id,
          phone_number: phoneExists.phone_number,
          role: phoneExists.role || "patient",
        },
        200,
        { headers: corsHeaders }
      );
    }

    // Email duplicate check for new user
    if (email) {
      const { data: emailExists, error: emailError } = await supabase
        .from("patient_details")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (emailError) throw emailError;
      if (emailExists) {
        return failure("Email address already registered.", null, 409, { headers: corsHeaders });
      }
    }

    // Create new unverified user
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert([
        {
          phone_number: cleanPhone,
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

    // Send real OTP via SMS gateway
    await sendOTPViaGateway(user.id, user.phone_number);

    return success(
      "Registration successful. Please enter the OTP sent to your phone number to complete verification.",
      {
        user_id: user.id,
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
