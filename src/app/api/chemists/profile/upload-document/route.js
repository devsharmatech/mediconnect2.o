import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { uploadToS3 } from "@/lib/s3";
import sql from "@/lib/db";

const ALLOWED_DOC_COLUMNS = [
  "drug_license",
  "pharmacist_certificate",
  "pan_aadhaar",
  "gstin_certificate",
  "cancelled_cheque",
  "store_photo",
  "consent_form",
  "declaration_form",
  "digital_signature",
  "mou",
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("document");
    const chemist_id = formData.get("chemist_id");
    const doc_type = formData.get("doc_type");

    if (!file || !chemist_id || !doc_type || !UUID_REGEX.test(chemist_id)) {
      return NextResponse.json(
        { success: false, message: "Missing required fields or invalid chemist ID." },
        { status: 400 }
      );
    }

    if (!ALLOWED_DOC_COLUMNS.includes(doc_type)) {
      return NextResponse.json(
        { success: false, message: `Invalid document type '${doc_type}'.` },
        { status: 400 }
      );
    }

    // Validate file type
    const ALLOWED_TYPES = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "Invalid file format." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name) || (file.type === 'application/pdf' ? '.pdf' : '.png');
    const key = `chemist-documents/${chemist_id}/${doc_type}-${uuidv4()}${ext}`;

    // Upload to S3
    const { url } = await uploadToS3(buffer, key, file.type);

    // Update chemist_details in AWS RDS PostgreSQL
    await sql.unsafe(
      `UPDATE chemist_details SET ${doc_type} = $1, updated_at = NOW() WHERE id = $2`,
      [url, chemist_id]
    );

    return NextResponse.json(
      { success: true, url },
      { status: 201 }
    );
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
