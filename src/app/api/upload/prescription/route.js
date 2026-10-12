import { uploadToS3, getPresignedUploadUrl } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const contentTypeHeader = req.headers.get("content-type") || "";

    // Presigned S3 upload mode (JSON payload)
    if (contentTypeHeader.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      const fileName = body.fileName || "prescription.jpg";
      const fileType = body.contentType || "image/jpeg";
      const ext = fileName.split(".").pop().toLowerCase() || "jpg";
      const key = `prescriptions/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

      const { signedUrl, publicUrl } = await getPresignedUploadUrl(key, fileType, 300);
      return success("Presigned upload URL generated", { signedUrl, url: publicUrl, key }, 200, { headers: corsHeaders });
    }

    const formData = await req.formData();
    const file = formData.get("file") || formData.get("prescription");

    if (!file) {
      return failure("File is required", null, 400, { headers: corsHeaders });
    }

    const ext = file.name ? file.name.split(".").pop().toLowerCase() : "jpg";
    const allowed = ["jpg", "jpeg", "png", "webp", "pdf"];
    if (!allowed.includes(ext)) {
      return failure("Only JPG, PNG, WEBP, and PDF files are allowed", null, 400, { headers: corsHeaders });
    }

    const key = `prescriptions/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const contentType = file.type || (ext === "pdf" ? "application/pdf" : "image/jpeg");

    const { url } = await uploadToS3(file, key, contentType);

    return success("Prescription uploaded successfully", { url, key }, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Prescription upload error:", err);
    return failure("Failed to upload prescription", err.message, 500, { headers: corsHeaders });
  }
}
