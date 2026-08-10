import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import nodemailer from "nodemailer";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

// Configure nodemailer using same SMTP settings
const onboardingStatusTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "0"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

async function sendOnboardingStatusEmail(doctorId, onboarding_status) {
  try {
    const { data: doctor, error } = await supabase
      .from("doctor_details")
      .select("email, full_name")
      .eq("id", doctorId)
      .maybeSingle();

    if (error || !doctor?.email) return;

    const email = doctor.email;
    const name = doctor.full_name || "Doctor";

    let subjectStatus = onboarding_status;
    if (onboarding_status === "approved") subjectStatus = "approved";
    if (onboarding_status === "rejected") subjectStatus = "rejected";
    if (onboarding_status === "pending") subjectStatus = "under review";

    const statusMessage =
      onboarding_status === "approved"
        ? "Your profile has been approved and you can now start using MediConnect to consult with patients."
        : onboarding_status === "rejected"
        ? "Unfortunately, your onboarding has been rejected. If you believe this is an error or want to provide additional documents, please contact our support team."
        : "Your onboarding is currently under review. Our team will notify you once a decision has been made.";

    await onboardingStatusTransporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: `Your MediConnect onboarding status: ${onboarding_status}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0067A1;">Dear ${name},</h2>
          <p>Your MediConnect doctor onboarding status has been updated to: <strong>${onboarding_status}</strong>.</p>
          <p>${statusMessage}</p>
          <p style="margin-top: 24px;">Warm regards,<br/>MediConnect Team</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Onboarding status email send error:", err);
  }
}

export async function POST(req) {
  try {
    const { id, onboarding_status } = await req.json();

    if (!id || !onboarding_status) {
      return failure("ID and status are required", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    const validStatuses = ["pending", "approved", "rejected"];
    if (!validStatuses.includes(onboarding_status)) {
      return failure("Invalid status", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    // Build update payload
    const updatePayload = {
      onboarding_status,
      updated_at: new Date().toISOString(),
    };

    // When approving: also mark registration as verified
    if (onboarding_status === "approved") {
      updatePayload.registration_verified = true;
      updatePayload.kyc_status = "verified";
    }

    // When rejecting: clear registration_verified
    if (onboarding_status === "rejected") {
      updatePayload.registration_verified = false;
    }

    const { data, error } = await supabase
      .from("doctor_details")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Also activate/deactivate the user account record
    if (onboarding_status === "approved") {
      await supabase.from("users").update({ status: 1, updated_at: new Date().toISOString() }).eq("id", id);
    } else if (onboarding_status === "rejected") {
      await supabase.from("users").update({ status: 0, updated_at: new Date().toISOString() }).eq("id", id);
    }

    // Fire-and-forget email notification to doctor
    sendOnboardingStatusEmail(id, onboarding_status);

    return success("Doctor onboarding status updated successfully.", data, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Update Doctor Onboarding Status Error:", error);
    return failure(
      "Failed to update doctor onboarding status. " + error.message,
      "doctor_onboarding_status_update_failed",
      500,
      {
        headers: corsHeaders,
      }
    );
  }
}
