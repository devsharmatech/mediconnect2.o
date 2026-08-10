import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { verifyLoginOtp } from "@/lib/abha/abhaService";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { txnId, otp, benefitName } = await req.json();

    if (!txnId || !otp) {
      return failure("Transaction ID and OTP are required.", null, 400, { headers: corsHeaders });
    }

    const data = await verifyLoginOtp({ txnId, otp, benefitName });
    return success("Login verified successfully.", data, 200, { headers: corsHeaders });
  } catch (error) {
    const message = error?.message || "Failed to verify login OTP.";
    console.error("ABHA Login Verify Error:", error);
    return failure("Failed to verify login OTP.", message, 500, { headers: corsHeaders });
  }
}
