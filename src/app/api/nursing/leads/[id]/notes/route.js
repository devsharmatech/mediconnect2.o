/**
 * Nursing Lead Notes API
 * GET  - Fetch notes for a lead
 * POST - Add a note to a lead
 * 
 * SECURITY:
 *  - Staff MUST authenticate via Bearer token
 *  - Staff MUST have view_nursing (GET) or manage_nursing (POST) permission
 *  - Staff can ONLY access notes for leads assigned to them
 *  - Staff identity (staff_id, staff_name) is SERVER-DERIVED from token
 */
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { getAuthenticatedStaff, staffHasPermission, logStaffActivity } from "@/lib/staffAuth";

async function staffHasLeadAccess(staffId, leadId) {
  const { data } = await supabase
    .from("nursing_lead_assignments")
    .select("id")
    .eq("staff_id", staffId)
    .eq("lead_id", leadId)
    .single();
  return !!data;
}

export async function GET(req, context) {
  try {
    const { id } = await context.params;

    // ─── Auth Check ──────────────────────────────────────
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const staff = await getAuthenticatedStaff(req);
      if (!staff) return failure("Unauthorized", null, 401);
      const hasPerm = await staffHasPermission(staff.id, "view_nursing", "view");
      if (!hasPerm) return failure("Access denied", null, 403);
      const hasAccess = await staffHasLeadAccess(staff.id, id);
      if (!hasAccess) return failure("Access denied – lead not assigned to you", null, 403);
    }

    const { data, error } = await supabase
      .from("nursing_lead_notes")
      .select("*")
      .eq("lead_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      return failure("Failed to fetch notes", error.message, 500);
    }

    return success("Notes fetched", data || []);
  } catch (err) {
    return failure("Internal server error", err.message, 500);
  }
}

export async function POST(req, context) {
  try {
    const { id } = await context.params;

    // Parse body once
    const body = await req.json().catch(() => ({}));

    // ─── Auth Check (manage permission required) ─────────
    const authHeader = req.headers.get("authorization");
    let staffId, staffName;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const staff = await getAuthenticatedStaff(req);
      if (!staff) return failure("Unauthorized", null, 401);
      const hasPerm = await staffHasPermission(staff.id, "manage_nursing", "create");
      if (!hasPerm) return failure("Access denied – insufficient permissions", null, 403);
      const hasAccess = await staffHasLeadAccess(staff.id, id);
      if (!hasAccess) return failure("Access denied – lead not assigned to you", null, 403);
      // Server-derived identity
      staffId = staff.id;
      staffName = staff.full_name;
    } else {
      // Admin request — accept body params
      staffId = body.staff_id;
      staffName = body.staff_name;
    }

    const { note, note_type, call_outcome } = body;
    // Use server-derived values, fall back to body for admin
    const finalStaffId = staffId || body.staff_id;
    const finalStaffName = staffName || body.staff_name;

    if (!finalStaffId || !finalStaffName) {
      return failure("Staff identification required.", null, 401);
    }

    if (!note || note.trim().length === 0) {
      return failure("Note text is required.");
    }

    // Verify lead exists
    const { data: lead, error: leadErr } = await supabase
      .from("nursing_leads")
      .select("id")
      .eq("id", id)
      .single();

    if (leadErr || !lead) {
      return failure("Lead not found", null, 404);
    }

    const { data: created, error: insertErr } = await supabase
      .from("nursing_lead_notes")
      .insert({
        lead_id: id,
        staff_id: finalStaffId,
        staff_name: finalStaffName,
        note: note.trim(),
        note_type: note_type || "general",
        call_outcome: call_outcome || null,
      })
      .select()
      .single();

    if (insertErr) {
      return failure("Failed to add note", insertErr.message, 500);
    }

    // Activity log
    logStaffActivity(finalStaffId, finalStaffName, "added_nursing_note", "nursing", { lead_id: id }, req);

    return success("Note added", created, 201);
  } catch (err) {
    return failure("Internal server error", err.message, 500);
  }
}
