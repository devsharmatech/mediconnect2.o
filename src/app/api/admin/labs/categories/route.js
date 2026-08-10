import { supabase } from "@/lib/supabaseAdmin";
import { uploadToS3, deleteFromS3, getCloudFrontUrl, extractKeyFromUrl } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export const runtime = "nodejs";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// GET all categories
export async function GET(req) {
    try {
        const { data, error } = await supabase
            .from("lab_test_categories")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        return success("Categories fetched successfully", data, 200, { headers: corsHeaders });
    } catch (error) {
        console.error("Error fetching lab categories:", error);
        return failure("Failed to fetch categories", error.message, 500, { headers: corsHeaders });
    }
}

// POST create new category
export async function POST(req) {
    let uploadedPath = null;
    try {
        const form = await req.formData();
        const name = form.get("name");
        const description = form.get("description");
        const status = form.get("status") === "true";
        const file = form.get("icon_file"); // Expecting the actual file

        // Fallback: If no file is provided, maybe they passed a string name (for backward compatibility if needed)
        let icon = form.get("icon") || "Microscope";

        if (!name) {
            return failure("Category name is required", null, 400, { headers: corsHeaders });
        }

        // 1. Handle File Upload if present
        if (file && file.size > 0 && file.name) {
            const filename = `categories/cat_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const buffer = Buffer.from(await file.arrayBuffer());

            // We use profile-pictures bucket simply because we know it exists, but create a 'categories' subfolder
            let publicUrl;
            try {
                const { url } = await uploadToS3(buffer, `profile-pictures/${filename}`, "application/octet-stream");
                publicUrl = url;
            } catch (err) {
                throw new Error("Failed to upload category image: " + err.message);
            }

            uploadedPath = filename;
            icon = publicUrl; // Store the full public URL in the 'icon' column
        }

        // 2. Insert into DB
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        const { data, error } = await supabase
            .from("lab_test_categories")
            .insert({
                name,
                slug,
                description,
                icon,
                status: status !== undefined ? status : true,
            })
            .select()
            .single();

        if (error) {
            // rollback image if db insert fails
            if (uploadedPath) {
                await deleteFromS3(`profile-pictures/${uploadedPath}`);
            }
            if (error.code === '23505') { // Unique violation
                return failure("Category with this name already exists", error.message, 409, { headers: corsHeaders });
            }
            throw error;
        }

        return success("Category created successfully", data, 201, { headers: corsHeaders });
    } catch (error) {
        console.error("Error creating lab category:", error);
        if (uploadedPath) {
            await deleteFromS3(`profile-pictures/${uploadedPath}`);
        }
        return failure("Failed to create category", error.message, 500, { headers: corsHeaders });
    }
}
