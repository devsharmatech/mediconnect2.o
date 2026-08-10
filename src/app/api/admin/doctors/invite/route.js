import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { getAppBaseUrl } from "@/lib/utils";
import { sendDoctorWhatsAppInvite } from "@/lib/sms";

function formatDoctorName(name) {
  if (!name) return "";
  let trimmed = name.trim();
  const drRegex = /^dr\.?\s*/i;
  while (drRegex.test(trimmed)) {
    trimmed = trimmed.replace(drRegex, "");
  }
  return "Dr. " + trimmed;
}

// Configure nodemailer for synchronous sending (as requested by user)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function POST(request) {
  try {
    const { doctor_id, expiry_hours = 720 } = await request.json();

    if (!doctor_id) {
      return NextResponse.json(
        { success: false, error: "Doctor ID is required" },
        { status: 400 }
      );
    }

    // 1. Get doctor details
    const { data: doctor, error: doctorError } = await supabase
      .from("users")
      .select("phone_number, role")
      .eq("id", doctor_id)
      .eq("role", "doctor")
      .single();

    if (doctorError || !doctor) {
      return NextResponse.json(
        { success: false, error: "Doctor not found" },
        { status: 404 }
      );
    }

    const { data: details } = await supabase
      .from("doctor_details")
      .select("full_name, email, meta")
      .eq("id", doctor_id)
      .single();

    const email = details?.email;
    const name = formatDoctorName(details?.full_name || "Doctor");
    const phone = doctor.phone_number;

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Doctor email not found. Please fill doctor details first.",
        },
        { status: 400 }
      );
    }

    // 2. Check if a valid (non-expired) token already exists for this doctor
    const { data: existingStatus } = await supabase
      .from("doctor_onboarding_status")
      .select("invitation_token, token_expires_at, status")
      .eq("doctor_id", doctor_id)
      .maybeSingle();

    let token;
    let expiresAt;

    const hasValidToken =
      existingStatus?.invitation_token &&
      existingStatus?.token_expires_at &&
      new Date() < new Date(existingStatus.token_expires_at);

    if (hasValidToken) {
      token = existingStatus.invitation_token;
      expiresAt = existingStatus.token_expires_at;
    } else {
      token = crypto.randomBytes(32).toString("hex");
      expiresAt = new Date(
        Date.now() + expiry_hours * 60 * 60 * 1000
      ).toISOString();

      const { error: statusError } = await supabase
        .from("doctor_onboarding_status")
        .upsert({
          doctor_id: doctor_id,
          invitation_token: token,
          token_expires_at: expiresAt,
          status: "PENDING",
          otp_verified: false,
          agreement_accepted: false,
          updated_at: new Date().toISOString(),
        }, { onConflict: "doctor_id" });

      if (statusError) throw statusError;
    }

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const baseUrl = `${protocol}://${host}`;
    const inviteLink = `${baseUrl}/doctor/onboarding?token=${token}`;
    
    // For WhatsApp, Meta's spam filters block localhost URLs, so we spoof a production URL if testing locally
    const whatsappBaseUrl = baseUrl.includes("localhost") ? "https://mediconnect.fit" : baseUrl;
    const whatsappInviteLink = `${whatsappBaseUrl}/doctor/onboarding?token=${token}`;

    // 3. Send email synchronously using nodemailer
    try {
      await transporter.sendMail({
        from: `"MediConnect" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: "Complete Your MediConnect Professional Onboarding",
        html: `
          <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;color:#333;line-height:1.6;">
            <div style="background-color:#0067A1;padding:30px;text-align:center;border-radius:10px 10px 0 0;">
              <h1 style="color:white;margin:0;font-size:24px;">Welcome to MediConnect</h1>
            </div>
            <div style="padding:30px;background-color:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 10px 10px;">
              <h2 style="color:#0067A1;">Hello ${name},</h2>
              <p>Our administration team has pre-filled your professional profile on MediConnect. To complete your onboarding and start consulting with patients, please review and verify your information.</p>
              <div style="background-color:#f9f9f9;padding:20px;border-radius:8px;margin:25px 0;border-left:4px solid #0067A1;">
                <p style="margin:0;font-weight:bold;color:#0067A1;">What you need to do:</p>
                <ul style="margin:10px 0 0 0;padding-left:20px;">
                  <li>Complete DigiLocker KYC verification</li>
                  <li>Verify your registered email address via OTP</li>
                  <li>Review and accept the Professional Service Agreement</li>
                </ul>
              </div>
              <div style="text-align:center;margin:35px 0;">
                <a href="${inviteLink}" style="background-color:#0067A1;color:white;padding:15px 30px;text-decoration:none;border-radius:30px;font-weight:bold;display:inline-block;box-shadow:0 4px 6px rgba(0,0,0,0.1);">Verify &amp; Complete Onboarding</a>
              </div>
              <p style="font-size:14px;color:#666;">This secure link will expire in 30 days. If you have any questions, please reply to this email.</p>
              <hr style="border:none;border-top:1px solid #eee;margin:30px 0;">
              <p style="margin:0;font-size:12px;color:#999;">MediConnect Professional Onboarding System</p>
            </div>
          </div>`,
      });
    } catch (emailErr) {
      console.error("[Invite] Failed to send email synchronously:", emailErr.message);
      return NextResponse.json({
        success: false,
        error: `Failed to send email: ${emailErr.message}`,
        link: inviteLink
      }, { status: 500 });
    }

    // 4. Send WhatsApp invite message asynchronously
    let whatsappSent = false;
    let whatsappError = null;
    if (phone) {
      try {
        const waResult = await sendDoctorWhatsAppInvite(phone, name, whatsappInviteLink);
        whatsappSent = waResult.success;
        whatsappError = waResult.error;
      } catch (waErr) {
        console.error("[Invite] Failed to send WhatsApp invite:", waErr.message);
        whatsappError = waErr.message;
      }
    }

    // 5. Log the invitation in doctor_details.meta
    try {
      const currentMeta = details?.meta || {};
      const logs = Array.isArray(currentMeta.invitation_logs) ? currentMeta.invitation_logs : [];
      
      logs.push({
        timestamp: new Date().toISOString(),
        method: whatsappSent ? "Email & WhatsApp" : "Email"
      });
      
      currentMeta.invitation_logs = logs;
      currentMeta.invitation_count = logs.length;

      await supabase
        .from("doctor_details")
        .update({ meta: currentMeta })
        .eq("id", doctor_id);
    } catch (logErr) {
      console.error("[Invite] Failed to log invitation:", logErr);
    }

    return NextResponse.json({
      success: true,
      message: whatsappSent 
        ? "Invitation sent successfully via Email & WhatsApp!" 
        : "Invitation sent via Email. WhatsApp failed: " + (whatsappError || "No phone number"),
      link: inviteLink,
      whatsapp_sent: whatsappSent
    });
  } catch (error) {
    console.error("Error sending invitation:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
