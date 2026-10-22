import { uploadToS3, getPresignedUploadUrl } from "@/lib/s3";
import { corsHeaders } from "@/lib/cors";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * POST /api/upload/settlement-proof
 * Handles bank transfer slips, NEFT/RTGS advice receipts, and payment proof documents (PDF, JPG, PNG).
 */
export async function POST(req) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // 1. Direct Presigned URL mode (JSON)
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { fileName, contentType: fileType = "application/pdf" } = body;
      if (!fileName) {
        return NextResponse.json({ success: false, error: "fileName is required" }, { status: 400 });
      }
      const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `settlement-proofs/${new Date().getFullYear()}/${Date.now()}-${sanitized}`;
      const { signedUrl, publicUrl } = await getPresignedUploadUrl(key, fileType);
      return NextResponse.json({ success: true, signedUrl, url: publicUrl, publicUrl, key }, { status: 200, headers: corsHeaders });
    }

    // 2. Direct Multipart FormData mode
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ success: false, error: "No proof file provided" }, { status: 400 });
    }

    const originalName = file.name || "payment-proof.pdf";
    const sanitized = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `settlement-proofs/${new Date().getFullYear()}/${Date.now()}-${sanitized}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "application/octet-stream";

    const { url } = await uploadToS3(buffer, key, mimeType);

    return NextResponse.json({
      success: true,
      url,
      publicUrl: url,
      fileName: originalName,
    }, { status: 200, headers: corsHeaders });

  } catch (err) {
    console.error("POST /api/upload/settlement-proof error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to upload proof" }, { status: 500 });
  }
}
