import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { searchAbhaByMobile } from "@/lib/abha/abhaService";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { mobile, benefitName } = await req.json();

    if (!mobile) {
      return failure("Mobile number is required.", null, 400, { headers: corsHeaders });
    }

    const data = await searchAbhaByMobile({ mobile, benefitName });
    return success("Search completed successfully.", data, 200, { headers: corsHeaders });
  } catch (error) {
    const message = error?.message || "Failed to search ABHA.";
    console.error("ABHA Search Error:", error);
    return failure("Failed to search ABHA.", message, 500, { headers: corsHeaders });
  }
}
