import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { resolveCallerFromRequest } from "@/lib/layer1/authGuard";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { user_id } = await req.json();
    if (!user_id)
      return failure("User ID is required.", null, 400, { headers: corsHeaders });

    const caller = await resolveCallerFromRequest(req, user_id);
    if (!caller) {
      return failure("Unauthorized - missing or invalid token.", null, 401, { headers: corsHeaders });
    }

    if (caller.id !== user_id && caller.role !== "admin") {
      return failure("Forbidden - access denied to this profile.", null, 403, { headers: corsHeaders });
    }

    // 🧩 Get base user
    const [user] = await sql`
      SELECT id, un_id, role, phone_number, profile_picture, is_verified, created_at
      FROM users
      WHERE id = ${user_id}
      LIMIT 1
    `;

    if (!user)
      return failure("User not found.", null, 404, { headers: corsHeaders });

    const roleTables = {
      admin: "admin_details",
      doctor: "doctor_details",
      patient: "patient_details",
      chemist: "chemist_details",
      pharmacist: "pharmacist_details",
      lab: "lab_details",
    };

    const table = roleTables[user.role];
    if (!table)
      return failure("Invalid role or missing role mapping.", null, 400, {
        headers: corsHeaders,
      });

    // 🧩 Fetch role details
    const [details] = await sql.unsafe(
      `SELECT * FROM ${table} WHERE id = $1 LIMIT 1`,
      [user.id]
    );

    if (!details)
      return failure("Profile details not found.", null, 404, { headers: corsHeaders });

    let cleanPic = user.profile_picture;
    if (cleanPic) {
      cleanPic = String(cleanPic).replace(/^'+|'+$/g, "").replace(/::text$/i, "").trim();
      if (!cleanPic.startsWith("http") || cleanPic.includes("::text")) cleanPic = null;
    }
    if (!cleanPic) {
      const name = details?.full_name || details?.owner_name || details?.lab_name || user.role || "User";
      cleanPic = `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=0067A1&color=fff&bold=true`;
    }

    return success(
      "Profile fetched successfully.",
      { ...user, profile_picture: cleanPic, details },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Get Profile Error:", error);
    return failure("Failed to fetch profile.", error.message, 500, { headers: corsHeaders });
  }
}
