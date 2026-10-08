import { NextResponse } from "next/server";
import sql from "@/lib/db";

// GET single row of homepage_hero content
export async function GET() {
    try {
        const rows = await sql`
            SELECT * FROM homepage_hero 
            ORDER BY created_at ASC 
            LIMIT 1
        `;
        return NextResponse.json({ success: true, data: rows[0] || {} }, { status: 200 });
    } catch (err) {
        console.error("GET /api/cms/homepage error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// POST/PUT to update homepage_hero content
export async function POST(req) {
    try {
        const payload = await req.json();
        const existing = await sql`SELECT id FROM homepage_hero LIMIT 1`;

        if (existing.length > 0) {
            const updated = await sql`
                UPDATE homepage_hero
                SET 
                    headline = ${payload.headline !== undefined ? payload.headline : sql`headline`},
                    base_headline = ${payload.base_headline !== undefined ? payload.base_headline : sql`base_headline`},
                    subheadline = ${payload.subheadline !== undefined ? payload.subheadline : sql`subheadline`},
                    description = ${payload.description !== undefined ? payload.description : sql`description`},
                    hero_image = ${payload.hero_image !== undefined ? payload.hero_image : sql`hero_image`},
                    hero_image2 = ${payload.hero_image2 !== undefined ? payload.hero_image2 : sql`hero_image2`},
                    hero_image3 = ${payload.hero_image3 !== undefined ? payload.hero_image3 : sql`hero_image3`},
                    hero_image4 = ${payload.hero_image4 !== undefined ? payload.hero_image4 : sql`hero_image4`},
                    primary_button_text = ${payload.primary_button_text !== undefined ? payload.primary_button_text : sql`primary_button_text`},
                    primary_button_link = ${payload.primary_button_link !== undefined ? payload.primary_button_link : sql`primary_button_link`},
                    secondary_button_text = ${payload.secondary_button_text !== undefined ? payload.secondary_button_text : sql`secondary_button_text`},
                    secondary_button_link = ${payload.secondary_button_link !== undefined ? payload.secondary_button_link : sql`secondary_button_link`},
                    mission_title = ${payload.mission_title !== undefined ? payload.mission_title : sql`mission_title`},
                    mission_heading = ${payload.mission_heading !== undefined ? payload.mission_heading : sql`mission_heading`},
                    mission_text = ${payload.mission_text !== undefined ? payload.mission_text : sql`mission_text`},
                    updated_at = NOW()
                WHERE id = ${existing[0].id}
                RETURNING *
            `;
            return NextResponse.json({ success: true, data: updated[0] }, { status: 200 });
        } else {
            const inserted = await sql`
                INSERT INTO homepage_hero (
                    headline, base_headline, subheadline, description,
                    hero_image, hero_image2, hero_image3, hero_image4,
                    primary_button_text, primary_button_link, secondary_button_text, secondary_button_link,
                    mission_title, mission_heading, mission_text,
                    created_at, updated_at
                ) VALUES (
                    ${payload.headline || null},
                    ${payload.base_headline || null},
                    ${payload.subheadline || null},
                    ${payload.description || null},
                    ${payload.hero_image || null},
                    ${payload.hero_image2 || null},
                    ${payload.hero_image3 || null},
                    ${payload.hero_image4 || null},
                    ${payload.primary_button_text || null},
                    ${payload.primary_button_link || null},
                    ${payload.secondary_button_text || null},
                    ${payload.secondary_button_link || null},
                    ${payload.mission_title || null},
                    ${payload.mission_heading || null},
                    ${payload.mission_text || null},
                    NOW(),
                    NOW()
                )
                RETURNING *
            `;
            return NextResponse.json({ success: true, data: inserted[0] }, { status: 201 });
        }
    } catch (err) {
        console.error("POST /api/cms/homepage error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
