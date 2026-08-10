import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseClient";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return failure("Patient ID is required", null, 400, { headers: corsHeaders });
    }

    const { data: profile, error } = await supabase
      .from("patient_details")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    if (!profile) {
      return failure("Profile not found", null, 404, { headers: corsHeaders });
    }

    return success("Profile fetched successfully", { profile }, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Profile Fetch Error:", error);
    return failure("Internal Server Error", error.message, 500, { headers: corsHeaders });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return failure("Patient ID is required", null, 400, { headers: corsHeaders });
    }

    updates.updated_at = new Date().toISOString();

    const { data: profile, error } = await supabase
      .from("patient_details")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return success("Profile updated successfully", { profile }, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Profile Update Error:", error);
    return failure("Internal Server Error", error.message, 500, { headers: corsHeaders });
  }
}
