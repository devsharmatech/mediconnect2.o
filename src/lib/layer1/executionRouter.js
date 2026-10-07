/**
 * LAYER-111: Execution Router
 * 
 * Routes specific orchestration actions securely to target service controllers.
 * Serves as the isolated router between the entry Control Layer and internal business logic.
 */

import sql from "@/lib/db";
import { createCareEpisode } from "./careEpisodeService";
import { updateConsultationStatus } from "./consultationStateMachine";
import { dispatchService } from "./serviceDispatcher";
import { logConsent } from "./consentManager";
import { createLedgerEntry } from "./financialLedger";
import { logActivity } from "./activityLogger";
import { initializeConsultation } from "./consultationService";
import { logAudit } from "./auditLogger";
import { insertOutboxEvent } from "./eventOutbox";
import { evaluateCTA, updateEngagementProfile, trackSignal } from "./engagementEngine";
import { sendAppointmentUpdateAlert } from "@/lib/sms";
import { sendPushAndInAppNotification } from "../notificationHelper";


/**
 * Routes and executes orchestrations.
 * 
 * @param {string} actionType - The action to perform.
 * @param {object} payload - Action arguments.
 * @param {string} actorId - Execution executor (user ID).
 * @param {string} [careEpisodeId] - Optional link to active episode.
 * @returns {object} Router response payload.
 */
export async function routeExecution(actionType, payload, actorId, careEpisodeId = null) {
  switch (actionType) {
    case "BOOK_APPOINTMENT":
      return await executeBookAppointment(payload, actorId, careEpisodeId);

    case "START_CONSULTATION":
      return await executeStartConsultation(payload, actorId);

    case "START_INSTANT_CONSULTATION":
      return await executeStartInstantConsultation(payload, actorId);

    case "COMPLETE_CONSULTATION":
      return await executeCompleteConsultation(payload, actorId);

    case "DISPATCH_SERVICE":
      return await executeDispatchService(payload);

    case "RECORD_CONSENT":
      return await executeRecordConsent(payload, actorId, careEpisodeId);

    case "UPDATE_APPOINTMENT_STATUS":
      return await executeUpdateAppointmentStatus(payload, actorId);

    case "RESCHEDULE_APPOINTMENT":
      return await executeRescheduleAppointment(payload, actorId);

    case "CANCEL_APPOINTMENT":
      return await executeCancelAppointment(payload, actorId);

    default:
      throw new Error(`ROUTER_ERROR: Unknown or unsupported action_type '${actionType}'`);
  }
}

/**
 * 1. BOOK_APPOINTMENT Action Router
 */
