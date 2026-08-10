import { supabase } from "@/lib/supabaseAdmin";
import { deleteFromS3, extractKeyFromUrl } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function DELETE(req) {
  try {
    const { user_id } = await req.json();
    if (!user_id) {
      return failure("Missing required field: user_id.", null, 400, { headers: corsHeaders });
    }
    const { data: userData, error: fetchError } = await supabase
      .from("users")
      .select("id, role, profile_picture")
      .eq("id", user_id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!userData) {
      return failure("User not found.", null, 404, { headers: corsHeaders });
    }

    if (userData.profile_picture) {
      try {
        const fileName = userData.profile_picture.split("/").pop();
        await deleteFromS3(`profile-pictures/${fileName}`);
      } catch (imgError) {
        console.warn("Error while deleting profile picture:", imgError.message);
      }
    }

    const { error: patientError } = await supabase
      .from("patient_details")
      .delete()
      .eq("id", user_id);

    if (patientError) throw patientError;

    const { error: userDeleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", user_id);

    if (userDeleteError) throw userDeleteError;

    return success("Patient account deleted successfully.", null, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Delete account error:", error);
    return failure("Failed to delete account.", error.message, 500, { headers: corsHeaders });
  }
}
