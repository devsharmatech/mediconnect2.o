import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { uploadToS3, deleteFromS3, extractKeyFromUrl } from "@/lib/s3";

export async function POST(request) {
  try {
    const formData = await request.formData();

    // Text fields
    const full_name = formData.get('full_name');
    const email = formData.get('email');
    const specialization = formData.get('specialization');
    const experience_years = formData.get('experience_years');
    const license_number = formData.get('license_number');
    const clinic_name = formData.get('clinic_name');
    const clinic_address = formData.get('clinic_address');
    const consultation_fee = formData.get('consultation_fee');
    const qualification = formData.get('qualification');
    const indemnity_insurance = formData.get('indemnity_insurance');
    const digital_consent = formData.get('digital_consent');
    const onboarding_status = formData.get('onboarding_status') || 'pending';
    const phone_number = formData.get('phone_number');

    // Array fields
    const available_days = formData.get('available_days')?.split(',') || [];
    const speciality_tags = formData.get('speciality_tags')?.split(',') || [];

    // JSON fields
    const available_time = formData.get('available_time')
      ? JSON.parse(formData.get('available_time'))
      : { start: "09:00", end: "17:00" };

    const bank_account_details = formData.get('bank_account_details')
      ? JSON.parse(formData.get('bank_account_details'))
      : { account_no: "", ifsc: "", bank_name: "" };

    // File uploads (handle both `_file` suffix and exact keys)
    const getFileOrText = (key) => {
      const file = formData.get(`${key}_file`) || formData.get(key);
      if (file && typeof file === 'object' && file.name) return { file, text: null };
      return { file: null, text: typeof file === 'string' ? file : null };
    };

    const dmc_mci = getFileOrText('dmc_mci_certificate');
    const aadhaar_pan = getFileOrText('aadhaar_pan_license');
    const address_proof = getFileOrText('address_proof');
    const passport_photo = getFileOrText('passport_photo');
    const clinic_photos = getFileOrText('clinic_photos');

    // Validate required fields
    if (!full_name || !email || !specialization || !phone_number) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Start by creating user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([
        {
          phone_number,
          role: 'doctor',
          is_verified: false,
          status: 1,
        }
      ])
      .select()
      .single();

    if (userError) throw userError;

    const doctorId = user.id;

    // Upload files and get their URLs
    let dmc_mci_certificate_url = dmc_mci.text;
    let aadhaar_pan_license_url = aadhaar_pan.text;
    let address_proof_url = address_proof.text;
    let passport_photo_url = passport_photo.text;
    let clinic_photos_urls = clinic_photos.text ? [clinic_photos.text] : [];

    // Upload DMC/MCI Certificate
    if (dmc_mci.file) {
      const fileName = `${doctorId}-${Date.now()}.${dmc_mci.file.name.split('.').pop()}`;
      try {
        const { url } = await uploadToS3(dmc_mci.file, `doctor-documents/dmc-certificates/${fileName}`, "application/octet-stream");
        dmc_mci_certificate_url = url;
      } catch (err) { console.error("DMC upload error:", err); }
    }

    // Upload Aadhaar/PAN/License
    if (aadhaar_pan.file) {
      const fileName = `${doctorId}-${Date.now()}.${aadhaar_pan.file.name.split('.').pop()}`;
      try {
        const { url } = await uploadToS3(aadhaar_pan.file, `doctor-documents/aadhaar-pan/${fileName}`, "application/octet-stream");
        aadhaar_pan_license_url = url;
      } catch (err) { console.error("Aadhaar/PAN upload error:", err); }
    }

    // Upload Address Proof
    if (address_proof.file) {
      const fileName = `${doctorId}-${Date.now()}.${address_proof.file.name.split('.').pop()}`;
      try {
        const { url } = await uploadToS3(address_proof.file, `doctor-documents/address-proofs/${fileName}`, "application/octet-stream");
        address_proof_url = url;
      } catch (err) { console.error("Address proof upload error:", err); }
    }

    // Upload Passport Photo
    if (passport_photo.file) {
      const fileName = `${doctorId}-${Date.now()}.${passport_photo.file.name.split('.').pop()}`;
      try {
        const { url } = await uploadToS3(passport_photo.file, `doctor-documents/passport-photos/${fileName}`, "application/octet-stream");
        passport_photo_url = url;
      } catch (err) { console.error("Passport photo upload error:", err); }
    }

    // Upload Clinic Photos
    if (clinic_photos.file) {
      const fileName = `${doctorId}-${Date.now()}.${clinic_photos.file.name.split('.').pop()}`;
      try {
        const { url } = await uploadToS3(clinic_photos.file, `doctor-documents/clinic-photos/${fileName}`, "application/octet-stream");
        clinic_photos_urls = [url];
      } catch (err) { console.error("Clinic photos upload error:", err); }
    }

    const { data: doctorDetails, error: detailsError } = await supabase
      .from('doctor_details')
      .insert([
        {
          id: doctorId,
          full_name,
          email,
          specialization,
          experience_years: parseInt(experience_years) || 0,
          license_number,
          clinic_name,
          clinic_address,
          available_days,
          available_time,
          speciality_tags,
          consultation_fee: parseFloat(consultation_fee) || 0,
          qualification,
          indemnity_insurance: parseFloat(indemnity_insurance) || 0,
          dmc_mci_certificate: dmc_mci_certificate_url,
          aadhaar_pan_license: aadhaar_pan_license_url,
          address_proof: address_proof_url,
          passport_photo: passport_photo_url,
          clinic_photos: clinic_photos_urls,
          bank_account_details,
          digital_consent: Boolean(digital_consent),
          onboarding_status,
        }
      ])
      .select()
      .single();

    if (detailsError) {
      // Rollback: delete user and uploaded files
      await supabase.from('users').delete().eq('id', doctorId);

      const filesToDelete = [];
      if (dmc_mci_certificate_url) {
        const key = extractKeyFromUrl(dmc_mci_certificate_url);
        if (key) filesToDelete.push(key);
      }
      if (aadhaar_pan_license_url) {
        const key = extractKeyFromUrl(aadhaar_pan_license_url);
        if (key) filesToDelete.push(key);
      }
      if (address_proof_url) {
        const key = extractKeyFromUrl(address_proof_url);
        if (key) filesToDelete.push(key);
      }
      if (passport_photo_url) {
        const key = extractKeyFromUrl(passport_photo_url);
        if (key) filesToDelete.push(key);
      }
      if (clinic_photos_urls && clinic_photos_urls.length > 0) {
        clinic_photos_urls.forEach(url => {
          const key = extractKeyFromUrl(url);
          if (key) filesToDelete.push(key);
        });
      }

      for (const key of filesToDelete) {
        await deleteFromS3(key);
      }

      throw detailsError;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        doctor_details: doctorDetails
      }
    });
  } catch (error) {
    console.error('Error onboarding doctor:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}