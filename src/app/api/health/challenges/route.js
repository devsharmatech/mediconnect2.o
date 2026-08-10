import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const challengeType = searchParams.get("type");
    const status = searchParams.get("status");

    if (!userId) {
      return failure("User ID is required", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    let query = supabase
      .from("health_challenges")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (challengeType) {
      query = query.eq("challenge_type", challengeType);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return success("Health challenges fetched successfully.", { challenges: data }, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("GET Health Challenges Error:", error);
    return failure("Failed to fetch health challenges. " + error.message, "fetch_failed", 500, {
      headers: corsHeaders,
    });
  }
}

export async function POST(req) {
  try {
    const {
      user_id,
      challenge_type,
      challenge_name,
      description,
      target_value,
      end_date,
      reward_points = 0,
    } = await req.json();

    if (!user_id || !challenge_type || !challenge_name || !target_value) {
      return failure("Missing required fields", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    const { data, error } = await supabase
      .from("health_challenges")
      .insert([
        {
          user_id,
          challenge_type,
          challenge_name,
          description,
          target_value,
          current_value: 0,
          status: "active",
          start_date: new Date().toISOString(),
          end_date,
          reward_points,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return success("Health challenge created successfully.", data, 201, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("POST Health Challenge Error:", error);
    return failure("Failed to create health challenge. " + error.message, "creation_failed", 500, {
      headers: corsHeaders,
    });
  }
}

export async function PUT(req) {
  try {
    const {
      challenge_id,
      current_value,
      status,
    } = await req.json();

    if (!challenge_id || current_value === undefined) {
      return failure("Challenge ID and current value are required", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    const updateData = { current_value };
    if (status) updateData.status = status;

    // Check if challenge is completed
    const { data: challenge } = await supabase
      .from("health_challenges")
      .select("target_value, user_id, challenge_type")
      .eq("id", challenge_id)
      .single();

    if (current_value >= challenge.target_value && status !== "completed") {
      updateData.status = "completed";
      
      // Award badge for challenge completion
      await supabase
        .from("user_badges")
        .insert([
          {
            user_id: challenge.user_id,
            badge_name: `${challenge.challenge_type === 'heart' ? 'Heart' : 'Lung'} Challenge Master`,
            badge_type: challenge.challenge_type,
            description: `Completed the ${challenge.challenge_type} health challenge`,
            earned_at: new Date().toISOString(),
          },
        ]);
    }

    const { data, error } = await supabase
      .from("health_challenges")
      .update(updateData)
      .eq("id", challenge_id)
      .select()
      .single();

    if (error) throw error;

    return success("Challenge progress updated successfully.", data, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("PUT Health Challenge Error:", error);
    return failure("Failed to update challenge progress. " + error.message, "update_failed", 500, {
      headers: corsHeaders,
    });
  }
}