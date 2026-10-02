import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { min_rating, city, license_number, store_name } = body || {};

    const conditions = [sql`u.role = 'chemist'`];

    if (min_rating) {
      conditions.push(sql`c.rating >= ${Number(min_rating)}`);
    }
    if (city) {
      conditions.push(sql`c.address ILIKE ${'%' + city + '%'}`);
    }
    if (license_number) {
      conditions.push(sql`c.drug_license ILIKE ${'%' + license_number + '%'}`);
    }
    if (store_name) {
      conditions.push(sql`c.pharmacy_name ILIKE ${'%' + store_name + '%'}`);
    }

    const whereClause = sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`;

    let chemists = await sql`
      SELECT 
        c.id, c.pharmacy_name, c.owner_name, c.email, c.address, c.gstin, c.drug_license,
        c.store_timings, c.latitude, c.longitude, c.rating, c.total_reviews,
        json_build_object('id', u.id, 'profile_picture', u.profile_picture, 'role', u.role) as users
      FROM chemist_details c
      JOIN users u ON u.id = c.id
      ${whereClause}
      ORDER BY c.rating DESC NULLS LAST
    `;

    if (!chemists || chemists.length === 0) {
      const allChemists = await sql`
        SELECT 
          c.id, c.pharmacy_name, c.owner_name, c.email, c.address, c.rating,
          json_build_object('id', u.id, 'profile_picture', u.profile_picture, 'role', u.role) as users
        FROM chemist_details c
        JOIN users u ON u.id = c.id
        WHERE u.role = 'chemist'
        ORDER BY c.rating DESC NULLS LAST
      `;
      return success(
        "No filters matched — returning all chemists.",
        allChemists,
        200,
        { headers: corsHeaders }
      );
    }

    return success("Chemists fetched successfully.", chemists, 200, { headers: corsHeaders });

  } catch (error) {
    console.error("Fetch chemists error:", error);
    return failure(
      "Failed to fetch chemist list.",
      error.message,
      500,
      { headers: corsHeaders }
    );
  }
}
