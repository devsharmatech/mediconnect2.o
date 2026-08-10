import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * API: Admin Financial Ledger
 * 
 * Provides a read-only, paginated view of the financial_transaction_log.
 * This is an immutable ledger; NO UPDATE/DELETE operations are supported here.
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

        // 1. Fetch financial logs (no join to avoid relationship error)
        let query = supabase
            .from("financial_transaction_log")
            .select("*", { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (serviceType) {
            query = query.eq("service_type", serviceType);
        } else {
            query = query.neq("service_type", "prescription"); // Hide legacy prescription entries
        }
        if (status) query = query.eq("status", status);

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
            query = query.gte("created_at", fromDate.toISOString());
        }

        if (searchQuery) {
            query = query.or(`description.ilike.%${searchQuery}%,reference_id.ilike.%${searchQuery}%,patient_id.ilike.%${searchQuery}%`);
        }

        if (chemistName) {
            const { data: chemists } = await supabase.from("chemist_details").select("id").ilike("pharmacy_name", `%${chemistName}%`);
            if (chemists && chemists.length > 0) {
                const chemistIds = chemists.map(c => c.id);
                const { data: orders } = await supabase.from("medicine_orders").select("id").in("chemist_id", chemistIds);
                if (orders && orders.length > 0) {
                    const orderIds = orders.map(o => o.id);
                    query = query.in("reference_id", orderIds);
                } else {
                    query = query.eq("id", "00000000-0000-0000-0000-000000000000");
                }
            } else {
                query = query.eq("id", "00000000-0000-0000-0000-000000000000");
            }
        }

        const { data: logs, count, error } = await query;
        if (error) throw error;

        // 2. Fetch patient names in a separate batch query
        if (logs && logs.length > 0) {
            const patientIds = [...new Set(logs.map(l => l.patient_id))];
            const { data: patientDetails } = await supabase
                .from("patient_details")
                .select("id, full_name")
                .in("id", patientIds);

            // 3. Fetch chemist names for pharmacy orders
            const pharmacyLogs = logs.filter(l => l.service_type === "pharmacy");
            let chemistMap = {};
            if (pharmacyLogs.length > 0) {
                const orderIds = pharmacyLogs.map(l => l.reference_id).filter(Boolean);
                if (orderIds.length > 0) {
                    const { data: orders } = await supabase
                        .from("medicine_orders")
                        .select("id, chemist_id, chemist_details(pharmacy_name)")
                        .in("id", orderIds);
                    
                    if (orders) {
                        orders.forEach(o => {
                            chemistMap[o.id] = o.chemist_details?.pharmacy_name || "Unknown Chemist";
                        });
                    }
                }
            }

            // 4. Merge details into logs
            logs.forEach(log => {
                log.patient_details = patientDetails?.find(p => p.id === log.patient_id) || null;
                if (log.service_type === "pharmacy") {
                    log.chemist_name = chemistMap[log.reference_id] || "N/A";
                }
            });
        }

        // Calculate summary stats
        const { data: stats } = await supabase
            .from("financial_transaction_log")
            .select("amount, debit_credit, status")
            .eq("status", "completed");

        const totalRevenue = stats?.reduce((acc, curr) => {
            return curr.debit_credit === "credit" ? acc + Number(curr.amount) : acc - Number(curr.amount);
        }, 0) || 0;

        return NextResponse.json({
            success: true,
            data: {
                logs: logs,
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
