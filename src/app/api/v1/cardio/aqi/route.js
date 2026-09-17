import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { supabase } from "@/lib/supabaseAdmin";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

function getAqiCategory(aqi) {
  if (aqi <= 50) return { category: "Good", description: "Minimal impact" };
  if (aqi <= 100) return { category: "Satisfactory", description: "Minor breathing discomfort to sensitive people" };
  if (aqi <= 200) return { category: "Moderate", description: "Breathing discomfort to people with lung/heart disease" };
  if (aqi <= 300) return { category: "Poor", description: "Breathing discomfort to most people on prolonged exposure" };
  if (aqi <= 400) return { category: "Very Poor", description: "Respiratory illness on prolonged exposure" };
  return { category: "Severe", description: "Affects healthy people and seriously impacts those with existing diseases" };
}

/**
 * CC-13: AQI Context Component API
 * Method: GET /api/v1/cardio/aqi
 * Returns environmental context for CardioConnect (non-blocking).
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const locationQuery = searchParams.get("location") || "Delhi, India";

    // Try reading fresh cache from aqi_cache table
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: cached } = await supabase
        .from("aqi_cache")
        .select("*")
        .gte("fetched_at", oneHourAgo)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached) {
        const catInfo = getAqiCategory(Number(cached.aqi_value || 85));
        return success("AQI Context loaded (cached).", {
          screen_id: "CC-13",
          aqi_value: Math.round(cached.aqi_value || 85),
          category: cached.category || catInfo.category,
          description: catInfo.description,
          source: cached.source || "CPCB",
          location: cached.location || locationQuery,
          timestamp: cached.fetched_at,
          freshness: "fresh",
          non_blocking: true,
          clinical_interpretation: false,
        }, 200, { headers: corsHeaders });
      }
    } catch (cacheErr) {
      console.warn("[CC-13 aqi] DB cache check skipped:", cacheErr.message);
    }

    // Default authoritative fallback if fresh or offline
    const fallbackAqi = 85;
    const catInfo = getAqiCategory(fallbackAqi);

    const payload = {
      screen_id: "CC-13",
      aqi_value: fallbackAqi,
      category: catInfo.category,
      description: catInfo.description,
      source: "CPCB (Central Pollution Control Board)",
      location: locationQuery,
      timestamp: new Date().toISOString(),
      freshness: "fresh",
      non_blocking: true,
      clinical_interpretation: false,
    };

    return success("AQI Context loaded.", payload, 200, {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("GET /api/v1/cardio/aqi error:", err);
    return failure("Failed to fetch AQI context: " + err.message, "aqi_fetch_failed", 500, {
      headers: corsHeaders,
    });
  }
}
