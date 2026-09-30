import { success, failure } from "@/lib/response";
import { updateIncidentStatus } from "@/lib/layer1/incidentService";
import sql from "@/lib/db";

/**
 * GET /api/admin/incidents
 * Returns paginated ops_incident_log with summary counts from AWS RDS PostgreSQL.
 * Query params: page, limit, priority (P1|P2|P3), status (OPEN|RESOLVED|INVESTIGATING), source
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page     = parseInt(searchParams.get("page") || "1");
    const limit    = parseInt(searchParams.get("limit") || "20");
    const priority = searchParams.get("priority");
    const status   = searchParams.get("status");
    const source   = searchParams.get("source");
    const offset   = (page - 1) * limit;

    let items = [];
    let total = 0;

    try {
      if (priority && status) {
        items = await sql`
          SELECT * FROM ops_incident_log
          WHERE priority = ${priority} AND status = ${status}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const countRes = await sql`
          SELECT COUNT(*)::int as count FROM ops_incident_log
          WHERE priority = ${priority} AND status = ${status}
        `;
        total = countRes[0]?.count || 0;
      } else if (priority) {
        items = await sql`
          SELECT * FROM ops_incident_log
          WHERE priority = ${priority}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const countRes = await sql`
          SELECT COUNT(*)::int as count FROM ops_incident_log
          WHERE priority = ${priority}
        `;
        total = countRes[0]?.count || 0;
      } else if (status) {
        items = await sql`
          SELECT * FROM ops_incident_log
          WHERE status = ${status}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const countRes = await sql`
          SELECT COUNT(*)::int as count FROM ops_incident_log
          WHERE status = ${status}
        `;
        total = countRes[0]?.count || 0;
      } else {
        items = await sql`
          SELECT * FROM ops_incident_log
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        const countRes = await sql`
          SELECT reltuples::bigint as count FROM pg_class WHERE relname = 'ops_incident_log'
        `;
        total = Number(countRes[0]?.count) || 0;
      }
    } catch (e) {
      console.warn("Could not query ops_incident_log from RDS:", e.message);
    }

    // Summary counts directly from AWS RDS (sample last 1000 recent incidents for high performance)
    let p1Open = 0;
    let p2Open = 0;
    let totalOpen = 0;
    let totalResolved = 0;

    try {
      const summaryRows = await sql`
        SELECT 
          priority,
          status,
          COUNT(*)::int as count
        FROM (SELECT priority, status FROM ops_incident_log ORDER BY created_at DESC LIMIT 1000) recent
        GROUP BY priority, status
      `;
      for (const row of summaryRows) {
        const c = parseInt(row.count, 10);
        if (row.status === 'OPEN') {
          totalOpen += c;
          if (row.priority === 'P1') p1Open += c;
          if (row.priority === 'P2') p2Open += c;
        }
        if (row.status === 'RESOLVED') {
          totalResolved += c;
        }
      }
    } catch {}

    const summary = {
      p1_open:        p1Open,
      p2_open:        p2Open,
      total_open:     totalOpen,
      total_resolved: totalResolved,
    };

    return success("Incidents fetched (AWS RDS)", {
      items: Array.isArray(items) ? items : [],
      summary,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      database: "AWS RDS PostgreSQL"
    });
  } catch (err) {
    console.error("GET /api/admin/incidents error:", err);
    return failure("Failed to fetch incidents", err.message, 500);
  }
}

/**
 * PATCH /api/admin/incidents
 * Body: { incident_id, status, admin_id, reason }
 * Updates incident status in AWS RDS PostgreSQL.
 */
export async function PATCH(req) {
  try {
    const { incident_id, status, admin_id, reason } = await req.json();

    if (!incident_id || !status || !admin_id || !reason) {
      return failure("incident_id, status, admin_id, and reason are required", null, 400);
    }

    const allowedStatuses = ["RESOLVED", "INVESTIGATING", "SUPPRESSED", "OPEN"];
    if (!allowedStatuses.includes(status)) {
      return failure(`status must be one of: ${allowedStatuses.join(", ")}`, null, 400);
    }

    await updateIncidentStatus(incident_id, status, admin_id);

    // Log admin action directly to AWS RDS
    try {
      await sql`
        INSERT INTO admin_action_log (
          admin_id, action_type, target_table, target_id, reason, input_payload, status
        ) VALUES (
          ${admin_id}, 'RESOLVE_INCIDENT', 'ops_incident_log', ${incident_id},
          ${reason}, ${JSON.stringify({ incident_id, status })}, 'SUCCESS'
        )
      `;
    } catch (e) {
      console.warn("Could not insert admin_action_log in RDS:", e.message);
    }

    return success("Incident status updated (AWS RDS)", { incident_id, new_status: status });
  } catch (err) {
    console.error("PATCH /api/admin/incidents error:", err);
    return failure("Failed to update incident", err.message, 500);
  }
}
