import { supabase } from "@/lib/supabaseAdmin";
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

    const { data: userData, error: fetchError } = await supabase
      .from("users")
      .select("id, profile_picture, role")
      .eq("id", user_id)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching user:", fetchError);
      return failure("Unable to fetch user details.", fetchError.message, 500, {
        headers: corsHeaders,
      });
    }

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
      // Delete old file if exists
      if (userData.profile_picture) {
        const oldKey = extractKeyFromUrl(userData.profile_picture);
        if (oldKey) {
          await deleteFromS3(oldKey);
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
      const { error: userUpdateError } = await supabase
        .from("users")
        .update({ profile_picture: profile_picture_url, updated_at: new Date() })
        .eq("id", user_id);

      if (userUpdateError) {
        console.error("Error updating doctor profile picture URL:", userUpdateError);
        return failure(
          "Failed to update profile picture URL.",
          userUpdateError.message,
          500,
          { headers: corsHeaders }
        );
      }
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
