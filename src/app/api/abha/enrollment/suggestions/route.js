import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { getEnrollmentSuggestions } from "@/lib/abha/abhaService";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { txnId, benefitName } = await req.json();

    if (!txnId) {
      return failure("Transaction ID is required.", null, 400, { headers: corsHeaders });
    }

    const data = await getEnrollmentSuggestions({ txnId, benefitName });
    return success("Suggestions fetched successfully.", data, 200, { headers: corsHeaders });
  } catch (error) {
    const message = error?.message || "Failed to fetch suggestions.";
    console.error("ABHA Suggestions Error:", error);
    return failure("Failed to fetch suggestions.", message, 500, { headers: corsHeaders });
  }
}
