"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  MapPin, 
  Clock, 
  Droplets, 
  Wind, 
  Eye 
} from "lucide-react";
import { 
  WiThunderstorm, 
  WiRain, 
  WiDayShowers, 
  WiDayCloudy, 
  WiCloudy, 
  WiDaySunny, 
  WiSnow, 
  WiFog 
} from "react-icons/wi";

/**
 * AnimatedWeatherScene
 * Compact, responsive environmental weather card matching B07 (ui11.png).
 * Balanced typography, official vector weather icons from react-icons/wi, and clean telemetry stats.
 */
export default function AnimatedWeatherScene({
  temperature = 25,
  condition = "Rain Showers",
  humidity = 89,
  windSpeed = 19,
  visibility = 2,
  location = "Bulandshahr, Uttar Pradesh",
  lastUpdated = "Today, 11:46 AM",
  className = "",
}) {
  // Select professional weather icon and styling based on real condition
  const condLower = (condition || "").toLowerCase();

  let WeatherIcon = WiDayCloudy;
  let iconColor = "text-sky-100";
  let skyGradient = "from-sky-600 via-blue-600 to-indigo-700";
  let badgeBg = "bg-white/15 border-white/25 text-white";

  if (condLower.includes("thunder") || condLower.includes("storm") || condLower.includes("lightning")) {
    WeatherIcon = WiThunderstorm;
    iconColor = "text-amber-300";
    skyGradient = "from-slate-900 via-indigo-950 to-blue-950";
    badgeBg = "bg-amber-400/25 border-amber-300/40 text-amber-100";
  } else if (condLower.includes("rain") || condLower.includes("shower")) {
    WeatherIcon = WiRain;
    iconColor = "text-sky-200";
    skyGradient = "from-blue-800 via-sky-900 to-indigo-950";
    badgeBg = "bg-sky-400/25 border-sky-300/40 text-sky-100";
  } else if (condLower.includes("drizzle")) {
    WeatherIcon = WiDayShowers;
    iconColor = "text-sky-200";
    skyGradient = "from-sky-700 via-blue-800 to-indigo-900";
    badgeBg = "bg-sky-400/25 border-sky-300/40 text-sky-100";
  } else if (condLower.includes("clear") || condLower.includes("sun")) {
    WeatherIcon = WiDaySunny;
    iconColor = "text-amber-300";
    skyGradient = "from-sky-500 via-blue-600 to-indigo-600";
    badgeBg = "bg-amber-400/25 border-amber-300/40 text-amber-100";
  } else if (condLower.includes("overcast") || condLower.includes("cloud")) {
    WeatherIcon = WiCloudy;
    iconColor = "text-slate-100";
    skyGradient = "from-slate-700 via-slate-800 to-indigo-900";
    badgeBg = "bg-white/15 border-white/25 text-white";
  } else if (condLower.includes("fog") || condLower.includes("mist") || condLower.includes("haze")) {
    WeatherIcon = WiFog;
    iconColor = "text-slate-200";
    skyGradient = "from-slate-600 via-zinc-700 to-slate-800";
    badgeBg = "bg-white/15 border-white/25 text-white";
  } else if (condLower.includes("snow")) {
    WeatherIcon = WiSnow;
    iconColor = "text-cyan-100";
    skyGradient = "from-blue-900 via-indigo-900 to-slate-900";
    badgeBg = "bg-cyan-400/25 border-cyan-300/40 text-cyan-100";
  }

  return (
    <div className={`rounded-[6px] overflow-hidden border border-slate-200 bg-white shadow-xs flex flex-col justify-between ${className}`}>
      {/* Sky Weather Banner */}
      <div className={`relative bg-gradient-to-br ${skyGradient} p-3.5 sm:p-4 text-white overflow-hidden transition-colors duration-500`}>
        {/* Ambient Glow */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header Row */}
        <div className="relative z-10 flex items-center justify-between gap-2 mb-1.5">
          <div className="min-w-0 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-sky-200 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-white truncate">
              {location}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono font-medium text-white/90 bg-black/20 px-2 py-0.5 rounded-[4px] border border-white/10 shrink-0">
            <Clock className="w-2.5 h-2.5 text-sky-200" />
            <span>{lastUpdated}</span>
          </div>
        </div>

        {/* Center Row: Temperature & Weather Icon */}
        <div className="relative z-10 flex items-center justify-between gap-3 my-1.5">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-white">
                {temperature}
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-sky-200">°C</span>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-[4px] border ${badgeBg}`}>
                {condition}
              </span>
            </div>
          </div>

          {/* Official Library Weather Icon with Gentle Floating Animation */}
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="flex items-center justify-center p-1.5 rounded-[6px] bg-white/10 border border-white/20 shadow-xs shrink-0"
          >
            <WeatherIcon className={`w-14 h-14 sm:w-16 sm:h-16 ${iconColor}`} />
          </motion.div>
        </div>
      </div>

      {/* 3 Metric Cards with Compact, Attractive Proportions */}
      <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200 bg-slate-50">
        <div className="p-2 sm:p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] sm:text-[11px] uppercase font-bold text-slate-700 tracking-wider">
            <Droplets className="w-3 h-3 text-sky-600" />
            <span>Humidity</span>
          </div>
          <p className="text-sm sm:text-base font-extrabold font-mono text-slate-950 mt-0.5">{humidity}%</p>
          <span className="text-[10px] text-slate-600 font-medium block leading-none">Relative</span>
        </div>

        <div className="p-2 sm:p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] sm:text-[11px] uppercase font-bold text-slate-700 tracking-wider">
            <Wind className="w-3 h-3 text-teal-600" />
            <span>Wind</span>
          </div>
          <p className="text-sm sm:text-base font-extrabold font-mono text-slate-950 mt-0.5">{windSpeed} km/h</p>
          <span className="text-[10px] text-slate-600 font-medium block leading-none">Breeze</span>
        </div>

        <div className="p-2 sm:p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] sm:text-[11px] uppercase font-bold text-slate-700 tracking-wider">
            <Eye className="w-3 h-3 text-indigo-600" />
            <span>Visibility</span>
          </div>
          <p className="text-sm sm:text-base font-extrabold font-mono text-slate-950 mt-0.5">{visibility} km</p>
          <span className="text-[10px] text-slate-600 font-medium block leading-none">Clear</span>
        </div>
      </div>

      {/* Compact Footer Info */}
      <div className="px-3 py-2 bg-white flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px] text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span>Live feed: <strong className="text-slate-800">{lastUpdated}</strong></span>
        </div>

        <span className="text-[10px] text-slate-500 italic">
          Environmental telemetry (non-clinical)
        </span>
      </div>
    </div>
  );
}
