import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { cookies } from "next/headers";

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// PUT update test
export async function PUT(req, { params }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { lab_id, category_id, test_code, test_name, price, specimen_type, clinical_history_required, turnaround_time, is_active, container, temperature, remarks, schedule, reporting_schedule, collection_type } = body;

        const cleanId = safeUuid(id);
        const cleanLabId = safeUuid(lab_id);

        if (!cleanId || !cleanLabId) {
            return failure("Valid Test ID and lab_id are required", null, 400, { headers: corsHeaders });
        }

        // --- OTP Consent Verification ---
        const cookieStore = await cookies();
        const consentCookie = cookieStore.get("lab_catalog_consent");
        if (!consentCookie || consentCookie.value !== cleanLabId) {
            return failure("Consent required. Please verify OTP first.", { code: "CONSENT_REQUIRED" }, 403, { headers: corsHeaders });
        }

        // Verify ownership
        const existing = await sql`
            SELECT lab_id
            FROM lab_tests
            WHERE id = ${cleanId}
            LIMIT 1
        `;

        if (!existing.length) {
            return failure("Test not found", null, 404, { headers: corsHeaders });
        }

        if (existing[0].lab_id !== cleanLabId) {
            return failure("Unauthorized to edit this test", null, 403, { headers: corsHeaders });
        }

        const cleanCatId = safeUuid(category_id);
        const normalizedCollectionType = collection_type !== undefined
            ? (['home', 'lab', 'both'].includes((collection_type || '').toLowerCase()) ? collection_type.toLowerCase() : 'lab')
            : undefined;

        const updated = await sql`
            UPDATE lab_tests
            SET
                category_id = COALESCE(${cleanCatId}, category_id),
                test_code = COALESCE(${test_code ?? null}, test_code),
                test_name = COALESCE(${test_name ?? null}, test_name),
                price = COALESCE(${price !== undefined ? Number(price) : null}, price),
                specimen_type = COALESCE(${specimen_type ?? null}, specimen_type),
                clinical_history_required = COALESCE(${clinical_history_required !== undefined ? Boolean(clinical_history_required) : null}, clinical_history_required),
                turnaround_time = COALESCE(${turnaround_time ?? null}, turnaround_time),
                is_active = COALESCE(${is_active !== undefined ? Boolean(is_active) : null}, is_active),
                container = COALESCE(${container ?? null}, container),
                temperature = COALESCE(${temperature ?? null}, temperature),
                remarks = COALESCE(${remarks ?? null}, remarks),
                schedule = COALESCE(${schedule ?? null}, schedule),
                reporting_schedule = COALESCE(${reporting_schedule ?? null}, reporting_schedule),
                collection_type = COALESCE(${normalizedCollectionType ?? null}, collection_type),
                updated_at = NOW()
            WHERE id = ${cleanId}
            RETURNING *
        `;

        const testData = updated[0];

        // Fetch category
        let category = null;
        if (testData.category_id) {
            const cat = await sql`SELECT id, name, icon FROM lab_test_categories WHERE id = ${testData.category_id} LIMIT 1`;
            if (cat.length > 0) category = cat[0];
        }

        // Log activity
        await sql`
            INSERT INTO lab_activity_logs (
                lab_id,
                action,
                details,
                created_at
            ) VALUES (
                ${cleanLabId},
                'UPDATE_TEST',
                ${JSON.stringify({ test_id: cleanId, test_name: testData.test_name })}::jsonb,
                NOW()
            )
        `.catch(e => console.warn("Failed to insert lab_activity_log:", e.message));

        return success("Test updated successfully", { ...testData, category }, 200, { headers: corsHeaders });
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

        const cleanId = safeUuid(id);
        const cleanLabId = safeUuid(lab_id);

        if (!cleanId || !cleanLabId) {
            return failure("Valid Test ID and lab_id are required", null, 400, { headers: corsHeaders });
        }

        // --- OTP Consent Verification ---
        const cookieStore = await cookies();
        const consentCookie = cookieStore.get("lab_catalog_consent");
        if (!consentCookie || consentCookie.value !== cleanLabId) {
            return failure("Consent required. Please verify OTP first.", { code: "CONSENT_REQUIRED" }, 403, { headers: corsHeaders });
        }

        // Verify ownership
        const existing = await sql`
            SELECT lab_id
            FROM lab_tests
            WHERE id = ${cleanId}
            LIMIT 1
        `;

        if (!existing.length) {
            return failure("Test not found", null, 404, { headers: corsHeaders });
        }

        if (existing[0].lab_id !== cleanLabId) {
            return failure("Unauthorized to delete this test", null, 403, { headers: corsHeaders });
        }

        await sql`
            DELETE FROM lab_tests
            WHERE id = ${cleanId}
        `;

        // Log activity
        await sql`
            INSERT INTO lab_activity_logs (
                lab_id,
                action,
                details,
                created_at
            ) VALUES (
                ${cleanLabId},
                'DELETE_TEST',
                ${JSON.stringify({ test_id: cleanId })}::jsonb,
                NOW()
            )
        `.catch(e => console.warn("Failed to insert lab_activity_log:", e.message));

        return success("Test deleted successfully", null, 200, { headers: corsHeaders });
    } catch (error) {
        console.error("Error deleting lab test:", error);
        return failure("Failed to delete test", error.message, 500, { headers: corsHeaders });
    }
}
