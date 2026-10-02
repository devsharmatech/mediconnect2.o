import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import admin from "@/lib/firebaseAdmin";
import { sendWhatsAppText } from "@/lib/whatsappBot";

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("id");

    if (!doctorId) {
      return failure("Doctor ID is required", "validation_error", 400);
    }

    const rows = await sql`
      SELECT *
      FROM doctor_onboarding_status
      WHERE doctor_id = ${doctorId}
      LIMIT 1
    `;

    let data = rows[0] || null;
    
    // If not found, return default false states
    if (!data) {
      data = {
        doctor_id: doctorId,
        allowed_to_consult: false,
        registration_verified: false,
        agreement_accepted: false,
        otp_verified: false
      };
    }

    return success("Status fetched", data, 200);
  } catch (error) {
    return failure("Failed to fetch onboarding status: " + error.message, "fetch_failed", 500);
  }
}

export async function POST(req) {
  try {
    const { doctor_id, allowed_to_consult, registration_verified, agreement_accepted, otp_verified } = await req.json();

    if (!doctor_id) {
      return failure("Doctor ID is required", "validation_error", 400);
    }

    // Fetch old status to detect changes
    const oldStatusRows = await sql`
      SELECT *
      FROM doctor_onboarding_status
      WHERE doctor_id = ${doctor_id}
      LIMIT 1
    `;
    const oldStatus = oldStatusRows[0] || null;

    // Upsert the record
    const updatedRows = await sql`
      INSERT INTO doctor_onboarding_status (
        doctor_id, allowed_to_consult, registration_verified, agreement_accepted, otp_verified, updated_at
      ) VALUES (
        ${doctor_id},
        ${allowed_to_consult ?? false},
        ${registration_verified ?? false},
        ${agreement_accepted ?? false},
        ${otp_verified ?? false},
        NOW()
      )
      ON CONFLICT (doctor_id)
      DO UPDATE SET
        allowed_to_consult = EXCLUDED.allowed_to_consult,
        registration_verified = EXCLUDED.registration_verified,
        agreement_accepted = EXCLUDED.agreement_accepted,
        otp_verified = EXCLUDED.otp_verified,
        updated_at = NOW()
      RETURNING *
    `;

    const data = updatedRows[0];

    // Notifications Logic
    const userRows = await sql`
      SELECT phone_number, fcm_token
      FROM users
      WHERE id = ${doctor_id}
      LIMIT 1
    `;
    const userDetails = userRows[0] || null;

    const doctorRows = await sql`
      SELECT full_name
      FROM doctor_details
      WHERE id = ${doctor_id}
      LIMIT 1
    `;
    const doctorDetails = doctorRows[0] || null;

    const phone = userDetails?.phone_number;
    const fcmToken = userDetails?.fcm_token;
    let doctorName = doctorDetails?.full_name || "Doctor";
    
    // Clean name from multiple Dr. prefixes
    const drRegex = /^dr\.?\s*/i;
    while (drRegex.test(doctorName)) {
      doctorName = doctorName.replace(drRegex, "").trim();
    }

    const wasAllowed = oldStatus?.allowed_to_consult === true;
    const isAllowed = allowed_to_consult === true;

    const wasRegVerified = oldStatus?.registration_verified === true;
    const isRegVerified = registration_verified === true;

    let notifyMessage = null;

    if (!wasAllowed && isAllowed) {
      notifyMessage = `Congratulations Dr. ${doctorName}! Your onboarding is complete and your profile is verified. You can now start consulting on Mediconnect.`;
    } else if (!wasRegVerified && isRegVerified) {
      notifyMessage = `Update: Your registration details have been verified successfully, Dr. ${doctorName}.`;
    } else if (oldStatus?.otp_verified !== otp_verified && otp_verified === true) {
      notifyMessage = `Update: Your contact number has been manually verified by administration.`;
    }

    if (notifyMessage) {
      if (phone) {
        try {
          await sendWhatsAppText(phone, notifyMessage);
        } catch (waErr) {
          console.error("Failed to send WhatsApp status update:", waErr);
        }
      }
      if (fcmToken) {
        try {
          await admin.messaging().send({
            token: fcmToken,
            notification: {
              title: "Onboarding Status Updated",
              body: notifyMessage,
            },
          });
        } catch (fcmErr) {
          console.error("Failed to send FCM status update:", fcmErr);
        }
      }
    }

    return success("Onboarding status updated", data, 200);
  } catch (error) {
    return failure("Failed to update status: " + error.message, "update_failed", 500);
  }
}
