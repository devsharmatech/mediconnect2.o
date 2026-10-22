"use server";

import sql from "@/lib/db";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isValidUUID = (id) => typeof id === "string" && UUID_REGEX.test(id.trim());

export async function getPlatformSupportContactAction() {
  try {
    const [settingsRows, contactRows] = await Promise.all([
      sql`SELECT support_phone, whatsapp_number, whatsapp_message, support_email FROM website_settings ORDER BY created_at ASC LIMIT 1`,
      sql`SELECT support_phone, support_email, consultation_support_text FROM contact_information ORDER BY created_at ASC LIMIT 1`,
    ]);

    const settings = settingsRows[0] || {};
    const contact = contactRows[0] || {};

    const phone = settings.support_phone || (contact.support_phone ? contact.support_phone.split('\n')[0] : null) || "+91 7289 043888";
    const whatsapp = settings.whatsapp_number || (contact.support_phone ? contact.support_phone.split('\n')[0] : null) || phone;
    const whatsappMessage = settings.whatsapp_message || "Hello MediConnect, I need help booking a doctor appointment";
    const consultationText = contact.consultation_support_text || "Need help booking?";

    return {
      success: true,
      data: {
        support_phone: phone,
        whatsapp_number: whatsapp,
        whatsapp_message: whatsappMessage,
        consultation_support_text: consultationText,
      },
    };
  } catch (error) {
    console.error("Error in getPlatformSupportContactAction:", error);
    return {
      success: false,
      error: error.message,
      data: {
        support_phone: "+91 7289 043888",
        whatsapp_number: "+91 7289043888",
        whatsapp_message: "Hello MediConnect, I need help booking a doctor appointment",
        consultation_support_text: "Need help booking?",
      },
    };
  }
}

export async function getDoctorDetailsAction(doctorId) {
  try {
    if (!doctorId || !isValidUUID(doctorId)) {
      return { success: false, error: "Invalid doctor ID" };
    }

    const rows = await sql`
      SELECT 
        u.*,
        row_to_json(d.*) as doctor_details
      FROM users u
      LEFT JOIN doctor_details d ON d.id = u.id
      WHERE u.id = ${doctorId} AND u.role = 'doctor'
      LIMIT 1;
    `;

    if (!rows || rows.length === 0) return { success: false, error: "Doctor not found" };

    const supportRes = await getPlatformSupportContactAction();

    return { 
      success: true, 
      data: rows[0],
      support_contact: supportRes.data,
    };
  } catch (error) {
    console.error("Error in getDoctorDetailsAction:", error);
    return { success: false, error: error.message };
  }
}

