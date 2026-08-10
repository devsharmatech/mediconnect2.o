import { supabase } from "@/lib/supabaseAdmin";
import { uploadToS3, deleteFromS3, getCloudFrontUrl, extractKeyFromUrl } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

// 🟢 Handle CORS preflight
export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

// 🟢 Update Pharmacist Profile
export async function PUT(req) {
  try {
    const formData = await req.formData();

    // ✅ Extract form data
    const user_id = formData.get("user_id");
    const full_name = formData.get("full_name");
    const email = formData.get("email");
    const store_name = formData.get("store_name");
    const license_number = formData.get("license_number");
    const address = formData.get("address");
    const phone = formData.get("phone");
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

    // ✅ Email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return failure("Invalid email format.", null, 400, { headers: corsHeaders });
    }

    // ✅ Fetch current user details
    const { data: userData, error: fetchError } = await supabase
      .from("users")
      .select("id, profile_picture, role")
      .eq("id", user_id)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching user:", fetchError);
      return failure(
        "Unable to fetch user details.",
        fetchError.message,
        500,
        { headers: corsHeaders }
      );
    }

    if (!userData) {
      return failure("User not found.", null, 404, { headers: corsHeaders });
    }

    if (userData.role !== "pharmacist") {
      return failure("Invalid role. Only pharmacists can be updated via this API.", null, 403, {
        headers: corsHeaders,
      });
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

        // Upload new profile picture
        const ext = file.name.split(".").pop();
        const fileName = `${user_id}_${Date.now()}.${ext}`;

        const { url } = await uploadToS3(file, `profile-pictures/${fileName}`, "application/octet-stream");
        profile_picture_url = url;
      } catch (uploadErr) {
        console.error("Profile upload failed:", uploadErr);
        return failure(
          "Failed to upload profile picture.",
          uploadErr.message,
          500,
          { headers: corsHeaders }
        );
      }
    }

    // ✅ Update pharmacist_details table
    const { error: updateError } = await supabase
      .from("pharmacist_details")
      .update({
        full_name,
        email,
        store_name,
        license_number,
        address,
        phone,
        updated_at: new Date(),
      })
      .eq("id", user_id);

    if (updateError) {
      console.error("Error updating pharmacist details:", updateError);
      return failure(
        "Failed to update pharmacist profile.",
        updateError.message,
        500,
        { headers: corsHeaders }
      );
    }

    // ✅ Update user profile picture if changed
    if (profile_picture_url !== userData.profile_picture) {
      const { error: userUpdateError } = await supabase
        .from("users")
        .update({
          profile_picture: profile_picture_url,
          updated_at: new Date(),
        })
        .eq("id", user_id);

      if (userUpdateError) {
        console.error("Error updating user picture:", userUpdateError);
        return failure(
          "Failed to update profile picture URL.",
          userUpdateError.message,
          500,
          { headers: corsHeaders }
        );
      }
    }

    // ✅ Return success
    return success(
      "Pharmacist profile updated successfully.",
      {
        user_id,
        full_name,
        email,
        store_name,
        address,
        profile_picture: profile_picture_url,
      },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Unexpected server error:", error);
    return failure(
      "Unexpected server error occurred.",
      error.message,
      500,
      { headers: corsHeaders }
    );
  }
}
