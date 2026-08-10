import admin from "@/lib/firebaseAdmin";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * Dispatches an In-App Notification (Database row insert) and FCM Push Notification.
 *
 * @param {object} params
 * @param {string} params.user_id - Target user ID (patient or doctor)
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification body text
 * @param {string} [params.type='general'] - Type of notification (e.g. 'appointment_booked', 'appointment_cancelled', 'payment_success')
 * @param {object} [params.metadata={}] - Extra metadata (e.g. { appointment_id, doctor_id, patient_id })
 */
export async function sendPushAndInAppNotification({
  user_id,
  title = "MediConnect Notification",
  message = "",
  type = "general",
  metadata = {},
}) {
  if (!user_id) {
    console.warn("[NOTIFICATION HELPER] user_id is required. Skipping notification.");
    return { success: false, error: "user_id is required" };
  }

  try {
    // 1. Insert DB notification for In-App list
    const { data: dbData, error: dbErr } = await supabase
      .from("notifications")
      .insert({
        user_id,
        title,
        message,
        type,
        metadata,
        created_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (dbErr) {
      console.error("[NOTIFICATION HELPER] DB insert error:", dbErr.message);
    } else {
      console.log(`[NOTIFICATION HELPER] DB notification created for user ${user_id}:`, title);
    }

    // 2. Fetch user's FCM token and dispatch push notification
    let pushSent = false;
    const { data: user } = await supabase
      .from("users")
      .select("fcm_token")
      .eq("id", user_id)
      .maybeSingle();

    if (user?.fcm_token) {
      try {
        await admin.messaging().send({
          token: user.fcm_token,
          notification: {
            title,
            body: message,
          },
          data: {
            type,
            title,
            body: message,
            ...(metadata.appointment_id ? { appointment_id: String(metadata.appointment_id) } : {}),
            ...(metadata.order_id ? { order_id: String(metadata.order_id) } : {}),
          },
        });
        pushSent = true;
        console.log(`[NOTIFICATION HELPER] FCM Push successfully sent to user ${user_id}`);
      } catch (fcmErr) {
        console.warn(`[NOTIFICATION HELPER] FCM Push failed for user ${user_id}:`, fcmErr.message);
      }
    } else {
      console.log(`[NOTIFICATION HELPER] No FCM token found for user ${user_id}. DB notification stored.`);
    }

    return { success: true, db_created: !dbErr, push_sent: pushSent };
  } catch (err) {
    console.error("[NOTIFICATION HELPER] Exception in sendPushAndInAppNotification:", err);
    return { success: false, error: err.message };
  }
}
