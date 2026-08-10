import admin from "@/lib/firebaseAdmin";
import { supabase } from "@/lib/supabaseAdmin";
import { corsHeaders } from "@/lib/cors";

/* ----------------------------------------
   POST → Send Test Push Notification
---------------------------------------- */
export async function POST(req) {
  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return Response.json(
        { success: false, message: "user_id is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch device token
    const { data: user, error } = await supabase
      .from("users")
      .select("fcm_token")
      .eq("id", user_id)
      .single();

    if (error || !user?.fcm_token) {
      return Response.json(
        {
          success: false,
          message: "Device token not found for user",
        },
        { status: 404, headers: corsHeaders }
      );
    }

    // Also create a notification row in DB so it is visible in the notifications table/UI
    const { error: insertError } = await supabase.from("notifications").insert({
      user_id,
      title: "Test Notification ✅",
      message: "Firebase push notification is working successfully!",
      type: "test",
      metadata: {
        source: "notifications/test",
      },
    });

    if (insertError) {
      console.error("Notification insert error (test)", insertError);
    }

    // Push payload
    const message = {
      token: user.fcm_token,
      notification: {
        title: "Test Notification ✅",
        body: "Firebase push notification is working successfully!",
      },
      data: {
        type: "test",
        click_action: "/chemist/dashboard",
      },
    };

    // Send push
    const response = await admin.messaging().send(message);

    return Response.json(
      {
        success: true,
        message: "Test notification sent successfully",
        firebase_response: response,
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Test push error:", err);

    return Response.json(
      {
        success: false,
        message: "Failed to send test notification",
        error: err.message,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
