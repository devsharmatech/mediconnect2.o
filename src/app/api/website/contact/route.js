import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      return failure("All fields are required.");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return failure("Please enter a valid email address.");
    }

    const { error } = await supabase.from("website_contact_messages").insert([
      {
        name,
        email,
        subject,
        message,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("Contact form insert error:", error);
      // Surface the underlying error for easier debugging while keeping a user-friendly message
      return failure(
        "Failed to submit your message. Please try again later.",
        typeof error?.message === "string" ? error.message : error
      );
    }

    return success("Your message has been received. We will get back to you soon.");
  } catch (error) {
    console.error("Contact form error:", error);
    return failure(
      "Something went wrong. Please try again.",
      typeof error?.message === "string" ? error.message : error
    );
  }
}
