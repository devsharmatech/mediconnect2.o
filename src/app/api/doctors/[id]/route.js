import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { deleteMultipleFromS3, extractKeyFromUrl } from "@/lib/s3";

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Doctor ID is required" },
        { status: 400 }
      );
    }

    // First, get doctor details to find file paths
    const { data: doctorDetails, error: fetchError } = await supabase
      .from("doctor_details")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    // Collect all S3 keys to delete
    const filesToDelete = [];

    if (doctorDetails) {
      const docFields = [
        "dmc_mci_certificate",
        "aadhaar_pan_license",
        "address_proof",
        "passport_photo"
      ];

      docFields.forEach(field => {
        const val = doctorDetails[field];
        if (val) {
          const urls = Array.isArray(val) ? val : [val];
          urls.forEach(url => {
            const key = extractKeyFromUrl(url);
            if (key) filesToDelete.push(key);
          });
        }
      });
    }

    // Delete files from S3 if any exist
    if (filesToDelete.length > 0) {
      try {
        await deleteMultipleFromS3(filesToDelete);
      } catch (storageError) {
        console.error("Error deleting files from S3:", storageError);
      }
    }

    // Delete doctor details
    const { error: detailsError } = await supabase
      .from("doctor_details")
      .delete()
      .eq("id", id);

    if (detailsError) throw detailsError;

    // Then delete user
    const { error: usersError } = await supabase
      .from("users")
      .delete()
      .eq("id", id)
      .eq("role", "doctor");

    if (usersError) throw usersError;

    return NextResponse.json({
      success: true,
      message: "Doctor and associated files deleted successfully",
      deletedFiles: filesToDelete.length,
    });
  } catch (error) {
    console.error("Error deleting doctor:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const { data: doctor, error } = await supabase
      .from("users")
      .select(
        `
        *,
        doctor_details (*)
      `
      )
      .eq("id", id)
      .eq("role", "doctor")
      .single();

    if (error) throw error;

    if (!doctor) {
      return NextResponse.json(
        { success: false, error: "Doctor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    console.error("Error fetching doctor:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
