/**
 * LAYER-1 API: Convert Custom Diagnosis to Master
 * POST /api/layer1/diagnosis/convert — Admin promotes custom diagnosis to master list
 */

import { NextResponse } from "next/server";
import { convertCustomToMaster } from "@/lib/layer1/diagnosisService";

export async function POST(req) {
    try {
        const { custom_id, admin_id } = await req.json();
        const result = await convertCustomToMaster(custom_id, admin_id);

        if (!result.success) {
            return NextResponse.json(result, { status: 400 });
        }
        return NextResponse.json(result, { status: 201 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
