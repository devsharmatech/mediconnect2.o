import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { cookies } from "next/headers";

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// POST — Bulk insert tests from CSV for the authenticated lab
export async function POST(req) {
    try {
        const body = await req.json();
        const { lab_id, tests } = body;

        const cleanLabId = safeUuid(lab_id);
        if (!cleanLabId || !Array.isArray(tests) || tests.length === 0) {
            return failure("Valid lab_id and a non-empty tests array are required", null, 400, { headers: corsHeaders });
        }

        // ── 1. OTP Consent Verification ─────────────────────────────
        const cookieStore = await cookies();
        const consentCookie = cookieStore.get("lab_catalog_consent");
        const hasConsent = consentCookie && consentCookie.value === cleanLabId;

        if (!hasConsent) {
            return failure("Consent required. Please verify OTP first.", { code: "CONSENT_REQUIRED" }, 403, { headers: corsHeaders });
        }

        // ── 2. Verify that Lab exists ───────────────────────────────
        const labRows = await sql`
            SELECT ld.id, ld.lab_name
            FROM lab_details ld
            WHERE ld.id = ${cleanLabId}
            LIMIT 1
        `;

        if (labRows.length === 0) {
            return failure("Lab account not found", null, 404, { headers: corsHeaders });
        }

        const lab = labRows[0];

        // ── 3. Fetch existing categories ────────────────────────────
        const existingCategories = await sql`
            SELECT id, name, slug
            FROM lab_test_categories
            WHERE status = true
        `;

        const categoryMap = {};
        for (const cat of existingCategories) {
            categoryMap[cat.name.toLowerCase()] = cat;
        }

        // ── 4. Collect unique new category names from CSV ───────────
        const newCategoryNames = new Set();
        for (const t of tests) {
            const catName = (t.category_name || t["Category"] || "").trim();
            if (catName && !categoryMap[catName.toLowerCase()]) {
                newCategoryNames.add(catName);
            }
        }

        // ── 5. Create missing categories ────────────────────────────
        if (newCategoryNames.size > 0) {
            for (const name of newCategoryNames) {
                const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                try {
                    const insertedCat = await sql`
                        INSERT INTO lab_test_categories (name, slug, status, created_at, updated_at)
                        VALUES (${name}, ${slug}, true, NOW(), NOW())
                        ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
                        RETURNING id, name, slug
                    `;
                    if (insertedCat.length > 0) {
                        categoryMap[name.toLowerCase()] = insertedCat[0];
                    }
                } catch (catErr) {
                    console.error("Error creating category:", name, catErr.message);
                }
            }

            // Refetch any category not yet mapped
            const unmapped = [...newCategoryNames].filter(n => !categoryMap[n.toLowerCase()]);
            if (unmapped.length > 0) {
                const slugs = unmapped.map(n => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                const refetched = await sql`
                    SELECT id, name, slug
                    FROM lab_test_categories
                    WHERE slug = ANY(${slugs})
                `;
                refetched.forEach(cat => {
                    categoryMap[cat.name.toLowerCase()] = cat;
                });
            }
        }

        // ── 6. Get latest MGR code for this lab ─────────────────────
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

        // ── 7. Build insert rows with strict validation ─────────────
        const insertRows = [];
        const errors = [];

        for (let i = 0; i < tests.length; i++) {
            const t = tests[i];
            const testName = (t.test_name || t["Test Name"] || "").trim();
            const rawPrice = t.price !== undefined ? t.price : t["Price"];

            if (!testName || rawPrice === undefined || rawPrice === "" || rawPrice === null) {
                errors.push({ row: i + 1, test_name: testName || "(empty)", reason: "Missing test_name or price" });
                continue;
            }

            const parsedPrice = parseFloat(rawPrice);
            if (isNaN(parsedPrice) || parsedPrice < 0) {
                errors.push({ row: i + 1, test_name: testName, reason: "Invalid price value" });
                continue;
            }

            const catName = (t.category_name || t["Category"] || "").trim();
            let resolvedCatId = safeUuid(t.category_id);
            if (catName && !resolvedCatId) {
                const matched = categoryMap[catName.toLowerCase()];
                if (matched) {
                    resolvedCatId = matched.id;
                }
            }

            const generatedTestCode = t.test_code?.trim() || `MGR${String(nextNumber).padStart(4, '0')}`;
            nextNumber++;

            // Strict collection_type check: 'home', 'lab', 'both'
            const rawColType = String(t.collection_type || t["Collection Type"] || "lab").trim().toLowerCase();
            const collection_type = ['home', 'lab', 'both'].includes(rawColType) ? rawColType : 'lab';

            const clinical_history = ["yes", "true", "1"].includes(
                String(t.clinical_history_required || t["Clinical History Required"] || "").trim().toLowerCase()
            );

            const isActive = !["no", "false", "0"].includes(
                String(t.is_active || t["Active"] || "").trim().toLowerCase()
            );

            const rawRemarks = (t.remarks || t["Remarks"] || "").trim() || null;
            const requiresFasting = ["yes", "true", "1"].includes(
                String(t.requires_fasting || t["Requires Fasting"] || "").trim().toLowerCase()
            ) || (rawRemarks ? /fasting/i.test(rawRemarks) : false);

            insertRows.push({
                lab_id: cleanLabId,
                test_code: generatedTestCode,
                test_name: testName,
                category_id: resolvedCatId,
                price: parsedPrice,
                collection_type,
                specimen_type: (t.specimen_type || t["Sample Type"] || "").trim() || null,
                container: (t.container || t["Container"] || "").trim() || null,
                temperature: (t.temperature || t["Temperature"] || "").trim() || null,
                remarks: rawRemarks,
                schedule: (t.schedule || t["Schedule"] || "").trim() || null,
                reporting_schedule: (t.reporting_schedule || t["Reporting Schedule"] || "").trim() || null,
                turnaround_time: (t.turnaround_time || t["Turnaround Time"] || "").trim() || null,
                clinical_history_required: clinical_history,
                requires_fasting: requiresFasting,
                is_active: isActive,
            });
        }

        if (insertRows.length === 0) {
            return failure("No valid tests to import. All rows had errors.", errors, 400, { headers: corsHeaders });
        }

        // ── 8. Batch Insert in chunks of 500 ────────────────────────
        const batchSize = 500;
        let totalInserted = 0;
        const insertedData = [];

        for (let i = 0; i < insertRows.length; i += batchSize) {
            const batch = insertRows.slice(i, i + batchSize);
            const inserted = await sql`
                INSERT INTO lab_tests ${sql(batch)}
                RETURNING id, test_code, test_name, price, collection_type
            `;
            totalInserted += inserted.length;
            insertedData.push(...inserted);
        }

        // ── 9. Log activity into lab_activity_logs ──────────────────
        try {
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
                        count: totalInserted,
                        skipped: errors.length,
                        new_categories: [...newCategoryNames],
                        timestamp: new Date().toISOString(),
                    })}::jsonb,
                    NOW()
                )
            `;
        } catch (logErr) {
            console.warn("Lab activity log warning:", logErr.message);
        }

        return success(
            `${totalInserted} tests imported successfully for ${lab.lab_name}${errors.length > 0 ? `, ${errors.length} rows skipped` : ""}${newCategoryNames.size > 0 ? `, ${newCategoryNames.size} new categories created` : ""}`,
            {
                imported_count: totalInserted,
                errors,
                new_categories: [...newCategoryNames],
                tests: insertedData.slice(0, 10), // Preview sample
            },
            201,
            { headers: corsHeaders }
        );
    } catch (error) {
        console.error("Error bulk uploading lab tests:", error);
        return failure("Failed to bulk upload tests", error.message, 500, { headers: corsHeaders });
    }
}
