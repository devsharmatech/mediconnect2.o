import { success, failure } from "@/lib/response";
import sql from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    
    let pharmacies;
    if (query) {
      pharmacies = await sql`
        SELECT * FROM chemist_details
        WHERE onboarding_status = 'approved'
          AND (pharmacy_name ILIKE ${'%' + query + '%'} OR address ILIKE ${'%' + query + '%'})
        ORDER BY rating DESC NULLS LAST
        LIMIT 20
      `;
    } else {
      pharmacies = await sql`
        SELECT * FROM chemist_details
        WHERE onboarding_status = 'approved'
        ORDER BY rating DESC NULLS LAST
        LIMIT 20
      `;
    }

    return success("Pharmacies fetched successfully", { pharmacies }, 200);
  } catch (error) {
    console.error("Pharmacy Search Error:", error);
    return failure("Internal Server Error", error.message, 500);
  }
}
