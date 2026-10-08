import sql from "@/lib/db";
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

    // 1. Fetch user from AWS RDS
    const userRows = await sql`
      SELECT id, un_id, role, phone_number, profile_picture, is_verified, created_at
      FROM users
      WHERE id = ${id}
      LIMIT 1
    `;
    const user = userRows[0] || null;

    // 2. Fetch patient_details from AWS RDS
    let patientRows = await sql`
      SELECT *
      FROM patient_details
      WHERE id = ${id}
      LIMIT 1
    `;
    let profile = patientRows[0] || null;

    // 3. Auto-provision patient_details if missing for professional accounts (doctor, chemist, lab, admin)
    if (!profile && user) {
      let resolvedName = null;
      let resolvedEmail = null;

      if (user.role === "doctor") {
        const docRows = await sql`SELECT full_name, email FROM doctor_details WHERE id = ${id} LIMIT 1`;
        if (docRows[0]) {
          resolvedName = docRows[0].full_name;
          resolvedEmail = docRows[0].email;
        }
      } else if (user.role === "chemist") {
        const chemRows = await sql`SELECT owner_name, pharmacist_name, pharmacy_name, email FROM chemist_details WHERE id = ${id} LIMIT 1`;
        if (chemRows[0]) {
          resolvedName = chemRows[0].owner_name || chemRows[0].pharmacist_name || chemRows[0].pharmacy_name;
          resolvedEmail = chemRows[0].email;
        }
      } else if (user.role === "lab") {
        const labRows = await sql`SELECT owner_name, lab_name, email FROM lab_details WHERE id = ${id} LIMIT 1`;
        if (labRows[0]) {
          resolvedName = labRows[0].owner_name || labRows[0].lab_name;
          resolvedEmail = labRows[0].email;
        }
      } else if (user.role === "admin") {
        resolvedName = "Administrator";
      }

      if (resolvedName) {
        try {
          const inserted = await sql`
            INSERT INTO patient_details (id, full_name, email, created_at, updated_at)
            VALUES (${id}, ${resolvedName}, ${resolvedEmail || null}, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
            RETURNING *
          `;
          profile = inserted[0] || null;
        } catch (provErr) {
          console.warn("Auto-provision patient_details warning:", provErr.message);
        }
      }
    }

    if (!user && !profile) {
      return failure("Profile not found", null, 404, { headers: corsHeaders });
    }

    const rawPic = user?.profile_picture || profile?.profile_picture || null;
    let cleanPic = null;
    if (rawPic) {
      const sanitized = String(rawPic).replace(/^'+|'+$/g, "").replace(/::text$/i, "").trim();
      if (sanitized && !sanitized.includes("::text") && sanitized.startsWith("http")) {
        cleanPic = sanitized;
      }
    }
    if (!cleanPic) {
      const pName = profile?.full_name || "Patient";
      cleanPic = `https://ui-avatars.com/api/?name=${encodeURIComponent(pName.trim())}&background=0067A1&color=fff&bold=true`;
    }

    const mergedProfile = {
      ...(profile || {}),
      id: id,
      full_name: profile?.full_name || "Patient",
      email: profile?.email || null,
      phone_number: user?.phone_number || profile?.phone_number || "",
      profile_picture: cleanPic,
      un_id: user?.un_id || null,
      is_verified: user?.is_verified ?? null,
      created_at: profile?.created_at || user?.created_at || null,
    };

    const sanitizedUser = user ? { ...user, profile_picture: cleanPic } : null;

    return success(
      "Profile fetched successfully",
      {
        profile: mergedProfile,
        user: sanitizedUser,
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
    if (newProfilePictureUrl) {
      // profile_picture lives in the users table, NOT patient_details
      // It is handled in the users table update below — do not add here
    }

    // Upsert into patient_details in AWS RDS PostgreSQL
    const insertedRows = await sql`
      INSERT INTO patient_details (id, full_name, email, gender, date_of_birth, blood_group, address, emergency_contact, updated_at)
      VALUES (
        ${userId},
        ${updates.full_name || null},
        ${updates.email || null},
        ${updates.gender || null},
        ${updates.date_of_birth || null},
        ${updates.blood_group || null},
        ${updates.address || null},
        ${updates.emergency_contact || null},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        full_name = COALESCE(EXCLUDED.full_name, patient_details.full_name),
        email = COALESCE(EXCLUDED.email, patient_details.email),
        gender = COALESCE(EXCLUDED.gender, patient_details.gender),
        date_of_birth = COALESCE(EXCLUDED.date_of_birth, patient_details.date_of_birth),
        blood_group = COALESCE(EXCLUDED.blood_group, patient_details.blood_group),
        address = COALESCE(EXCLUDED.address, patient_details.address),
        emergency_contact = COALESCE(EXCLUDED.emergency_contact, patient_details.emergency_contact),
        updated_at = NOW()
      RETURNING *
    `;
    const profile = insertedRows[0] || null;

    // Update users table in AWS RDS (profile_picture and phone_number)
    if (newProfilePictureUrl && phoneNumber) {
      const cleanPhone = String(phoneNumber).replace(/\D/g, "").slice(-10);
      await sql`
        UPDATE users 
        SET profile_picture = ${newProfilePictureUrl}, 
            phone_number = CASE WHEN ${cleanPhone} ~ '^[0-9]{10}$' THEN ${cleanPhone} ELSE phone_number END,
            updated_at = NOW()
        WHERE id = ${userId}
      `;
    } else if (newProfilePictureUrl) {
      await sql`
        UPDATE users 
        SET profile_picture = ${newProfilePictureUrl}, updated_at = NOW()
        WHERE id = ${userId}
      `;
    } else if (phoneNumber) {
      const cleanPhone = String(phoneNumber).replace(/\D/g, "").slice(-10);
      if (/^[0-9]{10}$/.test(cleanPhone)) {
        await sql`
          UPDATE users 
          SET phone_number = ${cleanPhone}, updated_at = NOW()
          WHERE id = ${userId}
        `;
      }
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
