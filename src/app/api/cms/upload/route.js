/**
 * API: CMS Media Upload
 *
 * Supports two modes:
 * 1. Direct Browser-to-S3 Upload via Presigned URL (Recommended):
 *    POST /api/cms/upload with JSON { fileName, contentType }
 *    GET /api/cms/upload?fileName=...&contentType=...
 *    Returns: { success: true, presigned: true, signedUrl, url, key }
 *    Bypasses Nginx client_max_body_size and server limits entirely.
 *
 * 2. Multipart Form Upload (Legacy / Small files):
 *    POST /api/cms/upload with FormData { file }
 *    Returns: { success: true, url }
 */

import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { uploadToS3, getPresignedUploadUrl } from "@/lib/s3";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get("fileName") || "upload.png";
    const contentType = searchParams.get("contentType") || "image/png";

    const ext = path.extname(fileName) || ".png";
    const key = `cms-media/uploads/${uuidv4()}${ext}`;

    const { signedUrl, publicUrl } = await getPresignedUploadUrl(key, contentType, 300);

    return NextResponse.json({
      success: true,
      presigned: true,
      signedUrl,
      url: publicUrl,
      key,
    });
  } catch (error) {
    console.error("CMS presigned GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const contentTypeHeader = req.headers.get("content-type") || "";

    // ── Mode 1: Presigned URL Request (JSON) ──
    if (contentTypeHeader.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      const fileName = body.fileName || "upload.png";
      const contentType = body.contentType || "image/png";

      const ext = path.extname(fileName) || ".png";
      const key = `cms-media/uploads/${uuidv4()}${ext}`;

      const { signedUrl, publicUrl } = await getPresignedUploadUrl(key, contentType, 300);

      return NextResponse.json({
        success: true,
        presigned: true,
        signedUrl,
        url: publicUrl,
        key,
      });
    }

    // ── Mode 2: Direct Multipart Form Upload ──
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Only image files are allowed (JPEG, PNG, WebP, GIF, SVG)." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name) || ".png";
    const key = `cms-media/uploads/${uuidv4()}${ext}`;

    const { url } = await uploadToS3(buffer, key, file.type);

    return NextResponse.json(
      { success: true, url },
      { status: 201 }
    );
  } catch (error) {
    console.error("CMS upload error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
