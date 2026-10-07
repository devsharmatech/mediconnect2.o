import sql from "@/lib/db";
import { NextResponse } from "next/server";
import { getCommissionSettings } from "@/lib/labCommissionHelper";

export const dynamic = "force-dynamic";

// GET /api/admin/labs/commission-settings
export async function GET() {
  try {
    const data = await getCommissionSettings();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[Commission Settings GET] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/labs/commission-settings
// Body: { settings: [{ category_key: 'category_1', commission_percentage: 55.0 }, ...] } or single { category_key, commission_percentage }
export async function PUT(req) {
  try {
    const body = await req.json();

    if (Array.isArray(body.settings)) {
      for (const item of body.settings) {
        if (item.category_key && item.commission_percentage !== undefined) {
          await sql`
            UPDATE lab_commission_settings
            SET 
              commission_percentage = ${parseFloat(item.commission_percentage)},
              updated_at = NOW()
            WHERE category_key = ${item.category_key};
          `;
        }
      }
    } else if (body.category_key && body.commission_percentage !== undefined) {
      await sql`
        UPDATE lab_commission_settings
        SET 
          commission_percentage = ${parseFloat(body.commission_percentage)},
          updated_at = NOW()
        WHERE category_key = ${body.category_key};
      `;
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid payload. Provide settings array or category_key + commission_percentage." },
        { status: 400 }
      );
    }

    const updated = await getCommissionSettings();
    return NextResponse.json({
      success: true,
      message: "Commission settings updated successfully.",
      data: updated,
    });
  } catch (error) {
    console.error("[Commission Settings PUT] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
