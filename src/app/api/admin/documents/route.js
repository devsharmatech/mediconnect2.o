import { NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

function parseDocUrl(val) {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val
      .filter(Boolean)
      .map((v) =>
        typeof v === "string"
          ? v.replace(/::text$/, "").replace(/^['"]|['"]$/g, "").trim()
          : v
      )
      .filter((v) => typeof v === "string" && v.length > 0);
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed || trimmed === "null" || trimmed === "undefined") return [];
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .filter(Boolean)
            .map((v) =>
              typeof v === "string"
                ? v.replace(/::text$/, "").replace(/^['"]|['"]$/g, "").trim()
                : v
            )
            .filter((v) => typeof v === "string" && v.length > 0);
        }
      } catch (e) {}
    }
    const cleaned = trimmed.replace(/::text$/, "").replace(/^['"]|['"]$/g, "").trim();
    return cleaned.length > 0 ? [cleaned] : [];
  }
  return [];
}

function detectFileType(url) {
  if (!url || typeof url !== "string") return "other";
  const cleanUrl = url.split("?")[0].toLowerCase();
  if (cleanUrl.endsWith(".pdf")) return "pdf";
  if (
    cleanUrl.endsWith(".jpg") ||
    cleanUrl.endsWith(".jpeg") ||
    cleanUrl.endsWith(".png") ||
    cleanUrl.endsWith(".webp") ||
    cleanUrl.endsWith(".svg")
  ) {
    return "image";
  }
  if (
    cleanUrl.endsWith(".doc") ||
    cleanUrl.endsWith(".docx") ||
    cleanUrl.endsWith(".odt")
  ) {
    return "document";
  }
  return "other";
}

function extractFileName(url, defaultName = "document") {
  if (!url || typeof url !== "string") return defaultName;
  try {
    const parts = url.split("?")[0].split("/");
    const lastPart = parts[parts.length - 1];
    return decodeURIComponent(lastPart) || defaultName;
  } catch {
    return defaultName;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleFilter = (searchParams.get("role") || "all").toLowerCase().trim();
    const categoryFilter = searchParams.get("category") || "all";
    const fileTypeFilter = (searchParams.get("fileType") || "all").toLowerCase().trim();
    const statusFilter = (searchParams.get("status") || "all").toLowerCase().trim();
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "15", 10)));
    const sortBy = searchParams.get("sortBy") || "newest";

    const allDocs = [];

    // 1. Doctors
    const doctors = await sql`
      SELECT d.id, d.full_name, d.email, d.specialization, d.license_number, d.onboarding_status, d.created_at,
             d.dmc_mci_certificate, d.aadhaar_pan_license, d.address_proof, d.passport_photo, d.signature_url,
             u.phone_number
      FROM doctor_details d
      LEFT JOIN users u ON u.id = d.id;
    `;

    for (const doc of doctors) {
      const dmc = parseDocUrl(doc.dmc_mci_certificate);
      dmc.forEach((url, i) =>
        allDocs.push({
          id: `doc-dmc-${doc.id}-${i}`,
          role: "doctor",
          entity_id: doc.id,
          entity_name: doc.full_name || "Doctor",
          entity_subtitle: doc.specialization || "Doctor",
          entity_phone: doc.phone_number || "",
          entity_email: doc.email || "",
          license_or_reg_no: doc.license_number || "",
          doc_type: "dmc_mci_certificate",
          doc_title: dmc.length > 1 ? `Medical Registration Certificate (${i + 1})` : "Medical Registration Certificate",
          category: "License & Registration",
          url,
          file_type: detectFileType(url),
          file_name: extractFileName(url, "Medical_Registration_Certificate"),
          onboarding_status: (doc.onboarding_status || "pending").toLowerCase(),
          created_at: doc.created_at || new Date().toISOString(),
        })
      );

      const aadhaar = parseDocUrl(doc.aadhaar_pan_license);
      aadhaar.forEach((url, i) =>
        allDocs.push({
          id: `doc-pan-${doc.id}-${i}`,
          role: "doctor",
          entity_id: doc.id,
          entity_name: doc.full_name || "Doctor",
          entity_subtitle: doc.specialization || "Doctor",
          entity_phone: doc.phone_number || "",
          entity_email: doc.email || "",
          license_or_reg_no: doc.license_number || "",
          doc_type: "aadhaar_pan_license",
          doc_title: aadhaar.length > 1 ? `PAN / Aadhaar ID (${i + 1})` : "PAN / Aadhaar ID",
          category: "Identity Proof",
          url,
          file_type: detectFileType(url),
          file_name: extractFileName(url, "PAN_Aadhaar_ID"),
          onboarding_status: (doc.onboarding_status || "pending").toLowerCase(),
          created_at: doc.created_at || new Date().toISOString(),
        })
      );

      const addr = parseDocUrl(doc.address_proof);
      addr.forEach((url, i) =>
        allDocs.push({
          id: `doc-addr-${doc.id}-${i}`,
          role: "doctor",
          entity_id: doc.id,
          entity_name: doc.full_name || "Doctor",
          entity_subtitle: doc.specialization || "Doctor",
          entity_phone: doc.phone_number || "",
          entity_email: doc.email || "",
          license_or_reg_no: doc.license_number || "",
          doc_type: "address_proof",
          doc_title: addr.length > 1 ? `Address Proof (${i + 1})` : "Address Proof",
          category: "Identity Proof",
          url,
          file_type: detectFileType(url),
          file_name: extractFileName(url, "Address_Proof"),
          onboarding_status: (doc.onboarding_status || "pending").toLowerCase(),
          created_at: doc.created_at || new Date().toISOString(),
        })
      );

      if (doc.signature_url && typeof doc.signature_url === "string" && doc.signature_url.trim().length > 0) {
        allDocs.push({
          id: `doc-sig-${doc.id}`,
          role: "doctor",
          entity_id: doc.id,
          entity_name: doc.full_name || "Doctor",
          entity_subtitle: doc.specialization || "Doctor",
          entity_phone: doc.phone_number || "",
          entity_email: doc.email || "",
          license_or_reg_no: doc.license_number || "",
          doc_type: "signature",
          doc_title: "Digital Signature",
          category: "Signature & Consent",
          url: doc.signature_url.trim(),
          file_type: detectFileType(doc.signature_url),
          file_name: extractFileName(doc.signature_url, "Doctor_Digital_Signature"),
          onboarding_status: (doc.onboarding_status || "pending").toLowerCase(),
          created_at: doc.created_at || new Date().toISOString(),
        });
      }
    }

    // 2. Chemists
    const chemists = await sql`
      SELECT c.id, c.pharmacy_name, c.owner_name, c.email, c.mobile, c.drug_license_no, c.gstin, c.onboarding_status, c.created_at,
             c.drug_license, c.pharmacist_certificate, c.pan_aadhaar, c.gstin_certificate, c.cancelled_cheque, c.store_photo, c.mou, c.digital_signature
      FROM chemist_details c;
    `;
    const chemFields = [
      { key: "drug_license", title: "Drug License Certificate", cat: "License & Registration" },
      { key: "pharmacist_certificate", title: "Pharmacist Degree / Certificate", cat: "License & Registration" },
      { key: "pan_aadhaar", title: "PAN / Aadhaar Proof", cat: "Identity Proof" },
      { key: "gstin_certificate", title: "GSTIN Certificate", cat: "Tax & Compliance" },
      { key: "cancelled_cheque", title: "Cancelled Cheque", cat: "Financial & Banking" },
      { key: "store_photo", title: "Pharmacy Store Photo", cat: "Establishment Proof" },
      { key: "mou", title: "Chemist MoU / Agreement", cat: "Signature & Consent" },
      { key: "digital_signature", title: "Digital Signature", cat: "Signature & Consent" },
    ];
    for (const chem of chemists) {
      for (const f of chemFields) {
        const urls = parseDocUrl(chem[f.key]);
        urls.forEach((url, i) =>
          allDocs.push({
            id: `chem-${f.key}-${chem.id}-${i}`,
            role: "chemist",
            entity_id: chem.id,
            entity_name: chem.pharmacy_name || chem.owner_name || "Chemist",
            entity_subtitle: chem.owner_name ? `Owner: ${chem.owner_name}` : "Chemist Partner",
            entity_phone: chem.mobile || "",
            entity_email: chem.email || "",
            license_or_reg_no: chem.drug_license_no || chem.gstin || "",
            doc_type: f.key,
            doc_title: f.title,
            category: f.cat,
            url,
            file_type: detectFileType(url),
            file_name: extractFileName(url, f.title.replace(/\s+/g, "_")),
            onboarding_status: (chem.onboarding_status || "pending").toLowerCase(),
            created_at: chem.created_at || new Date().toISOString(),
          })
        );
      }
    }

    // 3. Labs
    const labs = await sql`
      SELECT l.id, l.lab_name, l.owner_name, l.email, l.phone_number, l.license_number, l.gst_number, l.pan_number, l.onboarding_status, l.created_at,
             l.lab_license_url, l.pan_card_url, l.aadhaar_card_url, l.gst_certificate_url, l.owner_photo_url, l.signature_url
      FROM lab_details l;
    `;
    const labFields = [
      { key: "lab_license_url", title: "Diagnostic Lab License", cat: "License & Registration" },
      { key: "pan_card_url", title: "PAN Card", cat: "Identity Proof" },
      { key: "aadhaar_card_url", title: "Aadhaar Card", cat: "Identity Proof" },
      { key: "gst_certificate_url", title: "GST Certificate", cat: "Tax & Compliance" },
      { key: "owner_photo_url", title: "Lab Owner Photo", cat: "Establishment Proof" },
      { key: "signature_url", title: "Authorized Signature", cat: "Signature & Consent" },
    ];
    for (const lab of labs) {
      for (const f of labFields) {
        const urls = parseDocUrl(lab[f.key]);
        urls.forEach((url, i) =>
          allDocs.push({
            id: `lab-${f.key}-${lab.id}-${i}`,
            role: "lab",
            entity_id: lab.id,
            entity_name: lab.lab_name || lab.owner_name || "Diagnostic Lab",
            entity_subtitle: lab.owner_name ? `Owner: ${lab.owner_name}` : "Diagnostic Center",
            entity_phone: lab.phone_number || "",
            entity_email: lab.email || "",
            license_or_reg_no: lab.license_number || lab.gst_number || "",
            doc_type: f.key,
            doc_title: f.title,
            category: f.cat,
            url,
            file_type: detectFileType(url),
            file_name: extractFileName(url, f.title.replace(/\s+/g, "_")),
            onboarding_status: (lab.onboarding_status || "pending").toLowerCase(),
            created_at: lab.created_at || new Date().toISOString(),
          })
        );
      }
    }

    // 4. Lab partner documents
    const labPartnerDocs = await sql`
      SELECT d.id, d.lab_id, d.document_type, d.document_name, d.document_url, d.document_number, d.verification_status, d.created_at,
             l.lab_name, l.owner_name, l.phone_number, l.email
      FROM lab_partner_documents d
      LEFT JOIN lab_details l ON l.id = d.lab_id
      WHERE d.document_url IS NOT NULL;
    `;
    for (const lpd of labPartnerDocs) {
      if (lpd.document_url) {
        allDocs.push({
          id: `lpd-${lpd.id}`,
          role: "lab",
          entity_id: lpd.lab_id,
          entity_name: lpd.lab_name || "Diagnostic Lab",
          entity_subtitle: lpd.owner_name ? `Owner: ${lpd.owner_name}` : "Diagnostic Center",
          entity_phone: lpd.phone_number || "",
          entity_email: lpd.email || "",
          license_or_reg_no: lpd.document_number || "",
          doc_type: lpd.document_type || "lab_doc",
          doc_title: lpd.document_name || "Lab Accreditation Certificate",
          category: "License & Registration",
          url: lpd.document_url,
          file_type: detectFileType(lpd.document_url),
          file_name: extractFileName(lpd.document_url, "Lab_Accreditation"),
          onboarding_status: (lpd.verification_status || "approved").toLowerCase(),
          created_at: lpd.created_at || new Date().toISOString(),
        });
      }
    }

    // 5. Hospitals
    const hospitals = await sql`
      SELECT h.id, h.hospital_name, h.owner_name, h.email, h.phone_number, h.license_number, h.gst_number, h.onboarding_status, h.created_at,
             h.hospital_license_url, h.pan_card_url, h.aadhaar_card_url, h.gst_certificate_url, h.owner_photo_url, h.signature_url
      FROM hospital_details h;
    `;
    const hospFields = [
      { key: "hospital_license_url", title: "Hospital License / Registration", cat: "License & Registration" },
      { key: "pan_card_url", title: "PAN Card", cat: "Identity Proof" },
      { key: "aadhaar_card_url", title: "Aadhaar Card", cat: "Identity Proof" },
      { key: "gst_certificate_url", title: "GST Certificate", cat: "Tax & Compliance" },
      { key: "owner_photo_url", title: "Director / Owner Photo", cat: "Establishment Proof" },
      { key: "signature_url", title: "Authorized Signature", cat: "Signature & Consent" },
    ];
    for (const hosp of hospitals) {
      for (const f of hospFields) {
        const urls = parseDocUrl(hosp[f.key]);
        urls.forEach((url, i) =>
          allDocs.push({
            id: `hosp-${f.key}-${hosp.id}-${i}`,
            role: "hospital",
            entity_id: hosp.id,
            entity_name: hosp.hospital_name || "Hospital Partner",
            entity_subtitle: hosp.owner_name ? `Director: ${hosp.owner_name}` : "Healthcare Facility",
            entity_phone: hosp.phone_number || "",
            entity_email: hosp.email || "",
            license_or_reg_no: hosp.license_number || hosp.gst_number || "",
            doc_type: f.key,
            doc_title: f.title,
            category: f.cat,
            url,
            file_type: detectFileType(url),
            file_name: extractFileName(url, f.title.replace(/\s+/g, "_")),
            onboarding_status: (hosp.onboarding_status || "approved").toLowerCase(),
            created_at: hosp.created_at || new Date().toISOString(),
          })
        );
      }
    }

    // Role-wise totals before filtering (Strictly Partner Compliance & KYC - DPDP Act 2023 Compliant)
    const summary = {
      total: allDocs.length,
      doctor: allDocs.filter((d) => d.role === "doctor").length,
      chemist: allDocs.filter((d) => d.role === "chemist").length,
      lab: allDocs.filter((d) => d.role === "lab").length,
      hospital: allDocs.filter((d) => d.role === "hospital").length,
    };

    // Apply filtering
    let filtered = allDocs;

    if (roleFilter !== "all") {
      filtered = filtered.filter((d) => d.role === roleFilter);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((d) => d.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    if (fileTypeFilter !== "all") {
      filtered = filtered.filter((d) => d.file_type === fileTypeFilter);
    }

    if (statusFilter !== "all") {
      if (statusFilter === "approved" || statusFilter === "verified") {
        filtered = filtered.filter((d) => d.onboarding_status === "approved" || d.onboarding_status === "verified");
      } else if (statusFilter === "pending") {
        filtered = filtered.filter((d) => d.onboarding_status === "pending" || !d.onboarding_status);
      } else if (statusFilter === "rejected") {
        filtered = filtered.filter((d) => d.onboarding_status === "rejected");
      }
    }

    if (search) {
      filtered = filtered.filter((d) => {
        return (
          (d.entity_name && d.entity_name.toLowerCase().includes(search)) ||
          (d.entity_subtitle && d.entity_subtitle.toLowerCase().includes(search)) ||
          (d.entity_phone && d.entity_phone.toLowerCase().includes(search)) ||
          (d.entity_email && d.entity_email.toLowerCase().includes(search)) ||
          (d.doc_title && d.doc_title.toLowerCase().includes(search)) ||
          (d.license_or_reg_no && d.license_number?.toLowerCase().includes(search)) ||
          (d.category && d.category.toLowerCase().includes(search))
        );
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.created_at) - new Date(b.created_at);
      }
      if (sortBy === "name") {
        return a.entity_name.localeCompare(b.entity_name);
      }
      // default newest
      return new Date(b.created_at) - new Date(a.created_at);
    });

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const offset = (page - 1) * limit;
    const paginatedDocs = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: paginatedDocs,
      summary,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error in /api/admin/documents:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
