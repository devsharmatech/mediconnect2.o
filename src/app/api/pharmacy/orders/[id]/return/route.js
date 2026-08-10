import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  try {
    const orderId = params.id;
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { reason, user_id } = body;

    // Verify order exists and belongs to user
    const { data: order, error: orderError } = await supabase
      .from('pharmacy_orders')
      .select('id, status, patient_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    if (user_id && order.patient_id !== user_id) {
       return NextResponse.json({ success: false, error: 'Unauthorized to return this order' }, { status: 403 });
    }

    if (order.status !== 'delivered') {
      return NextResponse.json({ success: false, error: 'Only delivered orders can be returned/replaced' }, { status: 400 });
    }

    // Update order status to return_requested
    const { error: updateError } = await supabase
      .from('pharmacy_orders')
      .update({
        status: 'return_requested',
        return_reason: reason || 'No reason provided',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      throw updateError;
    }

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
