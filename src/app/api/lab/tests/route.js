import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

import { cookies } from "next/headers";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// GET all tests for a specific lab
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const lab_id = searchParams.get('lab_id');

        if (!lab_id) {
            return failure("lab_id is required", null, 400, { headers: corsHeaders });
        }

        const { data, error } = await supabase
            .from("lab_tests")
            .select(`
        *,
        category:lab_test_categories (
          id,
          name,
          icon
        )
      `)
            .eq("lab_id", lab_id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return success("Tests fetched successfully", data, 200, { headers: corsHeaders });
    } catch (error) {
        console.error("Error fetching lab tests:", error);
        return failure("Failed to fetch tests", error.message, 500, { headers: corsHeaders });
    }
}

// POST create new test
export async function POST(req) {
    try {
        const body = await req.json();
        const { lab_id, category_id, test_code, test_name, price, specimen_type, clinical_history_required, turnaround_time, is_active, container, temperature, remarks, schedule, reporting_schedule } = body;

        if (!lab_id || !test_name || price === undefined) {
            return failure("lab_id, test_name, and price are required", null, 400, { headers: corsHeaders });
        }

        // --- OTP Consent Verification ---
        const cookieStore = await cookies();
        const consentCookie = cookieStore.get("lab_catalog_consent");
        if (!consentCookie || consentCookie.value !== lab_id) {
            return failure("Consent required. Please verify OTP first.", { code: "CONSENT_REQUIRED" }, 403, { headers: corsHeaders });
        }
        // --------------------------------

        let generatedTestCode = test_code;
        if (!generatedTestCode) {
            // Find the most recently created test with an MGR code for this lab
            const { data: latestTest } = await supabase
                .from("lab_tests")
                .select("test_code")
                .eq("lab_id", lab_id)
                .like("test_code", "%MGR%")
                .order("created_at", { ascending: false })
                .limit(1);

            let nextNumber = 1;
            if (latestTest && latestTest.length > 0 && latestTest[0].test_code) {
                // Extract the number from the code, assuming format MGR0001
                const match = latestTest[0].test_code.match(/MGR(\d+)/);
                if (match) {
                    nextNumber = parseInt(match[1], 10) + 1;
                }
            }

            // Generate padded string like MGR0018
            generatedTestCode = `MGR${String(nextNumber).padStart(4, '0')}`;
        }

        const { data, error } = await supabase
            .from("lab_tests")
            .insert({
                lab_id,
                category_id: category_id || null,
                test_code: generatedTestCode,
                test_name,
                price,
                specimen_type,
                clinical_history_required: clinical_history_required || false,
                turnaround_time,
                is_active: is_active !== undefined ? is_active : true,
                container: container || null,
                temperature: temperature || null,
                remarks: remarks || null,
                schedule: schedule || null,
                reporting_schedule: reporting_schedule || null,
            })
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
            action: "CREATE_TEST",
            details: { test_name, test_code: generatedTestCode, price },
        });

        return success("Test created successfully", data, 201, { headers: corsHeaders });
    } catch (error) {
        console.error("Error creating lab test:", error);
        return failure("Failed to create test", error.message, 500, { headers: corsHeaders });
    }
}
