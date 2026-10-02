import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { cookies } from "next/headers";

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// POST — Bulk insert tests from CSV
export async function POST(req) {
    try {
        const body = await req.json();
        const { lab_id, tests } = body;

        const cleanLabId = safeUuid(lab_id);
        if (!cleanLabId || !Array.isArray(tests) || tests.length === 0) {
            return failure("Valid lab_id and a non-empty tests array are required", null, 400, { headers: corsHeaders });
        }

        // --- OTP Consent Verification ---
        const cookieStore = await cookies();
        const consentCookie = cookieStore.get("lab_catalog_consent");
        if (!consentCookie || consentCookie.value !== cleanLabId) {
            return failure("Consent required. Please verify OTP first.", { code: "CONSENT_REQUIRED" }, 403, { headers: corsHeaders });
        }

        // 1. Fetch existing categories
        const existingCategories = await sql`
            SELECT id, name, slug
            FROM lab_test_categories
            WHERE status = true
        `;

        const categoryMap = {};
        for (const cat of existingCategories) {
            categoryMap[cat.name.toLowerCase()] = cat;
        }

        // 2. Collect unique new category names from CSV
        const newCategoryNames = new Set();
        for (const t of tests) {
            const catName = (t.category_name || "").trim();
            if (catName && !categoryMap[catName.toLowerCase()]) {
                newCategoryNames.add(catName);
            }
        }

        // 3. Create missing categories
        if (newCategoryNames.size > 0) {
            for (const name of newCategoryNames) {
                const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                try {
                    const insertedCat = await sql`
                        INSERT INTO lab_test_categories (name, slug, status, created_at)
                        VALUES (${name}, ${slug}, true, NOW())
                        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
                        RETURNING id, name, slug
                    `;
                    if (insertedCat.length > 0) {
                        categoryMap[name.toLowerCase()] = insertedCat[0];
                    }
                } catch (catErr) {
                    console.error("Error creating category:", name, catErr);
                }
            }
        }

        // 4. Get latest MGR code for this lab
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

        // 5. Build insert rows
        const insertedData = [];
        const errors = [];

        for (let i = 0; i < tests.length; i++) {
            const t = tests[i];
            if (!t.test_name || t.price === undefined || t.price === "" || t.price === null) {
                errors.push({ row: i + 1, test_name: t.test_name || "(empty)", reason: "Missing test_name or price" });
                continue;
            }

            const catName = (t.category_name || "").trim();
            let resolvedCatId = safeUuid(t.category_id);
            if (catName && !resolvedCatId) {
                const matched = categoryMap[catName.toLowerCase()];
                if (matched) {
                    resolvedCatId = matched.id;
                }
            }

            const generatedTestCode = `MGR${String(nextNumber).padStart(4, '0')}`;
            nextNumber++;

            const rawColType = String(t.collection_type || t["Collection Type"] || "lab").trim().toLowerCase();
            const collection_type = ['home', 'lab', 'both'].includes(rawColType) ? rawColType : 'lab';
            const price = parseFloat(t.price);
            const clinical_history = t.clinical_history_required === true || t.clinical_history_required === "true" || t.clinical_history_required === "yes" || t.clinical_history_required === "Yes";
            const isActive = !(t.is_active === false || t.is_active === "false" || t.is_active === "no" || t.is_active === "No");

            try {
                const res = await sql`
                    INSERT INTO lab_tests (
                        lab_id,
                        test_code,
                        test_name,
                        category_id,
                        price,
                        collection_type,
                        specimen_type,
                        container,
                        temperature,
                        remarks,
                        schedule,
                        reporting_schedule,
                        turnaround_time,
                        clinical_history_required,
                        is_active,
                        created_at,
                        updated_at
                    ) VALUES (
                        ${cleanLabId},
                        ${generatedTestCode},
                        ${t.test_name.trim()},
                        ${resolvedCatId},
                        ${price},
                        ${collection_type},
                        ${t.specimen_type?.trim() || null},
                        ${t.container?.trim() || null},
                        ${t.temperature?.trim() || null},
                        ${t.remarks?.trim() || null},
                        ${t.schedule?.trim() || null},
                        ${t.reporting_schedule?.trim() || null},
                        ${t.turnaround_time?.trim() || null},
                        ${clinical_history},
                        ${isActive},
                        NOW(),
                        NOW()
                    )
                    RETURNING id, test_code, test_name, price
                `;
                if (res.length > 0) {
                    insertedData.push(res[0]);
                }
            } catch (err) {
                errors.push({ row: i + 1, test_name: t.test_name, reason: err.message });
            }
        }

        if (insertedData.length === 0) {
            return failure("No valid tests to import. All rows had errors.", errors, 400, { headers: corsHeaders });
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
                'BULK_UPLOAD_TESTS',
                ${JSON.stringify({
                    count: insertedData.length,
                    skipped: errors.length,
                    new_categories: [...newCategoryNames],
                })}::jsonb,
                NOW()
            )
        `.catch(e => console.warn("Failed to insert lab_activity_log:", e.message));

        return success(
            `${insertedData.length} tests imported successfully${errors.length > 0 ? `, ${errors.length} rows skipped` : ""}${newCategoryNames.size > 0 ? `, ${newCategoryNames.size} new categories created` : ""}`,
            { imported: insertedData, errors, new_categories: [...newCategoryNames] },
            201,
            { headers: corsHeaders }
        );
    } catch (error) {
        console.error("Error bulk uploading lab tests:", error);
        return failure("Failed to bulk upload tests", error.message, 500, { headers: corsHeaders });
    }
}
