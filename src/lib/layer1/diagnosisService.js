/**
 * LAYER-1: Diagnosis Service
 * 
 * Manages structured diagnosis system.
 * - Diagnosis dropdown filtered by specialty
 * - "Other" allows custom input → goes to review queue
 * - usage_count tracked for ordering by popularity
 * - Admin can promote custom diagnoses to master list
 */

import { supabase } from "@/lib/supabaseAdmin";
import { logAudit } from "./auditLogger";

/**
 * Get diagnoses filtered by specialty
 * @param {string} specialty_id
 * @param {string} [search] - optional text search
 * @returns {object} { success, data, error }
 */
export async function getDiagnosesBySpecialty(specialty_id, search = null) {
    try {
        if (!specialty_id) {
            return { success: false, error: "specialty_id is required" };
        }

        let query = supabase
            .from("diagnosis_master")
            .select("*")
            .eq("specialty_id", specialty_id)
            .eq("is_active", true)
            .order("usage_count", { ascending: false })
            .limit(100);

        if (search) {
            query = query.ilike("name", `%${search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        return { success: true, data };
    } catch (err) {
        console.error("getDiagnosesBySpecialty error:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Increment usage count when a diagnosis is selected
 * @param {string} diagnosis_id
 */
export async function incrementUsageCount(diagnosis_id) {
    try {
        // Use RPC or raw increment
        const { data: current } = await supabase
            .from("diagnosis_master")
            .select("usage_count")
            .eq("id", diagnosis_id)
            .single();

        if (current) {
            await supabase
                .from("diagnosis_master")
                .update({ usage_count: (current.usage_count || 0) + 1 })
                .eq("id", diagnosis_id);
        }
    } catch (err) {
        console.error("incrementUsageCount error:", err);
    }
}

/**
 * Submit a custom diagnosis for admin review
 * @param {string} name - custom diagnosis text
 * @param {string} specialty_id
 * @param {string} doctor_id - who submitted it
 * @returns {object} { success, data, error }
 */
export async function addCustomDiagnosis(name, specialty_id, doctor_id) {
    try {
        if (!name || !specialty_id || !doctor_id) {
            return { success: false, error: "name, specialty_id, and doctor_id are required" };
        }

        // Check if already exists in master
        const { data: existing } = await supabase
            .from("diagnosis_master")
            .select("id")
            .eq("specialty_id", specialty_id)
            .ilike("name", name)
            .maybeSingle();

        if (existing) {
            return { success: false, error: "Diagnosis already exists in master list", existing_id: existing.id };
        }

        // Check if already in review queue
        const { data: existingReview } = await supabase
            .from("custom_diagnosis_review")
            .select("id, usage_count")
            .eq("specialty_id", specialty_id)
            .ilike("name", name)
            .eq("review_status", "pending")
            .maybeSingle();

        if (existingReview) {
            // Increment usage count
            await supabase
                .from("custom_diagnosis_review")
                .update({ usage_count: (existingReview.usage_count || 1) + 1 })
                .eq("id", existingReview.id);

            return { success: true, data: existingReview, message: "Custom diagnosis usage count updated" };
        }

        // Create new review entry
        const { data, error } = await supabase
            .from("custom_diagnosis_review")
            .insert({
                name,
                specialty_id,
                submitted_by: doctor_id,
                usage_count: 1,
                review_status: "pending",
            })
            .select()
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (err) {
        console.error("addCustomDiagnosis error:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Admin: Promote a custom diagnosis to master list
 * @param {string} custom_id - UUID from custom_diagnosis_review
 * @param {string} admin_id - who approved it
 * @returns {object} { success, data, error }
 */
export async function convertCustomToMaster(custom_id, admin_id) {
    try {
        if (!custom_id || !admin_id) {
            return { success: false, error: "custom_id and admin_id are required" };
        }

        // Fetch custom diagnosis
        const { data: custom, error: fetchErr } = await supabase
            .from("custom_diagnosis_review")
            .select("*")
            .eq("id", custom_id)
            .single();

        if (fetchErr) throw fetchErr;
        if (!custom) return { success: false, error: "Custom diagnosis not found" };
        if (custom.review_status !== "pending") {
            return { success: false, error: `Already ${custom.review_status}` };
        }

        // Check for duplicate in master
        const { data: dup } = await supabase
            .from("diagnosis_master")
            .select("id")
            .eq("specialty_id", custom.specialty_id)
            .ilike("name", custom.name)
            .maybeSingle();

        if (dup) {
            return { success: false, error: "Diagnosis already exists in master list" };
        }

        // Insert into master
        const { data: masterEntry, error: insertErr } = await supabase
            .from("diagnosis_master")
            .insert({
                specialty_id: custom.specialty_id,
                name: custom.name,
                usage_count: custom.usage_count || 0,
            })
            .select()
            .single();

        if (insertErr) throw insertErr;

        // Update review entry
        await supabase
            .from("custom_diagnosis_review")
            .update({
                review_status: "approved",
                reviewed_by: admin_id,
                reviewed_at: new Date().toISOString(),
                promoted_to_master_id: masterEntry.id,
            })
            .eq("id", custom_id);

        // Audit log
        await logAudit({
            entity_type: "diagnosis",
            entity_id: masterEntry.id,
            previous_state: null,
            new_state: { name: custom.name, specialty_id: custom.specialty_id },
            change_description: `Custom diagnosis promoted to master: "${custom.name}"`,
            changed_by: admin_id,
        });

        return { success: true, data: masterEntry };
    } catch (err) {
        console.error("convertCustomToMaster error:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Get all specialties
 * @returns {object} { success, data, error }
 */
export async function getSpecialties() {
    try {
        const { data, error } = await supabase
            .from("specialty")
            .select("*")
            .eq("is_active", true)
            .order("display_order", { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (err) {
        console.error("getSpecialties error:", err);
        return { success: false, error: err.message };
    }
}