async function executeBookAppointment(payload, actorId, careEpisodeId) {
  const {
    doctor_id,
    patient_id,
    screening_id,
    appointment_date,
    appointment_time,
    disease_info,
    appointment_type,
    payment_id,
    razorpay_order_id,
    consents,
    clinic_name,
    clinic_address,
  } = payload;

  if (!doctor_id || !patient_id || !appointment_date || !appointment_time) {
    throw new Error("doctor_id, patient_id, appointment_date, and appointment_time are required.");
  }

  if (!consents || !consents.data_sharing || !consents.teleconsultation) {
    throw new Error("Mandatory consents (Data Sharing & Teleconsultation) are required under DPDP Act 2023.");
  }

  // Verify doctor fee
  const doctorRows = await sql`
    SELECT consultation_fee, meta, full_name
    FROM doctor_details
    WHERE id = ${doctor_id}
    LIMIT 1
  `;
  const doctorDetails = doctorRows[0];

  const meta = doctorDetails?.meta || {};
  const fee = appointment_type === "video" || appointment_type === "video_consultation"
    ? (meta?.video_consultation_fee ?? doctorDetails?.consultation_fee ?? 0)
    : appointment_type === "clinic_visit"
      ? (meta?.clinic_consultation_fee ?? doctorDetails?.consultation_fee ?? 0)
      : (meta?.home_visit_fee ?? doctorDetails?.consultation_fee ?? 0);

  // Prevent duplicate booking for the same slot
  const existingAppts = await sql`
    SELECT id FROM appointments
    WHERE doctor_id = ${doctor_id}
      AND appointment_date = ${appointment_date}::date
      AND appointment_time = ${appointment_time}::time
      AND status NOT IN ('cancelled', 'rejected')
    LIMIT 1
  `;

  if (existingAppts.length > 0) {
    throw new Error("This appointment slot is already booked. Please choose a different time.");
  }

  // Insert appointment
  const diseaseInfoVal = disease_info
    ? (typeof disease_info === 'string' ? disease_info : JSON.stringify(disease_info))
    : null;

  const apptRows = await sql`
    INSERT INTO appointments (
      doctor_id,
      patient_id,
      screening_id,
      appointment_date,
      appointment_time,
      appointment_type,
      disease_info,
      razorpay_order_id,
      razorpay_payment_id,
      status,
      payment_status,
      care_episode_id,
      clinic_name,
      clinic_address,
      created_at,
      updated_at
    ) VALUES (
      ${doctor_id},
      ${patient_id},
      ${screening_id || null},
      ${appointment_date}::date,
      ${appointment_time}::time,
      ${appointment_type || "clinic_visit"},
      ${diseaseInfoVal},
      ${razorpay_order_id || null},
      ${payment_id || null},
      'booked',
      ${payment_id ? "paid" : (fee > 0 ? "pending" : "not_applicable")},
      ${careEpisodeId},
      ${clinic_name || null},
      ${clinic_address || null},
      NOW(),
      NOW()
    )
    RETURNING *
  `;
  const appointment = apptRows[0];
  if (!appointment) throw new Error("Failed to insert appointment into AWS RDS.");

  // Log consents FIRST so DPDP consent checks pass for notifications
  await logConsent({
    patient_id,
    care_episode_id: careEpisodeId,
    consent_type: "DATA_SHARING",
    status: true,
    metadata: { source: "control_layer_booking" }
  });

  await logConsent({
    patient_id,
    care_episode_id: careEpisodeId,
    consent_type: "TELECONSULTATION",
    status: true,
    metadata: { source: "control_layer_booking" }
  });

  // Dispatch In-App, FCM Push, and WhatsApp notifications
  (async () => {
    try {
      const patientUsers = await sql`SELECT phone_number FROM users WHERE id = ${patient_id} LIMIT 1`;
      const patientDetailsRows = await sql`SELECT full_name FROM patient_details WHERE id = ${patient_id} LIMIT 1`;

      const patientName = patientDetailsRows[0]?.full_name || "Patient";
      const doctorName = doctorDetails?.full_name || "Doctor";
      const phoneNumber = patientUsers[0]?.phone_number;

      // 1. In-App & FCM Push Notification for Patient (Pending doctor approval)
      await sendPushAndInAppNotification({
        user_id: patient_id,
        title: "Appointment Request Received",
        message: `Your appointment request with Dr. ${doctorName} on ${appointment_date} at ${appointment_time} has been received and is pending doctor confirmation.`,
        type: "appointment_booked",
        metadata: { appointment_id: appointment.id, doctor_id, doctor_name: doctorName }
      });

      // 2. In-App & FCM Push Notification for Doctor
      await sendPushAndInAppNotification({
        user_id: doctor_id,
        title: "New Appointment Booked",
        message: `New appointment booked with ${patientName} on ${appointment_date} at ${appointment_time}.`,
        type: "appointment_booked",
        metadata: { appointment_id: appointment.id, patient_id, patient_name: patientName }
      });

      // 3. WhatsApp & SMS alert
      if (phoneNumber) {
        await sendAppointmentUpdateAlert({
          phone_number: phoneNumber,
          recipient_name: patientName,
          status_type: "booked",
          appointment_code: "MCAPT-" + String(appointment.id).slice(0, 8).toUpperCase(),
          patient_name: patientName,
          doctor_or_service: "Dr. " + doctorName,
          date: appointment_date,
          time: appointment_time,
          location_or_mode: (appointment_type === "video_call" || appointment_type === "video_consultation" || appointment_type === "video") ? "Video Call" : (appointment_type === "home_visit" ? "Home Visit" : "Clinic Visit"),
          patient_id
        });
      }
    } catch (err) {
      console.error("[NOTIFICATION ENGINE] Failed to send booking notifications:", err.message);
    }
  })();

  // Initialize clinical consultation (STARTED)
  let consultation = null;
  try {
    const consultRows = await sql`
      INSERT INTO consultations (
        appointment_id,
        patient_id,
        doctor_id,
        care_episode_id,
        case_status,
        consultation_mode,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        ${appointment.id},
        ${patient_id},
        ${doctor_id},
        ${careEpisodeId},
        'STARTED',
        ${(appointment_type === "video_call" || appointment_type === "video_consultation" || appointment_type === "video") ? "VIDEO" : "IN_PERSON"},
        true,
        NOW(),
        NOW()
      )
      RETURNING *
    `;
    consultation = consultRows[0] || null;
  } catch (cErr) {
    console.warn("[ROUTER] Consultation create note:", cErr.message);
  }

  // Financial Ledger recording
  if (fee > 0) {
    await createLedgerEntry({
      patient_id,
      care_episode_id: careEpisodeId,
      service_type: "consultation",
      reference_id: appointment.id,
      debit_credit: "credit",
      amount: fee,
      status: "success",
      payment_mode: payment_id ? "Razorpay" : "Free/Other",
      payment_gateway_id: payment_id || null,
      description: `Consultation fee for appointment on ${appointment_date}`
    });
  }

  // Activities & Audits
  await logActivity({
    patient_id,
    care_episode_id: careEpisodeId,
    actor_id: actorId,
    module_type: "consultation",
    action_type: "appointment_booked",
    reference_id: appointment.id,
    description: `Appointment booked via Control Layer: ${appointment_date} at ${appointment_time}`
  });

  await logAudit({
    entity_type: "appointment",
    entity_id: appointment.id,
    previous_state: null,
    new_state: { status: appointment.status },
    changed_by: actorId,
    change_description: "Appointment created via Control Layer execution"
  });

  // Persistent event outbox capture
  await insertOutboxEvent({
    event_type: "APPOINTMENT_BOOKED",
    consultation_id: consultation.id,
    care_episode_id: careEpisodeId,
    consultation_type: "CLINICAL",
    payload: { appointment_id: appointment.id, patient_id, doctor_id, appointment_date }
  });

  // ── Phase 3: Non-blocking Engagement Engine hooks ────────────────────────
  // Fire-and-forget: does NOT block the booking response
  Promise.all([
    evaluateCTA(patient_id, "POST_BOOKING", 2),
    updateEngagementProfile(patient_id, "APPOINTMENT_BOOKED", 8)
  ]).catch(err => console.warn("[EngagementEngine] Post-booking hook failed:", err.message));

  // Track booking signal
  trackSignal({
    userId: patient_id,
    signalCode: "APPOINTMENT_BOOKED",
    type: "EVENT",
    confidence: 1.0,
    metadata: { appointment_id: appointment.id, doctor_id, appointment_date }
  });

  return {
    appointment_id: appointment.id,
    consultation_id: consultation.id,
    status: appointment.status,
    care_episode_id: careEpisodeId
  };
}

