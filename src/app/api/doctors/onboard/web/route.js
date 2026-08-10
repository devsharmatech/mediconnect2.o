import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { uploadToS3, getCloudFrontUrl, extractKeyFromUrl } from "@/lib/s3";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
const BUCKET = "doctor-documents";

// Configure nodemailer using SMTP environment variables
const mailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "0"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

async function sendOnboardingEmail(email, name) {
  if (!email) return;

  const displayName = name || "Doctor";

  try {
    await mailTransporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "Welcome to MediConnect - Onboarding Received",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0067A1;">Dear ${displayName},</h2>
          <p>Thank you for submitting your onboarding form to <strong>MediConnect</strong>.</p>
          <p>Your application has been received successfully and is now under review by our team.</p>
          <p>We will notify you by email once your account is verified and activated.</p>
          <p style="margin-top: 24px;">Warm regards,<br/>MediConnect Team</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Onboarding email send error:", error);
  }
}

// Helper: Upload file to AWS S3
async function uploadFile(folder, file, doctorId) {
  if (!file) return null;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = file.name.split(".").pop();
  const fileName = `${doctorId}-${Date.now()}-${uuidv4()}.${ext}`;
  const path = `${folder}/${fileName}`;

  try {
    const { url } = await uploadToS3(buffer, `${BUCKET}/${path}`, file.type || "application/octet-stream");
    return url;
  } catch (uploadError) {
    console.error("Upload error in uploadFile helper:", uploadError);
    throw uploadError;
  }
}

// Helper: Parse JSON safely
const parseJSON = (v) => {
  try {
    return v ? (typeof v === "string" ? JSON.parse(v) : v) : null;
  } catch {
    return null;
  }
};

// Helper: Convert to boolean
const toBool = (v) => v === "true" || v === true;

