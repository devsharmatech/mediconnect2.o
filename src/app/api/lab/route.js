import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { min_rating, city, license_number, lab_name, id } = body || {};

    const conditions = [
      sql`u.role = 'lab'`,
      sql`l.onboarding_status = 'approved'`
    ];

    if (id && UUID_REGEX.test(id)) conditions.push(sql`l.id = ${id}`);
    if (min_rating) conditions.push(sql`l.rating >= ${Number(min_rating)}`);
    if (city) conditions.push(sql`l.address ILIKE ${'%' + city + '%'}`);
    if (license_number) conditions.push(sql`l.license_number ILIKE ${'%' + license_number + '%'}`);
    if (lab_name) conditions.push(sql`l.lab_name ILIKE ${'%' + lab_name + '%'}`);

    const whereClause = sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`;

    let labs = await sql`
      SELECT 
        l.id, l.lab_name, l.owner_name, l.email, l.services,
        l.accepts_home_collection, l.general_turnaround, l.contact_person,
        l.opening_hours, l.license_number, l.address, l.latitude, l.longitude,
        l.rating, l.total_reviews,
        json_build_object('id', u.id, 'profile_picture', u.profile_picture, 'role', u.role) as users
      FROM lab_details l
      JOIN users u ON u.id = l.id
      ${whereClause}
      ORDER BY l.rating DESC NULLS LAST
    `;

    if (!labs || labs.length === 0) {
      const allLabs = await sql`
        SELECT 
          l.id, l.lab_name, l.owner_name, l.email, l.license_number,
          l.address, l.latitude, l.longitude, l.rating, l.total_reviews,
          l.opening_hours, l.services, l.accepts_home_collection, l.general_turnaround,
          json_build_object('id', u.id, 'profile_picture', u.profile_picture, 'role', u.role) as users
        FROM lab_details l
        JOIN users u ON u.id = l.id
        WHERE u.role = 'lab' AND l.onboarding_status = 'approved'
        ORDER BY l.rating DESC NULLS LAST
      `;
      return success(
        "No filters or no match — returning all approved labs.",
        allLabs,
        200,
        { headers: corsHeaders }
      );
    }

    return success("Labs fetched successfully", labs, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Fetch labs error:", error);
    return failure("Failed to fetch lab list.", error.message, 500, {
      headers: corsHeaders,
    });
  }
}