/**
 * 2. START_CONSULTATION Action Router
 */
async function executeStartConsultation(payload, actorId) {
  const { consultation_id, reason } = payload;
  if (!consultation_id) {
    throw new Error("consultation_id is required to start a consultation.");
  }

  const result = await updateConsultationStatus(
    consultation_id,
    "ACTIVE",
    actorId,
    reason || "Consultation started by physician"
  );

  if (!result.success) {
    throw new Error(`STATE_TRANSITION_FAILED: ${result.error}`);
  }

  return {
    consultation_id,
    status: "ACTIVE",
    data: result.data
  };
}

/**
 * 2b. START_INSTANT_CONSULTATION Action Router
 */
async function executeStartInstantConsultation(payload, actorId) {
  const { symptoms, consultation_mode } = payload;
  
  const initResult = await initializeConsultation({
    patient_id: actorId,
    symptoms,
    consultation_mode
  });

  if (!initResult.success) {
    throw new Error(`INITIALIZATION_FAILED: ${initResult.error}`);
  }

  return {
    consultation_id: initResult.data.consultation_id,
    care_episode_id: initResult.data.care_episode_id,
    status: "STARTED",
    is_existing: false,
    next_action: "COMPLETE_PAYMENT",
    data: initResult.data
  };
}

/**
 * 3. COMPLETE_CONSULTATION Action Router
 */
