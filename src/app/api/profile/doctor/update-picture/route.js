import sql from "@/lib/db";
import { uploadToS3, deleteFromS3, extractKeyFromUrl } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function PUT(req) {
  try {
    const formData = await req.formData();

    const user_id = formData.get("user_id");
    const file = formData.get("profile_picture");

    if (!user_id) {
      return failure("user_id is required.", null, 400, { headers: corsHeaders });
    }

    const [userData] = await sql`
      SELECT id, profile_picture, role
      FROM users
      WHERE id = ${user_id}
      LIMIT 1
    `;

    if (!userData) {
      return failure("User not found.", null, 404, { headers: corsHeaders });
    }

    if (userData.role !== "doctor") {
      return failure("Only doctor profile pictures can be updated here.", null, 403, {
        headers: corsHeaders,
      });
    }

    if (!file || !file.name) {
      return failure("profile_picture file is required.", null, 400, {
        headers: corsHeaders,
      });
    }

    let profile_picture_url = userData.profile_picture || null;

    try {
      if (userData.profile_picture) {
        try {
          const oldKey = extractKeyFromUrl(userData.profile_picture);
          if (oldKey) {
            await deleteFromS3(oldKey);
          }
        } catch (cleanupErr) {
          console.warn("[S3] Old avatar cleanup skipped:", cleanupErr.message);
        }
      }

      const ext = file.name.split(".").pop();
      const fileName = `${user_id}_${Date.now()}.${ext}`;
      const key = `profile-pictures/${fileName}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { url } = await uploadToS3(buffer, key, file.type || "image/jpeg");
      profile_picture_url = url;
    } catch (uploadErr) {
      console.error("Doctor profile upload failed:", uploadErr);
      return failure(
        "Failed to upload profile picture.",
        uploadErr.message,
        500,
        { headers: corsHeaders }
      );
    }

    if (profile_picture_url && profile_picture_url !== userData.profile_picture) {
      await sql`
        UPDATE users
        SET profile_picture = ${profile_picture_url}, updated_at = NOW()
        WHERE id = ${user_id}
      `;
    }

    return success(
      "Doctor profile picture updated successfully.",
      {
        user_id,
        profile_picture: profile_picture_url,
      },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Doctor update-picture error:", error);
    return failure("Unexpected server error occurred.", error.message, 500, {
      headers: corsHeaders,
    });
  }
}
