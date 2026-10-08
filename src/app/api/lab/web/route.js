import sql from "@/lib/db";
import { uploadToS3, deleteFromS3, getCloudFrontUrl } from "@/lib/s3";
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

    // Summary counts
    const [counts] = await sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE onboarding_status = 'approved')::int as approved,
        COUNT(*) FILTER (WHERE onboarding_status = 'pending')::int as pending,
        COUNT(*) FILTER (WHERE accepts_home_collection = true)::int as home_collection
      FROM lab_details
    `;

    // Filtered list
    let labs = [];
    let totalFiltered = 0;

    if (search && status) {
      const countRes = await sql`
        SELECT COUNT(*)::int as count
        FROM lab_details ld
        JOIN users u ON u.id = ld.id
        WHERE ld.onboarding_status = ${status}
          AND ld.lab_name ILIKE ${'%' + search + '%'}
      `;
      totalFiltered = countRes[0]?.count || 0;

      labs = await sql`
        SELECT 
          ld.*,
          json_build_object(
            'id', u.id,
            'phone_number', u.phone_number,
            'profile_picture', u.profile_picture,
            'role', u.role
          ) as users
        FROM lab_details ld
        JOIN users u ON u.id = ld.id
        WHERE ld.onboarding_status = ${status}
          AND ld.lab_name ILIKE ${'%' + search + '%'}
        ORDER BY ld.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (search) {
      const countRes = await sql`
        SELECT COUNT(*)::int as count
        FROM lab_details ld
        JOIN users u ON u.id = ld.id
        WHERE ld.lab_name ILIKE ${'%' + search + '%'}
      `;
      totalFiltered = countRes[0]?.count || 0;

      labs = await sql`
        SELECT 
          ld.*,
          json_build_object(
            'id', u.id,
            'phone_number', u.phone_number,
            'profile_picture', u.profile_picture,
            'role', u.role
          ) as users
        FROM lab_details ld
        JOIN users u ON u.id = ld.id
        WHERE ld.lab_name ILIKE ${'%' + search + '%'}
        ORDER BY ld.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (status) {
      const countRes = await sql`
        SELECT COUNT(*)::int as count
        FROM lab_details ld
        JOIN users u ON u.id = ld.id
        WHERE ld.onboarding_status = ${status}
      `;
      totalFiltered = countRes[0]?.count || 0;

      labs = await sql`
        SELECT 
          ld.*,
          json_build_object(
            'id', u.id,
            'phone_number', u.phone_number,
            'profile_picture', u.profile_picture,
            'role', u.role
          ) as users
        FROM lab_details ld
        JOIN users u ON u.id = ld.id
        WHERE ld.onboarding_status = ${status}
        ORDER BY ld.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      const countRes = await sql`
        SELECT COUNT(*)::int as count
        FROM lab_details ld
        JOIN users u ON u.id = ld.id
      `;
      totalFiltered = countRes[0]?.count || 0;

      labs = await sql`
        SELECT 
          ld.*,
          json_build_object(
            'id', u.id,
            'phone_number', u.phone_number,
            'profile_picture', u.profile_picture,
            'role', u.role
          ) as users
        FROM lab_details ld
        JOIN users u ON u.id = ld.id
        ORDER BY ld.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    return success(
      "Labs fetched successfully.",
      {
        labs,
        summary: {
          total: counts?.total || 0,
          approved: counts?.approved || 0,
          pending: counts?.pending || 0,
          homeCollection: counts?.home_collection || 0,
        },
        pagination: {
          page,
          limit,
          total: totalFiltered,
          totalPages: Math.ceil(totalFiltered / limit),
        },
      },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("GET Labs Error:", error);
    return failure("Failed to fetch labs. " + error.message, "lab_list_failed", 500, { headers: corsHeaders });
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
        await uploadToS3(buffer, `lab-documents/${fileName}`, "application/octet-stream");
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
        return failure(`Missing required field: ${f}`, "validation_error", 400, { headers: corsHeaders });
      }
    }

    const raw_phone = fields.phone_number || "";
    const phone_number = String(raw_phone).replace(/\D/g, "").slice(-10);
    const email = fields.email.trim();

    // Check if user already registered
    const existing = await sql`
      SELECT id FROM users WHERE phone_number LIKE ${'%' + phone_number + '%'} LIMIT 1
    `;

    if (existing.length > 0) {
      return failure("User already registered with this phone.", "user_already_registered", 409, { headers: corsHeaders });
    }

    // Create user in RDS
    const createdUsers = await sql`
      INSERT INTO users (phone_number, role, is_verified, status, created_at, updated_at)
      VALUES (${phone_number}, 'lab', true, 1, NOW(), NOW())
      RETURNING id
    `;
    createdUserId = createdUsers[0]?.id;

    const pan_card_url = fields.pan_card || null;
    const aadhaar_card_url = fields.aadhaar_card || null;
    const lab_license_url = fields.lab_license || null;
    const gst_certificate_url = fields.gst_certificate || null;
    const owner_photo_url = fields.owner_photo || null;
    const signature_url = fields.signature || null;

    const json = (f) => (fields[f] && typeof fields[f] === "string" ? JSON.parse(fields[f]) : fields[f] || null);

    // Insert into lab_details
    const createdLabs = await sql`
      INSERT INTO lab_details (
        id,
        lab_name,
        owner_name,
        email,
        phone_number,
        contact_person,
        address,
        license_number,
        registration_number,
        gst_number,
        pan_number,
        latitude,
        longitude,
        opening_hours,
        kyc_data,
        services,
        accepts_home_collection,
        general_turnaround,
        onboarding_status,
        pan_card_url,
        aadhaar_card_url,
        lab_license_url,
        gst_certificate_url,
        owner_photo_url,
        signature_url,
        created_at,
        updated_at
      ) VALUES (
        ${createdUserId},
        ${fields.lab_name},
        ${fields.owner_name},
        ${email},
        ${phone_number},
        ${fields.contact_person || null},
        ${fields.address || null},
        ${fields.license_number || null},
        ${fields.registration_number || null},
        ${fields.gst_number || null},
        ${fields.pan_number || null},
        ${fields.latitude ? Number(fields.latitude) : null},
        ${json("opening_hours") ? sql.json(json("opening_hours")) : null},
        ${sql.json(parseJSON(fields.kyc_data || []))},
        ${sql.json(Array.isArray(json("services")) ? json("services") : [])},
        ${fields.accepts_home_collection === "true" || fields.accepts_home_collection === true},
        ${fields.general_turnaround || null},
        'pending',
        ${pan_card_url},
        ${aadhaar_card_url},
        ${lab_license_url},
        ${gst_certificate_url},
        ${owner_photo_url},
        ${signature_url},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    return success("Lab created successfully.", createdLabs[0], 201, { headers: corsHeaders });
  } catch (error) {
    console.error("Create Lab Error:", error);
    if (createdUserId) {
      await sql`DELETE FROM users WHERE id = ${createdUserId}`.catch(() => {});
    }
    return failure("Failed to create lab. " + error.message, "lab_creation_failed", 500, { headers: corsHeaders });
  }
}
