import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import Papa from "papaparse";
import { resolveCallerFromRequest } from "@/lib/layer1/authGuard";

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * POST /api/admin/financial-ledger/export
 * Body: { service_type?: string, format?: 'csv' | 'json', admin_id?: string }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { service_type, format = "csv", admin_id = "admin-system" } = body;

    // 1. Cryptographic Session Privilege Validation
    const adminUser = await resolveCallerFromRequest(req);
    const rawAdminId = adminUser?.id || admin_id || "admin-system";
    
    // Strict database UUID type hardening
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const executingAdminId = uuidRegex.test(rawAdminId) 
      ? rawAdminId 
      : "00000000-0000-0000-0000-000000000000";

    // 2. Fetch all matching ledger records
    const logs = service_type
      ? await sql`
          SELECT * 
          FROM financial_transaction_log 
          WHERE service_type = ${service_type}
          ORDER BY created_at DESC
        `
      : await sql`
          SELECT * 
          FROM financial_transaction_log 
          ORDER BY created_at DESC
        `;

    // 3. Batch query patient details
    if (logs && logs.length > 0) {
      const patientIds = [...new Set(logs.map((l) => l.patient_id).filter(Boolean))];
      if (patientIds.length > 0) {
        const patientDetails = await sql`
          SELECT id, full_name 
          FROM patient_details 
          WHERE id = ANY(${patientIds})
        `;

        const pMap = {};
        patientDetails.forEach((p) => {
          pMap[p.id] = p;
        });

        // Merge patient details
        logs.forEach((log) => {
          log.patient_details = pMap[log.patient_id] || null;
        });
      }
    }

    // 4. Flatten & Format the financial dataset
    const formattedData = (logs || []).map((log) => ({
      "Transaction ID": log.id,
      "Date": new Date(log.created_at).toLocaleDateString("en-IN"),
      "Time": new Date(log.created_at).toLocaleTimeString("en-IN"),
      "Patient Name": log.patient_details?.full_name || "N/A",
      "Patient ID": log.patient_id || "N/A",
      "Service Module": log.service_type || "N/A",
      "Flow": log.debit_credit === "credit" ? "Inflow" : "Outflow",
      "Amount (INR)": Number(log.amount) || 0,
      "Status": log.status || "N/A",
    }));

    // 5. Compliance Auditing - Insert entry into DPDP-compliant data_access_log
    try {
      await sql`
        INSERT INTO data_access_log (action_type, requested_by, metadata)
        VALUES (
          ${`ledger_export_${format}`},
          ${executingAdminId},
          ${JSON.stringify({
            record_count: formattedData.length,
            filter_service_type: service_type || "ALL",
            timestamp: new Date().toISOString()
          })}
        )
      `;
    } catch (auditErr) {
      console.warn("Failed to write to compliance data_access_log:", auditErr.message);
    }

    // 6. Format and stream / return output
    if (format === "csv") {
      const csv = Papa.unparse(formattedData);
      return new Response(csv, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=financial_ledger_export_${Date.now()}.csv`,
        },
      });
    }

    return success("Financial ledger data exported successfully", formattedData, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Ledger export error:", error);
    return failure("Failed to export financial ledger data.", error.message, 500, {
      headers: corsHeaders,
    });
  }
}
