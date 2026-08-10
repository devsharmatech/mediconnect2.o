import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const {
      location,
      aqi,
      pollutant_data,
      health_advisory,
    } = await req.json();

    if (!location || !aqi) {
      return failure("Location and AQI are required", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    const { data, error } = await supabase
      .from("aqi_data")
      .insert([
        {
          location,
          aqi,
          pollutant_data: pollutant_data || {},
          health_advisory,
          last_updated: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return success("AQI data stored successfully.", data, 201, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("POST AQI Data Error:", error);
    return failure("Failed to store AQI data. " + error.message, "creation_failed", 500, {
      headers: corsHeaders,
    });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const location = searchParams.get("location");

    let query = supabase
      .from("aqi_data")
      .select("*")
      .order("last_updated", { ascending: false })
      .limit(1);

    if (location) {
      query = query.ilike("location", `%${location}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return success("AQI data fetched successfully.", { aqi_data: data[0] || null }, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("GET AQI Data Error:", error);
    return failure("Failed to fetch AQI data. " + error.message, "fetch_failed", 500, {
      headers: corsHeaders,
    });
  }
}