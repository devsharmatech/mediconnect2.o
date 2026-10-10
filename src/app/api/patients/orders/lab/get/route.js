import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const patient_id = searchParams.get("patient_id");

    if (!patient_id) {
      return failure("patient_id required", null, 400, { headers: corsHeaders });
    }

    const orders = await sql`
      SELECT 
        lto.*,
        ld.lab_name,
        ld.address as lab_address,
        ld.phone_number as lab_phone
      FROM lab_test_orders lto
      LEFT JOIN lab_details ld ON ld.id = lto.lab_id
      WHERE lto.patient_id = ${patient_id}
      ORDER BY lto.created_at DESC
    `;

    const orderIds = orders.map((o) => o.id);
    let itemsByOrder = {};
    let reportsByOrder = {};
    let lockerUrls = new Set();

    if (orderIds.length > 0) {
      const [items, reports, lockerDocs] = await Promise.all([
        sql`
          SELECT * FROM lab_test_order_items
          WHERE order_id = ANY(${orderIds})
          ORDER BY unid ASC
        `,
        sql`
          SELECT * FROM lab_reports
          WHERE order_id = ANY(${orderIds})
          ORDER BY created_at DESC
        `,
        sql`
          SELECT document_url FROM digital_locker_documents
          WHERE user_id = ${patient_id} AND document_type = 'lab_report'
        `
      ]);

      items.forEach((item) => {
        if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
        itemsByOrder[item.order_id].push(item);
      });

      reports.forEach((rep) => {
        if (!reportsByOrder[rep.order_id]) reportsByOrder[rep.order_id] = [];
        reportsByOrder[rep.order_id].push(rep);
      });

      lockerDocs.forEach((d) => {
        if (d.document_url) lockerUrls.add(d.document_url);
      });
    }

    const result = orders.map((o) => {
      const orderReports = reportsByOrder[o.id] || [];
      const hasSavedReport = orderReports.some((r) => lockerUrls.has(r.report_url));
      const rawOrderItems = itemsByOrder[o.id] || [];
      const orderItems = rawOrderItems.map((it) => {
        const itReports = orderReports.filter((r) =>
          (r.item_id && r.item_id === it.id) ||
          (r.test_name && r.test_name.toLowerCase() === it.test_name.toLowerCase()) ||
          (r.test_type && r.test_type.toLowerCase() === it.test_name.toLowerCase())
        );
        return {
          ...it,
          reports: itReports,
          has_report: itReports.length > 0,
        };
      });

      return {
        ...o,
        lab_test_order_items: orderItems,
        reports: orderReports,
        saved_in_digilocker: hasSavedReport,
      };
    });

    return success("Orders fetched", result, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Error fetching patient lab orders:", err);
    return failure("Error fetching orders", err.message, 500, { headers: corsHeaders });
  }
}
