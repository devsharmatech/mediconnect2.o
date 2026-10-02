import sql from "@/lib/db";
import { uploadToS3, deleteFromS3 } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function PUT(req) {
  try {
    const formData = await req.formData();
    const user_id = formData.get("user_id");
    const lab_name = formData.get("lab_name");
    const owner_name = formData.get("owner_name");
    const email = formData.get("email");
    const address = formData.get("address");
    const license_number = formData.get("license_number");
    const file = formData.get("profile_picture");

    if (!user_id || !lab_name || !email)
      return failure("Missing required fields: user_id, lab_name, or email.", null, 400, { headers: corsHeaders });

    const [userData] = await sql`
      SELECT id, profile_picture, role
      FROM users
      WHERE id = ${user_id}
      LIMIT 1
    `;
    if (!userData) return failure("User not found.", null, 404, { headers: corsHeaders });
    if (userData.role !== "lab") return failure("Invalid role.", null, 403, { headers: corsHeaders });

    let profile_picture_url = userData.profile_picture || null;

    if (file && file.name) {
      if (userData.profile_picture) {
        const oldFile = userData.profile_picture.split("/").pop();
        await deleteFromS3(`profile-pictures/${oldFile}`);
      }
      const ext = file.name.split(".").pop();
      const fileName = `${user_id}_${Date.now()}.${ext}`;
      const { url } = await uploadToS3(file, `profile-pictures/${fileName}`, "application/octet-stream");
      profile_picture_url = url;
    }

    await sql`
      INSERT INTO lab_details (id, lab_name, owner_name, email, address, license_number, updated_at)
      VALUES (${user_id}, ${lab_name}, ${owner_name}, ${email}, ${address}, ${license_number}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        lab_name = EXCLUDED.lab_name,
        owner_name = EXCLUDED.owner_name,
        email = EXCLUDED.email,
        address = EXCLUDED.address,
        license_number = EXCLUDED.license_number,
        updated_at = NOW()
    `;

    if (profile_picture_url !== userData.profile_picture) {
      await sql`
        UPDATE users
        SET profile_picture = ${profile_picture_url}, updated_at = NOW()
        WHERE id = ${user_id}
      `;
    }

    return success("Lab profile updated successfully.", { user_id, lab_name, email, profile_picture: profile_picture_url }, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Lab profile update error:", error);
    return failure("Server error occurred.", error.message, 500, { headers: corsHeaders });
  }
}
