import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import nodemailer from "nodemailer";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

const chemistStatusTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "0"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

async function sendChemistOnboardingStatusEmail(chemistId, onboarding_status) {
  try {
    const { data: chemist, error } = await supabase
      .from("chemist_details")
      .select("email, owner_name, pharmacy_name")
      .eq("id", chemistId)
      .maybeSingle();

    if (error || !chemist?.email) return;

    const email = chemist.email;
    const owner = chemist.owner_name || "Chemist";
    const pharmacy = chemist.pharmacy_name || "your pharmacy";

    const statusMessage =
      onboarding_status === "approved"
        ? "Your chemist profile has been approved and you can now start receiving prescriptions and managing orders on MediConnect."
        : onboarding_status === "rejected"
        ? "Unfortunately, your chemist onboarding has been rejected. If you believe this is an error or want to submit updated documents, please contact our support team."
        : "Your chemist onboarding is currently under review. Our team will notify you once a decision has been made.";

    await chemistStatusTransporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: `Your MediConnect chemist onboarding status: ${onboarding_status}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0067A1;">Dear ${owner},</h2>
          <p>The onboarding status for <strong>${pharmacy}</strong> on MediConnect has been updated to: <strong>${onboarding_status}</strong>.</p>
          <p>${statusMessage}</p>
          <p style="margin-top: 24px;">Warm regards,<br/>MediConnect Team</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Chemist onboarding status email send error:", err);
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

    const { data, error } = await supabase
      .from("chemist_details")
      .update({
        onboarding_status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Fire-and-forget email notification
    sendChemistOnboardingStatusEmail(id, onboarding_status);

    return success("Chemist onboarding status updated successfully.", data, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Update Chemist Onboarding Status Error:", error);
    return failure(
      "Failed to update chemist onboarding status. " + error.message,
      "chemist_onboarding_status_update_failed",
      500,
      {
        headers: corsHeaders,
      }
    );
  }
}
