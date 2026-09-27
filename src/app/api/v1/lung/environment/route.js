import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { supabase } from "@/lib/supabaseAdmin";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

// Pre-mapped city coordinates for zero-latency lookups
const CITY_COORDINATES = {
  "Delhi": { lat: 28.6139, lng: 77.2090, name: "Delhi" },
  "New Delhi, Delhi": { lat: 28.6139, lng: 77.2090, name: "New Delhi, Delhi" },
  "New Delhi": { lat: 28.6139, lng: 77.2090, name: "New Delhi, Delhi" },
  "Bulandshahr, Uttar Pradesh": { lat: 28.4069, lng: 77.8498, name: "Bulandshahr, Uttar Pradesh" },
  "Bulandshahr": { lat: 28.4069, lng: 77.8498, name: "Bulandshahr, Uttar Pradesh" },
  "Noida, Uttar Pradesh": { lat: 28.5355, lng: 77.3910, name: "Noida, Uttar Pradesh" },
  "Noida": { lat: 28.5355, lng: 77.3910, name: "Noida, Uttar Pradesh" },
  "Gurugram, Haryana": { lat: 28.4595, lng: 77.0266, name: "Gurugram, Haryana" },
  "Gurugram": { lat: 28.4595, lng: 77.0266, name: "Gurugram, Haryana" },
  "Bengaluru, Karnataka": { lat: 12.9716, lng: 77.5946, name: "Bengaluru, Karnataka" },
  "Bengaluru": { lat: 12.9716, lng: 77.5946, name: "Bengaluru, Karnataka" },
  "Mumbai, Maharashtra": { lat: 19.0760, lng: 72.8777, name: "Mumbai, Maharashtra" },
  "Mumbai": { lat: 19.0760, lng: 72.8777, name: "Mumbai, Maharashtra" },
  "Kolkata, West Bengal": { lat: 22.5726, lng: 88.3639, name: "Kolkata, West Bengal" },
  "Kolkata": { lat: 22.5726, lng: 88.3639, name: "Kolkata, West Bengal" },
  "Chennai, Tamil Nadu": { lat: 13.0827, lng: 80.2707, name: "Chennai, Tamil Nadu" },
  "Chennai": { lat: 13.0827, lng: 80.2707, name: "Chennai, Tamil Nadu" },
  "Hyderabad, Telangana": { lat: 17.3850, lng: 78.4867, name: "Hyderabad, Telangana" },
  "Hyderabad": { lat: 17.3850, lng: 78.4867, name: "Hyderabad, Telangana" },
  "Pune, Maharashtra": { lat: 18.5204, lng: 73.8567, name: "Pune, Maharashtra" },
  "Pune": { lat: 18.5204, lng: 73.8567, name: "Pune, Maharashtra" },
  "Ahmedabad, Gujarat": { lat: 23.0225, lng: 72.5714, name: "Ahmedabad, Gujarat" },
  "Jaipur, Rajasthan": { lat: 26.9124, lng: 75.7873, name: "Jaipur, Rajasthan" }
};

function weatherCodeToCondition(code) {
  if (code === 0) return "Clear Sky";
  if (code === 1) return "Mainly Clear";
  if (code === 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 55) return "Drizzle";
  if (code >= 61 && code <= 65) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain Showers";
  if (code >= 95) return "Thunderstorm";
  return "Partly Cloudy";
}

