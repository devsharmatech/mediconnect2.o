import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { success, failure } from "@/lib/response";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/refunds/eligible
 * Returns searchable real transactions from financial_transaction_log
 * so the admin can select authentic transactions for refund.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const limit  = Math.min(parseInt(searchParams.get("limit") || "30", 10), 100);

    let rows = [];

    if (search) {
      const pattern = `%${search}%`;
      rows = await sql`
        SELECT 
          f.id,
          f.patient_id,
          f.care_episode_id,
          f.service_type,
          f.reference_id,
          f.amount,
          f.payment_gateway_id,
          f.payment_mode,
          f.description,
          f.created_at,
          u.un_id as patient_un_id,
          COALESCE(pd.full_name, 'Patient #' || u.un_id) as patient_name,
          u.phone_number as patient_phone
        FROM financial_transaction_log f
        LEFT JOIN users u ON u.id::text = f.patient_id::text
        LEFT JOIN patient_details pd ON pd.id::text = f.patient_id::text
        WHERE f.debit_credit = 'credit' 
          AND f.status = 'success'
          AND (
            f.payment_gateway_id ILIKE ${pattern}
            OR f.description ILIKE ${pattern}
            OR pd.full_name ILIKE ${pattern}
            OR u.un_id::text ILIKE ${pattern}
            OR u.phone_number ILIKE ${pattern}
          )
        ORDER BY f.created_at DESC
        LIMIT ${limit}
      `;
    } else {
      rows = await sql`
        SELECT 
          f.id,
          f.patient_id,
          f.care_episode_id,
          f.service_type,
          f.reference_id,
          f.amount,
          f.payment_gateway_id,
          f.payment_mode,
          f.description,
          f.created_at,
          u.un_id as patient_un_id,
          COALESCE(pd.full_name, 'Patient #' || u.un_id) as patient_name,
          u.phone_number as patient_phone
        FROM financial_transaction_log f
        LEFT JOIN users u ON u.id::text = f.patient_id::text
        LEFT JOIN patient_details pd ON pd.id::text = f.patient_id::text
        WHERE f.debit_credit = 'credit' 
          AND f.status = 'success'
        ORDER BY f.created_at DESC
        LIMIT ${limit}
      `;
    }

    return success("Eligible transactions fetched", rows || []);
  } catch (err) {
    console.error("GET /api/admin/refunds/eligible error:", err);
    return failure("Failed to fetch eligible transactions", err.message, 500);
  }
}
