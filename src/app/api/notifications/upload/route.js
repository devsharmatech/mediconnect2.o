import { uploadToS3 } from "@/lib/s3";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

const MAX_SIZE_BYTES = 2 * 1024 * 1024;

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return failure("file is required", null, 400);
    }

    if (!file.type || !file.type.startsWith("image/")) {
      return failure("Only image uploads are allowed", null, 400);
    }

    if (file.size > MAX_SIZE_BYTES) {
      return failure("Image must be 2MB or smaller", null, 400);
    }

    const ext = file.name?.split(".").pop() || "jpg";
    const key = `notification-media/notification-${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { url } = await uploadToS3(buffer, key, file.type);

    return success("Image uploaded", { url });
  } catch (err) {
    console.error("[notifications/upload] Error:", err);
    return failure("Failed to upload image", err.message, 500);
  }
}
