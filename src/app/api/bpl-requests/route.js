import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { uploadToS3, extractKeyFromUrl } from "@/lib/s3";

// Validation schemas
const validations = {
  // Required fields
  user_id: (value) => {
    if (!value) return "User ID is required";
    if (typeof value !== "string") return "User ID must be a string";
    if (value.length < 1 || value.length > 255)
      return "User ID must be between 1 and 255 characters";
    return null;
  },

  agree_to_share: (value) => {
    if (value !== "true") return "You must agree to share information";
    return null;
  },

  name: (value) => {
    if (!value) return "Name is required";
    if (typeof value !== "string") return "Name must be a string";
    if (value.length < 2 || value.length > 100)
      return "Name must be between 2 and 100 characters";
    if (!/^[a-zA-Z\s\.\-]+$/.test(value))
      return "Name can only contain letters, spaces, dots, and hyphens";
    return null;
  },

  dob: (value) => {
    if (!value) return "Date of birth is required";
    const dob = new Date(value);
    const today = new Date();
    const minDate = new Date();
    minDate.setFullYear(today.getFullYear() - 120);

    if (isNaN(dob.getTime())) return "Invalid date format";
    if (dob > today) return "Date of birth cannot be in the future";
    if (dob < minDate) return "Date of birth seems unrealistic";
    return null;
  },

  gender: (value) => {
    const validGenders = ["male", "female", "other"];
    if (!value) return "Gender is required";
    if (!validGenders.includes(value.toLowerCase()))
      return `Gender must be one of: ${validGenders.join(", ")}`;
    return null;
  },

  mobile: (value) => {
    if (!value) return "Mobile number is required";
    if (typeof value !== "string") return "Mobile number must be a string";
    if (!/^[6-9]\d{9}$/.test(value.replace(/\D/g, "")))
      return "Invalid Indian mobile number format";
    return null;
  },

  aadhaar_no: (value) => {
    if (!value) return "Aadhaar number is required";
    if (typeof value !== "string") return "Aadhaar number must be a string";
    const cleaned = value.replace(/\s/g, "");
    if (!/^\d{12}$/.test(cleaned))
      return "Aadhaar number must be exactly 12 digits";
    return null;
  },

  ration_card_no: (value) => {
    if (!value) return "Ration card number is required";
    if (typeof value !== "string") return "Ration card number must be a string";
    if (value.length < 5 || value.length > 50)
      return "Ration card number must be between 5 and 50 characters";
    return null;
  },

  address_line_1: (value) => {
    if (!value) return "Address line 1 is required";
    if (typeof value !== "string") return "Address must be a string";
    if (value.length < 5 || value.length > 200)
      return "Address line 1 must be between 5 and 200 characters";
    return null;
  },

  city: (value) => {
    if (!value) return "City is required";
    if (typeof value !== "string") return "City must be a string";
    if (value.length < 2 || value.length > 50)
      return "City must be between 2 and 50 characters";
    if (!/^[a-zA-Z\s\-]+$/.test(value))
      return "City can only contain letters, spaces, and hyphens";
    return null;
  },

  state: (value) => {
    if (!value) return "State is required";
    if (typeof value !== "string") return "State must be a string";
    if (value.length < 2 || value.length > 50)
      return "State must be between 2 and 50 characters";
    if (!/^[a-zA-Z\s\-]+$/.test(value))
      return "State can only contain letters, spaces, and hyphens";
    return null;
  },

  pincode: (value) => {
    if (!value) return "Pincode is required";
    if (typeof value !== "string") return "Pincode must be a string";
    if (!/^\d{6}$/.test(value)) return "Pincode must be exactly 6 digits";
    return null;
  },

  // Optional fields with data validation
  address_line_2: (value) => {
    if (value) {
      if (typeof value !== "string") return "Address line 2 must be a string";
      if (value.length > 200)
        return "Address line 2 must be less than 200 characters";
    }
    return null;
  },

  household_size: (value) => {
    if (value) {
      const size = parseInt(value);
      if (isNaN(size)) return "Household size must be a number";
      if (size < 1 || size > 20)
        return "Household size must be between 1 and 20";
    }
    return null;
  },

  head_of_household: (value) => {
    if (value) {
      if (typeof value !== "string")
        return "Head of household must be a string";
      if (value.length < 2 || value.length > 100)
        return "Head of household must be between 2 and 100 characters";
    }
    return null;
  },

  monthly_income: (value) => {
    if (value) {
      const income = parseFloat(value);
      if (isNaN(income)) return "Monthly income must be a number";
      if (income < 0) return "Monthly income cannot be negative";
      if (income > 1000000) return "Monthly income seems unrealistic";
    }
    return null;
  },

  employment_status: (value) => {
    if (value) {
      const validStatuses = [
        "employed",
        "unemployed",
        "self-employed",
        "student",
        "retired",
      ];
      if (!validStatuses.includes(value))
        return `Employment status must be one of: ${validStatuses.join(", ")}`;
    }
    return null;
  },

  government_benefits: (value) => {
    if (value) {
      if (typeof value !== "string")
        return "Government benefits must be a string";
      if (value.length > 500) return "Government benefits description too long";
    }
    return null;
  },

  disability: (value) => {
    if (value && value !== "true" && value !== "false") {
      return "Disability must be true or false";
    }
    return null;
  },
};

