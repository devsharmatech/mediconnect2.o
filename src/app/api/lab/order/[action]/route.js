import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { initiateRefund } from "@/lib/layer1/refundEngine";

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

// Process lab order actions
export async function POST(req, { params }) {
  try {
    const { action } = await params;
    const body = await req.json();
    const { 
      order_id, 
      lab_id, 
      status, 
      notes, 
      items, 
      technician_id, 
      technician_name, 
      technician_phone, 
      technician_vehicle,
      cancel_reason,
      report_url,
      structured_results
    } = body;

    const cleanOrderId = safeUuid(order_id);
    const cleanLabId = safeUuid(lab_id);

    if (!cleanOrderId || !cleanLabId) {
      return failure("Valid order_id and lab_id required", null, 400, { headers: corsHeaders });
    }

    const validActions = ['update-status', 'update-items', 'complete', 'assign-technician', 'cancel', 'upload-report'];
    
    if (!validActions.includes(action)) {
      return failure("Invalid action", null, 400, { headers: corsHeaders });
    }

    switch (action) {
      case 'update-status': {
        if (!status) {
          return failure("status required", null, 400, { headers: corsHeaders });
        }

        const now = new Date();
        let sample_collected_at = null;
        let sample_received_at_lab_at = null;
        let processing_started_at = null;
        let quality_checked_at = null;
        let delivered_at = null;

        if (status === 'collected') sample_collected_at = now;
        else if (status === 'received_at_lab') sample_received_at_lab_at = now;
        else if (status === 'processing') processing_started_at = now;
        else if (status === 'quality_check') quality_checked_at = now;
        else if (status === 'completed') delivered_at = now;

        const updated = await sql`
          UPDATE lab_test_orders
          SET
            status = ${status},
            lab_notes = COALESCE(${notes ?? null}, lab_notes),
            sample_collected_at = COALESCE(${sample_collected_at}, sample_collected_at),
            sample_received_at_lab_at = COALESCE(${sample_received_at_lab_at}, sample_received_at_lab_at),
            processing_started_at = COALESCE(${processing_started_at}, processing_started_at),
            quality_checked_at = COALESCE(${quality_checked_at}, quality_checked_at),
            delivered_at = COALESCE(${delivered_at}, delivered_at),
            updated_at = NOW()
          WHERE id = ${cleanOrderId} AND lab_id = ${cleanLabId}
          RETURNING *
        `;

        if (!updated.length) {
          return failure("Order not found or unauthorized", null, 404, { headers: corsHeaders });
        }

        const data = updated[0];

        // Create notification for patient
        if (data.patient_id) {
          await sql`
            INSERT INTO notifications (user_id, title, message, type, metadata, created_at)
            VALUES (
              ${data.patient_id},
              ${`Lab Order Status: ${status.toUpperCase().replace('_', ' ')}`},
              ${`Your lab test order #${data.unid || ''} status updated to ${status.replace('_', ' ')}.`},
              'lab_order',
              ${JSON.stringify({ order_id: cleanOrderId, status })}::jsonb,
              NOW()
            )
          `.catch(e => console.warn("Failed to create notification:", e.message));
        }

        return success("Order status updated", data, 200, { headers: corsHeaders });
      }

      case 'update-items': {
        if (!items || !Array.isArray(items)) {
          return failure("items array required", null, 400, { headers: corsHeaders });
        }

        for (const item of items) {
          const cleanItemId = safeUuid(item.id);
          if (cleanItemId) {
            await sql`
              UPDATE lab_test_order_items
              SET status = ${item.status || 'pending'},
                  price = ${item.price !== undefined ? Number(item.price) : 0}
              WHERE id = ${cleanItemId} AND order_id = ${cleanOrderId}
            `;
          }
        }

        const sumRes = await sql`
          SELECT COALESCE(SUM(price), 0)::numeric as total
          FROM lab_test_order_items
          WHERE order_id = ${cleanOrderId} AND status = 'approved'
        `;

        const totalAmount = Number(sumRes[0]?.total || 0);

        await sql`
          UPDATE lab_test_orders
          SET total_amount = ${totalAmount},
              updated_at = NOW()
          WHERE id = ${cleanOrderId}
        `;

        return success("Order items updated", { totalAmount }, 200, { headers: corsHeaders });
      }

      case 'assign-technician': {
        if (!technician_name || !technician_phone) {
          return failure("Technician name and phone are required", null, 400, { headers: corsHeaders });
        }

        const cleanTechId = safeUuid(technician_id);

        const updated = await sql`
          UPDATE lab_test_orders
          SET
            status = 'technician_assigned',
            technician_id = ${cleanTechId},
            technician_name = ${technician_name},
            technician_phone = ${technician_phone},
            technician_vehicle = ${technician_vehicle || null},
            technician_assigned_at = NOW(),
            updated_at = NOW()
          WHERE id = ${cleanOrderId} AND lab_id = ${cleanLabId}
          RETURNING *
        `;

        if (!updated.length) {
          return failure("Order not found or unauthorized", null, 404, { headers: corsHeaders });
        }

        const data = updated[0];

        if (data.patient_id) {
          await sql`
            INSERT INTO notifications (user_id, title, message, type, metadata, created_at)
            VALUES (
              ${data.patient_id},
              'Technician Assigned 🧪',
              ${`${technician_name} has been assigned to collect your samples. Contact: ${technician_phone}.`},
              'lab_order',
              ${JSON.stringify({ order_id: cleanOrderId, status: 'technician_assigned' })}::jsonb,
              NOW()
            )
          `.catch(e => console.warn("Failed to create notification:", e.message));
        }

        return success("Technician assigned successfully", data, 200, { headers: corsHeaders });
      }

      case 'cancel': {
        const orderRows = await sql`
          SELECT * FROM lab_test_orders WHERE id = ${cleanOrderId} AND lab_id = ${cleanLabId} LIMIT 1
        `;

        if (!orderRows.length) {
          return failure("Order not found", null, 404, { headers: corsHeaders });
        }

        const order = orderRows[0];

        if (order.status === 'completed' || order.status === 'cancelled') {
          return failure("Cannot cancel a completed or already cancelled order", null, 400, { headers: corsHeaders });
        }

        let refundTriggered = false;
        if (order.payment_status === 'paid' && order.razorpay_payment_id) {
          try {
            await initiateRefund({
              patient_id: order.patient_id,
              care_episode_id: order.care_episode_id,
              original_payment_id: order.razorpay_payment_id,
              razorpay_order_id: order.razorpay_order_id,
              amount: order.total_amount,
              reason: cancel_reason || "Diagnostic booking cancelled by operator/patient",
              initiated_by: `lab:${cleanLabId}`
            });
            refundTriggered = true;
          } catch (refundErr) {
            console.error("Failed to process auto-refund on cancellation:", refundErr.message);
          }
        }

        const updated = await sql`
          UPDATE lab_test_orders
          SET
            status = 'cancelled',
            payment_status = ${refundTriggered ? 'refunded' : order.payment_status},
            cancelled_at = NOW(),
            updated_at = NOW(),
            lab_notes = ${cancel_reason ? `Cancellation Reason: ${cancel_reason}` : order.lab_notes}
          WHERE id = ${cleanOrderId}
          RETURNING *
        `;

        const cancelledOrder = updated[0];

        if (order.patient_id) {
          await sql`
            INSERT INTO notifications (user_id, title, message, type, metadata, created_at)
            VALUES (
              ${order.patient_id},
              'Lab Booking Cancelled ❌',
              ${`Your booking #${order.unid || ''} has been cancelled. ${refundTriggered ? "Refund initiated successfully." : ""}`},
              'lab_order',
              ${JSON.stringify({ order_id: cleanOrderId, status: 'cancelled' })}::jsonb,
              NOW()
            )
          `.catch(e => console.warn("Failed to create notification:", e.message));
        }

        return success("Order cancelled successfully", { cancelledOrder, refundTriggered }, 200, { headers: corsHeaders });
      }

      case 'upload-report': {
        if (!report_url) {
          return failure("report_url is required", null, 400, { headers: corsHeaders });
        }

        const orderRows = await sql`
          SELECT * FROM lab_test_orders WHERE id = ${cleanOrderId} AND lab_id = ${cleanLabId} LIMIT 1
        `;

        if (!orderRows.length) {
          return failure("Order not found", null, 404, { headers: corsHeaders });
        }

        const order = orderRows[0];

        const insertedReports = await sql`
          INSERT INTO lab_reports (
            order_id,
            lab_id,
            patient_id,
            report_url,
            test_type,
            result_summary,
            structured_results,
            created_at
          ) VALUES (
            ${cleanOrderId},
            ${cleanLabId},
            ${order.patient_id},
            ${report_url},
            'Diagnostic Report',
            ${notes || "Lab report generated successfully"},
            ${structured_results ? JSON.stringify(structured_results) : null}::jsonb,
            NOW()
          )
          RETURNING *
        `;

        const report = insertedReports[0];

        const updatedOrders = await sql`
          UPDATE lab_test_orders
          SET
            status = 'completed',
            delivered_at = NOW(),
            updated_at = NOW()
          WHERE id = ${cleanOrderId}
          RETURNING *
        `;

        const completedOrder = updatedOrders[0];

        if (order.patient_id) {
          await sql`
            INSERT INTO notifications (user_id, title, message, type, metadata, created_at)
            VALUES (
              ${order.patient_id},
              'Lab Report Available 📄',
              ${`Your test results for Booking #${order.unid || ''} are ready. Tap to view records.`},
              'lab_report',
              ${JSON.stringify({ order_id: cleanOrderId, report_id: report.id })}::jsonb,
              NOW()
            )
          `.catch(e => console.warn("Failed to create notification:", e.message));
        }

        if (order.prescription_id) {
          const presc = await sql`SELECT doctor_id FROM prescriptions WHERE id = ${order.prescription_id} LIMIT 1`;
          if (presc.length > 0 && presc[0].doctor_id) {
            await sql`
              INSERT INTO notifications (user_id, title, message, type, metadata, created_at)
              VALUES (
                ${presc[0].doctor_id},
                'Patient Lab Report Received',
                ${`Diagnostic report for booking #${order.unid || ''} is available for review.`},
                'patient_lab_report',
                ${JSON.stringify({ order_id: cleanOrderId, report_id: report.id, patient_id: order.patient_id })}::jsonb,
                NOW()
              )
            `.catch(e => console.warn("Failed to create notification:", e.message));
          }
        }

        return success("Report uploaded and order completed", { completedOrder, report }, 200, { headers: corsHeaders });
      }

      case 'complete': {
        const updated = await sql`
          UPDATE lab_test_orders
          SET
            status = 'completed',
            delivered_at = NOW(),
            updated_at = NOW()
          WHERE id = ${cleanOrderId} AND lab_id = ${cleanLabId}
          RETURNING *
        `;

        if (!updated.length) {
          return failure("Order not found or unauthorized", null, 404, { headers: corsHeaders });
        }

        return success("Order marked as completed", updated[0], 200, { headers: corsHeaders });
      }
    }
  } catch (err) {
    console.error("Action error:", err);
    return failure("Failed to process action", err.message, 500, { headers: corsHeaders });
  }
}