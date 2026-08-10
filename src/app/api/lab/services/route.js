import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { lab_id, services } = await req.json();

    if (!lab_id) {
      return failure("lab_id required", null, 400, { headers: corsHeaders });
    }

    if (!services || !Array.isArray(services)) {
      return failure("services array required", null, 400, { headers: corsHeaders });
    }

    // Validate services structure
    const validServices = services.filter(service => 
      service.service_name && 
      typeof service.service_name === 'string' &&
      service.price && 
      typeof service.price === 'number'
    );

    if (validServices.length === 0) {
      return failure("Valid services required", null, 400, { headers: corsHeaders });
    }

    // Update lab services
    const { data, error } = await supabase
      .from("lab_details")
      .update({
        services: validServices,
        updated_at: new Date().toISOString()
      })
      .eq("id", lab_id)
      .select()
      .single();

    if (error) throw error;

    return success("Services updated successfully", data, 200, { headers: corsHeaders });
  } catch (err) {
    return failure("Failed to update services", err.message, 500, { headers: corsHeaders });
  }
}

// GET - Get lab services
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const lab_id = searchParams.get('lab_id');

    if (!lab_id) {
      return failure("lab_id required", null, 400, { headers: corsHeaders });
    }

    // Get lab services from lab_details
    const { data: labData, error } = await supabase
      .from("lab_details")
      .select("services")
      .eq("id", lab_id)
      .single();

    if (error) throw error;

    return success("Services fetched", labData?.services || [], 200, { headers: corsHeaders });
  } catch (err) {
    return failure("Failed fetching services", err.message, 500, { headers: corsHeaders });
  }
}