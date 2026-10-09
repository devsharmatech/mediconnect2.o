import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// GET — Single lab details for patient view directly from AWS RDS
export async function GET(req, { params }) {
    try {
        const { id } = await params;

        if (!id) {
            return failure("Lab ID is required", null, 400, { headers: corsHeaders });
        }

        const rows = await sql`
            SELECT 
                ld.id,
                ld.lab_name,
                ld.owner_name,
                ld.email,
                ld.logo_url,
                COALESCE(ld.phone_number, u.phone_number) as phone_number,
                ld.contact_person,
                ld.address,
                ld.latitude,
                ld.longitude,
                ld.license_number,
                ld.opening_hours,
                ld.services,
                ld.accepts_home_collection,
                ld.general_turnaround,
                ld.rating,
                ld.total_reviews,
                u.id as user_id,
                u.profile_picture,
                u.role
            FROM lab_details ld
            LEFT JOIN users u ON u.id = ld.id
            WHERE ld.id = ${id}
              AND ld.onboarding_status = 'approved'
            LIMIT 1
        `;

        if (rows.length === 0) {
            return failure("Lab not found or not approved", null, 404);
        }

        const lab = rows[0];

        // Log activity if patient_id provided
        const patient_id = new URL(req.url).searchParams.get("patient_id");
        if (patient_id) {
            try {
                await sql`
                    INSERT INTO lab_activity_logs (lab_id, action, performed_by, details)
                    VALUES (${id}, 'PATIENT_VIEW_LAB', ${patient_id}, ${JSON.stringify({ timestamp: new Date().toISOString() })}::jsonb)
                `;
            } catch (logErr) {
                console.warn("Failed to log lab activity:", logErr.message);
            }
        }

        return success("Lab details fetched successfully", lab, 200);
    } catch (err) {
        console.error("GET /api/patient/lab/labs/[id] error:", err);
        return failure("Failed to fetch lab details", err.message, 500);
    }
}
