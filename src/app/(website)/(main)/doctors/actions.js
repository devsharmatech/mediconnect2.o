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

        // Match against whole docSpec or comma-separated tokens
        const tokens = docSpec.split(",").map(t => t.trim()).filter(Boolean);
        const isUro = (str) => (str.startsWith("uro") || (/\burolog/i).test(str)) && !str.includes("neuro");
        const isNeuro = (str) => str.includes("neuro") && !str.startsWith("uro") && !(/\burolog/i).test(str);

        const checkMatch = (specStr) => {
          if (
            specLower === "uro/neuro" ||
            specLower === "uro / neuro" ||
            specLower === "urology/neurology" ||
            specLower === "urology / neurology" ||
            (isUro(specLower) && isNeuro(specLower))
          ) {
            return isUro(specStr) || isNeuro(specStr);
          } else if (isUro(specLower)) {
            return isUro(specStr);
          } else if (isNeuro(specLower)) {
            return isNeuro(specStr);
          } else if (specLower.includes("gastro")) {
            return specStr.includes("gastro") || specStr.includes("stomach") || specStr.includes("digestive") || specStr.includes("liver") || specStr.includes("hepatol");
          } else if (specLower.includes("dentist") || specLower.includes("dental") || specLower.includes("dentistry")) {
            return specStr.includes("dentist") || specStr.includes("dental") || specStr.includes("dentistry") || specStr.includes("teeth");
          } else if (specLower === "general physician" || specLower === "gp" || specLower.includes("physician") || specLower === "general medicine" || specLower.includes("internal medicine")) {
            return (
              specStr.includes("general physician") ||
              specStr.includes("physician") ||
              specStr.includes("general medicine") ||
              specStr.includes("internal medicine") ||
              specStr.includes("family medicine") ||
              specStr.includes("medicine specialist") ||
              specStr === "gp"
            );
          } else if (specLower.includes("general") && !specLower.includes("surgery")) {
            return specStr.includes("general physician") || specStr.includes("general medicine") || specStr.includes("physician");
          } else if (specLower.includes("gynecol") || specLower.includes("gynaecol") || specLower.includes("obgyn") || specLower.includes("obstetric")) {
            return specStr.includes("gynecol") || specStr.includes("gynaecol") || specStr.includes("obgyn") || specStr.includes("obstetric");
          } else if (specLower.includes("pediatr") || specLower.includes("paediatr")) {
            return specStr.includes("pediatr") || specStr.includes("paediatr") || specStr.includes("child") || specStr.includes("neonat");
          } else if (specLower.includes("orthoped") || specLower.includes("orthopaed")) {
            return specStr.includes("orthoped") || specStr.includes("orthopaed") || specStr.includes("bone") || specStr.includes("joint");
          } else if (
            specLower === "ent" ||
            specLower === "ent doctor" ||
            specLower.includes("otorhinolaryngol") ||
            specLower.includes("otolaryngol") ||
            specLower.includes("ear, nose") ||
            specLower.includes("ear nose")
          ) {
            if (specStr.includes("dentist") || specStr.includes("dental") || specStr.includes("gastro")) return false;
            return (/\bent\b/i).test(specStr) || specStr.includes("otorhinolaryngol") || specStr.includes("otolaryngol") || specStr.includes("ear");
          } else if (specLower.includes("cardio") || specLower.includes("heart")) {
            return specStr.includes("cardio") || specStr.includes("heart");
          } else if (specLower.includes("derma") || specLower.includes("skin")) {
            return specStr.includes("derma") || specStr.includes("skin") || specStr.includes("cosmetol");
          } else if (specLower.includes("ophthal") || specLower.includes("eye")) {
            return specStr.includes("ophthal") || specStr.includes("eye") || specStr.includes("vision");
          } else if (specLower.includes("psychiat") || specLower.includes("mental")) {
            return specStr.includes("psychiat") || specStr.includes("mental") || specStr.includes("psycholog");
          } else if (specLower.includes("pulmon") || specLower.includes("chest") || specLower.includes("lung")) {
            return specStr.includes("pulmon") || specStr.includes("chest") || specStr.includes("lung") || specStr.includes("respirat");
          } else if (specLower.includes("nephro") || specLower.includes("kidney") || specLower.includes("renal")) {
            return specStr.includes("nephro") || specStr.includes("kidney") || specStr.includes("renal");
          } else if (specLower === "surgery" || specLower === "general surgery") {
            return specStr.includes("surgery") || specStr.includes("surgeon");
          } else if (specLower.includes("physio")) {
            return specStr.includes("physio") || specStr.includes("physical therap");
          } else if (specLower.includes("oncol") || specLower.includes("cancer")) {
            return specStr.includes("oncol") || specStr.includes("cancer");
          } else if (specLower.includes("rheumat")) {
            return specStr.includes("rheumat") || specStr.includes("arthritis");
          } else if (specLower.includes("endocrin")) {
            return specStr.includes("endocrin") || specStr.includes("diabet") || specStr.includes("thyroid");
          } else {
            if (isUro(specLower) && isNeuro(specStr)) return false;
            if (isNeuro(specLower) && isUro(specStr)) return false;
            if (specLower === "ent" && (specStr.includes("dentist") || specStr.includes("dental"))) return false;
            if ((specLower.includes("dentist") || specLower.includes("dental")) && (/\bent\b/i).test(specStr) && !specStr.includes("dent")) return false;
            return specStr.includes(specLower);
          }
        };

        if (checkMatch(docSpec)) return true;
        return tokens.some(t => checkMatch(t));
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
