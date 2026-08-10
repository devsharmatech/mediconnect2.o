import { getPresignedUploadUrl, getCloudFrontUrl } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

/**
 * POST /api/upload/signed-url
 * 
 * Generates an S3 presigned upload URL for direct browser-to-S3 uploads.
 * This bypasses Vercel's 4.5MB body size limit by uploading files directly from the client.
 *
 * Body: { fileName, contentType, bucket?, folder? }
 * Returns: { signedUrl, token, path, publicUrl }
 */
export async function POST(req) {
    try {
        const body = await req.json();
        const { fileName, contentType, bucket = "chemist-documents", folder = "uploads" } = body;

        if (!fileName || !contentType) {
            return failure("fileName and contentType are required.", null, 400, {
                headers: corsHeaders,
            });
        }

        // Sanitize filename and create unique path
        const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const key = `${bucket}/${folder}/${Date.now()}-${sanitizedName}`;

        const { signedUrl, publicUrl } = await getPresignedUploadUrl(key, contentType);

        return success(
            "Presigned upload URL generated.",
            {
                signedUrl,
                token: null, // S3 doesn't use tokens like Supabase
                path: key,
                publicUrl,
            },
            200,
            { headers: corsHeaders }
        );
    } catch (error) {
        console.error("Presigned URL API Error:", error);
        return failure("Failed to generate presigned URL.", error.message, 500, {
            headers: corsHeaders,
        });
    }
}
