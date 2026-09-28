import admin from "@/lib/firebaseAdmin";
import sql from "@/lib/db";

/**
 * Dispatches an In-App Notification (Database row insert) and FCM Push Notification.
 *
 * @param {object} params
 * @param {string} params.user_id - Target user ID (patient or doctor)
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification body text
 * @param {string} [params.type='general'] - Type of notification
 * @param {object} [params.metadata={}] - Extra metadata
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

  let dbCreated = false;
  let pushSent = false;

  try {
    // 1. Insert DB notification into RDS
    try {
      await sql`
        INSERT INTO notifications (user_id, title, message, type, metadata, created_at)
        VALUES (${user_id}, ${title}, ${message}, ${type}, ${JSON.stringify(metadata)}, NOW())
      `;
      dbCreated = true;
      console.log(`[NOTIFICATION HELPER] DB notification created for user ${user_id}:`, title);
    } catch (dbErr) {
      console.error("[NOTIFICATION HELPER] DB insert error:", dbErr.message);
    }

    // 2. Fetch user's FCM token from RDS and dispatch push notification
    try {
      const [user] = await sql`
        SELECT fcm_token FROM users WHERE id = ${user_id} LIMIT 1
      `;

      if (user?.fcm_token) {
        try {
          await admin.messaging().send({
            token: user.fcm_token,
            notification: { title, body: message },
            data: {
              type,
              title,
              body: message,
              ...(metadata.appointment_id ? { appointment_id: String(metadata.appointment_id) } : {}),
              ...(metadata.order_id ? { order_id: String(metadata.order_id) } : {}),
            },
          });
          pushSent = true;
          console.log(`[NOTIFICATION HELPER] FCM Push sent to user ${user_id}`);
        } catch (fcmErr) {
          console.warn(`[NOTIFICATION HELPER] FCM Push failed for user ${user_id}:`, fcmErr.message);
        }
      } else {
        console.log(`[NOTIFICATION HELPER] No FCM token for user ${user_id}. DB notification stored.`);
      }
    } catch (userErr) {
      console.warn("[NOTIFICATION HELPER] Could not fetch FCM token:", userErr.message);
    }

    return { success: true, db_created: dbCreated, push_sent: pushSent };
  } catch (err) {
    console.error("[NOTIFICATION HELPER] Exception:", err);
    return { success: false, error: err.message };
  }
}
