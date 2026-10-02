import sql from "@/lib/db";
import { uploadToS3, deleteFromS3 } from "@/lib/s3";
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
    const [userData] = await sql`
      SELECT id, profile_picture, role
      FROM users
      WHERE id = ${user_id}
      LIMIT 1
    `;

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
        if (userData.profile_picture) {
          const oldFile = userData.profile_picture.split("/").pop();
          await deleteFromS3(`profile-pictures/${oldFile}`);
        }

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
    await sql`
      INSERT INTO pharmacist_details (id, full_name, email, store_name, pharmacy_name, license_number, address)
      VALUES (${user_id}, ${full_name}, ${email}, ${store_name}, ${store_name}, ${license_number}, ${address})
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        store_name = EXCLUDED.store_name,
        pharmacy_name = EXCLUDED.pharmacy_name,
        license_number = EXCLUDED.license_number,
        address = EXCLUDED.address
    `;

    // ✅ Update user profile picture / phone if changed
    await sql`
      UPDATE users
      SET 
        profile_picture = ${profile_picture_url},
        phone_number = COALESCE(${phone || null}, phone_number),
        updated_at = NOW()
      WHERE id = ${user_id}
    `;

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
