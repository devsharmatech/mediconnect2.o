import { supabase } from "@/lib/supabaseAdmin";
import { deleteFromS3, extractKeyFromUrl } from "@/lib/s3";
import { NextResponse } from "next/server";
import sql from "@/lib/db";

export async function POST(req) {
  try {
    const { ids } = await req.json();

    if (!ids?.length) {
      return NextResponse.json({ error: "No patient IDs provided" }, { status: 400 });
    }

    const { data: users, error: fetchError } = await supabase
      .from("users")
      .select("id, profile_picture")
      .in("id", ids);

    if (fetchError) throw fetchError;

    // Delete profile pictures from S3
    const deletePromises = users
      .filter(u => u.profile_picture)
      .map(u => {
        const key = extractKeyFromUrl(u.profile_picture);
        return key ? deleteFromS3(key) : Promise.resolve();
      });

    if (deletePromises.length > 0) {
      await Promise.allSettled(deletePromises);
    }

    try {
      for (const id of ids) {
        await deletePatientAccount(id);
      }
    } catch (dbErr) {
      console.error("Database deletion error:", dbErr);
      throw dbErr;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
