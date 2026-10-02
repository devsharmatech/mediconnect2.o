import sql from "@/lib/db";
import { uploadToS3, deleteFromS3 } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// PUT update category
export async function PUT(req, { params }) {
    let uploadedPath = null;
    try {
        const { id } = await params;

        if (!id) {
            return failure("Category ID is required", null, 400, { headers: corsHeaders });
        }

        const form = await req.formData();
        const name = form.get("name");
        const description = form.get("description");
        const status = form.has("status") ? form.get("status") === "true" : null;
        const file = form.get("icon_file");

        const updateData = { updated_at: new Date().toISOString() };

        if (name) {
            updateData.name = name.trim();
            updateData.slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        }
        if (description !== null) updateData.description = description;
        if (status !== null) updateData.status = status;

        // Handle Image Upload if a new file is provided
        if (file && file.size > 0 && file.name) {
            const existingRows = await sql`
                SELECT icon FROM lab_test_categories WHERE id = ${id} LIMIT 1
            `;
            const existingCat = existingRows[0];

            if (existingCat?.icon && existingCat.icon.includes("/profile-pictures/categories/")) {
                const oldPath = existingCat.icon.split("/profile-pictures/")[1];
                await deleteFromS3(`profile-pictures/${oldPath}`);
            }

            const filename = `categories/cat_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const buffer = Buffer.from(await file.arrayBuffer());

            let publicUrl;
            try {
                const { url } = await uploadToS3(buffer, `profile-pictures/${filename}`, "application/octet-stream");
                publicUrl = url;
            } catch (err) {
                throw new Error("Failed to upload new category image: " + err.message);
            }

            uploadedPath = filename;
            updateData.icon = publicUrl;
        } else if (form.has("icon")) {
            updateData.icon = form.get("icon");
        }

        try {
            const updatedRows = await sql`
                UPDATE lab_test_categories
                SET ${sql(updateData)}
                WHERE id = ${id}
                RETURNING *
            `;

            if (!updatedRows || updatedRows.length === 0) {
                return failure("Category not found", null, 404, { headers: corsHeaders });
            }

            return success("Category updated successfully", updatedRows[0], 200, { headers: corsHeaders });
        } catch (dbErr) {
            if (uploadedPath) {
                await deleteFromS3(`profile-pictures/${uploadedPath}`);
            }
            if (dbErr.code === '23505') {
                return failure("Category with this name already exists", dbErr.message, 409, { headers: corsHeaders });
            }
            throw dbErr;
        }
    } catch (error) {
        console.error("Error updating lab category:", error);
        if (uploadedPath) {
            await deleteFromS3(`profile-pictures/${uploadedPath}`);
        }
        return failure("Failed to update category", error.message, 500, { headers: corsHeaders });
    }
}

// DELETE category
export async function DELETE(req, { params }) {
    try {
        const { id } = await params;

        if (!id) {
            return failure("Category ID is required", null, 400, { headers: corsHeaders });
        }

        // Attempt to delete image if exists
        const existingRows = await sql`
            SELECT icon FROM lab_test_categories WHERE id = ${id} LIMIT 1
        `;
        const existingCat = existingRows[0];

        if (existingCat?.icon && existingCat.icon.includes("/profile-pictures/categories/")) {
            const oldPath = existingCat.icon.split("/profile-pictures/")[1];
            await deleteFromS3(`profile-pictures/${oldPath}`);
        }

        await sql`
            DELETE FROM lab_test_categories WHERE id = ${id}
        `;

        return success("Category deleted successfully", null, 200, { headers: corsHeaders });
    } catch (error) {
        console.error("Error deleting lab category:", error);
        return failure("Failed to delete category", error.message, 500, { headers: corsHeaders });
    }
}
