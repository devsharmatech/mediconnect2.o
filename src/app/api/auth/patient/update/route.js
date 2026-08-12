import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { uploadToS3 } from "@/lib/s3";

export async function PUT(request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let userId, full_name, email, gender, blood_group, date_of_birth, address, phone_number;
    let profilePictureUrl = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      userId = formData.get("user_id");
      full_name = formData.get("full_name");
      email = formData.get("email");
      gender = formData.get("gender");
      blood_group = formData.get("blood_group");
      date_of_birth = formData.get("date_of_birth");
      address = formData.get("address");
      phone_number = formData.get("phone_number");

      const file = formData.get("profile_picture");
      if (file && typeof file === "object" && file.name) {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const ext = file.name.split(".").pop() || "jpg";
        const key = `patient-profiles/${userId || "user"}_${Date.now()}.${ext}`;
        const uploadResult = await uploadToS3(fileBuffer, key, file.type || "image/jpeg");
        profilePictureUrl = uploadResult.url;
      }
    } else {
      const body = await request.json();
      userId = body.user_id;
      full_name = body.full_name;
      email = body.email;
      gender = body.gender;
      blood_group = body.blood_group;
      date_of_birth = body.date_of_birth;
      address = body.address;
      phone_number = body.phone_number;
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    // 1. Update patient_details
    const detailsUpdate = {
      full_name: full_name || null,
      email: email || null,
      gender: gender || null,
      blood_group: blood_group || null,
      date_of_birth: date_of_birth || null,
      address: address || null,
      updated_at: new Date(),
    };

    const { error: detailsError } = await supabase
      .from("patient_details")
      .upsert({
        id: userId,
        ...detailsUpdate,
      });

    if (detailsError) {
      console.error("Error updating patient_details:", detailsError);
      throw detailsError;
    }

    // 2. Update users table (if profile picture or phone updated)
    const userUpdate = { updated_at: new Date() };
    if (phone_number) userUpdate.phone_number = phone_number.replace(/\D/g, "").slice(-10);
    if (profilePictureUrl) userUpdate.profile_picture = profilePictureUrl;

    try {
      await supabase
        .from("users")
        .update(userUpdate)
        .eq("id", userId);
    } catch (uErr) {
      console.warn("Notice updating users table:", uErr?.message);
    }

    return NextResponse.json({
      success: true,
      message: "Patient profile updated successfully",
      data: {
        user_id: userId,
        full_name,
        email,
        gender,
        blood_group,
        date_of_birth,
        address,
        phone_number,
        profile_picture: profilePictureUrl,
      },
    });

  } catch (error) {
    console.error("Patient profile update route error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update profile details" },
      { status: 500 }
    );
  }
}