export async function POST(req) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let fields = {};
    let isJsonFlow = false;

    // ── Detect if request is JSON (signed-URL flow) or FormData (legacy) ──
    if (contentType.includes("application/json")) {
      isJsonFlow = true;
      fields = await req.json();
    } else {
      // Legacy FormData flow
      const formData = await req.formData();

      // Extract text fields
      for (const [key, value] of formData.entries()) {
        if (typeof value === "string") {
          fields[key] = value;
        }
      }

      // Upload single files
      const singleFileFields = ["address_proof", "passport_photo"];
      for (const fieldName of singleFileFields) {
        const files = formData.getAll(fieldName) || [];
        const urls = [];
        for (const f of files) {
          if (f && typeof f !== "string") {
            const url = await uploadFile(fieldName, f, "legacy");
            if (url) urls.push(url);
          } else if (typeof f === "string") {
            try {
              const parsed = JSON.parse(f);
              if (Array.isArray(parsed)) urls.push(...parsed);
              else if (typeof parsed === "string") urls.push(parsed);
            } catch {
              if (f.startsWith("http")) urls.push(f);
            }
          }
        }
        if (urls.length > 0) fields[`_uploaded_${fieldName}`] = urls;
      }

      // Upload multi-file fields
      const multiFileFields = ["dmc_mci_nmc_certificates", "dmc_mci_certificate", "aadhaar_pan_license", "clinic_photos"];
      for (const fieldName of multiFileFields) {
        const files = formData.getAll(fieldName) || [];
        const urls = [];
        for (const f of files) {
          if (f && typeof f !== "string") {
            const url = await uploadFile(fieldName, f, "legacy");
            if (url) urls.push(url);
          } else if (typeof f === "string") {
            try {
              const parsed = JSON.parse(f);
              if (Array.isArray(parsed)) urls.push(...parsed);
              else if (typeof parsed === "string") urls.push(parsed);
            } catch {
              if (f.startsWith("http")) urls.push(f);
            }
          }
        }
        if (urls.length > 0) fields[`_uploaded_${fieldName}`] = urls;
      }

      // Handle signature
      const sig = formData.get("digital_signature");
      if (sig) {
        if (typeof sig === "string" && sig.startsWith("data:")) {
          const matches = sig.match(/^data:(.+);base64,(.*)$/);
          if (matches) {
            const sigContentType = matches[1];
            const base64 = matches[2];
            const buffer = Buffer.from(base64, "base64");
            const filename = `legacy-${Date.now()}.png`;
            const path = `signatures/${filename}`;
            try {
              const { url } = await uploadToS3(buffer, `${BUCKET}/${path}`, sigContentType || "image/png");
              fields._uploaded_signature_url = url;
            } catch (err) {
              console.error("Signature upload error:", err);
            }
          }
        } else if (sig instanceof File) {
          fields._uploaded_signature_url = await uploadFile("signatures", sig, "legacy");
        }
      }
    }

    // ── Common processing for both flows ──
    const phone = fields.phone;
    const email = fields.email;
    const isAdmin = toBool(fields.isAdmin);

    if (!phone)
      return NextResponse.json({ status: false, message: "Phone required" });

    // 1. Check for existing phone number
    let { data: existingUser } = await supabase
      .from("users")
      .select("id, role")
      .eq("phone_number", phone)
      .maybeSingle();

    // If phone exists and it's NOT an admin update (or if we want to be strict)
    // Actually, usually admin updates use a separate PUT or we pass doctorId.
    // For now, if we are in POST (Creation), we should error if phone exists.
    if (existingUser && !fields.id) {
       return NextResponse.json({ 
         status: false, 
         message: "A user with this phone number already exists." 
       }, { status: 400 });
    }

    // 2. Check for existing email in doctor_details
    if (email) {
      const { data: existingEmail } = await supabase
        .from("doctor_details")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      
      if (existingEmail && !fields.id && existingEmail.id !== existingUser?.id) {
        return NextResponse.json({ 
          status: false, 
          message: "A doctor with this email address already exists." 
        }, { status: 400 });
      }
    }

    let doctorId = fields.id || existingUser?.id;
    if (!doctorId) {
      const { data: newUser, error } = await supabase
        .from("users")
        .insert({ phone_number: phone, role: "doctor", is_verified: true })
        .select("id")
        .single();
      if (error) throw error;
      doctorId = newUser.id;
    }

    // Resolve document URLs
    let dmc, aadhaarPan, addressProof, passport, clinicPhotos, signature_url;

    if (isJsonFlow) {
      // Signed URL flow: URLs already present as strings/arrays
      dmc = fields.dmc_mci_nmc_certificates || fields.dmc_mci_certificate || [];
      aadhaarPan = fields.aadhaar_pan_license || [];
      addressProof = fields.address_proof ? (Array.isArray(fields.address_proof) ? fields.address_proof : [fields.address_proof]) : [];
      passport = fields.passport_photo ? (Array.isArray(fields.passport_photo) ? fields.passport_photo : [fields.passport_photo]) : [];
      clinicPhotos = fields.clinic_photos || [];
      signature_url = fields.signature_url || null;
    } else {
      // Legacy flow: get URLs from the uploaded results
      dmc = fields._uploaded_dmc_mci_nmc_certificates || fields._uploaded_dmc_mci_certificate || [];
      aadhaarPan = fields._uploaded_aadhaar_pan_license || [];
      addressProof = fields._uploaded_address_proof || [];
      passport = fields._uploaded_passport_photo || [];
      clinicPhotos = fields._uploaded_clinic_photos || [];
      signature_url = fields._uploaded_signature_url || null;
    }

    // Prepare structured fields

    const details = {
      id: doctorId,
      full_name: fields.doctor_name,
      email: fields.email,
      specialization: parseJSON(fields.speciality),
      experience_years: parseInt(fields.years_experience || 0),
      available_time: parseJSON(fields.available_time) || { start: "09:00", end: "17:00" },
      available_days: parseJSON(fields.available_days) || ["Mon", "Wed", "Fri", "Sat"],
      license_number: fields.doctor_registration_no,
      clinic_name: fields.clinic_name,
      clinic_address: fields.clinic_address,
      latitude: parseFloat(fields.clinic_lat || 0),
      longitude: parseFloat(fields.clinic_lng || 0),
      qualification: parseJSON(fields.qualification),
      clinic_slots: parseJSON(fields.clinic_slots),
      video_slots: parseJSON(fields.video_slots),
      kyc_data: parseJSON(fields.kyc_data),
      home_slots: parseJSON(fields.home_slots),
      leave_days: parseJSON(fields.leave_days),
      speciality_tags: parseJSON(fields.speciality_tags),
      video_consultation_fee: parseFloat(fields.video_consultation_fee || 0),
      clinic_consultation_fee: parseFloat(fields.clinic_consultation_fee || 0),
      home_visit_fee: parseFloat(fields.home_visit_fee || 0),
      indemnity_insurance: parseFloat(fields.insurance || 0),
      dmc_mci_certificate: dmc,
      aadhaar_pan_license: aadhaarPan,
      address_proof: addressProof,
      passport_photo: passport,
      clinic_photos: clinicPhotos,
      signature_url,
      bank_account_details: {
        account_name: fields.bank_account_name,
        account_no: fields.bank_account_number,
        ifsc: fields.bank_ifsc_code,
        bank_name: fields.bank_name,
        branch: fields.bank_branch,
      },
      digital_consent: toBool(fields.digital_consent),
      onboarding_status: "pending",
      updated_at: new Date().toISOString(),
      meta: {
        bpl_service_agreement: toBool(fields.bpl_service_agreement),
        bpl_preferred_time: fields.bpl_preferred_time,
        non_disclosure_agreement: toBool(fields.non_disclosure_agreement),
        terms_conditions_agreement: toBool(fields.terms_conditions_agreement),
        super_speciality: parseJSON(fields.super_speciality),
        aadhaar: fields.aadhaar,
        pan: fields.pan,
        driving_license: fields.driving_license,
        address: fields.address,
        additional_clinics: parseJSON(fields.additional_clinics),
      },
    };

    // Insert/update doctor_details
    const { data: existing } = await supabase
      .from("doctor_details")
      .select("*")
      .eq("id", doctorId)
      .maybeSingle();

    if (existing?.id) {
      const updateDetails = { ...details };

      if (dmc.length === 0 && existing.dmc_mci_certificate?.length > 0) {
        updateDetails.dmc_mci_certificate = existing.dmc_mci_certificate;
      }
      if (aadhaarPan.length === 0 && existing.aadhaar_pan_license?.length > 0) {
        updateDetails.aadhaar_pan_license = existing.aadhaar_pan_license;
      }
      if (addressProof.length === 0 && existing.address_proof?.length > 0) {
        updateDetails.address_proof = existing.address_proof;
      }
      if (passport.length === 0 && existing.passport_photo?.length > 0) {
        updateDetails.passport_photo = existing.passport_photo;
      }
      if (clinicPhotos.length === 0 && existing.clinic_photos?.length > 0) {
        updateDetails.clinic_photos = existing.clinic_photos;
      }
      if (!signature_url && existing.signature_url) {
        updateDetails.signature_url = existing.signature_url;
      }

      updateDetails.meta = {
        ...(existing.meta || {}),
        ...details.meta,
      };

      const { error } = await supabase
        .from("doctor_details")
        .update(updateDetails)
        .eq("id", doctorId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("doctor_details").insert([details]);
      if (error) throw error;
    }

    // Fire-and-forget email ONLY if not submitted by admin (admin sends an invite instead)
    if (!toBool(fields.isAdmin)) {
      sendOnboardingEmail(details.email, details.full_name);
    }

    return NextResponse.json({
      status: true,
      message: "Doctor onboarded successfully",
      doctorId,
    });
  } catch (err) {
    console.error("Onboarding error:", err);
    return NextResponse.json(
      { status: false, message: err.message || "Server Error" },
      { status: 500 }
    );
  }
}
