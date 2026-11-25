import sql from "@/lib/db";
import { NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET() {
  try {
    const [settings] = await sql`
      SELECT * FROM seo_global_settings WHERE id = 1 LIMIT 1
    `;

    return NextResponse.json(
      {
        success: true,
        data: settings || {
          site_name: "MediConnect",
          default_meta_title: "MediConnect | Trusted Healthcare & Telemedicine Platform",
          default_meta_description: "Book verified doctors, lab tests, medicine delivery, and digital health records with MediConnect.",
          default_meta_keywords: "healthcare, doctor consultation, online doctor, telemedicine, lab tests",
          default_meta_author: "MediConnect Medical Team",
          default_og_image: "https://mediconnect.fit/images/og-default.png",
          default_robots: "index, follow",
          default_googlebot: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
          default_og_site_name: "MediConnect",
          twitter_site: "@mediconnectfit",
          default_language: "en_US",
          default_canonical_base: "https://mediconnect.fit",
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("GET /api/seo/global Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch global SEO settings" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();

    const cleanJson = (val) => {
      if (!val) return null;
      if (typeof val === "object") return sql.json(val);
      try {
        return sql.json(JSON.parse(val));
      } catch {
        return null;
      }
    };

    const updateData = {
      site_name: body.site_name || "MediConnect",
      default_meta_title: body.default_meta_title || "MediConnect | Trusted Healthcare & Telemedicine Platform",
      default_meta_description: body.default_meta_description || "",
      default_meta_keywords: body.default_meta_keywords || "",
      default_meta_author: body.default_meta_author || "MediConnect Medical Team",
      default_og_image: body.default_og_image || "",
      default_robots: body.default_robots || "index, follow",
      default_googlebot: body.default_googlebot || "index, follow, max-snippet:-1, max-image-preview:large",
      default_og_site_name: body.default_og_site_name || "MediConnect",
      twitter_site: body.twitter_site || "@mediconnectfit",
      default_language: body.default_language || "en_US",
      default_canonical_base: body.default_canonical_base || "https://mediconnect.fit",
      organization_schema: cleanJson(body.organization_schema),
      website_schema: cleanJson(body.website_schema),
      updated_at: new Date(),
    };

    const keys = Object.keys(updateData);
    const [updated] = await sql`
      INSERT INTO seo_global_settings (id, ${sql(keys)})
      VALUES (1, ${sql(Object.values(updateData))})
      ON CONFLICT (id) DO UPDATE SET
        ${sql(updateData, ...keys)}
      RETURNING *
    `;

    return NextResponse.json(
      {
        success: true,
        message: "Global SEO settings updated successfully",
        data: updated,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("PUT /api/seo/global Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update global SEO settings" },
      { status: 500, headers: corsHeaders }
    );
  }
}
