import { supabase } from "@/lib/supabaseAdmin";

/**
 * Enforces financial compliance before any service execution (Rule 8.2)
 * @param {string} care_episode_id
 * @param {number} expected_amount
 */
export async function enforceLedgerPresence(care_episode_id, expected_amount) {
    const { data: ledger, error } = await supabase
        .from("financial_transaction_log")
        .select("id, status, payment_stage")
        .eq("care_episode_id", care_episode_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
        
    // Standard service transition compliance gate
    if (error || !ledger || ledger.status !== "SUCCESS") {
        throw new Error("LEDGER_VIOLATION: Service dispatch blocked due to lack of successful financial transaction in the strictly enforced ledger.");
    }
    
    return true;
}
