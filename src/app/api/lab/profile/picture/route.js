import sql from "@/lib/db";
import { uploadToS3 } from "@/lib/s3";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req) {
  try {
    const formData = await req.formData();

    const lab_id = formData.get("lab_id");
    const file = formData.get("file");

    if (!lab_id || !UUID_REGEX.test(lab_id))
      return new Response(
        JSON.stringify({ status: false, message: "valid lab_id required" }),
        { headers: corsHeaders }
      );

    if (!file)
      return new Response(
        JSON.stringify({ status: false, message: "file required" }),
        { headers: corsHeaders }
      );

    const fileExt = file.name.split(".").pop();
    const filePath = `lab_${lab_id}.${fileExt}`;

    const { url } = await uploadToS3(file, `profile-pictures/${filePath}`, "application/octet-stream");
    const publicUrl = url;

    // Save URL in users table
    await sql`
      UPDATE users
      SET profile_picture = ${publicUrl}, updated_at = NOW()
      WHERE id = ${lab_id}
    `;

    return new Response(
      JSON.stringify({
        status: true,
        message: "Profile picture updated",
        profile_picture: publicUrl,
      }),
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("Lab profile picture error:", err);
    return new Response(
      JSON.stringify({ status: false, message: err.message }),
      { headers: corsHeaders }
    );
  }
}
