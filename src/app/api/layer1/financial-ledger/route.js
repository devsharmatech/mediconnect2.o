/**
 * LAYER-1 API: Financial Ledger
 * GET /api/layer1/financial-ledger — Query financial transactions
 */

import { NextResponse } from "next/server";
import { getLedgerByPatient, getLedgerByEpisode } from "@/lib/layer1/financialLedger";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const patient_id = searchParams.get("patient_id");
        const care_episode_id = searchParams.get("care_episode_id");

        if (care_episode_id) {
            const result = await getLedgerByEpisode(care_episode_id);
            return NextResponse.json(result);
        }

        if (patient_id) {
            const result = await getLedgerByPatient(patient_id, {
                service_type: searchParams.get("service_type"),
                status: searchParams.get("status"),
                page: parseInt(searchParams.get("page")) || 1,
                limit: parseInt(searchParams.get("limit")) || 50,
            });
            return NextResponse.json(result);
        }

        return NextResponse.json(
            { success: false, error: "patient_id or care_episode_id is required" },
            { status: 400 }
        );
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