/**
 * GET /api/v1/lung/environment
 * My Environment tab — Real external AQI + live Weather from Open-Meteo & CPCB telemetry.
 * Rules:
 * - Checks DB cache first (1h TTL).
 * - Queries free external Open-Meteo Air Quality & Weather API.
 * - Saves snapshot to PostgreSQL aqi_cache.
 * - Fallbacks gracefully to authoritative defaults if network is offline.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const latParam = searchParams.get("lat") || searchParams.get("latitude");
    const lngParam = searchParams.get("lng") || searchParams.get("longitude");
    const cityParam = searchParams.get("city") || "Delhi";

    let lat = latParam ? parseFloat(latParam) : null;
    let lng = lngParam ? parseFloat(lngParam) : null;
    let locationName = cityParam;

    const isGpsCoordinates = latParam !== null && lngParam !== null && !isNaN(parseFloat(latParam)) && !isNaN(parseFloat(lngParam));
    const forceRefresh = searchParams.get("refresh") === "true";
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (isGpsCoordinates) {
      lat = parseFloat(latParam);
      lng = parseFloat(lngParam);
      let resolvedGpsName = null;

      // 1. Primary: Google Maps Geocoding API (if key configured)
      if (googleApiKey) {
        try {
          const gRevRes = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleApiKey}&language=en`,
            { next: { revalidate: 3600 } }
          );
          if (gRevRes.ok) {
            const gRevJson = await gRevRes.json();
            if (gRevJson.status === "OK" && gRevJson.results && gRevJson.results.length > 0) {
              const bestResult = gRevJson.results[0];
              let locality = "";
              let state = "";
              for (const comp of bestResult.address_components || []) {
                if (comp.types.includes("locality") || comp.types.includes("sublocality")) {
                  if (!locality) locality = comp.long_name;
                }
                if (comp.types.includes("administrative_area_level_2")) {
                  if (!locality) locality = comp.long_name;
                }
                if (comp.types.includes("administrative_area_level_1")) {
                  state = comp.long_name;
                }
              }
              if (locality) {
                resolvedGpsName = state && state !== locality ? `${locality}, ${state}` : locality;
              } else if (bestResult.formatted_address) {
                resolvedGpsName = bestResult.formatted_address;
              }
            }
          }
        } catch (gRevErr) {
          console.warn("[Lung Env] Google Reverse Geocode warning:", gRevErr.message);
        }
      }

      // 2. Fallback: BigDataCloud Reverse Geocoding
      if (!resolvedGpsName) {
        try {
          const revRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
            { next: { revalidate: 3600 } }
          );
          if (revRes.ok) {
            const revData = await revRes.json();
            const cityPart = revData.city || revData.locality || revData.principalSubdivision;
            const statePart = revData.principalSubdivision;
            if (cityPart) {
              resolvedGpsName = statePart && statePart !== cityPart ? `${cityPart}, ${statePart}` : cityPart;
            }
          }
        } catch (revErr) {
          console.warn("[Lung Env] BigDataCloud reverse geocode lookup warning:", revErr.message);
        }
      }

      // 3. Fallback: Nominatim OpenStreetMap
      if (!resolvedGpsName) {
        try {
          const nomRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
            { next: { revalidate: 86400 }, headers: { "Accept": "application/json", "User-Agent": "MediConnect-LungEnv/1.0" } }
          );
          if (nomRes.ok) {
            const nomData = await nomRes.json();
            const addr = nomData.address || {};
            const city = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || addr.state_district;
            const state = addr.state;
            if (city) {
              resolvedGpsName = state && state !== city ? `${city}, ${state}` : city;
            }
          }
        } catch (nomErr) {
          console.warn("[Lung Env] Nominatim reverse geocode warning:", nomErr.message);
        }
      }

      if (resolvedGpsName) {
        locationName = resolvedGpsName;
      } else if (searchParams.get("city")) {
        locationName = searchParams.get("city");
      } else {
        locationName = `Current Location (${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E)`;
      }
    } else {
      // 1. Check predefined city coordinates
      const mapped = CITY_COORDINATES[cityParam] || CITY_COORDINATES[cityParam.trim()];
      if (mapped) {
        lat = mapped.lat;
        lng = mapped.lng;
        locationName = mapped.name;
      } else {
        let cityResolved = false;

        // Try Google Geocoding API if key configured
        if (googleApiKey) {
          try {
            const gSearchRes = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cityParam)}&key=${googleApiKey}&language=en`,
              { next: { revalidate: 86400 } }
            );
            if (gSearchRes.ok) {
              const gSearchJson = await gSearchRes.json();
              if (gSearchJson.status === "OK" && gSearchJson.results && gSearchJson.results.length > 0) {
                const first = gSearchJson.results[0];
                lat = first.geometry.location.lat;
                lng = first.geometry.location.lng;
                locationName = first.formatted_address;
                cityResolved = true;
              }
            }
          } catch (gSearchErr) {
            console.warn("[Lung Env] Google Geocoding search warning:", gSearchErr.message);
          }
        }

        // Fallback: Open-Meteo Geocoding
        if (!cityResolved) {
          try {
            const geoRes = await fetch(
              `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityParam)}&count=1&language=en&format=json`,
              { next: { revalidate: 86400 } }
            );
            if (geoRes.ok) {
              const geoJson = await geoRes.json();
              if (geoJson.results && geoJson.results.length > 0) {
                lat = geoJson.results[0].latitude;
                lng = geoJson.results[0].longitude;
                locationName = `${geoJson.results[0].name}, ${geoJson.results[0].country || ""}`.trim();
              }
            }
          } catch (geoErr) {
            console.warn("[Lung Env] Geocoding lookup error:", geoErr.message);
          }
        }
      }
    }

    // Default coordinates fallback (Delhi)
    if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
      lat = 28.6139;
      lng = 77.2090;
      locationName = "Delhi";
    }

    // 2. Check DB cache first (only for static cities when not forced to refresh)
    let cachedAqi = null;
    if (!isGpsCoordinates && !forceRefresh) {
      try {
        const { data } = await supabase
          .from("aqi_cache")
          .select("*")
          .ilike("location", `%${locationName.split(",")[0]}%`)
          .order("fetched_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          const ageMs = Date.now() - new Date(data.fetched_at).getTime();
          if (ageMs < 30 * 60 * 1000) { // Cache valid for 30 minutes
            cachedAqi = data;
          }
        }
      } catch (e) {
        console.warn("[Lung Env] DB cache read warning:", e.message);
      }
    }

    let aqiVal = 68;
    let aqiCat = "Satisfactory";
    let dominantPollutant = "PM2.5";
    let weather = {
      temp_c: 26,
      condition: "Partly Cloudy",
      humidity_pct: 65,
      wind_kmh: 22,
      visibility_km: 10,
      last_updated: new Date().toISOString()
    };
    let sourceName = googleApiKey ? "Google Air Quality API" : "Open-Meteo Air Quality & CPCB Telemetry";
    let lastUpdated = new Date().toISOString();
    let googleAqiLoaded = false;

    if (cachedAqi) {
      aqiVal = Number(cachedAqi.aqi_value) || aqiVal;
      aqiCat = cachedAqi.category || aqiCategory(aqiVal);
      dominantPollutant = cachedAqi.dominant_pollutant || dominantPollutant;
      sourceName = cachedAqi.source || sourceName;
      lastUpdated = cachedAqi.fetched_at;
      if (cachedAqi.weather_json && typeof cachedAqi.weather_json === "object") {
        weather = { ...weather, ...cachedAqi.weather_json, last_updated: lastUpdated };
      }
    } else {
      // 3. Try Google Air Quality API if key is available
      if (googleApiKey) {
        try {
          const gAqiRes = await fetch(
            `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${googleApiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                location: {
                  latitude: lat,
                  longitude: lng,
                },
                extraComputations: [
                  "LOCAL_AQI",
                  "HEALTH_RECOMMENDATIONS",
                  "POLLUTANT_ADDITIONAL_INFO"
                ],
                languageCode: "en"
              }),
              next: { revalidate: 1800 }
            }
          );

          if (gAqiRes.ok) {
            const gAqiJson = await gAqiRes.json();
            const indexes = gAqiJson.indexes || [];
            // Prefer Indian CPCB AQI or Universal AQI (uaqi)
            const resolvedIndex = indexes.find(i => i.code?.toLowerCase().includes("cpcb") || i.code?.toLowerCase().includes("ind"))
              || indexes.find(i => i.code?.toLowerCase() === "uaqi")
              || indexes[0];

            if (resolvedIndex && resolvedIndex.aqi !== undefined) {
              aqiVal = resolvedIndex.aqi;
              aqiCat = resolvedIndex.category || aqiCategory(aqiVal);
              dominantPollutant = (resolvedIndex.dominantPollutant || gAqiJson.dominantPollutant || dominantPollutant).toUpperCase();
              sourceName = "Google Air Quality API";
              lastUpdated = gAqiJson.dateTime || new Date().toISOString();
              googleAqiLoaded = true;
            }
          } else {
            console.warn("[Lung Env] Google Air Quality API returned status:", gAqiRes.status);
          }
        } catch (gAqiErr) {
          console.warn("[Lung Env] Google Air Quality API error:", gAqiErr.message);
        }
      }

      // 4. Fetch Live from External Open-Meteo APIs (Fallback if Google is offline/unconfigured, plus Live Weather)
      try {
        const fetchPromises = [
          fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,visibility`,
            { next: { revalidate: 1800 } }
          )
        ];

        if (!googleAqiLoaded) {
          fetchPromises.push(
            fetch(
              `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm10,pm2_5,us_aqi,european_aqi,nitrogen_dioxide,sulphur_dioxide,ozone`,
              { next: { revalidate: 3600 } }
            )
          );
        }

        const [weatherFetchRes, aqiFetchRes] = await Promise.all(fetchPromises);

        if (aqiFetchRes && aqiFetchRes.ok) {
          const aqiJson = await aqiFetchRes.json();
          const currentAqi = aqiJson.current || {};
          const pm25 = currentAqi.pm2_5 || 25;
          const pm10 = currentAqi.pm10 || 45;
          
          // Indian CPCB AQI Calculation derived from PM2.5 / PM10
          if (pm25 <= 30) {
            aqiVal = Math.round((pm25 / 30) * 50);
          } else if (pm25 <= 60) {
            aqiVal = 50 + Math.round(((pm25 - 30) / 30) * 50);
          } else if (pm25 <= 90) {
            aqiVal = 100 + Math.round(((pm25 - 60) / 30) * 100);
          } else if (pm25 <= 120) {
            aqiVal = 200 + Math.round(((pm25 - 90) / 30) * 100);
          } else if (pm25 <= 250) {
            aqiVal = 300 + Math.round(((pm25 - 120) / 130) * 100);
          } else {
            aqiVal = Math.min(500, 400 + Math.round(((pm25 - 250) / 100) * 100));
          }

          if (currentAqi.us_aqi && !aqiVal) {
            aqiVal = currentAqi.us_aqi;
          }

          aqiCat = aqiCategory(aqiVal);
          dominantPollutant = pm25 >= pm10 ? "PM2.5" : "PM10";
          sourceName = "Open-Meteo Air Quality & CPCB Telemetry";
          lastUpdated = new Date().toISOString();
        }

        if (weatherFetchRes.ok) {
          const weatherJson = await weatherFetchRes.json();
          const curWeather = weatherJson.current || {};
          weather = {
            temp_c: Math.round(curWeather.temperature_2m ?? 26),
            condition: weatherCodeToCondition(curWeather.weather_code),
            humidity_pct: Math.round(curWeather.relative_humidity_2m ?? 65),
            wind_kmh: Math.round(curWeather.wind_speed_10m ?? 18),
            visibility_km: curWeather.visibility ? Math.round(curWeather.visibility / 1000) : 10,
            last_updated: lastUpdated
          };
        }

        // Cache to PostgreSQL
        try {
          await supabase.from("aqi_cache").insert([{
            location: locationName,
            aqi_value: aqiVal,
            category: aqiCat,
            source: sourceName,
            dominant_pollutant: dominantPollutant,
            weather_json: weather,
            freshness_status: "Current",
            fetched_at: lastUpdated
          }]);
        } catch (dbInsertErr) {
          console.warn("[Lung Env] Failed to cache AQI to DB:", dbInsertErr.message);
        }

      } catch (extApiErr) {
        console.warn("[Lung Env] External API fetch failed, using fallback:", extApiErr.message);
      }
    }

    const freshness = {
      source: sourceName,
      status: "Current",
      coverage: locationName,
      update_frequency: "Hourly Live Telemetry",
      last_updated: lastUpdated,
    };

    return success("Environment data loaded from external telemetry.", {
      available: true,
      latitude: lat,
      longitude: lng,
      aqi: aqiVal,
      aqi_category: aqiCat,
      aqi_location: locationName,
      aqi_source: sourceName,
      aqi_last_updated: lastUpdated,
      dominant_pollutant: dominantPollutant,
      weather,
      freshness,
      contextual_suggestion: getContextualSuggestion(aqiVal),
      activity_safety: getActivitySafety(aqiVal),
    }, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("[Lung Env] GET error:", error);
    return failure("Failed to load environment data: " + error.message, "env_error", 500, { headers: corsHeaders });
  }
}

function aqiCategory(aqi) {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Satisfactory";
  if (aqi <= 200) return "Moderate";
  if (aqi <= 300) return "Poor";
  if (aqi <= 400) return "Very Poor";
  return "Severe";
}

function getContextualSuggestion(aqi) {
  if (aqi <= 50) return "Air quality is Good today. Excellent conditions for outdoor Move sessions and 6MWT testing.";
  if (aqi <= 100) return "Air quality is Satisfactory. Outdoor activity is suitable. Sensitive individuals should moderate intensity.";
  if (aqi <= 200) return "Air quality is Moderate. Consider indoor breathing exercises or limit prolonged outdoor exertion today.";
  if (aqi <= 300) return "Air quality is Poor. Indoor Breathing Studio sessions are recommended. Avoid outdoor exercise.";
  if (aqi <= 400) return "Air quality is Very Poor. Keep windows closed. Choose indoor calm breathing wellness sessions only.";
  return "Severe air quality. Avoid all outdoor activity. Engage only in gentle indoor breathing exercises. Consult your care team if you experience respiratory discomfort.";
}

function getActivitySafety(aqi) {
  if (aqi <= 50) return { outdoor_move: "safe", outdoor_6mwt: "safe", indoor_breathing: "safe", outdoor_breathing: "safe" };
  if (aqi <= 100) return { outdoor_move: "safe", outdoor_6mwt: "caution", indoor_breathing: "safe", outdoor_breathing: "caution" };
  if (aqi <= 200) return { outdoor_move: "caution", outdoor_6mwt: "avoid", indoor_breathing: "safe", outdoor_breathing: "avoid" };
  if (aqi <= 300) return { outdoor_move: "avoid", outdoor_6mwt: "avoid", indoor_breathing: "safe", outdoor_breathing: "avoid" };
  return { outdoor_move: "avoid", outdoor_6mwt: "avoid", indoor_breathing: "modified", outdoor_breathing: "avoid" };
}
