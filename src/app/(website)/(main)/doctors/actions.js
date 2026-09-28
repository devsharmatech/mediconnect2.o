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
          "id, specialization, clinic_consultation_fee, video_consultation_fee, home_visit_fee, rating, experience_years, full_name, onboarding_status, clinic_name, clinic_address"
        );

      if (specialization && specialization !== "All Specialties" && specialization !== "all") {
        const specLower = specialization.toLowerCase().trim();
        if (
          specLower === "uro/neuro" ||
          specLower === "uro / neuro" ||
          specLower === "urology/neurology" ||
          specLower === "urology / neurology" ||
          (specLower.includes("uro") && specLower.includes("neuro"))
        ) {
          detailsQuery = detailsQuery
            .or("specialization.ilike.%urology%,specialization.ilike.%neurology%,specialization.ilike.%urologist%,specialization.ilike.%neurologist%,specialization.ilike.%neurosurg%")
            .not("specialization", "ilike", "%psychiat%");
        } else if (specLower === "urology" || specLower.includes("urolog")) {
          detailsQuery = detailsQuery
            .or("specialization.ilike.%urology%,specialization.ilike.%urologist%")
            .not("specialization", "ilike", "%neurology%")
            .not("specialization", "ilike", "%psychiat%");
        } else if (specLower === "neurology" || (specLower.includes("neuro") && !specLower.includes("uro"))) {
          detailsQuery = detailsQuery
            .or("specialization.ilike.%neurology%,specialization.ilike.%neurologist%,specialization.ilike.%neurosurg%,specialization.ilike.%pediatric neurology%")
            .not("specialization", "ilike", "%urology%")
            .not("specialization", "ilike", "%psychiat%");
        } else if (specLower.includes("gastro")) {
          detailsQuery = detailsQuery.or("specialization.ilike.%gastro%,specialization.ilike.%stomach%,specialization.ilike.%digestive%");
        } else if (specLower.includes("dentist") || specLower.includes("dental") || specLower.includes("dentistry")) {
          detailsQuery = detailsQuery.or("specialization.ilike.%dentist%,specialization.ilike.%dental%,specialization.ilike.%dentistry%");
        } else if (specLower.includes("physician") || specLower === "gp" || specLower.includes("general")) {
          detailsQuery = detailsQuery.or("specialization.ilike.%physician%,specialization.ilike.%general%,specialization.ilike.%medicine%");
        } else if (specLower.includes("gynecol") || specLower.includes("gynaecol") || specLower.includes("obgyn")) {
          detailsQuery = detailsQuery.or("specialization.ilike.%gynecol%,specialization.ilike.%gynaecol%,specialization.ilike.%obgyn%");
        } else if (specLower.includes("pediatr") || specLower.includes("paediatr")) {
          detailsQuery = detailsQuery.or("specialization.ilike.%pediatr%,specialization.ilike.%paediatr%,specialization.ilike.%child%");
        } else if (specLower.includes("orthoped") || specLower.includes("orthopaed")) {
          detailsQuery = detailsQuery.or("specialization.ilike.%orthoped%,specialization.ilike.%orthopaed%,specialization.ilike.%bone%");
        } else if (
          specLower === "ent" ||
          specLower === "ent doctor" ||
          specLower.includes("otorhinolaryngol") ||
          specLower.includes("otolaryngol") ||
          specLower.includes("ear, nose") ||
          specLower.includes("ear nose")
        ) {
          detailsQuery = detailsQuery
            .or("specialization.ilike.%ENT%,specialization.ilike.%Otorhinolaryngol%,specialization.ilike.%Otolaryngol%")
            .not("specialization", "ilike", "%dent%")
            .not("specialization", "ilike", "%cardio%")
            .not("specialization", "ilike", "%heart%")
            .not("specialization", "ilike", "%derma%")
            .not("specialization", "ilike", "%psychiat%")
            .not("specialization", "ilike", "%gastro%");
        } else if (specLower.includes("cardio") || specLower.includes("heart")) {
          detailsQuery = detailsQuery.or("specialization.ilike.%cardio%,specialization.ilike.%heart%");
        } else if (specLower.includes("derma") || specLower.includes("skin")) {
          detailsQuery = detailsQuery.or("specialization.ilike.%derma%,specialization.ilike.%skin%");
        } else if (specLower.includes("ophthal") || specLower.includes("eye")) {
          detailsQuery = detailsQuery.or("specialization.ilike.%ophthal%,specialization.ilike.%eye%");
        } else if (specLower.includes("psychiat") || specLower.includes("mental")) {
          detailsQuery = detailsQuery
            .or("specialization.ilike.%psychiat%,specialization.ilike.%mental%")
            .not("specialization", "ilike", "%urology%")
            .not("specialization", "ilike", "%neurology%");
        } else {
          detailsQuery = detailsQuery.ilike("specialization", `%${specialization}%`);
        }
      }

      if (search) {
        const cleanSearch = search.trim();
        const searchLower = cleanSearch.toLowerCase();
        if (searchLower === "ent" || searchLower === "ent doctor" || searchLower === "ent specialist") {
          detailsQuery = detailsQuery
            .or("specialization.ilike.%ENT%,specialization.ilike.%Otorhinolaryngol%,specialization.ilike.%Otolaryngol%")
            .not("specialization", "ilike", "%dent%")
            .not("specialization", "ilike", "%cardio%")
            .not("specialization", "ilike", "%heart%")
            .not("specialization", "ilike", "%derma%")
            .not("specialization", "ilike", "%psychiat%");
        } else if (
          searchLower === "uro/neuro" ||
          searchLower === "uro / neuro" ||
          (searchLower.includes("uro") && searchLower.includes("neuro"))
        ) {
          detailsQuery = detailsQuery
            .or("specialization.ilike.%urology%,specialization.ilike.%neurology%,specialization.ilike.%urologist%,specialization.ilike.%neurologist%")
            .not("specialization", "ilike", "%psychiat%");
        } else {
          detailsQuery = detailsQuery.or(
            `full_name.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%,specialization.ilike.%${cleanSearch}%,license_number.ilike.%${cleanSearch}%,clinic_name.ilike.%${cleanSearch}%`
          );
        }
      }

      const { data: matchedDetails, error: detailsError } = await detailsQuery;
      if (detailsError) throw detailsError;

      let filteredDetails = matchedDetails || [];

      // Accurate fee filtering
      if (feeFilter && feeFilter !== "all") {
        filteredDetails = filteredDetails.filter((doc) => {
          const rawFees = [
            doc.clinic_consultation_fee,
            doc.video_consultation_fee,
            doc.home_visit_fee,
          ].map((f) => (typeof f === "number" ? f : f ? Number(f) : NaN)).filter((f) => Number.isFinite(f) && f > 0);

          if (rawFees.length === 0) return false;
          const minFee = Math.min(...rawFees);

          if (feeFilter === "under_500") {
            return minFee < 500;
          } else if (feeFilter === "500_1000") {
            return minFee >= 500 && minFee <= 1000;
          } else if (feeFilter === "above_1000") {
            return minFee > 1000;
          }
          return true;
        });
      }

      const matchedIds = filteredDetails.map((d) => d.id);
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
