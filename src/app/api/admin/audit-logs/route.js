/**
 * API: Admin Audit Logs (Privacy & Data Access)
 * 
 * GET /api/admin/audit-logs
 * 
 * Lists all legal access events (Exports, Anonymization, Withdrawals)
 */

import { success, failure } from "@/lib/response";
import sql from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = (page - 1) * limit;

        let logs = [];
        let totalCount = 0;

        try {
            const [countRes, logsRes] = await Promise.all([
                sql`SELECT count(*)::int as count FROM data_access_log`,
                sql`
                    SELECT * 
                    FROM data_access_log 
                    ORDER BY created_at DESC 
                    LIMIT ${limit} OFFSET ${offset}
                `
            ]);

            totalCount = countRes[0]?.count || 0;
            logs = logsRes || [];

            // Fetch patient names and un_ids
            if (logs.length > 0) {
                const patientIds = [...new Set(logs.map(l => l.patient_id).filter(Boolean))];
                if (patientIds.length > 0) {
                    const [patientsRes, usersRes] = await Promise.all([
                        sql`SELECT id, full_name, email FROM patient_details WHERE id = ANY(${patientIds})`,
                        sql`SELECT id, un_id FROM users WHERE id = ANY(${patientIds})`
                    ]);

                    const pMap = {};
                    (patientsRes || []).forEach(p => { pMap[p.id] = p; });

                    const uMap = {};
                    (usersRes || []).forEach(u => { uMap[u.id] = u.un_id; });

                    logs.forEach(l => {
                        const p = pMap[l.patient_id] ? { ...pMap[l.patient_id] } : null;
                        if (p) {
                            p.un_id = uMap[l.patient_id] || null;
                        }
                        l.patient = p;
                    });
                }
            }
        } catch (e) {
            console.warn("data_access_log query failed (table may not exist or query error):", e.message);
        }

        return success("Audit logs retrieved", {
            logs,
            pagination: { page, limit, total: totalCount }
        });

    } catch (err) {
        console.error("GET /api/admin/audit-logs error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
