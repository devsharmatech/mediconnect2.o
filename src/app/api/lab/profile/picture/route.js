import { supabase } from "@/lib/supabaseAdmin";
import { uploadToS3, getCloudFrontUrl, extractKeyFromUrl } from "@/lib/s3";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const formData = await req.formData();

    const lab_id = formData.get("lab_id");
    const file = formData.get("file");

    if (!lab_id)
      return new Response(
        JSON.stringify({ status: false, message: "lab_id required" }),
        { headers: corsHeaders }
      );

    if (!file)
      return new Response(
        JSON.stringify({ status: false, message: "file required" }),
        { headers: corsHeaders }
      );

    // Upload to Supabase Storage
    const fileExt = file.name.split(".").pop();
    const filePath = `lab_${lab_id}.${fileExt}`;

    const { url } = await uploadToS3(file, `profile-pictures/${filePath}`, "application/octet-stream");
    const publicUrl = url;

    // Save URL in users table
    const { error } = await supabase
      .from("users")
      .update({ profile_picture: publicUrl })
      .eq("id", lab_id);

    if (error) throw error;

    return new Response(
      JSON.stringify({
        status: true,
        message: "Profile picture updated",
        profile_picture: publicUrl,
      }),
      { headers: corsHeaders }
    );
  } catch (err) {
    console.log(err);
    return new Response(
      JSON.stringify({ status: false, message: err.message }),
      { headers: corsHeaders }
    );
  }
}
