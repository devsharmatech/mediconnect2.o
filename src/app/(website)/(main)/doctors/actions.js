"use server";

import { supabase } from "@/lib/supabaseAdmin";

export async function getDoctorsAction({
  page = 1,
  limit = 12,
  search = "",
  specialization = "",
  feeFilter = "all",
  sortBy = "recommended",
}) {
  try {
    const offset = (page - 1) * limit;

    let userQuery = supabase
      .from("users")
      .select("*", { count: "exact" })
      .eq("role", "doctor")
      .eq("status", 1);

    const hasDetailsFilter =
      (specialization && specialization !== "All Specialties" && specialization !== "all") ||
      Boolean(search) ||
      (feeFilter && feeFilter !== "all");

    if (hasDetailsFilter) {
      let detailsQuery = supabase
        .from("doctor_details")
        .select(
          "id, specialization, clinic_consultation_fee, video_consultation_fee, home_visit_fee, rating, experience_years, full_name, onboarding_status"
        )
        .eq("onboarding_status", "approved");

      if (specialization && specialization !== "All Specialties" && specialization !== "all") {
        const specLower = specialization.toLowerCase();
        if (specLower === "urology") {
          detailsQuery = detailsQuery.ilike("specialization", "%urology%").not("specialization", "ilike", "%neurology%");
        } else if (specLower.includes("dentist") || specLower.includes("dental") || specLower.includes("dentistry")) {
          detailsQuery = detailsQuery.or("specialization.ilike.%dentist%,specialization.ilike.%dental%,specialization.ilike.%dentistry%");
        } else if (specLower.includes("physician") || specLower.includes("gp") || specLower.includes("general")) {
          detailsQuery = detailsQuery.or("specialization.ilike.%physician%,specialization.ilike.%general%,specialization.ilike.%medicine%");
        } else if (specLower.includes("gynecol") || specLower.includes("obgyn")) {
          detailsQuery = detailsQuery.or("specialization.ilike.%gynecol%,specialization.ilike.%gynaecol%,specialization.ilike.%obgyn%");
        } else if (specLower.includes("pediatr") || specLower.includes("paediatr")) {
          detailsQuery = detailsQuery.or("specialization.ilike.%pediatr%,specialization.ilike.%paediatr%,specialization.ilike.%child%");
        } else if (specLower.includes("orthoped") || specLower.includes("orthopaed")) {
          detailsQuery = detailsQuery.or("specialization.ilike.%orthoped%,specialization.ilike.%orthopaed%,specialization.ilike.%bone%");
        } else if (specLower.includes("ent") || specLower.includes("throat") || specLower.includes("ear")) {
          detailsQuery = detailsQuery.or("specialization.ilike.%ent%,specialization.ilike.%throat%,specialization.ilike.%ear%");
        } else if (specLower.includes("cardio") || specLower.includes("heart")) {
          detailsQuery = detailsQuery.or("specialization.ilike.%cardio%,specialization.ilike.%heart%");
        } else {
          detailsQuery = detailsQuery.ilike("specialization", `%${specialization}%`);
        }
      }

      if (search) {
        detailsQuery = detailsQuery.or(
          `full_name.ilike.%${search}%,email.ilike.%${search}%,specialization.ilike.%${search}%,license_number.ilike.%${search}%,clinic_name.ilike.%${search}%,clinic_address.ilike.%${search}%`
        );
      }

      if (feeFilter && feeFilter !== "all") {
        if (feeFilter === "under_500") {
          detailsQuery = detailsQuery.or("clinic_consultation_fee.lt.500,video_consultation_fee.lt.500");
        } else if (feeFilter === "500_1000") {
          detailsQuery = detailsQuery.or(
            "and(clinic_consultation_fee.gte.500,clinic_consultation_fee.lte.1000),and(video_consultation_fee.gte.500,video_consultation_fee.lte.1000)"
          );
        } else if (feeFilter === "above_1000") {
          detailsQuery = detailsQuery.or("clinic_consultation_fee.gt.1000,video_consultation_fee.gt.1000");
        }
      }

      const { data: matchedDetails, error: detailsError } = await detailsQuery;
      if (detailsError) throw detailsError;

      const matchedIds = matchedDetails?.map((d) => d.id) || [];
      userQuery = userQuery.in("id", matchedIds.length > 0 ? matchedIds : ["00000000-0000-0000-0000-000000000000"]);
    }

    const { data: users, error: usersError, count } = await userQuery
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (usersError) throw usersError;
    if (!users || users.length === 0) {
      return { success: true, data: [], pagination: { hasNextPage: false } };
    }

    const userIds = users.map((user) => user.id);
    const { data: doctorDetails, error: detailsResErr } = await supabase
      .from("doctor_details")
      .select("*")
      .in("id", userIds);

    if (detailsResErr) throw detailsResErr;

    const doctors = users.map((user) => {
      const details = doctorDetails?.find((detail) => detail.id === user.id) || {};
      return {
        ...user,
        doctor_details: details,
      };
    });

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;

    return {
      success: true,
      data: doctors,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        hasNextPage,
      },
    };
  } catch (error) {
    console.error("Error in getDoctorsAction:", error);
    return { success: false, error: error.message, data: [] };
  }
}
