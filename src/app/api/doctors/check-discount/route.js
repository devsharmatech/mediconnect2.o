import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const patient_id = searchParams.get("patient_id");
    const doctor_id = searchParams.get("doctor_id");
    const appointment_type = searchParams.get("appointment_type") || "clinic_visit";

    if (!patient_id || !doctor_id) {
      return failure("patient_id and doctor_id are required", null, 400, { headers: corsHeaders });
    }

    // 1. Fetch count of existing appointments (not cancelled)
    const { count, error: countError } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", patient_id)
      .eq("doctor_id", doctor_id)
      .neq("status", "cancelled");

    if (countError) throw countError;

    // 2. Fetch doctor's fees and discount configuration
    const { data: doctor, error: docError } = await supabase
      .from("doctor_details")
      .select("consultation_fee, meta, second_booking_discount_type, second_booking_discount_value")
      .eq("id", doctor_id)
      .maybeSingle();

    if (docError) throw docError;
    if (!doctor) {
      return failure("Doctor not found", null, 404, { headers: corsHeaders });
    }

    // 3. Resolve the original fee
    let originalFee = 0;
    const meta = typeof doctor.meta === 'string' ? JSON.parse(doctor.meta || '{}') : (doctor.meta || {});

    if (appointment_type === "video_consultation") {
      originalFee = Number(meta?.video_consultation_fee ?? doctor.consultation_fee ?? 0);
    } else if (appointment_type === "clinic_visit") {
      originalFee = Number(meta?.clinic_consultation_fee ?? doctor.consultation_fee ?? 0);
    } else if (appointment_type === "home_visit") {
      originalFee = Number(meta?.home_visit_fee ?? doctor.consultation_fee ?? 0);
    } else {
      originalFee = Number(doctor.consultation_fee ?? 0);
    }

    // 4. Calculate discount
    const isDiscountApplicable = count === 1 && doctor.second_booking_discount_type && doctor.second_booking_discount_type !== "none";
    let discountAmount = 0;
    let discountedFee = originalFee;

    if (isDiscountApplicable) {
      const type = doctor.second_booking_discount_type;
      const val = Number(doctor.second_booking_discount_value || 0);

      if (type === "percentage") {
        discountAmount = originalFee * (val / 100);
      } else if (type === "flat") {
        discountAmount = val;
      }

      discountAmount = Math.max(0, Math.min(originalFee, discountAmount));
      discountedFee = Math.max(0, originalFee - discountAmount);
    }

    return success("Discount status fetched successfully", {
      is_discount_applicable: isDiscountApplicable,
      previous_appointments_count: count,
      original_fee: originalFee,
      discount_amount: discountAmount,
      discounted_fee: discountedFee,
      discount_type: doctor.second_booking_discount_type || "none",
      discount_value: Number(doctor.second_booking_discount_value || 0)
    }, 200, { headers: corsHeaders });

  } catch (error) {
    console.error("Check discount API error:", error);
    return failure("Failed to fetch discount status", error.message, 500, { headers: corsHeaders });
  }
}
