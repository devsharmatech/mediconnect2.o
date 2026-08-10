import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { uploadToS3, getCloudFrontUrl, extractKeyFromUrl } from "@/lib/s3";

export async function PUT(request) {
  try {
    const formData = await request.formData();

    const id = formData.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Doctor ID is required" },
        { status: 400 }
      );
    }

    // Helper to safely parse JSON fields
    const parseJSON = (value) => {
      if (!value) return undefined;
      try {
        return JSON.parse(value);
      } catch {
        return undefined;
      }
    };

    // Support both old and new field names
    const rawFullName = formData.get("full_name") || formData.get("doctor_name");
    const full_name = rawFullName ? String(rawFullName) : undefined;

    const email = formData.get("email") || undefined;
    const phone = formData.get("phone") || undefined;

    // Experience
    const rawYearsExperience =
      formData.get("years_experience") || formData.get("experience_years");
    const experience_years = rawYearsExperience
      ? parseInt(String(rawYearsExperience), 10)
      : undefined;

    // Registration / license number
    const rawLicense =
      formData.get("doctor_registration_no") || formData.get("license_number");
    const license_number = rawLicense && String(rawLicense).trim().length > 0
      ? String(rawLicense).trim()
      : undefined;

    // Speciality (stored in specialization column)
    const rawSpeciality = formData.get("speciality") || formData.get("specialization");
    let specialization = undefined;
    if (rawSpeciality) {
      const parsed = parseJSON(rawSpeciality);
      if (Array.isArray(parsed)) {
        specialization = parsed;
      } else {
        specialization = String(rawSpeciality).trim();
      }
    }

    // Super speciality inside meta
    const rawSuperSpeciality = formData.get("super_speciality");
    const super_speciality = parseJSON(rawSuperSpeciality);

    // Clinic details
    const clinic_name = formData.get("clinic_name") || undefined;
    const clinic_address = formData.get("clinic_address") || undefined;
    const additional_clinics = formData.get("additional_clinics") || undefined;
    const latitude = formData.get("clinic_lat")
      ? parseFloat(formData.get("clinic_lat"))
      : undefined;
    const longitude = formData.get("clinic_lng")
      ? parseFloat(formData.get("clinic_lng"))
      : undefined;

    // Availability
    const rawAvailableDays = formData.get("available_days");
    let available_days = undefined;
    if (rawAvailableDays) {
      const parsed = parseJSON(rawAvailableDays);
      if (Array.isArray(parsed)) {
        available_days = parsed;
      } else {
        available_days = String(rawAvailableDays)
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean);
      }
    }

    const rawLeaveDays = formData.get("leave_days");
    let leave_days = undefined;
    if (rawLeaveDays) {
      const parsed = parseJSON(rawLeaveDays);
      if (Array.isArray(parsed)) {
        leave_days = parsed;
      } else {
        leave_days = String(rawLeaveDays)
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean);
      }
    }

    const available_time = parseJSON(formData.get("available_time"));
    const clinic_slots = parseJSON(formData.get("clinic_slots"));
    const video_slots = parseJSON(formData.get("video_slots"));
    const home_slots = parseJSON(formData.get("home_slots"));

    // Qualification
    const rawQualification = formData.get("qualification");
    let qualification = undefined;
    if (rawQualification) {
      const parsed = parseJSON(rawQualification);
      qualification = parsed !== undefined ? parsed : String(rawQualification).trim();
    }

    // Speciality tags
    const rawTags = formData.get("speciality_tags");
    let speciality_tags = undefined;
    if (rawTags) {
      const parsed = parseJSON(rawTags);
      if (Array.isArray(parsed)) {
        speciality_tags = parsed;
      } else {
        speciality_tags = String(rawTags)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }
    }

    const rawVideoFee = formData.get("video_consultation_fee");
    const video_consultation_fee = rawVideoFee ? parseFloat(String(rawVideoFee)) : undefined;

    const rawClinicFee = formData.get("clinic_consultation_fee");
    const clinic_consultation_fee = rawClinicFee ? parseFloat(String(rawClinicFee)) : undefined;

    const rawHomeFee = formData.get("home_visit_fee");
    const home_visit_fee = rawHomeFee ? parseFloat(String(rawHomeFee)) : undefined;

    const rawInsurance =
      formData.get("insurance") || formData.get("indemnity_insurance");
    const indemnity_insurance = rawInsurance
      ? parseFloat(String(rawInsurance))
      : undefined;

    // Identity fields
    const aadhaar = formData.get("aadhaar");
    const pan = formData.get("pan");
    const driving_license = formData.get("driving_license");
    const address = formData.get("address");

    // BPL & agreements
    const bpl_service_agreement = formData.get("bpl_service_agreement");
    const bpl_preferred_time = formData.get("bpl_preferred_time");
    const non_disclosure_agreement = formData.get("non_disclosure_agreement");
    const terms_conditions_agreement = formData.get("terms_conditions_agreement");

    // Bank details (from individual fields)
    const bank_account_name = formData.get("bank_account_name");
    const bank_account_number = formData.get("bank_account_number");
    const bank_ifsc_code = formData.get("bank_ifsc_code");
    const bank_name = formData.get("bank_name");
    const bank_branch = formData.get("bank_branch");

    const digital_consent_raw = formData.get("digital_consent");
    const onboarding_status = formData.get("onboarding_status") || undefined;
    const kyc_status = formData.get("kyc_status") || undefined;
    const rawKycData = formData.get("kyc_data");
    const kyc_data = parseJSON(rawKycData);

    // File uploads: support both new (web/admin) and older *_file field names
    const firstFileOrNull = (fields) => {
      for (const field of fields) {
        if (!field) continue;
        if (Array.isArray(field)) {
          const found = field.find((f) => f && typeof f !== "string");
          if (found) return found;
        } else if (typeof field !== "string" && field) {
          return field;
        }
      }
      return null;
    };

    const dmcFiles = formData.getAll("dmc_mci_nmc_certificates");
    const dmc_mci_certificate_file = firstFileOrNull([
      dmcFiles,
      formData.get("dmc_mci_certificate_file"),
    ]);

    const aadhaarPanFiles = formData.getAll("aadhaar_pan_license");
    const aadhaar_pan_license_file = firstFileOrNull([
      aadhaarPanFiles,
      formData.get("aadhaar_pan_license_file"),
    ]);

    const addressProofFiles = formData.getAll("address_proof");
    const address_proof_file = firstFileOrNull([
      addressProofFiles,
      formData.get("address_proof_file"),
    ]);

    const passportFiles = formData.getAll("passport_photo");
    const passport_photo_file = firstFileOrNull([
      passportFiles,
      formData.get("passport_photo_file"),
    ]);

    // Get current doctor details (needed for meta merge, existence check)
    const { data: currentDoctor, error: fetchError } = await supabase
      .from("doctor_details")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const updateData = {
      email,
      specialization,
      experience_years,
      license_number,
      clinic_name,
      clinic_address,
      latitude,
      longitude,
      available_days,
      available_time,
      clinic_slots,
      video_slots,
      home_slots,
      leave_days,
      speciality_tags,
      video_consultation_fee,
      clinic_consultation_fee,
      home_visit_fee,
      qualification,
      indemnity_insurance,
      updated_at: new Date().toISOString(),
    };

    // Only set full_name when we actually have a value
    if (full_name) {
      updateData.full_name = full_name;
    }

    // Bank account details
    if (bank_account_number || bank_ifsc_code || bank_name || bank_branch || bank_account_name) {
      updateData.bank_account_details = {
        ...(currentDoctor?.bank_account_details || {}),
        ...(bank_account_name !== null && bank_account_name !== undefined
          ? { account_name: bank_account_name }
          : {}),
        ...(bank_account_number !== null && bank_account_number !== undefined
          ? { account_no: bank_account_number }
          : {}),
        ...(bank_ifsc_code !== null && bank_ifsc_code !== undefined
          ? { ifsc: bank_ifsc_code }
          : {}),
        ...(bank_name !== null && bank_name !== undefined
          ? { bank_name }
          : {}),
        ...(bank_branch !== null && bank_branch !== undefined
          ? { branch: bank_branch }
          : {}),
      };
    }

    // Digital consent
    if (digital_consent_raw !== null && digital_consent_raw !== undefined) {
      updateData.digital_consent = String(digital_consent_raw) === "true";
    }

    // Onboarding status
    if (onboarding_status) {
      updateData.onboarding_status = onboarding_status;
    }

    // KYC Details
    if (kyc_status) {
      updateData.kyc_status = kyc_status;
    }
    if (kyc_data !== undefined) {
      updateData.kyc_data = kyc_data;
    }

    // Meta (identity, BPL, agreements, super_speciality)
    const metaUpdate = {};
    if (aadhaar !== null && aadhaar !== undefined) metaUpdate.aadhaar = aadhaar;
    if (pan !== null && pan !== undefined) metaUpdate.pan = pan;
    if (driving_license !== null && driving_license !== undefined)
      metaUpdate.driving_license = driving_license;
    if (address !== null && address !== undefined) metaUpdate.address = address;

    if (super_speciality !== undefined) {
      metaUpdate.super_speciality = super_speciality;
    }

    if (bpl_service_agreement !== null && bpl_service_agreement !== undefined) {
      metaUpdate.bpl_service_agreement = String(bpl_service_agreement) === "true";
    }
    if (bpl_preferred_time !== null && bpl_preferred_time !== undefined) {
      metaUpdate.bpl_preferred_time = bpl_preferred_time;
    }
    if (non_disclosure_agreement !== null && non_disclosure_agreement !== undefined) {
      metaUpdate.non_disclosure_agreement =
        String(non_disclosure_agreement) === "true";
    }
    if (terms_conditions_agreement !== null && terms_conditions_agreement !== undefined) {
      metaUpdate.terms_conditions_agreement =
        String(terms_conditions_agreement) === "true";
    }
    if (additional_clinics !== undefined) {
      metaUpdate.additional_clinics = parseJSON(additional_clinics);
    }

    if (Object.keys(metaUpdate).length > 0) {
      updateData.meta = {
        ...(currentDoctor?.meta || {}),
        ...metaUpdate,
      };
    }

    // Handle file uploads
    const uploadFile = async (folder, file) => {
      if (!file) return null;
      const fileName = `${id}-${Date.now()}.${file.name.split(".").pop()}`;
      try {
        const { url } = await uploadToS3(file, `doctor-documents/${folder}/${fileName}`, "application/octet-stream");
        return url;
      } catch (err) {
        console.error("Upload error in onboard update uploadFile helper:", err);
        return null;
      }
    };

    const dmcUrl = await uploadFile("dmc-certificates", dmc_mci_certificate_file);
    if (dmcUrl) {
      updateData.dmc_mci_certificate = [dmcUrl];
    }
    const aadhaarPanUrl = await uploadFile("aadhaar-pan", aadhaar_pan_license_file);
    if (aadhaarPanUrl) {
      updateData.aadhaar_pan_license = [aadhaarPanUrl];
    }
    const addressProofUrl = await uploadFile("address-proofs", address_proof_file);
    if (addressProofUrl) {
      updateData.address_proof = [addressProofUrl];
    }
    const passportUrl = await uploadFile("passport-photos", passport_photo_file);
    if (passportUrl) {
      updateData.passport_photo = [passportUrl];
    }

    let parsedSignatureUrl = undefined;
    const signatureUrlRaw = formData.get("signature_url");
    if (signatureUrlRaw && typeof signatureUrlRaw === "string" && signatureUrlRaw.startsWith("http")) {
      parsedSignatureUrl = signatureUrlRaw;
    } else if (signatureUrlRaw) {
      try {
        const parsed = JSON.parse(signatureUrlRaw);
        if (Array.isArray(parsed)) {
          parsedSignatureUrl = parsed.length > 0 ? parsed[0] : null;
        } else {
          parsedSignatureUrl = parsed;
        }
      } catch (e) {
        parsedSignatureUrl = undefined;
      }
    }
    if (parsedSignatureUrl !== undefined) {
      updateData.signature_url = parsedSignatureUrl;
    }

    // ✅ Support pre-uploaded URL arrays from admin form (JSON-encoded arrays of public URLs)
    // The admin page uploads files first via /api/upload/doctor-document then sends URLs here
    const parseUrlArray = (key) => {
      const raw = formData.get(key);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* not JSON */ }
      return null;
    };

    // Only set if no file was already uploaded (avoid overwriting fresh upload)
    if (!updateData.dmc_mci_certificate) {
      const urls = parseUrlArray("dmc_mci_certificate") || parseUrlArray("dmc_mci_nmc_certificates");
      if (urls) updateData.dmc_mci_certificate = urls;
    }
    if (!updateData.aadhaar_pan_license) {
      const urls = parseUrlArray("aadhaar_pan_license");
      if (urls) updateData.aadhaar_pan_license = urls;
    }
    if (!updateData.address_proof) {
      const urls = parseUrlArray("address_proof");
      if (urls) updateData.address_proof = urls;
    }
    if (!updateData.passport_photo) {
      const urls = parseUrlArray("passport_photo");
      if (urls) updateData.passport_photo = urls;
    }

    const clinicPhotosRaw = formData.get("clinic_photos");
    if (clinicPhotosRaw) {
      try {
        const parsed = JSON.parse(clinicPhotosRaw);
        if (Array.isArray(parsed)) {
          updateData.clinic_photos = parsed;
        }
      } catch {
        // not JSON, ignore
      }
    }

    // Remove undefined fields so we don't overwrite existing values unintentionally
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    if (phone !== undefined) {
      updateData.phone_number = phone;
    }

    const phoneToUpdate = updateData.phone_number;
    delete updateData.phone_number;

    // Update or insert doctor details safely without overwriting omitted columns with NULL
    let { data: doctorDetails, error: detailsError } = await supabase
      .from("doctor_details")
      .update(updateData)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (detailsError) throw detailsError;

    // If row didn't exist, insert it
    if (!doctorDetails) {
      const { data: newDetails, error: insertError } = await supabase
        .from("doctor_details")
        .insert({ id, ...updateData })
        .select()
        .single();
      
      if (insertError) throw insertError;
      doctorDetails = newDetails;
    }

    if (phoneToUpdate) {
      const { error: userUpdateError } = await supabase
        .from("users")
        .update({ phone_number: phoneToUpdate })
        .eq("id", id);
      if (userUpdateError) {
        console.error("Error updating users table phone:", userUpdateError);
        throw new Error(`Failed to update user phone number: ${userUpdateError.message || JSON.stringify(userUpdateError)}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: doctorDetails,
    });
  } catch (error) {
    console.error("Error updating doctor:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
