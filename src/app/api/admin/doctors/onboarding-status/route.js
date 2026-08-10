import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import admin from "@/lib/firebaseAdmin";
import { sendWhatsAppText } from "@/lib/whatsappBot";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("id");

    if (!doctorId) {
      return failure("Doctor ID is required", "validation_error", 400);
    }

    let { data, error } = await supabase
      .from("doctor_onboarding_status")
      .select("*")
      .eq("doctor_id", doctorId)
      .maybeSingle();

    if (error) throw error;
    
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
    const { data: oldStatus } = await supabase
      .from("doctor_onboarding_status")
      .select("*")
      .eq("doctor_id", doctor_id)
      .maybeSingle();

    // Upsert the record
    const { data, error } = await supabase
      .from("doctor_onboarding_status")
      .upsert({
        doctor_id,
        allowed_to_consult,
        registration_verified,
        agreement_accepted,
        otp_verified
      }, { onConflict: "doctor_id" })
      .select()
      .single();

    if (error) throw error;

    // Notifications Logic
    const { data: userDetails } = await supabase
      .from("users")
      .select("phone_number, fcm_token")
      .eq("id", doctor_id)
      .maybeSingle();

    const { data: doctorDetails } = await supabase
      .from("doctor_details")
      .select("full_name")
      .eq("id", doctor_id)
      .maybeSingle();

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
