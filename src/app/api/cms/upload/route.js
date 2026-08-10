/**
 * API: CMS Media Upload
 *
 * POST /api/cms/upload
 * FormData: { file: File }
 *
 * Uploads to AWS S3 bucket and serves via CloudFront CDN.
 *
 * Returns: { success: true, url: "https://d11fi0esezlwk0.cloudfront.net/cms-media/..." }
 */

import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { uploadToS3 } from "@/lib/s3";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded." },
        { status: 400 }
      );
    }

    // Validate file type
    const ALLOWED_TYPES = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
    ];

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Only image files are allowed (JPEG, PNG, WebP, GIF, SVG)." },
        { status: 400 }
      );
    }

    const MAX_SIZE = 5 * 1024 * 1024;

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
