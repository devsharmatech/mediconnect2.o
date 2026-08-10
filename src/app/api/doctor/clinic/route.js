import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const doctor_id = searchParams.get("doctor_id");

    if (!doctor_id) {
      return failure("doctor_id is required", null, 400);
    }

    const { data: doctor, error } = await supabase
      .from("doctor_details")
      .select("clinic_name, clinic_address, meta, email, users(phone_number)")
      .eq("id", doctor_id)
      .maybeSingle();

    if (error) throw error;
    if (!doctor) return failure("Doctor not found", null, 404);

    const clinic = {
      name: doctor.clinic_name || "",
      address: doctor.clinic_address || "",
      phone: doctor.meta?.clinic_phone || doctor.users?.phone_number || "",
      email: doctor.meta?.clinic_email || doctor.email || "",
      facilities: doctor.meta?.clinic_facilities || [],
      timing: doctor.meta?.clinic_timing || ""
    };

    return success("Clinic fetched successfully", clinic, 200);
  } catch (error) {
    console.error("Clinic GET Error:", error);
    return failure("Internal Error", error.message, 500);
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { doctor_id, name, address, phone, email, facilities, timing } = body;

    if (!doctor_id) {
      return failure("doctor_id is required", null, 400);
    }

    // Fetch existing meta to preserve other keys
    const { data: existing } = await supabase
      .from("doctor_details")
      .select("meta")
      .eq("id", doctor_id)
      .maybeSingle();

    const newMeta = {
      ...(existing?.meta || {}),
      clinic_phone: phone,
      clinic_email: email,
      clinic_facilities: facilities,
      clinic_timing: timing
    };

    const { error } = await supabase
      .from("doctor_details")
      .update({
        clinic_name: name,
        clinic_address: address,
        meta: newMeta
      })
      .eq("id", doctor_id);

    if (error) throw error;

    return success("Clinic updated successfully", {}, 200);
  } catch (error) {
    console.error("Clinic POST Error:", error);
    return failure("Internal Error", error.message, 500);
  }
}
