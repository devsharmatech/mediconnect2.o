/**
 * lungWellnessData.js
 * ─────────────────────────────────────────────────────────────────────────────
 * LungConnect Authoritative Wellness Definitions
 * Source: LungConnect Part A + B documentation, Appendices 1-6, Corrections PDF
 *
 * Rule: This file is the single source of truth for all static wellness definitions.
 *       No component may define its own breathing techniques, move presets,
 *       milestone labels, or AQI categories. Always import from here.
 * Rule: No mock user data. Only definitional structures.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── BREATHING CATEGORIES (B07 tabs) ──────────────────────────────────────────
export const BREATHING_CATEGORIES = [
  {
    id: "calm",
    label: "Calm",
    description: "Reduce stress and anxiety through slow, controlled breathing",
    color: "#4A90D9",
    gradientFrom: "#4A90D9",
    gradientTo: "#1B4F8A",
    icon: "wave",
    presets: [
      {
        id: "calm-natural",
        label: "Natural Breathing",
        duration_minutes: 5,
        pattern: { inhale: 4, hold: 0, exhale: 6, hold2: 0 },
        description: "Gentle, natural breathing rhythm to ground and centre the mind.",
        difficulty: "beginner",
        cues: ["Breathe in slowly through your nose", "Let it go gently through your mouth", "Feel your shoulders relax"],
      },
      {
        id: "calm-478",
        label: "4-7-8 Breathing",
        duration_minutes: 7,
        pattern: { inhale: 4, hold: 7, exhale: 8, hold2: 0 },
        description: "A powerful relaxation technique. Inhale 4, hold 7, exhale 8.",
        difficulty: "intermediate",
        cues: ["Inhale quietly through your nose for 4 counts", "Hold your breath for 7 counts", "Exhale completely through your mouth for 8 counts"],
      },
      {
        id: "calm-diaphragmatic",
        label: "Diaphragmatic Breathing",
        duration_minutes: 10,
        pattern: { inhale: 5, hold: 2, exhale: 7, hold2: 0 },
        description: "Engages the diaphragm for deep, calming breaths. Ideal for COPD wellness.",
        difficulty: "beginner",
        cues: ["Place one hand on your chest, one on your belly", "Breathe in — feel only your belly rise", "Exhale slowly — let your belly fall"],
      },
      {
        id: "calm-pursed-lip",
        label: "Pursed Lip Breathing",
        duration_minutes: 8,
        pattern: { inhale: 2, hold: 0, exhale: 4, hold2: 0 },
        description: "Slows breathing and relieves breathlessness. Core COPD technique.",
        difficulty: "beginner",
        cues: ["Relax your shoulders", "Inhale slowly through your nose for 2 counts", "Pucker your lips as if blowing a candle — exhale for 4 counts"],
      },
    ],
  },
  {
    id: "energise",
    label: "Energise",
    description: "Invigorate the body and sharpen mental alertness",
    color: "#F5A623",
    gradientFrom: "#F5A623",
    gradientTo: "#C0392B",
    icon: "lightning",
    presets: [
      {
        id: "energise-box",
        label: "Box Breathing",
        duration_minutes: 5,
        pattern: { inhale: 4, hold: 4, exhale: 4, hold2: 4 },
        description: "Equal 4-count cycles — inhale, hold, exhale, hold. Used by athletes and military.",
        difficulty: "beginner",
        cues: ["Inhale for 4 counts", "Hold for 4 counts", "Exhale for 4 counts", "Hold for 4 counts"],
      },
      {
        id: "energise-breath-of-fire",
        label: "Energising Breath",
        duration_minutes: 3,
        pattern: { inhale: 2, hold: 0, exhale: 2, hold2: 0 },
        description: "Rhythmic fast breathing to energise and increase alertness.",
        difficulty: "intermediate",
        cues: ["Sit upright", "Short, sharp inhale through nose", "Short, sharp exhale through nose — repeat rhythmically"],
      },
      {
        id: "energise-kapalabhati",
        label: "Stimulating Breath",
        duration_minutes: 4,
        pattern: { inhale: 1, hold: 0, exhale: 1, hold2: 0 },
        description: "Rapid-rhythm breathing for immediate energy. Not suitable if breathless at rest.",
        difficulty: "advanced",
        cues: ["Sit tall", "Passive inhale", "Forceful short exhale", "Repeat at a rhythm you can sustain"],
      },
    ],
  },
  {
    id: "sleep",
    label: "Sleep",
    description: "Wind down and prepare the mind and body for deep, restful sleep",
    color: "#7B68EE",
    gradientFrom: "#7B68EE",
    gradientTo: "#2C1654",
    icon: "moon",
    presets: [
      {
        id: "sleep-478",
        label: "Sleep 4-7-8",
        duration_minutes: 10,
        pattern: { inhale: 4, hold: 7, exhale: 8, hold2: 0 },
        description: "Activates the parasympathetic system to prepare for sleep.",
        difficulty: "beginner",
        cues: ["Lie down comfortably", "Inhale through nose 4 counts", "Hold 7 counts", "Exhale through mouth 8 counts"],
      },
      {
        id: "sleep-progressive",
        label: "Progressive Relax",
        duration_minutes: 12,
        pattern: { inhale: 5, hold: 3, exhale: 8, hold2: 2 },
        description: "Long, slow exhales with soft holds to lower heart rate and cortisol.",
        difficulty: "beginner",
        cues: ["Begin with your feet — tense and release", "Breathe in for 5", "Hold softly for 3", "Let go fully for 8"],
      },
      {
        id: "sleep-coherent",
        label: "Coherent Breathing",
        duration_minutes: 15,
        pattern: { inhale: 6, hold: 0, exhale: 6, hold2: 0 },
        description: "5 breaths per minute for HRV coherence and deep rest.",
        difficulty: "beginner",
        cues: ["Breathe in for 6 counts", "Breathe out for 6 counts", "Keep this steady rhythm for 15 minutes"],
      },
    ],
  },
  {
    id: "focus",
    label: "Focus",
    description: "Sharpen concentration and cognitive clarity through breath control",
    color: "#27AE60",
    gradientFrom: "#27AE60",
    gradientTo: "#1A5632",
    icon: "target",
    presets: [
      {
        id: "focus-box",
        label: "Focus Box",
        duration_minutes: 6,
        pattern: { inhale: 4, hold: 4, exhale: 4, hold2: 4 },
        description: "Box breathing for mental clarity and sustained attention.",
        difficulty: "beginner",
        cues: ["Sit upright at your desk or chair", "Inhale 4", "Hold 4", "Exhale 4", "Hold 4 — notice the stillness"],
      },
      {
        id: "focus-nasal-alternate",
        label: "Alternate Nostril",
        duration_minutes: 8,
        pattern: { inhale: 4, hold: 2, exhale: 4, hold2: 2 },
        description: "Balances left-right brain hemispheres for sharp, calm focus.",
        difficulty: "intermediate",
        cues: ["Close right nostril — inhale left for 4", "Hold 2", "Close left — exhale right for 4", "Inhale right for 4", "Hold 2", "Exhale left — repeat"],
      },
      {
        id: "focus-2-1-4",
        label: "Concentration Breath",
        duration_minutes: 5,
        pattern: { inhale: 2, hold: 1, exhale: 4, hold2: 0 },
        description: "Short controlled inhale with long exhale to sustain mental presence.",
        difficulty: "beginner",
        cues: ["Inhale 2 counts", "Hold 1 count", "Exhale slowly for 4 counts", "Repeat 10–15 cycles"],
      },
    ],
  },
];

// ─── LUNG MOVE PRESETS (B03 session types) ────────────────────────────────────
export const LUNG_MOVE_PRESETS = [
  {
    id: "move-gentle-walk",
    label: "Gentle Walk",
    duration_minutes: 20,
    intensity: "low",
    met_value: 2.5,
    description: "Light-paced walking at a comfortable, easy rhythm. Suitable for all fitness levels.",
    icon: "footsteps",
    suitable_for: ["COPD", "post-exacerbation", "beginners", "elderly"],
    cues: ["Set a comfortable pace", "Keep your breathing easy and natural", "Stop if you feel out of breath"],
  },
  {
    id: "move-brisk-walk",
    label: "Brisk Walk",
    duration_minutes: 30,
    intensity: "moderate",
    met_value: 4.0,
    description: "Moderate-paced walk to elevate heart rate and improve pulmonary conditioning.",
    icon: "walk-fast",
    suitable_for: ["mild-moderate COPD", "asthma wellness", "general lung health"],
    cues: ["Aim for a pace where you can still talk but feel effort", "Swing your arms naturally", "Use pursed-lip breathing if needed"],
  },
  {
    id: "move-yoga-stretch",
    label: "Yoga & Stretch",
    duration_minutes: 25,
    intensity: "low",
    met_value: 2.0,
    description: "Gentle yoga movements and stretches to open the chest and improve lung expansion.",
    icon: "yoga",
    suitable_for: ["all levels", "post-COVID", "restrictive lung conditions"],
    cues: ["Move slowly with each inhale and exhale", "Focus on opening the chest", "Never stretch to the point of pain"],
  },
  {
    id: "move-strength",
    label: "Strength & Conditioning",
    duration_minutes: 30,
    intensity: "moderate",
    met_value: 4.5,
    description: "Resistance exercises to build lung-supporting musculature.",
    icon: "dumbbell",
    suitable_for: ["mild COPD", "general fitness", "post-rehabilitation"],
    cues: ["Exhale on exertion", "Never hold your breath during effort", "Rest between sets as needed"],
  },
  {
    id: "move-stair-climb",
    label: "Stair Climbing",
    duration_minutes: 15,
    intensity: "moderate-high",
    met_value: 5.0,
    description: "Short intervals of stair climbing for functional lung capacity training.",
    icon: "stairs",
    suitable_for: ["moderate fitness", "those cleared by clinician"],
    cues: ["Take one step at a time", "Use handrail for support if needed", "Use pursed-lip breathing on ascent"],
  },
];

// ─── WELLNESS MILESTONES ──────────────────────────────────────────────────────
export const WELLNESS_MILESTONES = [
  { id: "m1", label: "First Steps", description: "Complete your first Lung Health Assessment", target_type: "assessments", target_value: 1, icon: "assessment", tier: "bronze" },
  { id: "m2", label: "Breath Starter", description: "Complete 3 Breathing Studio sessions", target_type: "breathing_sessions", target_value: 3, icon: "breathing", tier: "bronze" },
  { id: "m3", label: "Mover", description: "Log 5 Lung Move sessions", target_type: "move_sessions", target_value: 5, icon: "move", tier: "bronze" },
  { id: "m4", label: "Walker", description: "Complete your first 6-Minute Walk Test", target_type: "6mwt_sessions", target_value: 1, icon: "6mwt", tier: "bronze" },
  { id: "m5", label: "Consistent Breather", description: "Reach a 7-day wellness streak", target_type: "streak_days", target_value: 7, icon: "streak", tier: "silver" },
  { id: "m6", label: "Lung Champion", description: "Walk 500m or more in a 6MWT session", target_type: "best_6mwt_m", target_value: 500, icon: "trophy", tier: "silver" },
  { id: "m7", label: "Wellness Regular", description: "Complete 20 total lung wellness sessions", target_type: "total_sessions", target_value: 20, icon: "star", tier: "silver" },
  { id: "m8", label: "All-Round Lung Warrior", description: "Unlock all activity types + 7-day streak + 1 assessment", target_type: "composite", target_value: 5, icon: "warrior", tier: "gold" },
];

// ─── AQI CATEGORIES ──────────────────────────────────────────────────────────
export const AQI_CATEGORIES = [
  { id: "good", label: "Good", range: [0, 50], color: "#27AE60", bg: "#E8F8F0", description: "Air quality is good. No health implications.", activity_outdoor: "safe" },
  { id: "satisfactory", label: "Satisfactory", range: [51, 100], color: "#F1C40F", bg: "#FEF9E7", description: "May cause minor breathing discomfort in sensitive people.", activity_outdoor: "caution" },
  { id: "moderate", label: "Moderate", range: [101, 200], color: "#E67E22", bg: "#FEF0E7", description: "Breathing discomfort for those with asthma, lung or heart disease.", activity_outdoor: "caution" },
  { id: "poor", label: "Poor", range: [201, 300], color: "#E74C3C", bg: "#FDEDEC", description: "Breathing discomfort for most people. Prolonged exposure hazardous.", activity_outdoor: "avoid" },
  { id: "very-poor", label: "Very Poor", range: [301, 400], color: "#8E44AD", bg: "#F5EEF8", description: "Respiratory illness on prolonged exposure. Elderly and children at higher risk.", activity_outdoor: "avoid" },
  { id: "severe", label: "Severe", range: [401, 500], color: "#922B21", bg: "#F9EBEA", description: "Risk to healthy people. Serious medical emergency for sensitive groups.", activity_outdoor: "avoid" },
];

export function getAqiCategory(aqi) {
  if (!aqi && aqi !== 0) return null;
  return AQI_CATEGORIES.find(c => aqi >= c.range[0] && aqi <= c.range[1]) || AQI_CATEGORIES[AQI_CATEGORIES.length - 1];
}

// ─── 6MWT CLINICAL INTERPRETATION ────────────────────────────────────────────
export const SIX_MWT_BENCHMARKS = [
  { label: "Excellent", min: 550, color: "#27AE60", message: "Outstanding functional capacity. Maintain with regular activity." },
  { label: "Good", min: 450, color: "#2ECC71", message: "Good functional capacity. Continue your current activity level." },
  { label: "Moderate", min: 350, color: "#F1C40F", message: "Moderate functional capacity. Gradual progression recommended." },
  { label: "Low", min: 250, color: "#E67E22", message: "Below average. Structured rehabilitation may benefit you." },
  { label: "Very Low", min: 0, color: "#E74C3C", message: "Significantly limited capacity. Clinical review strongly recommended." },
];

export function interpret6MWT(distM) {
  if (!distM || distM === 0) return null;
  return SIX_MWT_BENCHMARKS.find(b => distM >= b.min) || SIX_MWT_BENCHMARKS[SIX_MWT_BENCHMARKS.length - 1];
}

// ─── BORG SCALE ──────────────────────────────────────────────────────────────
export const BORG_SCALE = [
  { value: 0, label: "Nothing at all" },
  { value: 1, label: "Very light" },
  { value: 2, label: "Light" },
  { value: 3, label: "Moderate" },
  { value: 4, label: "Somewhat hard" },
  { value: 5, label: "Hard" },
  { value: 6, label: "Hard+" },
  { value: 7, label: "Very hard" },
  { value: 8, label: "Very hard+" },
  { value: 9, label: "Extremely hard" },
  { value: 10, label: "Maximal exertion" },
];

// ─── WELLNESS SERVICES ────────────────────────────────────────────────────────
export const WELLNESS_SERVICES = [
  {
    id: "lung-move",
    label: "Lung Move",
    shortLabel: "Move",
    description: "Guided physical activity sessions tailored for pulmonary wellness and functional capacity.",
    icon: "footsteps",
    color: "#27AE60",
    gradient: "linear-gradient(135deg, #27AE60, #1A5632)",
    href: "/lung-connect?action=move",
    available: true,
    screen_ids: ["B03", "B04", "B05", "B06"],
  },
  {
    id: "breathing-studio",
    label: "Breathing Studio",
    shortLabel: "Breathe",
    description: "4 therapeutic breathing categories: Calm, Energise, Sleep, and Focus.",
    icon: "wind",
    color: "#7B68EE",
    gradient: "linear-gradient(135deg, #7B68EE, #2C1654)",
    href: "/lung-connect?action=breathing",
    available: true,
    screen_ids: ["B07", "B08", "B09", "B10", "B11"],
  },
  {
    id: "6mwt",
    label: "6-Minute Walk Test",
    shortLabel: "6MWT",
    description: "Validated clinical test of functional exercise capacity. Walk as far as you can in 6 minutes.",
    icon: "timer",
    color: "#E67E22",
    gradient: "linear-gradient(135deg, #E67E22, #784212)",
    href: "/lung-connect?action=walking",
    available: true,
    screen_ids: ["B12", "B13", "B14", "B15"],
  },
  {
    id: "aqi-monitoring",
    label: "AQI Monitoring",
    shortLabel: "Air Quality",
    description: "Real-time air quality index with personalised activity safety recommendations.",
    icon: "leaf",
    color: "#16A085",
    gradient: "linear-gradient(135deg, #16A085, #0E6251)",
    href: "/lung-connect?tab=my-environment",
    available: true,
    screen_ids: ["B17", "B18"],
  },
  {
    id: "vitals-logging",
    label: "Vitals Logging",
    shortLabel: "Vitals",
    description: "Log SpO2, peak flow, heart rate, and other respiratory vitals.",
    icon: "pulse",
    color: "#C0392B",
    gradient: "linear-gradient(135deg, #C0392B, #7B241C)",
    href: "/lung-connect?tab=my-health",
    available: true,
    screen_ids: ["B19"],
  },
  {
    id: "devices",
    label: "Devices & Wearables",
    shortLabel: "Devices",
    description: "Connect compatible wearables for automated data capture.",
    icon: "watch",
    color: "#95A5A6",
    gradient: "linear-gradient(135deg, #95A5A6, #707B7C)",
    href: "/lung-connect?tab=my-care",
    available: false, // Future subscription
    screen_ids: ["B20"],
  },
  {
    id: "governed-ai",
    label: "Governed AI",
    shortLabel: "AI Insights",
    description: "AI-powered lung health insights governed by clinical protocols.",
    icon: "brain",
    color: "#95A5A6",
    gradient: "linear-gradient(135deg, #95A5A6, #707B7C)",
    href: "/lung-assessment",
    available: true,
    screen_ids: ["B21"],
  },
];
