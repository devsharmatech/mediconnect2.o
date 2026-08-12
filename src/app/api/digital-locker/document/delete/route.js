import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { deleteFromS3, extractKeyFromUrl } from "@/lib/s3";

export async function DELETE(request) {
  try {
    const { document_id, user_id } = await request.json();

    if (!document_id || !user_id) {
      return NextResponse.json(
        { success: false, message: "Document ID and User ID are required" },
        { status: 400 }
      );
    }

    // Fetch document details to get S3 key
    const { data: doc, error: fetchError } = await supabase
      .from("digital_locker_documents")
      .select("*")
      .eq("id", document_id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!doc) {
      return NextResponse.json(
        { success: false, message: "Document not found or access denied" },
        { status: 404 }
      );
    }

    // Try deleting file from S3
    if (doc.document_url) {
      const s3Key = extractKeyFromUrl(doc.document_url);
      if (s3Key) {
        try {
          await deleteFromS3(s3Key);
        } catch (s3Err) {
          console.warn("Notice deleting document from S3:", s3Err?.message);
        }
      }
    }

    // Delete record from digital_locker_documents table
    const { error: deleteError } = await supabase
      .from("digital_locker_documents")
      .delete()
      .eq("id", document_id)
      .eq("user_id", user_id);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
      deleted_id: document_id,
    });

  } catch (error) {
    console.error("Digital locker document delete error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete document" },
      { status: 500 }
    );
  }
}
