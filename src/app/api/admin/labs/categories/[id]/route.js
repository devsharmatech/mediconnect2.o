import { supabase } from "@/lib/supabaseAdmin";
import { uploadToS3, deleteFromS3, getCloudFrontUrl, extractKeyFromUrl } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

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
        const status = form.get("status") === "true";
        const file = form.get("icon_file"); // Newly uploaded file, if any

        const updateData = { updated_at: new Date().toISOString() };

        if (name) updateData.name = name;
        if (description !== null) updateData.description = description;
        if (status !== null) updateData.status = status;

        // Handle Image Upload if a new file is provided
        if (file && file.size > 0 && file.name) {
            // 1. We should ideally delete the old image if there is one. We can fetch it first:
            const { data: existingCat } = await supabase
                .from("lab_test_categories")
                .select("icon")
                .eq("id", id)
                .single();

            if (existingCat?.icon && existingCat.icon.includes("/profile-pictures/categories/")) {
                const oldPath = existingCat.icon.split("/profile-pictures/")[1];
                await deleteFromS3(`profile-pictures/${oldPath}`);
            }

            // 2. Upload the new file
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
            // If no file but there's a string passed, update it (useful if clearing image or falling back to a string)
            updateData.icon = form.get("icon");
        }

        const { data, error } = await supabase
            .from("lab_test_categories")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            // rollback image if db insert fails
            if (uploadedPath) {
                await deleteFromS3(`profile-pictures/${uploadedPath}`);
            }
            if (error.code === '23505') {
                return failure("Category with this name already exists", error.message, 409, { headers: corsHeaders });
            }
            throw error;
        }

        if (!data) {
            return failure("Category not found", null, 404, { headers: corsHeaders });
        }

        return success("Category updated successfully", data, 200, { headers: corsHeaders });
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
        const { id } = params;

        if (!id) {
            return failure("Category ID is required", null, 400, { headers: corsHeaders });
        }

        // Attempt to delete image if exists
        const { data: existingCat } = await supabase
            .from("lab_test_categories")
            .select("icon")
            .eq("id", id)
            .single();

        if (existingCat?.icon && existingCat.icon.includes("/profile-pictures/categories/")) {
            const oldPath = existingCat.icon.split("/profile-pictures/")[1];
            await deleteFromS3(`profile-pictures/${oldPath}`);
        }

        const { error } = await supabase
            .from("lab_test_categories")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return success("Category deleted successfully", null, 200, { headers: corsHeaders });
    } catch (error) {
        console.error("Error deleting lab category:", error);
        return failure("Failed to delete category", error.message, 500, { headers: corsHeaders });
    }
}
