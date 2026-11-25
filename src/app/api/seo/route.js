import sql from "@/lib/db";
import { NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const pageKey = searchParams.get("page_key");
    const seoableType = searchParams.get("seoable_type");
    const seoableId = searchParams.get("seoable_id");

    if (!pageKey && (!seoableType || !seoableId)) {
      return NextResponse.json(
        { success: false, error: "Either page_key or seoable_type & seoable_id is required." },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Fetch Global Settings as fallback
    const [globalSettings] = await sql`
      SELECT * FROM seo_global_settings WHERE id = 1 LIMIT 1
    `;

    // 2. Fetch specific SEO record
    let record = null;
    if (pageKey) {
      const [found] = await sql`
        SELECT * FROM seo_metadata 
        WHERE page_key = ${pageKey} AND (seoable_type IS NULL OR seoable_type = '')
        LIMIT 1
      `;
      record = found || null;
    } else if (seoableType && seoableId) {
      const [found] = await sql`
        SELECT * FROM seo_metadata 
        WHERE seoable_type = ${seoableType} AND seoable_id = ${seoableId}
        LIMIT 1
      `;
      record = found || null;
    }

    const g = globalSettings || {};

    // Merged metadata where page level takes precedence, falling back to global
    const effective = {
      meta_title: record?.meta_title || g.default_meta_title || "MediConnect",
      meta_description: record?.meta_description || g.default_meta_description || "",
      meta_keywords: record?.meta_keywords || g.default_meta_keywords || "",
      meta_author: record?.meta_author || g.default_meta_author || "MediConnect Medical Team",
      canonical_url: record?.canonical_url || (g.default_canonical_base ? `${g.default_canonical_base}/${pageKey === "home" ? "" : pageKey || ""}` : ""),
      robots: record?.robots || g.default_robots || "index, follow",
      googlebot: record?.googlebot || g.default_googlebot || "index, follow, max-snippet:-1, max-image-preview:large",
      og_title: record?.og_title || record?.meta_title || g.default_meta_title || "MediConnect",
      og_description: record?.og_description || record?.meta_description || g.default_meta_description || "",
      og_image: record?.og_image || g.default_og_image || "",
      og_type: record?.og_type || "website",
      og_url: record?.og_url || record?.canonical_url || g.default_canonical_base || "",
      og_site_name: record?.og_site_name || g.default_og_site_name || "MediConnect",
      og_locale: record?.og_locale || g.default_language || "en_US",
      twitter_card: record?.twitter_card || "summary_large_image",
      twitter_title: record?.twitter_title || record?.og_title || record?.meta_title || g.default_meta_title || "MediConnect",
      twitter_description: record?.twitter_description || record?.og_description || record?.meta_description || g.default_meta_description || "",
      twitter_image: record?.twitter_image || record?.og_image || g.default_og_image || "",
      twitter_site: record?.twitter_site || g.twitter_site || "@mediconnectfit",
      schema_type: record?.schema_type || "WebPage",
      schema_json: record?.schema_json || null,
      breadcrumb_schema: record?.breadcrumb_schema || null,
      article_published_time: record?.article_published_time || null,
      article_modified_time: record?.article_modified_time || null,
      article_author: record?.article_author || null,
      hreflang: record?.hreflang || [],
      custom_meta_tags: record?.custom_meta_tags || [],
    };

    return NextResponse.json(
      {
        success: true,
        data: record,
        effective,
        global: g,
        is_customized: Boolean(record?.is_customized),
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("GET /api/seo Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch SEO record" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { page_key, seoable_type, seoable_id, reset_to_default } = body;

    if (!page_key && (!seoable_type || !seoable_id)) {
      return NextResponse.json(
        { success: false, error: "Either page_key or seoable_type & seoable_id is required." },
        { status: 400, headers: corsHeaders }
      );
    }

    // If reset_to_default is true, clear the customization
    if (reset_to_default) {
      if (page_key) {
        await sql`
          UPDATE seo_metadata SET
            meta_title = NULL,
            meta_description = NULL,
            meta_keywords = NULL,
            meta_author = NULL,
            canonical_url = NULL,
            robots = 'index, follow',
            googlebot = 'index, follow, max-snippet:-1, max-image-preview:large',
            og_title = NULL,
            og_description = NULL,
            og_image = NULL,
            og_type = 'website',
            og_url = NULL,
            og_site_name = NULL,
            og_locale = NULL,
            twitter_card = 'summary_large_image',
            twitter_title = NULL,
            twitter_description = NULL,
            twitter_image = NULL,
            twitter_site = NULL,
            schema_type = 'WebPage',
            schema_json = NULL,
            breadcrumb_schema = NULL,
            article_published_time = NULL,
            article_modified_time = NULL,
            article_author = NULL,
            hreflang = '[]'::jsonb,
            custom_meta_tags = '[]'::jsonb,
            is_customized = false,
            updated_at = NOW()
          WHERE page_key = ${page_key} AND (seoable_type IS NULL OR seoable_type = '')
        `;
      } else {
        await sql`
          UPDATE seo_metadata SET
            meta_title = NULL,
            meta_description = NULL,
            meta_keywords = NULL,
            meta_author = NULL,
            canonical_url = NULL,
            robots = 'index, follow',
            googlebot = 'index, follow',
            og_title = NULL,
            og_description = NULL,
            og_image = NULL,
            is_customized = false,
            updated_at = NOW()
          WHERE seoable_type = ${seoable_type} AND seoable_id = ${seoable_id}
        `;
      }

      return NextResponse.json(
        { success: true, message: "SEO metadata reset to global defaults." },
        { headers: corsHeaders }
      );
    }

    const cleanJson = (val) => {
      if (!val) return null;
      if (typeof val === "object") return sql.json(val);
      try {
        return sql.json(JSON.parse(val));
      } catch {
        return null;
      }
    };

    const cleanDate = (val) => {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    const updatePayload = {
      meta_title: body.meta_title?.trim() || null,
      meta_description: body.meta_description?.trim() || null,
      meta_keywords: body.meta_keywords?.trim() || null,
      meta_author: body.meta_author?.trim() || null,
      canonical_url: body.canonical_url?.trim() || null,
      robots: body.robots?.trim() || "index, follow",
      googlebot: body.googlebot?.trim() || "index, follow, max-snippet:-1, max-image-preview:large",
      og_title: body.og_title?.trim() || null,
      og_description: body.og_description?.trim() || null,
      og_image: body.og_image?.trim() || null,
      og_type: body.og_type?.trim() || "website",
      og_url: body.og_url?.trim() || null,
      og_site_name: body.og_site_name?.trim() || "MediConnect",
      og_locale: body.og_locale?.trim() || "en_US",
      twitter_card: body.twitter_card?.trim() || "summary_large_image",
      twitter_title: body.twitter_title?.trim() || null,
      twitter_description: body.twitter_description?.trim() || null,
      twitter_image: body.twitter_image?.trim() || null,
      twitter_site: body.twitter_site?.trim() || "@mediconnectfit",
      schema_type: body.schema_type?.trim() || "WebPage",
      schema_json: cleanJson(body.schema_json),
      breadcrumb_schema: cleanJson(body.breadcrumb_schema),
      article_published_time: cleanDate(body.article_published_time),
      article_modified_time: cleanDate(body.article_modified_time) || new Date(),
      article_author: body.article_author?.trim() || null,
      hreflang: cleanJson(body.hreflang) || sql.json([]),
      custom_meta_tags: cleanJson(body.custom_meta_tags) || sql.json([]),
      is_customized: true,
      updated_at: new Date(),
    };

    let result = null;

    if (page_key) {
      updatePayload.page_key = page_key;
      updatePayload.seoable_type = null;
      updatePayload.seoable_id = null;

      const keys = Object.keys(updatePayload);
      [result] = await sql`
        INSERT INTO seo_metadata ${sql(updatePayload, ...keys)}
        ON CONFLICT (page_key) WHERE page_key IS NOT NULL AND (seoable_type IS NULL OR seoable_type = '')
        DO UPDATE SET
          ${sql(updatePayload, ...keys)}
        RETURNING *
      `;
    } else {
      updatePayload.page_key = null;
      updatePayload.seoable_type = seoable_type;
      updatePayload.seoable_id = seoable_id;

      const keys = Object.keys(updatePayload);
      [result] = await sql`
        INSERT INTO seo_metadata ${sql(updatePayload, ...keys)}
        ON CONFLICT (seoable_type, seoable_id) WHERE seoable_type IS NOT NULL AND seoable_id IS NOT NULL
        DO UPDATE SET
          ${sql(updatePayload, ...keys)}
        RETURNING *
      `;
    }

    return NextResponse.json(
      {
        success: true,
        message: "SEO metadata saved successfully",
        data: result,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("PUT /api/seo Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save SEO metadata" },
      { status: 500, headers: corsHeaders }
    );
  }
}
