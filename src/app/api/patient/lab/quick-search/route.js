import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
    return new Response("OK", { headers: corsHeaders });
}

// GET — Dynamic quick search filters & categories directly from AWS RDS PostgreSQL
export async function GET() {
    try {
        // 1. Popular clinical test groups with real counts & starting prices from AWS RDS
        const clinicalGroups = [
            {
                id: "cbc",
                label: "CBC Blood Test",
                query: "CBC",
                patterns: ["%CBC%", "%Complete Blood Count%"],
                icon: "FaTint",
                iconColor: "text-rose-500",
            },
            {
                id: "sugar",
                label: "Blood Sugar / Diabetes",
                query: "Sugar",
                patterns: ["%Glucose%", "%Sugar%", "%HbA1c%"],
                icon: "FaHeartbeat",
                iconColor: "text-red-500",
            },
            {
                id: "thyroid",
                label: "Thyroid Profile (TSH)",
                query: "Thyroid",
                patterns: ["%Thyroid%", "%TSH%"],
                icon: "FaVial",
                iconColor: "text-sky-500",
            },
            {
                id: "lipid",
                label: "Lipid / Cholesterol",
                query: "Lipid",
                patterns: ["%Lipid%", "%Cholesterol%"],
                icon: "FaHeartbeat",
                iconColor: "text-rose-600",
            },
            {
                id: "vitamin",
                label: "Vitamin D & B12",
                query: "Vitamin",
                patterns: ["%Vitamin%"],
                icon: "FaBolt",
                iconColor: "text-amber-500",
            },
            {
                id: "liver",
                label: "Liver (LFT)",
                query: "Liver",
                patterns: ["%Liver%", "%LFT%"],
                icon: "FaFlask",
                iconColor: "text-emerald-500",
            },
            {
                id: "kidney",
                label: "Kidney (KFT)",
                query: "Kidney",
                patterns: ["%Kidney%", "%KFT%"],
                icon: "FaMicroscope",
                iconColor: "text-purple-500",
            },
            {
                id: "urine",
                label: "Urine Routine",
                query: "Urine",
                patterns: ["%Urine Routine%", "%Urinalysis%"],
                icon: "FaFlask",
                iconColor: "text-teal-500",
            },
        ];

        const quickTests = [];
        for (const group of clinicalGroups) {
            const stats = await sql`
                SELECT 
                    COUNT(*)::int as count,
                    MIN(price)::numeric as min_price
                FROM lab_tests
                WHERE is_active = true
                  AND price > 0
                  AND (test_name ILIKE ANY(${group.patterns}) OR test_code ILIKE ANY(${group.patterns}))
            `;
            if (stats[0]?.count > 0 && stats[0]?.min_price) {
                quickTests.push({
                    id: group.id,
                    type: "test",
                    label: group.label,
                    query: group.query,
                    count: stats[0].count,
                    min_price: Number(stats[0].min_price),
                    icon: group.icon,
                    iconColor: group.iconColor,
                });
            }
        }

        // 2. Real categories from lab_test_categories in AWS RDS
        const categories = await sql`
            SELECT 
                c.id,
                c.name,
                c.slug,
                COUNT(lt.id)::int as count,
                MIN(lt.price)::numeric as min_price
            FROM lab_test_categories c
            JOIN lab_tests lt ON lt.category_id = c.id AND lt.is_active = true AND lt.price > 0
            WHERE c.name NOT ILIKE 'Category %'
            GROUP BY c.id, c.name, c.slug
            HAVING COUNT(lt.id) > 0
            ORDER BY count DESC
        `;

        // 3. Map top categories to pills
        const categoryPills = categories.map((cat) => {
            let icon = "FaMicroscope";
            let iconColor = "text-indigo-500";
            const lower = cat.name.toLowerCase();
            if (lower.includes("x-ray")) {
                icon = "FaMicroscope";
                iconColor = "text-cyan-600";
            } else if (lower.includes("ct")) {
                icon = "FaFlask";
                iconColor = "text-blue-600";
            } else if (lower.includes("ultrasound")) {
                icon = "FaVial";
                iconColor = "text-sky-600";
            } else if (lower.includes("mri")) {
                icon = "FaMicroscope";
                iconColor = "text-violet-600";
            } else if (lower.includes("cardiology")) {
                icon = "FaHeartbeat";
                iconColor = "text-red-600";
            } else if (lower.includes("doppler")) {
                icon = "FaTint";
                iconColor = "text-teal-600";
            }

            return {
                id: `cat-${cat.id}`,
                type: "category",
                category_id: cat.id,
                label: cat.name.replace("Radiology / ", ""),
                full_label: cat.name,
                count: cat.count,
                min_price: Number(cat.min_price),
                icon,
                iconColor,
            };
        });

        // 4. Overall network counts
        const networkStats = await sql`
            SELECT 
                COUNT(*)::int as total_tests,
                (SELECT COUNT(*)::int FROM lab_details WHERE onboarding_status = 'approved') as total_labs
            FROM lab_tests
            WHERE is_active = true
        `;

        return success("Quick search data fetched successfully", {
            quick_filters: [
                {
                    id: "all",
                    type: "all",
                    label: "All Tests",
                    query: "",
                    count: networkStats[0]?.total_tests || 0,
                    icon: "FaFlask",
                    iconColor: "text-[#0067A1]",
                },
                ...quickTests,
                ...categoryPills,
            ],
            categories: categories.map((c) => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
                count: c.count,
                min_price: Number(c.min_price),
            })),
            total_tests: networkStats[0]?.total_tests || 0,
            total_labs: networkStats[0]?.total_labs || 0,
        }, 200);
    } catch (error) {
        console.error("Lab quick search error:", error);
        return failure("Failed to fetch quick search filters", error.message, 500, { headers: corsHeaders });
    }
}
