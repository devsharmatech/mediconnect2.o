import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const cleanId = safeUuid(id);
    if (!cleanId) {
      return failure("Valid order ID is required", null, 400, { headers: corsHeaders });
    }

    // Fetch the real order
    const orders = await sql`
      SELECT * FROM lab_test_orders WHERE id = ${cleanId} LIMIT 1
    `;
    const order = orders[0];

    if (!order) {
      return failure("Order not found", null, 404, { headers: corsHeaders });
    }

    let labName = "Laboratory";
    if (order.lab_id) {
      const labs = await sql`SELECT lab_name FROM lab_details WHERE id = ${order.lab_id} LIMIT 1`;
      if (labs.length > 0 && labs[0].lab_name) {
        labName = labs[0].lab_name;
      }
    }
    const totalAmount = order?.total_amount || 499;

    let reportData = null;
    if (order?.status?.toLowerCase() === "completed") {
      const reports = await sql`
        SELECT report_url, result_summary, structured_results
        FROM lab_reports
        WHERE order_id = ${cleanId}
        LIMIT 1
      `;
      if (reports.length > 0) {
        reportData = reports[0];
      }
    }

    const statusVal = order?.status?.toLowerCase() || "pending";
    const isBooked = statusVal !== "pending";
    const isTechAssigned = ["technician_assigned", "collected", "received_at_lab", "processing", "quality_check", "completed"].includes(statusVal);
    const isCollected = ["collected", "received_at_lab", "processing", "quality_check", "completed"].includes(statusVal);
    const isReceived = ["received_at_lab", "processing", "quality_check", "completed"].includes(statusVal);
    const isProcessing = ["processing", "quality_check", "completed"].includes(statusVal);
    const isQC = ["quality_check", "completed"].includes(statusVal);
    const isCompleted = statusVal === "completed";

    const status = {
      orderId: cleanId,
      labName,
      totalAmount,
      status: order?.status || "pending",
      report: reportData,
      timeline: [
        { 
          title: "Booked", 
          time: new Date(order?.created_at || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), 
          completed: isBooked,
          active: statusVal === "booked"
        },
        { 
          title: "Technician Assigned", 
          time: isTechAssigned 
            ? `${order?.technician_name || "Phlebotomist"} assigned (${order?.technician_vehicle || "on vehicle"})` 
            : "Awaiting assignment from laboratory", 
          completed: isTechAssigned, 
          active: statusVal === "booked"
        },
        { 
          title: "Sample Collection", 
          time: isCollected 
            ? `Sample collected at ${new Date(order?.sample_collected_at || Date.now()).toLocaleTimeString()}` 
            : "Awaiting sample collection", 
          completed: isCollected,
          active: statusVal === "technician_assigned"
        },
        { 
          title: "Received at Lab", 
          time: isReceived ? "Sample received by lab technicians" : "Awaiting sample delivery to lab", 
          completed: isReceived,
          active: statusVal === "collected"
        },
        { 
          title: "Processing", 
          time: isProcessing ? "Lab analysis in progress" : "Awaiting processing queue", 
          completed: isProcessing,
          active: statusVal === "received_at_lab"
        },
        { 
          title: "Quality Check", 
          time: isQC ? "Verifying analysis findings for release" : "Awaiting final review", 
          completed: isQC,
          active: statusVal === "processing"
        },
        { 
          title: "Completed", 
          time: isCompleted ? "Reports released to doctor & patient" : "Pending completion", 
          completed: isCompleted,
          active: statusVal === "quality_check"
        }
      ],
      technician: order?.technician_name ? {
        name: order.technician_name,
        phone: order.technician_phone || "",
        vehicle: order.technician_vehicle || "",
        rating: 4.9,
        eta: "12 Mins"
      } : {
        name: "Assignment Pending",
        phone: "",
        vehicle: "",
        rating: 0,
        eta: "--"
      }
    };

    return success("Status fetched", status, 200, { headers: corsHeaders });
  } catch (error) {
    console.error("GET LAB STATUS API ERROR:", error.message);
    return failure("Internal Error", error.message, 500, { headers: corsHeaders });
  }
}
