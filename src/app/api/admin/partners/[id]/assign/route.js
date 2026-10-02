/**
 * Admin: Assign a lead to a partner
 * POST - Assign lead
 * DELETE - Remove assignment
 */
import sql from "@/lib/db";
import { success, failure } from "@/lib/response";

export async function POST(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { lead_id, lead_type, notes } = body;

    if (!lead_id || !lead_type) {
      return failure("lead_id and lead_type are required.", null, 400);
    }

    if (!["nursing", "equipment"].includes(lead_type)) {
      return failure("lead_type must be 'nursing' or 'equipment'.", null, 400);
    }

    // Verify partner exists and offers the service
    const [partner] = await sql`SELECT id, name, services FROM nursing_partners WHERE id = ${id} LIMIT 1`;
    if (!partner) return failure("Partner not found.", null, 404);

    if (!partner.services || !partner.services.includes(lead_type)) {
      return failure(`Partner does not offer "${lead_type}" services.`, null, 400);
    }

    // Insert assignment (ignore duplicate)
    await sql`
      INSERT INTO partner_lead_assignments (partner_id, lead_id, lead_type, notes)
      VALUES (${id}, ${lead_id}, ${lead_type}, ${notes || null})
      ON CONFLICT (partner_id, lead_id, lead_type) DO NOTHING
    `;

    // Update lead status to SHARED_WITH_PARTNER
    if (lead_type === "nursing") {
      await sql`
        UPDATE nursing_leads
        SET lead_status = 'SHARED_WITH_PARTNER', updated_at = NOW()
        WHERE lead_id = ${lead_id}
      `;
    } else if (lead_type === "equipment") {
      await sql`
        UPDATE medical_equipment_leads
        SET lead_status = 'SHARED_WITH_PARTNER', updated_at = NOW()
        WHERE lead_id = ${lead_id}
      `;
    }

    return success(`Lead ${lead_id} assigned to ${partner.name}.`, null);
  } catch (err) {
    console.error("[Admin Partners] Assign lead error:", err);
    return failure("Failed to assign lead.", err.message, 500);
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const lead_id = searchParams.get("lead_id");
    const lead_type = searchParams.get("lead_type");

    if (!lead_id || !lead_type) {
      return failure("lead_id and lead_type are required.", null, 400);
    }

    await sql`
      DELETE FROM partner_lead_assignments
      WHERE partner_id = ${id} AND lead_id = ${lead_id} AND lead_type = ${lead_type}
    `;

    return success("Assignment removed.", null);
  } catch (err) {
    console.error("[Admin Partners] Remove assignment error:", err);
    return failure("Failed to remove assignment.", err.message, 500);
  }
}
