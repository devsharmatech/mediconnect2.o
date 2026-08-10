/**
 * LAYER-1 API: Single Care Episode
 * GET   /api/layer1/care-episodes/[id] — Get episode with linked entities
 * PATCH /api/layer1/care-episodes/[id] — Close a care episode
 */

import { NextResponse } from "next/server";
import { getCareEpisode, closeCareEpisode } from "@/lib/layer1/careEpisodeService";

export async function GET(req, { params }) {
    try {
        const { id } = await params;
        const result = await getCareEpisode(id);

        if (!result.success) {
            return NextResponse.json(result, { status: 404 });
        }
        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    try {
        const { id } = await params;
        const { closed_by } = await req.json();
        const result = await closeCareEpisode(id, closed_by);

        if (!result.success) {
            return NextResponse.json(result, { status: 400 });
        }
        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
