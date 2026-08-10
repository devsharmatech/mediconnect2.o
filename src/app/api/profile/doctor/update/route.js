import { supabase } from "@/lib/supabaseAdmin";
import { uploadToS3, getCloudFrontUrl, extractKeyFromUrl } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function PUT(req) {
  try {
    const formData = await req.formData();
    const user_id = formData.get("user_id");
    const full_name = formData.get("full_name");
    const email = formData.get("email");
    const specialization = formData.get("specialization");
    const experience_years = formData.get("experience_years");
    const license_number = formData.get("license_number");
    const clinic_name = formData.get("clinic_name");
    const clinic_address = formData.get("clinic_address");
    const video_consultation_fee = formData.get("video_consultation_fee");
    const clinic_consultation_fee = formData.get("clinic_consultation_fee");
    const home_visit_fee = formData.get("home_visit_fee");
    const qualification = formData.get("qualification");
    const indemnity_insurance = formData.get("indemnity_insurance");
    const bank_account_details = formData.get("bank_account_details");
    const digital_consent = formData.get("digital_consent") === "true";
    const onboarding_status = formData.get("onboarding_status") || "pending";

    // ✅ Schedule fields
    const available_days = formData.getAll("available_days[]");
    const available_time = formData.get("available_time");

    // ✅ Files
    const fileProfile = formData.get("profile_picture");
    const fileDmc = formData.get("dmc_mci_certificate");
    const fileAadhaar = formData.get("aadhaar_pan_license");
    const fileAddress = formData.get("address_proof");
    const filePassport = formData.get("passport_photo");

    // ✅ Validation
    if (!user_id || !full_name || !email) {
      return failure("Missing required fields: user_id, full_name, or email.", null, 400, { headers: corsHeaders });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return failure("Invalid email format.", null, 400, { headers: corsHeaders });
    }

    // ✅ Fetch current user
    const { data: userData, error: userFetchError } = await supabase
      .from("users")
      .select("id, profile_picture, role")
      .eq("id", user_id)
      .maybeSingle();

    if (userFetchError) throw userFetchError;
    if (!userData) return failure("User not found.", null, 404, { headers: corsHeaders });
    if (userData.role !== "doctor")
      return failure("Invalid role. Only doctors can be updated here.", null, 403, { headers: corsHeaders });

    // ✅ Declare file URLs
    let profile_picture_url = userData.profile_picture;
    let dmc_mci_certificate_url = null;
    let aadhaar_pan_license_url = null;
    let address_proof_url = null;
    let passport_photo_url = null;

    // ✅ Helper to upload file
    async function uploadFile(file, folder) {
      if (!file || !file.name) return null;
      const ext = file.name.split(".").pop();
      const fileName = `${folder}/${user_id}_${Date.now()}.${ext}`;
      const { url } = await uploadToS3(file, `profile-pictures/${fileName}`, "application/octet-stream");
      return url;
    }

    // ✅ Upload all files
    const uploads = await Promise.all([
      uploadFile(fileProfile, "profile"),
      uploadFile(fileDmc, "certificates"),
      uploadFile(fileAadhaar, "aadhaar"),
      uploadFile(fileAddress, "address"),
      uploadFile(filePassport, "passport")
    ]);

    [
      profile_picture_url,
      dmc_mci_certificate_url,
      aadhaar_pan_license_url,
      address_proof_url,
      passport_photo_url
    ] = uploads;

    // ✅ Parse JSON fields
    let parsedBank = null;
    let parsedAvailableTime = null;
    try {
      parsedBank = bank_account_details ? JSON.parse(bank_account_details) : null;
    } catch {
      parsedBank = null;
    }

    try {
      parsedAvailableTime = available_time ? JSON.parse(available_time) : null;
    } catch {
      parsedAvailableTime = null;
    }

    // ✅ Update doctor details
    const { error: updateError } = await supabase
      .from("doctor_details")
      .update({
        full_name,
        email,
        specialization,
        experience_years: experience_years ? Number(experience_years) : null,
        license_number,
        clinic_name,
        clinic_address,
        video_consultation_fee: video_consultation_fee ? Number(video_consultation_fee) : 0,
        clinic_consultation_fee: clinic_consultation_fee ? Number(clinic_consultation_fee) : 0,
        home_visit_fee: home_visit_fee ? Number(home_visit_fee) : 0,
        qualification,
        indemnity_insurance: indemnity_insurance ? Number(indemnity_insurance) : null,
        dmc_mci_certificate: dmc_mci_certificate_url || null,
        aadhaar_pan_license: aadhaar_pan_license_url || null,
        address_proof: address_proof_url || null,
        passport_photo: passport_photo_url || null,
        bank_account_details: parsedBank,
        digital_consent,
        onboarding_status,
        available_days: available_days.length ? available_days : null,
        available_time: parsedAvailableTime,
        updated_at: new Date()
      })
      .eq("id", user_id);

    if (updateError) throw updateError;

    // ✅ Update profile picture in users
    if (profile_picture_url && profile_picture_url !== userData.profile_picture) {
      await supabase.from("users").update({ profile_picture: profile_picture_url }).eq("id", user_id);
    }

    // ✅ Fetch updated full details
    const { data: updatedDoctor, error: fetchError } = await supabase
      .from("doctor_details")
      .select(`
        *,
        users:users!inner(
          profile_picture
        )
      `)
      .eq("id", user_id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    return success("Doctor profile updated successfully.", updatedDoctor, 200, { headers: corsHeaders });

  } catch (error) {
    console.error("Doctor update error:", error);
    return failure("Failed to update doctor profile.", error.message, 500, { headers: corsHeaders });
  }
}
