import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET(request) {
  try {
    const url = new URL(request.url);

    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("bpl_requests")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    if (search) {
      const like = `%${search}%`;
      query = query.or(
        `name.ilike.${like},mobile.ilike.${like},aadhaar_no.ilike.${like},ration_card_no.ilike.${like}`
      );
    }

    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      meta: { page, limit, total: count },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
