import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseClient";

// GET messages between two users (e.g. doctor and patient)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const sender_id = searchParams.get('sender_id');
    const receiver_id = searchParams.get('receiver_id');

    if (!sender_id || !receiver_id) {
      return failure("sender_id and receiver_id are required", null, 400);
    }

    // Fetch messages where (sender == A AND receiver == B) OR (sender == B AND receiver == A)
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${sender_id},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${sender_id})`)
      .order("created_at", { ascending: true });

    if (error) {
      // If table doesn't exist, this will throw an error, which is a good indicator we need to create it in Supabase
      console.error("[Messages API] DB Error:", error);
      return failure("Failed to fetch messages", error.message, 500);
    }

    return success("Messages fetched successfully", messages || [], 200);

  } catch (err) {
    console.error("[Messages API] GET Exception:", err);
    return failure("Internal Server Error", err.message, 500);
  }
}

// POST a new message (fallback if not using Supabase client directly)
export async function POST(req) {
  try {
    const body = await req.json();
    const { sender_id, receiver_id, content } = body;

    if (!sender_id || !receiver_id || !content) {
      return failure("sender_id, receiver_id, and content are required", null, 400);
    }

    const { data: newMessage, error } = await supabase
      .from("messages")
      .insert([
        { sender_id, receiver_id, content, status: 'sent' }
      ])
      .select()
      .single();

    if (error) {
      console.error("[Messages API] POST DB Error:", error);
      return failure("Failed to send message", error.message, 500);
    }

    return success("Message sent successfully", newMessage, 201);

  } catch (err) {
    console.error("[Messages API] POST Exception:", err);
    return failure("Internal Server Error", err.message, 500);
  }
}
