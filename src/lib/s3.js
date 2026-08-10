import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ─── S3 Client Singleton ─────────────────────────────────────────────────────
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET_NAME || "mediconnect-prod-storage";
const CLOUDFRONT_URL = process.env.NEXT_PUBLIC_CLOUDFRONT_URL || "https://d11fi0esezlwk0.cloudfront.net";

// ─── Upload to S3 ────────────────────────────────────────────────────────────
/**
 * Upload a file buffer to S3 and return the CloudFront public URL.
 *
 * @param {Buffer|ArrayBuffer|Uint8Array} body - File contents
 * @param {string} key - S3 object key (e.g. "profile-pictures/abc123.jpg")
 * @param {string} contentType - MIME type (e.g. "image/jpeg")
 * @param {object} [options] - Additional options
 * @param {boolean} [options.upsert=false] - Not used for S3 but kept for API compat
 * @returns {Promise<{url: string, key: string}>}
 */
export async function uploadToS3(body, key, contentType, options = {}) {
  let buffer;
  if (body instanceof Buffer) {
    buffer = body;
  } else if (body && typeof body.arrayBuffer === "function") {
    const arrayBuf = await body.arrayBuffer();
    buffer = Buffer.from(arrayBuf);
  } else {
    buffer = Buffer.from(body);
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  return {
    url: `${CLOUDFRONT_URL}/${key}`,
    key,
  };
}

// ─── Delete from S3 ──────────────────────────────────────────────────────────
/**
 * Delete a single object from S3.
 *
 * @param {string} key - S3 object key to delete
 * @returns {Promise<void>}
 */
export async function deleteFromS3(key) {
  if (!key) return;

  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  try {
    await s3Client.send(command);
  } catch (err) {
    console.warn(`[S3] Failed to delete ${key}:`, err.message);
  }
}

// ─── Delete multiple from S3 ─────────────────────────────────────────────────
/**
 * Delete multiple objects from S3.
 *
 * @param {string[]} keys - Array of S3 object keys to delete
 * @returns {Promise<void>}
 */
export async function deleteMultipleFromS3(keys) {
  if (!keys || keys.length === 0) return;
  await Promise.allSettled(keys.map((key) => deleteFromS3(key)));
}

// ─── Generate Presigned Upload URL ───────────────────────────────────────────
/**
 * Generate a presigned URL for direct browser-to-S3 upload.
 *
 * @param {string} key - S3 object key
 * @param {string} contentType - MIME type
 * @param {number} [expiresIn=120] - URL expiry in seconds
 * @returns {Promise<{signedUrl: string, key: string, publicUrl: string}>}
 */
export async function getPresignedUploadUrl(key, contentType, expiresIn = 120) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

  return {
    signedUrl,
    key,
    publicUrl: `${CLOUDFRONT_URL}/${key}`,
  };
}

// ─── Generate Presigned Download URL ─────────────────────────────────────────
/**
 * Generate a presigned URL for temporary download access (for private files).
 *
 * @param {string} key - S3 object key
 * @param {number} [expiresIn=3600] - URL expiry in seconds (default 1 hour)
 * @returns {Promise<string>} Presigned download URL
 */
export async function getPresignedDownloadUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

// ─── Get CloudFront URL ──────────────────────────────────────────────────────
/**
 * Build a CloudFront URL from an S3 key.
 *
 * @param {string} key - S3 object key
 * @returns {string}
 */
export function getCloudFrontUrl(key) {
  if (!key) return null;
  return `${CLOUDFRONT_URL}/${key}`;
}

// ─── Extract S3 Key from URL ─────────────────────────────────────────────────
/**
 * Extract the S3 object key from a CloudFront or Supabase storage URL.
 * This is useful when deleting old files after an update.
 *
 * @param {string} url - Full URL (CloudFront or Supabase)
 * @returns {string|null} The S3 key, or null
 */
export function extractKeyFromUrl(url) {
  if (!url || typeof url !== "string") return null;

  // CloudFront URL
  if (url.includes(CLOUDFRONT_URL)) {
    return url.replace(`${CLOUDFRONT_URL}/`, "");
  }

  // Supabase storage URL pattern:
  // https://xxx.supabase.co/storage/v1/object/public/{bucket}/{path}
  const supabaseMatch = url.match(/\/storage\/v1\/object\/public\/([^?]+)/);
  if (supabaseMatch) {
    // Convert supabase bucket/path to our S3 key structure
    return supabaseMatch[1];
  }

  return null;
}

export { s3Client, BUCKET, CLOUDFRONT_URL };
