import { NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = 'force-dynamic';

/**
 * API: Admin Financial Ledger
 * 
 * Provides a read-only, paginated view of the financial_transaction_log via AWS RDS PostgreSQL.
 * Immutable ledger; NO UPDATE/DELETE operations supported here.
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page")) || 1;
        const limit = parseInt(searchParams.get("limit")) || 20;
        const offset = (page - 1) * limit;

        const serviceType = searchParams.get("service_type");
        const status = searchParams.get("status");
        const dateFilter = searchParams.get("date_filter");
        const searchQuery = searchParams.get("search");
        const chemistName = searchParams.get("chemist_name");

        const conditions = [];

        if (serviceType) {
            conditions.push(sql`service_type = ${serviceType}`);
        } else {
            conditions.push(sql`service_type != 'prescription'`);
        }

        if (status) {
            conditions.push(sql`status = ${status}`);
        }

        if (dateFilter) {
            const now = new Date();
            let fromDate = new Date();
            if (dateFilter === "days") {
                fromDate.setDate(now.getDate() - 1);
            } else if (dateFilter === "weeks") {
                fromDate.setDate(now.getDate() - 7);
            } else if (dateFilter === "month") {
                fromDate.setMonth(now.getMonth() - 1);
            }
            conditions.push(sql`created_at >= ${fromDate.toISOString()}`);
        }

        if (searchQuery) {
            const pattern = `%${searchQuery}%`;
            conditions.push(sql`(description ILIKE ${pattern} OR reference_id ILIKE ${pattern} OR patient_id ILIKE ${pattern})`);
        }

        if (chemistName) {
            const chemists = await sql`SELECT id FROM chemist_details WHERE pharmacy_name ILIKE ${'%' + chemistName + '%'}`;
            if (chemists.length > 0) {
                const chemistIds = chemists.map(c => c.id);
                const orders = await sql`SELECT id FROM medicine_orders WHERE chemist_id = ANY(${chemistIds})`;
                if (orders.length > 0) {
                    const orderIds = orders.map(o => o.id);
                    conditions.push(sql`reference_id = ANY(${orderIds})`);
                } else {
                    conditions.push(sql`1=0`);
                }
            } else {
                conditions.push(sql`1=0`);
            }
        }

        const whereClause = conditions.length > 0
            ? sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`
            : sql``;

        const [countRes, logs, statsRes] = await Promise.all([
            sql`SELECT count(*)::int as count FROM financial_transaction_log ${whereClause}`,
            sql`SELECT * FROM financial_transaction_log ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
            sql`
                SELECT COALESCE(SUM(CASE WHEN debit_credit = 'debit' THEN -amount ELSE amount END), 0)::numeric as total_revenue
                FROM financial_transaction_log
                WHERE status IN ('completed', 'success', 'paid') AND amount > 0
            `
        ]);

        const count = countRes[0]?.count || 0;
        const totalRevenue = Math.max(0, Number(statsRes[0]?.total_revenue) || 0);

        // Fetch patient names & chemist names
        if (logs && logs.length > 0) {
            const patientIds = [...new Set(logs.map(l => l.patient_id).filter(Boolean))];
            const patientDetails = patientIds.length > 0
                ? await sql`SELECT id, full_name FROM patient_details WHERE id = ANY(${patientIds})`
                : [];

            const pMap = {};
            patientDetails.forEach(p => { pMap[p.id] = p; });

            const pharmacyLogs = logs.filter(l => l.service_type === "pharmacy");
            const chemistMap = {};
            if (pharmacyLogs.length > 0) {
                const orderIds = pharmacyLogs.map(l => l.reference_id).filter(Boolean);
                if (orderIds.length > 0) {
                    const orders = await sql`
                        SELECT m.id, c.pharmacy_name
                        FROM medicine_orders m
                        LEFT JOIN chemist_details c ON m.chemist_id = c.id
                        WHERE m.id = ANY(${orderIds})
                    `;
                    orders.forEach(o => {
                        chemistMap[o.id] = o.pharmacy_name || "Unknown Chemist";
                    });
                }
            }

            logs.forEach(log => {
                log.patient_details = pMap[log.patient_id] || null;
                if (log.service_type === "pharmacy") {
                    log.chemist_name = chemistMap[log.reference_id] || "N/A";
                }
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                logs,
                summary: {
                    total_count: count,
                    total_revenue: totalRevenue,
                },
                pagination: {
                    page,
                    limit,
                    total: count,
                },
            },
        });
    } catch (error) {
        console.error("Financial ledger API error:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
