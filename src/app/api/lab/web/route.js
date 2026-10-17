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

      const documentFields = [
        "pan_card", "aadhaar_card", "lab_license", "gst_certificate", "owner_photo", "signature", "logo", "profile_picture",
        "incorporation_cin", "nabl_certificate", "nabl_scope", "bmw_agreement", "dpcc_bmw_auth", "dpcc_noise_report", "dpcc_medical_waste", "iso_15189", "partner_agreement", "bank_proof"
      ];
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

    const logo_url = fields.logo || fields.profile_picture || null;

    // Create user in RDS with profile_picture/logo
    const createdUsers = await sql`
      INSERT INTO users (phone_number, role, is_verified, status, profile_picture, created_at, updated_at)
      VALUES (${phone_number}, 'lab', true, 1, ${logo_url}, NOW(), NOW())
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
        operating_address,
        license_number,
        registration_number,
        cin,
        partner_agreement_id,
        agreement_effective_from,
        agreement_effective_to,
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
        document_verified,
        pan_card_url,
        aadhaar_card_url,
        lab_license_url,
        gst_certificate_url,
        owner_photo_url,
        signature_url,
        logo_url,
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
        ${fields.operating_address || null},
        ${fields.license_number || null},
        ${fields.registration_number || null},
        ${fields.cin || null},
        ${fields.partner_agreement_id || null},
        ${fields.agreement_effective_from || null},
        ${fields.agreement_effective_to || null},
        ${fields.gst_number || null},
        ${fields.pan_number || null},
        ${fields.latitude ? Number(fields.latitude) : null},
        ${fields.longitude ? Number(fields.longitude) : null},
        ${json("opening_hours") ? sql.json(json("opening_hours")) : null},
        ${sql.json(parseJSON(fields.kyc_data || []))},
        ${sql.json(Array.isArray(json("services")) ? json("services") : [])},
        ${fields.accepts_home_collection === "true" || fields.accepts_home_collection === true},
        ${fields.general_turnaround || null},
        ${fields.onboarding_status || 'approved'},
        ${fields.document_verified === "true" || fields.document_verified === true || false},
        ${pan_card_url},
        ${aadhaar_card_url},
        ${lab_license_url},
        ${gst_certificate_url},
        ${owner_photo_url},
        ${signature_url},
        ${logo_url},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    // Save uploaded compliance documents into lab_partner_documents
    const complianceDocMap = [
      { field: "incorporation_cin", type: "incorporation_cin", name: "Incorporation Certificate / CIN", authority: "Ministry of Corporate Affairs (MCA)" },
      { field: "pan_card", type: "pan_card", name: "Entity PAN Card", authority: "Income Tax Department" },
      { field: "lab_license", type: "lab_license", name: "Applicable Lab Registration / Licence", authority: "Directorate of Health Services" },
      { field: "bmw_agreement", type: "bmw_agreement", name: "BMW Services Agreement / Renewal", authority: "Authorized Waste Management Provider" },
      { field: "dpcc_noise_report", type: "dpcc_noise_report", name: "DPCC Noise Monitoring Report", authority: "DPCC" },
      { field: "dpcc_medical_waste", type: "dpcc_medical_waste", name: "DPCC Medical-Waste Management Report", authority: "DPCC" },
      { field: "iso_15189", type: "iso_15189", name: "ISO 15189:2022 Certificate", authority: "Certification Body / Registrar" },
      { field: "nabl_certificate", type: "nabl_certificate", name: "NABL Accreditation Certificate", authority: "NABL" },
      { field: "nabl_scope", type: "nabl_scope", name: "NABL Scope of Accreditation", authority: "NABL" },
      { field: "dpcc_bmw_auth", type: "dpcc_bmw_auth", name: "DPCC Biomedical-Waste Authorization", authority: "DPCC" },
      { field: "partner_agreement", type: "partner_agreement", name: "Executed Partner Agreement", authority: "MediConnect & Partner" },
      { field: "bank_proof", type: "bank_proof", name: "Bank Proof (Cancelled Cheque / Letter)", authority: "Partner Bank" },
    ];

    for (const doc of complianceDocMap) {
      const docUrl = fields[doc.field] || null;
      if (docUrl) {
        try {
          await sql`
            INSERT INTO lab_partner_documents (
              lab_id,
              document_type,
              document_name,
              document_url,
              issuing_authority,
              verification_status,
              verified_by,
              verified_at,
              created_at,
              updated_at
            ) VALUES (
              ${createdUserId},
              ${doc.type},
              ${doc.name},
              ${docUrl},
              ${doc.authority},
              ${fields.document_verified === 'true' || fields.document_verified === true ? 'VERIFIED' : 'RECEIVED'},
              ${fields.document_verified === 'true' || fields.document_verified === true ? 'Admin' : null},
              ${fields.document_verified === 'true' || fields.document_verified === true ? sql`NOW()` : null},
              NOW(),
              NOW()
            )
            ON CONFLICT DO NOTHING
          `;
        } catch (docErr) {
          console.error(`Error saving compliance doc ${doc.type}:`, docErr);
        }
      }
    }

    // Auto-assign tests: either all master catalog tests, or selected test codes
    const rawSelectedTestCodes = fields.selected_test_codes;
    let selectedTestCodes = null;
    if (rawSelectedTestCodes) {
      try {
        selectedTestCodes = typeof rawSelectedTestCodes === 'string' ? JSON.parse(rawSelectedTestCodes) : rawSelectedTestCodes;
      } catch {
        selectedTestCodes = null;
      }
    }
    const hasSpecificSelection = Array.isArray(selectedTestCodes) && selectedTestCodes.length > 0;

    const shouldAssignTests = hasSpecificSelection ||
      fields.auto_assign_tests === undefined || 
      fields.auto_assign_tests === "true" || 
      fields.auto_assign_tests === true || 
      fields.auto_assign_tests === "1";

    let assignedTestsCount = 0;
    if (shouldAssignTests && createdUserId) {
      try {
        const assignedResult = await sql`
          INSERT INTO lab_tests (
            id,
            lab_id,
            category_id,
            test_code,
            test_name,
            price,
            specimen_type,
            container,
            temperature,
            remarks,
            schedule,
            reporting_schedule,
            requires_fasting,
            collection_type,
            commission_category,
            discount_percentage,
            offer_price,
            department,
            is_package,
            is_active,
            created_at,
            updated_at
          )
          SELECT
            gen_random_uuid(),
            ${createdUserId},
            c.id,
            m.test_code,
            m.test_name,
            COALESCE(NULLIF(REGEXP_REPLACE(m.mrp, '[^0-9.]', '', 'g'), '')::numeric, 0),
            m.sample_type,
            m.container,
            m.temp,
            m.remarks,
            m.schedule,
            m.reporting_schedule,
            COALESCE(m.requires_fasting, false),
            'lab',
            m.category,
            COALESCE(m.discount_percentage, 0),
            m.offer_price,
            m.department,
            COALESCE(m.is_package, false),
            true,
            NOW(),
            NOW()
          FROM lab_test_master m
          LEFT JOIN lab_test_categories c ON LOWER(TRIM(c.name)) = LOWER(TRIM(m.category))
          WHERE (${hasSpecificSelection ? sql`m.test_code = ANY(${selectedTestCodes})` : sql`1=1`})
            AND NOT EXISTS (
              SELECT 1 FROM lab_tests lt WHERE lt.lab_id = ${createdUserId} AND lt.test_code = m.test_code
            )
        `;
        assignedTestsCount = assignedResult.count;
        console.log(`[Lab Onboarding] Auto-assigned ${assignedTestsCount} master tests to lab ${createdUserId}`);
      } catch (testErr) {
        console.error("[Lab Onboarding] Error auto-assigning master tests:", testErr);
      }
    }

    return success("Lab created successfully.", { ...createdLabs[0], assigned_tests_count: assignedTestsCount }, 201, { headers: corsHeaders });
  } catch (error) {
    console.error("Create Lab Error:", error);
    if (createdUserId) {
      await sql`DELETE FROM users WHERE id = ${createdUserId}`.catch(() => {});
    }
    return failure("Failed to create lab. " + error.message, "lab_creation_failed", 500, { headers: corsHeaders });
  }
}
