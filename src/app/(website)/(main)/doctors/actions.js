"use server";

import sql from "@/lib/db";

/**
 * Calculate distance in km between two lat/lng points using the Haversine formula.
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);
  if (!Number.isFinite(nLat1) || !Number.isFinite(nLon1) || !Number.isFinite(nLat2) || !Number.isFinite(nLon2)) return null;
  if (Math.abs(nLat1) > 90 || Math.abs(nLat2) > 90 || Math.abs(nLon1) > 180 || Math.abs(nLon2) > 180) return null;

  const R = 6371; // Earth's radius in kilometers
  const dLat = ((nLat2 - nLat1) * Math.PI) / 180;
  const dLon = ((nLon2 - nLon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nLat1 * Math.PI) / 180) *
    Math.cos((nLat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;
  return Math.round(dist * 10) / 10;
}

/**
 * Check if a fee value represents a served consultation mode.
 * - Only Fee > 0 is served.
 * - 0, null, undefined, empty string, or NaN means NOT served / not available.
 */
function isFeeServed(val) {
  if (val === null || val === undefined) return false;
  const str = String(val).trim();
  if (str === "") return false;
  const num = Number(str);
  return !Number.isNaN(num) && num >= 0;
}

export async function getDoctorsAction({
  page = 1,
  limit = 12,
  search = "",
  specialization = "",
  appointmentMode = "all", // "all" | "clinic" | "video" | "home"
  feeFilter = "all", // "all" | "under_500" | "500_1000" | "above_1000"
  experienceFilter = "all", // "all" | "5" | "10" | "15"
  addressSearch = "",
  userLat = null,
  userLng = null,
  sortBy = "recommended",
}) {
  try {
    const offset = (page - 1) * limit;

    // Retrieve active, approved, and verified doctors from AWS RDS PostgreSQL
    const activeDoctorRows = await sql`
      SELECT 
        u.id, u.phone_number, u.role, u.status, u.profile_picture, u.created_at,
        d.full_name, d.email, d.specialization, d.clinic_consultation_fee, d.video_consultation_fee, 
        d.home_visit_fee, d.consultation_fee, d.rating, d.total_reviews, d.experience_years, 
        d.onboarding_status, d.clinic_name, d.clinic_address, d.latitude, d.longitude, d.passport_photo,
        d.meta, d.is_open, d.slot_interval_minutes,
        dos.allowed_to_consult, dos.registration_verified
      FROM users u
      JOIN doctor_details d ON d.id = u.id
      LEFT JOIN doctor_onboarding_status dos ON dos.doctor_id = u.id
      WHERE u.role = 'doctor'
        AND u.status = 1
        AND (d.onboarding_status = 'approved' OR d.onboarding_status IS NULL)
        AND (dos.allowed_to_consult = true OR d.onboarding_status = 'approved')
        AND (dos.registration_verified = true OR d.registration_verified = true)
    `;

    if (!activeDoctorRows || activeDoctorRows.length === 0) {
      return {
        success: true,
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          hasNextPage: false,
        },
      };
    }

    let filteredDetails = activeDoctorRows.map((row) => ({
      ...row,
      // Ensure clean passport photo URL if stringified
      passport_photo: Array.isArray(row.passport_photo)
        ? row.passport_photo
        : (row.passport_photo ? [row.passport_photo] : (row.profile_picture ? [row.profile_picture] : []))
    }));

    // Specialization filter
    if (specialization && specialization !== "All Specialties" && specialization !== "all") {
      const specLower = specialization.toLowerCase().trim();
      filteredDetails = filteredDetails.filter((doc) => {
        const docSpec = (doc.specialization || "").toLowerCase();
        let superSpecs = [];
        try {
          const metaObj = typeof doc.meta === 'string' ? JSON.parse(doc.meta) : (doc.meta || {});
          if (Array.isArray(metaObj.super_speciality)) {
            superSpecs = metaObj.super_speciality.map(s => String(s).toLowerCase());
          } else if (metaObj.super_speciality) {
            superSpecs = [String(metaObj.super_speciality).toLowerCase()];
          }
        } catch {
          superSpecs = [];
        }

        const matchesSuper = superSpecs.some(ss => ss.includes(specLower) || specLower.includes(ss));
        if (matchesSuper) return true;

        if (
          specLower === "uro/neuro" ||
          specLower === "uro / neuro" ||
          specLower === "urology/neurology" ||
          specLower === "urology / neurology" ||
          (specLower.includes("uro") && specLower.includes("neuro"))
        ) {
          return (docSpec.includes("urology") || docSpec.includes("neurology") || docSpec.includes("urologist") || docSpec.includes("neurologist") || docSpec.includes("neurosurg")) && !docSpec.includes("psychiat");
        } else if (specLower === "urology" || specLower.includes("urolog")) {
          return (docSpec.includes("urology") || docSpec.includes("urologist")) && !docSpec.includes("neurology") && !docSpec.includes("psychiat");
        } else if (specLower === "neurology" || (specLower.includes("neuro") && !specLower.includes("uro"))) {
          return (docSpec.includes("neurology") || docSpec.includes("neurologist") || docSpec.includes("neurosurg")) && !docSpec.includes("urology") && !docSpec.includes("psychiat");
        } else if (specLower.includes("gastro")) {
          return docSpec.includes("gastro") || docSpec.includes("stomach") || docSpec.includes("digestive");
        } else if (specLower.includes("dentist") || specLower.includes("dental") || specLower.includes("dentistry")) {
          return docSpec.includes("dentist") || docSpec.includes("dental") || docSpec.includes("dentistry");
        } else if (specLower === "general physician" || specLower === "gp" || specLower.includes("physician")) {
          return (
            docSpec.includes("general physician") ||
            docSpec.includes("physician") ||
            docSpec === "gp"
          ) && !docSpec.includes("surgery");
        } else if (specLower === "general medicine" || specLower === "medicine specialist" || specLower === "internal medicine") {
          return (
            docSpec.includes("general medicine") ||
            docSpec.includes("internal medicine") ||
            docSpec.includes("medicine specialist") ||
            docSpec.includes("general physician")
          ) && !docSpec.includes("surgery") && !docSpec.includes("sports") && !docSpec.includes("pain") && !docSpec.includes("emergency") && !docSpec.includes("critical");
        } else if (specLower.includes("general") && !specLower.includes("surgery")) {
          return docSpec.includes("general physician") || docSpec.includes("general medicine");
        } else if (specLower.includes("gynecol") || specLower.includes("gynaecol") || specLower.includes("obgyn")) {
          return docSpec.includes("gynecol") || docSpec.includes("gynaecol") || docSpec.includes("obgyn");
        } else if (specLower.includes("pediatr") || specLower.includes("paediatr")) {
          return docSpec.includes("pediatr") || docSpec.includes("paediatr") || docSpec.includes("child");
        } else if (specLower.includes("orthoped") || specLower.includes("orthopaed")) {
          return docSpec.includes("orthoped") || docSpec.includes("orthopaed") || docSpec.includes("bone");
        } else if (
          specLower === "ent" ||
          specLower === "ent doctor" ||
          specLower.includes("otorhinolaryngol") ||
          specLower.includes("otolaryngol") ||
          specLower.includes("ear, nose") ||
          specLower.includes("ear nose")
        ) {
          return (docSpec.includes("ent") || docSpec.includes("otorhinolaryngol") || docSpec.includes("otolaryngol")) && !docSpec.includes("dent") && !docSpec.includes("cardio");
        } else if (specLower.includes("cardio") || specLower.includes("heart")) {
          return docSpec.includes("cardio") || docSpec.includes("heart");
        } else if (specLower.includes("derma") || specLower.includes("skin")) {
          return docSpec.includes("derma") || docSpec.includes("skin");
        } else if (specLower.includes("ophthal") || specLower.includes("eye")) {
          return docSpec.includes("ophthal") || docSpec.includes("eye");
        } else if (specLower.includes("psychiat") || specLower.includes("mental")) {
          return (docSpec.includes("psychiat") || docSpec.includes("mental")) && !docSpec.includes("urology") && !docSpec.includes("neurology");
        } else if (specLower.includes("pulmon") || specLower.includes("chest") || specLower.includes("lung")) {
          return docSpec.includes("pulmon") || docSpec.includes("chest") || docSpec.includes("lung");
        } else {
          return docSpec.includes(specLower);
        }
      });
    }

    // Search filter
    if (search) {
      const cleanSearch = search.trim().toLowerCase();
      const strippedSearch = cleanSearch.replace(/^(dr\.|dr\s+|doctor\s+)/i, "").trim();
      const tokens = Array.from(new Set([cleanSearch, strippedSearch, ...strippedSearch.split(/\s+/)].filter(Boolean))).filter(t => t.length >= 2);

      filteredDetails = filteredDetails.filter((doc) => {
        const fullName = (doc.full_name || "").toLowerCase();
        const spec = (doc.specialization || "").toLowerCase();
        const clinicName = (doc.clinic_name || "").toLowerCase();
        const clinicAddr = (doc.clinic_address || "").toLowerCase();
        return tokens.some(t =>
          fullName.includes(t) ||
          spec.includes(t) ||
          clinicName.includes(t) ||
          clinicAddr.includes(t)
        );
      });
    }

    // Filter by Appointment Mode
    if (appointmentMode && appointmentMode !== "all") {
      filteredDetails = filteredDetails.filter((doc) => {
        if (appointmentMode === "clinic") {
          return isFeeServed(doc.clinic_consultation_fee) || isFeeServed(doc.consultation_fee);
        }
        if (appointmentMode === "video") {
          return isFeeServed(doc.video_consultation_fee);
        }
        if (appointmentMode === "home") {
          return isFeeServed(doc.home_visit_fee);
        }
        return true;
      });
    }

    // Filter by Consultation Fee (checks if any served fee matches the selected tier)
    if (feeFilter && feeFilter !== "all") {
      filteredDetails = filteredDetails.filter((doc) => {
        let fees = [];
        if (appointmentMode === "clinic") {
          const f = doc.clinic_consultation_fee ?? doc.consultation_fee;
          if (isFeeServed(f)) fees.push(Number(f));
        } else if (appointmentMode === "video") {
          if (isFeeServed(doc.video_consultation_fee)) fees.push(Number(doc.video_consultation_fee));
        } else if (appointmentMode === "home") {
          if (isFeeServed(doc.home_visit_fee)) fees.push(Number(doc.home_visit_fee));
        } else {
          const clinicVal = doc.clinic_consultation_fee ?? doc.consultation_fee;
          if (isFeeServed(clinicVal)) fees.push(Number(clinicVal));
          if (isFeeServed(doc.video_consultation_fee)) fees.push(Number(doc.video_consultation_fee));
          if (isFeeServed(doc.home_visit_fee)) fees.push(Number(doc.home_visit_fee));
        }

        if (fees.length === 0) return false;

        if (feeFilter === "under_500") {
          return fees.some((f) => f < 500);
        } else if (feeFilter === "500_1000") {
          return fees.some((f) => f >= 500 && f <= 1000);
        } else if (feeFilter === "above_1000") {
          return fees.some((f) => f >= 1000);
        }
        return true;
      });
    }

    // Filter by Doctor Experience
    if (experienceFilter && experienceFilter !== "all") {
      const minExp = parseFloat(experienceFilter);
      if (!Number.isNaN(minExp) && minExp > 0) {
        filteredDetails = filteredDetails.filter((doc) => {
          const exp = Number(doc.experience_years) || 0;
          return exp >= minExp;
        });
      }
    }

    // Calculate distance for all doctors if user coordinates are valid
    const validUserCoords =
      userLat != null &&
      userLng != null &&
      !Number.isNaN(Number(userLat)) &&
      !Number.isNaN(Number(userLng));

    // Fallback: If address search text was provided without coordinates, filter by address text
    if (addressSearch && !validUserCoords) {
      const cleanAddr = addressSearch.toLowerCase().trim();
      filteredDetails = filteredDetails.filter((doc) => {
        const addr = (doc.clinic_address || "").toLowerCase();
        const cname = (doc.clinic_name || "").toLowerCase();
        return addr.includes(cleanAddr) || cname.includes(cleanAddr);
      });
    }

    filteredDetails = filteredDetails.map((doc) => {
      let distanceKm = null;
      if (validUserCoords) {
        distanceKm = calculateDistanceKm(userLat, userLng, doc.latitude, doc.longitude);
      }
      return {
        ...doc,
        distanceKm,
      };
    });

    // Sorting
    filteredDetails.sort((a, b) => {
      if (sortBy === "nearest") {
        const distA = a.distanceKm != null ? a.distanceKm : 9999999;
        const distB = b.distanceKm != null ? b.distanceKm : 9999999;
        if (distA !== distB) return distA - distB;
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortBy === "rating_high") {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortBy === "exp_high") {
        return (b.experience_years || 0) - (a.experience_years || 0);
      }
      if (sortBy === "fee_low" || sortBy === "fee_high") {
        const getMinServed = (doc) => {
          const list = [
            doc.clinic_consultation_fee ?? doc.consultation_fee,
            doc.video_consultation_fee,
            doc.home_visit_fee,
          ]
            .filter(isFeeServed)
            .map(Number);
          return list.length > 0 ? Math.min(...list) : 9999999;
        };
        const feeA = getMinServed(a);
        const feeB = getMinServed(b);
        return sortBy === "fee_low" ? feeA - feeB : feeB - feeA;
      }
      if (sortBy === "name_asc") {
        return (a.full_name || "").localeCompare(b.full_name || "");
      }
      // default: recommended (higher rating first, then more experience)
      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (ratingDiff !== 0) return ratingDiff;
      return (b.experience_years || 0) - (a.experience_years || 0);
    });

    // Pagination
    const totalItems = filteredDetails.length;
    const totalPages = Math.ceil(totalItems / limit);
    const paginatedDetails = filteredDetails.slice(offset, offset + limit);
    const hasNextPage = page < totalPages;

    // Format doctor card structure
    const doctors = paginatedDetails.map((details) => {
      return {
        id: details.id,
        phone_number: details.phone_number,
        phone: details.phone_number,
        email: details.email,
        role: details.role,
        status: details.status,
        profile_picture: details.profile_picture || (Array.isArray(details.passport_photo) ? details.passport_photo[0] : details.passport_photo),
        created_at: details.created_at,
        doctor_details: details,
        distanceKm: details.distanceKm,
      };
    });

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
