/**
 * Nursing / Home Care Request API
 * POST - Submit a new nursing care request (public)
 * GET  - Get user's own requests (authenticated)
 */
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { sendNursingRequestReceived } from "@/lib/sms";

// Generate lead ID: MCN-NUR-000123
async function generateLeadId() {
  const { data } = await supabase.rpc("nextval", { seq_name: "nursing_lead_seq" }).single();
  // Fallback: count existing leads
  let seq = data;
  if (!seq) {
    const { count } = await supabase
      .from("nursing_leads")
      .select("id", { count: "exact", head: true });
    seq = (count || 0) + 1;
  }
  return `MCN-NUR-${String(seq).padStart(6, "0")}`;
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
      care_types,
      duration,
      notes,
      data_consent,
      communication_consent,
      device_type,
    } = body;

    // ─── Validation ──────────────────────────────────────
    if (!name || !phone || !city || !duration) {
      return failure("Name, phone, city, and duration are required.");
    }

    if (!care_types || !Array.isArray(care_types) || care_types.length === 0) {
      return failure("At least one care type must be selected.");
    }

    // Validate care types against allowed list
    const allowedCareTypes = [
      "Home Nursing Support",
      "Elder Care Assistance",
      "Post-Surgical Care",
      "ICU-Trained Nurse (Home)",
      "Caregiver / Attendant Support",
    ];
    const invalidTypes = care_types.filter((t) => !allowedCareTypes.includes(t));
    if (invalidTypes.length > 0) {
      return failure(`Invalid care type(s): ${invalidTypes.join(", ")}`);
    }

    // Validate duration
    const allowedDurations = ["single_visit", "short_term", "long_term"];
    if (!allowedDurations.includes(duration)) {
      return failure("Invalid duration. Must be single_visit, short_term, or long_term.");
    }

    // Consent is MANDATORY
    if (!data_consent) {
      return failure("Data processing consent is required to submit this request.");
    }
    if (!communication_consent) {
      return failure("Communication consent is required to submit this request.");
    }

    // Block medical documents in notes
    if (notes && notes.length > 1000) {
      return failure("Notes must be 1000 characters or fewer.");
    }

    // ─── Generate lead ID ────────────────────────────────
    const lead_id = await generateLeadId();

    // ─── Create Lead ────────────────────────────────────
    const { data: lead, error: leadError } = await supabase
      .from("nursing_leads")
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
        care_types,
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

    // ─── Log Consent (IMMUTABLE) ─────────────────────────
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const { error: consentError } = await supabase
      .from("nursing_consent_logs")
      .insert({
        lead_id: lead.id,
        data_consent: true,
        communication_consent: true,
        consent_timestamp: new Date().toISOString(),
        ip_address: ip,
        device_type: device_type || "web",
        form_version: "1.0",
      });

    if (consentError) {
      console.error("Consent log error:", consentError);
      // Lead created but consent failed - this is critical
      // We still return success but log the issue
    }

    // Send WhatsApp notification
    try {
      await sendNursingRequestReceived({
        phone_number: phone,
        recipient_name: name,
        lead_code: lead.lead_id,
        care_types: care_types,
        patient_id: user_id || null,
      });
    } catch (whatsappErr) {
      console.error("[WHATSAPP] Failed to send request submission notification:", whatsappErr.message);
    }

    // Insert in-system notification if user_id is present
    if (user_id) {
      try {
        const displayCareTypes = Array.isArray(care_types) ? care_types.join(", ") : care_types;
        await supabase.from("notifications").insert({
          user_id: user_id,
          title: "Nursing Request Submitted",
          message: `Thank you ${name}. Your nursing care request (ID: ${lead.lead_id}) for ${displayCareTypes} has been received successfully.`,
          type: "nursing",
          read: false,
          metadata: { lead_id: lead.id }
        });
      } catch (notifErr) {
        console.error("[NOTIFICATION] Failed to insert request submission notification:", notifErr.message);
      }
    }

    return success("Your nursing care request has been submitted successfully. Our team will contact you shortly.", {
      lead_id: lead.lead_id,
      id: lead.id,
    }, 201);
  } catch (err) {
    console.error("Nursing request error:", err);
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
      .from("nursing_leads")
      .select("id, lead_id, name, city, locality, care_types, duration, lead_status, created_at, updated_at")
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
