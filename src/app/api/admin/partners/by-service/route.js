/**
 * GET /api/admin/partners/by-service?service=nursing|equipment
 * Returns active partners that offer the given service.
 * Used by the lead assignment modal to show only relevant partners.
 */
import sql from "@/lib/db";
import { success, failure } from "@/lib/response";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const service = searchParams.get("service");

    if (!service || !["nursing", "equipment"].includes(service)) {
      return failure("service must be 'nursing' or 'equipment'.", null, 400);
    }

    const partners = await sql`
      SELECT
        p.id,
        p.name,
        p.phone,
        p.city,
        p.services,
        COUNT(pla.id) AS total_assigned
      FROM nursing_partners p
      LEFT JOIN partner_lead_assignments pla ON pla.partner_id = p.id
      WHERE p.is_active = true
        AND ${service} = ANY(p.services)
      GROUP BY p.id
      ORDER BY p.name ASC
    `;

    return success("Partners fetched.", { partners });
  } catch (err) {
    console.error("[Partners by-service] error:", err);
    return failure("Failed to fetch partners.", err.message, 500);
  }
}
