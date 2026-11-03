import sql from "@/lib/db";
import { uploadToS3, getPresignedDownloadUrl } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import crypto from "crypto";
import { sendGenericOTPViaSMS } from "@/lib/sms";

export const dynamic = "force-dynamic";

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

async function resolveSignedUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return rawUrl;
  const urlParts = rawUrl.split("/digital-locker/");
  const storagePath = urlParts.length > 1 ? urlParts[1] : null;
  if (storagePath) {
    try {
      const signed = await getPresignedDownloadUrl(
        `digital-locker/${storagePath}`,
        3600
      );
      if (signed) return signed;
    } catch (e) {
      console.warn("Presigned URL fallback:", e.message);
    }
  }
  return rawUrl;
}

// GET - Retrieve all documents for a user or get single document
export async function GET(req, { params }) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("document_id");

    if (!userId) {
      return failure("User ID is required.", null, 400);
    }

    if (documentId) {
      const rows = await sql`
        SELECT *
        FROM digital_locker_documents
        WHERE id = ${documentId}
          AND user_id = ${userId}
          AND COALESCE(is_active, true) = true
        LIMIT 1
      `;
      const document = rows[0];
      if (!document) {
        return failure("Document not found.", null, 404);
      }

      document.document_url = await resolveSignedUrl(document.document_url);

      return success("Document retrieved successfully.", {
        document,
      });
    }

    const documents = await sql`
      SELECT *
      FROM digital_locker_documents
      WHERE user_id = ${userId}
        AND COALESCE(is_active, true) = true
      ORDER BY COALESCE(upload_date, created_at) DESC
    `;

    const securedDocuments = await Promise.all(
      (documents || []).map(async (doc) => ({
        ...doc,
        document_url: await resolveSignedUrl(doc.document_url),
      }))
    );

    return success("Documents retrieved successfully.", {
      documents: securedDocuments,
      total: securedDocuments.length,
    });
  } catch (error) {
    console.error("Get Documents Error:", error);
    return failure("Failed to retrieve documents.", error.message, 500);
  }
}

