import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// POST — Admin Bulk insert tests from CSV for any selected lab
export async function POST(req) {
    try {
        const body = await req.json();
        const { lab_id, tests } = body;

        if (!lab_id) {
            return failure("lab_id is required", null, 400, { headers: corsHeaders });
        }

        if (!Array.isArray(tests) || tests.length === 0) {
            return failure("A non-empty tests array is required", null, 400, { headers: corsHeaders });
        }

        // ── 1. Validate that the Lab exists ───────────────────────
        const { data: lab, error: labErr } = await supabase
            .from("lab_details")
            .select("id, lab_name")
            .eq("id", lab_id)
            .single();

        if (labErr || !lab) {
            return failure("Selected lab not found", null, 404, { headers: corsHeaders });
        }

        // ── 2. Fetch existing categories ──────────────────────────
        const { data: existingCategories } = await supabase
            .from("lab_test_categories")
            .select("id, name, slug")
            .eq("status", true);

        // Build a lookup map: lowercase name → category
        const categoryMap = {};
        (existingCategories || []).forEach(cat => {
            categoryMap[cat.name.toLowerCase()] = cat;
        });

        // ── 3. Collect unique new category names from CSV ─────────
        const newCategoryNames = new Set();
        for (const t of tests) {
            const catName = (t.category_name || t["Category"] || "").trim();
            if (catName && !categoryMap[catName.toLowerCase()]) {
                newCategoryNames.add(catName);
            }
        }

        // ── 4. Create missing categories ──────────────────────────
        if (newCategoryNames.size > 0) {
            const newCats = [...newCategoryNames].map(name => ({
                name: name,
                slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
                status: true,
            }));

            const { data: createdCats, error: catError } = await supabase
                .from("lab_test_categories")
                .upsert(newCats, { onConflict: "slug", ignoreDuplicates: true })
                .select("id, name, slug");

            if (catError) {
                console.error("Error creating categories:", catError);
            }

            (createdCats || []).forEach(cat => {
                categoryMap[cat.name.toLowerCase()] = cat;
            });

            // Re-fetch for any that already existed with that slug
            if (createdCats && createdCats.length < newCategoryNames.size) {
                const slugs = [...newCategoryNames].map(n => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                const { data: refetched } = await supabase
                    .from("lab_test_categories")
                    .select("id, name, slug")
                    .in("slug", slugs);
                (refetched || []).forEach(cat => {
                    categoryMap[cat.name.toLowerCase()] = cat;
                });
            }
        }

        // ── 5. Get the latest MGR code for this lab ───────────────
        const { data: latestTest } = await supabase
            .from("lab_tests")
            .select("test_code")
            .eq("lab_id", lab_id)
            .like("test_code", "%MGR%")
            .order("created_at", { ascending: false })
            .limit(1);

        let nextNumber = 1;
        if (latestTest && latestTest.length > 0 && latestTest[0].test_code) {
            const match = latestTest[0].test_code.match(/MGR(\d+)/);
            if (match) {
                nextNumber = parseInt(match[1], 10) + 1;
            }
        }

        // ── 6. Build insert rows ──────────────────────────────────
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

            // Resolve category
            const catName = (t.category_name || t["Category"] || "").trim();
            let resolvedCatId = t.category_id || null;
            if (catName && !resolvedCatId) {
                const matched = categoryMap[catName.toLowerCase()];
                if (matched) {
                    resolvedCatId = matched.id;
                }
            }

            // Parse collection type (home, lab, both)
            const rawColType = String(t.collection_type || t["Collection Type"] || "lab").trim().toLowerCase();
            const collection_type = ['home', 'lab', 'both'].includes(rawColType) ? rawColType : 'lab';

            const generatedTestCode = `MGR${String(nextNumber).padStart(4, '0')}`;
            nextNumber++;

            insertRows.push({
                lab_id,
                test_code: generatedTestCode,
                test_name: testName,
                category_id: resolvedCatId,
                price: parsedPrice,
                collection_type,
                specimen_type: (t.specimen_type || t["Sample Type"] || "").trim() || null,
                container: (t.container || t["Container"] || "").trim() || null,
                temperature: (t.temperature || t["Temperature"] || "").trim() || null,
                remarks: (t.remarks || t["Remarks"] || "").trim() || null,
                schedule: (t.schedule || t["Schedule"] || "").trim() || null,
                reporting_schedule: (t.reporting_schedule || t["Reporting Schedule"] || "").trim() || null,
                turnaround_time: (t.turnaround_time || t["Turnaround Time"] || "").trim() || null,
                clinical_history_required: ["yes", "true", "1"].includes(String(t.clinical_history_required || t["Clinical History Required"] || "").trim().toLowerCase()),
                is_active: !["no", "false", "0"].includes(String(t.is_active || t["Active"] || "").trim().toLowerCase()),
            });
        }

        if (insertRows.length === 0) {
            return failure("No valid tests to import. All rows had errors.", errors, 400, { headers: corsHeaders });
        }

        // ── 7. Insert tests in batches of 500 if large ─────────────
        const batchSize = 500;
        let totalInserted = 0;
        const insertedData = [];

        for (let i = 0; i < insertRows.length; i += batchSize) {
            const batch = insertRows.slice(i, i + batchSize);
            const { data, error } = await supabase
                .from("lab_tests")
                .insert(batch)
                .select("id, test_code, test_name, price, collection_type");

            if (error) throw error;
            totalInserted += (data || []).length;
            if (data) insertedData.push(...data);
        }

        // ── 8. Log the admin activity ─────────────────────────────
        try {
            await supabase.from("lab_activity_logs").insert({
                lab_id,
                action: "ADMIN_BULK_UPLOAD_TESTS",
                details: {
                    count: totalInserted,
                    skipped: errors.length,
                    new_categories: [...newCategoryNames],
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (logErr) {
            console.warn("Lab activity log warning:", logErr?.message);
        }

        return success(
            `${totalInserted} tests imported successfully for ${lab.lab_name}${errors.length > 0 ? `, ${errors.length} rows skipped` : ""}${newCategoryNames.size > 0 ? `, ${newCategoryNames.size} new categories created` : ""}`,
            {
                imported_count: totalInserted,
                errors,
                new_categories: [...newCategoryNames],
                lab_name: lab.lab_name,
                tests: insertedData.slice(0, 10) // Preview first 10
            },
            201,
            { headers: corsHeaders }
        );
    } catch (error) {
        console.error("Error admin bulk uploading lab tests:", error);
        return failure("Failed to bulk upload tests", error.message, 500, { headers: corsHeaders });
    }
}
