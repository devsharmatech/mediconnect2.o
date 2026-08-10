import { supabase } from "@/lib/supabaseAdmin";
import { uploadToS3, deleteFromS3, getCloudFrontUrl, extractKeyFromUrl } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  let createdUserId = null;
  const uploadedFiles = [];

  try {
    const formData = await req.formData();

    // Required field validation
    const required = ["id", "lab_name", "owner_name", "phone_number", "email"];
    for (const f of required) {
      if (!formData.get(f)) {
        return failure(`Missing required field: ${f}`, "validation_error", 400, {
          headers: corsHeaders,
        });
      }
    }

    const id = formData.get("id");
    const phone_number = formData.get("phone_number").trim();
    const email = formData.get("email").trim();

    // Check if lab exists
    const { data: existingLab, error: fetchError } = await supabase
      .from("lab_details")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existingLab) {
      return failure("Lab not found.", "lab_not_found", 404, {
        headers: corsHeaders,
      });
    }

    // Helper: upload documents
    async function upload(file, field) {
      if (!file) return existingLab[`${field}_url`];
      if (typeof file === "string" && file.startsWith("http")) return file;
      if (!file.name) return existingLab[`${field}_url`];
      
      const path = `${field}/${field}_${Date.now()}_${file.name}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      
      const { url: _uploadedUrl } = await uploadToS3(buffer, `lab-documents/${path}`, "application/octet-stream");
      
      uploadedFiles.push(path);
      const data = { publicUrl: getCloudFrontUrl(`lab-documents/${path}`) };
      return data.publicUrl;
    }

    // Upload new files if provided
    const pan_card_url = await upload(formData.get("pan_card"), "pan_card");
    const aadhaar_card_url = await upload(formData.get("aadhaar_card"), "aadhaar_card");
    const lab_license_url = await upload(formData.get("lab_license"), "lab_license");
    const gst_certificate_url = await upload(formData.get("gst_certificate"), "gst_certificate");
    const owner_photo_url = await upload(formData.get("owner_photo"), "owner_photo");
    const signature_url = await upload(formData.get("signature"), "signature");

    const json = (f) =>
      formData.get(f) ? JSON.parse(formData.get(f)) : existingLab[f];

    // Update lab_details
    const updateData = {
      lab_name: formData.get("lab_name"),
      owner_name: formData.get("owner_name"),
      email,
      phone_number,
      contact_person: formData.get("contact_person") || existingLab.contact_person,
      address: formData.get("address") || existingLab.address,
      license_number: formData.get("license_number") || existingLab.license_number,
      registration_number: formData.get("registration_number") || existingLab.registration_number,
      gst_number: formData.get("gst_number") || existingLab.gst_number,
      pan_number: formData.get("pan_number") || existingLab.pan_number,
      latitude: formData.get("latitude") || existingLab.latitude,
      longitude: formData.get("longitude") || existingLab.longitude,
      opening_hours: json("opening_hours"),
      services: json("services"),
      accepts_home_collection: formData.get("accepts_home_collection") === "true",
      general_turnaround: formData.get("general_turnaround") || existingLab.general_turnaround,
      updated_at: new Date().toISOString(),
    };

    // Only add file URLs if they were updated
    if (pan_card_url !== existingLab.pan_card_url) updateData.pan_card_url = pan_card_url;
    if (aadhaar_card_url !== existingLab.aadhaar_card_url) updateData.aadhaar_card_url = aadhaar_card_url;
    if (lab_license_url !== existingLab.lab_license_url) updateData.lab_license_url = lab_license_url;
    if (gst_certificate_url !== existingLab.gst_certificate_url) updateData.gst_certificate_url = gst_certificate_url;
    if (owner_photo_url !== existingLab.owner_photo_url) updateData.owner_photo_url = owner_photo_url;
    if (signature_url !== existingLab.signature_url) updateData.signature_url = signature_url;

    if (phone_number && phone_number !== existingLab.phone_number) {
      const { error: userError } = await supabase
        .from("users")
        .update({ phone_number })
        .eq("id", id);
      if (userError) throw new Error(userError.message);
    }

    const { data, error } = await supabase
      .from("lab_details")
      .update(updateData)
      .eq("id", id)
      .select("*, users(id, phone_number, profile_picture, role)")
      .single();

    if (error) throw new Error(error.message);

    return success("Lab updated successfully.", data, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Update Lab Error:", error);

    // Cleanup uploaded files on failure
    if (uploadedFiles.length) {
      await deleteMultipleFromS3((uploadedFiles || []).map(p => `lab-documents/${p}`));
    }

    return failure("Failed to update lab. " + error.message, "lab_update_failed", 500, {
      headers: corsHeaders,
    });
  }
}