/**
 * Admin: Medical Equipment Leads API
 * GET - List equipment leads with filters and pagination
 */
import sql from "@/lib/db";
import { success, failure } from "@/lib/response";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    let conditions = [];
    let params = [];

    if (status && status !== "ALL") {
      conditions.push(`lead_status = $${params.length + 1}`);
      params.push(status);
    }

    if (search) {
      const idx = params.length + 1;
      conditions.push(`(name ILIKE $${idx} OR phone ILIKE $${idx} OR lead_id ILIKE $${idx} OR city ILIKE $${idx})`);
      params.push(`%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const leads = await sql.unsafe(
      `SELECT * FROM medical_equipment_leads ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    const countResult = await sql.unsafe(
      `SELECT COUNT(*) as cnt FROM medical_equipment_leads ${whereClause}`,
      params
    );

    const total = parseInt(countResult[0]?.cnt || "0");

    // Add SLA info
    const enriched = leads.map((lead) => {
      const now = Date.now();
      const createdAt = new Date(lead.created_at).getTime();
      const minutesSinceCreated = Math.floor((now - createdAt) / 60000);
      let sla = "green";
      if (minutesSinceCreated > 120) sla = "red";
      else if (minutesSinceCreated > 60) sla = "amber";
      return { ...lead, minutes_since_created: minutesSinceCreated, sla };
    });

    return success("Equipment leads fetched.", { leads: enriched, total, page, limit });
  } catch (err) {
    console.error("[Equipment Leads] GET error:", err);
    return failure("Failed to fetch equipment leads.", err.message, 500);
  }
}
