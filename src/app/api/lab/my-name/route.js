import sql from "@/lib/db";
import { NextResponse } from "next/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req) {
    try {
        const { user_id } = await req.json();

        if (!user_id || !UUID_REGEX.test(user_id)) {
            return NextResponse.json({ success: false, message: "valid user_id required" }, { status: 400 });
        }

        const [data] = await sql`
            SELECT 
                ld.lab_name, 
                ld.owner_name,
                ld.logo_url,
                ld.owner_photo_url,
                u.profile_picture
            FROM lab_details ld
            LEFT JOIN users u ON u.id = ld.id
            WHERE ld.id = ${user_id}
            LIMIT 1
        `;

        const logoUrl = data?.logo_url || data?.profile_picture || data?.owner_photo_url || null;

        return NextResponse.json({
            success: true,
            lab_name: data?.lab_name || data?.owner_name || null,
            logo_url: logoUrl,
            profile_picture: data?.profile_picture || logoUrl,
            owner_photo_url: data?.owner_photo_url || null,
        });
    } catch (err) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
