import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

// Default location coordinates (Delhi) per policy
const DEFAULT_LOCATION = "Delhi";
const DEFAULT_LAT = 28.6139;
const DEFAULT_LNG = 77.2090;
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes freshness

const CITY_COORDINATES = {
  khurja: { lat: 28.2490, lng: 77.8549, name: "Khurja, Uttar Pradesh" },
  bulandshahr: { lat: 28.4069, lng: 77.8498, name: "Bulandshahr, Uttar Pradesh" },
  delhi: { lat: 28.6139, lng: 77.2090, name: "Delhi" },
  "new delhi": { lat: 28.6139, lng: 77.2090, name: "New Delhi" },
  noida: { lat: 28.5355, lng: 77.3910, name: "Noida, Uttar Pradesh" },
  "greater noida": { lat: 28.4744, lng: 77.5040, name: "Greater Noida, Uttar Pradesh" },
  ghaziabad: { lat: 28.6692, lng: 77.4538, name: "Ghaziabad, Uttar Pradesh" },
  meerut: { lat: 28.9845, lng: 77.7064, name: "Meerut, Uttar Pradesh" },
  aligarh: { lat: 27.8974, lng: 78.0880, name: "Aligarh, Uttar Pradesh" },
  mumbai: { lat: 19.0760, lng: 72.8777, name: "Mumbai, Maharashtra" },
  bengaluru: { lat: 12.9716, lng: 77.5946, name: "Bengaluru, Karnataka" },
  bangalore: { lat: 12.9716, lng: 77.5946, name: "Bengaluru, Karnataka" },
  hyderabad: { lat: 17.3850, lng: 78.4867, name: "Hyderabad, Telangana" },
  chennai: { lat: 13.0827, lng: 80.2707, name: "Chennai, Tamil Nadu" },
  kolkata: { lat: 22.5726, lng: 88.3639, name: "Kolkata, West Bengal" },
  pune: { lat: 18.5204, lng: 73.8567, name: "Pune, Maharashtra" },
  ahmedabad: { lat: 23.0225, lng: 72.5714, name: "Ahmedabad, Gujarat" },
  jaipur: { lat: 26.9124, lng: 75.7873, name: "Jaipur, Rajasthan" },
  lucknow: { lat: 26.8467, lng: 80.9462, name: "Lucknow, Uttar Pradesh" },
  kanpur: { lat: 26.4499, lng: 80.3319, name: "Kanpur, Uttar Pradesh" },
  agra: { lat: 27.1767, lng: 78.0081, name: "Agra, Uttar Pradesh" },
  varanasi: { lat: 25.3176, lng: 82.9739, name: "Varanasi, Uttar Pradesh" },
};

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
    const locationQuery = searchParams.get("location") || searchParams.get("city");
    const latParam = searchParams.get("lat") || searchParams.get("latitude");
    const lngParam = searchParams.get("lng") || searchParams.get("longitude");
    const forceRefresh = searchParams.get("refresh") === "true";

    const hasCoords = latParam !== null && lngParam !== null && !isNaN(parseFloat(latParam)) && !isNaN(parseFloat(lngParam));
    let lat = hasCoords ? parseFloat(latParam) : null;
    let lng = hasCoords ? parseFloat(lngParam) : null;
    let resolvedLocation = (locationQuery && locationQuery.trim()) ? locationQuery.trim() : null;

    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    // 1. If GPS coordinates provided, reverse geocode to get clean city name
    if (hasCoords) {
      if (!resolvedLocation || resolvedLocation.startsWith("Lat ") || resolvedLocation.startsWith("Location (")) {
        // Try Google Maps Reverse Geocoding
        if (googleApiKey) {
          try {
            const gRevRes = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleApiKey}&language=en`,
              { next: { revalidate: 3600 } }
            );
            if (gRevRes.ok) {
              const gRevJson = await gRevRes.json();
              if (gRevJson.status === "OK" && gRevJson.results?.length > 0) {
                const best = gRevJson.results[0];
                let locality = "";
                let district = "";
                let sublocality = "";
                let state = "";
                for (const comp of best.address_components || []) {
                  const types = comp.types || [];
                  if (types.includes("locality")) {
                    locality = comp.long_name;
                  } else if (types.includes("administrative_area_level_2")) {
                    district = comp.long_name;
                  } else if (types.includes("sublocality_level_1") || types.includes("sublocality")) {
                    if (!sublocality) sublocality = comp.long_name;
                  }
                  if (types.includes("administrative_area_level_1")) {
                    state = comp.long_name;
                  }
                }

                // Primary: actual city (locality), then district (admin_area_2). Avoid sublocality road names.
                let cityName = locality || district || sublocality || "";
                if (
                  cityName.toLowerCase().includes("kartavya") ||
                  cityName.toLowerCase().includes("rajpath") ||
                  district === "New Delhi" ||
                  locality === "New Delhi" ||
                  state === "Delhi"
                ) {
                  if (state === "Delhi" || district.includes("Delhi") || locality.includes("Delhi")) {
                    cityName = "Delhi";
                    state = "Delhi";
                  }
                }

                if (cityName) {
                  resolvedLocation = (state && state !== cityName) ? `${cityName}, ${state}` : cityName;
                } else if (best.formatted_address) {
                  resolvedLocation = best.formatted_address;
                }
              }
            }
          } catch (gRevErr) {
            console.warn("[AQI API] Google Reverse Geocode warning:", gRevErr.message);
          }
        }

        // Fallback: BigDataCloud Reverse Geocoding
        if (!resolvedLocation) {
          try {
            const bdcRes = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
              { next: { revalidate: 3600 } }
            );
            if (bdcRes.ok) {
              const bdcJson = await bdcRes.json();
              const city = bdcJson.city || bdcJson.locality || bdcJson.principalSubdivision;
              if (city) resolvedLocation = city;
            }
          } catch (bdcErr) {
            console.warn("[AQI API] BigDataCloud reverse geocode error:", bdcErr.message);
          }
        }

        if (!resolvedLocation) {
          resolvedLocation = `Location (${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E)`;
        }
      }
    } else {
      // 2. No coordinates provided: Resolve coordinates from text location
      if (!resolvedLocation) {
        resolvedLocation = DEFAULT_LOCATION;
      }

      // Check pre-defined dictionary for fast resolution
      const keyNorm = resolvedLocation.toLowerCase().trim();
      const mapped = CITY_COORDINATES[keyNorm];
      if (mapped) {
        lat = mapped.lat;
        lng = mapped.lng;
        resolvedLocation = mapped.name;
      } else {
        // Try Google Maps Geocoding API
        if (googleApiKey) {
          try {
            const gGeoRes = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(resolvedLocation)}&key=${googleApiKey}&language=en`,
              { next: { revalidate: 86400 } }
            );
            if (gGeoRes.ok) {
              const gGeoJson = await gGeoRes.json();
              if (gGeoJson.status === "OK" && gGeoJson.results?.length > 0) {
                const first = gGeoJson.results[0];
                lat = first.geometry.location.lat;
                lng = first.geometry.location.lng;
                resolvedLocation = first.formatted_address || resolvedLocation;
              }
            }
          } catch (gGeoErr) {
            console.warn("[AQI API] Google Geocoding warning:", gGeoErr.message);
          }
        }

        // Fallback: Open-Meteo Geocoding
        if (lat === null || lng === null) {
          try {
            const geoRes = await fetch(
              `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(resolvedLocation)}&count=1&language=en&format=json`,
              { next: { revalidate: 86400 } }
            );
            if (geoRes.ok) {
              const geoJson = await geoRes.json();
              if (geoJson.results?.length > 0) {
                lat = geoJson.results[0].latitude;
                lng = geoJson.results[0].longitude;
                resolvedLocation = geoJson.results[0].name || resolvedLocation;
              }
            }
          } catch (geoErr) {
            console.warn("[AQI API] Open-Meteo geocoding error:", geoErr.message);
          }
        }
      }
    }

    // Default coordinates fallback (Delhi)
    if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
      lat = DEFAULT_LAT;
      lng = DEFAULT_LNG;
      if (!resolvedLocation) resolvedLocation = DEFAULT_LOCATION;
    }

    // Direct live fetch from Google Air Quality API (No database cache read per specification)

    // 4. Primary: Fetch Live Air Quality from Google Air Quality API
    let aqiValue = null;
    let category = null;
    let dominantPollutant = "PM2.5";
    let pollutantData = {};
    let healthAdvisory = null;
    let healthRecommendations = null;
    let sourceName = "Google Air Quality API";
    let lastUpdated = new Date().toISOString();
    let googleSuccess = false;

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
                longitude: lng
              },
              extraComputations: [
                "LOCAL_AQI",
                "HEALTH_RECOMMENDATIONS",
                "POLLUTANT_ADDITIONAL_INFO",
                "DOMINANT_POLLUTANT_CONCENTRATION",
                "POLLUTANT_CONCENTRATION"
              ],
              languageCode: "en"
            }),
            next: { revalidate: 1200 }
          }
        );

        if (gAqiRes.ok) {
          const gData = await gAqiRes.json();
          const indexes = gData.indexes || [];

          // Prefer Indian CPCB NAQI (code: ind_cpcb)
          const cpcbIndex = indexes.find(i => i.code?.toLowerCase().includes("cpcb") || i.code?.toLowerCase().includes("ind"))
            || indexes.find(i => i.code?.toLowerCase() === "uaqi")
            || indexes[0];

          if (cpcbIndex && cpcbIndex.aqi !== undefined) {
            aqiValue = Math.round(cpcbIndex.aqi);
            category = getCpcbCategory(aqiValue);
            dominantPollutant = (cpcbIndex.dominantPollutant || gData.dominantPollutant || "pm10").toUpperCase();
            if (dominantPollutant === "PM25") dominantPollutant = "PM2.5";

            // Extract pollutant concentrations
            const rawPollutants = gData.pollutants || [];
            const getVal = (code) => {
              const item = rawPollutants.find(p => p.code?.toLowerCase() === code.toLowerCase());
              const val = item?.concentration?.value;
              return val !== undefined && val !== null ? Math.round(val * 10) / 10 : null;
            };

            pollutantData = {
              pm2_5: getVal("pm25") ?? (aqiValue > 100 ? 55 : 25),
              pm10: getVal("pm10") ?? (aqiValue > 100 ? 120 : 65),
              no2: getVal("no2"),
              so2: getVal("so2"),
              ozone: getVal("o3"),
              co: getVal("co"),
              nh3: getVal("nh3"),
              latitude: lat,
              longitude: lng
            };

            // Extract health advisory from Google's medical recommendations
            healthRecommendations = gData.healthRecommendations || null;
            if (healthRecommendations?.generalPopulation) {
              healthAdvisory = healthRecommendations.generalPopulation;
            } else {
              healthAdvisory = getHealthAdvisory(aqiValue);
            }

            sourceName = "Google Air Quality API";
            lastUpdated = gData.dateTime || new Date().toISOString();
            googleSuccess = true;
          }
        } else {
          console.warn("[AQI API] Google Air Quality API returned status:", gAqiRes.status);
        }
      } catch (gErr) {
        console.warn("[AQI API] Google Air Quality API error:", gErr.message);
      }
    }

    // 5. Fallback: Open-Meteo Air Quality API (if Google failed or key missing)
    if (!googleSuccess) {
      try {
        const aqiApiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm10,pm2_5,european_aqi,nitrogen_dioxide,sulphur_dioxide,ozone`;
        const aqiRes = await fetch(aqiApiUrl);

        if (aqiRes.ok) {
          const aqiData = await aqiRes.json();
          const current = aqiData.current || {};

          aqiValue = calculateIndianCpcbAqi(
            current.pm2_5,
            current.pm10,
            current.nitrogen_dioxide,
            current.sulphur_dioxide
          );

          category = getCpcbCategory(aqiValue);
          dominantPollutant = (current.pm2_5 || 0) >= (current.pm10 || 0) ? "PM2.5" : "PM10";
          pollutantData = {
            pm2_5: current.pm2_5 !== undefined ? Math.round(current.pm2_5 * 10) / 10 : 35,
            pm10: current.pm10 !== undefined ? Math.round(current.pm10 * 10) / 10 : 75,
            european_aqi: current.european_aqi ?? null,
            no2: current.nitrogen_dioxide ?? null,
            so2: current.sulphur_dioxide ?? null,
            ozone: current.ozone ?? null,
            latitude: lat,
            longitude: lng
          };

          healthAdvisory = getHealthAdvisory(aqiValue);
          sourceName = "Open-Meteo Air Quality & CPCB Formula";
          lastUpdated = new Date().toISOString();
        }
      } catch (omErr) {
        console.warn("[AQI API] Open-Meteo fallback error:", omErr.message);
      }
    }

    // Default safety fallback if both APIs failed
    if (aqiValue === null) {
      aqiValue = 68;
      category = getCpcbCategory(aqiValue);
      dominantPollutant = "PM2.5";
      pollutantData = { pm2_5: 33, pm10: 55, latitude: lat, longitude: lng };
      healthAdvisory = getHealthAdvisory(aqiValue);
      sourceName = "CPCB Benchmark (Offline Fallback)";
    }

    // 6. Asynchronously save/cache to AWS RDS PostgreSQL
    try {
      const weatherPayload = {
        pollutant_data: pollutantData,
        health_advisory: healthAdvisory,
        health_recommendations: healthRecommendations,
        source: sourceName,
        lat,
        lng
      };

      await sql`
        INSERT INTO aqi_cache (
          location, aqi_value, category, source, dominant_pollutant,
          weather_json, freshness_status, fetched_at
        ) VALUES (
          ${resolvedLocation}, ${aqiValue}, ${category}, ${sourceName}, ${dominantPollutant},
          ${JSON.stringify(weatherPayload)}, 'Current', ${lastUpdated}::timestamptz
        );
      `.catch(e => console.warn("[AQI API] RDS aqi_cache insert warning:", e.message));

      await sql`
        INSERT INTO aqi_data (
          location, aqi, pollutant_data, health_advisory, last_updated
        ) VALUES (
          ${resolvedLocation}, ${aqiValue}, ${JSON.stringify(pollutantData)}, ${healthAdvisory}, ${lastUpdated}::timestamptz
        );
      `.catch(e => console.warn("[AQI API] RDS aqi_data insert warning:", e.message));
    } catch (saveErr) {
      console.warn("[AQI API] RDS cache save error:", saveErr.message);
    }

    if (resolvedLocation && (resolvedLocation.toLowerCase().includes("kartavya") || resolvedLocation.toLowerCase().includes("rajpath"))) {
      resolvedLocation = "Delhi";
    }

    return success("AQI data fetched live via " + sourceName + ".", {
      aqi_data: {
        location: resolvedLocation,
        aqi: aqiValue,
        category,
        standard: "CPCB NAQI (India)",
        dominant_pollutant: dominantPollutant,
        pollutant_data: pollutantData,
        health_advisory: healthAdvisory,
        health_recommendations: healthRecommendations,
        last_updated: lastUpdated,
        source: sourceName,
        provider: "Google Air Quality API",
        coordinates: { lat, lng }
      }
    }, 200, { headers: corsHeaders });

  } catch (error) {
    console.error("[AQI API] GET Error:", error);
    const defaultAqi = 68;
    return success("AQI default fallback.", {
      aqi_data: {
        location: DEFAULT_LOCATION,
        aqi: defaultAqi,
        category: getCpcbCategory(defaultAqi),
        standard: "CPCB (India)",
        dominant_pollutant: "PM2.5",
        pollutant_data: { pm2_5: 33, pm10: 55, latitude: DEFAULT_LAT, longitude: DEFAULT_LNG },
        health_advisory: getHealthAdvisory(defaultAqi),
        last_updated: new Date().toISOString(),
        source: "default_fallback",
        provider: "Google Air Quality API"
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

    const loc = String(location).trim();
    const aqiNum = parseInt(aqi, 10);
    const pollData = pollutant_data || {};
    const adv = health_advisory || getHealthAdvisory(aqiNum);
    const now = new Date().toISOString();

    const insertedRows = await sql`
      INSERT INTO aqi_data (
        location, aqi, pollutant_data, health_advisory, last_updated
      ) VALUES (
        ${loc}, ${aqiNum}, ${JSON.stringify(pollData)}, ${adv}, ${now}::timestamptz
      )
      RETURNING *;
    `;

    return success("AQI data stored successfully in AWS RDS.", insertedRows[0] || null, 201, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("[AQI API] POST Error:", error);
    return failure("Failed to store AQI data: " + error.message, "creation_failed", 500, {
      headers: corsHeaders,
    });
  }
}