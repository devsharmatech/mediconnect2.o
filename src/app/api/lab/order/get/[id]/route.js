import sql from "@/lib/db";
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
      return new Response(
        JSON.stringify({ status: false, message: "Valid order ID required" }),
        { headers: corsHeaders, status: 400 }
      );
    }

    const orderRows = await sql`
      SELECT * FROM lab_test_orders WHERE id = ${cleanId} LIMIT 1
    `;

    if (!orderRows.length) {
      return new Response(
        JSON.stringify({ status: false, message: "Order not found" }),
        { headers: corsHeaders, status: 404 }
      );
    }

    const order = orderRows[0];

    // Fetch patient info
    let patient = null;
    if (order.patient_id) {
      const u = await sql`SELECT id, phone_number, profile_picture, role FROM users WHERE id = ${order.patient_id} LIMIT 1`;
      const pd = await sql`SELECT * FROM patient_details WHERE id = ${order.patient_id} LIMIT 1`;
      if (u.length > 0) {
        patient = {
          ...u[0],
          details: pd[0] || null,
        };
      }
    }

    // Fetch prescription if exists
    let prescription = null;
    if (order.prescription_id) {
      const prescRows = await sql`
        SELECT id, unid, medicines, lab_tests, investigations, special_message, created_at, doctor_id, appointment_id
        FROM prescriptions
        WHERE id = ${order.prescription_id}
        LIMIT 1
      `;
      if (prescRows.length > 0) {
        prescription = prescRows[0];
        if (prescription.doctor_id) {
          const doc = await sql`
            SELECT full_name, specialization, qualification, clinic_name, clinic_address, signature_url
            FROM doctor_details
            WHERE id = ${prescription.doctor_id}
            LIMIT 1
          `;
          prescription.doctor = doc[0] || null;
        }
        if (prescription.appointment_id) {
          const appt = await sql`
            SELECT id, appointment_date, appointment_time, status, disease_info, call_started_at, call_ended_at
            FROM appointments
            WHERE id = ${prescription.appointment_id}
            LIMIT 1
          `;
          prescription.appointment = appt[0] || null;
        }
      }
    }

    // Fetch order items
    const items = await sql`
      SELECT * FROM lab_test_order_items WHERE order_id = ${cleanId}
    `;

    return new Response(
      JSON.stringify({
        status: true,
        message: "Order details fetched",
        data: {
          ...order,
          patient,
          prescription,
          items,
        },
      }),
      { headers: corsHeaders, status: 200 }
    );
  } catch (err) {
    console.error("GET lab/order/get/[id] error:", err);
    return new Response(
      JSON.stringify({
        status: false,
        message: "Error fetching lab order details",
        error: err.message,
      }),
      { headers: corsHeaders, status: 500 }
    );
  }
}
