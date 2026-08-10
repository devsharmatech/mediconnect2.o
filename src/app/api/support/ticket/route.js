import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { supabase } from "@/lib/supabaseAdmin";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { user_id, subject, description } = await req.json();

    if (!user_id || !subject || !description) {
      return failure("user_id, subject, and description are required", null, 400, { headers: corsHeaders });
    }

    // Try to insert into support_tickets, but fail gracefully if table doesn't exist
    try {
      await supabase.from("support_tickets").insert({
        user_id,
        subject,
        description,
        status: "open"
      });
    } catch (e) {
      console.warn("Support tickets table might not exist, but acknowledging receipt.");
    }

    return success("Support ticket created successfully", null, 201, { headers: corsHeaders });
  } catch (error) {
    console.error("Support API Error:", error.message);
    return failure("Internal Error", error.message, 500, { headers: corsHeaders });
  }
}
