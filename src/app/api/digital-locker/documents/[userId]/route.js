import { supabase } from "@/lib/supabaseAdmin";
import { uploadToS3, getCloudFrontUrl, getPresignedUploadUrl, getPresignedDownloadUrl, extractKeyFromUrl } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { sendGenericOTPViaSMS } from "@/lib/sms";

export const dynamic = "force-dynamic";

// Configure nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Helper functions for verification
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

async function requireEmailVerified(userId) {
  try {
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error("Error fetching user role for email verification check:", userError.message);
    } else if (user?.role === "patient") {
      // Patients login via OTP and do not require email verification
      return null;
    }
  } catch (err) {
    console.error("Failed to determine user role:", err);
  }

  const { data: latestVerified, error } = await supabase
    .from("email_verifications")
    .select("id, is_verified")
    .eq("user_id", userId)
    .eq("is_verified", true)
    .order("verified_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!latestVerified?.is_verified) {
    return failure(
      "Email verification required to access Digital Locker.",
      { verified: false },
      403
    );
  }

  return null;
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

    const verificationFailure = await requireEmailVerified(userId);
    if (verificationFailure) return verificationFailure;

    // If document_id is provided, get single document
    if (documentId) {
      const { data: document, error } = await supabase
        .from("digital_locker_documents")
        .select("*")
        .eq("id", documentId)
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (error || !document) {
        return failure("Document not found.", null, 404);
      }

      // Generate secure signed URL (1 hour expiry)
      const urlParts = document.document_url.split("/digital-locker/");
      const storagePath = urlParts.length > 1 ? urlParts[1] : null;
      if (storagePath) {
        const signedData = { signedUrl: await (async () => { try { const { getPresignedDownloadUrl: _gpdu } = await import("@/lib/s3"); return await _gpdu(`digital-locker/${storagePath}`, 3600); } catch(e) { return null; } })() };
        if (signedData?.signedUrl) {
          document.document_url = signedData.signedUrl;
        }
      }

      return success("Document retrieved successfully.", {
        document,
      });
    }

    // Otherwise, get all user documents
    const { data: documents, error } = await supabase
      .from("digital_locker_documents")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("upload_date", { ascending: false });

    if (error) throw error;

    // Generate signed URLs for all documents
    const securedDocuments = await Promise.all((documents || []).map(async (doc) => {
      const urlParts = doc.document_url.split("/digital-locker/");
      const storagePath = urlParts.length > 1 ? urlParts[1] : null;
      if (storagePath) {
        const signedData = { signedUrl: await (async () => { try { const { getPresignedDownloadUrl: _gpdu } = await import("@/lib/s3"); return await _gpdu(`digital-locker/${storagePath}`, 3600); } catch(e) { return null; } })() };
        if (signedData?.signedUrl) {
          doc.document_url = signedData.signedUrl;
        }
      }
      return doc;
    }));

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

    const verificationFailure = await requireEmailVerified(userId);
    if (verificationFailure) return verificationFailure;

    // If action is "log", log a document action (view/download/share)
    if (action === "log") {
      const { document_id, action_type, ip_address, user_agent } = await req.json();

      if (!document_id || !action_type) {
        return failure("Document ID and action type are required.", null, 400);
      }

      const validActions = ["viewed", "downloaded", "shared"];
      if (!validActions.includes(action_type)) {
        return failure("Invalid action type.", null, 400);
      }

      // Verify document exists
      const { data: document, error: docError } = await supabase
        .from("digital_locker_documents")
        .select("*")
        .eq("id", document_id)
        .eq("user_id", userId)
        .single();

      if (docError || !document) {
        return failure("Document not found.", null, 404);
      }

      // Log the action
      const { data: log, error: logError } = await supabase
        .from("digital_locker_audit_logs")
        .insert({
          document_id,
          user_id: userId,
          action: action_type,
          ip_address,
          user_agent,
        })
        .select()
        .single();

      if (logError) throw logError;

      return success(`Document ${action_type} logged successfully.`, {
        log,
      });
    }

    // If action is "requestverify", send OTP for document action (edit/delete)
    if (action === "requestverify") {
      const { document_id, action_type } = await req.json();

      if (!document_id || !action_type) {
        return failure("Document ID and action type are required.", null, 400);
      }

      // Get the user's phone number from the users table
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("phone_number")
        .eq("id", userId)
        .single();

      if (userError || !user?.phone_number) {
        return failure("Registered phone number not found for this user account.", null, 400);
      }

      const phone_number = user.phone_number;

      // Verify document exists and belongs to user
      const { data: document, error: docError } = await supabase
        .from("digital_locker_documents")
        .select("*")
        .eq("id", document_id)
        .eq("user_id", userId)
        .single();

      if (docError || !document) {
        return failure("Document not found.", null, 404);
      }

      const otp = generateOTP();
      const verificationToken = generateVerificationToken();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Create verification request
      const { data: verificationRequest, error: verificationError } = await supabase
        .from("document_verification_requests")
        .insert({
          document_id,
          user_id: userId,
          action_type,
          verification_token: verificationToken,
          otp_code: otp,
          otp_expires_at: expiresAt,
        })
        .select()
        .single();

      if (verificationError) throw verificationError;

      // Log OTP in console for local development testing
      console.log(`[DEV] SMS OTP sent to ${phone_number} for document ${action_type}: ${otp}`);

      // Send OTP via SMS
      let smsSent = false;
      try {
        const smsResult = await sendGenericOTPViaSMS(phone_number, otp);
        smsSent = smsResult.success;
      } catch (smsError) {
        console.error("SMS sending error:", smsError);
      }

      return success(`OTP sent successfully to your registered mobile number for document ${action_type}.`, {
        verification_id: verificationRequest.id,
        verification_token: verificationToken,
        sms_sent: smsSent,
      });
    }

    // If action is "verifyotp", verify the OTP
    if (action === "verifyotp") {
      const { verification_token, otp_code } = await req.json();

      if (!verification_token || !otp_code) {
        return failure("Verification token and OTP code are required.", null, 400);
      }

      // Get the verification request
      const { data: verificationRequest, error: verificationError } = await supabase
        .from("document_verification_requests")
        .select("*")
        .eq("verification_token", verification_token)
        .single();

      if (verificationError || !verificationRequest) {
        return failure("Verification request not found.", null, 404);
      }

      if (verificationRequest.is_verified) {
        return failure("Already verified.", null, 400);
      }

      // Verify OTP
      if (verificationRequest.otp_code !== otp_code) {
        return failure("Invalid OTP code.", null, 400);
      }

      // Mark as verified
      await supabase
        .from("document_verification_requests")
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
          status: "verified",
        })
        .eq("id", verificationRequest.id);

      return success("OTP verified successfully.", {
        verification_token,
        verified: true,
      });
    }

    // Otherwise, upload a new document
    const formData = await req.formData();
    const file = formData.get("file");
    const document_name = formData.get("document_name");
    const document_type = formData.get("document_type");
    const description = formData.get("description");

    if (!file || !document_name || !document_type) {
      return failure("File, document name, and document type are required.", null, 400);
    }

    // Validate document type (government IDs and medical documents)
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

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return failure("User not found.", null, 404);
    }

    // Get file details
    const fileSize = file.size;
    const fileType = file.type;
    const fileExtension = file.name.split(".").pop();
    const timestamp = Date.now();
    const fileName = `${userId}-${document_type}-${timestamp}.${fileExtension}`;

    // Upload file to AWS S3
    let document_url;
    try {
      const { url } = await uploadToS3(file, `digital-locker/${fileName}`, "application/octet-stream");
      document_url = url;
    } catch (uploadError) {
      console.error("Storage upload error:", uploadError);
      return failure("Failed to upload file to storage.", uploadError.message, 500);
    }

    // Insert document record
    const { data: document, error: insertError } = await supabase
      .from("digital_locker_documents")
      .insert({
        user_id: userId,
        document_name,
        document_type,
        document_url,
        description: description || null,
        file_size: fileSize,
        mime_type: fileType,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Log the upload action
    await supabase.from("digital_locker_audit_logs").insert({
      document_id: document.id,
      user_id: userId,
      action: "uploaded",
      action_details: {
        document_name,
        document_type,
        file_size: fileSize,
        mime_type: fileType,
      },
    });

    return success("Document uploaded successfully.", {
      document,
    });
  } catch (error) {
    console.error("Upload Document Error:", error);
    return failure("Failed to upload document.", error.message, 500);
  }
}

