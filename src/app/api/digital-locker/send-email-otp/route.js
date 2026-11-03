import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import nodemailer from "nodemailer";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587", 10),
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

    const users = await sql`
      SELECT id, phone_number, role
      FROM users
      WHERE id = ${user_id}
      LIMIT 1
    `;
    const user = users[0];

    if (!user) {
      return failure("User not found.", null, 404);
    }

    const role = user.role?.toLowerCase();
    let roleRows = [];
    if (role === "doctor") {
      roleRows = await sql`SELECT email FROM doctor_details WHERE id = ${user_id} LIMIT 1`;
    } else if (role === "patient") {
      roleRows = await sql`SELECT email FROM patient_details WHERE id = ${user_id} LIMIT 1`;
    } else if (role === "chemist" || role === "pharmacist") {
      roleRows = await sql`SELECT email FROM chemist_details WHERE id = ${user_id} LIMIT 1`;
    } else if (role === "lab") {
      roleRows = await sql`SELECT email FROM lab_details WHERE id = ${user_id} LIMIT 1`;
    } else if (role === "admin") {
      roleRows = await sql`SELECT email FROM admin_details WHERE id = ${user_id} LIMIT 1`;
    } else {
      return failure("Invalid user role.", null, 400);
    }

    const roleData = roleRows[0];
    if (!roleData) {
      return failure("User details not found.", null, 404);
    }

    if (roleData.email && roleData.email.toLowerCase() !== email.toLowerCase()) {
      return failure("Email does not match user account.", null, 400);
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const verifications = await sql`
      INSERT INTO email_verifications (user_id, email, otp_code, otp_expires_at)
      VALUES (${user_id}, ${email}, ${otp}, ${expiresAt})
      RETURNING *
    `;
    const verification = verifications[0];

    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: "MediConnect - Email Verification OTP",
        html: `
          <h2>Email Verification</h2>
          <p>Your OTP for email verification on MediConnect is:</p>
          <h1 style="color: #0067A1; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
          <p>This OTP is valid for 10 minutes.</p>
          <p>Do not share this OTP with anyone.</p>
        `,
      });
    } catch (emailError) {
      console.error("Email sending error:", emailError);
    }

    return success("OTP sent successfully to your email.", {
      verification_id: verification?.id,
      email,
      expires_in_minutes: 10,
    });
  } catch (error) {
    console.error("Send Email OTP Error:", error);
    return failure("Failed to send OTP.", error.message, 500);
  }
}