async function executeCompleteConsultation(payload, actorId) {
  const { consultation_id, reason } = payload;
  if (!consultation_id) {
    throw new Error("consultation_id is required to complete a consultation.");
  }

  const result = await updateConsultationStatus(
    consultation_id,
    "COMPLETED",
    actorId,
    reason || "Consultation completed by physician"
  );

  if (!result.success) {
    throw new Error(`STATE_TRANSITION_FAILED: ${result.error}`);
  }

  return {
    consultation_id,
    status: result.data?.case_status || "COMPLETED",
    data: result.data
  };
}

/**
 * 4. DISPATCH_SERVICE Action Router
 */
async function executeDispatchService(payload) {
  const { care_episode_id, consultation_id, patient_id, service_type, consultation_type, payload: servicePayload } = payload;
  
  const result = await dispatchService({
    care_episode_id,
    consultation_id,
    patient_id,
    service_type,
    consultation_type,
    payload: servicePayload
  });

  return result;
}

/**
 * 5. RECORD_CONSENT Action Router
 */
async function executeRecordConsent(payload, actorId, careEpisodeId) {
  const { patient_id, consent_type, status, metadata } = payload;
  
  if (!patient_id || !consent_type) {
    throw new Error("patient_id and consent_type are required to record consent.");
  }

  const result = await logConsent({
    patient_id,
    care_episode_id: careEpisodeId,
    consent_type,
    status: status !== false,
    metadata: metadata || {}
  });

  return result;
}

/**
 * 6. UPDATE_APPOINTMENT_STATUS Action Router
 */
