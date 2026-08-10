import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

import { cookies } from "next/headers";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// POST — Bulk insert tests from CSV
export async function POST(req) {
    try {
        const body = await req.json();
        const { lab_id, tests } = body;

        if (!lab_id || !Array.isArray(tests) || tests.length === 0) {
            return failure("lab_id and a non-empty tests array are required", null, 400, { headers: corsHeaders });
        }

        // --- OTP Consent Verification ---
        const cookieStore = await cookies();
        const consentCookie = cookieStore.get("lab_catalog_consent");
        if (!consentCookie || consentCookie.value !== lab_id) {
            return failure("Consent required. Please verify OTP first.", { code: "CONSENT_REQUIRED" }, 403, { headers: corsHeaders });
        }
        // --------------------------------

        // ── 1. Fetch existing categories ──────────────────────────
        const { data: existingCategories } = await supabase
            .from("lab_test_categories")
            .select("id, name, slug")
            .eq("status", true);

        // Build a lookup map: lowercase name → category
        const categoryMap = {};
        (existingCategories || []).forEach(cat => {
            categoryMap[cat.name.toLowerCase()] = cat;
        });

        // ── 2. Collect unique new category names from CSV ─────────
        const newCategoryNames = new Set();
        for (const t of tests) {
            const catName = (t.category_name || "").trim();
            if (catName && !categoryMap[catName.toLowerCase()]) {
                newCategoryNames.add(catName);
            }
        }

        // ── 3. Create missing categories ──────────────────────────
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

            // Add new categories to lookup map
            (createdCats || []).forEach(cat => {
                categoryMap[cat.name.toLowerCase()] = cat;
            });

            // For any that upsert didn't return (already existed with that slug), re-fetch
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

        // ── 4. Get the latest MGR code for this lab ───────────────
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

        // ── 5. Build insert rows ──────────────────────────────────
        const insertRows = [];
        const errors = [];
        const createdCategories = [];

        for (let i = 0; i < tests.length; i++) {
            const t = tests[i];
            if (!t.test_name || t.price === undefined || t.price === "" || t.price === null) {
                errors.push({ row: i + 1, test_name: t.test_name || "(empty)", reason: "Missing test_name or price" });
                continue;
            }

            // Resolve category
            const catName = (t.category_name || "").trim();
            let resolvedCatId = t.category_id || null;
            if (catName && !resolvedCatId) {
                const matched = categoryMap[catName.toLowerCase()];
                if (matched) {
                    resolvedCatId = matched.id;
                }
            }

            const generatedTestCode = `MGR${String(nextNumber).padStart(4, '0')}`;
            nextNumber++;

            insertRows.push({
                lab_id,
                test_code: generatedTestCode,
                test_name: t.test_name?.trim(),
                category_id: resolvedCatId,
                price: parseFloat(t.price),
                specimen_type: t.specimen_type?.trim() || null,
                container: t.container?.trim() || null,
                temperature: t.temperature?.trim() || null,
                remarks: t.remarks?.trim() || null,
                schedule: t.schedule?.trim() || null,
                reporting_schedule: t.reporting_schedule?.trim() || null,
                turnaround_time: t.turnaround_time?.trim() || null,
                clinical_history_required: t.clinical_history_required === true || t.clinical_history_required === "true" || t.clinical_history_required === "yes" || t.clinical_history_required === "Yes",
                is_active: t.is_active === false || t.is_active === "false" || t.is_active === "no" || t.is_active === "No" ? false : true,
            });
        }

        if (insertRows.length === 0) {
            return failure("No valid tests to import. All rows had errors.", errors, 400, { headers: corsHeaders });
        }

        // ── 6. Insert tests ───────────────────────────────────────
        const { data, error } = await supabase
            .from("lab_tests")
            .insert(insertRows)
            .select("id, test_code, test_name, price");

        if (error) throw error;

        // ── 7. Log the activity ───────────────────────────────────
        await supabase.from("lab_activity_logs").insert({
            lab_id,
            action: "BULK_UPLOAD_TESTS",
            details: {
                count: data.length,
                skipped: errors.length,
                new_categories: [...newCategoryNames],
            },
        });

        return success(
            `${data.length} tests imported successfully${errors.length > 0 ? `, ${errors.length} rows skipped` : ""}${newCategoryNames.size > 0 ? `, ${newCategoryNames.size} new categories created` : ""}`,
            { imported: data, errors, new_categories: [...newCategoryNames] },
            201,
            { headers: corsHeaders }
        );
    } catch (error) {
        console.error("Error bulk uploading lab tests:", error);
        return failure("Failed to bulk upload tests", error.message, 500, { headers: corsHeaders });
    }
}
