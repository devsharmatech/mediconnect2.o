/**
 * API: Enqueue Notification
 *
 * POST /api/queue/notify
 *
 * Inserts a notification job into the queue.
 * Returns immediately — does NOT send the notification itself.
 * The actual sending is handled by the cron worker at /api/cron/notifications
 *
 * Body: { type, recipient_id?, email, phone?, name, payload? }
 */

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, recipient_id, email, phone, name, payload = {} } = body;

    if (!type) {
      return NextResponse.json(
        { success: false, error: "Notification type is required" },
        { status: 400 }
      );
    }

    if (!email && !recipient_id) {
      return NextResponse.json(
        { success: false, error: "Either email or recipient_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("notification_queue")
      .insert({
        type,
        recipient_id: recipient_id || null,
        email: email || null,
        phone: phone || null,
        name: name || null,
        payload,
        status: "pending",
        retry_count: 0,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      queued: true,
      job_id: data.id,
    });
  } catch (error) {
    console.error("POST /api/queue/notify error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
