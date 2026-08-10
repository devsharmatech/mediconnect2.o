import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import nodemailer from "nodemailer";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

// Generate a random 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Configure nodemailer (update with your email service)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function POST(req) {
  try {
    const { user_id, email } = await req.json();

    if (!user_id || !email) {
      return failure("User ID and email are required.", null, 400);
    }

    // Verify user exists and get role
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, phone_number, role")
      .eq("id", user_id)
      .single();
    
    if (userError || !user) {
      return failure("User not found.", null, 404);
    }

    // Map role to table name
    const roleTableMap = {
      doctor: "doctor_details",
      patient: "patient_details",
      chemist: "chemist_details",
      lab: "lab_details",
      pharmacist: "pharmacist_details",
      admin: "admin_details",
    };

    const roleTable = roleTableMap[user.role?.toLowerCase()];
    if (!roleTable) {
      return failure("Invalid user role.", null, 400);
    }

    // Get email from role-specific table
    const { data: roleData, error: roleError } = await supabase
      .from(roleTable)
      .select("email")
      .eq("id", user_id)
      .single();

    if (roleError || !roleData) {
      return failure("User details not found.", null, 404);
    }

    // Verify email matches
    if (roleData.email?.toLowerCase() !== email.toLowerCase()) {
      return failure("Email does not match user account.", null, 400);
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Insert email verification record
    const { data: verification, error: verificationError } = await supabase
      .from("email_verifications")
      .insert({
        user_id,
        email,
        otp_code: otp,
        otp_expires_at: expiresAt,
      })
      .select()
      .single();

    if (verificationError) throw verificationError;

    // Log OTP in console for local development testing
    console.log(`[DEV] Email OTP sent to ${email}: ${otp}`);

    // Send OTP via email
    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: "MediConnect - Email Verification OTP",
        html: `
          <h2>Email Verification</h2>
          <p>Your OTP for email verification on MediConnect is:</p>
          <h1 style="color: #007bff; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
          <p>This OTP is valid for 10 minutes.</p>
          <p>Do not share this OTP with anyone.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      });
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      // Continue even if email fails for development
    }

    return success("OTP sent successfully to your email.", {
      verification_id: verification.id,
      email,
      expires_in_minutes: 10,
    });
  } catch (error) {
    console.error("Send Email OTP Error:", error);
    return failure("Failed to send OTP.", error.message, 500);
  }
}
