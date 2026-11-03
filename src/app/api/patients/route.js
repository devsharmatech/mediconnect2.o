import { NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const gender = searchParams.get("gender") || "all";
    const verification = searchParams.get("verification") || "all";

    const offset = (page - 1) * limit;

    const conditions = [sql`u.role = 'patient'`];

    // Search: name, email, phone, or un_id
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      conditions.push(sql`(
        pd.full_name ILIKE ${s} OR 
        pd.email ILIKE ${s} OR 
        u.phone_number ILIKE ${s} OR 
        u.un_id::text ILIKE ${s}
      )`);
    }

    // Status filter
    if (status !== "all") {
      if (status === "active" || status === "1") {
        conditions.push(sql`(u.status = 1 OR u.status IS NULL)`);
      } else if (status === "inactive" || status === "0") {
        conditions.push(sql`u.status = 0`);
      } else {
        const numStatus = parseInt(status, 10);
        if (!isNaN(numStatus)) {
          conditions.push(sql`u.status = ${numStatus}`);
        }
      }
    }

    // Gender filter
    if (gender !== "all") {
      conditions.push(sql`pd.gender ILIKE ${gender}`);
    }

    // Verification filter
    if (verification !== "all") {
      if (verification === "verified" || verification === "true") {
        conditions.push(sql`u.is_verified = true`);
      } else if (verification === "unverified" || verification === "false") {
        conditions.push(sql`(u.is_verified = false OR u.is_verified IS NULL)`);
      }
    }

    const whereClause = conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`);

    const [{ count }] = await sql`
      SELECT COUNT(*)::int AS count
      FROM users u
      LEFT JOIN patient_details pd ON pd.id = u.id
      WHERE ${whereClause}
    `;

    const rows = await sql`
      SELECT 
        u.id,
        u.phone_number,
        u.created_at,
        u.profile_picture,
        u.status,
        u.is_verified,
        u.un_id,
        pd.full_name,
        pd.email,
        pd.gender,
        pd.date_of_birth,
        pd.blood_group,
        pd.address,
        pd.emergency_contact
      FROM users u
      LEFT JOIN patient_details pd ON pd.id = u.id
      WHERE ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Transform into expected shape: patient_details nested object for backwards compatibility
    const patients = rows.map((r) => ({
      id: r.id,
      phone_number: r.phone_number,
      created_at: r.created_at,
      profile_picture: r.profile_picture,
      status: r.status,
      is_verified: r.is_verified,
      un_id: r.un_id,
      patient_details: {
        full_name: r.full_name,
        email: r.email,
        gender: r.gender,
        date_of_birth: r.date_of_birth,
        blood_group: r.blood_group,
        address: r.address,
        emergency_contact: r.emergency_contact,
      },
    }));

    return NextResponse.json({
      success: true,
      data: patients,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null,
      },
    });
  } catch (err) {
    console.error("Error fetching patients from AWS RDS:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch patients" },
      { status: 500 }
    );
  }
}
