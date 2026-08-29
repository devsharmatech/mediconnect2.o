import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";
import { uploadToS3 } from "@/lib/s3";
import { corsHeaders } from "@/lib/cors";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id =
      searchParams.get("id") ||
      searchParams.get("user_id") ||
      searchParams.get("patient_id");

    if (!id) {
      return failure("Patient ID or User ID is required", null, 400, {
        headers: corsHeaders,
      });
    }

    const [{ data: user, error: userError }, { data: profile, error: profileError }] =
      await Promise.all([
        supabase
          .from("users")
          .select("id, un_id, role, phone_number, profile_picture, is_verified, created_at")
          .eq("id", id)
          .maybeSingle(),
        supabase.from("patient_details").select("*").eq("id", id).maybeSingle(),
      ]);

    if (userError) console.warn("Notice fetching user in patient profile:", userError.message);
    if (profileError) console.warn("Notice fetching details in patient profile:", profileError.message);

    if (!user && !profile) {
      return failure("Profile not found", null, 404, { headers: corsHeaders });
    }

    const mergedProfile = {
      ...(profile || {}),
      id: id,
      phone_number: user?.phone_number || profile?.phone_number || "",
      profile_picture: user?.profile_picture || profile?.profile_picture || null,
      un_id: user?.un_id || null,
      is_verified: user?.is_verified ?? null,
      created_at: profile?.created_at || user?.created_at || null,
    };

    return success(
      "Profile fetched successfully",
      {
        profile: mergedProfile,
        user: user || null,
        details: profile || null,
      },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Profile Fetch Error:", error);
    return failure("Internal Server Error", error.message, 500, {
      headers: corsHeaders,
    });
  }
}

