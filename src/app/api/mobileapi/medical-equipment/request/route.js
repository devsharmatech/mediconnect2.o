import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";

// Generate lead ID: MCN-EQP-000123
async function generateLeadId() {
  const { data } = await supabase.rpc("nextval", { seq_name: "equipment_lead_seq" }).single();
  let seq = data;
  if (!seq) {
    const { count } = await supabase
      .from("medical_equipment_leads")
      .select("id", { count: "exact", head: true });
    seq = (count || 0) + 1;
  }
  return `MCN-EQP-${String(seq).padStart(6, "0")}`;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      user_id,
      name,
      phone,
      email,
      age,
      gender,
      city,
      locality,
      equipment_types,
      duration,
      notes,
      data_consent,
      communication_consent,
      device_type,
    } = body;

    // Validation
    if (!name || !phone || !city || !duration) {
      return failure("Name, phone, city, and duration are required.");
    }

    if (!equipment_types || !Array.isArray(equipment_types) || equipment_types.length === 0) {
      return failure("At least one equipment type must be selected.");
    }

    // Validate consent
    if (!data_consent) {
      return failure("Data processing consent is required to submit this request.");
    }
    if (!communication_consent) {
      return failure("Communication consent is required to submit this request.");
    }

    const lead_id = await generateLeadId();

    // Create Lead
    const { data: lead, error: leadError } = await supabase
      .from("medical_equipment_leads")
      .insert({
        lead_id,
        user_id: user_id || null,
        name,
        phone,
        email: email || null,
        age: age ? parseInt(age) : null,
        gender: gender || null,
        city,
        locality: locality || null,
        equipment_types,
        duration,
        notes: notes || null,
        lead_status: "NEW",
      })
      .select()
      .single();

    if (leadError) {
      console.error("Lead creation error:", leadError);
      return failure("Failed to submit request. Please try again.", leadError.message, 500);
    }

    // Consent Log
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await supabase
      .from("medical_equipment_consent_logs")
      .insert({
        lead_id: lead.id,
        data_consent: true,
        communication_consent: true,
        consent_timestamp: new Date().toISOString(),
        ip_address: ip,
        device_type: device_type || "web",
        form_version: "1.0",
      });

    // In-system notification
    if (user_id) {
      try {
        const displayEq = Array.isArray(equipment_types) ? equipment_types.join(", ") : equipment_types;
        await supabase.from("notifications").insert({
          user_id: user_id,
          title: "Medical Equipment Request Submitted",
          message: `Thank you ${name}. Your medical equipment request (ID: ${lead.lead_id}) for ${displayEq} has been received successfully.`,
          type: "equipment",
          read: false,
          metadata: { lead_id: lead.id }
        });
      } catch (notifErr) {
        console.error("Failed to insert notification:", notifErr);
      }
    }

    return success("Your medical equipment request has been submitted successfully. Our team will contact you shortly.", {
      lead_id: lead.lead_id,
      id: lead.id,
    }, 201);
  } catch (err) {
    console.error("Equipment request error:", err);
    return failure("Internal server error", err.message, 500);
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return failure("User ID is required.");
    }

    const { data, error } = await supabase
      .from("medical_equipment_leads")
      .select("id, lead_id, name, city, locality, equipment_types, duration, lead_status, created_at, updated_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });

    if (error) {
      return failure("Failed to fetch requests", error.message, 500);
    }

    return success("Requests fetched", data);
  } catch (err) {
    return failure("Internal server error", err.message, 500);
  }
}
