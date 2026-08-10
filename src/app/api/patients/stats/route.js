import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Total patients
    const { count: total, error: e1 } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "patient");

    // Active — try status=1 (most common for integer-based status columns)
    const { count: activeInt, error: e2 } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "patient")
      .eq("status", 1);

    // Also try status='active' as string fallback
    const { count: activeStr, error: e3 } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "patient")
      .eq("status", "active");

    const active = (activeInt || 0) + (activeStr || 0);

    // Male patients
    const { count: male, error: e4 } = await supabase
      .from("patient_details")
      .select("*", { count: "exact", head: true })
      .ilike("gender", "male");

    // Female patients
    const { count: female, error: e5 } = await supabase
      .from("patient_details")
      .select("*", { count: "exact", head: true })
      .ilike("gender", "female");

    // Registered this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count: thisMonth, error: e6 } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "patient")
      .gte("created_at", startOfMonth);

    // Log any errors for debugging
    [e1, e2, e3, e4, e5, e6].forEach((e, i) => {
      if (e) console.error(`[patient stats] query ${i + 1} error:`, e);
    });

    console.log("[patient stats]", { total, activeInt, activeStr, male, female, thisMonth });

    return NextResponse.json({
      success: true,
      data: {
        total: total ?? 0,
        active: active,
        male: male ?? 0,
        female: female ?? 0,
        thisMonth: thisMonth ?? 0,
      },
    });
  } catch (err) {
    console.error("Error fetching patient stats:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
