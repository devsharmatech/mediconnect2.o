import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { requestEnrollmentOtp } from "@/lib/abha/abhaService";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
    try {
        const { type, value, benefitName } = await req.json();

        if (!value) {
            return failure("Value (Mobile/Aadhaar/DL) is required.", null, 400, { headers: corsHeaders });
        }

        const data = await requestEnrollmentOtp({ type, value, benefitName });
        return success("OTP requested successfully.", data, 200, { headers: corsHeaders });
    } catch (error) {
        const message = error?.message || "Failed to request OTP.";
        if (message.includes("This account already exist")) {
            return failure("ABHA already exists. Switch to login flow.", message, 409, {
                headers: corsHeaders,
            });
        }
        console.error("ABHA Generate OTP Error:", error);
        return failure("Failed to request OTP.", message, 500, { headers: corsHeaders });
    }
}
