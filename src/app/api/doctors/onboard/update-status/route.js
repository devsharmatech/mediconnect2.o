import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import nodemailer from "nodemailer";

// Configure nodemailer using SMTP environment variables
const statusMailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "0"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

async function sendStatusEmail(userId, newStatus) {
  try {
    // Fetch doctor details to get email and name
    const { data: doctorDetails, error: detailsError } = await supabase
      .from("doctor_details")
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle();

    if (detailsError || !doctorDetails?.email) return;

    const email = doctorDetails.email;
    const name = doctorDetails.full_name || "Doctor";

    const statusLabel = parseInt(newStatus) === 1 ? "activated" : "deactivated";

    await statusMailTransporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: `Your MediConnect account has been ${statusLabel}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0067A1;">Dear ${name},</h2>
          <p>Your MediConnect doctor account has been <strong>${statusLabel}</strong> by the admin team.</p>
          ${parseInt(newStatus) === 1
            ? "<p>You can now log in and start using the platform to manage your consultations and patients.</p>"
            : "<p>If you believe this change was made in error, please contact support.</p>"}
          <p style="margin-top: 24px;">Warm regards,<br/>MediConnect Team</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Status change email send error:", error);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || status === undefined) {
      return NextResponse.json(
        { success: false, error: "Doctor ID and status are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('users')
      .update({ 
        status: parseInt(status),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('role', 'doctor')
      .select()
      .single();

    if (error) throw error;

    // Send notification email to doctor about status change (non-blocking)
    sendStatusEmail(id, status);

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error updating doctor status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}