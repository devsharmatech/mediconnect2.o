import { NextResponse } from "next/server";
import sql from "@/lib/db";
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
    const rows = await sql`
      SELECT email, full_name
      FROM doctor_details
      WHERE id = ${userId}
      LIMIT 1
    `;
    const doctorDetails = rows[0];

    if (!doctorDetails?.email) return;

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

    const intStatus = parseInt(status, 10);

    const userRows = await sql`
      UPDATE users
      SET 
        status = ${intStatus},
        updated_at = NOW()
      WHERE id = ${id} AND role = 'doctor'
      RETURNING *;
    `;

    if (!userRows || userRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Doctor not found or update failed" },
        { status: 404 }
      );
    }

    // Sync doctor_onboarding_status
    await sql`
      INSERT INTO doctor_onboarding_status (doctor_id, allowed_to_consult, registration_verified, updated_at)
      VALUES (${id}, ${intStatus === 1}, ${intStatus === 1}, NOW())
      ON CONFLICT (doctor_id)
      DO UPDATE SET
        allowed_to_consult = ${intStatus === 1},
        updated_at = NOW();
    `;

    // Send notification email to doctor about status change (non-blocking)
    sendStatusEmail(id, status);

    return NextResponse.json({
      success: true,
      data: userRows[0]
    });
  } catch (error) {
    console.error('Error updating doctor status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
