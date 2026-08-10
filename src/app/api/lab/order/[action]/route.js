import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { initiateRefund } from "@/lib/layer1/refundEngine";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

// Process lab order actions
export async function POST(req, { params }) {
  try {
    const action = params.action;
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

    if (!order_id || !lab_id) {
      return failure("order_id and lab_id required", null, 400, { headers: corsHeaders });
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

        const updates = {
          status,
          lab_notes: notes || null,
          updated_at: new Date().toISOString()
        };

        // Record timestamps based on status milestones
        if (status === 'collected') {
          updates.sample_collected_at = new Date().toISOString();
        } else if (status === 'received_at_lab') {
          updates.sample_received_at_lab_at = new Date().toISOString();
        } else if (status === 'processing') {
          updates.processing_started_at = new Date().toISOString();
        } else if (status === 'quality_check') {
          updates.quality_checked_at = new Date().toISOString();
        } else if (status === 'completed') {
          updates.delivered_at = new Date().toISOString();
        }

        const { data, error } = await supabase
          .from("lab_test_orders")
          .update(updates)
          .eq("id", order_id)
          .eq("lab_id", lab_id)
          .select()
          .single();

        if (error) throw error;

        // Create notification for patient
        await supabase.from("notifications").insert({
          user_id: data.patient_id,
          title: `Lab Order Status: ${status.toUpperCase().replace('_', ' ')}`,
          message: `Your lab test order #${data.unid} status updated to ${status.replace('_', ' ')}.`,
          type: "lab_order",
          metadata: { order_id, status }
        });

        return success("Order status updated", data, 200, { headers: corsHeaders });
      }

      case 'update-items': {
        if (!items || !Array.isArray(items)) {
          return failure("items array required", null, 400, { headers: corsHeaders });
        }

        const updatePromises = items.map(item =>
          supabase
            .from("lab_test_order_items")
            .update({
              status: item.status,
              price: item.price
            })
            .eq("id", item.id)
            .eq("order_id", order_id)
        );

        await Promise.all(updatePromises);

        const { data: updatedItems } = await supabase
          .from("lab_test_order_items")
          .select("price")
          .eq("order_id", order_id)
          .eq("status", "approved");

        const totalAmount = updatedItems.reduce((sum, item) => sum + (item.price || 0), 0);

        await supabase
          .from("lab_test_orders")
          .update({
            total_amount: totalAmount,
            updated_at: new Date().toISOString()
          })
          .eq("id", order_id);

        return success("Order items updated", { totalAmount }, 200, { headers: corsHeaders });
      }

      case 'assign-technician': {
        if (!technician_name || !technician_phone) {
          return failure("Technician name and phone are required", null, 400, { headers: corsHeaders });
        }

        const { data, error } = await supabase
          .from("lab_test_orders")
          .update({
            status: "technician_assigned",
            technician_id: technician_id || null,
            technician_name,
            technician_phone,
            technician_vehicle: technician_vehicle || null,
            technician_assigned_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", order_id)
          .eq("lab_id", lab_id)
          .select()
          .single();

        if (error) throw error;

        // Notify patient
        await supabase.from("notifications").insert({
          user_id: data.patient_id,
          title: "Technician Assigned 🧪",
          message: `${technician_name} has been assigned to collect your samples. Contact: ${technician_phone}.`,
          type: "lab_order",
          metadata: { order_id, status: "technician_assigned" }
        });

        // Mock technician SMS/WhatsApp dispatch
        console.log(`[SMS Dispatch to ${technician_phone}] Collect sample at ${JSON.stringify(data.delivery_address)} on ${data.scheduled_at}`);

        return success("Technician assigned successfully", data, 200, { headers: corsHeaders });
      }

      case 'cancel': {
        // Fetch order details
        const { data: order, error: fetchErr } = await supabase
          .from("lab_test_orders")
          .select("*")
          .eq("id", order_id)
          .eq("lab_id", lab_id)
          .single();

        if (fetchErr || !order) {
          return failure("Order not found", null, 404, { headers: corsHeaders });
        }

        if (order.status === 'completed' || order.status === 'cancelled') {
          return failure("Cannot cancel a completed or already cancelled order", null, 400, { headers: corsHeaders });
        }

        // Check if refund is required
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
              initiated_by: `lab:${lab_id}`
            });
            refundTriggered = true;
          } catch (refundErr) {
            console.error("Failed to process auto-refund on cancellation:", refundErr.message);
          }
        }

        const { data: cancelledOrder, error: cancelErr } = await supabase
          .from("lab_test_orders")
          .update({
            status: "cancelled",
            payment_status: refundTriggered ? "refunded" : order.payment_status,
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            lab_notes: cancel_reason ? `Cancellation Reason: ${cancel_reason}` : order.lab_notes
          })
          .eq("id", order_id)
          .select()
          .single();

        if (cancelErr) throw cancelErr;

        // Notify patient
        await supabase.from("notifications").insert({
          user_id: order.patient_id,
          title: "Lab Booking Cancelled ❌",
          message: `Your booking #${order.unid} has been cancelled. ${refundTriggered ? "Refund initiated successfully." : ""}`,
          type: "lab_order",
          metadata: { order_id, status: "cancelled" }
        });

        return success("Order cancelled successfully", { cancelledOrder, refundTriggered }, 200, { headers: corsHeaders });
      }

      case 'upload-report': {
        if (!report_url) {
          return failure("report_url is required", null, 400, { headers: corsHeaders });
        }

        // Fetch order details
        const { data: order, error: fetchErr } = await supabase
          .from("lab_test_orders")
          .select("*")
          .eq("id", order_id)
          .eq("lab_id", lab_id)
          .single();

        if (fetchErr || !order) {
          return failure("Order not found", null, 404, { headers: corsHeaders });
        }

        // Create Report record
        const { data: report, error: reportErr } = await supabase
          .from("lab_reports")
          .insert({
            order_id,
            lab_id,
            patient_id: order.patient_id,
            report_url,
            test_type: "Diagnostic Report",
            result_summary: notes || "Lab report generated successfully",
            structured_results: structured_results || null,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (reportErr) throw reportErr;

        // Update Order to completed status
        const { data: completedOrder } = await supabase
          .from("lab_test_orders")
          .update({
            status: "completed",
            delivered_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", order_id)
          .select()
          .single();

        // 1. Notify Patient
        await supabase.from("notifications").insert({
          user_id: order.patient_id,
          title: "Lab Report Available 📄",
          message: `Your test results for Booking #${order.unid} are ready. Tap to view records.`,
          type: "lab_report",
          metadata: { order_id, report_id: report.id }
        });

        // 2. Notify Doctor (if prescription exists)
        if (order.prescription_id) {
          const { data: prescription } = await supabase
            .from("prescriptions")
            .select("doctor_id")
            .eq("id", order.prescription_id)
            .maybeSingle();

          if (prescription?.doctor_id) {
            await supabase.from("notifications").insert({
              user_id: prescription.doctor_id,
              title: "Patient Lab Report Received",
              message: `Diagnostic report for booking #${order.unid} is available for review.`,
              type: "patient_lab_report",
              metadata: { order_id, report_id: report.id, patient_id: order.patient_id }
            });
          }
        }

        return success("Report uploaded and order completed", { completedOrder, report }, 200, { headers: corsHeaders });
      }

      case 'complete': {
        const { data: orderData, error: orderError } = await supabase
          .from("lab_test_orders")
          .update({
            status: "completed",
            updated_at: new Date().toISOString(),
            delivered_at: new Date().toISOString()
          })
          .eq("id", order_id)
          .eq("lab_id", lab_id)
          .select()
          .single();

        if (orderError) throw orderError;

        return success("Order marked as completed", orderData, 200, { headers: corsHeaders });
      }
    }
  } catch (err) {
    console.error("Action error:", err);
    return failure("Failed to process action", err.message, 500, { headers: corsHeaders });
  }
}