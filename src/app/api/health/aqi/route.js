import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

// Default location coordinates (Delhi) per policy
const DEFAULT_LOCATION = "Delhi";
const DEFAULT_LAT = 28.6139;
const DEFAULT_LNG = 77.2090;
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours community cache

function getHealthAdvisory(aqi) {
  if (aqi <= 50) return "Good: Air quality is satisfactory, and air pollution poses little or no risk.";
  if (aqi <= 100) return "Moderate: Air quality is acceptable; sensitive individuals may experience mild effects.";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups: General public not likely affected; sensitive individuals should reduce prolonged outdoor exertion.";
  if (aqi <= 200) return "Unhealthy: Everyone may begin to experience health effects; avoid prolonged outdoor exertion.";
  if (aqi <= 300) return "Very Unhealthy: Health alert: Increased risk for everyone. Minimize outdoor activity.";
  return "Hazardous: Emergency health warning. The entire population is likely affected. Stay indoors.";
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const locationQuery = searchParams.get("location");
    const latParam = searchParams.get("lat") || searchParams.get("latitude");
    const lngParam = searchParams.get("lng") || searchParams.get("longitude");

    let resolvedLocation = (locationQuery && locationQuery.trim()) ? locationQuery.trim() : DEFAULT_LOCATION;
    let lat = latParam ? parseFloat(latParam) : null;
    let lng = lngParam ? parseFloat(lngParam) : null;

    // 1. Check Community Database Cache in `aqi_data`
    const cacheCutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();

    let cacheQuery = supabase
      .from("aqi_data")
      .select("*")
      .gte("last_updated", cacheCutoff)
      .order("last_updated", { ascending: false })
      .limit(1);

    if (resolvedLocation) {
      cacheQuery = cacheQuery.ilike("location", `%${resolvedLocation}%`);
    }

    const { data: cachedRows } = await cacheQuery;

    if (cachedRows && cachedRows.length > 0) {
      const cached = cachedRows[0];
      return success("AQI data retrieved from community cache.", {
        aqi_data: {
          location: cached.location,
          aqi: cached.aqi,
          pollutant_data: cached.pollutant_data || {},
          health_advisory: cached.health_advisory || getHealthAdvisory(cached.aqi),
          last_updated: cached.last_updated,
          source: "cache"
        }
      }, 200, { headers: corsHeaders });
    }

    // 2. Resolve Geocoordinates if not provided
    if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
      try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(resolvedLocation)}&count=1&language=en&format=json`;
        const geoRes = await fetch(geoUrl, { next: { revalidate: 86400 } });
        if (geoRes.ok) {
          const geoJson = await geoRes.json();
          if (geoJson.results && geoJson.results.length > 0) {
            lat = geoJson.results[0].latitude;
            lng = geoJson.results[0].longitude;
            resolvedLocation = geoJson.results[0].name || resolvedLocation;
          }
        }
      } catch (geoErr) {
        console.warn("[AQI API] Geocoding lookup error:", geoErr.message);
      }
    }

    // Fallback to Delhi default if coordinates still missing
    if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
      lat = DEFAULT_LAT;
      lng = DEFAULT_LNG;
      resolvedLocation = DEFAULT_LOCATION;
    }

    // 3. If reverse geocoding is needed for user coordinates (when no text location provided)
    if (!locationQuery && latParam && lngParam) {
      try {
        const revGeoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
        const revRes = await fetch(revGeoUrl);
        if (revRes.ok) {
          const revData = await revRes.json();
          const city = revData.city || revData.locality || revData.principalSubdivision;
          if (city) resolvedLocation = city;
        }
      } catch (revErr) {
        console.warn("[AQI API] Reverse geocoding error:", revErr.message);
      }
    }

    // 4. Fetch Live Air Quality from Free Open-Meteo Air Quality API
    const aqiApiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm10,pm2_5,european_aqi,nitrogen_dioxide,sulphur_dioxide,ozone`;
    const aqiRes = await fetch(aqiApiUrl);

    if (!aqiRes.ok) {
      throw new Error(`Open-Meteo API returned status: ${aqiRes.status}`);
    }

    const aqiData = await aqiRes.json();
    const current = aqiData.current || {};
    const aqiValue = current.us_aqi || Math.round((current.pm2_5 || 25) * 2.5) || 75;

    const pollutant_data = {
      pm2_5: current.pm2_5 ?? null,
      pm10: current.pm10 ?? null,
      european_aqi: current.european_aqi ?? null,
      no2: current.nitrogen_dioxide ?? null,
      so2: current.sulphur_dioxide ?? null,
      ozone: current.ozone ?? null,
      latitude: lat,
      longitude: lng
    };

    const health_advisory = getHealthAdvisory(aqiValue);
    const last_updated = new Date().toISOString();

    // 5. Save/Cache in PostgreSQL for other users in this community/city
    try {
      await supabase
        .from("aqi_data")
        .insert([
          {
            location: resolvedLocation,
            aqi: aqiValue,
            pollutant_data,
            health_advisory,
            last_updated,
          },
        ]);
    } catch (saveErr) {
      console.warn("[AQI API] Warning saving AQI cache to DB:", saveErr.message);
    }

    return success("AQI data fetched live and cached for community.", {
      aqi_data: {
        location: resolvedLocation,
        aqi: aqiValue,
        pollutant_data,
        health_advisory,
        last_updated,
        source: "live"
      }
    }, 200, { headers: corsHeaders });

  } catch (error) {
    console.error("GET AQI Data Error:", error);
    // Fallback gracefully to default Delhi data if network error occurs
    return success("AQI default fallback.", {
      aqi_data: {
        location: DEFAULT_LOCATION,
        aqi: 95,
        pollutant_data: { pm2_5: 33, pm10: 55, latitude: DEFAULT_LAT, longitude: DEFAULT_LNG },
        health_advisory: getHealthAdvisory(95),
        last_updated: new Date().toISOString(),
        source: "default_fallback"
      }
    }, 200, { headers: corsHeaders });
  }
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
          location: location.trim(),
          aqi: parseInt(aqi),
          pollutant_data: pollutant_data || {},
          health_advisory: health_advisory || getHealthAdvisory(parseInt(aqi)),
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