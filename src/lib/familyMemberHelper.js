/**
 * Centralized Family Member parsing & formatting helper
 * Ensures robust handling of stringified JSON, double-stringified JSON,
 * or raw objects across RDS queries and API responses.
 */

export function parseFamilyMember(rawDetails, rawDiseaseInfo = null) {
  let fam = rawDetails || null;

  // Safely unwrap multiple stringifications (handles up to 3 layers)
  for (let i = 0; i < 3; i++) {
    if (typeof fam === "string") {
      const trimmed = fam.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("\"")) {
        try {
          fam = JSON.parse(fam);
        } catch (_) {
          break;
        }
      } else {
        break;
      }
    }
  }

  // Fallback to rawDiseaseInfo if rawDetails was empty or didn't contain an object
  if ((!fam || typeof fam !== "object") && rawDiseaseInfo) {
    let parsedDisease = rawDiseaseInfo;
    for (let i = 0; i < 3; i++) {
      if (typeof parsedDisease === "string") {
        const trimmed = parsedDisease.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("\"")) {
          try {
            parsedDisease = JSON.parse(parsedDisease);
          } catch (_) {
            break;
          }
        } else {
          break;
        }
      }
    }
    if (parsedDisease && typeof parsedDisease === "object") {
      fam = parsedDisease.family_member || null;
      for (let i = 0; i < 3; i++) {
        if (typeof fam === "string") {
          const trimmed = fam.trim();
          if (trimmed.startsWith("{") || trimmed.startsWith("\"")) {
            try {
              fam = JSON.parse(fam);
            } catch (_) {
              break;
            }
          } else {
            break;
          }
        }
      }
    }
  }

  if (fam && typeof fam === "object" && (fam.name || fam.relation || fam.id || fam.full_name)) {
    const rawName = fam.name || fam.full_name || null;

    // Standardize age calculation from DOB if age is absent
    let calculatedAge = null;
    if (fam.dob) {
      const b = new Date(fam.dob);
      if (!isNaN(b.getTime())) {
        const today = new Date();
        let diff = today.getFullYear() - b.getFullYear();
        const m = today.getMonth() - b.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < b.getDate())) diff--;
        if (diff >= 0) calculatedAge = diff;
      }
    }

    const ageNum = (fam.age !== undefined && fam.age !== null && !isNaN(parseInt(fam.age, 10)))
      ? parseInt(fam.age, 10)
      : calculatedAge;

    const ageStr = fam.age
      ? (String(fam.age).includes("yr") ? String(fam.age) : `${fam.age} yrs`)
      : (calculatedAge !== null ? `${calculatedAge} yrs` : null);

    return {
      id: fam.id || null,
      patient_id: fam.patient_id || null,
      name: rawName ? String(rawName).trim() : null,
      full_name: rawName ? String(rawName).trim() : null,
      relation: fam.relation ? String(fam.relation).trim() : null,
      dob: fam.dob || null,
      gender: fam.gender ? String(fam.gender).trim() : null,
      blood_group: fam.blood_group ? String(fam.blood_group).trim() : null,
      profile_picture: fam.profile_picture || null,
      age: ageNum,
      age_str: ageStr,
    };
  }

  return null;
}

export function isFamilyAppointment(appointment) {
  if (!appointment) return false;
  if (appointment.booked_for === "family_member") return true;
  if (appointment.family_member_id) return true;
  if (appointment.family_member && typeof appointment.family_member === "object") return true;
  if (appointment.patient?.relation) return true;
  return Boolean(parseFamilyMember(appointment.family_member_details, appointment.disease_info));
}

export default parseFamilyMember;

