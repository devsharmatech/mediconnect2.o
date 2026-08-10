/**
 * LAYER-1 API: Care Episodes
 * POST /api/layer1/care-episodes — Create a care episode
 * GET  /api/layer1/care-episodes — List care episodes for a patient
 */

import { NextResponse } from "next/server";
import { createCareEpisode, listCareEpisodes } from "@/lib/layer1/careEpisodeService";

export async function POST(req) {
    try {
        const { patient_id, episode_type } = await req.json();
        const result = await createCareEpisode(patient_id, episode_type);

        if (!result.success) {
            return NextResponse.json(result, { status: 400 });
        }
        return NextResponse.json(result, { status: 201 });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const patient_id = searchParams.get("patient_id");

        if (!patient_id) {
            return NextResponse.json({ success: false, error: "patient_id is required" }, { status: 400 });
        }

        const result = await listCareEpisodes(patient_id, {
            status: searchParams.get("status"),
            episode_type: searchParams.get("episode_type"),
            page: parseInt(searchParams.get("page")) || 1,
            limit: parseInt(searchParams.get("limit")) || 20,
        });

        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
