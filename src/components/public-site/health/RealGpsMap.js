"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { 
  MapPin, 
  Navigation, 
  Layers, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut,
} from "lucide-react";
import { getSavedPatientLocation, savePatientLocation, reverseGeocodeCoords } from "@/lib/patientLocation";

// Fallback coordinates for major Indian cities if lat/lng is missing
const CITY_COORDS = {
  "Bulandshahr, Uttar Pradesh": { lat: 28.4069, lng: 77.8498 },
  "Bulandshahr": { lat: 28.4069, lng: 77.8498 },
  "Murtzabad Bhatwara, Uttar Pradesh": { lat: 28.2798, lng: 77.9073 },
  "Murtzabad Bhatwara": { lat: 28.2798, lng: 77.9073 },
  "Delhi": { lat: 28.7041, lng: 77.1025 },
  "New Delhi, Delhi": { lat: 28.6139, lng: 77.2090 },
  "Bengaluru, Karnataka": { lat: 12.9716, lng: 77.5946 },
  "Bengaluru": { lat: 12.9716, lng: 77.5946 },
  "Mumbai, Maharashtra": { lat: 19.0760, lng: 72.8777 },
  "Mumbai": { lat: 19.0760, lng: 72.8777 },
  "Kolkata, West Bengal": { lat: 22.5726, lng: 88.3639 },
  "Kolkata": { lat: 22.5726, lng: 88.3639 },
  "Chennai, Tamil Nadu": { lat: 13.0827, lng: 80.2707 },
  "Chennai": { lat: 13.0827, lng: 80.2707 },
  "Hyderabad, Telangana": { lat: 17.3850, lng: 78.4867 },
  "Hyderabad": { lat: 17.3850, lng: 78.4867 },
  "Pune, Maharashtra": { lat: 18.5204, lng: 73.8567 },
  "Pune": { lat: 18.5204, lng: 73.8567 },
  "Jaipur, Rajasthan": { lat: 26.9124, lng: 75.7873 },
  "Ahmedabad, Gujarat": { lat: 23.0225, lng: 72.5714 },
  "Noida, Uttar Pradesh": { lat: 28.5355, lng: 77.3910 },
  "Gurugram, Haryana": { lat: 28.4595, lng: 77.0266 },
};

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

/**
 * RealGpsMap
 * Authentic geographic map powered by Google Maps with real GPS coordinates,
 * live user pin, polyline route tracking, Street/Satellite layers, and Google Maps deep link.
 */
