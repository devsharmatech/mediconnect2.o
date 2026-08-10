import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { createAbhaAddress } from "@/lib/abha/abhaService";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
    try {
        const { txnId, abhaAddress, preferred = 1, benefitName } = await req.json();

        if (!txnId || !abhaAddress) {
            return failure("Transaction ID and ABHA address are required.", null, 400, {
                headers: corsHeaders,
            });
        }

        const data = await createAbhaAddress({ txnId, abhaAddress, preferred, benefitName });
        return success("ABHA address created successfully.", data, 200, { headers: corsHeaders });
    } catch (error) {
        const message = error?.message || "Failed to create ABHA address.";
        console.error("ABHA Create Error:", error);
        return failure("Failed to create ABHA address.", message, 500, { headers: corsHeaders });
    }
}
