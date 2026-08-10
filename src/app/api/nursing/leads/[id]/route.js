/**
 * Single Nursing Lead Detail / Update / Status Change
 * GET  - Full lead detail with notes, consent, referrals
 * PUT  - Update lead status, intent, assignment, follow-up
 * 
 * SECURITY:
 *  - Staff MUST authenticate via Bearer token
 *  - Staff MUST have view_nursing (GET) or manage_nursing (PUT) permission
 *  - Staff can ONLY access leads assigned to them
 *  - Staff identity is SERVER-DERIVED from token, never from request body
 *  - Patient details JOINed from patient_details table when user_id exists
 *  - Admin requests (no Bearer) allowed for admin panel
 */
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { getAuthenticatedStaff, staffHasPermission, logStaffActivity } from "@/lib/staffAuth";

// ─── Helper: Check if staff has access to this specific lead ───
async function staffHasLeadAccess(staffId, leadId) {
  const { data } = await supabase
    .from("nursing_lead_assignments")
    .select("id")
    .eq("staff_id", staffId)
    .eq("lead_id", leadId)
    .single();
  return !!data;
}

// ─── Helper: Enrich lead with patient_details ──────────────────
async function enrichWithPatientDetails(lead) {
  let patientInfo = null;
  if (lead.user_id) {
    const { data: pd } = await supabase
      .from("patient_details")
      .select("full_name, email, gender, date_of_birth, blood_group, address, emergency_contact")
      .eq("id", lead.user_id)
      .single();
    if (pd) patientInfo = pd;
  }
  return {
    patient_name: patientInfo?.full_name || lead.name || "—",
    patient_phone: lead.phone || "—",
    patient_email: patientInfo?.email || lead.email || null,
    patient_gender: patientInfo?.gender || lead.gender || null,
    patient_dob: patientInfo?.date_of_birth || null,
    patient_age: lead.age || null,
    patient_blood_group: patientInfo?.blood_group || null,
    patient_address: patientInfo?.address || lead.city || null,
    patient_emergency_contact: patientInfo?.emergency_contact || null,
    has_patient_record: !!patientInfo,
  };
}

// ─── Helper: Authenticate & authorize request ──────────────────
async function authorizeRequest(req, leadId, action = "view") {
  const authHeader = req.headers.get("authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const staff = await getAuthenticatedStaff(req);
    if (!staff) {
      return { error: failure("Unauthorized – invalid or expired token", null, 401) };
    }

    const permKey = action === "view" ? "view_nursing" : "manage_nursing";
    const hasPermission = await staffHasPermission(staff.id, permKey, action);
    if (!hasPermission) {
      return { error: failure("Access denied – insufficient permissions", null, 403) };
    }

    // Staff must be assigned to this specific lead
    const hasAccess = await staffHasLeadAccess(staff.id, leadId);
    if (!hasAccess) {
      return { error: failure("Access denied – this lead is not assigned to you", null, 403) };
    }

    return { staff, isAdmin: false };
  }

  // No Bearer token = admin request (admin routes protected by middleware)
  return { staff: null, isAdmin: true };
}

export async function GET(req, context) {
  try {
    const { id } = await context.params;

    // ─── Auth Check ──────────────────────────────────────
    const auth = await authorizeRequest(req, id, "view");
    if (auth.error) return auth.error;

    // Fetch lead
    const { data: lead, error } = await supabase
      .from("nursing_leads")
      .select("*, staffs!nursing_leads_assigned_staff_id_fkey(id, full_name, employee_code)")
      .eq("id", id)
      .single();

    if (error || !lead) {
      return failure("Lead not found", null, 404);
    }

    // Enrich with canonical patient data
    const patientData = await enrichWithPatientDetails(lead);

    // Fetch notes
    const { data: notes } = await supabase
      .from("nursing_lead_notes")
      .select("*")
      .eq("lead_id", id)
      .order("created_at", { ascending: false });

    // Fetch consent log
    const { data: consent } = await supabase
      .from("nursing_consent_logs")
      .select("*")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .limit(1);

    // Fetch referral logs
    const { data: referrals } = await supabase
      .from("nursing_referral_logs")
      .select("*")
      .eq("lead_id", id)
      .order("created_at", { ascending: false });

    // Compute SLA
    const now = Date.now();
    const createdAt = new Date(lead.created_at).getTime();
    const minutesSinceCreated = Math.floor((now - createdAt) / 60000);
    let sla = "green";
    if (minutesSinceCreated > 120) sla = "red";
    else if (minutesSinceCreated > 60) sla = "amber";

    // Log activity
    if (auth.staff) {
      logStaffActivity(auth.staff.id, auth.staff.full_name, "viewed_nursing_lead", "nursing", { lead_id: id }, req);
    }

    return success("Lead detail fetched", {
      ...lead,
      ...patientData,
      patient_notes: lead.notes || "",
      minutes_since_created: minutesSinceCreated,
      sla,
      notes_list: notes || [],
      consent: consent?.[0] || null,
      referrals: referrals || [],
    });
  } catch (err) {
    console.error("Lead detail error:", err);
    return failure("Internal server error", err.message, 500);
  }
}

