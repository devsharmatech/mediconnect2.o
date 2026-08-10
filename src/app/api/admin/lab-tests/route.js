import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const q = searchParams.get("q") || "";
    const category = searchParams.get("category") || "";

    const offset = (page - 1) * limit;

    let query = supabase
      .from("lab_master")
      .select("*", { count: "exact" });

    if (q) {
      query = query.ilike("test_name", `%${q}%`);
    }

    if (category) {
      query = query.eq("category", category);
    }

    query = query.order("created_at", { ascending: false });

    // Apply range pagination unless a high limit (e.g. bulk autocomplete/export) is specified
    if (limit < 10000) {
      query = query.range(offset, offset + limit - 1);
    } else {
      query = query.limit(10000);
    }

    const { data, count, error } = await query;

    if (error) throw error;
    
    return NextResponse.json({ 
      success: true, 
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    // Handle Bulk Import (Array)
    if (Array.isArray(body)) {
      const { data, error } = await supabase
        .from("lab_master")
        .insert(body)
        .select();
      if (error) throw error;
      return NextResponse.json({ success: true, data, message: `${body.length} lab tests imported successfully.` });
    }

    // Handle Single Insert
    const { data, error } = await supabase
      .from("lab_master")
      .insert([body])
      .select();
    
    if (error) throw error;
    return NextResponse.json({ success: true, data: data[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, ...updateData } = body;

    const { data, error } = await supabase
      .from("lab_master")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, data: data[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) throw new Error("ID is required");

    const { error } = await supabase
      .from("lab_master")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
