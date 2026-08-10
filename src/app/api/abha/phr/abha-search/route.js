import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { phrAbhaSearch } from "@/lib/abha/abhaService";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { abhaAddress, benefitName } = await req.json();

    if (!abhaAddress) {
      return failure("ABHA address is required.", null, 400, { headers: corsHeaders });
    }

    const data = await phrAbhaSearch({ abhaAddress, benefitName });
    return success("PHR search completed successfully.", data, 200, { headers: corsHeaders });
  } catch (error) {
    const message = error?.message || "Failed to search PHR.";
    console.error("ABHA PHR Search Error:", error);
    return failure("Failed to search PHR.", message, 500, { headers: corsHeaders });
  }
}