async function handleProfileUpdate(req) {
  try {
    let userId = null;
    let fullName = null;
    let email = null;
    let gender = null;
    let dateOfBirth = null;
    let bloodGroup = null;
    let address = null;
    let emergencyContact = null;
    let phoneNumber = null;
    let profilePictureFile = null;

    const contentType = req.headers.get("content-type") || "";

    if (
      contentType.includes("multipart/form-data") ||
      contentType.includes("form-data")
    ) {
      const formData = await req.formData();
      userId =
        formData.get("id") ||
        formData.get("user_id") ||
        formData.get("patient_id");
      fullName = formData.get("full_name") || formData.get("name");
      email = formData.get("email");
      gender = formData.get("gender");
      dateOfBirth = formData.get("date_of_birth") || formData.get("dob");
      bloodGroup = formData.get("blood_group");
      address = formData.get("address");
      emergencyContact = formData.get("emergency_contact");
      phoneNumber = formData.get("phone_number") || formData.get("phone");
      profilePictureFile =
        formData.get("profile_picture") ||
        formData.get("file") ||
        formData.get("avatar");
    } else {
      const body = await req.json().catch(() => ({}));
      userId = body.id || body.user_id || body.patient_id;
      fullName = body.full_name || body.name;
      email = body.email;
      gender = body.gender;
      dateOfBirth = body.date_of_birth || body.dob;
      bloodGroup = body.blood_group;
      address = body.address;
      emergencyContact = body.emergency_contact;
      phoneNumber = body.phone_number || body.phone;
      profilePictureFile = body.profile_picture;
    }

    if (!userId) {
      return failure("Patient ID or User ID is required", null, 400, {
        headers: corsHeaders,
      });
    }

    if (email && typeof email === "string" && email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return failure("Invalid email format.", null, 400, {
          headers: corsHeaders,
        });
      }
    }

    // Handle Profile Picture Upload & Size Limit Validation
    let newProfilePictureUrl = null;
    if (
      profilePictureFile &&
      typeof profilePictureFile !== "string" &&
      profilePictureFile.size !== undefined
    ) {
      const MAX_FILE_SIZE_MB = 15;
      const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

      if (profilePictureFile.size > MAX_FILE_SIZE_BYTES) {
        return failure(
          `File size (${(profilePictureFile.size / (1024 * 1024)).toFixed(2)} MB) exceeds the ${MAX_FILE_SIZE_MB}MB limit. Please upload an image smaller than ${MAX_FILE_SIZE_MB}MB.`,
          null,
          400,
          { headers: corsHeaders }
        );
      }

      const rawFileName = profilePictureFile.name || "profile.jpg";
      const fileExtension = rawFileName.includes(".")
        ? rawFileName.split(".").pop().toLowerCase().trim()
        : "jpg";

      const allowedExtensions = [
        "jpg",
        "jpeg",
        "png",
        "webp",
        "gif",
        "bmp",
        "heic",
        "heif",
      ];

      if (!allowedExtensions.includes(fileExtension)) {
        return failure(
          `Unsupported image format (.${fileExtension}). Allowed formats: JPG, JPEG, PNG, WEBP, GIF, HEIC.`,
          null,
          400,
          { headers: corsHeaders }
        );
      }

      const mimeTypeMap = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        gif: "image/gif",
        bmp: "image/bmp",
        heic: "image/heic",
        heif: "image/heif",
      };

      const finalMimeType =
        profilePictureFile.type || mimeTypeMap[fileExtension] || "image/jpeg";

      try {
        const arrayBuffer = await profilePictureFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileName = `${userId}_${Date.now()}.${fileExtension}`;
        const { url } = await uploadToS3(
          buffer,
          `profile-pictures/patient/${fileName}`,
          finalMimeType
        );
        newProfilePictureUrl = url;
      } catch (uploadError) {
        console.error("Patient profile picture upload error:", uploadError);
        return failure(
          "Failed to upload profile picture.",
          uploadError.message,
          500,
          { headers: corsHeaders }
        );
      }
    } else if (
      typeof profilePictureFile === "string" &&
      profilePictureFile.startsWith("http")
    ) {
      newProfilePictureUrl = profilePictureFile;
    }

    // Prepare updates
    const updates = {
      updated_at: new Date().toISOString(),
    };

    if (fullName !== undefined && fullName !== null)
      updates.full_name = typeof fullName === "string" ? fullName.trim() : fullName;
    if (email !== undefined && email !== null)
      updates.email = typeof email === "string" ? email.trim() : email;
    if (gender !== undefined && gender !== null) updates.gender = gender;
    if (dateOfBirth !== undefined && dateOfBirth !== null)
      updates.date_of_birth = dateOfBirth;
    if (bloodGroup !== undefined && bloodGroup !== null)
      updates.blood_group = bloodGroup;
    if (address !== undefined && address !== null)
      updates.address = typeof address === "string" ? address.trim() : address;
    if (emergencyContact !== undefined && emergencyContact !== null)
      updates.emergency_contact = emergencyContact;
    if (newProfilePictureUrl)
      updates.profile_picture = newProfilePictureUrl;

    // Upsert into patient_details
    const { data: profile, error: updateError } = await supabase
      .from("patient_details")
      .upsert({
        id: userId,
        ...updates,
      })
      .select()
      .maybeSingle();

    if (updateError) throw updateError;

    // Update users table (profile_picture and phone_number)
    const userUpdates = {};
    if (newProfilePictureUrl) userUpdates.profile_picture = newProfilePictureUrl;
    if (phoneNumber && typeof phoneNumber === "string") {
      const cleanPhone = phoneNumber.replace(/\D/g, "").slice(-10);
      if (/^[0-9]{10}$/.test(cleanPhone)) userUpdates.phone_number = cleanPhone;
    }

    if (Object.keys(userUpdates).length > 0) {
      await supabase.from("users").update(userUpdates).eq("id", userId);
    }

    return success(
      "Profile updated successfully",
      {
        profile: {
          ...(profile || {}),
          profile_picture: newProfilePictureUrl || profile?.profile_picture,
        },
        profile_picture: newProfilePictureUrl || profile?.profile_picture,
        full_name: updates.full_name || profile?.full_name,
        email: updates.email || profile?.email,
      },
      200,
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Profile Update Error:", error);
    return failure("Internal Server Error", error.message, 500, {
      headers: corsHeaders,
    });
  }
}

export async function PUT(req) {
  return handleProfileUpdate(req);
}

export async function POST(req) {
  return handleProfileUpdate(req);
}
