"use client";

import React from "react";
import RealGpsMap from "../RealGpsMap";

/**
 * AnimatedRouteTracker
 * Wraps RealGpsMap to provide authentic, real geographic map telemetry (Google Maps)
 * across LungConnect Hub, LungMoveModal, WalkingTestModal, and Activity Detail screens.
 */
export default function AnimatedRouteTracker({
  className = "w-full h-44",
  distanceKm = "4.1 km",
  isTracking = true,
  activity = "Walk",
  coords = null,
  locationName = "Bulandshahr, Uttar Pradesh",
  points = [],
  showControls = true,
}) {
  return (
    <RealGpsMap
      className={className}
      distanceKm={distanceKm}
      isLiveTracking={isTracking}
      activity={activity}
      coords={coords}
      locationName={locationName}
      points={points}
      showControls={showControls}
    />
  );
}
