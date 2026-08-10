import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { uploadToS3 } from "@/lib/s3";
import { supabase } from "@/lib/supabaseAdmin";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("document");
    const chemist_id = formData.get("chemist_id");
    const doc_type = formData.get("doc_type");

    if (!file || !chemist_id || !doc_type) {
      return NextResponse.json(
        { success: false, message: "Missing required fields." },
        { status: 400 }
      );
    }

    // Validate file type
    const ALLOWED_TYPES = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "Invalid file format." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name) || (file.type === 'application/pdf' ? '.pdf' : '.png');
    const key = `chemist-documents/${chemist_id}/${doc_type}-${uuidv4()}${ext}`;

    // Upload to S3
    const { url } = await uploadToS3(buffer, key, file.type);

    // Update chemist_details in database
    const { error } = await supabase
      .from("chemist_details")
      .update({ [doc_type]: url, updated_at: new Date() })
      .eq("id", chemist_id);

    if (error) {
      console.error("Database update error:", error);
      return NextResponse.json(
        { success: false, message: "Failed to update database." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, url },
      { status: 201 }
    );
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
