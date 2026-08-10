import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import crypto from "crypto";
import { sendGenericOTPViaSMS } from "@/lib/sms";



const OTP_EXPIRY_MS = 5 * 60 * 1000;       // 5 minutes (spec requirement)
const OTP_COOLDOWN_MS = 30 * 1000;          // 30 seconds minimum between requests
const OTP_MAX_PER_HOUR = 5;                 // Max 5 OTP requests per hour per doctor

export async function POST(request) {
  try {
    const { email, phone, doctor_id } = await request.json();

    if (!email && !phone && !doctor_id) {
      return NextResponse.json(
        { success: false, error: "Email, Phone or doctor_id is required" },
        { status: 400 }
      );
    }

    let resolvedDoctorId = doctor_id;
    let resolvedPhone = phone;
    let resolvedEmail = email;

    // Resolve doctor_id from phone if needed
    if (!resolvedDoctorId && resolvedPhone) {
      const { data: users, error: userError } = await supabase
        .from("users")
        .select("id, phone_number")
        .eq("phone_number", resolvedPhone)
        .eq("role", "doctor");

      if (!userError && users && users.length > 0) {
        resolvedDoctorId = users[0].id;
      }
    }

    // Resolve doctor_id from email if needed
    if (!resolvedDoctorId && resolvedEmail) {
      const { data: details, error: detailsError } = await supabase
        .from("doctor_details")
        .select("id")
        .eq("email", resolvedEmail);

      if (!detailsError && details && details.length > 0) {
        resolvedDoctorId = details[0].id;
      }
    }


    // Resolve phone and email from doctor_id if needed
    if (resolvedDoctorId) {
      const { data: user } = await supabase
        .from("users")
        .select("phone_number")
        .eq("id", resolvedDoctorId)
        .single();
      if (!resolvedPhone) resolvedPhone = user?.phone_number;

      if (!resolvedEmail || !resolvedPhone) {
        const { data: details } = await supabase
          .from("doctor_details")
          .select("email, phone_number")
          .eq("id", resolvedDoctorId)
          .single();
        if (!resolvedEmail) resolvedEmail = details?.email;
        if (!resolvedPhone) resolvedPhone = details?.phone_number;
      }
    }

    if (!resolvedPhone) {
      return NextResponse.json(
        { success: false, error: "Phone number not found" },
        { status: 400 }
      );
    }

    if (!resolvedDoctorId) {
      return NextResponse.json(
        { success: false, error: "Doctor not found" },
        { status: 404 }
      );
    }

    // ── RATE LIMITING ─────────────────────────────────────────────────────────
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: recentOtps, error: recentErr } = await supabase
      .from("doctor_otp_logs")
      .select("created_at")
      .eq("doctor_id", resolvedDoctorId)
      .gte("created_at", oneHourAgo)
      .order("created_at", { ascending: false });

    if (!recentErr && recentOtps) {
      // Max 5 per hour
      if (recentOtps.length >= OTP_MAX_PER_HOUR) {
        return NextResponse.json(
          {
            success: false,
            error: "Too many OTP requests. Maximum 5 per hour. Please try again later.",
          },
          { status: 429 }
        );
      }

      // 30-second cooldown between requests
      if (recentOtps.length > 0) {
        const lastSentAt = new Date(recentOtps[0].created_at).getTime();
        const msSinceLast = Date.now() - lastSentAt;
        if (msSinceLast < OTP_COOLDOWN_MS) {
          const waitSecs = Math.ceil((OTP_COOLDOWN_MS - msSinceLast) / 1000);
          return NextResponse.json(
            {
              success: false,
              error: `Please wait ${waitSecs} second(s) before requesting a new OTP.`,
            },
            { status: 429 }
          );
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    // Store OTP in doctor_otp_logs (5-minute expiry per spec)
    const { error: insertError } = await supabase
      .from("doctor_otp_logs")
      .insert([
        {
          doctor_id: resolvedDoctorId,
          otp_hash: otpHash,
          is_used: false,
          attempt_count: 0,
          expires_at: new Date(Date.now() + OTP_EXPIRY_MS).toISOString(),
        },
      ]);


    if (insertError) throw insertError;

    // Send OTP via SMS
    let smsSuccess = false;
    let smsError = null;
    if (resolvedPhone) {
      const smsRes = await sendGenericOTPViaSMS(resolvedPhone, otp);
      smsSuccess = smsRes.success;
      smsError = smsRes.error;
    }

    if (!smsSuccess) {
      console.warn(`[SMS GATEWAY] Onboarding SMS send failed: ${smsError || "Unknown error"}.`);
      return NextResponse.json(
        { success: false, error: smsError || "Failed to send SMS OTP. Please check your phone number." },
        { status: 500 }
      );
    }

    console.log(`[DEV] SMS OTP sent to ${resolvedPhone}: ${otp}`);

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully to phone number",
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
