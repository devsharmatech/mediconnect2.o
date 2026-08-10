import { supabase } from "@/lib/supabaseAdmin";

/**
 * Worker: Processes pending offline consultation submissions.
 * Rule 7.1: Sync rule - Latest timestamp wins.
 */
export async function processOfflineQueue() {
    try {
        const { data: queueItems, error } = await supabase
            .from("offline_queue")
            .select("*")
            .eq("sync_status", "PENDING")
            .order("created_at", { ascending: true })
            .limit(50); // Process in batches

        if (error || !queueItems) return;

        for (const item of queueItems) {
            try {
                // Parse the offline stored payload
                const payload = item.payload_json;
                
                if (payload && payload.action === "save") {
                    await supabase
                        .from("consultation_clinical")
                        .upsert({
                            consultation_id: item.consultation_id,
                            ...payload.clinical_payload,
                            updated_at: item.created_at, // Honor offline timestamp
                        }, { onConflict: "consultation_id" });
                }

                // Mark as synced
                await supabase
                    .from("offline_queue")
                    .update({ sync_status: "SYNCED" })
                    .eq("id", item.id);

            } catch (itemErr) {
                // Update retry count and mark FAILED if max retries reached
                await supabase
                    .from("offline_queue")
                    .update({
                        retry_count: item.retry_count + 1,
                        sync_status: item.retry_count >= 3 ? "FAILED" : "PENDING",
                        last_error: itemErr.message
                    })
                    .eq("id", item.id);
            }
        }
    } catch (err) {
        console.error("Offline Queue Worker Error:", err);
    }
}
