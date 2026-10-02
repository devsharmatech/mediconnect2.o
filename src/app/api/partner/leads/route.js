/**
 * Partner Leads API
 * GET  - Fetch leads assigned to this partner (nursing + equipment)
 * Auth: partner_id passed as query param or header (simple session-based)
 */
import sql from "@/lib/db";
import { success, failure } from "@/lib/response";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get("partner_id");
    const leadType = searchParams.get("type") || "all"; // nursing | equipment | all
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    if (!partnerId) {
      return failure("partner_id is required.", null, 401);
    }

    // Verify partner exists and is active
    const partners = await sql`
      SELECT id, name, is_active FROM nursing_partners WHERE id = ${partnerId} LIMIT 1
    `;
    if (partners.length === 0 || !partners[0].is_active) {
      return failure("Unauthorized.", null, 401);
    }

    // Get all lead assignments for this partner
    let assignmentQuery = sql`
      SELECT lead_id, lead_type, assigned_at, notes
      FROM partner_lead_assignments
      WHERE partner_id = ${partnerId}
    `;

    const assignments = await assignmentQuery;

    if (assignments.length === 0) {
      return success("No leads assigned.", { nursing: [], equipment: [], total: 0 });
    }

    // Separate by type
    const nursingIds = assignments.filter(a => a.lead_type === "nursing").map(a => a.lead_id);
    const equipmentIds = assignments.filter(a => a.lead_type === "equipment").map(a => a.lead_id);

    let nursingLeads = [];
    let equipmentLeads = [];

    if (nursingIds.length > 0 && (leadType === "all" || leadType === "nursing")) {
      nursingLeads = await sql`
        SELECT *
        FROM nursing_leads
        WHERE lead_id = ANY(${nursingIds})
        ORDER BY created_at DESC
      `;
    }

    if (equipmentIds.length > 0 && (leadType === "all" || leadType === "equipment")) {
      equipmentLeads = await sql`
        SELECT *
        FROM medical_equipment_leads
        WHERE lead_id = ANY(${equipmentIds})
        ORDER BY created_at DESC
      `;
    }

    // Enrich with assignment metadata
    const assignmentMap = {};
    assignments.forEach(a => {
      assignmentMap[`${a.lead_type}:${a.lead_id}`] = a;
    });

    const enrichNursing = nursingLeads.map(l => ({
      ...l,
      type: "nursing",
      assigned_at: assignmentMap[`nursing:${l.lead_id}`]?.assigned_at || null,
      partner_notes: assignmentMap[`nursing:${l.lead_id}`]?.notes || null,
    }));

    const enrichEquipment = equipmentLeads.map(l => ({
      ...l,
      type: "equipment",
      assigned_at: assignmentMap[`equipment:${l.lead_id}`]?.assigned_at || null,
      partner_notes: assignmentMap[`equipment:${l.lead_id}`]?.notes || null,
    }));

    return success("Leads fetched.", {
      nursing: enrichNursing,
      equipment: enrichEquipment,
      total: enrichNursing.length + enrichEquipment.length,
    });
  } catch (err) {
    console.error("[Partner Leads] Error:", err);
    return failure("Failed to fetch leads.", err.message, 500);
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    const { partner_id, lead_id, lead_type, status, notes } = body;

    if (!partner_id || !lead_id || !lead_type) {
      return failure("partner_id, lead_id, and lead_type are required.", null, 400);
    }

    // Verify assignment belongs to this partner
    const assignments = await sql`
      SELECT id FROM partner_lead_assignments
      WHERE partner_id = ${partner_id}::uuid AND lead_id = ${lead_id} AND lead_type = ${lead_type}
      LIMIT 1
    `;

    if (assignments.length === 0) {
      return failure("Assignment not found for this partner.", null, 404);
    }

    // Update lead status in main table if status provided
    if (status) {
      if (lead_type === "nursing") {
        await sql`
          UPDATE nursing_leads
          SET lead_status = ${status}, updated_at = NOW()
          WHERE lead_id = ${lead_id}
        `;
      } else if (lead_type === "equipment") {
        await sql`
          UPDATE medical_equipment_leads
          SET lead_status = ${status}, updated_at = NOW()
          WHERE lead_id = ${lead_id}
        `;
      }
    }

    // Update partner notes in partner_lead_assignments if notes provided
    if (notes !== undefined) {
      await sql`
        UPDATE partner_lead_assignments
        SET notes = ${notes}
        WHERE partner_id = ${partner_id}::uuid AND lead_id = ${lead_id} AND lead_type = ${lead_type}
      `;
    }

    return success("Lead updated successfully.", { lead_id, status, notes });
  } catch (err) {
    console.error("[Partner Leads] PATCH error:", err);
    return failure("Failed to update lead.", err.message, 500);
  }
}
