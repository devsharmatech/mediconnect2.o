import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// PUT update category commission percentage
export async function PUT(req, { params }) {
    try {
        const { id } = await params;
        if (!id) {
            return failure("Category ID is required", null, 400, { headers: corsHeaders });
        }

        let commission_percentage, description, status;
        const contentType = req.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            const body = await req.json();
            commission_percentage = body.commission_percentage;
            description = body.description;
            status = body.status;
        } else {
            const form = await req.formData();
            commission_percentage = form.get("commission_percentage");
            description = form.get("description");
            if (form.has("status")) status = form.get("status") === "true";
        }

        const pct = parseFloat(commission_percentage);
        if (isNaN(pct) || pct < 0 || pct > 100) {
            return failure("Commission percentage must be between 0 and 100", null, 400, { headers: corsHeaders });
        }

        const updatedRows = await sql`
            UPDATE lab_test_categories
            SET 
                commission_percentage = ${pct},
                description = COALESCE(${description}, description),
                status = COALESCE(${status}, status),
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING *
        `;

        if (!updatedRows || updatedRows.length === 0) {
            return failure("Category not found", null, 404, { headers: corsHeaders });
        }

        const cat = updatedRows[0];

        // Sync with lab_commission_settings
        let catKey = "category_1";
        if (cat.name.includes("1")) catKey = "category_1";
        else if (cat.name.includes("2")) catKey = "category_2";
        else if (cat.name.includes("3")) catKey = "category_3";
        else if (cat.name.includes("4")) catKey = "category_4";
        else if (cat.name.toLowerCase().includes("package")) catKey = "package";

        await sql`
            UPDATE lab_commission_settings
            SET 
                commission_percentage = ${pct},
                updated_at = NOW()
            WHERE category_key = ${catKey}
        `;

        await sql`
            UPDATE lab_master
            SET commission_percentage = ${pct}
            WHERE category = ${cat.name}
        `;

        return success("Category updated successfully", cat, 200, { headers: corsHeaders });
    } catch (error) {
        console.error("Error updating lab category:", error);
        return failure("Failed to update category", error.message, 500, { headers: corsHeaders });
    }
}