export async function checkDoctorFollowupAndPricingAction({ patient_id, doctor_id, appointment_type = "clinic_visit" }) {
  try {
    if (!doctor_id || !isValidUUID(doctor_id)) {
      return { success: false, error: "Invalid doctor ID" };
    }
    const cleanPatientId = isValidUUID(patient_id) ? patient_id : null;

    // Fetch doctor fees and details from AWS RDS PostgreSQL
    const docRows = await sql`
      SELECT 
        id, consultation_fee, video_consultation_fee, clinic_consultation_fee, home_visit_fee,
        video_follow_up_fee, clinic_follow_up_fee, home_follow_up_fee, follow_up_fee,
        second_booking_discount_type, second_booking_discount_value, meta
      FROM doctor_details
      WHERE id = ${doctor_id}
      LIMIT 1;
    `;
    const doctor = docRows[0];
    if (!doctor) return { success: false, error: "Doctor not found" };

    const meta = typeof doctor.meta === 'string' ? JSON.parse(doctor.meta || '{}') : (doctor.meta || {});

    // Parse fees helper
    const parseFee = (val, fallback = 0) => {
      if (val === undefined || val === null || val === "") return fallback;
      const num = Number(val);
      return Number.isFinite(num) ? num : fallback;
    };

    const videoFee = parseFee(meta?.video_consultation_fee ?? doctor.video_consultation_fee, parseFee(doctor.consultation_fee, 0));
    const videoFollowUpFee = parseFee(meta?.video_follow_up_fee ?? doctor.video_follow_up_fee, parseFee(meta?.follow_up_fee ?? doctor.follow_up_fee, videoFee));

    const clinicFee = parseFee(meta?.clinic_consultation_fee ?? doctor.clinic_consultation_fee, parseFee(doctor.consultation_fee, 0));
    const clinicFollowUpFee = parseFee(meta?.clinic_follow_up_fee ?? doctor.clinic_follow_up_fee, parseFee(meta?.follow_up_fee ?? doctor.follow_up_fee, clinicFee));

    const homeFee = parseFee(meta?.home_visit_fee ?? doctor.home_visit_fee, parseFee(doctor.consultation_fee, 0));
    const homeFollowUpFee = parseFee(meta?.home_follow_up_fee ?? doctor.home_follow_up_fee, parseFee(meta?.follow_up_fee ?? doctor.follow_up_fee, homeFee));

    let isInFollowUp = false;
    let followUpParentId = null;
    let followUpDate = null;
    let lastAppointmentDate = null;
    let previousAppointmentsCount = 0;

    if (cleanPatientId) {
      // 1. Fetch appointments count between this patient and doctor
      const apptRows = await sql`
        SELECT id, appointment_date, appointment_type, status, created_at
        FROM appointments
        WHERE patient_id = ${cleanPatientId}
          AND doctor_id = ${doctor_id}
          AND status NOT IN ('cancelled', 'rejected')
        ORDER BY appointment_date DESC, created_at DESC
        LIMIT 5;
      `;
      previousAppointmentsCount = apptRows.length;
      if (apptRows.length > 0) {
        lastAppointmentDate = apptRows[0].appointment_date;
      }

      // 2. Strict Follow-up Rule:
      // A patient is in follow-up ONLY IF the doctor has created a prescription
      // with a specific follow-up date, and the patient is booking within that follow-up window!
      const rxRows = await sql`
        SELECT id, appointment_id, follow_up, template_data, created_at, status
        FROM prescriptions
        WHERE patient_id = ${cleanPatientId}
          AND doctor_id = ${doctor_id}
          AND (is_draft IS NULL OR is_draft = false)
        ORDER BY created_at DESC
        LIMIT 5;
      `;

      if (rxRows.length > 0) {
        for (const rx of rxRows) {
          let followUpObj = rx.follow_up;
          if (typeof followUpObj === "string") {
            try { followUpObj = JSON.parse(followUpObj); } catch { followUpObj = null; }
          }
          let templateData = rx.template_data;
          if (typeof templateData === "string") {
            try { templateData = JSON.parse(templateData); } catch { templateData = null; }
          }

          const rawDateStr = 
            followUpObj?.date || 
            followUpObj?.return_after || 
            followUpObj?.next_appointment_date || 
            followUpObj?.review_after ||
            templateData?.['FOLLOW-UP__return_after'] ||
            templateData?.['FOLLOW-UP__date'] ||
            templateData?.['FOLLOW-UP:__return_after'] ||
            null;

          if (!rawDateStr) continue;

          let targetDate = null;
          const trimmedStr = String(rawDateStr).trim();

          if (/^\d{4}-\d{2}-\d{2}/.test(trimmedStr)) {
            const d = new Date(trimmedStr);
            if (!isNaN(d.getTime())) {
              targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
            }
          } else if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/.test(trimmedStr)) {
            const parts = trimmedStr.split(/[\/-]/);
            if (parts.length === 3) {
              const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]), 23, 59, 59, 999);
              if (!isNaN(d.getTime())) targetDate = d;
            }
          } else {
            const matchDays = trimmedStr.match(/(\d+)\s*(day|days|din)/i);
            if (matchDays) {
              const days = parseInt(matchDays[1], 10);
              const rxCreated = new Date(rx.created_at || Date.now());
              targetDate = new Date(rxCreated.getTime() + days * 24 * 60 * 60 * 1000);
              targetDate.setHours(23, 59, 59, 999);
            }
          }

          if (targetDate && !isNaN(targetDate.getTime())) {
            const now = new Date();
            // Patient must book on or before the follow-up date
            if (now.getTime() <= targetDate.getTime()) {
              // Ensure this follow-up has not already been used for this prescription appointment
              const existingFu = await sql`
                SELECT id FROM appointments
                WHERE patient_id = ${patient_id}
                  AND doctor_id = ${doctor_id}
                  AND follow_up_parent_id = ${rx.appointment_id}
                  AND status NOT IN ('cancelled', 'rejected')
                LIMIT 1;
              `;
              if (existingFu.length === 0) {
                isInFollowUp = true;
                followUpParentId = rx.appointment_id;
                followUpDate = targetDate.toISOString().split("T")[0];
                break;
              }
            }
          }
        }
      }
    }

    // Determine fees according to mode
    const modeKey = String(appointment_type || "").toLowerCase();
    let regularFeeForMode = clinicFee;
    let followUpFeeForMode = clinicFollowUpFee;

    if (modeKey.includes("video")) {
      regularFeeForMode = videoFee;
      followUpFeeForMode = videoFollowUpFee;
    } else if (modeKey.includes("home")) {
      regularFeeForMode = homeFee;
      followUpFeeForMode = homeFollowUpFee;
    }

    let originalFee = isInFollowUp ? followUpFeeForMode : regularFeeForMode;
    let isDiscountApplicable = false;
    let discountAmount = 0;
    let discountedFee = originalFee;

    // RULE: "ye discount followup pr nhi hota h ok"
    if (isInFollowUp) {
      isDiscountApplicable = false;
      discountAmount = 0;
      discountedFee = originalFee;
    } else {
      // Check doctor's discount settings for first visit
      const type = doctor.second_booking_discount_type;
      const val = Number(doctor.second_booking_discount_value || 0);

      if (type && type !== "none" && val > 0) {
        // Check if discount condition is met (e.g., 2nd booking discount or direct doctor discount)
        const isEligible = previousAppointmentsCount === 1 || type === "percentage" || type === "flat";
        if (isEligible) {
          isDiscountApplicable = true;
          if (type === "percentage") {
            discountAmount = originalFee * (val / 100);
          } else if (type === "flat" || type === "fixed") {
            discountAmount = val;
          }
          discountAmount = Math.max(0, Math.min(originalFee, discountAmount));
          discountedFee = Math.max(0, originalFee - discountAmount);
        }
      }
    }

    return {
      success: true,
      data: {
        is_logged_in: !!patient_id,
        is_in_followup: isInFollowUp,
        follow_up_date: followUpDate,
        follow_up_parent_id: followUpParentId,
        last_appointment_date: lastAppointmentDate,
        previous_appointments_count: previousAppointmentsCount,
        original_fee: originalFee,
        discount_amount: discountAmount,
        discounted_fee: discountedFee,
        final_fee: discountedFee,
        is_discount_applicable: isDiscountApplicable,
        discount_type: doctor.second_booking_discount_type || "none",
        discount_value: Number(doctor.second_booking_discount_value || 0),
        mode_fees: {
          video: { regular: videoFee, follow_up: videoFollowUpFee },
          clinic: { regular: clinicFee, follow_up: clinicFollowUpFee },
          home: { regular: homeFee, follow_up: homeFollowUpFee }
        }
      }
    };
  } catch (error) {
    console.error("Error in checkDoctorFollowupAndPricingAction:", error);
    return { success: false, error: error.message };
  }
}

