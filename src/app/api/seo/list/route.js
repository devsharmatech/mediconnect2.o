import sql from "@/lib/db";
import { NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

// Predefined catalog of all website pages with routes and categories
const STATIC_PAGE_CATALOG = [
  { key: "home", name: "Homepage", route: "/", category: "Core" },
  { key: "about", name: "About Us", route: "/about", category: "Core" },
  { key: "contact", name: "Contact Us", route: "/contact", category: "Core" },
  { key: "doctors", name: "Doctors Directory", route: "/doctors", category: "Clinical" },
  { key: "doctor-detail", name: "Doctor Profile & Slot Booking", route: "/doctor", category: "Clinical" },
  { key: "services", name: "Healthcare Services", route: "/services", category: "Services" },
  { key: "lab-tests", name: "Diagnostic Lab Tests", route: "/services/lab-tests", category: "Services" },
  { key: "medicine-order", name: "Medicine Delivery", route: "/medicine-order", category: "Services" },
  { key: "nursing-care", name: "Home Nursing Care", route: "/nursing-care", category: "Services" },
  { key: "cardio-connect", name: "CardioConnect Heart Program", route: "/cardio-connect", category: "Programs" },
  { key: "lung-connect", name: "LungConnect Pulmonary Program", route: "/lung-connect", category: "Programs" },
  { key: "digital-health-records", name: "ABHA & Digital Health Records", route: "/digital-health-records", category: "Health Locker" },
  { key: "faqs", name: "Frequently Asked Questions", route: "/faqs", category: "Information" },
  { key: "resources", name: "Health Resources & Articles", route: "/resources", category: "Information" },
  { key: "privacy", name: "Privacy Policy", route: "/privacy", category: "Legal" },
  { key: "terms", name: "Terms & Conditions", route: "/terms", category: "Legal" },
  { key: "refund-policy", name: "Cancellation & Refund Policy", route: "/refund-policy", category: "Legal" },
  { key: "telemedicine-policy", name: "Telemedicine Practice Policy", route: "/telemedicine-policy", category: "Legal" },
  { key: "telemedicine-disclaimer", name: "Telemedicine Disclaimer", route: "/telemedicine-disclaimer", category: "Legal" },
  { key: "grievance-redressal", name: "Grievance Redressal & Compliance", route: "/grievance-redressal", category: "Legal" },
];

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search")?.toLowerCase().trim();

    // 1. Fetch Global Settings
    const [globalSettings] = await sql`
      SELECT * FROM seo_global_settings WHERE id = 1 LIMIT 1
    `;

    // 2. Fetch all SEO metadata rows
    const rows = await sql`
      SELECT * FROM seo_metadata 
      WHERE seoable_type IS NULL OR seoable_type = ''
      ORDER BY updated_at DESC
    `;

    const rowMap = new Map();
    rows.forEach((r) => {
      if (r.page_key) rowMap.set(r.page_key, r);
    });

    // 3. Build page list merging catalog with database records
    let pages = STATIC_PAGE_CATALOG.map((item) => {
      const dbRecord = rowMap.get(item.key);
      const isCustomized = Boolean(dbRecord?.is_customized);
      const metaTitle = dbRecord?.meta_title || globalSettings?.default_meta_title || "";
      const metaDescription = dbRecord?.meta_description || globalSettings?.default_meta_description || "";
      const ogImage = dbRecord?.og_image || globalSettings?.default_og_image || "";
      const canonicalUrl = dbRecord?.canonical_url || `https://mediconnect.fit${item.route === "/" ? "" : item.route}`;
      const robots = dbRecord?.robots || globalSettings?.default_robots || "index, follow";

      // Calculate an informational SEO Health Score (0-100)
      let score = 0;
      // Title: +25 if between 30 and 65 chars
      if (metaTitle.length >= 30 && metaTitle.length <= 65) score += 25;
      else if (metaTitle.length > 0) score += 15;

      // Description: +25 if between 120 and 165 chars
      if (metaDescription.length >= 120 && metaDescription.length <= 165) score += 25;
      else if (metaDescription.length > 0) score += 15;

      // Canonical URL: +15 if valid https
      if (canonicalUrl.startsWith("https://")) score += 15;

      // OG Image: +15 if present
      if (ogImage) score += 15;

      // Schema Type & JSON: +10 if set
      if (dbRecord?.schema_type) score += 10;

      // Robots directive valid: +10
      if (robots.includes("index")) score += 10;

      return {
        id: dbRecord?.id || null,
        key: item.key,
        name: item.name,
        route: item.route,
        category: item.category,
        is_customized: isCustomized,
        meta_title: metaTitle,
        meta_description: metaDescription,
        og_image: ogImage,
        canonical_url: canonicalUrl,
        robots: robots,
        score,
        updated_at: dbRecord?.updated_at || null,
      };
    });

    // Filtering
    if (category && category !== "all") {
      if (category === "customized") {
        pages = pages.filter((p) => p.is_customized);
      } else if (category === "inherited") {
        pages = pages.filter((p) => !p.is_customized);
      } else {
        pages = pages.filter((p) => p.category.toLowerCase() === category.toLowerCase());
      }
    }

    if (search) {
      pages = pages.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.key.toLowerCase().includes(search) ||
          p.route.toLowerCase().includes(search) ||
          p.meta_title.toLowerCase().includes(search)
      );
    }

    // Stats summary
    const totalPages = STATIC_PAGE_CATALOG.length;
    const customizedCount = pages.filter((p) => p.is_customized).length;
    const inheritedCount = totalPages - customizedCount;
    const avgScore =
      pages.length > 0
        ? Math.round(pages.reduce((acc, p) => acc + p.score, 0) / pages.length)
        : 85;

    return NextResponse.json(
      {
        success: true,
        pages,
        stats: {
          total_pages: totalPages,
          customized: customizedCount,
          inherited: inheritedCount,
          avg_score: avgScore,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("GET /api/seo/list Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list SEO pages" },
      { status: 500, headers: corsHeaders }
    );
  }
}