async function executeUpdateAppointmentStatus(payload, actorId) {
  const { appointment_id, status } = payload;
  
  if (!appointment_id || !status) {
    throw new Error("appointment_id and status are required");
  }

  const aptRows = await sql`
    SELECT * FROM appointments WHERE id = ${appointment_id} LIMIT 1
  `;
  const appointment = aptRows[0];
  if (!appointment) throw new Error("Appointment not found.");

  if (status === "approved" && appointment.appointment_date) {
    try {
      const timePart = appointment.appointment_time ? String(appointment.appointment_time).slice(0, 5) : "23:59";
      const dateStr = typeof appointment.appointment_date === "string" 
        ? appointment.appointment_date 
        : appointment.appointment_date instanceof Date 
        ? appointment.appointment_date.toISOString().split("T")[0]
        : String(appointment.appointment_date || "");
      const dateOnly = dateStr.split("T")[0];
      const [year, month, day] = dateOnly.split("-").map(Number);
      const [hours, minutes] = timePart.split(":").map(Number);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        const aptDateTime = new Date(year, month - 1, day, hours || 0, minutes || 0, 0);
        const now = new Date();
        if (now.getTime() > aptDateTime.getTime() + 30 * 60 * 1000) {
          throw new Error("Cannot approve an expired appointment slot.");
        }
      }
    } catch (err) {
      if (err.message.includes("expired")) throw err;
    }
  }

  const updatedRows = await sql`
    UPDATE appointments
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${appointment_id}
    RETURNING *
  `;
  const updated = updatedRows[0];
  if (!updated) throw new Error("Update failed.");

  // Dispatch in-app, push, and WhatsApp notifications asynchronously
  (async () => {
    try {
      let whatsappStatusType = status;
      if (status === "approved") whatsappStatusType = "confirmed";

      const patientUsers = await sql`SELECT phone_number FROM users WHERE id = ${appointment.patient_id} LIMIT 1`;
      const patientDetails = await sql`SELECT full_name FROM patient_details WHERE id = ${appointment.patient_id} LIMIT 1`;
      const doctorDetails = await sql`SELECT full_name FROM doctor_details WHERE id = ${appointment.doctor_id} LIMIT 1`;

      const patientName = patientDetails[0]?.full_name || "Patient";
      const doctorName = doctorDetails[0]?.full_name || "Doctor";
      const phoneNumber = patientUsers[0]?.phone_number;

      // In-App & FCM Push Notification for Patient upon Doctor Decision
      if (status === "approved") {
        await sendPushAndInAppNotification({
          user_id: appointment.patient_id,
          title: "Appointment Confirmed!",
          message: `Dr. ${doctorName} has confirmed your appointment on ${appointment.appointment_date} at ${appointment.appointment_time}.`,
          type: "appointment_confirmed",
          metadata: { appointment_id: appointment.id, doctor_id: appointment.doctor_id, doctor_name: doctorName }
        });
      } else if (status === "rejected") {
        await sendPushAndInAppNotification({
          user_id: appointment.patient_id,
          title: "Appointment Update",
          message: `Your appointment request with Dr. ${doctorName} for ${appointment.appointment_date} could not be accepted.`,
          type: "appointment_rejected",
          metadata: { appointment_id: appointment.id, doctor_id: appointment.doctor_id, doctor_name: doctorName }
        });
      }

      if (phoneNumber) {
        await sendAppointmentUpdateAlert({
          phone_number: phoneNumber,
          recipient_name: patientName,
          status_type: whatsappStatusType,
          appointment_code: "MCAPT-" + String(appointment.id).slice(0, 8).toUpperCase(),
          patient_name: patientName,
          doctor_or_service: "Dr. " + doctorName,
          date: appointment.appointment_date,
          time: appointment.appointment_time,
          location_or_mode: (appointment.appointment_type === "video_call" || appointment.appointment_type === "video_consultation" || appointment.appointment_type === "video") ? "Video Call" : (appointment.appointment_type === "home_visit" ? "Home Visit" : "Clinic Visit"),
          patient_id: appointment.patient_id
        });
      }
    } catch (err) {
      console.error("[NOTIFICATION ENGINE] Failed to send update status notification:", err.message);
    }
  })();

  // Audit log
  logAudit({
    entity_type: "appointment",
    entity_id: appointment_id,
    previous_state: { status: appointment.status },
    new_state: { status },
    changed_by: actorId,
    change_description: `Appointment ${status} by actor ${actorId}`,
  }).catch((err) => console.error("[Layer111] Audit log dropped:", err.message));

  // Activity log
  logActivity({
    patient_id: appointment.patient_id,
    care_episode_id: appointment.care_episode_id || null,
    actor_id: actorId,
    module_type: "consultation",
    action_type: `appointment_${status}`,
    reference_id: appointment_id,
    description: `Appointment ${status} for ${appointment.appointment_date} at ${appointment.appointment_time}`,
    metadata: { previous_status: appointment.status, new_status: status },
  }).catch((err) => console.error("[Layer111] Activity log dropped:", err.message));

  return updated;
}

/**
 * 7. RESCHEDULE_APPOINTMENT Action Router (Migrated to AWS RDS PostgreSQL)
 */
