import { supabase } from "@/lib/supabaseAdmin";
import { uploadToS3, deleteFromS3, getCloudFrontUrl, extractKeyFromUrl } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const hospitalType = searchParams.get("type") || "";
    const offset = (page - 1) * limit;

    let query = supabase
      .from("hospital_details")
      .select("*, users!inner(id, phone_number, profile_picture, role)", {
        count: "exact",
      })
      .eq("users.role", "hospital")
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (search) query = query.ilike("hospital_name", `%${search}%`);
    if (status) query = query.eq("onboarding_status", status);
    if (hospitalType) query = query.eq("hospital_type", hospitalType);

    const { data, count, error } = await query;
    if (error) throw error;

    return success(
      "Hospitals fetched successfully.",
      {
        hospitals: data,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("GET Hospitals Error:", error);
    return failure(
      "Failed to fetch hospitals. " + error.message,
      "hospital_list_failed",
      500,
      {
        headers: corsHeaders,
      }
    );
  }
}

export async function POST(req) {
  let createdUserId = null;
  const uploadedFiles = [];

  try {
    const formData = await req.formData();

    // Required field validation
    const required = ["hospital_name", "owner_name", "phone_number", "email", "license_number", "address"];
    for (const f of required) {
      if (!formData.get(f)) {
        return failure(
          `Missing required field: ${f}`,
          "validation_error",
          400,
          {
            headers: corsHeaders,
          }
        );
      }
    }

    const phone_number = formData.get("phone_number").trim();
    const email = formData.get("email").trim();

    // Check if user already registered
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("phone_number", phone_number)
      .maybeSingle();

    if (existing)
      return failure(
        "User already registered with this phone.",
        "user_already_registered",
        409,
        { headers: corsHeaders }
      );

    // Create user
    const { data: user, error: userErr } = await supabase
      .from("users")
      .insert({
        phone_number,
        role: "hospital",
        is_verified: true,
      })
      .select()
      .single();
    if (userErr) throw new Error(userErr.message);
    createdUserId = user.id;

    // Helper: upload documents
    async function upload(file, field) {
      if (!file || !file.name) return null;
      const path = `${field}/${field}_${Date.now()}_${file.name}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { url: _uploadedUrl } = await uploadToS3(buffer, `hospital-documents/${path}`, "application/octet-stream");
      if (error) throw new Error(`Failed to upload ${field}: ${error.message}`);
      uploadedFiles.push(path);
      const data = { publicUrl: getCloudFrontUrl(`hospital-documents/${path}`) };
      return data.publicUrl;
    }

    // Upload files
    const pan_card_url = await upload(formData.get("pan_card"), "pan_card");
    const aadhaar_card_url = await upload(
      formData.get("aadhaar_card"),
      "aadhaar_card"
    );
    const hospital_license_url = await upload(
      formData.get("hospital_license"),
      "hospital_license"
    );
    const gst_certificate_url = await upload(
      formData.get("gst_certificate"),
      "gst_certificate"
    );
    const owner_photo_url = await upload(
      formData.get("owner_photo"),
      "owner_photo"
    );
    const signature_url = await upload(formData.get("signature"), "signature");

    const parseJSON = (str) => {
      try {
        return str ? JSON.parse(str) : null;
      } catch {
        return null;
      }
    };

    // Insert into hospital_details
    const { data, error } = await supabase
      .from("hospital_details")
      .insert([
        {
          id: createdUserId,
          hospital_name: formData.get("hospital_name"),
          owner_name: formData.get("owner_name"),
          email,
          phone_number,
          contact_person: formData.get("contact_person"),
          address: formData.get("address"),
          latitude: formData.get("latitude"),
          longitude: formData.get("longitude"),
          license_number: formData.get("license_number"),
          registration_number: formData.get("registration_number"),
          gst_number: formData.get("gst_number"),
          pan_number: formData.get("pan_number"),
          hospital_type: formData.get("hospital_type") || "general",
          bed_count: parseInt(formData.get("bed_count")) || 0,
          icu_beds: parseInt(formData.get("icu_beds")) || 0,
          emergency_services: formData.get("emergency_services") === "true",
          ambulance_services: formData.get("ambulance_services") === "true",
          specialties: parseJSON(formData.get("specialties")) || [],
          facilities: parseJSON(formData.get("facilities")) || [],
          opening_hours: parseJSON(formData.get("opening_hours")) || { open: "00:00", close: "23:59" },
          emergency_timing: parseJSON(formData.get("emergency_timing")) || { open: "00:00", close: "23:59" },
          general_turnaround: formData.get("general_turnaround"),
          kyc_data: parseJSON(formData.get("kyc_data")) || [],
          onboarding_status: "pending",
          pan_card_url,
          aadhaar_card_url,
          hospital_license_url,
          gst_certificate_url,
          owner_photo_url,
          signature_url,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);

    return success("Hospital created successfully.", data, 201, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Create Hospital Error:", error);

    if (createdUserId)
      await supabase.from("users").delete().eq("id", createdUserId);
    if (uploadedFiles.length)
      await deleteMultipleFromS3((uploadedFiles || []).map(p => `hospital-documents/${p}`));

    return failure(
      "Failed to create hospital. " + error.message,
      "hospital_creation_failed",
      500,
      {
        headers: corsHeaders,
      }
    );
  }
}

// Update hospital
export async function PUT(req) {
  try {
    const formData = await req.formData();
    const hospitalId = formData.get("id");

    if (!hospitalId) {
      return failure("Hospital ID is required", "validation_error", 400, {
        headers: corsHeaders,
      });
    }

    // Helper: upload documents
    async function upload(file, field) {
      if (!file || !file.name) return null;
      const path = `${field}/${field}_${Date.now()}_${file.name}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { url: _uploadedUrl } = await uploadToS3(buffer, `hospital-documents/${path}`, "application/octet-stream");
      if (error) throw new Error(`Failed to upload ${field}: ${error.message}`);
      const data = { publicUrl: getCloudFrontUrl(`hospital-documents/${path}`) };
      return data.publicUrl;
    }

    // Upload files if provided
    const pan_card_url = formData.get("pan_card") ? await upload(formData.get("pan_card"), "pan_card") : undefined;
    const aadhaar_card_url = formData.get("aadhaar_card") ? await upload(formData.get("aadhaar_card"), "aadhaar_card") : undefined;
    const hospital_license_url = formData.get("hospital_license") ? await upload(formData.get("hospital_license"), "hospital_license") : undefined;
    const gst_certificate_url = formData.get("gst_certificate") ? await upload(formData.get("gst_certificate"), "gst_certificate") : undefined;
    const owner_photo_url = formData.get("owner_photo") ? await upload(formData.get("owner_photo"), "owner_photo") : undefined;
    const signature_url = formData.get("signature") ? await upload(formData.get("signature"), "signature") : undefined;

    const parseJSON = (str) => {
      try {
        return str ? JSON.parse(str) : undefined;
      } catch {
        return undefined;
      }
    };

    // Prepare update data
    const updateData = {
      hospital_name: formData.get("hospital_name"),
      owner_name: formData.get("owner_name"),
      email: formData.get("email"),
      phone_number: formData.get("phone_number"),
      contact_person: formData.get("contact_person"),
      address: formData.get("address"),
      latitude: formData.get("latitude"),
      longitude: formData.get("longitude"),
      license_number: formData.get("license_number"),
      registration_number: formData.get("registration_number"),
      gst_number: formData.get("gst_number"),
      pan_number: formData.get("pan_number"),
      hospital_type: formData.get("hospital_type"),
      bed_count: parseInt(formData.get("bed_count")) || 0,
      icu_beds: parseInt(formData.get("icu_beds")) || 0,
      emergency_services: formData.get("emergency_services") === "true",
      ambulance_services: formData.get("ambulance_services") === "true",
      specialties: parseJSON(formData.get("specialties")),
      facilities: parseJSON(formData.get("facilities")),
      opening_hours: parseJSON(formData.get("opening_hours")),
      emergency_timing: parseJSON(formData.get("emergency_timing")),
      general_turnaround: formData.get("general_turnaround"),
      updated_at: new Date().toISOString(),
    };

    // Add file URLs if they were uploaded
    if (pan_card_url) updateData.pan_card_url = pan_card_url;
    if (aadhaar_card_url) updateData.aadhaar_card_url = aadhaar_card_url;
    if (hospital_license_url) updateData.hospital_license_url = hospital_license_url;
    if (gst_certificate_url) updateData.gst_certificate_url = gst_certificate_url;
    if (owner_photo_url) updateData.owner_photo_url = owner_photo_url;
    if (signature_url) updateData.signature_url = signature_url;

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const phone_number = formData.get("phone_number");
    if (phone_number) {
      const { data: hospitalData } = await supabase
        .from("hospital_details")
        .select("id")
        .eq("id", hospitalId)
        .single();
        
      if (hospitalData?.id) {
        await supabase
          .from("users")
          .update({ phone_number })
          .eq("id", hospitalData.id);
      }
    }

    const { data, error } = await supabase
      .from("hospital_details")
      .update(updateData)
      .eq("id", hospitalId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return success("Hospital updated successfully.", data, 200, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Update Hospital Error:", error);
    return failure(
      "Failed to update hospital. " + error.message,
      "hospital_update_failed",
      500,
      {
        headers: corsHeaders,
      }
    );
  }
}