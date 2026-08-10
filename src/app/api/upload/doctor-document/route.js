import { uploadToS3, deleteFromS3, extractKeyFromUrl, getPresignedUploadUrl } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

/**
 * POST /api/upload/doctor-document
 *
 * Accepts a multipart/form-data upload.
 * Uploads the file to AWS S3 and returns the CloudFront public URL.
 *
 * Form fields: file (File), folder (string)
 * Returns: { success, publicUrl }
 */
export async function POST(req) {
  try {
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

    const { url } = await uploadToS3(buffer, key, file.type);

    return NextResponse.json(
      { success: true, publicUrl: url },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("Upload API Error:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
