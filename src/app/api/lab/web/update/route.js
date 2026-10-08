import sql from "@/lib/db";
import { uploadToS3, deleteMultipleFromS3, getCloudFrontUrl } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  const uploadedFiles = [];

  try {
    const contentType = req.headers.get("content-type") || "";
    let formData;

    if (contentType.includes("application/json")) {
      const jsonBody = await req.json();
      formData = {
        get: (key) => jsonBody[key] !== undefined ? jsonBody[key] : null
      };
    } else {
      formData = await req.formData();
    }

    const rawId = formData.get("id");
    const cleanId = safeUuid(rawId);
    if (!cleanId) {
      return failure("Valid lab ID is required.", "validation_error", 400, { headers: corsHeaders });
    }

    // Required field validation
    const required = ["lab_name", "owner_name", "phone_number", "email"];
    for (const f of required) {
      if (!formData.get(f)) {
        return failure(`Missing required field: ${f}`, "validation_error", 400, { headers: corsHeaders });
      }
    }

    const raw_phone = formData.get("phone_number") || "";
    const phone_number = String(raw_phone).replace(/\D/g, "").slice(-10);
    const email = String(formData.get("email") || "").trim();

    // Check if lab exists in RDS
    const existingLabs = await sql`
      SELECT * FROM lab_details WHERE id = ${cleanId} LIMIT 1
    `;

    if (!existingLabs.length) {
      return failure("Lab not found.", "lab_not_found", 404, { headers: corsHeaders });
    }

    const existingLab = existingLabs[0];

    // Helper: upload documents
    async function upload(file, field) {
      if (!file) return existingLab[`${field}_url`];
      if (typeof file === "string" && file.startsWith("http")) return file;
      if (!file.name) return existingLab[`${field}_url`];
      
      const path = `${field}/${field}_${Date.now()}_${file.name}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      
      await uploadToS3(buffer, `lab-documents/${path}`, "application/octet-stream");
      uploadedFiles.push(path);
      return getCloudFrontUrl(`lab-documents/${path}`);
    }

    const pan_card_url = await upload(formData.get("pan_card"), "pan_card");
    const aadhaar_card_url = await upload(formData.get("aadhaar_card"), "aadhaar_card");
    const lab_license_url = await upload(formData.get("lab_license"), "lab_license");
    const gst_certificate_url = await upload(formData.get("gst_certificate"), "gst_certificate");
    const owner_photo_url = await upload(formData.get("owner_photo"), "owner_photo");
    const signature_url = await upload(formData.get("signature"), "signature");

    // Extract and guarantee valid JSON array for services
    // CRITICAL: Must use sql.json(servicesArray) so postgres.js passes it as real JSONB array,
    // avoiding ${JSON.stringify()}::jsonb string scalar check constraint violation
    let servicesArray = [];
    const rawServices = formData.get("services");
    if (rawServices !== undefined && rawServices !== null && rawServices !== "" && rawServices !== "null") {
      try {
        const parsed = typeof rawServices === "string" ? JSON.parse(rawServices) : rawServices;
        if (Array.isArray(parsed)) {
          servicesArray = parsed;
        } else if (parsed && typeof parsed === "object") {
          servicesArray = Object.values(parsed);
        }
      } catch (err) {
        console.warn("Failed to parse services JSON:", err.message);
        servicesArray = Array.isArray(existingLab.services) ? existingLab.services : [];
      }
    } else if (Array.isArray(existingLab.services)) {
      servicesArray = existingLab.services;
    }

    if (!Array.isArray(servicesArray)) {
      servicesArray = [];
    }

    // Extract opening hours
    let openingHoursVal = null;
    const rawOpeningHours = formData.get("opening_hours");
    if (rawOpeningHours !== undefined && rawOpeningHours !== null && rawOpeningHours !== "" && rawOpeningHours !== "null") {
      try {
        const parsedHours = typeof rawOpeningHours === "string" ? JSON.parse(rawOpeningHours) : rawOpeningHours;
        if (parsedHours && typeof parsedHours === "object") {
          openingHoursVal = parsedHours;
        }
      } catch {
        openingHoursVal = existingLab.opening_hours || null;
      }
    } else if (existingLab.opening_hours) {
      openingHoursVal = existingLab.opening_hours;
    }

    if (phone_number && phone_number !== existingLab.phone_number) {
      await sql`
        UPDATE users
        SET phone_number = ${phone_number},
            updated_at = NOW()
        WHERE id = ${cleanId}
      `;
    }

    const rawHome = formData.get("accepts_home_collection");
    const acceptsHomeCollection = rawHome === "true" || rawHome === true || rawHome === "1" || rawHome === 1;

    const updated = await sql`
      UPDATE lab_details
      SET
        lab_name = ${formData.get("lab_name") || existingLab.lab_name},
        owner_name = ${formData.get("owner_name") || existingLab.owner_name},
        email = ${email || existingLab.email},
        phone_number = ${phone_number || existingLab.phone_number},
        contact_person = ${formData.get("contact_person") || existingLab.contact_person},
        address = ${formData.get("address") || existingLab.address},
        license_number = ${formData.get("license_number") || existingLab.license_number},
        registration_number = ${formData.get("registration_number") || existingLab.registration_number},
        gst_number = ${formData.get("gst_number") || existingLab.gst_number},
        pan_number = ${formData.get("pan_number") || existingLab.pan_number},
        latitude = ${formData.get("latitude") ? Number(formData.get("latitude")) : existingLab.latitude},
        longitude = ${formData.get("longitude") ? Number(formData.get("longitude")) : existingLab.longitude},
        opening_hours = ${openingHoursVal ? sql.json(openingHoursVal) : null},
        services = ${sql.json(servicesArray)},
        accepts_home_collection = ${acceptsHomeCollection},
        general_turnaround = ${formData.get("general_turnaround") || existingLab.general_turnaround},
        pan_card_url = ${pan_card_url || existingLab.pan_card_url},
        aadhaar_card_url = ${aadhaar_card_url || existingLab.aadhaar_card_url},
        lab_license_url = ${lab_license_url || existingLab.lab_license_url},
        gst_certificate_url = ${gst_certificate_url || existingLab.gst_certificate_url},
        owner_photo_url = ${owner_photo_url || existingLab.owner_photo_url},
        signature_url = ${signature_url || existingLab.signature_url},
        updated_at = NOW()
      WHERE id = ${cleanId}
      RETURNING *
    `;

    const u = await sql`
      SELECT id, phone_number, profile_picture, role FROM users WHERE id = ${cleanId} LIMIT 1
    `;

    return success("Lab updated successfully.", { ...updated[0], users: u[0] || null }, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Update Lab Error:", error);

    if (uploadedFiles.length) {
      await deleteMultipleFromS3((uploadedFiles || []).map(p => `lab-documents/${p}`)).catch(() => {});
    }

    return failure("Failed to update lab. " + error.message, "lab_update_failed", 500, {
      headers: corsHeaders,
    });
  }
}