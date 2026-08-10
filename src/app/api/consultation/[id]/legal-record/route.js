/**
 * API: Consultation Legal Record Export
 * 
 * GET /api/consultation/[id]/legal-record
 * 
 * Returns the complete legal record for a consultation (PDF Part 3):
 * - Consultation metadata
 * - Final clinical version (immutable snapshot)
 * - All clinical versions (audit trail)
 * - Prescription with medications
 * - Safety flags and overrides
 * - Prescription validation log
 * - Consent records
 * - Doctor session agreement
 * - Full audit trail
 * 
 * This is the legally binding record used for disputes, audits, and compliance.
 */

import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET(req, { params }) {
    try {
        const { id: consultation_id } = await params;

        if (!consultation_id) {
            return failure("consultation_id is required");
        }

        // ── 1. Consultation metadata ──
        // The frontend may pass either a consultation_id OR an appointment_id.
        // Try direct id lookup first, then fall back to appointment_id.
        let consultation = null;

        const { data: byId, error: errById } = await supabase
            .from("consultations")
            .select("*")
            .eq("id", consultation_id)
            .maybeSingle();

        if (!errById && byId) {
            consultation = byId;
        } else {
            // Fallback: the caller passed an appointment_id
            const { data: byAppt } = await supabase
                .from("consultations")
                .select("*")
                .eq("appointment_id", consultation_id)
                .maybeSingle();
            consultation = byAppt || null;
        }

        if (!consultation) {
            // Build legal record directly from appointment + prescription (if any)
            const apptRes = await supabase
                .from("appointments")
                .select("id, appointment_date, appointment_time, status, patient_id, doctor_id, disease_info, created_at, unid, care_episode_id")
                .eq("id", consultation_id)
                .maybeSingle();

            const apptRow = apptRes.data;

            if (!apptRow) {
                return failure("Appointment not found", null, 404);
            }

            // Collect all appointment IDs in the care episode
            let allApptIds = [apptRow.id];
            if (apptRow.care_episode_id) {
                const { data: episodeAppts } = await supabase
                    .from("appointments")
                    .select("id")
                    .eq("care_episode_id", apptRow.care_episode_id);
                if (episodeAppts && episodeAppts.length > 0) {
                    allApptIds = episodeAppts.map(a => a.id);
                }
            }

            // Fetch the most recent prescription across the whole episode
            const { data: apptPrescription } = await supabase
                .from("prescriptions")
                .select("*")
                .in("appointment_id", allApptIds)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            // Fetch prescription appointment details (may differ from clicked appt)
            let prescriptionAppt = apptRow;
            if (apptPrescription && apptPrescription.appointment_id !== apptRow.id) {
                const { data: rxApptData } = await supabase
                    .from("appointments")
                    .select("id, appointment_date, appointment_time, status, patient_id, doctor_id, disease_info, created_at, unid")
                    .eq("id", apptPrescription.appointment_id)
                    .maybeSingle();
                if (rxApptData) prescriptionAppt = rxApptData;
            }

            const [patRes, docRes, docUserRes, patUserRes] = await Promise.all([
                supabase.from("patient_details").select("id, full_name, gender, date_of_birth, blood_group").eq("id", apptRow.patient_id).maybeSingle(),
                supabase.from("doctor_details").select("id, full_name, specialization, license_number, qualification, council_name, clinic_name, clinic_address, signature_url").eq("id", apptRow.doctor_id).maybeSingle(),
                supabase.from("users").select("un_id").eq("id", apptRow.doctor_id).maybeSingle(),
                supabase.from("users").select("un_id").eq("id", apptRow.patient_id).maybeSingle(),
            ]);

            const docData = docRes.data || null;
            const patData = patRes.data || null;
            if (docData) docData.un_id = docUserRes.data?.un_id;
            if (patData) patData.un_id = patUserRes.data?.un_id;

            return success("Legal record exported", {
                record_metadata: {
                    generated_at: new Date().toISOString(),
                    consultation_id,
                    record_type: "APPOINTMENT_LEGAL_EXPORT",
                    version: "1.0",
                    disclaimer: "This is a legally binding medical record. Any tampering is prosecutable under applicable law.",
                },
                consultation: {
                    id: prescriptionAppt.id,
                    appointment_date: prescriptionAppt.appointment_date,
                    appointment_time: prescriptionAppt.appointment_time,
                    status: prescriptionAppt.status,
                    patient_id: prescriptionAppt.patient_id,
                    doctor_id: prescriptionAppt.doctor_id,
                    disease_info: prescriptionAppt.disease_info,
                    created_at: prescriptionAppt.created_at,
                },
                appointment: prescriptionAppt,
                doctor: docData,
                patient: patData,
                prescriptions: apptPrescription ? [apptPrescription] : [],
                medications: apptPrescription?.medicines || [],
                clinical_record: null,
                final_clinical_snapshot: null,
                clinical_version_history: [],
                symptoms: [],
                safety_flags: [],
                clinical_risk_flags: [],
                validation_logs: [],
                consent_records: [],
                doctor_session_agreement: null,
                audit_trail: [],
            });
        }

        // ── 2. Doctor details ──
        const { data: doctor } = await supabase
            .from("doctor_details")
            .select("id, full_name, specialization, license_number, qualification, council_name, registration_verified, kyc_status, clinic_name, clinic_address")
            .eq("id", consultation.doctor_id)
            .single();

        // ── 3. Patient details (masked for legal) ──
        const { data: patient } = await supabase
            .from("patient_details")
            .select("id, full_name, gender, date_of_birth, blood_group")
            .eq("id", consultation.patient_id)
            .single();
            
        // ── 3.5 Appointment details ──
        const apptRes = await supabase
            .from("appointments")
            .select("id, appointment_date, appointment_time, status, disease_info, created_at, unid, care_episode_id")
            .eq("id", consultation.appointment_id || consultation_id)
            .maybeSingle();

        const { data: apptData, error: apptError } = apptRes;
        if (apptError) throw apptError;
        if (!apptData) {
            return NextResponse.json({ success: false, message: "Record not found" }, { status: 404 });
        }

        // If we have a care_episode_id, fetch all appointments in this episode
        let allApptIds = [apptData.id];
        if (apptData.care_episode_id) {
            const { data: episodeAppts } = await supabase
                .from("appointments")
                .select("id")
                .eq("care_episode_id", apptData.care_episode_id);
            if (episodeAppts && episodeAppts.length > 0) {
                allApptIds = episodeAppts.map(a => a.id);
            }
        }

        let { data: rxList } = await supabase
            .from("prescriptions")
            .select("id, unid, appointment_id, doctor_id, patient_id, medicines, lab_tests, special_message, created_at, updated_at, investigations, vital_signs, follow_up, special_instructions, diagnosis, examination_findings")
            .in("appointment_id", allApptIds)
            .order("created_at", { ascending: false });

        // ── 3.8 Fetch un_id from users table ──
        const [docUserRes, patUserRes] = await Promise.all([
            supabase.from("users").select("un_id").eq("id", consultation.doctor_id).maybeSingle(),
            supabase.from("users").select("un_id").eq("id", consultation.patient_id).maybeSingle(),
        ]);
        if (doctor) doctor.un_id = docUserRes.data?.un_id;
        if (patient) patient.un_id = patUserRes.data?.un_id;

        // ── 4. Clinical record ──
        const { data: clinical } = await supabase
            .from("consultation_clinical")
            .select("*")
            .eq("consultation_id", consultation_id)
            .single();

        // ── 5. All clinical versions (audit trail) ──
        const { data: clinicalVersions } = await supabase
            .from("consultation_clinical_version")
            .select("*")
            .eq("consultation_id", consultation_id)
            .order("created_at", { ascending: true });

        // ── 6. Final clinical version snapshot ──
        let finalVersion = null;
        if (consultation.final_clinical_version_id) {
            const { data } = await supabase
                .from("consultation_clinical_version")
                .select("*")
                .eq("id", consultation.final_clinical_version_id)
                .single();
            finalVersion = data;
        } else if (clinicalVersions && clinicalVersions.length > 0) {
            // Use the last version as final
            finalVersion = clinicalVersions[clinicalVersions.length - 1];
        }

        // ── 7. Symptoms ──
        const { data: symptoms } = await supabase
            .from("consultation_symptoms")
            .select("*")
            .eq("consultation_id", consultation_id);

        // ── 8. Medications ──
        const { data: medications } = await supabase
            .from("consultation_medications")
            .select("*")
            .eq("consultation_id", consultation_id);

        // ── 9. Prescription (use care-episode rxList fetched above) ──
        const prescriptions = rxList || [];

        // ── 10. Safety flags & overrides ──
        const { data: safetyFlags } = await supabase
            .from("consultation_flags")
            .select("*")
            .eq("consultation_id", consultation_id)
            .order("created_at", { ascending: true });

        // ── 11. Clinical risk flags ──
        const { data: riskFlags } = await supabase
            .from("clinical_risk_flags")
            .select("*")
            .eq("consultation_id", consultation_id);

        // ── 12. Prescription validation log ──
        const { data: validationLogs } = await supabase
            .from("prescription_validation_log")
            .select("*")
            .eq("consultation_id", consultation_id)
            .order("created_at", { ascending: true });

        // ── 13. Consent records (Layer-111 DPDP patient_consent_log) ──
        const { data: consentLogs } = await supabase
            .from("patient_consent_log")
            .select("consent_type, granted_at, revoked_at, is_active, consent_snapshot")
            .eq("patient_id", consultation.patient_id);

        // ── 14. Doctor session agreement (for that day) ──
        let consultDate = "";
        if (consultation.created_at) {
            consultDate = typeof consultation.created_at === "string" 
                ? consultation.created_at.split("T")[0]
                : new Date(consultation.created_at).toISOString().split("T")[0];
        }
        const { data: sessionAgreement } = await supabase
            .from("doctor_session_agreement")
            .select("*")
            .eq("doctor_id", consultation.doctor_id)
            .eq("session_date", consultDate)
            .single();

        // ── 15. Full audit trail ──
        const { data: auditTrail } = await supabase
            .from("audit_log")
            .select("*")
            .eq("entity_type", "consultation")
            .eq("entity_id", consultation_id)
            .order("changed_at", { ascending: true });

        // ── Build legal record ──
        const legalRecord = {
            record_metadata: {
                generated_at: new Date().toISOString(),
                consultation_id,
                record_type: "LEGAL_EXPORT",
                version: "1.0",
                disclaimer: "This is a legally binding medical record. Any tampering is prosecutable under applicable law.",
            },
            consultation,
            appointment: apptData || null,
            doctor,
            patient,
            clinical_record: clinical,
            final_clinical_snapshot: finalVersion,
            clinical_version_history: clinicalVersions || [],
            symptoms: symptoms || [],
            medications: medications || [],
            prescriptions: prescriptions || [],
            safety_flags: safetyFlags || [],
            clinical_risk_flags: riskFlags || [],
            validation_logs: validationLogs || [],
            consent_records: consentLogs || [],
            doctor_session_agreement: sessionAgreement,
            audit_trail: auditTrail || [],
        };

        // ── Log the access ──
        await supabase
            .from("data_access_log")
            .insert({
                patient_id: consultation.patient_id,
                action_type: "export",
                status: "completed",
                metadata: {
                    export_type: "legal_record",
                    consultation_id,
                    exported_at: new Date().toISOString(),
                },
            });

        return success("Legal record exported", legalRecord);

    } catch (err) {
        console.error("GET /api/consultation/[id]/legal-record error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
