import sql from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    let packages;
    if (q) {
      packages = await sql`
        SELECT 
          id,
          package_name,
          test_details,
          mrp,
          discount_percentage,
          offer_price,
          is_active,
          created_at
        FROM lab_packages
        WHERE is_active = true
          AND (package_name ILIKE ${'%' + q + '%'} OR test_details ILIKE ${'%' + q + '%'})
        ORDER BY mrp ASC
      `;
    } else {
      packages = await sql`
        SELECT 
          id,
          package_name,
          test_details,
          mrp,
          discount_percentage,
          offer_price,
          is_active,
          created_at
        FROM lab_packages
        WHERE is_active = true
        ORDER BY mrp ASC
      `;
    }

    return NextResponse.json({
      success: true,
      data: packages,
      count: packages.length,
    });
  } catch (error) {
    console.error("Error fetching lab packages:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
