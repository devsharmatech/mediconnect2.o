import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";
import { createIncident } from "@/lib/layer1/incidentService";

/**
 * GET /api/consultation/[id]/status
 * Doctor matching and load control
 */
export async function GET(req, { params }) {
    try {
        const { id: consultation_id } = await params;

        if (!consultation_id) {
            return failure("consultation_id is required", null, 400);
        }

        const { data: consultation, error: fetchErr } = await supabase
            .from("consultations")
            .select("id, doctor_id, case_status, care_episode_id")
            .eq("id", consultation_id)
            .single();

        if (fetchErr || !consultation) {
            return failure("Consultation not found", null, 404);
        }

        if (consultation.doctor_id) {
            return success("Doctor assigned", {
                consultation_id,
                status: "SUCCESS",
                doctor_id: consultation.doctor_id,
                case_status: consultation.case_status
            });
        }

        // ── DOCTOR MATCHING LOGIC & LOAD CONTROL ──
        
        // Find available doctors with less than 3 active consultations
        const { data: doctors } = await supabase
            .from("doctor_details")
            .select("id")
            .eq("onboarding_status", "approved") // Using onboarding_status instead of is_online
            // Limit search space
            .limit(10);

        if (!doctors || doctors.length === 0) {
            await createIncident("DOCTOR_MATCHING", "P2", "No online doctors available for matching", {
                consultation_id,
                care_episode_id: consultation.care_episode_id
            });
            return success("Waiting for doctor assignment", {
                consultation_id,
                status: "WAITING",
                case_status: consultation.case_status
            });
        }

        // Find load for these doctors
        const doctorIds = doctors.map(d => d.id);
        const { data: activeLoads } = await supabase
            .from("consultations")
            .select("doctor_id")
            .in("doctor_id", doctorIds)
            .in("case_status", ["STARTED", "ACTIVE"]);

        // Calculate load per doctor
        const loadMap = {};
        doctorIds.forEach(id => loadMap[id] = 0);
        
        if (activeLoads) {
            activeLoads.forEach(c => {
                if (c.doctor_id) loadMap[c.doctor_id]++;
            });
        }

        // Find doctor with load < 3 and min load
        let selectedDoctor = null;
        let minLoad = 3; // Max load limit

        for (const docId of doctorIds) {
            if (loadMap[docId] < minLoad) {
                minLoad = loadMap[docId];
                selectedDoctor = docId;
            }
        }

        if (selectedDoctor) {
            // Assign doctor
            await supabase
                .from("consultations")
                .update({ doctor_id: selectedDoctor })
                .eq("id", consultation_id);
                
            return success("Doctor assigned securely", {
                consultation_id,
                status: "SUCCESS",
                doctor_id: selectedDoctor,
                case_status: consultation.case_status
            });
        }

        // No doctors under max load limit
        await createIncident("DOCTOR_MATCHING", "P2", "All online doctors are at maximum capacity limit", {
            consultation_id,
            care_episode_id: consultation.care_episode_id
        });

        return success("Waiting for doctor assignment", {
            consultation_id,
            status: "WAITING",
            case_status: consultation.case_status
        });

    } catch (err) {
        console.error("GET /api/consultation/[id]/status error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
