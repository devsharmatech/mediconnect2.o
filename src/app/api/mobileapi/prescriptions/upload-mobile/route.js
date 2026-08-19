import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { uploadToS3 } from "@/lib/s3";
import { supabase } from "@/lib/supabaseAdmin";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("document");
    const patient_id = formData.get("patient_id");

    if (!file || !patient_id) {
      return NextResponse.json(
        { success: false, message: "Missing required fields (document, patient_id)." },
        { status: 400, headers: corsHeaders }
      );
    }

    // Authorization: Bearer <uuid> BOLA/IDOR protection
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Missing token" },
        { status: 401, headers: corsHeaders }
      );
    }
    const token = authHeader.split(" ")[1];
    if (token !== patient_id) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Access denied to this patient record" },
        { status: 403, headers: corsHeaders }
      );
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, message: "File size exceeds the 10MB limit." },
        { status: 413, headers: corsHeaders }
      );
    }

    // Validate file type
    const ALLOWED_TYPES = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf"
    ];

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "Invalid file format. Please upload an image or PDF." },
        { status: 400, headers: corsHeaders }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name) || (file.type === 'application/pdf' ? '.pdf' : '.jpg');
    const key = `patient-records/${patient_id}/manual-rx-${uuidv4()}${ext}`;

    // Upload to S3
    const { url } = await uploadToS3(buffer, key, file.type);

    // Create prescription record
    const { data: prescription, error } = await supabase
      .from("prescriptions")
      .insert([
        {
          patient_id,
          status: "completed",
          diagnosis: { text: "Manual Upload", fileUrl: url },
          medicines: [], // empty for manual uploads until verified
          appointment_type: "clinic_visit"
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Database insert error:", error);
      return NextResponse.json(
        { success: false, message: "Failed to save prescription to database." },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, data: prescription, url },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Prescription upload error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
