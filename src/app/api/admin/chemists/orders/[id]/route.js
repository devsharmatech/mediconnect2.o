import { NextResponse } from "next/server";
import sql from "@/lib/db";

// GET /api/admin/chemists/orders/[id]
// Returns deep details of a specific medicine order
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ success: false, error: "Order ID is required" }, { status: 400 });
    }

    // Query order
    const [order] = await sql`
      SELECT 
        mo.*,
        cd.pharmacy_name,
        cd.owner_name as chemist_owner,
        cd.pharmacist_name,
        cd.email as chemist_email,
        cd.mobile as chemist_mobile,
        cd.address as chemist_address,
        cd.drug_license_no,
        cd.upi_id as chemist_upi,
        cd.bank_name as chemist_bank_name,
        cd.bank_account_number as chemist_account_no,
        cd.bank_ifsc_code as chemist_ifsc,
        pd.full_name as patient_name,
        pd.email as patient_email,
        pd.address as patient_address,
        u.phone_number as patient_phone,
        p.id as prescription_record_id,
        p.file_url as prescription_file_url,
        p.unid as prescription_unid,
        p.diagnosis as prescription_diagnosis,
        p.specialization as prescription_specialization,
        p.created_at as prescription_date,
        doc_u.phone_number as doctor_phone,
        dd.full_name as doctor_name
      FROM medicine_orders mo
      LEFT JOIN chemist_details cd ON cd.id = mo.chemist_id
      LEFT JOIN users u ON u.id = mo.patient_id
      LEFT JOIN patient_details pd ON pd.id = u.id
      LEFT JOIN prescriptions p ON p.id = mo.prescription_id
      LEFT JOIN users doc_u ON doc_u.id = p.doctor_id
      LEFT JOIN doctor_details dd ON dd.id = doc_u.id
      WHERE mo.id = ${id} OR mo.unid::text = ${id}
      LIMIT 1;
    `;

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // Query medicine order items
    const items = await sql`
      SELECT 
        id,
        medicine_name,
        dosage,
        frequency,
        duration,
        quantity,
        price,
        status,
        created_at
      FROM medicine_order_items
      WHERE order_id = ${order.id}
      ORDER BY created_at ASC;
    `;

    // Query payment logs
    const paymentLogs = await sql`
      SELECT 
        mpl.*
      FROM medicine_payment_logs mpl
      WHERE mpl.order_id = ${order.id}
      ORDER BY mpl.created_at DESC;
    `;

    // Query invoices if any
    const invoices = await sql`
      SELECT 
        id,
        invoice_number,
        invoice_date,
        subtotal,
        tax_amount,
        total_amount,
        status,
        download_url,
        created_at
      FROM medicine_order_invoices
      WHERE order_id = ${order.id}
      ORDER BY created_at DESC;
    `;

    return NextResponse.json({
      success: true,
      data: {
        order,
        items,
        paymentLogs,
        invoices,
      },
    });
  } catch (error) {
    console.error("Admin chemist order detail GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch order details" },
      { status: 500 }
    );
  }
}

