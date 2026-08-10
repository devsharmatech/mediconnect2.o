import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req) {
    try {
        const { doctor_id, action, interaction_id, status, notes } = await req.json();

        if (!doctor_id) {
            return NextResponse.json(
                { success: false, message: "Doctor ID required." },
                { status: 400, headers: corsHeaders }
            );
        }

        // Action: FETCH - get recent interactions that need review
        if (action === "FETCH") {
            const { data, error } = await supabase
                .from("ai_tool_interactions")
                .select(`
          id,
          user_id,
          tool_name,
          input_json,
          risk_level,
          urgency_classification,
          recommendation,
          ai_output_status,
          doctor_override_notes,
          timestamp
        `)
                .order("timestamp", { ascending: false })
                .limit(20);

            if (error) throw error;

            return NextResponse.json({ success: true, data }, { status: 200, headers: corsHeaders });
        }

        // Action: OVERRIDE - doctor changes the status of an AI interaction
        if (action === "OVERRIDE") {
            if (!interaction_id || !status) {
                return NextResponse.json(
                    { success: false, message: "Interaction ID and Status required for override." },
                    { status: 400, headers: corsHeaders }
                );
            }

            // Valid statuses: ACKNOWLEDGED, OVERRIDDEN, IGNORED
            const { error } = await supabase
                .from("ai_tool_interactions")
                .update({
                    doctor_id: doctor_id,
                    ai_output_status: status,
                    doctor_override_notes: notes || null,
                    confirmation_timestamp: new Date().toISOString()
                })
                .eq("id", interaction_id);

            if (error) throw error;

            return NextResponse.json({ success: true, message: "AI Interaction status updated." }, { status: 200, headers: corsHeaders });
        }

        return NextResponse.json(
            { success: false, message: "Invalid action." },
            { status: 400, headers: corsHeaders }
        );

    } catch (error) {
        console.error("Doctor AI Review Error:", error);
        return NextResponse.json(
            { success: false, message: "Server error." },
            { status: 500, headers: corsHeaders }
        );
    }
}
