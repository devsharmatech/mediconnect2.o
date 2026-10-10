import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return failure("user_id is required", null, 400, { headers: corsHeaders });
    }

    const tickets = await sql`
      SELECT 
        id,
        ticket_number,
        user_id,
        subject,
        description,
        status,
        priority,
        created_at,
        updated_at
      FROM support_tickets
      WHERE user_id = ${user_id}
      ORDER BY created_at DESC
    `;

    return success("Support tickets fetched successfully", tickets, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Support tickets GET Error:", error);
    return failure("Failed to fetch support tickets", error.message, 500, { headers: corsHeaders });
  }
}

export async function POST(req) {
  try {
    const { user_id, subject, description, priority } = await req.json();

    if (!user_id || !subject || !description) {
      return failure("user_id, subject, and description are required", null, 400, { headers: corsHeaders });
    }

    const ticketNumber = `TICK-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const [createdTicket] = await sql`
      INSERT INTO support_tickets (
        ticket_number,
        user_id,
        subject,
        description,
        status,
        priority
      ) VALUES (
        ${ticketNumber},
        ${user_id},
        ${subject},
        ${description},
        'open',
        ${priority || 'normal'}
      )
      RETURNING id, ticket_number, status, created_at, subject, description, user_id
    `;

    return success("Support ticket created successfully", createdTicket, 201, { headers: corsHeaders });
  } catch (error) {
    console.error("Support API Error:", error);
    return failure("Internal Error", error.message, 500, { headers: corsHeaders });
  }
}
