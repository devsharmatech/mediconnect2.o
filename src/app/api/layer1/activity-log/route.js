/**
 * LAYER-1 API: Activity Log
 * GET /api/layer1/activity-log — Query activity logs
 */

import { NextResponse } from "next/server";
import { queryActivityLogs } from "@/lib/layer1/activityLogger";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);

        const result = await queryActivityLogs({
            patient_id: searchParams.get("patient_id"),
            care_episode_id: searchParams.get("care_episode_id"),
            module_type: searchParams.get("module_type"),
            action_type: searchParams.get("action_type"),
            page: parseInt(searchParams.get("page")) || 1,
            limit: parseInt(searchParams.get("limit")) || 50,
        });

        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