// Backwards-compatible alias
export async function checkDoctorDiscountAction(params) {
  return checkDoctorFollowupAndPricingAction(params);
}

const SLOT_COLUMN_MAP = {
  clinic_visit: "clinic_slots",
  clinic_follow_up: "clinic_slots",
  video_consultation: "video_slots",
  video_follow_up: "video_slots",
  home_visit: "home_slots",
  home_follow_up: "home_slots",
  follow_up: "clinic_slots",
};

function parseTimeTo24h(str) {
  if (!str || typeof str !== "string") return "";
  const clean = str.trim();
  const ampmMatch = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    let [_, h, m, period] = ampmMatch;
    let hours = parseInt(h, 10);
    if (period.toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (period.toUpperCase() === "AM" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${m}`;
  }
  const timeMatch = clean.match(/^(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    let [_, h, m] = timeMatch;
    return `${String(h).padStart(2, "0")}:${m}`;
  }
  return clean;
}

function resolveIntervals(typeSlots, availableTime, fullWeekday, shortWeekday) {
  let rawSlots = typeSlots;
  if (typeof rawSlots === "string") {
    try { rawSlots = JSON.parse(rawSlots); } catch { rawSlots = null; }
  }

  let intervals = [];

  if (rawSlots && typeof rawSlots === "object") {
    if (rawSlots.start && rawSlots.end) {
      intervals = [{ start: parseTimeTo24h(rawSlots.start), end: parseTimeTo24h(rawSlots.end) }];
    } else if (Array.isArray(rawSlots) && rawSlots.length > 0 && rawSlots[0]?.start && rawSlots[0]?.end) {
      intervals = rawSlots.map(s => ({ start: parseTimeTo24h(s.start), end: parseTimeTo24h(s.end) }));
    } else {
      const daySlot = rawSlots[fullWeekday] || 
                      rawSlots[shortWeekday] || 
                      rawSlots[fullWeekday.toLowerCase()] || 
                      rawSlots[shortWeekday.toLowerCase()];
      if (daySlot) {
        if (Array.isArray(daySlot)) {
          intervals = daySlot.filter(s => s.start && s.end).map(s => ({
            start: parseTimeTo24h(s.start),
            end: parseTimeTo24h(s.end)
          }));
        } else if (daySlot.start && daySlot.end) {
          intervals = [{ start: parseTimeTo24h(daySlot.start), end: parseTimeTo24h(daySlot.end) }];
        }
      }
    }
  }

  if (intervals.length === 0 && availableTime) {
    let rawTime = availableTime;
    if (typeof rawTime === "string") {
      try { rawTime = JSON.parse(rawTime); } catch {}
    }

    if (typeof rawTime === "object" && rawTime?.start && rawTime?.end) {
      intervals = [{ start: parseTimeTo24h(rawTime.start), end: parseTimeTo24h(rawTime.end) }];
    } else if (typeof rawTime === "string" && rawTime.includes("-")) {
      const parts = rawTime.split("-").map(s => s.trim());
      if (parts.length === 2 && parts[0] && parts[1]) {
        intervals = [{ start: parseTimeTo24h(parts[0]), end: parseTimeTo24h(parts[1]) }];
      }
    }
  }

  return intervals.filter(s => s.start && s.end && s.start < s.end);
}

export async function getDoctorSlotsAction({ doctor_id, date, appointment_type = "video_consultation" }) {
  try {
    if (!doctor_id || !isValidUUID(doctor_id) || !date) {
      return { success: false, error: "Invalid doctor_id or date required" };
    }

    const docRows = await sql`
      SELECT available_days, available_time, clinic_slots, video_slots, home_slots, leave_days, is_open, slot_interval_minutes
      FROM doctor_details
      WHERE id = ${doctor_id}
      LIMIT 1;
    `;
    const doctor = docRows[0];
    if (!doctor) return { success: false, error: "Doctor not found" };

    if (doctor.is_open === false) {
      return { success: true, data: [] };
    }

    const [yyyy, mm, dd] = date.split("-").map(Number);
    const localDate = new Date(yyyy, mm - 1, dd);
    const shortWeekday = localDate.toLocaleString("en-US", { weekday: "short" });
    const fullWeekday = localDate.toLocaleString("en-US", { weekday: "long" });

    const leaveDays = Array.isArray(doctor.leave_days)
      ? doctor.leave_days
      : (typeof doctor.leave_days === "string" ? JSON.parse(doctor.leave_days) : []);

    if (leaveDays.some(ld => String(ld).toLowerCase() === fullWeekday.toLowerCase() || String(ld).toLowerCase() === shortWeekday.toLowerCase())) {
      return { success: true, data: [] };
    }

    const availableDays = Array.isArray(doctor.available_days)
      ? doctor.available_days
      : (typeof doctor.available_days === "string" ? JSON.parse(doctor.available_days) : []);

    if (availableDays.length > 0) {
      const isAvailable = availableDays.some(ad => {
        const adClean = String(ad).trim().toLowerCase();
        return adClean === fullWeekday.toLowerCase() || adClean === shortWeekday.toLowerCase();
      });
      if (!isAvailable) {
        return { success: true, data: [] };
      }
    }

    const slotColumnKey = SLOT_COLUMN_MAP[appointment_type] || "video_slots";
    const typeSlots = doctor[slotColumnKey];
    const intervals = resolveIntervals(typeSlots, doctor.available_time, fullWeekday, shortWeekday);

    if (intervals.length === 0) {
      return { success: true, data: [] };
    }

    const slots = [];
    const slotInterval = doctor.slot_interval_minutes || 15;

    intervals.forEach(({ start, end }) => {
      let current = new Date(`1970-01-01T${start}:00`);
      const endLimit = new Date(`1970-01-01T${end}:00`);

      while (current < endLimit) {
        const time = current.toTimeString().slice(0, 5);
        if (!slots.some(s => s.time === time)) {
          slots.push({ time, slot_booked: false });
        }
        current.setMinutes(current.getMinutes() + slotInterval);
      }
    });

    slots.sort((a, b) => a.time.localeCompare(b.time));

    const bookedAppointments = await sql`
      SELECT appointment_time::text
      FROM appointments
      WHERE doctor_id = ${doctor_id}
        AND appointment_date = ${date}::date
        AND status IN ('booked', 'approved', 'completed', 'freezed');
    `;

    const bookedTimes = bookedAppointments.map((a) => a.appointment_time.slice(0, 5)) || [];

    const finalSlots = slots.map((slot) => ({
      ...slot,
      slot_booked: bookedTimes.includes(slot.time),
    }));

    return { success: true, data: finalSlots };
  } catch (error) {
    console.error("Error in getDoctorSlotsAction:", error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function getBookingFinancialQuoteAction({
  doctor_id,
  patient_id,
  appointment_type = "clinic_visit",
  professional_fee = 0,
  doctor_migration_code = null,
}) {
  try {
    const { calculateBookingFinancialQuote } = await import("@/lib/doctorFinancialEngine");
    return await calculateBookingFinancialQuote({
      doctor_id,
      patient_id,
      appointment_type,
      professional_fee,
      doctor_migration_code,
    });
  } catch (error) {
    console.error("Error in getBookingFinancialQuoteAction:", error);
    return { success: false, error: error.message };
  }
}
