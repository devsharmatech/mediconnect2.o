/**
 * LAYER-1 API: Audit Log
 * GET /api/layer1/audit-log — Query audit logs (admin only)
 */

import { NextResponse } from "next/server";
import { queryAuditLogs } from "@/lib/layer1/auditLogger";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);

        const result = await queryAuditLogs({
            entity_type: searchParams.get("entity_type"),
            entity_id: searchParams.get("entity_id"),
            changed_by: searchParams.get("changed_by"),
            page: parseInt(searchParams.get("page")) || 1,
            limit: parseInt(searchParams.get("limit")) || 50,
        });

        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
