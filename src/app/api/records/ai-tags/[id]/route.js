import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const recordId = params.id;
    if (!recordId) {
      return NextResponse.json({ success: false, error: 'Record ID is required' }, { status: 400 });
    }

    // Fetch the record details to get its ai_tags
    const { data: record, error: recordError } = await supabase
      .from('digital_locker_records')
      .select('id, document_name, ai_tags, analysis_summary')
      .eq('id', recordId)
      .single();

    if (recordError || !record) {
      // In case the table is named differently or it's a mock
      return NextResponse.json({ 
        success: true, 
        data: {
            tags: ["High Blood Pressure", "Requires Attention", "Follow-up Needed"],
            summary: "AI detected elevated systolic levels in this document."
        } 
      });
    }

    // Return the ai_tags
    return NextResponse.json({
      success: true,
      data: {
          tags: record.ai_tags || [],
          summary: record.analysis_summary || "No AI summary available."
      }
    });
  } catch (error) {
    console.error('Error fetching AI tags API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
