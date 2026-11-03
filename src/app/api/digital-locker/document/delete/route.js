import { NextResponse } from "next/server";
import sql from "@/lib/db";
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

    const rows = await sql`
      SELECT *
      FROM digital_locker_documents
      WHERE id = ${document_id} AND user_id = ${user_id}
      LIMIT 1
    `;
    const doc = rows[0];

    if (!doc) {
      return NextResponse.json(
        { success: false, message: "Document not found or access denied" },
        { status: 404 }
      );
    }

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

    await sql`
      DELETE FROM digital_locker_documents
      WHERE id = ${document_id} AND user_id = ${user_id}
    `;

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
