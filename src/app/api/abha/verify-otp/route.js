import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { verifyEnrollmentOtp } from "@/lib/abha/abhaService";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { otp, txnId, benefitName } = await req.json();

    if (!otp || !txnId) {
      return failure("OTP and Transaction ID are required.", null, 400, { headers: corsHeaders });
    }

    const data = await verifyEnrollmentOtp({ txnId, otp, benefitName });
    return success("OTP verified successfully.", data, 200, { headers: corsHeaders });
  } catch (error) {
    const message = error?.message || "Failed to verify OTP.";
    console.error("ABHA Verify OTP Error:", error);
    return failure("Failed to verify OTP.", message, 500, { headers: corsHeaders });
  }
}
