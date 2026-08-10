import sql from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    if (!query) {
      return NextResponse.json(
        { success: false, error: "Missing 'query' parameter." },
        { status: 400 }
      );
    }

    // Use ILIKE for case-insensitive partial matching
    // We join the complaint master with the mapping table to get the ranked diagnoses
    const results = await sql`
      SELECT 
        cm.canonical_complaint,
        cdm.diagnosis_id,
        cdm.diagnosis_name,
        cdm.match_strength,
        cdm.priority_rank
      FROM cr_complaint_master cm
      JOIN cr_complaint_diagnosis_map cdm 
        ON cm.canonical_complaint = cdm.canonical_complaint
      WHERE cm.synonym ILIKE ${'%' + query + '%'}
      ORDER BY 
        cdm.priority_rank ASC NULLS LAST
    `;

    // Group the results by canonical complaint to present a clean structure
    const grouped = results.reduce((acc, row) => {
      if (!acc[row.canonical_complaint]) {
        acc[row.canonical_complaint] = {
          canonical_complaint: row.canonical_complaint,
          diagnoses: []
        };
      }
      // Ensure we don't duplicate diagnoses if multiple synonyms hit the same canonical complaint
      if (!acc[row.canonical_complaint].diagnoses.find(d => d.diagnosis_id === row.diagnosis_id)) {
        acc[row.canonical_complaint].diagnoses.push({
          diagnosis_id: row.diagnosis_id,
          diagnosis_name: row.diagnosis_name,
          match_strength: row.match_strength,
          priority_rank: row.priority_rank
        });
      }
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: Object.values(grouped)
    });

  } catch (error) {
    console.error("Error in complaint-mapping API:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
