import { success, failure } from "@/lib/response";
import { supabase, sql } from "@/lib/supabaseAdmin";
import { evaluateCTA } from "@/lib/layer1/engagementEngine";

/**
 * GET /api/user/next-step
 * Deterministic Next Step Engine & Revenue Leak Recovery
 * Ensures only ONE primary CTA is returned based on the user's latest care episode and funnel state.
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const user_id = searchParams.get("user_id");

        if (!user_id) {
            return failure("user_id is required", null, 400);
        }

        // 1. Fetch latest care episode
        const episodes = await sql`
            SELECT id, status, episode_type, created_at 
            FROM care_episodes 
            WHERE patient_id = ${user_id} AND status = 'active'
            ORDER BY created_at DESC 
            LIMIT 1
        `;
        const episode = episodes[0];

        if (!episode) {
            return success("No active episodes", { next_action: "NONE" });
        }

        const care_episode_id = episode.id;

        // Fetch related entities safely using direct AWS RDS queries
        const [
            consultations,
            payments,
            patientConsents,
            services,
            pharmacyOrders,
            labOrders,
            appointments
        ] = await Promise.all([
            sql`SELECT id, appointment_id, case_status, doctor_id, completed_at, follow_up_required, created_at FROM consultations WHERE care_episode_id = ${care_episode_id} ORDER BY created_at DESC`,
            sql`SELECT id, status, created_at, amount FROM financial_transaction_log WHERE care_episode_id = ${care_episode_id} AND service_type = 'consultation' ORDER BY created_at DESC`,
            sql`SELECT consent_type, is_active FROM patient_consent_log WHERE patient_id = ${user_id}`,
            sql`SELECT service_type, priority FROM service_recommendation WHERE diagnosis_id = ${care_episode_id} OR problem_id = ${care_episode_id}`,
            sql`SELECT id, status FROM medicine_orders WHERE patient_id = ${user_id} AND created_at >= ${episode.created_at}`,
            sql`SELECT id, status FROM lab_test_orders WHERE care_episode_id = ${care_episode_id}`,
            sql`SELECT id, payment_status, status FROM appointments WHERE care_episode_id = ${care_episode_id}`
        ]);

        const latestConsultation = consultations?.[0];
        if (latestConsultation && appointments) {
            const appt = appointments.find(a => a.id === latestConsultation.appointment_id);
            const isFreeOrPaid = appt && ["paid", "completed", "free"].includes(String(appt.payment_status || "").toLowerCase());
            latestConsultation.payment_status = isFreeOrPaid ? "paid" : (appt ? appt.payment_status : "pending");
        }
        const latestPayment = payments?.[0];

        let rawAction = "NONE";
        let priority = 10;
        let responsePayload = { care_episode_id };

        // ── DETERMINISTIC STATE EVALUATION (Priority Ordered) ──

        const REQUIRED_CONSENTS = [
            "CONSULTATION_CONSENT",
            "TELEMEDICINE_CONSENT",
            "DATA_PROCESSING_CONSENT",
            "PRESCRIPTION_CONSENT",
        ];

        const grantedTypes = (patientConsents || [])
            .filter(c => c.is_active)
            .map(c => c.consent_type);

        const allConsentsGranted = REQUIRED_CONSENTS.every(type => grantedTypes.includes(type));

        const now = new Date();

        // 1. Consent Check
        if (!allConsentsGranted) {
            rawAction = "CONSENT_REQUIRED";
            priority = 1;
        }

        // 2. Consultation in progress
        else if (latestConsultation && !latestConsultation.completed_at && (latestConsultation.case_status === "STARTED" || latestConsultation.case_status === "ACTIVE")) {
            const createdTime = new Date(latestConsultation.created_at || now);
            const isStale = (now - createdTime) > 15 * 60 * 1000; // 15 minutes timeout

            if (!isStale) {
                if (!latestConsultation.doctor_id) {
                    rawAction = "WAIT_FOR_DOCTOR";
                    responsePayload.consultation_id = latestConsultation.id;
                } else {
                    rawAction = "RESUME_SESSION";
                    responsePayload.consultation_id = latestConsultation.id;
                }
                priority = 1;
            }
        }

        // 3. Revenue Leak Scenarios
        else {

            // 3a. Consultation Completed but not paid
            if (latestConsultation && latestConsultation.case_status === "COMPLETED" && (latestConsultation.payment_status === "failed" || latestConsultation.payment_status === "pending")) {
                const completedAt = new Date(latestConsultation.completed_at);
                if ((now - completedAt) > 60000) { // 60 seconds
                    rawAction = "COMPLETE_PAYMENT";
                    responsePayload.consultation_id = latestConsultation.id;
                    priority = 2;
                }
            }

            // 3b. Payment Success but no service generated (Wait 2 minutes)
            else if (latestPayment && latestPayment.status === "success" && !latestConsultation) {
                const paidAt = new Date(latestPayment.created_at);
                if ((now - paidAt) > 120000) {
                    rawAction = "START_CONSULTATION";
                    responsePayload.appointment_id = latestPayment.reference_id;
                    priority = 1;
                }
            }

            // 4. Service Recommendations (Prescription/Lab)
            else if (latestConsultation && latestConsultation.case_status === "COMPLETED") {
                const hasPharmacyRec = services?.find(s => s.service_type === "pharmacy");
                const hasLabRec = services?.find(s => s.service_type === "lab");

                const validMedStatuses = ["pending", "sent_to_chemist", "approved", "payment_submitted", "ready_for_pickup", "out_for_delivery", "completed", "payment_pending"];
                const hasPharmacyOrder = pharmacyOrders && pharmacyOrders.some(mo => validMedStatuses.includes(mo.status));
                const hasLabOrder = labOrders && labOrders.length > 0;

                responsePayload.consultation_id = latestConsultation.id;

                if (hasPharmacyRec && !hasPharmacyOrder) {
                    rawAction = "ORDER_PHARMACY";
                    priority = 3;
                }
                else if (hasLabRec && !hasLabOrder) {
                    rawAction = "BOOK_LAB";
                    priority = 4;
                }
                // 5. Follow-up Check
                else if (latestConsultation.follow_up_required) {
                    const followups = await sql`
                        SELECT id FROM appointments 
                        WHERE care_episode_id = ${care_episode_id} 
                          AND appointment_type = 'follow_up' 
                        LIMIT 1
                    `;
                    const followup = followups[0];

                    if (!followup) {
                        rawAction = "BOOK_FOLLOWUP";
                        priority = 5;
                    } else {
                        rawAction = "NONE";
                    }
                }
                else {
                    rawAction = "NONE";
                }
            }
        }

        // ── ENGAGEMENT ENGINE FILTER ──
        if (rawAction !== "NONE") {
            const { decision, intensity } = await evaluateCTA(user_id, rawAction, priority);
            
            responsePayload.decision = decision;
            responsePayload.intensity = intensity;

            if (decision === "SUPPRESS") {
                rawAction = "NONE";
            }
        }

        responsePayload.next_action = rawAction;

        return success("Next step resolved", responsePayload);

    } catch (err) {
        console.error("GET /api/user/next-step error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
