import { success, failure } from "@/lib/response";
import sql from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (q) {
      const searchPattern = `%${q}%`;
      let matchedDoctors = [];
      try {
        matchedDoctors = await sql`
          SELECT id, full_name, specialization, clinic_name, experience_years, rating
          FROM doctor_details
          WHERE (full_name ILIKE ${searchPattern} OR specialization ILIKE ${searchPattern} OR clinic_name ILIKE ${searchPattern})
          ORDER BY rating DESC NULLS LAST
          LIMIT 6
        `;
      } catch (e) {
        console.warn("Doctor search query error:", e.message);
      }

      let matchedTests = [];
      try {
        matchedTests = await sql`
          SELECT id, test_name AS name, price, specimen_type, turnaround_time
          FROM lab_tests
          WHERE is_active = true AND (test_name ILIKE ${searchPattern} OR test_code ILIKE ${searchPattern})
          LIMIT 6
        `;
      } catch (e) {
        console.warn("Lab tests query error:", e.message);
      }

      return success("Search results", {
        doctors: matchedDoctors || [],
        tests: matchedTests || []
      }, 200);
    }

    const docs = await sql`
      SELECT DISTINCT specialization 
      FROM doctor_details 
      WHERE specialization IS NOT NULL AND TRIM(specialization) != ''
      LIMIT 8
    `;
    const uniqueSpecs = docs.map(d => d.specialization).filter(Boolean);

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
