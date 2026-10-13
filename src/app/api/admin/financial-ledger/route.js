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
        } else {
            conditions.push(sql`status != 'initiated'`);
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
            conditions.push(sql`(
                description ILIKE ${pattern} 
                OR reference_id::text ILIKE ${pattern} 
                OR patient_id::text ILIKE ${pattern} 
                OR metadata::text ILIKE ${pattern}
                OR payment_gateway_id ILIKE ${pattern}
                OR patient_id IN (SELECT id FROM patient_details WHERE full_name ILIKE ${pattern})
            )`);
        }

        const vendorName = searchParams.get("vendor_name") || searchParams.get("chemist_name");
        if (vendorName) {
            const vPattern = `%${vendorName}%`;
            conditions.push(sql`(
                metadata::text ILIKE ${vPattern}
                OR description ILIKE ${vPattern}
                OR reference_id IN (
                    SELECT id FROM medicine_orders WHERE chemist_id IN (
                        SELECT id FROM chemist_details WHERE pharmacy_name ILIKE ${vPattern} OR owner_name ILIKE ${vPattern}
                    )
                    UNION
                    SELECT id FROM appointments WHERE doctor_id IN (
                        SELECT id FROM doctor_details WHERE full_name ILIKE ${vPattern}
                    )
                    UNION
                    SELECT id FROM lab_test_orders WHERE lab_id IN (
                        SELECT id FROM lab_details WHERE lab_name ILIKE ${vPattern}
                    )
                )
            )`);
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

        // Fetch patient names & provider names (doctors, chemists, labs)
        if (logs && logs.length > 0) {
            const patientIds = [...new Set(logs.map(l => l.patient_id).filter(Boolean))];
            const patientDetails = patientIds.length > 0
                ? await sql`SELECT id, full_name FROM patient_details WHERE id = ANY(${patientIds})`
                : [];

            const pMap = {};
            patientDetails.forEach(p => { pMap[p.id] = p; });

            // Pharmacy / Chemist resolution
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
                        chemistMap[o.id] = o.pharmacy_name || "Pharmacy";
                    });
                }
            }

            // Doctor / Consultation resolution
            const consultationLogs = logs.filter(l => l.service_type === "consultation");
            const doctorMap = {};
            if (consultationLogs.length > 0) {
                const apptIds = consultationLogs.map(l => l.reference_id).filter(Boolean);
                if (apptIds.length > 0) {
                    const appts = await sql`
                        SELECT a.id, d.full_name
                        FROM appointments a
                        LEFT JOIN doctor_details d ON a.doctor_id = d.id
                        WHERE a.id = ANY(${apptIds})
                    `;
                    appts.forEach(a => {
                        doctorMap[a.id] = a.full_name ? (a.full_name.startsWith("Dr.") ? a.full_name : `Dr. ${a.full_name}`) : "Doctor";
                    });
                }
            }

            // Lab resolution
            const labLogs = logs.filter(l => l.service_type === "lab");
            const labMap = {};
            if (labLogs.length > 0) {
                const labOrderIds = labLogs.map(l => l.reference_id).filter(Boolean);
                if (labOrderIds.length > 0) {
                    const labOrders = await sql`
                        SELECT l.id, ld.lab_name
                        FROM lab_test_orders l
                        LEFT JOIN lab_details ld ON l.lab_id = ld.id
                        WHERE l.id = ANY(${labOrderIds})
                    `;
                    labOrders.forEach(lo => {
                        labMap[lo.id] = lo.lab_name || "Diagnostic Lab";
                    });
                }
            }

            logs.forEach(log => {
                log.patient_details = pMap[log.patient_id] || null;

                let provider = null;
                if (log.service_type === "pharmacy") {
                    provider = chemistMap[log.reference_id] || log.metadata?.pharmacy_name || "Pharmacy";
                    log.chemist_name = provider;
                } else if (log.service_type === "consultation") {
                    provider = doctorMap[log.reference_id] || log.metadata?.doctor_name || "Doctor";
                    log.doctor_name = provider;
                } else if (log.service_type === "lab") {
                    provider = labMap[log.reference_id] || log.metadata?.lab_name || "Diagnostic Lab";
                    log.lab_name = provider;
                } else {
                    provider = log.metadata?.provider_name || log.metadata?.doctor_name || log.metadata?.pharmacy_name || log.metadata?.lab_name || "—";
                }

                log.provider_name = provider;
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
