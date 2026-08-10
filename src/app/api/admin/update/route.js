import { supabase } from "@/lib/supabaseAdmin";
import { uploadToS3, deleteFromS3, getCloudFrontUrl, extractKeyFromUrl } from "@/lib/s3";
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

    // 🔹 Fetch user
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("id, role, profile_picture")
      .eq("id", id)
      .maybeSingle();

    if (userErr) throw userErr;
    if (!user) return failure("User not found.", "not_found", 404, { headers: corsHeaders });
    if (user.role !== "admin")
      return failure("User is not an admin.", "unauthorized", 403, { headers: corsHeaders });

    // 🔹 Upload new profile picture (profile-pictures bucket)
    let profile_picture_url = user.profile_picture;

    if (file && file.name) {
      const filename = `admins/${id}/profile_${Date.now()}_${file.name}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      // Remove old profile if exists
      if (user.profile_picture && user.profile_picture.includes("/profile-pictures/")) {
        const oldPath = user.profile_picture.split("/profile-pictures/")[1];
        await deleteFromS3(`profile-pictures/${oldPath}`);
      }

      let publicUrl;
      try {
        const { url } = await uploadToS3(buffer, `profile-pictures/${filename}`, "application/octet-stream");
        publicUrl = url;
      } catch (err) {
        throw err;
      }
      uploadedPath = filename;
      profile_picture_url = publicUrl;
    }

    // 🔹 Update users
    const { error: userUpdateErr } = await supabase
      .from("users")
      .update({
        profile_picture: profile_picture_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (userUpdateErr) throw userUpdateErr;

    // 🔹 Upsert admin_details
    const { data: adminData, error: adminErr } = await supabase
      .from("admin_details")
      .upsert({
        id,
        full_name,
        email,
        permissions,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (adminErr) throw adminErr;

    return success(
      "Admin updated successfully.",
      { user: { id, profile_picture: profile_picture_url }, admin: adminData },
      200,
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Admin update error:", err);
    if (uploadedPath) await deleteFromS3(`profile-pictures/${uploadedPath}`);
    return failure("Failed to update admin. " + err.message, "admin_update_failed", 500, {
      headers: corsHeaders,
    });
  }
}
