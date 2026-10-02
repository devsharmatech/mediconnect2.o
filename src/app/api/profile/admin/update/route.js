import sql from "@/lib/db";
import { uploadToS3, deleteFromS3 } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

// 🟢 Handle preflight CORS
export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function PUT(req) {
  try {
    const formData = await req.formData();
    const user_id = formData.get("user_id");
    const full_name = formData.get("full_name");
    const email = formData.get("email");
    const permissions = formData.get("permissions");
    const file = formData.get("profile_picture");

    // ✅ Validate required fields
    if (!user_id || !full_name || !email) {
      return failure(
        "Missing required fields: user_id, full_name, or email.",
        null,
        400,
        { headers: corsHeaders }
      );
    }

    // ✅ Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return failure("Invalid email format.", null, 400, { headers: corsHeaders });
    }

    // ✅ Fetch current user data
    const [userData] = await sql`
      SELECT id, profile_picture, role
      FROM users
      WHERE id = ${user_id}
      LIMIT 1
    `;

    if (!userData) {
      return failure("User not found.", null, 404, { headers: corsHeaders });
    }

    if (userData.role !== "admin") {
      return failure("Invalid role. Only admins can be updated via this API.", null, 403, { headers: corsHeaders });
    }

    // ✅ Handle profile picture upload (optional)
    let profile_picture_url = userData.profile_picture || null;

    if (file && file.name) {
      try {
        // Delete old file if exists
        if (userData.profile_picture) {
          const oldFile = userData.profile_picture.split("/").pop();
          await deleteFromS3(`profile-pictures/${oldFile}`);
        }

        // Upload new file
        const ext = file.name.split(".").pop();
        const fileName = `${user_id}_${Date.now()}.${ext}`;
        const { url } = await uploadToS3(file, `profile-pictures/${fileName}`, "application/octet-stream");
        profile_picture_url = url;
      } catch (uploadErr) {
        console.error("Profile upload failed:", uploadErr);
        return failure("Failed to upload profile picture.", uploadErr.message, 500, { headers: corsHeaders });
      }
    }

    const parsedPermissions = permissions ? (typeof permissions === "string" ? JSON.parse(permissions) : permissions) : {};

    // ✅ Update admin details table
    await sql`
      INSERT INTO admin_details (id, full_name, email, permissions)
      VALUES (${user_id}, ${full_name}, ${email}, ${sql.json(parsedPermissions)})
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        permissions = EXCLUDED.permissions
    `;

    // ✅ Update user profile picture if changed
    if (profile_picture_url !== userData.profile_picture) {
      await sql`
        UPDATE users
        SET profile_picture = ${profile_picture_url}, updated_at = NOW()
        WHERE id = ${user_id}
      `;
    }

    return success(
      "Admin profile updated successfully.",
      {
        user_id,
        full_name,
        email,
        permissions: parsedPermissions,
        profile_picture: profile_picture_url,
      },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return failure("Unexpected server error occurred.", error.message, 500, { headers: corsHeaders });
  }
}
