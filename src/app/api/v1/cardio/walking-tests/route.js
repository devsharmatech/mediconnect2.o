import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

// In-memory or fallback store for tests during session
const walkingTestRecords = [
  {
    id: "wt-baseline-101",
    protocol_version: "V1.0",
    date: "12 Jan 2025",
    status: "complete",
    duration_formatted: "06:00",
    duration_seconds: 360,
    distance_km: 0.48,
    pace_kmh: 5.1,
    heart_rate_bpm: 68
  }
];

/**
 * CC-10 / CC-11 / CC-12: Walking Performance Test API
 * Governs standardized 6-minute functional test.
 * RULES:
 * - Like-for-like protocol comparison only
 * - Neutral comparison (+/- distance, +/- pace)
 * - NO diagnostic interpretation, no cardiac improvement claims
 */
export async function GET(req) {
  try {
    return success("Walking tests retrieved successfully.", {
      protocol_version: "V1.0",
      test_definition: {
        title: "Standardized Walking Performance Test",
        duration_minutes: 6,
        description: "A standardized walking test for baseline and repeat comparison.",
        measures: ["Duration", "Distance", "Pace / speed where available", "Optional reliable heart rate"],
        does_not_diagnose: [
          "It is not a diagnostic test.",
          "It is not a stress test.",
          "It does not diagnose heart disease or any other condition.",
          "It does not establish cardiac improvement."
        ]
      },
      history: walkingTestRecords
    }, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("GET /api/v1/cardio/walking-tests error:", error);
    return failure("Failed to fetch walking tests: " + error.message, "walking_fetch_failed", 500, {
      headers: corsHeaders
    });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      duration_seconds = 360,
      distance_km = 0.52,
      pace_kmh = 5.2,
      heart_rate_bpm = 72,
      stopped_early = false,
      protocol_version = "V1.0"
    } = body;

    const isComplete = !stopped_early && duration_seconds >= 360;
    const testId = `wt-${Date.now()}`;

    // Find previous test with matching protocol version for like-for-like comparison
    const prevTest = walkingTestRecords.find(t => t.protocol_version === protocol_version);

    let comparison = null;
    if (prevTest) {
      const distDiff = Number((distance_km - prevTest.distance_km).toFixed(2));
      const paceDiff = Number((pace_kmh - prevTest.pace_kmh).toFixed(1));

      comparison = {
        eligible: true,
        protocol_match: true,
        previous_test: {
          date: prevTest.date,
          duration: prevTest.duration_formatted,
          distance_km: prevTest.distance_km,
          pace_kmh: prevTest.pace_kmh,
          heart_rate_bpm: prevTest.heart_rate_bpm
        },
        difference: {
          distance: `${distDiff >= 0 ? '+' : ''}${distDiff} km`,
          pace: `${paceDiff >= 0 ? '+' : ''}${paceDiff} km/h`
        },
        neutral_note: "Comparison shown for like-for-like protocol only. No clinical improvement or decline is implied."
      };
    } else {
      comparison = {
        eligible: false,
        protocol_match: false,
        neutral_note: "No previous comparable test available with matching protocol."
      };
    }

    const newRecord = {
      id: testId,
      protocol_version: protocol_version,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: isComplete ? "complete" : "incomplete",
      duration_formatted: `${Math.floor(duration_seconds / 60).toString().padStart(2, '0')}:${(duration_seconds % 60).toString().padStart(2, '0')}`,
      duration_seconds: duration_seconds,
      distance_km: distance_km,
      pace_kmh: pace_kmh,
      heart_rate_bpm: heart_rate_bpm,
      comparison: comparison
    };

    walkingTestRecords.unshift(newRecord);

    return success("Walking test completed and stored.", newRecord, 201, {
      headers: corsHeaders
    });
  } catch (error) {
    console.error("POST /api/v1/cardio/walking-tests error:", error);
    return failure("Failed to save walking test: " + error.message, "walking_save_failed", 500, {
      headers: corsHeaders
    });
  }
}
