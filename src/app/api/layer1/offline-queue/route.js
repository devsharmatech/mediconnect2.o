/**
 * API: Offline Queue — Client Write Endpoint (Layer-111)
 *
 * POST /api/layer1/offline-queue
 *   Called by the client after reconnecting to enqueue payloads that were
 *   captured locally while offline (IndexedDB / localStorage).
 *   The backend cron /api/cron/offline-sync processes these asynchronously.
 *
 * GET /api/layer1/offline-queue?consultation_id=xxx
 *   Returns sync status for a given consultation so the client can show
 *   an in-progress / synced / failed indicator in the UI.
 *
 * Rule 7.1 (Offline Conflict Resolution):
 *   - Latest offline timestamp wins (worker honors item.created_at, not server time)
 *   - Duplicate entries for the same consultation are deduplicated by PENDING check
 *   - COMPLETED consultations are rejected — legal gate cannot be bypassed offline
 *
 * Security:
 *   - patient_id is resolved from JWT, NOT request body (prevents spoofing)
 *   - consultation must belong to the authenticated patient
 */

import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";
import { resolveCallerFromRequest } from "@/lib/layer1/authGuard";
import { logActivity } from "@/lib/layer1/activityLogger";

// States from which offline saves are accepted
const OFFLINE_ALLOWED_STATES = ["STARTED", "ACTIVE"];

// Valid offline action types
const VALID_ACTIONS = ["save"];

// ─────────────────────────────────────────────────────────
// POST — Enqueue offline payload(s) on reconnect
// ─────────────────────────────────────────────────────────

/**
 * Body (single item):
 * {
 *   consultation_id: string,
 *   action: "save",
 *   clinical_payload: { ... },  // consultation_clinical fields
 *   offline_timestamp: ISO8601  // the local device time when save was made
 * }
 *
 * Body (batch):
 * {
 *   items: [ { consultation_id, action, clinical_payload, offline_timestamp }, ... ]
 * }
 */
