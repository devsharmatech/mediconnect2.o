import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { uploadToS3 } from "@/lib/s3";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
const BUCKET = "doctor-documents";

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

const parseJSON = (v) => {
  if (!v) return null;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};

const toBool = (v) => v === "true" || v === true;

export async function POST(req) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let fields = {};
    let isJsonFlow = false;

    if (contentType.includes("application/json")) {
      isJsonFlow = true;
      fields = await req.json();
    } else {
      const formData = await req.formData();

      for (const [key, value] of formData.entries()) {
        if (typeof value === "string") {
          fields[key] = value;
        }
      }

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

    const phone = fields.phone;
    const email = fields.email;

    if (!phone) {
      return NextResponse.json({ status: false, message: "Phone required" });
    }

    const existingUsers = await sql`
      SELECT id, role
      FROM users
      WHERE phone_number = ${phone}
      LIMIT 1
    `;
    const existingUser = existingUsers[0] || null;

    if (existingUser && !fields.id) {
      return NextResponse.json(
        {
          status: false,
          message: "A user with this phone number already exists.",
        },
        { status: 400 }
      );
    }

    if (email) {
      const existingEmails = await sql`
        SELECT id
        FROM doctor_details
        WHERE LOWER(email) = LOWER(${email.trim()})
        LIMIT 1
      `;
      const existingEmail = existingEmails[0] || null;

      if (existingEmail && !fields.id && existingEmail.id !== existingUser?.id) {
        return NextResponse.json(
          {
            status: false,
            message: "A doctor with this email address already exists.",
          },
          { status: 400 }
        );
      }
    }

    let doctorId = fields.id || existingUser?.id;
    if (!doctorId) {
      const newUsers = await sql`
        INSERT INTO users (phone_number, role, is_verified, status)
        VALUES (${phone}, 'doctor', true, 1)
        RETURNING id
      `;
      doctorId = newUsers[0].id;
    }

    let dmc, aadhaarPan, addressProof, passport, clinicPhotos, signature_url;

    if (isJsonFlow) {
      dmc = fields.dmc_mci_nmc_certificates || fields.dmc_mci_certificate || [];
      aadhaarPan = fields.aadhaar_pan_license || [];
      addressProof = fields.address_proof
        ? Array.isArray(fields.address_proof)
          ? fields.address_proof
          : [fields.address_proof]
        : [];
      passport = fields.passport_photo
        ? Array.isArray(fields.passport_photo)
          ? fields.passport_photo
          : [fields.passport_photo]
        : [];
      clinicPhotos = fields.clinic_photos || [];
      signature_url = fields.signature_url || null;
    } else {
      dmc = fields._uploaded_dmc_mci_nmc_certificates || fields._uploaded_dmc_mci_certificate || [];
      aadhaarPan = fields._uploaded_aadhaar_pan_license || [];
      addressProof = fields._uploaded_address_proof || [];
      passport = fields._uploaded_passport_photo || [];
      clinicPhotos = fields._uploaded_clinic_photos || [];
      signature_url = fields._uploaded_signature_url || null;
    }

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
      video_follow_up_fee: parseFloat(fields.video_follow_up_fee || fields.follow_up_fee || 0),
      clinic_consultation_fee: parseFloat(fields.clinic_consultation_fee || 0),
      clinic_follow_up_fee: parseFloat(fields.clinic_follow_up_fee || fields.follow_up_fee || 0),
      home_visit_fee: parseFloat(fields.home_visit_fee || 0),
      home_follow_up_fee: parseFloat(fields.home_follow_up_fee || fields.follow_up_fee || 0),
      follow_up_fee: parseFloat(fields.follow_up_fee || 0),
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
        video_follow_up_fee: parseFloat(fields.video_follow_up_fee || fields.follow_up_fee || 0),
        clinic_follow_up_fee: parseFloat(fields.clinic_follow_up_fee || fields.follow_up_fee || 0),
        home_follow_up_fee: parseFloat(fields.home_follow_up_fee || fields.follow_up_fee || 0),
        follow_up_fee: parseFloat(fields.follow_up_fee || 0),
      },
    };

    const existingRows = await sql`
      SELECT *
      FROM doctor_details
      WHERE id = ${doctorId}
      LIMIT 1
    `;
    const existing = existingRows[0] || null;

    if (existing?.id) {
      const updateDetails = { ...details };
      delete updateDetails.id;

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

      const cols = Object.keys(updateDetails);
      await sql`
        UPDATE doctor_details
        SET ${sql(updateDetails, cols)}
        WHERE id = ${doctorId}
      `;
    } else {
      await sql`
        INSERT INTO doctor_details ${sql(details)}
      `;
    }

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
