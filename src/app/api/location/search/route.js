import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Google Places API (New) & Geocoding endpoint
 * Handles:
 * 1. Place Autocomplete: /api/location/search?query=<query>
 * 2. Place Details:     /api/location/search?place_id=<place_id>
 * 3. Direct Geocode:     /api/location/search?geocode=<address>
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || searchParams.get("q");
    const placeId = searchParams.get("place_id") || searchParams.get("placeId");
    const geocodeQuery = searchParams.get("geocode") || searchParams.get("address");

    const apiKey =
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Google API key is not configured" },
        { status: 500 }
      );
    }

    // 1. Resolve Place Details by place_id
    if (placeId && placeId !== "undefined" && placeId !== "null") {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 6000);
      try {
        const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(
          placeId
        )}?fields=id,displayName,formattedAddress,location&key=${apiKey}`;
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(tid);

        if (!res.ok) {
          const errText = await res.text();
          console.error("[Google Places Details Error]", res.status, errText);
          return NextResponse.json(
            { success: false, error: `Google Places API returned ${res.status}` },
            { status: res.status }
          );
        }

        const data = await res.json();
        return NextResponse.json({
          success: true,
          data: {
            placeId: data.id,
            place_id: data.id,
            name: data.displayName?.text || data.formattedAddress?.split(",")[0] || "",
            formattedAddress: data.formattedAddress || "",
            formatted_address: data.formattedAddress || "",
            latitude: data.location?.latitude || null,
            longitude: data.location?.longitude || null,
          },
        });
      } catch (err) {
        clearTimeout(tid);
        return NextResponse.json(
          { success: false, error: err.message || "Failed to fetch place details" },
          { status: 500 }
        );
      }
    }

    // 2. Direct Geocode fallback by freeform address text
    if (geocodeQuery) {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 6000);
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          geocodeQuery
        )}&key=${apiKey}`;
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(tid);

        if (!res.ok) {
          return NextResponse.json(
            { success: false, error: `Google Geocoding returned ${res.status}` },
            { status: res.status }
          );
        }

        const data = await res.json();
        if (data.status === "OK" && data.results && data.results.length > 0) {
          const first = data.results[0];
          return NextResponse.json({
            success: true,
            data: {
              placeId: first.place_id,
              name: first.formatted_address.split(",")[0].trim(),
              formattedAddress: first.formatted_address,
              latitude: first.geometry?.location?.lat,
              longitude: first.geometry?.location?.lng,
            },
          });
        }

        return NextResponse.json({
          success: false,
          error: data.error_message || data.status || "Location not found",
        });
      } catch (err) {
        clearTimeout(tid);
        return NextResponse.json(
          { success: false, error: err.message || "Geocoding request failed" },
          { status: 500 }
        );
      }
    }

    // 3. Autocomplete Suggestions by user input text
    if (query && query.trim().length > 0) {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 5000);
      try {
        const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
          },
          body: JSON.stringify({
            input: query.trim(),
            languageCode: "en",
          }),
          signal: ctrl.signal,
        });
        clearTimeout(tid);

        if (!res.ok) {
          const errText = await res.text();
          console.error("[Google Places Autocomplete Error]", res.status, errText);
          return NextResponse.json(
            { success: false, error: `Google Places Autocomplete returned ${res.status}` },
            { status: res.status }
          );
        }

        const data = await res.json();
        const suggestions = (data.suggestions || [])
          .map((item) => {
            const pred = item.placePrediction;
            if (!pred) return null;
            return {
              placeId: pred.placeId,
              place_id: pred.placeId,
              text: pred.text?.text || "",
              description: pred.text?.text || "",
              name: pred.structuredFormat?.mainText?.text || pred.text?.text || "",
              main_text: pred.structuredFormat?.mainText?.text || pred.text?.text || "",
              secondaryText: pred.structuredFormat?.secondaryText?.text || "",
              secondary_text: pred.structuredFormat?.secondaryText?.text || "",
              types: pred.types || [],
            };
          })
          .filter(Boolean);

        return NextResponse.json({
          success: true,
          suggestions,
        });
      } catch (err) {
        clearTimeout(tid);
        return NextResponse.json(
          { success: false, error: err.message || "Failed to search places" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      suggestions: [],
    });
  } catch (error) {
    console.error("[Location Search API Exception]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
