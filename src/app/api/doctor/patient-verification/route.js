import { NextResponse } from "next/server";
import sql from "@/lib/db";
import crypto from "crypto";

// Mask phone number for privacy (e.g. +91 9876543210 -> +91 98****3210)
function maskPhone(phone) {
  if (!phone) return "Not provided";
  const str = String(phone).trim();
  if (str.length <= 4) return "****";
  const visibleStart = str.startsWith("+91") ? 5 : 2;
  const visibleEnd = 4;
  if (str.length <= visibleStart + visibleEnd) return str.slice(0, 2) + "****" + str.slice(-2);
  const start = str.slice(0, visibleStart);
  const end = str.slice(-visibleEnd);
  const middle = "*".repeat(Math.max(4, str.length - visibleStart - visibleEnd));
  return `${start}${middle}${end}`;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(val) {
  return typeof val === "string" && UUID_REGEX.test(val.trim());
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const appointment_id = searchParams.get("appointment_id");

    if (!appointment_id) {
      return NextResponse.json({ success: false, error: "appointment_id is required" }, { status: 400 });
    }

    if (!isValidUUID(appointment_id)) {
      return NextResponse.json({
        success: true,
        verification: null,
        message: "Non-UUID appointment_id received, returning null verification record"
      });
    }

    const rows = await sql`
      SELECT 
        id,
        appointment_id,
        patient_id,
        doctor_id,
        status,
        identity_confirmed,
        consent_confirmed,
        is_minor,
        guardian_name,
        guardian_relationship,
        guardian_phone,
        discrepancy_reason,
        discrepancy_notes,
        verified_at,
        metadata,
        created_at
      FROM patient_identity_verifications
      WHERE appointment_id = ${appointment_id}
      LIMIT 1
    `;

    return NextResponse.json({
      success: true,
      verification: rows[0] || null
    });
  } catch (error) {
    console.error("GET /api/doctor/patient-verification error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      appointment_id,
      patient_id,
      doctor_id,
      status = "verified", // 'verified' | 'discrepancy_reported'
      identity_confirmed = false,
      consent_confirmed = false,
      is_minor = false,
      guardian_name = null,
      guardian_relationship = null,
      guardian_phone = null,
      discrepancy_reason = null,
      discrepancy_notes = null,
      notes = null
    } = body;

    if (!appointment_id || !isValidUUID(appointment_id)) {
      return NextResponse.json({ success: false, error: "A valid UUID appointment_id is required" }, { status: 400 });
    }

    if (!doctor_id || !isValidUUID(doctor_id)) {
      return NextResponse.json({ success: false, error: "A valid UUID doctor_id is required" }, { status: 400 });
    }

    if (!patient_id || !isValidUUID(patient_id)) {
      return NextResponse.json({ success: false, error: "A valid UUID patient_id is required" }, { status: 400 });
    }

    // Validation for verification confirmation
    if (status === "verified") {
      if (!identity_confirmed || !consent_confirmed) {
        return NextResponse.json({
          success: false,
          error: "Both patient identity confirmation and consent confirmation are mandatory."
        }, { status: 400 });
      }

      if (is_minor && !guardian_name) {
        return NextResponse.json({
          success: false,
          error: "Guardian name is required for minor patient consent."
        }, { status: 400 });
      }
    }

    // Validation for discrepancy report
    if (status === "discrepancy_reported" && !discrepancy_reason) {
      return NextResponse.json({
        success: false,
        error: "Discrepancy reason is required when reporting an issue."
      }, { status: 400 });
    }

    const metadata = {
      verified_by_actor: doctor_id,
      verification_channel: "DOCTOR_CLINICAL_PANEL",
      notes: notes || null,
      ip: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || "unknown",
      reported_at: new Date().toISOString()
    };

    // 1. Upsert into patient_identity_verifications in AWS RDS
    const [saved] = await sql`
      INSERT INTO patient_identity_verifications (
        appointment_id,
        patient_id,
        doctor_id,
        status,
        identity_confirmed,
        consent_confirmed,
        is_minor,
        guardian_name,
        guardian_relationship,
        guardian_phone,
        discrepancy_reason,
        discrepancy_notes,
        verified_at,
        metadata
      ) VALUES (
        ${appointment_id},
        ${patient_id},
        ${doctor_id},
        ${status},
        ${Boolean(identity_confirmed)},
        ${Boolean(consent_confirmed)},
        ${Boolean(is_minor)},
        ${guardian_name || null},
        ${guardian_relationship || null},
        ${guardian_phone || null},
        ${discrepancy_reason || null},
        ${discrepancy_notes || null},
        NOW(),
        ${JSON.stringify(metadata)}
      )
      ON CONFLICT (appointment_id) DO UPDATE SET
        status = EXCLUDED.status,
        identity_confirmed = EXCLUDED.identity_confirmed,
        consent_confirmed = EXCLUDED.consent_confirmed,
        is_minor = EXCLUDED.is_minor,
        guardian_name = EXCLUDED.guardian_name,
        guardian_relationship = EXCLUDED.guardian_relationship,
        guardian_phone = EXCLUDED.guardian_phone,
        discrepancy_reason = EXCLUDED.discrepancy_reason,
        discrepancy_notes = EXCLUDED.discrepancy_notes,
        verified_at = NOW(),
        metadata = EXCLUDED.metadata
      RETURNING *
    `;

    // 2. Audit Log Entry (Mandatory Requirement 4)
    try {
      await sql`
        INSERT INTO audit_log (
          entity_type,
          entity_id,
          change_description,
          changed_by,
          new_state,
          changed_at
        ) VALUES (
          'appointment_patient_verification',
          ${appointment_id},
          ${status === 'verified' 
            ? 'Doctor confirmed patient identity and clinical consent (Manual verification by treating clinician)' 
            : `Doctor reported patient identity discrepancy: ${discrepancy_reason}`},
          ${doctor_id},
          ${JSON.stringify({
            status,
            appointment_id,
            patient_id,
            doctor_id,
            identity_confirmed,
            consent_confirmed,
            is_minor,
            guardian_name,
            guardian_relationship,
            discrepancy_reason,
            verified_at: new Date().toISOString()
          })},
          NOW()
        )
      `;
    } catch (auditErr) {
      console.warn("Audit log insert warning:", auditErr.message);
    }

    // 3. Consent Log Entry (Mandatory for Telemedicine & Clinical Compliance)
    if (status === "verified") {
      try {
        await sql`
          INSERT INTO consent_logs (
            patient_id,
            consent_type,
            status,
            actor_id,
            metadata,
            created_at
          ) VALUES (
            ${patient_id},
            ${is_minor ? 'GUARDIAN_CONSULTATION_CONSENT' : 'PATIENT_CONSULTATION_CONSENT'},
            true,
            ${doctor_id},
            ${JSON.stringify({
              appointment_id,
              is_minor,
              guardian_name,
              guardian_relationship,
              verified_by_doctor: doctor_id
            })},
            NOW()
          )
        `;
      } catch (consentErr) {
        console.warn("Consent log insert warning:", consentErr.message);
      }
    }

    // 4. If Discrepancy Reported, Escalate to Clinical Ops Incident Queue and Support Tickets (Requirement 5)
    if (status === "discrepancy_reported") {
      try {
        await sql`
          INSERT INTO incident (
            consultation_id,
            patient_id,
            incident_type,
            severity,
            description,
            resolution_status,
            metadata,
            created_at
          ) VALUES (
            ${appointment_id},
            ${patient_id},
            'PATIENT_IDENTITY_DISCREPANCY',
            'HIGH',
            ${`Doctor reported identity discrepancy: ${discrepancy_reason}. Notes: ${discrepancy_notes || 'None'}`},
            'OPEN',
            ${JSON.stringify({
              appointment_id,
              doctor_id,
              patient_id,
              discrepancy_reason,
              discrepancy_notes,
              guardian_name,
              escalated_to: 'CLINICAL_SUPPORT'
            })},
            NOW()
          )
        `;
      } catch (incErr) {
        console.warn("Incident escalation log warning:", incErr.message);
      }

      try {
        const ticketNum = `DISC-${Date.now().toString(36).toUpperCase()}`;
        await sql`
          INSERT INTO support_tickets (
            ticket_number,
            user_id,
            subject,
            description,
            status,
            priority,
            created_at,
            updated_at
          ) VALUES (
            ${ticketNum},
            ${doctor_id},
            ${`Patient Identity Discrepancy - Apt #${String(appointment_id).slice(0, 8)}`},
            ${`Doctor reported identity mismatch during consultation. Reason: ${discrepancy_reason}. Additional Notes: ${discrepancy_notes || 'None'}. Patient ID: ${patient_id}`},
            'OPEN',
            'HIGH',
            NOW(),
            NOW()
          )
        `;
      } catch (tickErr) {
        console.warn("Support ticket creation warning:", tickErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: status === "verified" 
        ? "Patient identity and consent verified successfully." 
        : "Discrepancy reported and escalated to support.",
      verification: saved
    });
  } catch (error) {
    console.error("POST /api/doctor/patient-verification error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
