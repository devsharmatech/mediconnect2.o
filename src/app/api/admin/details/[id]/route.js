import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(_, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return failure("Missing admin ID.", "validation_error", 400, { headers: corsHeaders });
    }

    // Query user + admin details joined from AWS RDS PostgreSQL
    const rows = await sql`
      SELECT 
        u.id,
        u.phone_number,
        u.role,
        u.profile_picture,
        u.is_verified,
        u.created_at,
        u.updated_at,
        ad.full_name,
        ad.email,
        ad.permissions,
        ad.created_at AS admin_details_created_at
      FROM users u
      LEFT JOIN admin_details ad ON ad.id = u.id
      WHERE u.id = ${id} AND u.role = 'admin'
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      return failure("Admin not found.", "not_found", 404, { headers: corsHeaders });
    }

    const row = rows[0];
    const data = {
      id: row.id,
      phone_number: row.phone_number,
      role: row.role,
      profile_picture: row.profile_picture,
      is_verified: row.is_verified,
      created_at: row.created_at,
      updated_at: row.updated_at,
      admin_details: {
        full_name: row.full_name || "Dev Sharma",
        email: row.email || "admin@mediconnect.fit",
        permissions: row.permissions || {
          users: true,
          content: true,
          settings: true,
          analytics: true,
          manage_labs: true,
          manage_users: true,
          view_reports: true,
          manage_doctors: true,
          manage_chemists: true,
          manage_patients: true,
          update_settings: true,
          approve_onboarding: true,
        },
        created_at: row.admin_details_created_at || row.created_at,
      },
    };

    return success("Admin details fetched successfully.", data, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Fetch admin details error:", err);
    return failure("Failed to fetch admin details. " + err.message, "admin_fetch_failed", 500, {
      headers: corsHeaders,
    });
  }
}
