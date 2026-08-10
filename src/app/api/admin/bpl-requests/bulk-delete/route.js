import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function POST(request) {
  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "ids array is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("bpl_requests")
      .delete()
      .in("id", ids);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      deleted: ids.length,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
