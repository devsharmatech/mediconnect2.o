export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

// Ensure the table exists in AWS RDS
async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS doctor_profile_change_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      doctor_id UUID NOT NULL,
      field_name VARCHAR(100) NOT NULL,
      current_value TEXT,
      proposed_value TEXT NOT NULL,
      reason TEXT,
      status VARCHAR(30) DEFAULT 'pending',
      reviewer_notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `.catch((err) => console.warn("Could not create doctor_profile_change_requests table:", err?.message));
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const doctor_id = searchParams.get("doctor_id");

    if (!doctor_id) {
      return failure("doctor_id is required", null, 400, { headers: corsHeaders });
    }

    await ensureTable();

    const requests = await sql`
      SELECT 
        id,
        doctor_id,
        field_name,
        current_value,
        proposed_value,
        reason,
        status,
        reviewer_notes,
        created_at,
        updated_at
      FROM doctor_profile_change_requests
      WHERE doctor_id = ${doctor_id}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return success("Change requests fetched successfully", requests, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Change requests GET error:", error);
    return failure("Failed to fetch change requests", error.message, 500, { headers: corsHeaders });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { doctor_id, field_name, current_value, proposed_value, reason } = body;

    if (!doctor_id || !field_name || !proposed_value) {
      return failure("doctor_id, field_name, and proposed_value are required", null, 400, { headers: corsHeaders });
    }

    // Code 3 locked fields cannot have change requests submitted through doctor profile
    const lockedFields = ["license_number", "registration_number", "council_name", "kyc_status", "onboarding_status", "doctor_id", "ratings"];
    if (lockedFields.includes(String(field_name).toLowerCase())) {
      return failure("This credential field is locked and can only be updated through Compliance verification.", null, 403, { headers: corsHeaders });
    }

    await ensureTable();

    const [created] = await sql`
      INSERT INTO doctor_profile_change_requests (
        doctor_id,
        field_name,
        current_value,
        proposed_value,
        reason,
        status
      ) VALUES (
        ${doctor_id},
        ${field_name},
        ${current_value !== undefined ? String(current_value) : null},
        ${String(proposed_value)},
        ${reason || null},
        'pending'
      )
      RETURNING *;
    `;

    return success(
      "Change request submitted for verification. Approved value remains live until reviewed.",
      created,
      201,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Change request POST error:", error);
    return failure("Failed to submit change request", error.message, 500, { headers: corsHeaders });
  }
}
