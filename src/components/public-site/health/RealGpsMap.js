"use client";

import React, { useEffect, useRef, useState } from "react";
import { 
  MapPin, 
  Navigation, 
  Layers, 
  ExternalLink, 
  Maximize2, 
  Compass, 
  Activity, 
  ZoomIn, 
  ZoomOut,
  RefreshCw
} from "lucide-react";

// Fallback coordinates for major Indian cities if lat/lng is missing
const CITY_COORDS = {
  "Bulandshahr, Uttar Pradesh": { lat: 28.4069, lng: 77.8498 },
  "Bulandshahr": { lat: 28.4069, lng: 77.8498 },
  "Delhi": { lat: 28.6139, lng: 77.2090 },
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

import { getSavedPatientLocation, reverseGeocodeCoords } from "@/lib/patientLocation";

/**
 * RealGpsMap
 * A real, authentic geographic map powered by OpenStreetMap & Leaflet with real GPS coordinates,
 * live user pin, real polyline path tracking, layer switching, and Google Maps deep link.
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
  const leafletMapRef = useRef(null);
  const polylineRef = useRef(null);
  const markerRef = useRef(null);
  const [mapLayer, setMapLayer] = useState("streets"); // "streets" | "satellite" | "topo"
  const [isLeafletReady, setIsLeafletReady] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(15);
  const [resolvedCityName, setResolvedCityName] = useState(locationName || "");
  const lastReverseGeocodeRef = useRef("");

  // Determine effective coordinates: explicitly passed coords -> saved patient coords -> city lookup -> default
  const savedPatientLoc = typeof window !== "undefined" ? getSavedPatientLocation() : null;
  const activeCityName = (resolvedCityName && resolvedCityName !== "Delhi" && resolvedCityName !== "Current Location")
    ? resolvedCityName
    : (locationName && locationName !== "Delhi" && locationName !== "Current Location"
        ? locationName
        : (savedPatientLoc?.city && savedPatientLoc.city !== "Delhi"
            ? savedPatientLoc.city
            : (resolvedCityName || locationName || savedPatientLoc?.city || "Current Location")));
  const defaultCoord = CITY_COORDS[activeCityName] || (savedPatientLoc?.lat ? { lat: savedPatientLoc.lat, lng: savedPatientLoc.lng } : { lat: 28.6139, lng: 77.2090 });
  const effectiveLat = coords?.lat ?? (points.length > 0 ? points[points.length - 1].lat : defaultCoord.lat);
  const effectiveLng = coords?.lng ?? (points.length > 0 ? points[points.length - 1].lng : defaultCoord.lng);

  // Dynamic reverse-geocoding if coordinates are provided but location name is missing, generic, or Delhi
  useEffect(() => {
    const hasCustomCoords = effectiveLat && effectiveLng && (Math.abs(effectiveLat - 28.6139) > 0.05 || Math.abs(effectiveLng - 77.2090) > 0.05);

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

  // Load Leaflet CSS and JS dynamically on the client
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.crossOrigin = "";
      document.head.appendChild(link);
    }

    if (window.L) {
      setIsLeafletReady(true);
      return;
    }

    if (!document.getElementById("leaflet-js")) {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.crossOrigin = "";
      script.onload = () => setIsLeafletReady(true);
      script.onerror = () => setIsLeafletReady(false);
      document.head.appendChild(script);
    } else {
      const existing = document.getElementById("leaflet-js");
      existing.addEventListener("load", () => setIsLeafletReady(true));
    }
  }, []);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!isLeafletReady || !mapContainerRef.current || typeof window === "undefined" || !window.L) return;

    const L = window.L;

    // Tile Layer URLs
    const tileLayers = {
      streets: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      topo: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    };

    const tileAttributions = {
      streets: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      satellite: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
      topo: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)',
    };

    // Initialize map instance if not already initialized
    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [effectiveLat, effectiveLng],
        zoom: zoomLevel,
        zoomControl: false, // Custom controls
        attributionControl: false,
      });

      // Add default tile layer
      const activeTile = L.tileLayer(tileLayers[mapLayer], {
        maxZoom: 19,
        attribution: tileAttributions[mapLayer],
      }).addTo(map);

      leafletMapRef.current = map;
      leafletMapRef.current._activeTile = activeTile;

      // Custom Pulsing User Location Beacon Marker
      const customIcon = L.divIcon({
        className: "custom-gps-pin",
        html: `
          <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(2, 132, 199, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 14px; height: 14px; border-radius: 50%; background: #0067A1; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([effectiveLat, effectiveLng], { icon: customIcon }).addTo(map);
      marker.bindPopup(`<b>${locationName}</b><br><span style="font-size: 11px; color: #64748b;">Live GPS Location: ${effectiveLat.toFixed(4)}°, ${effectiveLng.toFixed(4)}°</span>`);
      markerRef.current = marker;
    } else {
      // Recenter existing map
      const map = leafletMapRef.current;
      map.setView([effectiveLat, effectiveLng], zoomLevel, { animate: true });

      if (markerRef.current) {
        markerRef.current.setLatLng([effectiveLat, effectiveLng]);
      }
    }

    // Update Tile Layer if changed
    if (leafletMapRef.current && leafletMapRef.current._activeTile) {
      leafletMapRef.current.removeLayer(leafletMapRef.current._activeTile);
      const newTile = L.tileLayer(tileLayers[mapLayer], {
        maxZoom: 19,
        attribution: tileAttributions[mapLayer],
      }).addTo(leafletMapRef.current);
      leafletMapRef.current._activeTile = newTile;
    }

    // Draw Real GPS Route Polyline if points exist
    if (points && points.length >= 2 && leafletMapRef.current) {
      const latLngs = points.map((pt) => [pt.lat, pt.lng]);

      if (polylineRef.current) {
        polylineRef.current.setLatLngs(latLngs);
      } else {
        const polyline = L.polyline(latLngs, {
          color: "#0067A1",
          weight: 5,
          opacity: 0.9,
          lineJoin: "round",
          lineCap: "round",
        }).addTo(leafletMapRef.current);
        polylineRef.current = polyline;
      }

      // Auto-fit bounds of tracked points
      try {
        leafletMapRef.current.fitBounds(polylineRef.current.getBounds(), {
          padding: [25, 25],
          maxZoom: 17,
        });
      } catch (_) {}
    }

    // Cleanup on unmount
    return () => {
      // Map instance is kept until unmount
    };
  }, [isLeafletReady, effectiveLat, effectiveLng, mapLayer, points]);

  // Clean destruction on unmount
  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Zoom helpers
  const handleZoomIn = () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.zoomIn();
      setZoomLevel(leafletMapRef.current.getZoom());
    }
  };

  const handleZoomOut = () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.zoomOut();
      setZoomLevel(leafletMapRef.current.getZoom());
    }
  };

  const handleRecenter = () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([effectiveLat, effectiveLng], 15, { animate: true });
      if (markerRef.current) {
        markerRef.current.openPopup();
      }
    }
  };

  // Open Google Maps external link
  const googleMapsUrl = `https://www.google.com/maps?q=${effectiveLat},${effectiveLng}`;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${effectiveLat}&mlon=${effectiveLng}#map=16/${effectiveLat}/${effectiveLng}`;

  // Clean display of city and state
  const [primaryCityName, subRegionName] = (activeCityName || "Current Location").split(",").map(s => s.trim());

  return (
    <div className={`relative overflow-hidden rounded-[5px] border border-slate-200 bg-slate-100 shadow-xs flex flex-col ${className}`}>
      {/* Top Telemetry Header Bar - Double-Line Clean Responsive Layout */}
      <div className="px-3 py-1.5 bg-white/95 backdrop-blur-xs border-b border-slate-200 flex flex-col gap-1 shrink-0 z-20">
        {/* Line 1: Location & Map Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <MapPin className="w-3.5 h-3.5 text-[#0067A1] shrink-0" />
            <span className="text-[11px] sm:text-xs font-bold text-slate-900 truncate">
              {primaryCityName}
            </span>
            {subRegionName && (
              <span className="text-[10px] text-slate-500 font-normal truncate">
                ({subRegionName})
              </span>
            )}
          </div>

          {/* Layer Selector & External Maps Link */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <div className="flex items-center rounded-[4px] border border-slate-200 p-0.5 bg-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setMapLayer("streets")}
                className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-[3px] transition-colors cursor-pointer ${
                  mapLayer === "streets" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
                title="Street View"
              >
                Street
              </button>
              <button
                type="button"
                onClick={() => setMapLayer("satellite")}
                className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-[3px] transition-colors cursor-pointer ${
                  mapLayer === "satellite" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
                title="Satellite Aerial View"
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
              <span className="text-[9px] text-slate-400 font-medium">Leaflet OSM</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Map Body: Leaflet Interactive Container with Iframe Fallback */}
      <div className={`relative w-full ${height} bg-slate-200 z-10`}>
        {/* Leaflet Dynamic Container */}
        <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: "160px" }} />

        {/* Fallback OpenStreetMap Embed if script is loading or offline */}
        {!isLeafletReady && (
          <iframe
            title={`Real Map of ${locationName}`}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${effectiveLng - 0.015}%2C${effectiveLat - 0.01}%2C${effectiveLng + 0.015}%2C${effectiveLat + 0.01}&layer=mapnik&marker=${effectiveLat}%2C${effectiveLng}`}
            className="absolute inset-0 w-full h-full border-0 pointer-events-auto"
            loading="lazy"
          />
        )}

        {/* Floating In-Map Interactive Controls */}
        {showControls && (
          <div className="absolute right-3 top-3 z-[400] flex flex-col gap-1 bg-white/95 backdrop-blur-xs rounded-[5px] shadow-md border border-slate-200 p-1">
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
        <div className="absolute bottom-2 left-2 z-[400] bg-slate-900/80 backdrop-blur-xs text-white px-2 py-1 rounded-[4px] text-[10px] font-medium flex items-center gap-1.5 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Real OpenStreetMap Telemetry • {activity} Mode</span>
        </div>
      </div>
    </div>
  );
}
