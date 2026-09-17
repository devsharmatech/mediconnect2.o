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

/**
 * Computes official Indian National Air Quality Index (CPCB NAQI)
 * based on standard breakpoints from Central Pollution Control Board (India).
 */
function calculateIndianCpcbAqi(pm25, pm10, no2 = null, so2 = null) {
  const subIndices = [];

  // 1. PM2.5 (µg/m³) - CPCB Breakpoints: [0-30: 0-50, 31-60: 51-100, 61-90: 101-200, 91-120: 201-300, 121-250: 301-400, 250+: 401-500]
  if (pm25 !== null && pm25 !== undefined && !isNaN(pm25)) {
    const val = parseFloat(pm25);
    let sub = 0;
    if (val <= 30) {
      sub = (val / 30) * 50;
    } else if (val <= 60) {
      sub = 50 + ((val - 30) / 30) * 50;
    } else if (val <= 90) {
      sub = 100 + ((val - 60) / 30) * 100;
    } else if (val <= 120) {
      sub = 200 + ((val - 90) / 30) * 100;
    } else if (val <= 250) {
      sub = 300 + ((val - 120) / 130) * 100;
    } else {
      sub = 400 + Math.min(100, ((val - 250) / 130) * 100);
    }
    subIndices.push(Math.round(sub));
  }

  // 2. PM10 (µg/m³) - CPCB Breakpoints: [0-50: 0-50, 51-100: 51-100, 101-250: 101-200, 251-350: 201-300, 351-430: 301-400, 430+: 401-500]
  if (pm10 !== null && pm10 !== undefined && !isNaN(pm10)) {
    const val = parseFloat(pm10);
    let sub = 0;
    if (val <= 50) {
      sub = (val / 50) * 50;
    } else if (val <= 100) {
      sub = 50 + ((val - 50) / 50) * 50;
    } else if (val <= 250) {
      sub = 100 + ((val - 100) / 150) * 100;
    } else if (val <= 350) {
      sub = 200 + ((val - 250) / 100) * 100;
    } else if (val <= 430) {
      sub = 300 + ((val - 350) / 80) * 100;
    } else {
      sub = 400 + Math.min(100, ((val - 430) / 70) * 100);
    }
    subIndices.push(Math.round(sub));
  }

  // 3. NO2 (µg/m³)
  if (no2 !== null && no2 !== undefined && !isNaN(no2)) {
    const val = parseFloat(no2);
    let sub = 0;
    if (val <= 40) sub = (val / 40) * 50;
    else if (val <= 80) sub = 50 + ((val - 40) / 40) * 50;
    else if (val <= 180) sub = 100 + ((val - 80) / 100) * 100;
    else if (val <= 280) sub = 200 + ((val - 180) / 100) * 100;
    else if (val <= 400) sub = 300 + ((val - 280) / 120) * 100;
    else sub = 400 + Math.min(100, ((val - 400) / 100) * 100);
    subIndices.push(Math.round(sub));
  }

  // 4. SO2 (µg/m³)
  if (so2 !== null && so2 !== undefined && !isNaN(so2)) {
    const val = parseFloat(so2);
    let sub = 0;
    if (val <= 40) sub = (val / 40) * 50;
    else if (val <= 80) sub = 50 + ((val - 40) / 40) * 50;
    else if (val <= 380) sub = 100 + ((val - 80) / 300) * 100;
    else if (val <= 800) sub = 200 + ((val - 380) / 420) * 100;
    else if (val <= 1600) sub = 300 + ((val - 800) / 800) * 100;
    else sub = 400 + Math.min(100, ((val - 1600) / 800) * 100);
    subIndices.push(Math.round(sub));
  }

  if (subIndices.length === 0) return 75;
  return Math.min(500, Math.max(...subIndices));
}

function getCpcbCategory(aqi) {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Satisfactory";
  if (aqi <= 200) return "Moderate";
  if (aqi <= 300) return "Poor";
  if (aqi <= 400) return "Very Poor";
  return "Severe";
}

