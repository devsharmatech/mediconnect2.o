import sql from "@/lib/db";
import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const query = searchParams.get("query");

    if (!type || !query) {
      return NextResponse.json(
        { success: false, error: "Missing 'type' or 'query' parameters." },
        { status: 400 }
      );
    }

    const searchTerm = `%${query}%`;
    let results = [];

    try {
      switch (type) {
        case "diagnosis":
          results = await sql`
            SELECT diagnosis_id, diagnosis_name, common_condition 
            FROM cr_diagnosis_master 
            WHERE diagnosis_name ILIKE ${searchTerm} 
              AND active_status = 'true'
            ORDER BY priority_score DESC NULLS LAST
            LIMIT 20
          `;
          break;

        case "medicine":
          results = await sql`
            SELECT medicine_id, generic_name, strength, dosage_form, route 
            FROM cr_medicine_master 
            WHERE generic_name ILIKE ${searchTerm} 
              AND active_status = 'true'
            LIMIT 20
          `;
          break;

        case "specialty":
          results = await sql`
            SELECT DISTINCT primary_specialty AS specialty_name
            FROM cr_specialty_routing_master 
            WHERE primary_specialty ILIKE ${searchTerm} 
              AND active_status = 'true'
            LIMIT 20
          `;
          break;

        case "test":
          results = await sql`
            SELECT test_code, test_name, category 
            FROM cr_lab_test_master 
            WHERE test_name ILIKE ${searchTerm}
            LIMIT 20
          `;
          break;

        default:
          return NextResponse.json(
            { success: false, error: "Invalid 'type' parameter. Must be diagnosis, medicine, specialty, or test." },
            { status: 400 }
          );
      }
    } catch (sqlErr) {
      console.warn("SQL search query fallback to Supabase client:", sqlErr.message);
      // Fallback to Supabase REST client
      if (type === "diagnosis") {
        const { data } = await supabase
          .from("cr_diagnosis_master")
          .select("diagnosis_id, diagnosis_name, common_condition")
          .ilike("diagnosis_name", `%${query}%`)
          .eq("active_status", "true")
          .order("priority_score", { ascending: false })
          .limit(20);
        results = data || [];
      } else if (type === "medicine") {
        const { data } = await supabase
          .from("cr_medicine_master")
          .select("medicine_id, generic_name, strength, dosage_form, route")
          .ilike("generic_name", `%${query}%`)
          .eq("active_status", "true")
          .limit(20);
        results = data || [];
      } else if (type === "test") {
        const { data } = await supabase
          .from("cr_lab_test_master")
          .select("test_code, test_name, category")
          .ilike("test_name", `%${query}%`)
          .limit(20);
        results = data || [];
      } else if (type === "specialty") {
        const { data } = await supabase
          .from("cr_specialty_routing_master")
          .select("primary_specialty")
          .ilike("primary_specialty", `%${query}%`)
          .eq("active_status", "true")
          .limit(20);
        results = (data || []).map(d => ({ specialty_name: d.primary_specialty }));
      }
    }

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error("Error in clinical search API:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
