import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

const parseMetadata = (metadata) => {
  if (!metadata) return {};
  if (typeof metadata === "object") return metadata;
  try {
    return JSON.parse(metadata);
  } catch (err) {
    return {};
  }
};

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limitParam = Number(searchParams.get("limit") || 200);
    const limit = Math.max(1, Math.min(limitParam, 500));

    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_id, title, message, type, metadata, created_at")
      .eq("type", "admin_broadcast")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[notifications/logs] query error:", error);
      return failure("Failed to load notification logs", error.message, 500);
    }

    const batches = new Map();

    (data || []).forEach((row) => {
      const metadata = parseMetadata(row.metadata);
      const batchId = metadata.batch_id || "unknown";
      const audience = metadata.audience || "unknown";

      if (!batches.has(batchId)) {
        batches.set(batchId, {
          batch_id: batchId,
          title: row.title,
          message: row.message,
          created_at: row.created_at,
          audience,
          total: 0,
          push_sent: 0,
        });
      }

      const entry = batches.get(batchId);
      entry.total += 1;
      if (metadata.push_sent) entry.push_sent += 1;
    });

    const logs = Array.from(batches.values()).sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return success("Notification logs", logs);
  } catch (err) {
    console.error("[notifications/logs] Error:", err);
    return failure("Failed to load notification logs", err.message, 500);
  }
}
