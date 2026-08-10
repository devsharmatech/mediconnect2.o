import { supabase } from "@/lib/supabaseAdmin";
import { uploadToS3, deleteFromS3 } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

// 🟢 Handle preflight (CORS)
export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function PUT(req) {
  try {
    const formData = await req.formData();
    const user_id = formData.get("user_id");
    const full_name = formData.get("full_name");
    const email = formData.get("email");
    const gender = formData.get("gender");
    const date_of_birth = formData.get("date_of_birth");
    const address = formData.get("address") || "";
    const file = formData.get("profile_picture");
    const emergency_contact = formData.get("emergency_contact");
    const latitude = formData.get("latitude");
    const longitude = formData.get("longitude");

    // 🔸 Validate required fields
    if (!user_id)
      return failure("Missing required field: user_id.", null, 400, { headers: corsHeaders });

    const requiredFields = { full_name, email, gender, date_of_birth };
    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value || value.trim() === "") {
        return failure(`${key.replace("_", " ")} is required.`, null, 400, { headers: corsHeaders });
      }
    }

    // 📧 Email validation
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return failure("Invalid email format.", null, 400, { headers: corsHeaders });

    // 🔍 Fetch user info
    const { data: userData, error: userFetchError } = await supabase
      .from("users")
      .select("id, profile_picture")
      .eq("id", user_id)
      .maybeSingle();

    if (userFetchError) throw userFetchError;
    if (!userData) return failure("User not found.", null, 404, { headers: corsHeaders });

    // 📧 Ensure unique email
    const { data: emailExists, error: emailCheckError } = await supabase
      .from("patient_details")
      .select("id")
      .eq("email", email)
      .neq("id", user_id)
      .maybeSingle();

    if (emailCheckError) throw emailCheckError;
    if (emailExists)
      return failure("Email already registered with another account.", null, 409, { headers: corsHeaders });

    // 🖼️ Handle optional profile picture upload
    let profile_picture_url = userData.profile_picture;

    if (file && file.name) {
      try {
        // 🧹 Delete old image if exists
        if (userData.profile_picture) {
          const oldFile = userData.profile_picture.split("/").pop();
          if (oldFile) {
            await deleteFromS3(`profile-pictures/${oldFile}`);
          }
        }

        // 📸 Upload new image
        const ext = file.name.split(".").pop();
        const fileName = `${user_id}_${Date.now()}.${ext}`;
        const { url } = await uploadToS3(file, `profile-pictures/${fileName}`, file.type || "application/octet-stream");
        profile_picture_url = url;
      } catch (uploadError) {
        console.error("Profile picture upload failed:", uploadError);
        return failure("Failed to upload profile picture.", uploadError.message, 500, { headers: corsHeaders });
      }
    }

    // 🧠 Upsert patient details
    const { error: updateError } = await supabase
      .from("patient_details")
      .upsert({
        id: user_id,
        full_name,
        email,
        gender,
        date_of_birth,
        address,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        emergency_contact,
        updated_at: new Date(),
      });

    if (updateError) throw updateError;

    // 🖼️ Update picture only if changed
    if (profile_picture_url !== userData.profile_picture) {
      const { error: userUpdateError } = await supabase
        .from("users")
        .update({
          profile_picture: profile_picture_url,
          updated_at: new Date(),
        })
        .eq("id", user_id);

      if (userUpdateError) throw userUpdateError;
    }

    // ✅ Return final data
    return success(
      "Profile updated successfully.",
      {
        user_id,
        full_name,
        email,
        gender,
        date_of_birth,
        address,
        emergency_contact,
        profile_picture: profile_picture_url,
      },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Profile update error:", error);
    return failure("Unexpected server error occurred.", error.message, 500, { headers: corsHeaders });
  }
}
