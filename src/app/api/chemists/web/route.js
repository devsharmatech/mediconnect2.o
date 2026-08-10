import { supabase } from "@/lib/supabaseAdmin";
import { uploadToS3, getCloudFrontUrl } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import nodemailer from "nodemailer";

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

    // ── Detect if request is JSON (signed-URL flow) or FormData (legacy) ──
    if (contentType.includes("application/json")) {
      // New flow: all documents already uploaded via signed URLs, we receive URLs as strings
      fields = await req.json();
    } else {
      // Legacy FormData flow (backward compatibility)
      const formData = await req.formData();

      // Extract all text fields
      for (const [key, value] of formData.entries()) {
        if (typeof value === "string") {
          fields[key] = value;
        }
      }

      // Upload any File objects and replace with public URLs
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

    // ── Common processing for both flows ──
    const phone_number = fields.phone_number;
    const owner_name = fields.owner_name;
    const email = fields.email;
    const pharmacy_name = fields.pharmacy_name;
    const address = fields.address;
    const gstin = fields.gstin;
    const drug_license_no = fields.drug_license_no;
    const mobile = fields.mobile;
    const whatsapp = fields.whatsapp;
    const registration_no = fields.registration_no;

    console.log("ONBOARDING SUBMITTING PHONE & REG:", { phone_number, registration_no });

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

    const { data: existingPhone } = await supabase
      .from("users")
      .select("id")
      .eq("phone_number", phone_number)
      .maybeSingle();

    if (existingPhone) {
      return failure(
        "A chemist with this phone number already exists.",
        null,
        409,
        { headers: corsHeaders }
      );
    }

    const { data: existingReg } = await supabase
      .from("chemist_details")
      .select("id")
      .eq("registration_no", registration_no)
      .maybeSingle();

    if (existingReg) {
      return failure(
        "A chemist with this registration number already exists.",
        null,
        409,
        { headers: corsHeaders }
      );
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .insert([
        {
          phone_number,
          role: "chemist",
          is_verified: true,
        },
      ])
      .select()
      .single();

    if (userError) throw userError;

    // Collect document URLs (either from signed-URL flow or legacy upload)
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

    // Insert chemist details
    const { error: chemistError } = await supabase
      .from("chemist_details")
      .insert([
        {
          id: user.id,
          owner_name,
          email,
          address,
          gstin,
          drug_license_no,
          kyc_data: parseJSON(fields.kyc_data || []),
          mobile,
          whatsapp,
          pharmacy_name,
          registration_no,
          terms_conditions_agreement,
          digital_consent,
          consent_terms,
          upi_id,
          ...uploadedDocs,
        },
      ]);

    if (chemistError) throw chemistError;

    // Fire-and-forget email notification to chemist
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

    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query
    let query = supabase.from("chemist_details").select(
      `*,
     users!chemist_details_id_fkey(
        id,
        un_id,
        phone_number,
        role,
        status,
        created_at,
        profile_picture
     )`,
      { count: "exact" }
    );

    // --- SEARCH LOGIC ---
    if (search) {
      query = query.or(
        `owner_name.ilike.%${search}%,pharmacy_name.ilike.%${search}%,email.ilike.%${search}%,registration_no.ilike.%${search}%`
      );
    }

    // --- STATUS FILTER ---
    if (status) {
      query = query.eq("users.status", status === "active" ? 1 : 0);
    }

    // Apply sorting
    if (sortBy === "name") {
      query = query.order("owner_name", { ascending: sortOrder === "asc" });
    } else if (sortBy === "pharmacy_name") {
      query = query.order("pharmacy_name", { ascending: sortOrder === "asc" });
    } else if (sortBy === "registration_no") {
      query = query.order("registration_no", {
        ascending: sortOrder === "asc",
      });
    } else {
      query = query.order("created_at", { ascending: sortOrder === "asc" });
    }

    // Apply pagination
    query = query.range(from, to);

    // Calculate global stats for summary
    const [
      { count: activeCount },
      { count: inactiveCount },
      { count: gstinCount },
      { count: totalCount }
    ] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "chemist").eq("status", 1),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "chemist").eq("status", 0),
      supabase.from("chemist_details").select("id", { count: "exact", head: true }).not("gstin", "is", null),
      supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "chemist")
    ]);

    const { data, error, count } = await query;

    if (error) throw error;

    const totalPages = Math.ceil(count / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return success(
      "Chemists fetched successfully.",
      {
        data,
        summary: {
          total: totalCount || 0,
          active: activeCount || 0,
          inactive: inactiveCount || 0,
          gstin: gstinCount || 0
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