// File validation
const validateFile = (file, maxSizeMB = 5) => {
  if (!file || typeof file === "string") return null;

  if (!(file instanceof File)) {
    return "Invalid file format";
  }

  // Check file size (5MB default)
  if (file.size > maxSizeMB * 1024 * 1024) {
    return `File size must be less than ${maxSizeMB}MB`;
  }

  // Check file type
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];

  if (!allowedTypes.includes(file.type)) {
    return "File must be JPEG, PNG, WebP, or PDF";
  }

  return null;
};

export async function POST(request) {
  try {
    const formData = await request.formData();
    const user_id = formData.get("user_id");

    // Check if user already has a pending or approved request
    const { data: existingRequests, error: checkError } = await supabase
      .from("bpl_requests")
      .select("id, status")
      .eq("user_id", user_id)
      .in("status", ["pending", "approved", "under_review"]);

    if (checkError) {
      console.error("Error checking existing requests:", checkError);
      return NextResponse.json(
        {
          success: false,
          error: "Error checking existing applications",
        },
        { status: 500 }
      );
    }

    // Prevent duplicate submissions
    if (existingRequests && existingRequests.length > 0) {
      const pendingRequest = existingRequests.find(
        (req) => req.status === "pending"
      );
      const approvedRequest = existingRequests.find(
        (req) => req.status === "approved"
      );
      const underReviewRequest = existingRequests.find(
        (req) => req.status === "under_review"
      );

      if (pendingRequest) {
        return NextResponse.json(
          {
            success: false,
            error:
              "You already have a pending BPL application. Please wait for it to be processed.",
          },
          { status: 409 }
        );
      }

      if (underReviewRequest) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Your BPL application is currently under review. You cannot submit another request.",
          },
          { status: 409 }
        );
      }

      if (approvedRequest) {
        return NextResponse.json(
          {
            success: false,
            error:
              "You already have an approved BPL application. You cannot submit another request.",
          },
          { status: 409 }
        );
      }
    }

    // Extract all fields
    const fields = {
      user_id,
      agree_to_share: formData.get("agree_to_share"),
      name: formData.get("name"),
      dob: formData.get("dob"),
      gender: formData.get("gender"),
      mobile: formData.get("mobile"),
      aadhaar_no: formData.get("aadhaar_no"),
      ration_card_no: formData.get("ration_card_no"),
      address_line_1: formData.get("address_line_1"),
      address_line_2: formData.get("address_line_2"),
      city: formData.get("city"),
      state: formData.get("state"),
      pincode: formData.get("pincode"),
      household_size: formData.get("household_size"),
      head_of_household: formData.get("head_of_household"),
      monthly_income: formData.get("monthly_income"),
      employment_status: formData.get("employment_status"),
      government_benefits: formData.get("government_benefits"),
      disability: formData.get("disability"),
    };

    // Validate all fields
    const errors = {};

    for (const [field, value] of Object.entries(fields)) {
      const validationError = validations[field]?.(value);
      if (validationError) {
        errors[field] = validationError;
      }
    }

    // Validate files
    const aadhaar_file = formData.get("aadhaar_card");
    const ration_file = formData.get("ration_card");
    const income_file = formData.get("income_certificate");

    const aadhaarFileError = validateFile(aadhaar_file);
    const rationFileError = validateFile(ration_file);
    const incomeFileError = validateFile(income_file);

    if (aadhaarFileError) errors.aadhaar_card = aadhaarFileError;
    if (rationFileError) errors.ration_card = rationFileError;
    if (incomeFileError) errors.income_certificate = incomeFileError;

    // Check if there are any validation errors
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: errors,
        },
        { status: 400 }
      );
    }

    // File upload helper
    const upload = async (file, folder) => {
      if (!file || typeof file === "string") return null;

      const ext = file.name.split(".").pop();
      const fileName = `${fields.user_id}-${Date.now()}.${ext}`;
      const key = `bpl-documents/${folder}/${fileName}`;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const { url } = await uploadToS3(buffer, key, file.type || "application/octet-stream");
        return url;
      } catch (err) {
        console.error(`File upload error for ${folder}:`, err);
        return null;
      }
    };

    // Upload files
    const aadhaar_card_url = await upload(aadhaar_file, "aadhaar");
    const ration_card_url = await upload(ration_file, "ration");
    const income_certificate_url = await upload(
      income_file,
      "income-certificates"
    );

    // Prepare data for insertion
    const insertData = {
      user_id: fields.user_id,
      agree_to_share: true,
      name: fields.name,
      dob: fields.dob,
      gender: fields.gender,
      mobile: fields.mobile,
      aadhaar_no: fields.aadhaar_no,
      ration_card_no: fields.ration_card_no,
      address_line_1: fields.address_line_1,
      address_line_2: fields.address_line_2 || null,
      city: fields.city,
      state: fields.state,
      pincode: fields.pincode,
      household_size: fields.household_size
        ? parseInt(fields.household_size)
        : null,
      head_of_household: fields.head_of_household || null,
      monthly_income: fields.monthly_income
        ? parseFloat(fields.monthly_income)
        : null,
      employment_status: fields.employment_status || null,
      government_benefits: fields.government_benefits || null,
      disability: fields.disability === "true",
      aadhaar_card_url,
      ration_card_url,
      income_certificate_url,
      status: "pending"
    };

    // Insert into database
    const { data, error } = await supabase
      .from("bpl_requests")
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      message: "BPL application submitted successfully",
    });
  } catch (error) {
    console.error("BPL application error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: "user_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("bpl_requests")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
