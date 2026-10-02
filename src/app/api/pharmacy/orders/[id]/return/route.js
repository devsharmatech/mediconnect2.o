import { NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request, { params }) {
  try {
    const { id: orderId } = await params;
    if (!orderId || !UUID_REGEX.test(orderId)) {
      return NextResponse.json({ success: false, error: 'Valid Order ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { reason, user_id } = body;

    // Verify order exists and belongs to user
    const [order] = await sql`
      SELECT id, status, patient_id
      FROM pharmacy_orders
      WHERE id = ${orderId}
      LIMIT 1
    `;

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    if (user_id && order.patient_id !== user_id) {
       return NextResponse.json({ success: false, error: 'Unauthorized to return this order' }, { status: 403 });
    }

    if (String(order.status).toLowerCase() !== 'delivered') {
      return NextResponse.json({ success: false, error: 'Only delivered orders can be returned/replaced' }, { status: 400 });
    }

    // Update order status to return_requested
    await sql`
      UPDATE pharmacy_orders
      SET 
        status = 'return_requested',
        return_reason = ${reason || 'No reason provided'},
        updated_at = NOW()
      WHERE id = ${orderId}
    `;

    return NextResponse.json({
      success: true,
      message: 'Return request submitted successfully.'
    });
  } catch (error) {
    console.error('Error returning pharmacy order API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
