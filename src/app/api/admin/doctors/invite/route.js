import { NextResponse } from "next/server";
import sql from "@/lib/db";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { sendDoctorWhatsAppInvite } from "@/lib/sms";

export const dynamic = 'force-dynamic';

function formatDoctorName(name) {
  if (!name) return "";
  let trimmed = name.trim();
  const drRegex = /^dr\.?\s*/i;
  while (drRegex.test(trimmed)) {
    trimmed = trimmed.replace(drRegex, "");
  }
  return "Dr. " + trimmed;
}

// Configure nodemailer for synchronous sending
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
    const userRows = await sql`
      SELECT id, phone_number, role
      FROM users
      WHERE id = ${doctor_id} AND role = 'doctor'
      LIMIT 1
    `;

    if (!userRows || userRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Doctor not found" },
        { status: 404 }
      );
    }

    const doctorUser = userRows[0];

    const detailRows = await sql`
      SELECT full_name, email, meta
      FROM doctor_details
      WHERE id = ${doctor_id}
      LIMIT 1
    `;

    const details = detailRows[0] || null;
    const email = details?.email;
    const name = formatDoctorName(details?.full_name || "Doctor");
    const phone = doctorUser.phone_number;

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Doctor email not found. Please fill doctor details first.",
        },
        { status: 400 }
      );
    }

    // 2. Check if a valid (non-expired) token already exists for this doctor
    const statusRows = await sql`
      SELECT invitation_token, token_expires_at, status
      FROM doctor_onboarding_status
      WHERE doctor_id = ${doctor_id}
      LIMIT 1
    `;

    const existingStatus = statusRows[0] || null;
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

      await sql`
        INSERT INTO doctor_onboarding_status (
          doctor_id, invitation_token, token_expires_at, status, otp_verified, agreement_accepted, updated_at
        ) VALUES (
          ${doctor_id}, ${token}, ${expiresAt}, 'PENDING', false, false, NOW()
        )
        ON CONFLICT (doctor_id)
        DO UPDATE SET
          invitation_token = EXCLUDED.invitation_token,
          token_expires_at = EXCLUDED.token_expires_at,
          status = 'PENDING',
          otp_verified = false,
          agreement_accepted = false,
          updated_at = NOW()
      `;
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
        whatsappSent = waResult?.success || false;
        whatsappError = waResult?.error || null;
      } catch (waErr) {
        console.error("[Invite] Failed to send WhatsApp invite:", waErr.message);
        whatsappError = waErr.message;
      }
    }

    // 5. Log the invitation in doctor_details.meta
    try {
      let currentMeta = details?.meta;
      if (typeof currentMeta === 'string') {
        try { currentMeta = JSON.parse(currentMeta); } catch { currentMeta = {}; }
      }
      currentMeta = currentMeta || {};
      const logs = Array.isArray(currentMeta.invitation_logs) ? currentMeta.invitation_logs : [];
      
      logs.push({
        timestamp: new Date().toISOString(),
        method: whatsappSent ? "Email & WhatsApp" : "Email"
      });
      
      currentMeta.invitation_logs = logs;
      currentMeta.invitation_count = logs.length;

      await sql`
        UPDATE doctor_details
        SET meta = ${JSON.stringify(currentMeta)}
        WHERE id = ${doctor_id}
      `;
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
