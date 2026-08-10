/**
 * LAYER-1: Service Status Manager
 * 
 * Common status transition validator for all service modules
 * (lab_orders, nursing, pharmacy, etc.)
 * 
 * Validates transitions, writes audit + activity logs.
 */

import { supabase } from "@/lib/supabaseAdmin";
import { logAudit } from "./auditLogger";
import { logActivity } from "./activityLogger";

// Service-specific status transition maps
const SERVICE_TRANSITIONS = {
    lab_test_orders: {
        pending: ["approved", "rejected"],
        approved: ["sample_collected", "rejected"],
        sample_collected: ["sent_to_lab", "processing"],
        sent_to_lab: ["processing"],
        processing: ["completed", "rejected"],
        completed: [],
        rejected: [],
    },
    nursing_leads: {
        NEW: ["CONTACTED", "NOT_CONVERTED", "CLOSED"],
        CONTACTED: ["QUALIFIED", "NOT_CONVERTED", "CLOSED"],
        QUALIFIED: ["SHARED_WITH_PARTNER", "NOT_CONVERTED", "CLOSED"],
        SHARED_WITH_PARTNER: ["SERVICE_STARTED", "NOT_CONVERTED", "CLOSED"],
        SERVICE_STARTED: ["CLOSED"],
        NOT_CONVERTED: [],
        CLOSED: [],
    },
    // chemist_orders — can be extended here
    // medical_equipment_requests — can be added here
};

/**
 * Update a service record's status with validation
 * @param {string} table - database table name (lab_test_orders, nursing_leads, etc.)
 * @param {string} record_id - UUID of the record
 * @param {string} new_status - target status
 * @param {string} user_id - who is making the change
 * @param {string} [status_column] - column name for status field (default: auto-detect)
 * @returns {object} { success, data, error }
 */
export async function updateServiceStatus(table, record_id, new_status, user_id, status_column = null) {
    try {
        if (!table || !record_id || !new_status || !user_id) {
            return { success: false, error: "table, record_id, new_status, and user_id are required" };
        }

        // Determine status column
        const statusCol = status_column || (table === "nursing_leads" ? "lead_status" : "status");

        // Fetch current record
        const { data: record, error: fetchErr } = await supabase
            .from(table)
            .select("*")
            .eq("id", record_id)
            .single();

        if (fetchErr) throw fetchErr;
        if (!record) return { success: false, error: `Record not found in ${table}` };

        const current_status = record[statusCol];

        // Validate transition if transition map exists
        const transitions = SERVICE_TRANSITIONS[table];
        if (transitions) {
            const allowed = transitions[current_status];
            if (!allowed) {
                return { success: false, error: `Unknown current status: ${current_status}` };
            }
            if (!allowed.includes(new_status)) {
                return {
                    success: false,
                    error: `Invalid transition: ${current_status} → ${new_status}. Allowed: ${allowed.join(", ") || "none (terminal)"}`,
                };
            }
        }

        // Perform update
        const { data, error } = await supabase
            .from(table)
            .update({
                [statusCol]: new_status,
                updated_at: new Date().toISOString(),
            })
            .eq("id", record_id)
            .select()
            .single();

        if (error) throw error;

        // Write audit log
        await logAudit({
            entity_type: table,
            entity_id: record_id,
            previous_state: { [statusCol]: current_status },
            new_state: { [statusCol]: new_status },
            change_description: `${table} status: ${current_status} → ${new_status}`,
            changed_by: user_id,
        });

        // Write activity log
        const patient_id = record.patient_id || record.user_id || null;
        await logActivity({
            patient_id,
            care_episode_id: record.care_episode_id || null,
            actor_id: user_id,
            module_type: table.replace("_orders", "").replace("_leads", "").replace("_requests", ""),
            action_type: "status_changed",
            reference_id: record_id,
            description: `${table}: ${current_status} → ${new_status}`,
        });

        return { success: true, data };
    } catch (err) {
        console.error("updateServiceStatus error:", err);
        return { success: false, error: err.message };
    }
}
