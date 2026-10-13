import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") || "tickets"; // "tickets" | "contact"
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const offset = (page - 1) * limit;

    // 1. Fetch Summary Stats
    const [ticketStats] = await sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN status = 'open' THEN 1 END)::int as open_count,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END)::int as in_progress_count,
        COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END)::int as resolved_count
      FROM support_tickets
    `;

    const [contactStats] = await sql`
      SELECT COUNT(*)::int as total FROM website_contact_messages
    `;

    const summary = {
      total_tickets: ticketStats?.total || 0,
      open_tickets: ticketStats?.open_count || 0,
      in_progress_tickets: ticketStats?.in_progress_count || 0,
      resolved_tickets: ticketStats?.resolved_count || 0,
      total_contact_messages: contactStats?.total || 0,
    };

    if (tab === "contact") {
      // 2. Query Website Contact Messages
      let contactConditions = [];
      if (search) {
        const pattern = `%${search}%`;
        contactConditions.push(sql`(name ILIKE ${pattern} OR email ILIKE ${pattern} OR subject ILIKE ${pattern} OR message ILIKE ${pattern})`);
      }

      const whereClause = contactConditions.length > 0
        ? sql`WHERE ${contactConditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`
        : sql``;

      const [countRow] = await sql`SELECT count(*)::int as count FROM website_contact_messages ${whereClause}`;
      const total = countRow?.count || 0;

      const messages = await sql`
        SELECT id, name, email, subject, message, created_at
        FROM website_contact_messages
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      return success("Contact messages fetched successfully", {
        tab: "contact",
        messages,
        summary,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }, 200, { headers: corsHeaders });
    }

    // 3. Query Support Tickets with user details
    let ticketConditions = [];
    if (status && status !== "all") {
      ticketConditions.push(sql`st.status = ${status}`);
    }

    if (search) {
      const pattern = `%${search}%`;
      ticketConditions.push(sql`(
        st.ticket_number ILIKE ${pattern} 
        OR st.subject ILIKE ${pattern} 
        OR st.description ILIKE ${pattern}
        OR u.phone_number ILIKE ${pattern}
        OR COALESCE(p.full_name, d.full_name, c.owner_name, l.lab_name) ILIKE ${pattern}
      )`);
    }

    const ticketWhere = ticketConditions.length > 0
      ? sql`WHERE ${ticketConditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`
      : sql``;

    const [tCountRow] = await sql`
      SELECT count(*)::int as count
      FROM support_tickets st
      LEFT JOIN users u ON st.user_id = u.id
      LEFT JOIN patient_details p ON st.user_id = p.id
      LEFT JOIN doctor_details d ON st.user_id = d.id
      LEFT JOIN chemist_details c ON st.user_id = c.id
      LEFT JOIN lab_details l ON st.user_id = l.id
      ${ticketWhere}
    `;
    const total = tCountRow?.count || 0;

    const tickets = await sql`
      SELECT 
        st.id,
        st.ticket_number,
        st.user_id,
        st.subject,
        st.description,
        st.status,
        st.priority,
        st.created_at,
        st.updated_at,
        u.role as user_role,
        u.phone_number,
        COALESCE(p.full_name, d.full_name, c.owner_name, l.lab_name, 'User') as user_name
      FROM support_tickets st
      LEFT JOIN users u ON st.user_id = u.id
      LEFT JOIN patient_details p ON st.user_id = p.id
      LEFT JOIN doctor_details d ON st.user_id = d.id
      LEFT JOIN chemist_details c ON st.user_id = c.id
      LEFT JOIN lab_details l ON st.user_id = l.id
      ${ticketWhere}
      ORDER BY st.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return success("Support tickets fetched successfully", {
      tab: "tickets",
      tickets,
      summary,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("[Admin Support API] GET Error:", error);
    return failure("Failed to fetch support data", error.message, 500, { headers: corsHeaders });
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    const { ticket_id, status, priority } = body || {};

    if (!ticket_id) {
      return failure("ticket_id is required", null, 400, { headers: corsHeaders });
    }

    const updates = [];
    if (status) updates.push(sql`status = ${status}`);
    if (priority) updates.push(sql`priority = ${priority}`);
    updates.push(sql`updated_at = NOW()`);

    const updated = await sql`
      UPDATE support_tickets
      SET ${updates.reduce((acc, curr) => sql`${acc}, ${curr}`)}
      WHERE id = ${ticket_id}
      RETURNING *
    `;

    if (!updated || updated.length === 0) {
      return failure("Ticket not found", null, 404, { headers: corsHeaders });
    }

    return success("Ticket updated successfully", updated[0], 200, { headers: corsHeaders });
  } catch (error) {
    console.error("[Admin Support API] PATCH Error:", error);
    return failure("Failed to update ticket", error.message, 500, { headers: corsHeaders });
  }
}