// PUT - Update document details (requires verification)
export async function PUT(req, { params }) {
  try {
    const { userId } = await params;
    const { document_id, document_name, description, verification_token } =
      await req.json();

    const verificationFailure = await requireEmailVerified(userId);
    if (verificationFailure) return verificationFailure;

    if (!document_id || !verification_token) {
      return failure("Document ID and verification token are required.", null, 400);
    }

    // Verify the verification token
    const { data: verificationRequest, error: verificationError } = await supabase
      .from("document_verification_requests")
      .select("*")
      .eq("verification_token", verification_token)
      .eq("document_id", document_id)
      .eq("action_type", "edit")
      .eq("is_verified", true)
      .single();

    if (verificationError || !verificationRequest) {
      return failure("Invalid or unverified verification token.", null, 401);
    }

    // Check if token is expired
    if (verificationRequest.status === "expired") {
      return failure("Verification token has expired.", null, 400);
    }

    // Verify document exists and belongs to user
    const { data: document, error: docError } = await supabase
      .from("digital_locker_documents")
      .select("*")
      .eq("id", document_id)
      .eq("user_id", userId)
      .single();

    if (docError || !document) {
      return failure("Document not found.", null, 404);
    }

    // Update document
    const { data: updatedDocument, error: updateError } = await supabase
      .from("digital_locker_documents")
      .update({
        document_name: document_name || document.document_name,
        description: description || document.description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", document_id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log the edit action
    await supabase.from("digital_locker_audit_logs").insert({
      document_id,
      user_id: userId,
      action: "edited",
      action_details: {
        changes: {
          document_name,
          description,
        },
      },
    });

    // Mark verification request as used
    await supabase
      .from("document_verification_requests")
      .update({ status: "completed" })
      .eq("id", verificationRequest.id);

    return success("Document updated successfully.", {
      document: updatedDocument,
    });
  } catch (error) {
    console.error("Update Document Error:", error);
    return failure("Failed to update document.", error.message, 500);
  }
}

// DELETE - Delete a document (requires verification)
export async function DELETE(req, { params }) {
  try {
    const { userId } = await params;
    const { document_id, verification_token } = await req.json();

    const verificationFailure = await requireEmailVerified(userId);
    if (verificationFailure) return verificationFailure;

    if (!document_id) {
      return failure("Document ID is required.", null, 400);
    }



    // Verify document exists and belongs to user
    const { data: document, error: docError } = await supabase
      .from("digital_locker_documents")
      .select("*")
      .eq("id", document_id)
      .eq("user_id", userId)
      .single();

    if (docError || !document) {
      return failure("Document not found.", null, 404);
    }

    // Soft delete - mark as inactive instead of removing
    const { error: deleteError } = await supabase
      .from("digital_locker_documents")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", document_id);

    if (deleteError) throw deleteError;

    // Log the delete action
    await supabase.from("digital_locker_audit_logs").insert({
      document_id,
      user_id: userId,
      action: "deleted",
      action_details: {
        document_name: document.document_name,
      },
    }); return success("Document deleted successfully.", {
      document_id,
      deleted: true,
    });
  } catch (error) {
    console.error("Delete Document Error:", error);
    return failure("Failed to delete document.", error.message, 500);
  }
}