async function executeRescheduleAppointment(payload, actorId) {
  const { appointment_id, new_date, new_time } = payload;

  if (!appointment_id || !new_date || !new_time) {
    throw new Error("appointment_id, new_date, and new_time are required");
  }

  const appts = await sql`
    SELECT * FROM appointments WHERE id = ${appointment_id} LIMIT 1
  `;
  const appointment = appts[0];
  if (!appointment) throw new Error("Appointment not found.");

  // Check slot
  const slots = await sql`
    SELECT id FROM appointments
    WHERE doctor_id = ${appointment.doctor_id}
      AND appointment_date = ${new_date}
      AND appointment_time = ${new_time}
      AND status IN ('booked', 'approved')
      AND id != ${appointment_id}
    LIMIT 1
  `;
  if (slots.length > 0) throw new Error("This new slot is already booked.");

  const updatedRows = await sql`
    UPDATE appointments
    SET appointment_date = ${new_date},
        appointment_time = ${new_time},
        status = 'booked',
        updated_at = NOW()
    WHERE id = ${appointment_id}
    RETURNING *
  `;
  const updated = updatedRows[0];

  // Dispatch WhatsApp Rescheduled Template notification asynchronously
  (async () => {
    try {
      const patientUsers = await sql`SELECT phone_number FROM users WHERE id = ${appointment.patient_id} LIMIT 1`;
      const patientDetails = await sql`SELECT full_name FROM patient_details WHERE id = ${appointment.patient_id} LIMIT 1`;
      const doctorDetails = await sql`SELECT full_name FROM doctor_details WHERE id = ${appointment.doctor_id} LIMIT 1`;

      const patientName = patientDetails[0]?.full_name || "Patient";
      const doctorName = doctorDetails[0]?.full_name || "Doctor";
      const phoneNumber = patientUsers[0]?.phone_number;

      if (phoneNumber) {
        await sendAppointmentUpdateAlert({
          phone_number: phoneNumber,
          recipient_name: patientName,
          status_type: "rescheduled",
          appointment_code: "MCAPT-" + String(appointment.id).slice(0, 8).toUpperCase(),
          patient_name: patientName,
          doctor_or_service: "Dr. " + doctorName,
          date: new_date,
          time: new_time,
          location_or_mode: (appointment.appointment_type === "video_call" || appointment.appointment_type === "video_consultation" || appointment.appointment_type === "video") ? "Video Call" : (appointment.appointment_type === "home_visit" ? "Home Visit" : "Clinic Visit"),
          patient_id: appointment.patient_id
        });
      }
    } catch (err) {
      console.error("[WHATSAPP] Failed to send reschedule notification:", err.message);
    }
  })();

  // In-app and push notifications for both doctor and patient
  try {
    await sendPushAndInAppNotification({
      user_id: appointment.doctor_id,
      title: "Appointment Rescheduled",
      message: `Appointment has been rescheduled to ${new_date} at ${new_time}.`,
      type: "appointment_reschedule",
      metadata: { appointment_id, new_date, new_time, by_user: actorId }
    });
    await sendPushAndInAppNotification({
      user_id: appointment.patient_id,
      title: "Appointment Rescheduled",
      message: `Your appointment has been moved to ${new_date} at ${new_time}.`,
      type: "appointment_reschedule",
      metadata: { appointment_id, new_date, new_time, by_user: actorId }
    });
  } catch (notifErr) {
    console.error("[Layer111] Reschedule notification dropped:", notifErr.message);
  }

  return updated;
}

/**
 * 8. CANCEL_APPOINTMENT Action Router (Migrated to AWS RDS PostgreSQL)
 */
