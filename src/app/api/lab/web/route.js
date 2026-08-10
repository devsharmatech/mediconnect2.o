import { supabase } from "@/lib/supabaseAdmin";
import { uploadToS3, deleteFromS3, getCloudFrontUrl, extractKeyFromUrl } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

const parseJSON = (value) => {
  if (!value) return [];
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return [];
  }
};

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
    const offset = (page - 1) * limit;

    let query = supabase
      .from("lab_details")
      .select("*, users!inner(id, phone_number, profile_picture, role)", {
        count: "exact",
      })
      .eq("users.role", "lab")
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (search) query = query.ilike("lab_name", `%${search}%`);
    if (status) query = query.eq("onboarding_status", status);

    const [
      { count: totalCount },
      { count: approvedCount },
      { count: pendingCount },
      { count: homeCollectionCount }
    ] = await Promise.all([
      supabase.from("lab_details").select("id", { count: "exact", head: true }),
      supabase.from("lab_details").select("id", { count: "exact", head: true }).eq("onboarding_status", "approved"),
      supabase.from("lab_details").select("id", { count: "exact", head: true }).eq("onboarding_status", "pending"),
      supabase.from("lab_details").select("id", { count: "exact", head: true }).eq("accepts_home_collection", true),
    ]);

    const { data, count, error } = await query;
    if (error) throw error;

    return success(
      "Labs fetched successfully.",
      {
        labs: data,
        summary: {
          total: totalCount || 0,
          approved: approvedCount || 0,
          pending: pendingCount || 0,
          homeCollection: homeCollectionCount || 0,
        },
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
    console.error("GET Labs Error:", error);
    return failure(
      "Failed to fetch labs. " + error.message,
      "lab_list_failed",
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
    const contentType = req.headers.get("content-type") || "";
    let fields = {};

    if (contentType.includes("application/json")) {
      fields = await req.json();
    } else {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        if (typeof value === "string") {
          fields[key] = value;
        }
      }

      const documentFields = ["pan_card", "aadhaar_card", "lab_license", "gst_certificate", "owner_photo", "signature"];
      async function uploadFileLegacy(fieldName, file) {
        if (!file || file.size === 0) return null;
        const fileExt = file.name.split(".").pop();
        const fileName = `${fieldName}/${fieldName}_${Date.now()}_${fileExt}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const { url: _uploadedUrl } = await uploadToS3(buffer, `lab-documents/${fileName}`, "application/octet-stream");
        uploadedFiles.push(fileName);
        return getCloudFrontUrl(`lab-documents/${fileName}`);
      }

      for (const field of documentFields) {
        const file = formData.get(field);
        if (file && file.size > 0) {
          fields[field] = await uploadFileLegacy(field, file);
        }
      }
    }

    // Required field validation
    const required = ["lab_name", "owner_name", "phone_number", "email"];
    for (const f of required) {
      if (!fields[f]) {
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

    const phone_number = fields.phone_number.trim();
    const email = fields.email.trim();

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
        role: "lab",
        is_verified: true,
      })
      .select()
      .single();
    if (userErr) throw new Error(userErr.message);
    createdUserId = user.id;

    // Upload files (if any are sent in legacy formData, but we already handled them above)
    // For new flow, fields already contains the publicUrls directly
    const pan_card_url = fields.pan_card || null;
    const aadhaar_card_url = fields.aadhaar_card || null;
    const lab_license_url = fields.lab_license || null;
    const gst_certificate_url = fields.gst_certificate || null;
    const owner_photo_url = fields.owner_photo || null;
    const signature_url = fields.signature || null;

    const json = (f) => (fields[f] && typeof fields[f] === "string" ? JSON.parse(fields[f]) : fields[f] || null);

    // Insert into lab_details
    const { data, error } = await supabase
      .from("lab_details")
      .insert([
        {
          id: createdUserId,
          lab_name: fields.lab_name,
          owner_name: fields.owner_name,
          email,
          phone_number,
          contact_person: fields.contact_person,
          address: fields.address,
          license_number: fields.license_number,
          registration_number: fields.registration_number,
          gst_number: fields.gst_number,
          pan_number: fields.pan_number,
          latitude: fields.latitude,
          longitude: fields.longitude,
          opening_hours: json("opening_hours"),
          kyc_data: parseJSON(fields.kyc_data || []),
          services: json("services") || [],
          accepts_home_collection: fields.accepts_home_collection === "true" || fields.accepts_home_collection === true,
          general_turnaround: fields.general_turnaround,
          onboarding_status: "pending",
          pan_card_url,
          aadhaar_card_url,
          lab_license_url,
          gst_certificate_url,
          owner_photo_url,
          signature_url,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Insert services into lab_tests table for catalog visibility
    const servicesList = json("services") || [];
    if (Array.isArray(servicesList) && servicesList.length > 0) {
      const testsToInsert = servicesList.map((service) => {
        const testCode = 'ONB' + Math.floor(1000 + Math.random() * 9000);
        return {
          lab_id: createdUserId,
          category_id: '836ca71f-cd88-42f7-9e93-514da1d16c1a', // Biochemistry default
          test_code: testCode,
          test_name: service.service_name || service.name,
          price: String(service.price || 499),
          specimen_type: 'Serum',
          clinical_history_required: false,
          is_active: true,
        };
      });

      const { error: testsErr } = await supabase
        .from("lab_tests")
        .insert(testsToInsert);

      if (testsErr) {
        console.error("Error inserting onboarding lab tests:", testsErr);
      }
    }

    return success("Lab created successfully.", data, 201, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Create Lab Error:", error);

    if (createdUserId)
      await supabase.from("users").delete().eq("id", createdUserId);
    if (uploadedFiles.length)
      await deleteMultipleFromS3((uploadedFiles || []).map(p => `lab-documents/${p}`));

    return failure(
      "Failed to create lab. " + error.message,
      "lab_creation_failed",
      500,
      {
        headers: corsHeaders,
      }
    );
  }
}
