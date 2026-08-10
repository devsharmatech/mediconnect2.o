import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { fetchAbhaProfile, sanitizeProfile } from "@/lib/abha/abhaService";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { userToken, benefitName } = await req.json();

    if (!userToken) {
      return failure("User token is required.", null, 400, { headers: corsHeaders });
    }

    const data = await fetchAbhaProfile({ userToken, benefitName });
    const profile = sanitizeProfile(data);
    return success("Profile fetched successfully.", profile, 200, { headers: corsHeaders });
  } catch (error) {
    const message = error?.message || "Failed to fetch profile.";
    console.error("ABHA Profile Error:", error);
    return failure("Failed to fetch profile.", message, 500, { headers: corsHeaders });
  }
}
