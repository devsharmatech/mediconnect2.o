import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { doctor_id, action, is_open, slot_interval_minutes } = body;

    if (!doctor_id) {
      return failure("doctor_id is required", null, 400, { headers: corsHeaders });
    }

    if (action === "get") {
      const { data, error } = await supabase
        .from("doctor_details")
        .select("is_open, slot_interval_minutes")
        .eq("id", doctor_id)
        .maybeSingle();

      if (error) throw error;

      return success("Availability fetched successfully", {
        is_open: data?.is_open ?? false,
        slot_interval_minutes: data?.slot_interval_minutes ?? 10
      }, 200, { headers: corsHeaders });
    }

    if (action === "toggle") {
      // If turning offline, check if doctor has active appointments today
      if (!is_open) {
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: appointments, error: apptErr } = await supabase
          .from("appointments")
          .select("id, appointment_time, appointment_type, status")
          .eq("doctor_id", doctor_id)
          .eq("appointment_date", todayStr)
          .in("status", ["approved", "booked", "pending"]);

        if (apptErr) throw apptErr;

        if (appointments && appointments.length > 0) {
          return new Response(
            JSON.stringify({
              success: false,
              message: "Cannot go offline: You have active appointments today.",
              appointments,
            }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const { error } = await supabase
        .from("doctor_details")
        .update({ is_open: !!is_open })
        .eq("id", doctor_id);

      if (error) throw error;

      return success(`Availability updated to ${is_open ? "online" : "offline"}`, { is_open }, 200, { headers: corsHeaders });
    }

    if (action === "set_interval") {
      const { error } = await supabase
        .from("doctor_details")
        .update({ slot_interval_minutes: parseInt(slot_interval_minutes, 10) || 10 })
        .eq("id", doctor_id);

      if (error) throw error;

      return success("Slot interval updated successfully", { slot_interval_minutes }, 200, { headers: corsHeaders });
    }

    return failure("Invalid action", null, 400, { headers: corsHeaders });
  } catch (error) {
    console.error("Availability POST Error:", error);
    return failure("Internal Error", error.message, 500, { headers: corsHeaders });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const doctor_id = searchParams.get("doctor_id");

    if (!doctor_id) {
      return failure("doctor_id is required", null, 400, { headers: corsHeaders });
    }

    const { data, error } = await supabase
      .from("doctor_details")
      .select("is_open, slot_interval_minutes")
      .eq("id", doctor_id)
      .maybeSingle();

    if (error) throw error;

    return success("Availability fetched", {
      is_open: data?.is_open ?? false,
      slot_interval_minutes: data?.slot_interval_minutes ?? 10
    }, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Availability GET Error:", error);
    return failure("Internal Error", error.message, 500, { headers: corsHeaders });
  }
}
