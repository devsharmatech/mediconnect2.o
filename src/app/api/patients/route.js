import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const gender = searchParams.get("gender") || "all";
    const verification = searchParams.get("verification") || "all";

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build base query
    let query = supabase
      .from("users")
      .select(
        `
        id,
        phone_number,
        created_at,
        profile_picture,
        status,
        is_verified,
        un_id,
        patient_details!inner (
          full_name,
          email,
          gender,
          date_of_birth,
          blood_group,
          address,
          emergency_contact
        )
      `,
        { count: "exact" }
      )
      .eq("role", "patient")
      .order("created_at", { ascending: false });

    // Apply search filter
    if (search) {
      // 1. Match by phone_number in users table
      const { data: byPhone } = await supabase
        .from("users")
        .select("id")
        .eq("role", "patient")
        .ilike("phone_number", `%${search}%`);

      // 2. Match by full_name or email in patient_details
      const { data: byDetails } = await supabase
        .from("patient_details")
        .select("id")
        .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

      const phoneIds = (byPhone || []).map((r) => r.id);
      const detailIds = (byDetails || []).map((r) => r.id);
      const allIds = [...new Set([...phoneIds, ...detailIds])];

      if (allIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limit,
            hasNextPage: false,
            hasPrevPage: false,
            nextPage: null,
            prevPage: null,
          },
        });
      }

      query = query.in("id", allIds);
    }

    // Apply status filter (Safe numeric/smallint handling for AWS RDS PostgreSQL)
    if (status !== "all") {
      if (status === "active" || status === "1") {
        query = query.or("status.eq.1,status.is.null");
      } else if (status === "inactive" || status === "0") {
        query = query.eq("status", 0);
      } else {
        const numStatus = parseInt(status, 10);
        if (!isNaN(numStatus)) {
          query = query.eq("status", numStatus);
        }
      }
    }

    // Apply verification status filter
    if (verification !== "all") {
      if (verification === "verified" || verification === "true") {
        query = query.eq("is_verified", true);
      } else if (verification === "unverified" || verification === "false") {
        query = query.or("is_verified.eq.false,is_verified.is.null");
      }
    }

    // Apply gender filter
    if (gender !== "all") {
      query = query.ilike("patient_details.gender", `%${gender}%`);
    }

    // Apply pagination
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("Supabase error fetching patients:", error);
      throw error;
    }

    const totalPages = Math.ceil((count || 0) / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: count || 0,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null,
      },
    });
  } catch (err) {
    console.error("Error fetching patients:", err);
    return NextResponse.json(
      { success: false, error: err?.message || JSON.stringify(err) },
      { status: 500 }
    );
  }
}