// POST - Upload a new document or log document action
export async function POST(req, { params }) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (!userId) {
      return failure("User ID is required.", null, 400);
    }

    if (action === "log") {
      const { document_id, action_type, ip_address, user_agent } =
        await req.json();

      if (!document_id || !action_type) {
        return failure("Document ID and action type are required.", null, 400);
      }

      const validActions = ["viewed", "downloaded", "shared"];
      if (!validActions.includes(action_type)) {
        return failure("Invalid action type.", null, 400);
      }

      const docs = await sql`
        SELECT id
        FROM digital_locker_documents
        WHERE id = ${document_id} AND user_id = ${userId}
        LIMIT 1
      `;
      if (!docs[0]) {
        return failure("Document not found.", null, 404);
      }

      const inserted = await sql`
        INSERT INTO digital_locker_audit_logs (
          document_id,
          user_id,
          action,
          ip_address,
          user_agent
        )
        VALUES (
          ${document_id},
          ${userId},
          ${action_type},
          ${ip_address || null},
          ${user_agent || null}
        )
        RETURNING *
      `.catch(() => []);

      return success(`Document ${action_type} logged successfully.`, {
        log: inserted[0] || null,
      });
    }

    if (action === "requestverify") {
      const { document_id, action_type } = await req.json();

      if (!document_id || !action_type) {
        return failure("Document ID and action type are required.", null, 400);
      }

      const users = await sql`
        SELECT phone_number
        FROM users
        WHERE id = ${userId}
        LIMIT 1
      `;
      const user = users[0];

      if (!user?.phone_number) {
        return failure(
          "Registered phone number not found for this user account.",
          null,
          400
        );
      }

      const phone_number = user.phone_number;

      const docs = await sql`
        SELECT id
        FROM digital_locker_documents
        WHERE id = ${document_id} AND user_id = ${userId}
        LIMIT 1
      `;
      if (!docs[0]) {
        return failure("Document not found.", null, 404);
      }

      const otp = generateOTP();
      const verificationToken = generateVerificationToken();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const inserted = await sql`
        INSERT INTO document_verification_requests (
          document_id,
          user_id,
          action_type,
          verification_token,
          otp_code,
          otp_expires_at
        )
        VALUES (
          ${document_id},
          ${userId},
          ${action_type},
          ${verificationToken},
          ${otp},
          ${expiresAt}
        )
        RETURNING *
      `;
      const verificationRequest = inserted[0];

      let smsSent = false;
      try {
        const smsResult = await sendGenericOTPViaSMS(phone_number, otp);
        smsSent = smsResult.success;
      } catch (smsError) {
        console.error("SMS sending error:", smsError);
      }

      return success(
        `OTP sent successfully to your registered mobile number for document ${action_type}.`,
        {
          verification_id: verificationRequest.id,
          verification_token: verificationToken,
          sms_sent: smsSent,
        }
      );
    }

    if (action === "verifyotp") {
      const { verification_token, otp_code } = await req.json();

      if (!verification_token || !otp_code) {
        return failure(
          "Verification token and OTP code are required.",
          null,
          400
        );
      }

      const rows = await sql`
        SELECT *
        FROM document_verification_requests
        WHERE verification_token = ${verification_token}
        LIMIT 1
      `;
      const verificationRequest = rows[0];

      if (!verificationRequest) {
        return failure("Verification request not found.", null, 404);
      }

      if (verificationRequest.is_verified) {
        return failure("Already verified.", null, 400);
      }

      if (String(verificationRequest.otp_code) !== String(otp_code)) {
        return failure("Invalid OTP code.", null, 400);
      }

      await sql`
        UPDATE document_verification_requests
        SET is_verified = true, verified_at = NOW(), status = 'verified'
        WHERE id = ${verificationRequest.id}
      `;

      return success("OTP verified successfully.", {
        verification_token,
        verified: true,
      });
    }

    // Upload a new document
    const formData = await req.formData();
    const file = formData.get("file");
    const document_name = formData.get("document_name");
    const document_type = formData.get("document_type");
    const description = formData.get("description");

    if (!file || typeof file === "string" || !file.size) {
      return failure("A valid, non-empty file is required.", null, 400);
    }

    if (!document_name || !document_name.trim()) {
      return failure("Document name is required.", null, 400);
    }

    if (!document_type) {
      return failure("Document type is required.", null, 400);
    }

    const MAX_FILE_SIZE_MB = 15;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return failure(
        `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the ${MAX_FILE_SIZE_MB}MB limit. Please upload a smaller file.`,
        null,
        400
      );
    }

    const validDocTypes = [
      "adharcard",
      "pancard",
      "voter_id",
      "driving_license",
      "passport",
      "prescription",
      "lab_report",
      "health_certificate",
      "insurance_document",
      "medical_record",
      "vaccination_card",
      "other",
    ];
    if (!validDocTypes.includes(document_type)) {
      return failure("Invalid document type.", validDocTypes, 400);
    }

    const rawFileName = file.name || "document.pdf";
    const fileExtension = rawFileName.includes(".")
      ? rawFileName.split(".").pop().toLowerCase().trim()
      : "pdf";

    const allowedExtensions = [
      "pdf",
      "jpg",
      "jpeg",
      "png",
      "webp",
      "gif",
      "bmp",
      "heic",
      "heif",
      "tiff",
      "doc",
      "docx",
    ];

    if (!allowedExtensions.includes(fileExtension)) {
      return failure(
        `Unsupported file type (.${fileExtension}). Allowed formats: PDF, JPG, JPEG, PNG, WEBP, GIF, HEIC, DOCX.`,
        null,
        400
      );
    }

    const users = await sql`
      SELECT id FROM users WHERE id = ${userId} LIMIT 1
    `;
    if (!users[0]) {
      return failure("User not found.", null, 404);
    }

    const mimeTypeMap = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      bmp: "image/bmp",
      heic: "image/heic",
      heif: "image/heif",
      tiff: "image/tiff",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };

    const finalMimeType =
      file.type || mimeTypeMap[fileExtension] || "application/octet-stream";
    const fileSize = file.size;
    const timestamp = Date.now();
    const cleanDocType = String(document_type).replace(/[^a-zA-Z0-9_-]/g, "");
    const fileName = `${userId}-${cleanDocType}-${timestamp}.${fileExtension}`;

    let document_url;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { url } = await uploadToS3(
        buffer,
        `digital-locker/${fileName}`,
        finalMimeType
      );
      document_url = url;
    } catch (uploadError) {
      console.error("Storage upload error:", uploadError);
      return failure(
        "Failed to upload file to storage.",
        uploadError.message,
        500
      );
    }

    const insertedDocs = await sql`
      INSERT INTO digital_locker_documents (
        user_id,
        document_name,
        document_type,
        document_url,
        description,
        file_size,
        mime_type,
        is_active
      )
      VALUES (
        ${userId},
        ${document_name.trim()},
        ${document_type},
        ${document_url},
        ${description ? description.trim() : null},
        ${fileSize},
        ${finalMimeType},
        true
      )
      RETURNING *
    `;
    const document = insertedDocs[0];

    await sql`
      INSERT INTO digital_locker_audit_logs (
        document_id,
        user_id,
        action,
        action_details
      )
      VALUES (
        ${document.id},
        ${userId},
        'uploaded',
        ${JSON.stringify({
          document_name: document_name.trim(),
          document_type,
          file_size: fileSize,
          mime_type: finalMimeType,
        })}::jsonb
      )
    `.catch(() => {});

    return success("Document uploaded successfully.", {
      document,
    });
  } catch (error) {
    console.error("Upload Document Error:", error);
    return failure("Failed to upload document.", error.message, 500);
  }
}

