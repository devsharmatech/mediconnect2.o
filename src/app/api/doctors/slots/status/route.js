import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { doctor_id, appointment_date, appointment_times, action } = body || {};

    if (!doctor_id || !appointment_date || !appointment_times?.length || !action)
      return failure(
        "doctor_id, appointment_date, appointment_times (array), and action are required.",
        null,
        400,
        { headers: corsHeaders }
      );

    if (!["freeze", "unfreeze"].includes(action))
      return failure("Invalid action. Use 'freeze' or 'unfreeze'.", null, 400, { headers: corsHeaders });

    const results = [];

    for (const time of appointment_times) {
      // ✅ Check if slot exists
      const { data: existing, error: existingErr } = await supabase
        .from("appointments")
        .select("id, status")
        .eq("doctor_id", doctor_id)
        .eq("appointment_date", appointment_date)
        .eq("appointment_time", time)
        .maybeSingle();

      if (existingErr) throw existingErr;

      // ✅ Freeze logic
      if (action === "freeze") {
        if (existing && ["booked", "approved", "completed"].includes(existing.status)) {
          results.push({ time, status: "failed", message: "Slot already booked by a patient" });
          continue;
        }

        if (existing && existing.status === "freezed") {
          results.push({ time, status: "skipped", message: "Slot already freezed" });
          continue;
        }

        // Update or Insert freezed record
        if (existing) {
          const { data, error } = await supabase
            .from("appointments")
            .update({
              status: "freezed",
              patient_id: doctor_id, // doctor freezes his own slot
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id)
            .select()
            .single();
          if (error) throw error;
          results.push({ time, status: "success", action: "freezed" });
        } else {
          const { data, error } = await supabase
            .from("appointments")
            .insert([
              {
                doctor_id,
                patient_id: doctor_id, // self-freeze
                appointment_date,
                appointment_time: time,
                status: "freezed",
              },
            ])
            .select()
            .single();
          if (error) throw error;
          results.push({ time, status: "success", action: "freezed" });
        }
      }

      // ✅ Unfreeze logic
      if (action === "unfreeze") {
        if (!existing || existing.status !== "freezed") {
          results.push({ time, status: "failed", message: "Slot is not freezed" });
          continue;
        }

        const { error: delErr } = await supabase
          .from("appointments")
          .delete()
          .eq("id", existing.id);

        if (delErr) throw delErr;
        results.push({ time, status: "success", action: "unfreezed" });
      }
    }

    return success(`Slots ${action} operation completed.`, results, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Freeze/unfreeze multiple slots error:", error);
    return failure("Failed to freeze/unfreeze slots.", error.message, 500, { headers: corsHeaders });
  }
}
