/**
 * API: Admin Audit Logs (Privacy & Data Access)
 * 
 * GET /api/admin/audit-logs
 * 
 * Lists all legal access events (Exports, Anonymization, Withdrawals)
 */

import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = (page - 1) * limit;

        let logs = [];
        let totalCount = 0;

        try {
            const { data, count, error } = await supabase
                .from("data_access_log")
                .select("*", { count: "exact" })
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1);

            if (!error) {
                logs = data || [];
                totalCount = count || 0;

                // Fetch patient names and un_ids separately
                if (logs.length > 0) {
                    const patientIds = [...new Set(logs.map(l => l.patient_id).filter(Boolean))];
                    if (patientIds.length > 0) {
                        const [patientsRes, usersRes] = await Promise.all([
                            supabase.from("patient_details").select("id, full_name, email").in("id", patientIds),
                            supabase.from("users").select("id, un_id").in("id", patientIds)
                        ]);

                        const patients = patientsRes.data || [];
                        const usersList = usersRes.data || [];

                        const pMap = {};
                        patients.forEach(p => { pMap[p.id] = p; });

                        const uMap = {};
                        usersList.forEach(u => { uMap[u.id] = u.un_id; });

                        logs.forEach(l => {
                            const p = pMap[l.patient_id] || null;
                            if (p) {
                                p.un_id = uMap[l.patient_id] || null;
                            }
                            l.patient = p;
                        });
                    }
                }
            }
        } catch (e) {
            console.warn("data_access_log query failed (table may not exist yet):", e.message);
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
