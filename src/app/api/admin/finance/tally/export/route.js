import { NextResponse } from 'next/server';
import { resolveCallerFromRequest } from '@/lib/layer1/authGuard';
import { getLabBatchStatement } from '@/lib/labFinancialEngine';
import {
  getTallyMapping,
  generateTallyVoucherXml,
  generateTallyVoucherCsv,
  recordTallyExportJob,
} from '@/lib/tallyExporter';

export async function POST(req) {
  try {
    const caller = await resolveCallerFromRequest(req);
    if (caller && caller.role !== 'admin') {
      return NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { batchId, format = 'XML' } = body;

    if (!batchId) {
      return NextResponse.json({ success: false, error: "Batch ID is required" }, { status: 400 });
    }

    // Fetch batch statement and partner details
    const { batch, orders } = await getLabBatchStatement({ batchId });
    if (!batch) {
      return NextResponse.json({ success: false, error: "Settlement batch not found" }, { status: 404 });
    }

    const mapping = await getTallyMapping();
    const isXml = String(format).toUpperCase() === 'XML';

    let content = '';
    let filename = '';
    let mimeType = '';

    if (isXml) {
      content = generateTallyVoucherXml({ batch, mapping, orders });
      filename = `Tally_${batch.batch_period || batch.id}.xml`;
      mimeType = 'application/xml';
    } else {
      content = generateTallyVoucherCsv({ batch, mapping });
      filename = `Tally_${batch.batch_period || batch.id}.csv`;
      mimeType = 'text/csv';
    }

    // Record export job in tally_export_jobs table
    await recordTallyExportJob({
      batchId: batch.id,
      format: isXml ? 'XML' : 'CSV',
      voucherType: batch.status === 'paid' ? 'Combined (Journal+Payment)' : 'Journal',
      totalVouchers: batch.status === 'paid' ? 2 : 1,
      totalAmount: Number(batch.gross_orders_amount || 0),
      fileContent: content,
      exportedBy: caller?.name || caller?.email || 'Admin',
    });

    return NextResponse.json({
      success: true,
      data: {
        filename,
        content,
        mimeType,
        format: isXml ? 'XML' : 'CSV',
        batch_period: batch.batch_period,
      },
    }, { status: 200 });

  } catch (error) {
    console.error("POST /api/admin/finance/tally/export error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
