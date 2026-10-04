import { success, failure } from "@/lib/response";
import sql from "@/lib/db";

export async function GET(req) {
  try {
    const docs = await sql`
      SELECT DISTINCT specialization 
      FROM doctor_details 
      WHERE specialization IS NOT NULL AND TRIM(specialization) != ''
      LIMIT 8
    `;
    const uniqueSpecs = docs.map(d => d.specialization);

    const popular_tests = await sql`
      SELECT id, test_name AS name, price, specimen_type, turnaround_time
      FROM lab_tests
      WHERE is_active = true AND price > 0
      ORDER BY id
      LIMIT 6
    `;

    const [doctorStats] = await sql`
      SELECT COUNT(*)::int AS count
      FROM doctor_details
      WHERE onboarding_status = 'approved'
    `;

    return success("Search metadata fetched", { 
      specialties: uniqueSpecs, 
      popular_tests: popular_tests || [],
      online_doctors_count: doctorStats?.count || 0
    }, 200);
  } catch (error) {
    console.error("Search Metadata API Error:", error);
    return failure("Internal Server Error", error.message, 500);
  }
}
