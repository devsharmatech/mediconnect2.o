import { uploadToS3 } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import nodemailer from "nodemailer";
import sql from "@/lib/db";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

// Simple JSON parser helper
const parseJSON = (value) => {
  if (!value) return [];
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return [];
  }
};

// Email transporter for chemist onboarding notifications
const chemistMailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "0"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

async function sendChemistOnboardingEmail(email, ownerName, pharmacyName) {
  if (!email) return;

  const displayOwner = ownerName || "Chemist";
  const displayPharmacy = pharmacyName || "your pharmacy";

  try {
    await chemistMailTransporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "MediConnect - Chemist Onboarding Received",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0067A1;">Dear ${displayOwner},</h2>
          <p>Thank you for registering <strong>${displayPharmacy}</strong> on <strong>MediConnect</strong>.</p>
          <p>Your onboarding application has been received successfully and is now under review by our team.</p>
          <p>You will receive another email once your chemist account is verified and activated.</p>
          <p style="margin-top: 24px;">Warm regards,<br/>MediConnect Team</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Chemist onboarding email send error:", err);
  }
}

export async function POST(req) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let fields = {};

    // Detect if request is JSON (signed-URL flow) or FormData (legacy)
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
        "drug_license",
        "pharmacist_certificate",
        "pan_aadhaar",
        "gstin_certificate",
        "store_photo",
        "consent_form",
        "declaration_form",
        "digital_signature",
        "mou",
      ];

      const uploadFile = async (fieldName, file) => {
        if (!file || file.size === 0) return null;
        const fileExt = file.name.split(".").pop();
        const fileName = `${fieldName}/${fieldName}-${Date.now()}.${fileExt}`;
        try {
          const { url } = await uploadToS3(file, `chemist-documents/${fileName}`, "application/octet-stream");
          return url;
        } catch (err) {
          console.error(`Upload error for field ${fieldName}:`, err);
          throw err;
        }
      };

      for (const field of documentFields) {
        const file = formData.get(field);
        if (file && file.size > 0) {
          fields[field] = await uploadFile(field, file);
        }
      }
    }

    const raw_phone = fields.phone_number || "";
    const phone_number = String(raw_phone).replace(/\D/g, "").slice(-10);
    const owner_name = fields.owner_name;
    const email = fields.email;
    const pharmacy_name = fields.pharmacy_name;
    const address = fields.address;
    const gstin = fields.gstin;
    const drug_license_no = fields.drug_license_no;
    const mobile = fields.mobile;
    const whatsapp = fields.whatsapp;
    const registration_no = fields.registration_no;

    const terms_conditions_agreement =
      fields.terms_conditions_agreement === "true" || fields.terms_conditions_agreement === true;
    const digital_consent =
      fields.digital_consent === "true" || fields.digital_consent === true;
    const consent_terms =
      fields.consent_terms === "true" || fields.consent_terms === true;

    if (!phone_number || !owner_name || !pharmacy_name || !registration_no) {
      return failure("Missing required fields.", null, 400, {
        headers: corsHeaders,
      });
    }

    if (!consent_terms) {
      return failure("Please accept terms and conditions.", null, 400, {
        headers: corsHeaders,
      });
    }

    const [existingPhone] = await sql`
      SELECT id FROM users
      WHERE phone_number LIKE ${'%' + phone_number + '%'}
      LIMIT 1
    `;

    if (existingPhone) {
      return failure(
        "A chemist with this phone number already exists.",
        null,
        409,
        { headers: corsHeaders }
      );
    }

    const [existingReg] = await sql`
      SELECT id FROM chemist_details
      WHERE registration_no = ${registration_no}
      LIMIT 1
    `;

    if (existingReg) {
      return failure(
        "A chemist with this registration number already exists.",
        null,
        409,
        { headers: corsHeaders }
      );
    }

    // Insert user row
    const [user] = await sql`
      INSERT INTO users (phone_number, role, is_verified, status)
      VALUES (${phone_number}, 'chemist', true, 1)
      RETURNING id
    `;

    const documentFieldNames = [
      "drug_license",
      "pharmacist_certificate",
      "pan_aadhaar",
      "gstin_certificate",
      "store_photo",
      "consent_form",
      "declaration_form",
      "digital_signature",
      "mou",
      "payment_qr_url",
    ];
    const uploadedDocs = {};
    for (const field of documentFieldNames) {
      if (fields[field] && typeof fields[field] === "string" && fields[field].startsWith("http")) {
        uploadedDocs[field] = fields[field];
      }
    }

    const upi_id = fields.upi_id;

    // Insert chemist details row
    await sql`
      INSERT INTO chemist_details (
        id, owner_name, email, address, gstin, drug_license_no, drug_license,
        kyc_data, mobile, whatsapp, pharmacy_name, registration_no,
        terms_conditions_agreement, digital_consent, consent_terms, upi_id,
        pharmacist_certificate, pan_aadhaar, gstin_certificate, store_photo,
        consent_form, declaration_form, digital_signature, mou, payment_qr_url,
        updated_at
      )
      VALUES (
        ${user.id}, ${owner_name}, ${email || null}, ${address || null}, ${gstin || null},
        ${drug_license_no || null}, ${uploadedDocs.drug_license || null},
        ${sql.json(parseJSON(fields.kyc_data || []))}, ${mobile || null}, ${whatsapp || null},
        ${pharmacy_name}, ${registration_no}, ${terms_conditions_agreement},
        ${digital_consent}, ${consent_terms}, ${upi_id || null},
        ${uploadedDocs.pharmacist_certificate || null}, ${uploadedDocs.pan_aadhaar || null},
        ${uploadedDocs.gstin_certificate || null}, ${uploadedDocs.store_photo || null},
        ${uploadedDocs.consent_form || null}, ${uploadedDocs.declaration_form || null},
        ${uploadedDocs.digital_signature || null}, ${uploadedDocs.mou || null},
        ${uploadedDocs.payment_qr_url || null}, NOW()
      )
    `;

    sendChemistOnboardingEmail(email, owner_name, pharmacy_name);

    return success("Chemist onboarded successfully.", { id: user.id }, 201, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Chemist Onboarding Error:", error);
    return failure("Failed to onboard chemist.", error.message, 500, {
      headers: corsHeaders,
    });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) {
      const p = `%${search}%`;
      conditions.push(sql`(c.owner_name ILIKE ${p} OR c.pharmacy_name ILIKE ${p} OR c.email ILIKE ${p} OR c.registration_no ILIKE ${p})`);
    }

    if (status) {
      const statusNum = status === "active" ? 1 : 0;
      conditions.push(sql`u.status = ${statusNum}`);
    }

    const whereClause = conditions.length > 0
      ? sql`WHERE ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`
      : sql``;

    // Sorting
    let orderBy = sql`ORDER BY c.created_at DESC`;
    if (sortBy === "name") {
      orderBy = sortOrder === "asc" ? sql`ORDER BY c.owner_name ASC` : sql`ORDER BY c.owner_name DESC`;
    } else if (sortBy === "pharmacy_name") {
      orderBy = sortOrder === "asc" ? sql`ORDER BY c.pharmacy_name ASC` : sql`ORDER BY c.pharmacy_name DESC`;
    } else if (sortBy === "registration_no") {
      orderBy = sortOrder === "asc" ? sql`ORDER BY c.registration_no ASC` : sql`ORDER BY c.registration_no DESC`;
    } else if (sortOrder === "asc") {
      orderBy = sql`ORDER BY c.created_at ASC`;
    }

    const [
      countRes,
      data,
      activeCountRes,
      inactiveCountRes,
      gstinCountRes,
      totalCountRes
    ] = await Promise.all([
      sql`
        SELECT count(*)::int as count
        FROM chemist_details c
        JOIN users u ON u.id = c.id
        ${whereClause}
      `,
      sql`
        SELECT 
          c.*,
          json_build_object(
            'id', u.id,
            'un_id', u.un_id,
            'phone_number', u.phone_number,
            'role', u.role,
            'status', u.status,
            'created_at', u.created_at,
            'profile_picture', u.profile_picture
          ) as users
        FROM chemist_details c
        JOIN users u ON u.id = c.id
        ${whereClause}
        ${orderBy}
        LIMIT ${limit} OFFSET ${offset}
      `,
      sql`SELECT count(*)::int as count FROM users WHERE role = 'chemist' AND status = 1`,
      sql`SELECT count(*)::int as count FROM users WHERE role = 'chemist' AND status = 0`,
      sql`SELECT count(*)::int as count FROM chemist_details WHERE gstin IS NOT NULL AND gstin != ''`,
      sql`SELECT count(*)::int as count FROM users WHERE role = 'chemist'`
    ]);

    const count = countRes[0]?.count || 0;
    const totalPages = Math.ceil(count / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return success(
      "Chemists fetched successfully.",
      {
        data,
        summary: {
          total: totalCountRes[0]?.count || 0,
          active: activeCountRes[0]?.count || 0,
          inactive: inactiveCountRes[0]?.count || 0,
          gstin: gstinCountRes[0]?.count || 0
        },
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: count,
          itemsPerPage: limit,
          hasNextPage,
          hasPrevPage,
        },
        filters: {
          search,
          status,
          sortBy,
          sortOrder,
        },
      },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Fetch Chemists Error:", error);
    return failure("Failed to fetch chemists.", error.message, 500, {
      headers: corsHeaders,
    });
  }
}