export async function PUT(req, context) {
  try {
    const { id } = await context.params;

    // ─── Auth Check (requires manage_nursing) ────────────
    const auth = await authorizeRequest(req, id, "update");
    if (auth.error) return auth.error;

    const body = await req.json();
    const {
      lead_status,
      lead_intent,
      assigned_staff_id,
      partner_name,
      follow_up_date,
      not_converted_reason,
      note,
      call_outcome,
    } = body;

    // Server-derived staff identity — NEVER trust client-supplied staff_id
    const staff_id = auth.staff?.id || body.staff_id;
    const staff_name = auth.staff?.full_name || body.staff_name;

    if (!staff_id || !staff_name) {
      return failure("Staff identification failed.", null, 401);
    }

    // Get current lead
    const { data: currentLead, error: fetchError } = await supabase
      .from("nursing_leads")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !currentLead) {
      return failure("Lead not found", null, 404);
    }

    // ─── Status change validation ────────────────────────
    const statusOrder = ["NEW", "CONTACTED", "QUALIFIED", "SHARED_WITH_PARTNER", "SERVICE_STARTED", "NOT_CONVERTED", "CLOSED"];

    if (lead_status && lead_status !== currentLead.lead_status) {
      if (!note || note.trim().length === 0) {
        return failure("A note is mandatory when changing lead status.");
      }

      const currentIdx = statusOrder.indexOf(currentLead.lead_status);
      const newIdx = statusOrder.indexOf(lead_status);

      if (newIdx === -1) {
        return failure("Invalid status value.");
      }

      const allowedNotConverted = ["CONTACTED", "QUALIFIED", "SHARED_WITH_PARTNER"];
      if (lead_status === "NOT_CONVERTED" && !allowedNotConverted.includes(currentLead.lead_status)) {
        return failure(`Cannot mark as NOT_CONVERTED from ${currentLead.lead_status}.`);
      }

      if (lead_status === "CLOSED" && !["SERVICE_STARTED", "NOT_CONVERTED"].includes(currentLead.lead_status)) {
        return failure(`Cannot close lead from ${currentLead.lead_status}.`);
      }

      if (!["NOT_CONVERTED", "CLOSED"].includes(lead_status) && newIdx <= currentIdx) {
        return failure(`Status can only move forward. Current: ${currentLead.lead_status}.`);
      }

      if (lead_status === "NOT_CONVERTED" && !not_converted_reason) {
        return failure("A reason is required when marking as NOT_CONVERTED.");
      }
    }

    // ─── Build update object ─────────────────────────────
    const updateObj = { updated_at: new Date().toISOString() };

    if (lead_status) updateObj.lead_status = lead_status;
    if (lead_intent) updateObj.lead_intent = lead_intent;
    if (assigned_staff_id !== undefined) updateObj.assigned_staff_id = assigned_staff_id || null;
    if (partner_name !== undefined) updateObj.partner_name = partner_name;
    if (follow_up_date !== undefined) updateObj.follow_up_date = follow_up_date;
    if (not_converted_reason) updateObj.not_converted_reason = not_converted_reason;

    // Update lead
    const { data: updated, error: updateError } = await supabase
      .from("nursing_leads")
      .update(updateObj)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Lead update error:", updateError);
      return failure("Failed to update lead", updateError.message, 500);
    }

    // ─── Sync nursing_lead_assignments when assigned_staff_id changes ──
    if (assigned_staff_id !== undefined && auth.isAdmin) {
      if (assigned_staff_id) {
        // Upsert: insert or ignore if already assigned
        // assigned_by references users.id — use null here since the dedicated /assign
        // endpoint handles proper assignment tracking with the admin's user ID
        await supabase
          .from("nursing_lead_assignments")
          .upsert(
            { lead_id: id, staff_id: assigned_staff_id, assigned_by: null },
            { onConflict: "lead_id,staff_id" }
          );
      }
      // Note: we don't remove old assignments here — admin can do that via the assign endpoint
    }

    // ─── Add note to audit trail ─────────────────────────
    if (note && note.trim()) {
      const noteType = lead_status && lead_status !== currentLead.lead_status
        ? "status_change"
        : call_outcome
          ? "call_outcome"
          : "general";

      await supabase.from("nursing_lead_notes").insert({
        lead_id: id,
        staff_id,
        staff_name,
        note: note.trim(),
        note_type: noteType,
        call_outcome: call_outcome || null,
        previous_status: lead_status && lead_status !== currentLead.lead_status ? currentLead.lead_status : null,
        new_status: lead_status && lead_status !== currentLead.lead_status ? lead_status : null,
      });
    }

    // Create in-system notification for patient if user_id is present and status is patient-facing
    const PATIENT_FACING_STATUSES = ["SHARED_WITH_PARTNER", "SERVICE_STARTED", "CLOSED"];
    if (lead_status && lead_status !== currentLead.lead_status && PATIENT_FACING_STATUSES.includes(lead_status) && currentLead.user_id) {
      try {
        const NURSING_STATUS_LABELS = {
          SHARED_WITH_PARTNER: "Service Partner Assigned",
          SERVICE_STARTED: "Nursing Service Started",
          CLOSED: "Completed"
        };
        const displayStatus = NURSING_STATUS_LABELS[lead_status] || lead_status;
        await supabase.from("notifications").insert({
          user_id: currentLead.user_id,
          title: "Nursing Request Status Update",
          message: `The status of your nursing care request (ID: ${currentLead.lead_id}) has been updated to: ${displayStatus}.`,
          type: "nursing",
          read: false,
          metadata: { lead_id: id, status: lead_status }
        });
      } catch (notifErr) {
        console.error("[NOTIFICATION] Failed to insert status update notification:", notifErr.message);
      }
    }

    // ─── Activity Log ──────────────────────────────────────
    logStaffActivity(staff_id, staff_name, "updated_nursing_lead", "nursing", {
      lead_id: id,
      changes: updateObj,
    }, req);

    return success("Lead updated successfully", updated);
  } catch (err) {
    console.error("Lead update error:", err);
    return failure("Internal server error", err.message, 500);
  }
}
