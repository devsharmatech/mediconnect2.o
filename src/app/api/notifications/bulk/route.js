import admin from "@/lib/firebaseAdmin";
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

const chunkArray = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      title = "Notification",
      message = "",
      image_url = "",
      roles = [],
      sendToAll = false,
      type = "admin_broadcast",
      metadata = {},
    } = body || {};

    if (!message) {
      return failure("message is required", null, 400);
    }

    const normalizedImageUrl =
      typeof image_url === "string" ? image_url.trim() : "";

    if (normalizedImageUrl && !/^https:\/\//i.test(normalizedImageUrl)) {
      return failure("image_url must be a valid https URL", null, 400);
    }

    const audience = sendToAll || !roles.length ? "all" : roles;

    let query = supabase
      .from("users")
      .select("id, fcm_token, role");

    if (!sendToAll && roles.length) {
      query = query.in("role", roles);
    }

    const { data: users, error } = await query;
    if (error) {
      console.error("[notifications/bulk] user query error:", error);
      return failure("Failed to load users", error.message, 500);
    }

    if (!users || users.length === 0) {
      return success("No users matched", {
        batch_id: null,
        total_users: 0,
        push_sent: 0,
      });
    }

    const batchId = crypto.randomUUID();
    const pushSentUserIds = new Set();

    const recipientsWithTokens = users
      .filter((user) => user.fcm_token)
      .map((user) => ({ id: user.id, token: user.fcm_token }));

    const tokenChunks = chunkArray(recipientsWithTokens, 500);

    for (const chunk of tokenChunks) {
      const tokens = chunk.map((item) => item.token);
      if (!tokens.length) continue;

      try {
        const response = await admin.messaging().sendEachForMulticast({
          tokens,
          notification: {
            title,
            body: message,
            ...(normalizedImageUrl ? { image: normalizedImageUrl } : {}),
          },
          data: {
            type,
            batch_id: batchId,
            ...(normalizedImageUrl
              ? { image_url: normalizedImageUrl }
              : {}),
          },
        });

        response.responses.forEach((res, idx) => {
          if (res.success) {
            pushSentUserIds.add(chunk[idx].id);
          }
        });
      } catch (err) {
        console.warn("[notifications/bulk] FCM chunk failed:", err?.message);
      }
    }

    const rows = users.map((user) => ({
      user_id: user.id,
      title,
      message,
      type,
      metadata: {
        ...metadata,
        batch_id: batchId,
        audience,
        role: user.role || "unknown",
        push_sent: pushSentUserIds.has(user.id),
        ...(normalizedImageUrl
          ? { image_url: normalizedImageUrl }
          : {}),
      },
    }));

    const rowChunks = chunkArray(rows, 500);
    for (const chunk of rowChunks) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(chunk);

      if (insertError) {
        console.error("[notifications/bulk] insert error:", insertError);
        return failure("Failed to create notification logs", insertError.message, 500);
      }
    }

    return success("Bulk notification sent", {
      batch_id: batchId,
      total_users: users.length,
      push_sent: pushSentUserIds.size,
    });
  } catch (err) {
    console.error("[notifications/bulk] Error:", err);
    return failure("Failed to send bulk notification", err.message, 500);
  }
}
