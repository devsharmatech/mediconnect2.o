import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { sendPushAndInAppNotification } from "@/lib/notificationHelper";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { order_id, status, chemist_notes } = await req.json();

    if (!order_id || !status) {
      return failure("order_id and status required", null, 400, { headers: corsHeaders });
    }

    // 1. Fetch current order
    const currentOrderRows = await sql`
      SELECT mo.*, cd.pharmacy_name 
      FROM medicine_orders mo
      LEFT JOIN chemist_details cd ON cd.id = mo.chemist_id
      WHERE mo.id = ${order_id}
      LIMIT 1
    `;
    const currentOrder = currentOrderRows[0];

    if (!currentOrder) {
      return failure("Order not found", null, 404, { headers: corsHeaders });
    }

    const previousStatus = currentOrder.status || "unknown";

    // 2. Perform update
    const isCompleted = status === "delivered" || status === "completed";
    const updatedOrderRows = await sql`
      UPDATE medicine_orders
      SET 
        status = ${status},
        chemist_notes = ${chemist_notes !== undefined ? chemist_notes : currentOrder.chemist_notes},
        updated_at = NOW()
        ${isCompleted ? sql`, actual_delivery_at = NOW()` : sql``}
      WHERE id = ${order_id}
      RETURNING *
    `;
    const updatedOrder = updatedOrderRows[0];

    // 3. Record immutable audit event
    try {
      await sql`
        INSERT INTO activity_log (
          patient_id,
          actor_id,
          reference_id,
          module_type,
          action_type,
          description,
          metadata,
          created_at
        ) VALUES (
          ${currentOrder.patient_id},
          ${currentOrder.chemist_id},
          ${order_id},
          'pharmacy',
          ${`ORDER_STATUS_${status.toUpperCase()}`},
          ${`Order ${order_id.slice(0, 8).toUpperCase()} status transitioned to ${status}.`},
          ${JSON.stringify({
            order_id,
            previous_state: previousStatus,
            new_state: status,
            chemist_notes,
            timestamp: new Date().toISOString(),
          })},
          NOW()
        )
      `;
    } catch (auditErr) {
      console.warn("Audit log insert failed (non-fatal):", auditErr.message);
    }

    // 4. Send notification to patient
    try {
      if (currentOrder.patient_id) {
        const friendlyStatus = {
          approved: "Confirmed & In Preparation",
          ready_for_pickup: "Ready for Pickup at Pharmacy",
          out_for_delivery: "Out for Delivery 🛵",
          completed: "Delivered & Completed ✅",
          cancelled: "Cancelled",
        }[status] || status;

        await sendPushAndInAppNotification({
          userId: currentOrder.patient_id,
          title: `Medicine Order Update: ${friendlyStatus}`,
          message: `Your medicine order #${(currentOrder.unid || order_id.slice(0, 8)).toUpperCase()} is now ${friendlyStatus}.`,
          type: "medicine_order_status_update",
          metadata: {
            order_id,
            status,
            previous_status: previousStatus,
          },
        });
      }
    } catch (notifErr) {
      console.warn("Patient notification failed (non-fatal):", notifErr.message);
    }

    return success("Order status updated successfully", updatedOrder, 200, {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Error updating order status:", err);
    return failure("Failed to update order status", err.message, 500, { headers: corsHeaders });
  }
}
