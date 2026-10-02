import sql from "@/lib/db";
import { uploadToS3 } from "@/lib/s3";
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

    // ✅ Fetch current user and doctor_details
    const [userData] = await sql`
      SELECT id, profile_picture, role
      FROM users
      WHERE id = ${user_id}
      LIMIT 1
    `;

    if (!userData) return failure("User not found.", null, 404, { headers: corsHeaders });
    if (userData.role !== "doctor")
      return failure("Invalid role. Only doctors can be updated here.", null, 403, { headers: corsHeaders });

    const [existingDoc] = await sql`
      SELECT dmc_mci_certificate, aadhaar_pan_license, address_proof, passport_photo
      FROM doctor_details
      WHERE id = ${user_id}
      LIMIT 1
    `;

    // ✅ Helper to upload file
    async function uploadDocFile(file, folder, existingFallback = null) {
      if (!file || typeof file === "string" || !file.name) return existingFallback;
      const ext = file.name.split(".").pop();
      const fileName = `${folder}/${user_id}_${Date.now()}.${ext}`;
      const { url } = await uploadToS3(file, `profile-pictures/${fileName}`, "application/octet-stream");
      return [url];
    }

    async function uploadProfilePic(file, existingFallback = null) {
      if (!file || typeof file === "string" || !file.name) return existingFallback;
      const ext = file.name.split(".").pop();
      const fileName = `profile/${user_id}_${Date.now()}.${ext}`;
      const { url } = await uploadToS3(file, `profile-pictures/${fileName}`, "application/octet-stream");
      return url;
    }

    // ✅ Upload all files with fallback to existing
    const [
      profile_picture_url,
      dmc_mci_certificate_val,
      aadhaar_pan_license_val,
      address_proof_val,
      passport_photo_val
    ] = await Promise.all([
      uploadProfilePic(fileProfile, userData.profile_picture),
      uploadDocFile(fileDmc, "certificates", existingDoc?.dmc_mci_certificate),
      uploadDocFile(fileAadhaar, "aadhaar", existingDoc?.aadhaar_pan_license),
      uploadDocFile(fileAddress, "address", existingDoc?.address_proof),
      uploadDocFile(filePassport, "passport", existingDoc?.passport_photo)
    ]);

    // ✅ Parse JSON fields
    let parsedBank = null;
    let parsedAvailableTime = null;
    try {
      parsedBank = bank_account_details ? (typeof bank_account_details === "string" ? JSON.parse(bank_account_details) : bank_account_details) : null;
    } catch {
      parsedBank = null;
    }

    try {
      parsedAvailableTime = available_time ? (typeof available_time === "string" ? JSON.parse(available_time) : available_time) : null;
    } catch {
      parsedAvailableTime = null;
    }

    // ✅ Update doctor details
    await sql`
      INSERT INTO doctor_details (
        id, full_name, email, specialization, experience_years, license_number, clinic_name, clinic_address,
        video_consultation_fee, clinic_consultation_fee, home_visit_fee, qualification, indemnity_insurance,
        dmc_mci_certificate, aadhaar_pan_license, address_proof, passport_photo,
        bank_account_details, digital_consent, onboarding_status, available_days, available_time, updated_at
      )
      VALUES (
        ${user_id}, ${full_name}, ${email}, ${specialization}, ${experience_years ? Number(experience_years) : null},
        ${license_number}, ${clinic_name}, ${clinic_address},
        ${video_consultation_fee ? Number(video_consultation_fee) : 0},
        ${clinic_consultation_fee ? Number(clinic_consultation_fee) : 0},
        ${home_visit_fee ? Number(home_visit_fee) : 0},
        ${qualification},
        ${indemnity_insurance ? Number(indemnity_insurance) : null},
        ${dmc_mci_certificate_val ? sql.json(dmc_mci_certificate_val) : null},
        ${aadhaar_pan_license_val ? sql.json(aadhaar_pan_license_val) : null},
        ${address_proof_val ? sql.json(address_proof_val) : null},
        ${passport_photo_val ? sql.json(passport_photo_val) : null},
        ${parsedBank ? sql.json(parsedBank) : null},
        ${digital_consent},
        ${onboarding_status},
        ${available_days.length ? available_days : null},
        ${parsedAvailableTime ? sql.json(parsedAvailableTime) : null},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        specialization = EXCLUDED.specialization,
        experience_years = EXCLUDED.experience_years,
        license_number = EXCLUDED.license_number,
        clinic_name = EXCLUDED.clinic_name,
        clinic_address = EXCLUDED.clinic_address,
        video_consultation_fee = EXCLUDED.video_consultation_fee,
        clinic_consultation_fee = EXCLUDED.clinic_consultation_fee,
        home_visit_fee = EXCLUDED.home_visit_fee,
        qualification = EXCLUDED.qualification,
        indemnity_insurance = EXCLUDED.indemnity_insurance,
        dmc_mci_certificate = COALESCE(EXCLUDED.dmc_mci_certificate, doctor_details.dmc_mci_certificate),
        aadhaar_pan_license = COALESCE(EXCLUDED.aadhaar_pan_license, doctor_details.aadhaar_pan_license),
        address_proof = COALESCE(EXCLUDED.address_proof, doctor_details.address_proof),
        passport_photo = COALESCE(EXCLUDED.passport_photo, doctor_details.passport_photo),
        bank_account_details = COALESCE(EXCLUDED.bank_account_details, doctor_details.bank_account_details),
        digital_consent = EXCLUDED.digital_consent,
        onboarding_status = EXCLUDED.onboarding_status,
        available_days = EXCLUDED.available_days,
        available_time = EXCLUDED.available_time,
        updated_at = NOW()
    `;

    // ✅ Update profile picture in users
    if (profile_picture_url && profile_picture_url !== userData.profile_picture) {
      await sql`
        UPDATE users
        SET profile_picture = ${profile_picture_url}, updated_at = NOW()
        WHERE id = ${user_id}
      `;
    }

    // ✅ Fetch updated full details
    const [updatedDoctor] = await sql`
      SELECT d.*, json_build_object('profile_picture', u.profile_picture) as users
      FROM doctor_details d
      JOIN users u ON u.id = d.id
      WHERE d.id = ${user_id}
      LIMIT 1
    `;

    return success("Doctor profile updated successfully.", updatedDoctor, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("Doctor update error:", error);
    return failure("Failed to update doctor profile.", error.message, 500, { headers: corsHeaders });
  }
}
