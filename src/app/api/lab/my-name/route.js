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
            SELECT lab_name, owner_name
            FROM lab_details
            WHERE id = ${user_id}
            LIMIT 1
        `;

        return NextResponse.json({
            success: true,
            lab_name: data?.lab_name || data?.owner_name || null,
        });
    } catch (err) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
