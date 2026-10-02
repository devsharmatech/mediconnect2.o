import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { cookies } from "next/headers";

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// GET all tests for a specific lab
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const lab_id = searchParams.get('lab_id');

        const cleanLabId = safeUuid(lab_id);
        if (!cleanLabId) {
            return failure("Valid lab_id is required", null, 400, { headers: corsHeaders });
        }

        const tests = await sql`
            SELECT 
                lt.*,
                CASE WHEN c.id IS NOT NULL THEN
                    json_build_object('id', c.id, 'name', c.name, 'icon', c.icon)
                ELSE NULL END as category
            FROM lab_tests lt
            LEFT JOIN lab_test_categories c ON lt.category_id = c.id
            WHERE lt.lab_id = ${cleanLabId}
            ORDER BY lt.created_at DESC
        `;

        return success("Tests fetched successfully", tests, 200, { headers: corsHeaders });
    } catch (error) {
        console.error("Error fetching lab tests:", error);
        return failure("Failed to fetch tests", error.message, 500, { headers: corsHeaders });
    }
}

// POST create new test
export async function POST(req) {
    try {
        const body = await req.json();
        const { lab_id, category_id, test_code, test_name, price, specimen_type, clinical_history_required, turnaround_time, is_active, container, temperature, remarks, schedule, reporting_schedule, collection_type } = body;

        const cleanLabId = safeUuid(lab_id);
        if (!cleanLabId || !test_name || price === undefined) {
            return failure("Valid lab_id, test_name, and price are required", null, 400, { headers: corsHeaders });
        }

        const normalizedCollectionType = ['home', 'lab', 'both'].includes((collection_type || '').toLowerCase())
            ? collection_type.toLowerCase()
            : 'lab';

        // --- OTP Consent Verification ---
        const cookieStore = await cookies();
        const consentCookie = cookieStore.get("lab_catalog_consent");
        if (!consentCookie || consentCookie.value !== cleanLabId) {
            return failure("Consent required. Please verify OTP first.", { code: "CONSENT_REQUIRED" }, 403, { headers: corsHeaders });
        }

        let generatedTestCode = test_code;
        if (!generatedTestCode) {
            const latestTests = await sql`
                SELECT test_code
                FROM lab_tests
                WHERE lab_id = ${cleanLabId} AND test_code LIKE '%MGR%'
                ORDER BY created_at DESC
                LIMIT 1
            `;

            let nextNumber = 1;
            if (latestTests.length > 0 && latestTests[0].test_code) {
                const match = latestTests[0].test_code.match(/MGR(\d+)/);
                if (match) {
                    nextNumber = parseInt(match[1], 10) + 1;
                }
            }
            generatedTestCode = `MGR${String(nextNumber).padStart(4, '0')}`;
        }

        const cleanCatId = safeUuid(category_id);

        const inserted = await sql`
            INSERT INTO lab_tests (
                lab_id,
                category_id,
                test_code,
                test_name,
                price,
                collection_type,
                specimen_type,
                clinical_history_required,
                turnaround_time,
                is_active,
                container,
                temperature,
                remarks,
                schedule,
                reporting_schedule,
                created_at,
                updated_at
            ) VALUES (
                ${cleanLabId},
                ${cleanCatId},
                ${generatedTestCode},
                ${test_name},
                ${Number(price)},
                ${normalizedCollectionType},
                ${specimen_type || null},
                ${clinical_history_required || false},
                ${turnaround_time || null},
                ${is_active !== undefined ? is_active : true},
                ${container || null},
                ${temperature || null},
                ${remarks || null},
                ${schedule || null},
                ${reporting_schedule || null},
                NOW(),
                NOW()
            )
            RETURNING *
        `;

        const newTest = inserted[0];

        // Fetch category details if exists
        let category = null;
        if (cleanCatId) {
            const catRes = await sql`SELECT id, name, icon FROM lab_test_categories WHERE id = ${cleanCatId} LIMIT 1`;
            if (catRes.length > 0) category = catRes[0];
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
                'CREATE_TEST',
                ${JSON.stringify({ test_name, test_code: generatedTestCode, price })}::jsonb,
                NOW()
            )
        `.catch(e => console.warn("Failed to insert lab_activity_log:", e.message));

        return success("Test created successfully", { ...newTest, category }, 201, { headers: corsHeaders });
    } catch (error) {
        console.error("Error creating lab test:", error);
        return failure("Failed to create test", error.message, 500, { headers: corsHeaders });
    }
}
