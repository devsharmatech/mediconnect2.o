import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

import { cookies } from "next/headers";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// PUT update test
export async function PUT(req, { params }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { lab_id, category_id, test_code, test_name, price, specimen_type, clinical_history_required, turnaround_time, is_active, container, temperature, remarks, schedule, reporting_schedule } = body;

        if (!id || !lab_id) {
            return failure("Test ID and lab_id are required", null, 400, { headers: corsHeaders });
        }

        // --- OTP Consent Verification ---
        const cookieStore = await cookies();
        const consentCookie = cookieStore.get("lab_catalog_consent");
        if (!consentCookie || consentCookie.value !== lab_id) {
            return failure("Consent required. Please verify OTP first.", { code: "CONSENT_REQUIRED" }, 403, { headers: corsHeaders });
        }
        // --------------------------------

        // Verify ownership
        const { data: testData, error: verifyError } = await supabase
            .from("lab_tests")
            .select("lab_id")
            .eq("id", id)
            .single();

        if (verifyError || !testData) {
            return failure("Test not found", null, 404, { headers: corsHeaders });
        }

        if (testData.lab_id !== lab_id) {
            return failure("Unauthorized to edit this test", null, 403, { headers: corsHeaders });
        }

        const updateData = { updated_at: new Date().toISOString() };
        if (category_id !== undefined) updateData.category_id = category_id || null;
        if (test_code !== undefined) updateData.test_code = test_code;
        if (test_name !== undefined) updateData.test_name = test_name;
        if (price !== undefined) updateData.price = price;
        if (specimen_type !== undefined) updateData.specimen_type = specimen_type;
        if (clinical_history_required !== undefined) updateData.clinical_history_required = clinical_history_required;
        if (turnaround_time !== undefined) updateData.turnaround_time = turnaround_time;
        if (is_active !== undefined) updateData.is_active = is_active;
        if (container !== undefined) updateData.container = container || null;
        if (temperature !== undefined) updateData.temperature = temperature || null;
        if (remarks !== undefined) updateData.remarks = remarks || null;
        if (schedule !== undefined) updateData.schedule = schedule || null;
        if (reporting_schedule !== undefined) updateData.reporting_schedule = reporting_schedule || null;

        const { data, error } = await supabase
            .from("lab_tests")
            .update(updateData)
            .eq("id", id)
            .select(`
        *,
        category:lab_test_categories (
          id,
          name,
          icon
        )
      `)
            .single();

        if (error) throw error;

        // Log activity
        await supabase.from("lab_activity_logs").insert({
            lab_id,
            action: "UPDATE_TEST",
            details: { test_id: id, test_name: data.test_name },
        });

        return success("Test updated successfully", data, 200, { headers: corsHeaders });
    } catch (error) {
        console.error("Error updating lab test:", error);
        return failure("Failed to update test", error.message, 500, { headers: corsHeaders });
    }
}

// DELETE test
export async function DELETE(req, { params }) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const lab_id = searchParams.get('lab_id');

        if (!id || !lab_id) {
            return failure("Test ID and lab_id are required", null, 400, { headers: corsHeaders });
        }

        // --- OTP Consent Verification ---
        const cookieStore = await cookies();
        const consentCookie = cookieStore.get("lab_catalog_consent");
        if (!consentCookie || consentCookie.value !== lab_id) {
            return failure("Consent required. Please verify OTP first.", { code: "CONSENT_REQUIRED" }, 403, { headers: corsHeaders });
        }
        // --------------------------------

        // Verify ownership
        const { data: testData, error: verifyError } = await supabase
            .from("lab_tests")
            .select("lab_id")
            .eq("id", id)
            .single();

        if (verifyError || !testData) {
            return failure("Test not found", null, 404, { headers: corsHeaders });
        }

        if (testData.lab_id !== lab_id) {
            return failure("Unauthorized to delete this test", null, 403, { headers: corsHeaders });
        }

        const { error } = await supabase
            .from("lab_tests")
            .delete()
            .eq("id", id);

        if (error) throw error;

        // Log activity
        await supabase.from("lab_activity_logs").insert({
            lab_id,
            action: "DELETE_TEST",
            details: { test_id: id },
        });

        return success("Test deleted successfully", null, 200, { headers: corsHeaders });
    } catch (error) {
        console.error("Error deleting lab test:", error);
        return failure("Failed to delete test", error.message, 500, { headers: corsHeaders });
    }
}
