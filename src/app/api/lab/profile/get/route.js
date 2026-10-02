import sql from "@/lib/db";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req) {
  try {
    const { lab_id } = await req.json();

    if (!lab_id || !UUID_REGEX.test(lab_id))
      return new Response(
        JSON.stringify({ status: false, message: "valid lab_id required" }),
        { headers: corsHeaders }
      );

    const [data] = await sql`
      SELECT 
        l.*,
        json_build_object(
          'id', u.id,
          'phone_number', u.phone_number,
          'profile_picture', u.profile_picture,
          'role', u.role,
          'status', u.status
        ) as user
      FROM lab_details l
      LEFT JOIN users u ON u.id = l.id
      WHERE l.id = ${lab_id}
      LIMIT 1
    `;

    return new Response(
      JSON.stringify({
        status: true,
        message: "Lab profile fetched",
        data: data || null,
      }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ status: false, message: err.message }),
      { headers: corsHeaders }
    );
  }
}