export async function POST(req) {
    try {
        // ── 1. Resolve caller identity from JWT ──
        const caller = await resolveCallerFromRequest(req);
        if (!caller) return failure("Unauthorized", null, 401);

        const body = await req.json();

        // Support both single-item and batch submissions
        const items = body.items
            ? body.items
            : [
                  {
                      consultation_id: body.consultation_id,
                      action: body.action,
                      clinical_payload: body.clinical_payload,
                      offline_timestamp: body.offline_timestamp,
                  },
              ];

        if (!Array.isArray(items) || items.length === 0) {
            return failure("Request must include 'items' array or a single item payload");
        }

        if (items.length > 50) {
            return failure("Batch limit exceeded — maximum 50 items per request");
        }

        const results = { queued: 0, skipped: 0, rejected: [], errors: [] };

        for (const item of items) {
            const { consultation_id, action, clinical_payload, offline_timestamp } = item;

            // ── Validate required fields ──
            if (!consultation_id || !action) {
                results.rejected.push({ consultation_id, reason: "Missing consultation_id or action" });
                continue;
            }

            if (!VALID_ACTIONS.includes(action)) {
                results.rejected.push({
                    consultation_id,
                    reason: `Invalid action '${action}'. Only 'save' is supported offline. Completion requires connectivity.`,
                });
                continue;
            }

            // ── Fetch consultation to verify ownership + state ──
            const { data: consultation, error: fetchErr } = await supabase
                .from("consultations")
                .select("id, patient_id, doctor_id, case_status, care_episode_id, sync_status")
                .eq("id", consultation_id)
                .single();

            if (fetchErr || !consultation) {
                results.rejected.push({ consultation_id, reason: "Consultation not found" });
                continue;
            }

            // ── Authorization: caller must be the patient OR the doctor ──
            const isPatient = caller.id === consultation.patient_id;
            const isDoctor  = caller.id === consultation.doctor_id;

            if (!isPatient && !isDoctor) {
                results.rejected.push({
                    consultation_id,
                    reason: "Forbidden — consultation does not belong to this user",
                });
                continue;
            }

            // ── Layer-111 Rule: COMPLETED consultations are immutable ──
            // Offline saves cannot bypass the legal completion gate.
            if (!OFFLINE_ALLOWED_STATES.includes(consultation.case_status)) {
                results.rejected.push({
                    consultation_id,
                    reason: `Cannot enqueue offline save for consultation in state '${consultation.case_status}'. Completion requires a live connection due to legal validation requirements.`,
                });
                continue;
            }

            // ── Deduplication: skip if already PENDING in queue ──
            const { count: pendingCount } = await supabase
                .from("offline_queue")
                .select("id", { count: "exact", head: true })
                .eq("consultation_id", consultation_id)
                .eq("sync_status", "PENDING");

            if (pendingCount > 0) {
                // Already queued — update the existing entry with the newer payload
                // Rule 7.1: latest timestamp wins
                await supabase
                    .from("offline_queue")
                    .update({
                        payload_json: { action, clinical_payload },
                        created_at: offline_timestamp || new Date().toISOString(),
                        retry_count: 0,
                        last_error: null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("consultation_id", consultation_id)
                    .eq("sync_status", "PENDING");

                results.skipped++;
                continue;
            }

            // ── Insert into offline_queue ──
            const { error: insertErr } = await supabase
                .from("offline_queue")
                .insert({
                    consultation_id,
                    patient_id: consultation.patient_id,
                    payload_json: { action, clinical_payload },
                    sync_status: "PENDING",
                    retry_count: 0,
                    // Honour offline timestamp for conflict resolution (Rule 7.1)
                    created_at: offline_timestamp || new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });

            if (insertErr) {
                results.errors.push({ consultation_id, error: insertErr.message });
                continue;
            }

            // ── Mark consultation as needing sync ──
            await supabase
                .from("consultations")
                .update({ sync_status: "PENDING" })
                .eq("id", consultation_id);

            // ── Activity log ──
            await logActivity({
                patient_id: consultation.patient_id,
                care_episode_id: consultation.care_episode_id,
                actor_id: caller.id,
                module_type: "offline_sync",
                action_type: "enqueued",
                reference_id: consultation_id,
                description: `Offline payload enqueued for sync (action: ${action})`,
            });

            results.queued++;
        }

        return success("Offline queue updated", {
            queued: results.queued,
            skipped: results.skipped,
            rejected: results.rejected,
            errors: results.errors,
            note:
                "Queued items will be processed by the background sync worker within 5 minutes. " +
                "Use GET /api/layer1/offline-queue?consultation_id=xxx to check sync status.",
        });
    } catch (err) {
        console.error("POST /api/layer1/offline-queue error:", err);
        return failure("Internal server error", err.message, 500);
    }
}

// ─────────────────────────────────────────────────────────
// GET — Check sync status for a consultation
// ─────────────────────────────────────────────────────────

/**
 * Query: ?consultation_id=uuid
 *
 * Returns:
 * {
 *   sync_status: "PENDING" | "SYNCED" | "FAILED",
 *   queue_entries: [...],
 *   consultation_sync_status: "PENDING" | "SYNCED" | "FAILED"
 * }
 */
export async function GET(req) {
    try {
        const caller = await resolveCallerFromRequest(req);
        if (!caller) return failure("Unauthorized", null, 401);

        const { searchParams } = new URL(req.url);
        const consultation_id = searchParams.get("consultation_id");

        if (!consultation_id) {
            return failure("consultation_id query parameter is required");
        }

        // ── Verify consultation ownership ──
        const { data: consultation, error: fetchErr } = await supabase
            .from("consultations")
            .select("id, patient_id, doctor_id, case_status, sync_status")
            .eq("id", consultation_id)
            .single();

        if (fetchErr || !consultation) {
            return failure("Consultation not found", null, 404);
        }

        const isOwner =
            caller.id === consultation.patient_id || caller.id === consultation.doctor_id;

        if (!isOwner) {
            return failure("Forbidden", null, 403);
        }

        // ── Fetch queue entries for this consultation ──
        const { data: queueEntries, error: queueErr } = await supabase
            .from("offline_queue")
            .select("id, sync_status, retry_count, last_error, created_at, updated_at")
            .eq("consultation_id", consultation_id)
            .order("created_at", { ascending: false })
            .limit(10);

        if (queueErr) throw queueErr;

        // Derive overall sync state
        const hasPending = (queueEntries || []).some((e) => e.sync_status === "PENDING");
        const hasFailed  = (queueEntries || []).some((e) => e.sync_status === "FAILED");
        const overallStatus = hasPending ? "PENDING" : hasFailed ? "FAILED" : "SYNCED";

        return success("Offline sync status", {
            consultation_id,
            overall_status: overallStatus,
            consultation_sync_status: consultation.sync_status || "SYNCED",
            queue_entries: queueEntries || [],
        });
    } catch (err) {
        console.error("GET /api/layer1/offline-queue error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
