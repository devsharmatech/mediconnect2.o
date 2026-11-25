import sql from "@/lib/db";

/**
 * Fetch and build Next.js Metadata object from AWS RDS PostgreSQL.
 * Seamlessly merges page-level SEO with global SEO defaults.
 *
 * @param {string} pageKey - Static page key (e.g. "home", "about", "doctors", "lab-tests")
 * @param {object} [fallback] - Optional inline fallback values
 * @returns {Promise<import("next").Metadata>}
 */
export async function getSeoMetadata(pageKey, fallback = {}) {
  try {
    // 1. Fetch Global Settings
    let globalSettings = null;
    try {
      const [g] = await sql`SELECT * FROM seo_global_settings WHERE id = 1 LIMIT 1`;
      globalSettings = g || null;
    } catch (err) {
      console.warn("Could not fetch seo_global_settings:", err.message);
    }

    const g = globalSettings || {};
    const defaultSiteName = g.site_name || "MediConnect";
    const defaultTitle = g.default_meta_title || `${defaultSiteName} | Trusted Healthcare Platform`;
    const defaultDesc = g.default_meta_description || "Your trusted healthcare companion connecting patients, doctors, labs, and chemists seamlessly.";
    const defaultKeywords = g.default_meta_keywords || "healthcare, doctor, online consultation, lab tests, medicines";
    const defaultAuthor = g.default_meta_author || "MediConnect Medical Team";
    const defaultOgImage = g.default_og_image || "https://mediconnect.fit/images/og-default.png";
    const defaultRobots = g.default_robots || "index, follow";
    const defaultCanonicalBase = g.default_canonical_base || "https://mediconnect.fit";
    const defaultTwitterSite = g.twitter_site || "@mediconnectfit";
    const defaultLocale = g.default_language || "en_US";

    // 2. Fetch Page SEO Record
    let record = null;
    if (pageKey) {
      try {
        const [r] = await sql`
          SELECT * FROM seo_metadata 
          WHERE page_key = ${pageKey} AND (seoable_type IS NULL OR seoable_type = '')
          LIMIT 1
        `;
        record = r || null;
      } catch (err) {
        console.warn(`Could not fetch seo_metadata for ${pageKey}:`, err.message);
      }
    }

    // Determine values with strict fallback chain: record -> fallback -> global
    const title = record?.meta_title || fallback.title || defaultTitle;
    const description = record?.meta_description || fallback.description || defaultDesc;
    const rawKeywords = record?.meta_keywords || fallback.keywords || defaultKeywords;
    const author = record?.meta_author || fallback.author || defaultAuthor;
    const canonical = record?.canonical_url || fallback.canonical || `${defaultCanonicalBase}${pageKey === "home" ? "" : `/${pageKey}`}`;

    const robotsStr = record?.robots || fallback.robots || defaultRobots;
    const isIndex = !robotsStr.toLowerCase().includes("noindex");
    const isFollow = !robotsStr.toLowerCase().includes("nofollow");

    const googlebotStr = record?.googlebot || g.default_googlebot || "index, follow, max-snippet:-1, max-image-preview:large";
    const googleIsIndex = !googlebotStr.toLowerCase().includes("noindex");
    const googleIsFollow = !googlebotStr.toLowerCase().includes("nofollow");

    const ogTitle = record?.og_title || fallback.ogTitle || title;
    const ogDescription = record?.og_description || fallback.ogDescription || description;
    const ogImage = record?.og_image || fallback.ogImage || defaultOgImage;
    const ogType = record?.og_type || fallback.ogType || "website";
    const ogSiteName = record?.og_site_name || g.default_og_site_name || defaultSiteName;
    const ogLocale = record?.og_locale || defaultLocale;

    const twitterCard = record?.twitter_card || fallback.twitterCard || "summary_large_image";
    const twitterTitle = record?.twitter_title || fallback.twitterTitle || ogTitle;
    const twitterDesc = record?.twitter_description || fallback.twitterDescription || ogDescription;
    const twitterImage = record?.twitter_image || fallback.twitterImage || ogImage;
    const twitterSite = record?.twitter_site || defaultTwitterSite;

    // Parse keywords into array
    const keywordsArray = typeof rawKeywords === "string"
      ? rawKeywords.split(",").map((k) => k.trim()).filter(Boolean)
      : Array.isArray(rawKeywords)
      ? rawKeywords
      : [];

    // Parse custom tags if any
    const otherMeta = {};
    if (Array.isArray(record?.custom_meta_tags)) {
      record.custom_meta_tags.forEach((tag) => {
        if ((tag.name || tag.property) && tag.content) {
          otherMeta[tag.name || tag.property] = tag.content;
        }
      });
    }

    return {
      title,
      description,
      keywords: keywordsArray,
      authors: [{ name: author }],
      creator: author,
      publisher: defaultSiteName,
      alternates: {
        canonical,
      },
      robots: {
        index: isIndex,
        follow: isFollow,
        googleBot: {
          index: googleIsIndex,
          follow: googleIsFollow,
          "max-video-preview": -1,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      },
      openGraph: {
        title: ogTitle,
        description: ogDescription,
        url: canonical,
        siteName: ogSiteName,
        images: ogImage ? [{ url: ogImage, alt: ogTitle }] : [],
        locale: ogLocale,
        type: ogType,
      },
      twitter: {
        card: twitterCard,
        title: twitterTitle,
        description: twitterDesc,
        images: twitterImage ? [twitterImage] : [],
        site: twitterSite,
        creator: twitterSite,
      },
      other: {
        ...otherMeta,
        "format-detection": "telephone=no",
      },
    };
  } catch (err) {
    console.error("Error in getSeoMetadata:", err);
    return {
      title: fallback.title || "MediConnect | Trusted Healthcare Platform",
      description: fallback.description || "Healthcare services connecting patients, doctors, labs, and chemists seamlessly.",
    };
  }
}

/**
 * Fetch and construct JSON-LD schema for a page.
 */
export async function getJsonLdSchema(pageKey, customSchema = null) {
  try {
    const [globalSettings] = await sql`SELECT * FROM seo_global_settings WHERE id = 1 LIMIT 1`;
    const [pageRecord] = await sql`
      SELECT * FROM seo_metadata 
      WHERE page_key = ${pageKey} AND (seoable_type IS NULL OR seoable_type = '') 
      LIMIT 1
    `;

    const schemas = [];

    // 1. Organization Schema
    if (globalSettings?.organization_schema) {
      schemas.push(globalSettings.organization_schema);
    }

    // 2. Website Schema (only on homepage)
    if (pageKey === "home" && globalSettings?.website_schema) {
      schemas.push(globalSettings.website_schema);
    }

    // 3. Page specific custom schema
    if (pageRecord?.schema_json) {
      schemas.push(pageRecord.schema_json);
    } else if (customSchema) {
      schemas.push(customSchema);
    } else {
      // Default WebPage schema
      schemas.push({
        "@context": "https://schema.org",
        "@type": pageRecord?.schema_type || "WebPage",
        "name": pageRecord?.meta_title || globalSettings?.default_meta_title || "MediConnect",
        "description": pageRecord?.meta_description || globalSettings?.default_meta_description || "",
        "url": pageRecord?.canonical_url || `https://mediconnect.fit/${pageKey === "home" ? "" : pageKey}`,
      });
    }

    // 4. Breadcrumb schema if present
    if (pageRecord?.breadcrumb_schema) {
      schemas.push(pageRecord.breadcrumb_schema);
    }

    return schemas.length === 1 ? schemas[0] : schemas;
  } catch (err) {
    console.error("Error in getJsonLdSchema:", err);
    return null;
  }
}

/**
 * Server component to render structured JSON-LD script tag.
 */
export function JsonLd({ data }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
