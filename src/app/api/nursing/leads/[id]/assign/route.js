/**
 * Nursing Lead Assignment API (Admin only)
 * POST   - Assign a lead to a staff member (creates nursing_lead_assignments record)
 * DELETE - Unassign a staff member from a lead
 * GET    - Get all assignments for a lead
 * 
 * This is the ONLY way staff get access to nursing leads.
 * No staff can see a lead unless a record exists in nursing_lead_assignments.
 */
import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";

export async function GET(req, context) {
  try {
    const { id } = await context.params;

    const { data, error } = await supabase
      .from("nursing_lead_assignments")
      .select("*, staffs(id, full_name, employee_code, designation, department)")
      .eq("lead_id", id)
      .order("assigned_at", { ascending: false });

    if (error) {
      return failure("Failed to fetch assignments", error.message, 500);
    }

    return success("Assignments fetched", data || []);
  } catch (err) {
    return failure("Internal server error", err.message, 500);
  }
}

export async function POST(req, context) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { staff_id, admin_id } = body;

    if (!staff_id) {
      return failure("Staff ID is required.");
    }

    // Verify lead exists
    const { data: lead, error: leadErr } = await supabase
      .from("nursing_leads")
      .select("id, lead_id")
      .eq("id", id)
      .single();

    if (leadErr || !lead) {
      return failure("Lead not found", null, 404);
    }

    // Verify staff exists and is active
    const { data: staff, error: staffErr } = await supabase
      .from("staffs")
      .select("id, full_name, is_active")
      .eq("id", staff_id)
      .is("deleted_at", null)
      .single();

    if (staffErr || !staff) {
      return failure("Staff member not found", null, 404);
    }

    if (!staff.is_active) {
      return failure("Cannot assign to an inactive staff member.");
    }

    // Check if staff has view_nursing permission
    const { data: perm } = await supabase
      .from("staff_permissions_master")
      .select("id")
      .eq("key", "view_nursing")
      .single();

    if (perm) {
      // Check override first
      const { data: override } = await supabase
        .from("staff_permission_overrides")
        .select("can_view")
        .eq("staff_id", staff_id)
        .eq("permission_id", perm.id)
        .single();

      if (override) {
        if (!override.can_view) {
          return failure("Staff does not have nursing view permission. Grant it first via Permissions page.");
        }
      } else {
        // Check role-based
        const { data: staffRole } = await supabase
          .from("staffs")
          .select("role_id")
          .eq("id", staff_id)
          .single();

        if (staffRole?.role_id) {
          const { data: rolePerm } = await supabase
            .from("staff_role_permissions")
            .select("id")
            .eq("role_id", staffRole.role_id)
            .eq("permission_id", perm.id)
            .single();

          if (!rolePerm) {
            return failure("Staff does not have nursing view permission. Grant it first via Permissions page.");
          }
        } else {
          return failure("Staff has no role assigned and no nursing permission override.");
        }
      }
    }

    // Create assignment
    const { data: assignment, error: insertErr } = await supabase
      .from("nursing_lead_assignments")
      .insert({
        lead_id: id,
        staff_id,
        assigned_by: admin_id || null,
      })
      .select("*, staffs(id, full_name, employee_code)")
      .single();

    if (insertErr) {
      if (insertErr.code === "23505") {
        return failure("This staff is already assigned to this lead.");
      }
      return failure("Failed to create assignment", insertErr.message, 500);
    }

    // Also update the legacy assigned_staff_id field on the lead
    await supabase
      .from("nursing_leads")
      .update({ assigned_staff_id: staff_id, updated_at: new Date().toISOString() })
      .eq("id", id);

    // Add audit note
    await supabase.from("nursing_lead_notes").insert({
      lead_id: id,
      staff_id: admin_id || staff_id,
      staff_name: "Admin",
      note: `Lead assigned to ${staff.full_name}`,
      note_type: "general",
    });

    return success("Staff assigned to lead", assignment, 201);
  } catch (err) {
    console.error("Assignment error:", err);
    return failure("Internal server error", err.message, 500);
  }
}

export async function DELETE(req, context) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const staff_id = searchParams.get("staff_id");

    if (!staff_id) {
      return failure("Staff ID is required.");
    }

    const { error } = await supabase
      .from("nursing_lead_assignments")
      .delete()
      .eq("lead_id", id)
      .eq("staff_id", staff_id);

    if (error) {
      return failure("Failed to remove assignment", error.message, 500);
    }

    // Check if there are other assignments; if not, clear legacy field
    const { data: remaining } = await supabase
      .from("nursing_lead_assignments")
      .select("staff_id")
      .eq("lead_id", id)
      .limit(1);

    if (!remaining || remaining.length === 0) {
      await supabase
        .from("nursing_leads")
        .update({ assigned_staff_id: null, updated_at: new Date().toISOString() })
        .eq("id", id);
    }

    return success("Staff unassigned from lead");
  } catch (err) {
    return failure("Internal server error", err.message, 500);
  }
}
