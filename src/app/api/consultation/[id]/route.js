import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * GET /api/consultation/[id]
 * Fetch patient-safe consultation data (excluding internal audit/incident flags).
 */
export async function GET(req, { params }) {
    try {
        const { id: consultation_id } = await params;

        if (!consultation_id) {
            return failure("consultation_id is required", null, 400);
        }

        // Fetch consultation core
        const { data: consultation, error: fetchErr } = await supabase
            .from("consultations")
            .select("id, patient_id, appointment_id, doctor_id, care_episode_id, case_status, consultation_mode, completed_at, final_clinical_version_id")
            .eq("id", consultation_id)
            .single();

        if (fetchErr || !consultation) {
            return failure("Consultation not found", null, 404);
        }

        // Fetch associated appointment's payment_status
        let paymentStatus = "pending";
        if (consultation.appointment_id) {
            const { data: appointment } = await supabase
                .from("appointments")
                .select("payment_status")
                .eq("id", consultation.appointment_id)
                .single();
            if (appointment) {
                paymentStatus = appointment.payment_status;
            }
        }

        // Fetch doctor info if assigned
        let doctorInfo = null;
        if (consultation.doctor_id) {
            const { data: doctor } = await supabase
                .from("doctor_details")
                .select("id, full_name, specialization, passport_photo")
                .eq("id", consultation.doctor_id)
                .single();
            if (doctor) {
                doctorInfo = {
                    ...doctor,
                    profile_picture: doctor.passport_photo
                };
            }
        }

        // Fetch final clinical data if completed
        let prescriptionAndAdvice = null;
        let diagnosis_id = null;

        if (consultation.final_clinical_version_id) {
            const { data: clinicalVersion } = await supabase
                .from("consultation_clinical_version")
                .select("snapshot_json")
                .eq("id", consultation.final_clinical_version_id)
                .single();

            if (clinicalVersion && clinicalVersion.snapshot_json) {
                const snapshot = clinicalVersion.snapshot_json;
                diagnosis_id = snapshot.diagnosis_id || null;
                prescriptionAndAdvice = {
                    medicines: snapshot.medicines || [],
                    lab_tests: snapshot.lab_tests || [],
                    advice: snapshot.advice || "",
                    follow_up_days: snapshot.follow_up_days || null
                };
            }
        }

        // Fetch current clinical draft if any
        const { data: clinicalDraft } = await supabase
            .from("consultation_clinical")
            .select("*")
            .eq("consultation_id", consultation_id)
            .maybeSingle();

        let draft = null;
        if (clinicalDraft) {
            const { data: draftMeds } = await supabase
                .from("consultation_medications")
                .select("*")
                .eq("consultation_id", consultation_id);

            draft = {
                symptoms: clinicalDraft.chief_complaint || "",
                diagnosis: clinicalDraft.diagnosis_id || "",
                notes: clinicalDraft.clinical_notes || "",
                vitals: clinicalDraft.vitals || {},
                prescriptions: (draftMeds || []).map(m => ({
                    medicine_name: m.medicine_name,
                    dosage: m.dosage,
                    frequency: m.frequency,
                    duration_days: m.duration,
                    instructions: m.instructions
                }))
            };
        }

        // Return curated patient-safe data
        return success("Consultation data fetched successfully", {
            consultation: {
                ...consultation,
                payment_status: paymentStatus,
                doctor: doctorInfo,
                prescription_and_advice: prescriptionAndAdvice,
                diagnosis_id,
                draft: draft
            }
        });

    } catch (err) {
        console.error("GET /api/consultation/[id] error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