// PUT - Update document details
export async function PUT(req, { params }) {
  try {
    const { userId } = await params;
    const { document_id, document_name, description, verification_token } =
      await req.json();

    if (!document_id || !verification_token) {
      return failure(
        "Document ID and verification token are required.",
        null,
        400
      );
    }

    const verRows = await sql`
      SELECT *
      FROM document_verification_requests
      WHERE verification_token = ${verification_token}
        AND document_id = ${document_id}
        AND action_type = 'edit'
        AND is_verified = true
      LIMIT 1
    `;
    const verificationRequest = verRows[0];

    if (!verificationRequest) {
      return failure("Invalid or unverified verification token.", null, 401);
    }

    if (verificationRequest.status === "expired") {
      return failure("Verification token has expired.", null, 400);
    }

    const docs = await sql`
      SELECT *
      FROM digital_locker_documents
      WHERE id = ${document_id} AND user_id = ${userId}
      LIMIT 1
    `;
    const document = docs[0];

    if (!document) {
      return failure("Document not found.", null, 404);
    }

    const updatedRows = await sql`
      UPDATE digital_locker_documents
      SET
        document_name = ${document_name || document.document_name},
        description = ${description !== undefined ? description : document.description},
        updated_at = NOW()
      WHERE id = ${document_id}
      RETURNING *
    `;
    const updatedDocument = updatedRows[0];

    await sql`
      UPDATE document_verification_requests
      SET status = 'completed'
      WHERE id = ${verificationRequest.id}
    `.catch(() => {});

    return success("Document updated successfully.", {
      document: updatedDocument,
    });
  } catch (error) {
    console.error("Update Document Error:", error);
    return failure("Failed to update document.", error.message, 500);
  }
}

// DELETE - Soft delete a document
export async function DELETE(req, { params }) {
  try {
    const { userId } = await params;
    const { document_id } = await req.json();

    if (!document_id) {
      return failure("Document ID is required.", null, 400);
    }

    const docs = await sql`
      SELECT *
      FROM digital_locker_documents
      WHERE id = ${document_id} AND user_id = ${userId}
      LIMIT 1
    `;
    const document = docs[0];

    if (!document) {
      return failure("Document not found.", null, 404);
    }

    await sql`
      UPDATE digital_locker_documents
      SET is_active = false, updated_at = NOW()
      WHERE id = ${document_id}
    `;

    return success("Document deleted successfully.", {
      document_id,
      deleted: true,
    });
  } catch (error) {
    console.error("Delete Document Error:", error);
    return failure("Failed to delete document.", error.message, 500);
  }
}
