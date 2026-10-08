import { NextResponse } from "next/server";
import sql from "@/lib/db";

// GET single row of website settings
export async function GET() {
    try {
        const rows = await sql`
            SELECT * FROM website_settings 
            ORDER BY created_at ASC 
            LIMIT 1
        `;
        return NextResponse.json({ success: true, data: rows[0] || {} }, { status: 200 });
    } catch (err) {
        console.error("GET /api/cms/settings error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// POST/PUT to update the website settings row
export async function POST(req) {
    try {
        const payload = await req.json();
        const existing = await sql`SELECT id FROM website_settings LIMIT 1`;

        if (existing.length > 0) {
            const updated = await sql`
                UPDATE website_settings
                SET 
                    site_name = ${payload.site_name !== undefined ? payload.site_name : sql`site_name`},
                    logo = ${payload.logo !== undefined ? payload.logo : sql`logo`},
                    header_tagline = ${payload.header_tagline !== undefined ? payload.header_tagline : sql`header_tagline`},
                    footer_text = ${payload.footer_text !== undefined ? payload.footer_text : sql`footer_text`},
                    support_email = ${payload.support_email !== undefined ? payload.support_email : sql`support_email`},
                    support_phone = ${payload.support_phone !== undefined ? payload.support_phone : sql`support_phone`},
                    emergency_disclaimer = ${payload.emergency_disclaimer !== undefined ? payload.emergency_disclaimer : sql`emergency_disclaimer`},
                    social_links = ${payload.social_links !== undefined ? JSON.stringify(payload.social_links) : sql`social_links`},
                    whatsapp_number = ${payload.whatsapp_number !== undefined ? payload.whatsapp_number : sql`whatsapp_number`},
                    whatsapp_message = ${payload.whatsapp_message !== undefined ? payload.whatsapp_message : sql`whatsapp_message`},
                    updated_at = NOW()
                WHERE id = ${existing[0].id}
                RETURNING *
            `;
            return NextResponse.json({ success: true, data: updated[0] }, { status: 200 });
        } else {
            const inserted = await sql`
                INSERT INTO website_settings (
                    site_name, logo, header_tagline, footer_text, support_email, support_phone,
                    emergency_disclaimer, social_links, whatsapp_number, whatsapp_message, created_at, updated_at
                ) VALUES (
                    ${payload.site_name || null},
                    ${payload.logo || null},
                    ${payload.header_tagline || null},
                    ${payload.footer_text || null},
                    ${payload.support_email || null},
                    ${payload.support_phone || null},
                    ${payload.emergency_disclaimer || null},
                    ${payload.social_links ? JSON.stringify(payload.social_links) : null},
                    ${payload.whatsapp_number || null},
                    ${payload.whatsapp_message || null},
                    NOW(),
                    NOW()
                )
                RETURNING *
            `;
            return NextResponse.json({ success: true, data: inserted[0] }, { status: 201 });
        }
    } catch (err) {
        console.error("POST /api/cms/settings error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
