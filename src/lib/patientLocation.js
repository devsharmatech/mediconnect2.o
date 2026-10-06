/**
 * patientLocation.js — Unified Persistent Patient Location Management
 * 
 * Provides a single shared source of truth for the patient's current location
 * across all client screens (LungConnect Hub, Move session, Walking test,
 * Assessment, Dashboard).
 * 
 * Prevents unwanted reverts to "Delhi" once the user sets or detects their location.
 */

export const PATIENT_LOCATION_KEY = "mediconnect_patient_location";

/**
 * Get the currently saved patient location from localStorage
 * @returns {{ city: string, lat: number, lng: number, aqi?: number, isGps?: boolean, updatedAt: string } | null}
 */
export function getSavedPatientLocation() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PATIENT_LOCATION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.city || parsed.lat)) {
        // Automatically sanitize legacy "Kartavya Path" glitch
        if (parsed.city && (parsed.city.toLowerCase().includes("kartavya") || parsed.city.toLowerCase().includes("rajpath"))) {
          parsed.city = "Delhi";
          try {
            localStorage.setItem(PATIENT_LOCATION_KEY, JSON.stringify(parsed));
          } catch (_) {}
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to parse patient location from localStorage:", e);
  }
  return null;
}

/**
 * Save and broadcast a new patient location across the entire app
 * @param {Object} data - Location data to persist
 * @returns {Object} Updated location object
 */
export function savePatientLocation(data) {
  if (typeof window === "undefined" || !data) return null;
  try {
    const existing = getSavedPatientLocation() || {};
    
    // Normalize city / location name
    let resolvedCity = data.city || data.locationName || data.name || data.aqi_location || existing.city;
    if (resolvedCity && (resolvedCity.toLowerCase().includes("kartavya") || resolvedCity.toLowerCase().includes("rajpath"))) {
      resolvedCity = "Delhi";
    }

    const resolvedLat = data.lat !== undefined ? Number(data.lat) : (data.latitude !== undefined ? Number(data.latitude) : existing.lat);
    const resolvedLng = data.lng !== undefined ? Number(data.lng) : (data.longitude !== undefined ? Number(data.longitude) : existing.lng);
    const resolvedAqi = data.aqi !== undefined ? data.aqi : existing.aqi;
    const resolvedIsGps = data.isGps ?? existing.isGps ?? false;

    const resolvedIsManual = data.isManual !== undefined ? Boolean(data.isManual) : (existing.isManual && !data.isGps);

    // If incoming city is default "Delhi" or "Current Location" but existing is a specific real city, keep existing.
    // Also: If the user previously MANUALLY picked a location (isManual: true), background GPS or auto-IP
    // MUST NOT overwrite it unless the user explicitly forces it (forceReset: true or isManual: true).
    let finalCity = resolvedCity;
    const isGenericDefault = !finalCity || finalCity === "Delhi" || finalCity === "Current Location" || finalCity.toLowerCase().includes("kartavya");
    const hasSpecificExisting = existing.city && existing.city !== "Delhi" && existing.city !== "Current Location" && !existing.city.toLowerCase().includes("kartavya");

    if (existing.isManual && !data.isManual && !data.forceReset && existing.city) {
      finalCity = existing.city;
    } else if (isGenericDefault && hasSpecificExisting && !data.forceReset) {
      finalCity = existing.city;
    }

    if (!finalCity && !resolvedLat) return existing;

    const updated = {
      city: finalCity || "Current Location",
      lat: resolvedLat || 28.7041,
      lng: resolvedLng || 77.1025,
      aqi: resolvedAqi,
      isGps: resolvedIsGps,
      isManual: resolvedIsManual,
      updatedAt: new Date().toISOString(),
    };

    const isSameCity = existing.city === updated.city;
    const isSameLat = Math.abs((Number(existing.lat) || 0) - (Number(updated.lat) || 0)) < 0.0005;
    const isSameLng = Math.abs((Number(existing.lng) || 0) - (Number(updated.lng) || 0)) < 0.0005;
    const isSameAqi = existing.aqi === updated.aqi;
    const hasMeaningfulChange = !isSameCity || !isSameLat || !isSameLng || !isSameAqi || Boolean(data.forceReset);

    localStorage.setItem(PATIENT_LOCATION_KEY, JSON.stringify(updated));

    // Dispatch global event only if something changed and not silenced to prevent ping-pong loops
    if (!data.silent && hasMeaningfulChange) {
      window.dispatchEvent(new CustomEvent("patient-location-updated", { detail: updated }));
    }
    return updated;
  } catch (e) {
    console.warn("Failed to save patient location to localStorage:", e);
    return null;
  }
}

/**
 * Reverse geocode latitude and longitude to a human-readable city/district name
 * @param {number} lat 
 * @param {number} lng 
 * @returns {Promise<string>}
 */
export async function reverseGeocodeCoords(lat, lng) {
  if (!lat || !lng) return "Current Location";
  
  // 1. Primary: Google Maps Geocoding API
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (googleApiKey) {
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleApiKey}&language=en`,
        { signal: ctrl.signal }
      );
      clearTimeout(tid);
      if (res.ok) {
        const json = await res.json();
        if (json.status === "OK" && json.results && json.results.length > 0) {
          const best = json.results[0];
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

          let specificArea = sublocality || locality;
          let cityName = locality || district || sublocality || "";
          if (
            cityName.toLowerCase().includes("kartavya") ||
            cityName.toLowerCase().includes("rajpath")
          ) {
            cityName = "Delhi";
          } else if (specificArea && !specificArea.toLowerCase().includes("kartavya") && !specificArea.toLowerCase().includes("rajpath")) {
            cityName = specificArea;
          }

          if (cityName) {
            return state && state !== cityName ? `${cityName}, ${state}` : cityName;
          }
          if (best.formatted_address) {
            return best.formatted_address.split(",").slice(0, 2).join(",").trim();
          }
        }
      }
    } catch (gErr) {
      console.warn("[PatientLocation] Google reverse geocode warning:", gErr.message);
    }
  }

  // 2. Secondary: BigDataCloud client API (CORS-friendly fallback)
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 3500);
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      { signal: ctrl.signal }
    );
    clearTimeout(tid);
    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.locality || data.principalSubdivision;
      const state = data.principalSubdivision;
      if (city) {
        return state && state !== city ? `${city}, ${state}` : city;
      }
    }
  } catch (e) {
    // proceed to fallback
  }

  // 2. OpenStreetMap / Nominatim fallback
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 3500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
      { signal: ctrl.signal, headers: { "Accept": "application/json" } }
    );
    clearTimeout(tid);
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || addr.state_district;
      const state = addr.state;
      if (city) {
        return state && state !== city ? `${city}, ${state}` : city;
      }
    }
  } catch (e) {
    // proceed to default
  }

  return "Current Location";
}