function getHealthAdvisory(aqi) {
  if (aqi <= 50) return "Good: Minimal health impact. Air quality is clean and ideal for outdoor movement.";
  if (aqi <= 100) return "Satisfactory: Minor breathing discomfort may occur in sensitive individuals. Suitable for routine outdoor activity.";
  if (aqi <= 200) return "Moderate: May cause breathing discomfort to people with asthma, respiratory illness, or cardiac conditions.";
  if (aqi <= 300) return "Poor: May cause breathing discomfort on prolonged outdoor exposure. Sensitive individuals should stay indoors.";
  if (aqi <= 400) return "Very Poor: High particulate concentration. Respiratory illness risk on prolonged exposure. Minimize outdoor exertion.";
  return "Severe: Extreme air pollution warning. Stay indoors with windows closed. Avoid all strenuous exertion.";
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const locationQuery = searchParams.get("location");
    const latParam = searchParams.get("lat") || searchParams.get("latitude");
    const lngParam = searchParams.get("lng") || searchParams.get("longitude");

    const hasCoords = latParam !== null && lngParam !== null && !isNaN(parseFloat(latParam)) && !isNaN(parseFloat(lngParam));
    let lat = hasCoords ? parseFloat(latParam) : null;
    let lng = hasCoords ? parseFloat(lngParam) : null;
    let resolvedLocation = (locationQuery && locationQuery.trim()) ? locationQuery.trim() : null;

    // 1. If GPS coordinates provided but no text location, reverse geocode to get city name
    if (hasCoords && !resolvedLocation) {
      try {
        // Attempt 1: Nominatim (OpenStreetMap) with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const osmRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`,
          {
            headers: { 'User-Agent': 'MediConnect-Health-Platform/2.0' },
            signal: controller.signal
          }
        );
        clearTimeout(timeoutId);

        if (osmRes.ok) {
          const osmData = await osmRes.json();
          const addr = osmData.address || {};
          const detectedCity = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || addr.state_district || addr.state;
          if (detectedCity) {
            resolvedLocation = detectedCity;
          }
        }
      } catch (osmErr) {
        console.warn("[AQI API] Nominatim lookup error/timeout:", osmErr.message);
      }

      // Attempt 2: Fallback to BigDataCloud reverse geocode if Nominatim didn't resolve
      if (!resolvedLocation) {
        try {
          const bdcController = new AbortController();
          const bdcTimeout = setTimeout(() => bdcController.abort(), 3000);
          const revRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
            { signal: bdcController.signal }
          );
          clearTimeout(bdcTimeout);
          if (revRes.ok) {
            const revData = await revRes.json();
            const city = revData.city || revData.locality || revData.principalSubdivision;
            if (city) resolvedLocation = city;
          }
        } catch (revErr) {
          console.warn("[AQI API] Fallback reverse geocoding error:", revErr.message);
        }
      }

      // Fallback if still unassigned
      if (!resolvedLocation) {
        resolvedLocation = `Lat ${lat.toFixed(2)}, Lng ${lng.toFixed(2)}`;
      }
    }

    // 2. If no coordinates were provided, resolve them from locationQuery or use default
    if (!hasCoords) {
      if (!resolvedLocation) {
        resolvedLocation = DEFAULT_LOCATION;
      }

      // Check DB Cache for text location search
      const cacheCutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();
      try {
        const { data: cachedRows } = await supabase
          .from("aqi_data")
          .select("*")
          .gte("last_updated", cacheCutoff)
          .ilike("location", `%${resolvedLocation}%`)
          .order("last_updated", { ascending: false })
          .limit(1);

        if (cachedRows && cachedRows.length > 0) {
          const cached = cachedRows[0];
          // Recalculate accurately to Indian CPCB standard if pollutants exist in cache
          let aqiVal = cached.aqi;
          if (cached.pollutant_data && (cached.pollutant_data.pm2_5 !== undefined || cached.pollutant_data.pm10 !== undefined)) {
            aqiVal = calculateIndianCpcbAqi(
              cached.pollutant_data.pm2_5,
              cached.pollutant_data.pm10,
              cached.pollutant_data.no2,
              cached.pollutant_data.so2
            );
          }
          const category = getCpcbCategory(aqiVal);
          return success("AQI data retrieved from community cache.", {
            aqi_data: {
              location: cached.location,
              aqi: aqiVal,
              category,
              standard: "CPCB (India)",
              pollutant_data: cached.pollutant_data || {},
              health_advisory: getHealthAdvisory(aqiVal),
              last_updated: cached.last_updated,
              source: "cache"
            }
          }, 200, { headers: corsHeaders });
        }
      } catch (cacheErr) {
        console.warn("[AQI API] Cache lookup error:", cacheErr.message);
      }

      // Geocode the location name to coordinates via Open-Meteo Geocoding
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

    // Final coordinates fallback to Delhi if resolution failed
    if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
      lat = DEFAULT_LAT;
      lng = DEFAULT_LNG;
      if (!resolvedLocation) resolvedLocation = DEFAULT_LOCATION;
    }

    // 3. Fetch Live Air Quality from Open-Meteo Air Quality API
    const aqiApiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm10,pm2_5,european_aqi,nitrogen_dioxide,sulphur_dioxide,ozone`;
    const aqiRes = await fetch(aqiApiUrl);

    if (!aqiRes.ok) {
      throw new Error(`Open-Meteo API returned status: ${aqiRes.status}`);
    }

    const aqiData = await aqiRes.json();
    const current = aqiData.current || {};
    
    // Calculate official Indian CPCB NAQI standard from pollutants
    const aqiValue = calculateIndianCpcbAqi(
      current.pm2_5,
      current.pm10,
      current.nitrogen_dioxide,
      current.sulphur_dioxide
    );

    const category = getCpcbCategory(aqiValue);

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

    // 4. Save/Cache in PostgreSQL for other users in this community/city
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
        category,
        standard: "CPCB (India)",
        pollutant_data,
        health_advisory,
        last_updated,
        source: hasCoords ? "gps_live" : "live"
      }
    }, 200, { headers: corsHeaders });

  } catch (error) {
    console.error("GET AQI Data Error:", error);
    const defaultAqi = 68;
    return success("AQI default fallback.", {
      aqi_data: {
        location: DEFAULT_LOCATION,
        aqi: defaultAqi,
        category: getCpcbCategory(defaultAqi),
        standard: "CPCB (India)",
        pollutant_data: { pm2_5: 33, pm10: 55, latitude: DEFAULT_LAT, longitude: DEFAULT_LNG },
        health_advisory: getHealthAdvisory(defaultAqi),
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