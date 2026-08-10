/**
 * LAYER-111: Execution Router
 * 
 * Routes specific orchestration actions securely to target service controllers.
 * Serves as the isolated router between the entry Control Layer and internal business logic.
 */

import { supabase } from "../supabaseAdmin";
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
  const { data: doctorDetails } = await supabase
    .from("doctor_details")
    .select("consultation_fee, meta, full_name")
    .eq("id", doctor_id)
    .single();

  const meta = doctorDetails?.meta || {};
  const fee = appointment_type === "video" || appointment_type === "video_consultation"
    ? (meta?.video_consultation_fee ?? doctorDetails?.consultation_fee ?? 0)
    : appointment_type === "clinic_visit"
      ? (meta?.clinic_consultation_fee ?? doctorDetails?.consultation_fee ?? 0)
      : (meta?.home_visit_fee ?? doctorDetails?.consultation_fee ?? 0);

  // Prevent duplicate booking for the same slot
  const { data: existingAppt } = await supabase
    .from("appointments")
    .select("id")
    .eq("doctor_id", doctor_id)
    .eq("appointment_date", appointment_date)
    .eq("appointment_time", appointment_time)
    .neq("status", "cancelled")
    .neq("status", "rejected")
    .maybeSingle();

  if (existingAppt) {
    throw new Error("This appointment slot is already booked. Please choose a different time.");
  }

  // Insert appointment
  const { data: appointment, error: insertErr } = await supabase
    .from("appointments")
    .insert([
      {
        doctor_id,
        patient_id,
        screening_id,
        appointment_date,
        appointment_time,
        appointment_type: appointment_type || "clinic_visit",
        disease_info,
        razorpay_order_id: razorpay_order_id || null,
        razorpay_payment_id: payment_id || null,
        status: "booked",
        payment_status: payment_id ? "paid" : (fee > 0 ? "pending" : "not_applicable"),
        care_episode_id: careEpisodeId,
        clinic_name: clinic_name || null,
        clinic_address: clinic_address || null,
      }
    ])
    .select()
    .single();

  if (insertErr) throw insertErr;

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
      const { data: patientUser } = await supabase
        .from("users")
        .select("phone_number")
        .eq("id", patient_id)
        .single();

      const { data: patientDetails } = await supabase
        .from("patient_details")
        .select("full_name")
        .eq("id", patient_id)
        .single();

      const patientName = patientDetails?.full_name || "Patient";
      const doctorName = doctorDetails?.full_name || "Doctor";
      const phoneNumber = patientUser?.phone_number;

      // 1. In-App & FCM Push Notification for Patient
      await sendPushAndInAppNotification({
        user_id: patient_id,
        title: "Appointment Booked Successfully!",
        message: `Your appointment with Dr. ${doctorName} on ${appointment_date} at ${appointment_time} is confirmed.`,
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
          appointment_code: "MCAPT-" + appointment.id.slice(0, 8).toUpperCase(),
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
  const { data: consultation, error: consultErr } = await supabase
    .from("consultations")
    .insert({
      appointment_id: appointment.id,
      patient_id,
      doctor_id,
      care_episode_id: careEpisodeId,
      case_status: "STARTED",
      consultation_mode:
        (appointment_type === "video_call" || appointment_type === "video_consultation" || appointment_type === "video")
          ? "VIDEO"
          : "IN_PERSON",
      is_active: true
    })
    .select()
    .single();

  if (consultErr) throw consultErr;

  // Financial Ledger recording
  if (fee > 0) {
    await createLedgerEntry({
      patient_id,
      care_episode_id: careEpisodeId,
      service_type: "consultation",
      reference_id: appointment.id,
      debit_credit: "debit",
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

  const { data: appointment, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointment_id)
    .single();

  if (error || !appointment) throw new Error("Appointment not found.");

  const { data: updated, error: updateErr } = await supabase
    .from("appointments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", appointment_id)
    .select("*")
    .single();

  if (updateErr) throw new Error(`Update failed: ${updateErr.message}`);

  // Dispatch WhatsApp Status Mapped notification asynchronously
  (async () => {
    try {
      let whatsappStatusType = status;
      if (status === "approved") whatsappStatusType = "confirmed";

      const { data: patientUser } = await supabase
        .from("users")
        .select("phone_number")
        .eq("id", appointment.patient_id)
        .single();

      const { data: patientDetails } = await supabase
        .from("patient_details")
        .select("full_name")
        .eq("id", appointment.patient_id)
        .single();

      const { data: doctorDetails } = await supabase
        .from("doctor_details")
        .select("full_name")
        .eq("id", appointment.doctor_id)
        .single();

      const patientName = patientDetails?.full_name || "Patient";
      const doctorName = doctorDetails?.full_name || "Doctor";
      const phoneNumber = patientUser?.phone_number;

      if (phoneNumber) {
        await sendAppointmentUpdateAlert({
          phone_number: phoneNumber,
          recipient_name: patientName,
          status_type: whatsappStatusType,
          appointment_code: "MCAPT-" + appointment.id.slice(0, 8).toUpperCase(),
          patient_name: patientName,
          doctor_or_service: "Dr. " + doctorName,
          date: appointment.appointment_date,
          time: appointment.appointment_time,
          location_or_mode: (appointment.appointment_type === "video_call" || appointment.appointment_type === "video_consultation" || appointment.appointment_type === "video") ? "Video Call" : (appointment.appointment_type === "home_visit" ? "Home Visit" : "Clinic Visit"),
          patient_id: appointment.patient_id
        });
      }
    } catch (err) {
      console.error("[WHATSAPP] Failed to send update status notification:", err.message);
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

  // Notification for patient
  const { error: notifErr } = await supabase.from("notifications").insert({
    user_id: appointment.patient_id,
    title: `Appointment ${status === "approved" ? "Approved" : "Rejected"}`,
    message: `Your appointment for ${appointment.appointment_date} at ${appointment.appointment_time} has been ${status}.`,
    type: "appointment_status",
    metadata: { appointment_id, status, by_user: actorId }
  });
  if (notifErr) {
    console.error("[Layer111] Notification dropped:", notifErr.message);
  }

  return updated;
}

/**
 * 7. RESCHEDULE_APPOINTMENT Action Router
 */
async function executeRescheduleAppointment(payload, actorId) {
  const { appointment_id, new_date, new_time } = payload;

  if (!appointment_id || !new_date || !new_time) {
    throw new Error("appointment_id, new_date, and new_time are required");
  }

  const { data: appointment, error: fetchErr } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointment_id)
    .single();

  if (fetchErr || !appointment) throw new Error("Appointment not found.");

  // Check slot
  const { data: slot, error: slotErr } = await supabase
    .from("appointments")
    .select("id")
    .eq("doctor_id", appointment.doctor_id)
    .eq("appointment_date", new_date)
    .eq("appointment_time", new_time)
    .in("status", ["booked", "approved"])
    .maybeSingle();

  if (slotErr) throw new Error(`Slot check failed: ${slotErr.message}`);
  if (slot) throw new Error("This new slot is already booked.");

  const { data: updated, error: updateErr } = await supabase
    .from("appointments")
    .update({
      appointment_date: new_date,
      appointment_time: new_time,
      updated_at: new Date().toISOString(),
      status: "booked" // Reset to booked if rescheduled
    })
    .eq("id", appointment_id)
    .select("*")
    .single();

  if (updateErr) throw new Error(`Reschedule failed: ${updateErr.message}`);

  // Dispatch WhatsApp Rescheduled Template notification asynchronously
  (async () => {
    try {
      const { data: patientUser } = await supabase
        .from("users")
        .select("phone_number")
        .eq("id", appointment.patient_id)
        .single();

      const { data: patientDetails } = await supabase
        .from("patient_details")
        .select("full_name")
        .eq("id", appointment.patient_id)
        .single();

      const { data: doctorDetails } = await supabase
        .from("doctor_details")
        .select("full_name")
        .eq("id", appointment.doctor_id)
        .single();

      const patientName = patientDetails?.full_name || "Patient";
      const doctorName = doctorDetails?.full_name || "Doctor";
      const phoneNumber = patientUser?.phone_number;

      if (phoneNumber) {
        await sendAppointmentUpdateAlert({
          phone_number: phoneNumber,
          recipient_name: patientName,
          status_type: "rescheduled",
          appointment_code: "MCAPT-" + appointment.id.slice(0, 8).toUpperCase(),
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


  const notifications = [
    {
      user_id: appointment.doctor_id,
      title: "Appointment Rescheduled",
      message: `Appointment has been rescheduled to ${new_date} at ${new_time}.`,
      type: "appointment_reschedule",
      metadata: { appointment_id, new_date, new_time, by_user: actorId }
    },
    {
      user_id: appointment.patient_id,
      title: "Appointment Rescheduled",
      message: `Your appointment has been moved to ${new_date} at ${new_time}.`,
      type: "appointment_reschedule",
      metadata: { appointment_id, new_date, new_time, by_user: actorId }
    }
  ];

  const { error: notifErr2 } = await supabase.from("notifications").insert(notifications);
  if (notifErr2) {
    console.error("[Layer111] Notification dropped:", notifErr2.message);
  }

  return updated;
}

/**
 * 8. CANCEL_APPOINTMENT Action Router
 */
async function executeCancelAppointment(payload, actorId) {
  const { appointment_id } = payload;

  if (!appointment_id) throw new Error("appointment_id is required");

  const { data: appointment, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointment_id)
    .single();

  if (error || !appointment) throw new Error("Appointment not found.");

  if (![appointment.doctor_id, appointment.patient_id].includes(actorId)) {
    throw new Error("Permission denied to cancel this appointment.");
  }

  // Dispatch WhatsApp Cancelled Template notification asynchronously before database row is deleted
  (async () => {
    try {
      const { data: patientUser } = await supabase
        .from("users")
        .select("phone_number")
        .eq("id", appointment.patient_id)
        .single();

      const { data: patientDetails } = await supabase
        .from("patient_details")
        .select("full_name")
        .eq("id", appointment.patient_id)
        .single();

      const { data: doctorDetails } = await supabase
        .from("doctor_details")
        .select("full_name")
        .eq("id", appointment.doctor_id)
        .single();

      const patientName = patientDetails?.full_name || "Patient";
      const doctorName = doctorDetails?.full_name || "Doctor";
      const phoneNumber = patientUser?.phone_number;

      if (phoneNumber) {
        await sendAppointmentUpdateAlert({
          phone_number: phoneNumber,
          recipient_name: patientName,
          status_type: "cancelled",
          appointment_code: "MCAPT-" + appointment.id.slice(0, 8).toUpperCase(),
          patient_name: patientName,
          doctor_or_service: "Dr. " + doctorName,
          date: appointment.appointment_date,
          time: appointment.appointment_time,
          location_or_mode: (appointment.appointment_type === "video_call" || appointment.appointment_type === "video_consultation" || appointment.appointment_type === "video") ? "Video Call" : (appointment.appointment_type === "home_visit" ? "Home Visit" : "Clinic Visit"),
          patient_id: appointment.patient_id
        });
      }
    } catch (err) {
      console.error("[WHATSAPP] Failed to send cancel notification:", err.message);
    }
  })();

  const { error: deleteErr } = await supabase
    .from("appointments")
    .delete()
    .eq("id", appointment_id);

  if (deleteErr) throw new Error(`Delete failed: ${deleteErr.message}`);


  const notifications = [
    {
      user_id: appointment.doctor_id,
      title: "Appointment Cancelled",
      message: `Appointment for ${appointment.appointment_date} at ${appointment.appointment_time} has been cancelled.`,
      type: "appointment_delete",
      metadata: { appointment_id, by_user: actorId }
    },
    {
      user_id: appointment.patient_id,
      title: "Appointment Cancelled",
      message: `Your appointment for ${appointment.appointment_date} at ${appointment.appointment_time} has been cancelled.`,
      type: "appointment_delete",
      metadata: { appointment_id, by_user: actorId }
    }
  ];

  const { error: notifErr3 } = await supabase.from("notifications").insert(notifications);
  if (notifErr3) {
    console.error("[Layer111] Notification dropped:", notifErr3.message);
  }

  // Note: if payment was made, could trigger outbox event for refund here
  if (appointment.payment_status === "paid") {
    const { data: consultation } = await supabase
      .from("consultations")
      .select("id")
      .eq("appointment_id", appointment_id)
      .single();

    await insertOutboxEvent({
      event_type: "PAYMENT_REFUND_REQUESTED",
      consultation_id: consultation?.id || null,
      care_episode_id: appointment.care_episode_id,
      consultation_type: "SYSTEM_RECOVERY",
      payload: { patient_id: appointment.patient_id, reason: "appointment_cancelled", amount: null } // Amount handled by refund engine lookup
    });
  }

  return { deleted_id: appointment_id, status: "CANCELLED" };
}
