import sql from "@/lib/db";
import { uploadToS3, deleteFromS3 } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// GET all categories
export async function GET(req) {
    try {
        const data = await sql`
            SELECT *
            FROM lab_test_categories
            ORDER BY created_at DESC
        `;

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
        const file = form.get("icon_file");

        let icon = form.get("icon") || "Microscope";

        if (!name || !name.trim()) {
            return failure("Category name is required", null, 400, { headers: corsHeaders });
        }

        // 1. Handle File Upload if present
        if (file && file.size > 0 && file.name) {
            const filename = `categories/cat_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const buffer = Buffer.from(await file.arrayBuffer());

            let publicUrl;
            try {
                const { url } = await uploadToS3(buffer, `profile-pictures/${filename}`, "application/octet-stream");
                publicUrl = url;
            } catch (err) {
                throw new Error("Failed to upload category image: " + err.message);
            }

            uploadedPath = filename;
            icon = publicUrl;
        }

        // 2. Insert into DB
        const cleanName = name.trim();
        const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        try {
            const rows = await sql`
                INSERT INTO lab_test_categories (
                    name, slug, description, icon, status, created_at, updated_at
                ) VALUES (
                    ${cleanName},
                    ${slug},
                    ${description || null},
                    ${icon},
                    ${status !== undefined ? status : true},
                    NOW(),
                    NOW()
                )
                RETURNING *
            `;

            return success("Category created successfully", rows[0], 201, { headers: corsHeaders });
        } catch (dbErr) {
            if (uploadedPath) {
                await deleteFromS3(`profile-pictures/${uploadedPath}`);
            }
            if (dbErr.code === '23505') { // Unique violation
                return failure("Category with this name already exists", dbErr.message, 409, { headers: corsHeaders });
            }
            throw dbErr;
        }
    } catch (error) {
        console.error("Error creating lab category:", error);
        if (uploadedPath) {
            await deleteFromS3(`profile-pictures/${uploadedPath}`);
        }
        return failure("Failed to create category", error.message, 500, { headers: corsHeaders });
    }
}