async function executeCancelAppointment(payload, actorId) {
  const { appointment_id } = payload;

  if (!appointment_id) throw new Error("appointment_id is required");

  const appts = await sql`
    SELECT * FROM appointments WHERE id = ${appointment_id} LIMIT 1
  `;
  const appointment = appts[0];
  if (!appointment) throw new Error("Appointment not found.");

  if (![appointment.doctor_id, appointment.patient_id].includes(actorId)) {
    throw new Error("Permission denied to cancel this appointment.");
  }

  // Dispatch WhatsApp Cancelled Template notification asynchronously to BOTH patient and doctor
  (async () => {
    try {
      const [patientUser, patientDetails, doctorUser, doctorDetails] = await Promise.all([
        sql`SELECT phone_number FROM users WHERE id = ${appointment.patient_id} LIMIT 1`,
        sql`SELECT full_name FROM patient_details WHERE id = ${appointment.patient_id} LIMIT 1`,
        sql`SELECT phone_number FROM users WHERE id = ${appointment.doctor_id} LIMIT 1`,
        sql`SELECT full_name FROM doctor_details WHERE id = ${appointment.doctor_id} LIMIT 1`,
      ]);

      const patientName = patientDetails[0]?.full_name || "Patient";
      const doctorName = doctorDetails[0]?.full_name || "Doctor";
      const appointmentCode = "MCAPT-" + String(appointment.id).slice(0, 8).toUpperCase();
      const locationOrMode =
        appointment.appointment_type === "video_call" ||
        appointment.appointment_type === "video_consultation" ||
        appointment.appointment_type === "video"
          ? "Video Call"
          : appointment.appointment_type === "home_visit"
          ? "Home Visit"
          : "Clinic Visit";

      // 1. Send WhatsApp message to Patient
      if (patientUser[0]?.phone_number) {
        await sendAppointmentUpdateAlert({
          phone_number: patientUser[0].phone_number,
          recipient_name: patientName,
          status_type: "cancelled",
          appointment_code: appointmentCode,
          patient_name: patientName,
          doctor_or_service: "Dr. " + doctorName,
          date: appointment.appointment_date,
          time: appointment.appointment_time,
          location_or_mode: locationOrMode,
          patient_id: appointment.patient_id,
        }).catch((err) => console.warn("[WHATSAPP] Patient cancel alert note:", err.message));
      }

      // 2. Send WhatsApp message to Doctor
      if (doctorUser[0]?.phone_number) {
        await sendAppointmentUpdateAlert({
          phone_number: doctorUser[0].phone_number,
          recipient_name: "Dr. " + doctorName,
          status_type: "cancelled",
          appointment_code: appointmentCode,
          patient_name: patientName,
          doctor_or_service: "Dr. " + doctorName,
          date: appointment.appointment_date,
          time: appointment.appointment_time,
          location_or_mode: locationOrMode,
          patient_id: null,
        }).catch((err) => console.warn("[WHATSAPP] Doctor cancel alert note:", err.message));
      }
    } catch (err) {
      console.error("[WHATSAPP] Failed to send cancel notification:", err.message);
    }
  })();

  const updatedRows = await sql`
    UPDATE appointments
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE id = ${appointment_id}
    RETURNING *
  `;
  const updatedAppointment = updatedRows[0];

  try {
    await sendPushAndInAppNotification({
      user_id: appointment.doctor_id,
      title: "Appointment Cancelled",
      message: `Appointment for ${appointment.appointment_date} at ${appointment.appointment_time} has been cancelled.`,
      type: "appointment_cancelled",
      metadata: { appointment_id, by_user: actorId }
    });
    await sendPushAndInAppNotification({
      user_id: appointment.patient_id,
      title: "Appointment Cancelled",
      message: `Your appointment for ${appointment.appointment_date} at ${appointment.appointment_time} has been cancelled.`,
      type: "appointment_cancelled",
      metadata: { appointment_id, by_user: actorId }
    });
  } catch (notifErr) {
    console.error("[Layer111] Cancel notification dropped:", notifErr.message);
  }

  // Note: if payment was made, could trigger outbox event for refund here
  if (appointment.payment_status === "paid") {
    const consultations = await sql`
      SELECT id FROM consultations WHERE appointment_id = ${appointment_id} LIMIT 1
    `;
    const consultation = consultations[0];

    await insertOutboxEvent({
      event_type: "PAYMENT_REFUND_REQUESTED",
      consultation_id: consultation?.id || null,
      care_episode_id: appointment.care_episode_id,
      consultation_type: "SYSTEM_RECOVERY",
      payload: { patient_id: appointment.patient_id, reason: "appointment_cancelled", amount: null }
    });
  }

  return { appointment_id, status: "cancelled", appointment: updatedAppointment };
}
