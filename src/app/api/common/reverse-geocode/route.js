import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// GET — Reverse geocode lat & lng to Area, City, and State names
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const lat = searchParams.get("lat");
        const lng = searchParams.get("lng") || searchParams.get("lon");

        if (!lat || !lng) {
            return failure("Latitude and Longitude are required", null, 400, { headers: corsHeaders });
        }

        const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json&addressdetails=1`;

        const res = await fetch(url, {
            headers: {
                "User-Agent": "MediConnectApp/2.0 (health-diagnostic-locator)",
                "Accept": "application/json",
            },
            next: { revalidate: 3600 }, // Cache coordinates lookup for 1 hour
        });

        if (!res.ok) {
            return failure("Geocoding service unavailable", null, 502, { headers: corsHeaders });
        }

        const data = await res.json();
        const address = data?.address || {};

        const area = address.suburb ||
            address.neighbourhood ||
            address.residential ||
            address.subdistrict ||
            address.road ||
            address.village ||
            "";

        const city = address.city ||
            address.town ||
            address.county ||
            address.state_district ||
            "";

        const state = address.state || "";

        let displayName = "";
        if (area && city && area.toLowerCase() !== city.toLowerCase()) {
            displayName = `${area}, ${city}`;
        } else if (city) {
            displayName = city;
        } else if (area) {
            displayName = area;
        } else if (state) {
            displayName = state;
        } else {
            displayName = "Current Location";
        }

        return success("Location geocoded successfully", {
            area,
            city,
            state,
            displayName,
            fullAddress: data?.display_name || displayName,
        }, 200, { headers: corsHeaders });

    } catch (err) {
        console.error("Reverse geocode error:", err);
        return failure("Failed to reverse geocode location", err.message, 500, { headers: corsHeaders });
    }
}
