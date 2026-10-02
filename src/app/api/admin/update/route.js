import sql from "@/lib/db";
import { uploadToS3, deleteFromS3, extractKeyFromUrl } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  let uploadedPath = null;

  try {
    const form = await req.formData();

    const id = form.get("id");
    const full_name = form.get("full_name");
    const email = form.get("email");
    const permissions = form.get("permissions")
      ? JSON.parse(form.get("permissions"))
      : {};
    const file = form.get("profile_picture");

    // 🔹 Validate
    if (!id || !full_name) {
      return failure("Missing required fields: id, full_name", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    // 🔹 Fetch user from AWS RDS PostgreSQL
    const users = await sql`
      SELECT id, role, profile_picture FROM users WHERE id = ${id} LIMIT 1
    `;

    if (!users || users.length === 0) {
      return failure("User not found.", "not_found", 404, { headers: corsHeaders });
    }

    const user = users[0];
    if (user.role !== "admin") {
      return failure("User is not an admin.", "unauthorized", 403, { headers: corsHeaders });
    }

    // 🔹 Upload new profile picture (profile-pictures bucket in S3)
    let profile_picture_url = user.profile_picture;

    if (file && file.name && typeof file.arrayBuffer === "function") {
      const filename = `admins/${id}/profile_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      // Attempt to remove old profile if exists
      if (user.profile_picture) {
        const oldKey = extractKeyFromUrl(user.profile_picture);
        if (oldKey) {
          await deleteFromS3(oldKey).catch(() => {});
        }
      }

      try {
        const { url } = await uploadToS3(buffer, `profile-pictures/${filename}`, file.type || "image/jpeg");
        profile_picture_url = url;
        uploadedPath = `profile-pictures/${filename}`;
      } catch (err) {
        console.error("S3 upload failed:", err);
      }
    }

    // 🔹 Update users in AWS RDS PostgreSQL
    await sql`
      UPDATE users 
      SET profile_picture = ${profile_picture_url}, updated_at = NOW()
      WHERE id = ${id}
    `;

    // 🔹 Upsert admin_details in AWS RDS PostgreSQL
    const adminRows = await sql`
      INSERT INTO admin_details (id, full_name, email, permissions, created_at)
      VALUES (${id}, ${full_name}, ${email || null}, ${permissions}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        permissions = EXCLUDED.permissions
      RETURNING *
    `;

    const adminData = adminRows[0] || { id, full_name, email, permissions };

    return success(
      "Admin updated successfully.",
      { user: { id, profile_picture: profile_picture_url }, admin: adminData },
      200,
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Admin update error:", err);
    if (uploadedPath) {
      await deleteFromS3(uploadedPath).catch(() => {});
    }
    return failure("Failed to update admin. " + err.message, "admin_update_failed", 500, {
      headers: corsHeaders,
    });
  }
}