export default function RealGpsMap({
  coords = null,
  locationName = null,
  points = [],
  distanceKm = null,
  activity = "WALK",
  isLiveTracking = false,
  height = "h-64",
  className = "",
  showControls = true,
}) {
  const mapContainerRef = useRef(null);
  const googleMapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const polylineRef = useRef(null);

  const [mapLayer, setMapLayer] = useState("streets"); // "streets" (roadmap) | "satellite" (hybrid)
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(15);
  const [resolvedCityName, setResolvedCityName] = useState(locationName || "");
  const lastReverseGeocodeRef = useRef("");

  // Determine effective coordinates
  const savedPatientLoc = typeof window !== "undefined" ? getSavedPatientLocation() : null;
  const activeCityName = (resolvedCityName && resolvedCityName !== "Delhi" && resolvedCityName !== "Current Location")
    ? resolvedCityName
    : (locationName && locationName !== "Delhi" && locationName !== "Current Location"
        ? locationName
        : (savedPatientLoc?.city && savedPatientLoc.city !== "Delhi"
            ? savedPatientLoc.city
            : (resolvedCityName || locationName || savedPatientLoc?.city || "Current Location")));
  const defaultCoord = CITY_COORDS[activeCityName] || (savedPatientLoc?.lat ? { lat: savedPatientLoc.lat, lng: savedPatientLoc.lng } : { lat: 28.7041, lng: 77.1025 });
  const effectiveLat = coords?.lat ?? (points.length > 0 ? points[points.length - 1].lat : defaultCoord.lat);
  const effectiveLng = coords?.lng ?? (points.length > 0 ? points[points.length - 1].lng : defaultCoord.lng);

  // Dynamic reverse-geocoding
  useEffect(() => {
    const hasCustomCoords = effectiveLat && effectiveLng && (Math.abs(effectiveLat - 28.7041) > 0.05 || Math.abs(effectiveLng - 77.1025) > 0.05);

    if (locationName && locationName !== "Delhi" && !hasCustomCoords) {
      setResolvedCityName(locationName);
      return;
    }
    const saved = getSavedPatientLocation();
    if (saved?.city && saved.city !== "Delhi" && (!hasCustomCoords || saved.isGps)) {
      setResolvedCityName(saved.city);
      return;
    }
    if (hasCustomCoords) {
      const coordKey = `${Number(effectiveLat).toFixed(3)}_${Number(effectiveLng).toFixed(3)}`;
      if (lastReverseGeocodeRef.current === coordKey) {
        return;
      }
      lastReverseGeocodeRef.current = coordKey;

      reverseGeocodeCoords(effectiveLat, effectiveLng).then((city) => {
        if (city && city !== "Current Location" && city !== "Delhi" && city !== saved?.city) {
          setResolvedCityName(city);
          savePatientLocation({
            city,
            lat: effectiveLat,
            lng: effectiveLng,
            isGps: true,
          });
        }
      });
    } else if (locationName) {
      setResolvedCityName(locationName);
    }
  }, [locationName, effectiveLat, effectiveLng]);

  // Synchronize on global patient location updates
  useEffect(() => {
    const onLocationUpdated = (e) => {
      if (e.detail?.city) {
        setResolvedCityName(e.detail.city);
      }
    };
    window.addEventListener("patient-location-updated", onLocationUpdated);
    return () => window.removeEventListener("patient-location-updated", onLocationUpdated);
  }, []);

  // Load Google Maps JavaScript API SDK dynamically
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.google && window.google.maps) {
      setIsGoogleReady(true);
      return;
    }

    if (!GOOGLE_API_KEY) {
      return;
    }

    const scriptId = "google-maps-js-sdk";
    let script = document.getElementById(scriptId);

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsGoogleReady(true);
      script.onerror = () => setIsGoogleReady(false);
      document.head.appendChild(script);
    } else {
      script.addEventListener("load", () => setIsGoogleReady(true));
    }
  }, []);

  // Initialize and update Google Map instance
  useEffect(() => {
    if (!isGoogleReady || !mapContainerRef.current || typeof window === "undefined" || !window.google?.maps) return;

    const maps = window.google.maps;
    const center = { lat: effectiveLat, lng: effectiveLng };

    if (!googleMapInstanceRef.current) {
      const map = new maps.Map(mapContainerRef.current, {
        center,
        zoom: zoomLevel,
        mapTypeId: mapLayer === "satellite" ? maps.MapTypeId.HYBRID : maps.MapTypeId.ROADMAP,
        disableDefaultUI: true,
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: "greedy",
      });

      googleMapInstanceRef.current = map;

      // Add User Location Marker
      const marker = new maps.Marker({
        position: center,
        map,
        title: resolvedCityName || locationName || "Live Location",
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#0067A1",
          fillOpacity: 1,
          strokeWeight: 3,
          strokeColor: "#ffffff",
        },
      });
      markerRef.current = marker;
    } else {
      const map = googleMapInstanceRef.current;
      map.setCenter(center);
      map.setZoom(zoomLevel);
      map.setMapTypeId(mapLayer === "satellite" ? maps.MapTypeId.HYBRID : maps.MapTypeId.ROADMAP);

      if (markerRef.current) {
        markerRef.current.setPosition(center);
      }
    }

    // Polyline route if points are passed
    if (points && points.length >= 2 && googleMapInstanceRef.current) {
      const path = points.map((p) => ({ lat: p.lat, lng: p.lng }));
      if (polylineRef.current) {
        polylineRef.current.setPath(path);
      } else {
        const polyline = new maps.Polyline({
          path,
          geodesic: true,
          strokeColor: "#0067A1",
          strokeOpacity: 0.9,
          strokeWeight: 4,
          map: googleMapInstanceRef.current,
        });
        polylineRef.current = polyline;
      }

      // Auto-fit bounds
      const bounds = new maps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));
      googleMapInstanceRef.current.fitBounds(bounds);
    }
  }, [isGoogleReady, effectiveLat, effectiveLng, zoomLevel, mapLayer, points, resolvedCityName, locationName]);

  // Handle Layer Toggle
  const toggleLayer = useCallback((layer) => {
    setMapLayer(layer);
    if (googleMapInstanceRef.current && window.google?.maps) {
      const type = layer === "satellite" ? window.google.maps.MapTypeId.HYBRID : window.google.maps.MapTypeId.ROADMAP;
      googleMapInstanceRef.current.setMapTypeId(type);
    }
  }, []);

  // Zoom and Recenter handlers
  const handleZoomIn = useCallback(() => {
    const next = Math.min(zoomLevel + 1, 19);
    setZoomLevel(next);
    if (googleMapInstanceRef.current) {
      googleMapInstanceRef.current.setZoom(next);
    }
  }, [zoomLevel]);

  const handleZoomOut = useCallback(() => {
    const next = Math.max(zoomLevel - 1, 6);
    setZoomLevel(next);
    if (googleMapInstanceRef.current) {
      googleMapInstanceRef.current.setZoom(next);
    }
  }, [zoomLevel]);

  const handleRecenter = useCallback(() => {
    setZoomLevel(15);
    if (googleMapInstanceRef.current) {
      googleMapInstanceRef.current.setCenter({ lat: effectiveLat, lng: effectiveLng });
      googleMapInstanceRef.current.setZoom(15);
    }
  }, [effectiveLat, effectiveLng]);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${effectiveLat},${effectiveLng}`;
  const embedIframeUrl = GOOGLE_API_KEY
    ? `https://www.google.com/maps/embed/v1/view?key=${GOOGLE_API_KEY}&center=${effectiveLat},${effectiveLng}&zoom=${zoomLevel}&maptype=${mapLayer === "satellite" ? "satellite" : "roadmap"}`
    : `https://maps.google.com/maps?q=${effectiveLat},${effectiveLng}&z=${zoomLevel}&t=${mapLayer === "satellite" ? "k" : "m"}&output=embed`;

  return (
    <div className={`relative rounded-[5px] overflow-hidden border border-slate-200 bg-white shadow-xs ${className}`}>
      {/* Map Control Header Bar */}
      <div className="bg-white/95 backdrop-blur-xs border-b border-slate-200 px-3 py-2 text-xs flex flex-col gap-1.5 z-20 relative">
        {/* Line 1: Location & Layer Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <MapPin className="w-3.5 h-3.5 text-[#0067A1] shrink-0" />
            <span className="font-bold text-slate-900 truncate text-[11px] sm:text-xs">
              {resolvedCityName || locationName || "Live Location"}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Street / Satellite Toggle */}
            <div className="inline-flex rounded-[4px] border border-slate-200 bg-slate-50 p-0.5 text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => toggleLayer("streets")}
                className={`px-1.5 py-0.5 rounded-[3px] transition-colors cursor-pointer ${
                  mapLayer === "streets" ? "bg-white text-slate-950 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Street
              </button>
              <button
                type="button"
                onClick={() => toggleLayer("satellite")}
                className={`px-1.5 py-0.5 rounded-[3px] transition-colors cursor-pointer ${
                  mapLayer === "satellite" ? "bg-white text-slate-950 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Satellite
              </button>
            </div>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-slate-500 hover:text-[#0067A1] hover:bg-slate-100 rounded-[4px] transition-colors border border-slate-200 shrink-0"
              title="Open in Google Maps"
            >
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
          </div>
        </div>

        {/* Line 2: GPS Telemetry & Tracked Distance */}
        <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-slate-100">
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-[9px] text-slate-400 font-medium shrink-0">GPS:</span>
            <span className="inline-flex items-center text-[9px] sm:text-[9.5px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-[3px] border border-slate-200 truncate">
              {effectiveLat.toFixed(4)}°N, {effectiveLng.toFixed(4)}°E
            </span>
            {isLiveTracking && (
              <span className="text-[8.5px] font-semibold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200 shrink-0">
                LIVE
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {distanceKm ? (
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-slate-400 font-medium hidden sm:inline">Tracked:</span>
                <span className="text-[9.5px] sm:text-[10px] font-bold font-mono text-[#0067A1] bg-sky-50 px-1.5 py-0.5 rounded-[3px] border border-sky-200">
                  {distanceKm}
                </span>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 text-[9px] text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded-[3px] border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                Google Maps
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Map Body: Google Maps Interactive Container with Instant Google Embed Fallback */}
      <div className={`relative w-full ${height} bg-slate-100 z-10`}>
        {/* Google Maps JS SDK Container */}
        <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: "160px" }} />

        {/* Instant Google Maps Iframe if JS SDK is initializing or offline */}
        {!isGoogleReady && (
          <iframe
            title={`Google Map of ${resolvedCityName || locationName || "Location"}`}
            src={embedIframeUrl}
            className="absolute inset-0 w-full h-full border-0 pointer-events-auto"
            loading="lazy"
            allowFullScreen
          />
        )}

        {/* Floating In-Map Interactive Controls */}
        {showControls && (
          <div className="absolute right-3 top-3 z-[10] flex flex-col gap-1 bg-white/95 backdrop-blur-xs rounded-[5px] shadow-md border border-slate-200 p-1">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-[3px] transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-[3px] transition-colors cursor-pointer border-t border-slate-100"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRecenter}
              className="p-1.5 text-slate-700 hover:text-[#0067A1] hover:bg-slate-100 rounded-[3px] transition-colors cursor-pointer border-t border-slate-100"
              title="Recenter to GPS Location"
            >
              <Navigation className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Floating Bottom Badge */}
        <div className="absolute bottom-2 left-2 z-[10] bg-slate-900/85 backdrop-blur-xs text-white px-2 py-1 rounded-[4px] text-[10px] font-medium flex items-center gap-1.5 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Google Maps Telemetry • {activity} Mode</span>
        </div>
      </div>
    </div>
  );
}
