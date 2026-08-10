import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { requestLoginOtp } from "@/lib/abha/abhaService";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { abhaNumber, benefitName } = await req.json();

    if (!abhaNumber) {
      return failure("ABHA number is required.", null, 400, { headers: corsHeaders });
    }

    const data = await requestLoginOtp({ abhaNumber, benefitName });
    return success("Login OTP requested successfully.", data, 200, { headers: corsHeaders });
  } catch (error) {
    const message = error?.message || "Failed to request login OTP.";
    console.error("ABHA Login OTP Error:", error);
    return failure("Failed to request login OTP.", message, 500, { headers: corsHeaders });
  }
}
