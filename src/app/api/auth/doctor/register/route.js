import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { sendOTPViaGateway } from "@/lib/sms";
import crypto from "crypto";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { 
      phone_number, 
      full_name, 
      email, 
      password,
      registration_number,
      state_council,
      specialization,
      experience
    } = body;

    if (!phone_number || !full_name || !registration_number) {
      return failure("Phone number, full name, and registration number are required.", null, 400, { headers: corsHeaders });
    }

    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(phone_number)) {
      return failure("Invalid phone number format.", null, 400, { headers: corsHeaders });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return failure("Invalid email format.", null, 400, { headers: corsHeaders });
    }

    // Check if phone exists
    const { data: phoneExists, error: phoneError } = await supabase
      .from("users")
      .select("id")
      .eq("phone_number", phone_number)
      .eq("role", "doctor")
      .maybeSingle();

    if (phoneError) throw phoneError;
    if (phoneExists) {
      return failure("Phone number already registered as doctor.", null, 409, { headers: corsHeaders });
    }

    // Check if email exists
    if (email) {
      const { data: emailExists, error: emailError } = await supabase
        .from("doctor_details")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (emailError && emailError.code !== '42P01') throw emailError; // Ignore relation does not exist for now if table isn't there yet
      if (emailExists) {
        return failure("Email already registered.", null, 409, { headers: corsHeaders });
      }
    }

    // 1. Create user in 'users' table
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert([
        {
          phone_number,
          role: "doctor",
          is_verified: false,
          created_at: new Date(),
        },
      ])
      .select()
      .single();

    if (userError) throw userError;

    // 2. Hash password if provided (for future email/pwd login)
    let hashedPassword = null;
    if (password) {
      hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    }

    // 3. Create doctor details
    const { error: detailsError } = await supabase.from("doctor_details").insert([
      {
        id: user.id,
        full_name,
        email: email || null,
        license_number: registration_number,
        council_name: state_council,
        specialization,
        experience_years: parseInt(experience, 10) || 0,
        kyc_status: 'pending'
      },
    ]);

    if (detailsError) {
      // If table doesn't exist, we should probably fail gracefully or create it.
      // But assuming Supabase schema is setup or will be.
      await supabase.from("users").delete().eq("id", user.id);
      throw detailsError;
    }

    // Send real OTP via gateway
    await sendOTPViaGateway(user.id, phone_number, 'doctor');

    return success(
      "Registration successful. OTP sent for verification.",
      {
        user_id: user.id,
        phone_number: user.phone_number,
        role: user.role,
      },
      201,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Doctor Registration Error:", error);
    
    // Auto-create table logic could go here if we wanted to be bulletproof for prototypes
    if (error.code === '42P01') {
       return failure("Database table 'doctor_details' is missing. Please create it in Supabase.", error.message, 500, { headers: corsHeaders });
    }
    
    return failure("Registration failed.", error.message, 500, { headers: corsHeaders });
  }
}
