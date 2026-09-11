import { uploadToS3, deleteFromS3, extractKeyFromUrl, getPresignedUploadUrl } from "@/lib/s3";
import { corsHeaders } from "@/lib/cors";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * POST /api/upload/doctor-document
 *
 * Supports both:
 * 1. JSON payload: { fileName, contentType, folder }
 *    Returns an S3 presigned upload URL for direct client-side S3 upload (handles files of any size).
 * 2. Multipart/form-data: { file, folder }
 *    Uploads smaller files via server-side buffer to S3 and returns CloudFront URL.
 */
export async function POST(req) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // ── Mode 1: JSON body (Direct S3 Presigned URL request) ──
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { fileName, contentType: fileType = "application/octet-stream", folder = "uploads" } = body;

      if (!fileName) {
        return NextResponse.json(
          { success: false, message: "fileName is required." },
          { status: 400, headers: corsHeaders }
        );
      }

      const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `doctor-documents/${folder}/${Date.now()}-${sanitizedName}`;
      const { signedUrl, publicUrl } = await getPresignedUploadUrl(key, fileType);

      return NextResponse.json(
        {
          success: true,
          message: "Presigned upload URL generated.",
          data: { signedUrl, path: key, publicUrl },
          signedUrl,
          publicUrl,
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // ── Mode 2: Multipart Form Data upload (for smaller files) ──
    const formData = await req.formData();
    const file = formData.get("file");
    const folder = formData.get("folder") || "uploads";

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, message: "No file provided." },
        { status: 400, headers: corsHeaders }
      );
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `doctor-documents/${folder}/${Date.now()}-${sanitizedName}`;

    // Convert browser File to Buffer for S3 upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { url } = await uploadToS3(buffer, key, file.type || "application/octet-stream");

    return NextResponse.json(
      { success: true, publicUrl: url },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("Upload API Error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to process upload request" },
      { status: 500, headers: corsHeaders }
    );
  }
}
