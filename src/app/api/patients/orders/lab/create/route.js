import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { prescription_id, patient_id, lab_id, tests, patient_notes } = await req.json();

    if (!patient_id) {
      return failure("patient_id required", null, 400, { headers: corsHeaders });
    }

    let totalAmount = 0;
    if (Array.isArray(tests)) {
      totalAmount = tests.reduce((sum, t) => sum + (parseFloat(t.price) || 0), 0);
    }

    let careEpisodeId = null;
    if (prescription_id) {
      const prescRows = await sql`
        SELECT a.care_episode_id
        FROM prescriptions p
        LEFT JOIN appointments a ON a.id = p.appointment_id
        WHERE p.id = ${prescription_id}
        LIMIT 1
      `;
      if (prescRows.length > 0 && prescRows[0].care_episode_id) {
        careEpisodeId = prescRows[0].care_episode_id;
      }
    }

    const orderRows = await sql`
      INSERT INTO lab_test_orders (
        prescription_id,
        patient_id,
        lab_id,
        care_episode_id,
        status,
        payment_status,
        patient_notes,
        total_amount,
        created_at,
        updated_at
      ) VALUES (
        ${prescription_id || null},
        ${patient_id},
        ${lab_id || null},
        ${careEpisodeId},
        ${lab_id ? "booked" : "pending"},
        'pending',
        ${patient_notes || null},
        ${totalAmount},
        NOW(),
        NOW()
      )
      RETURNING *
    `;

    const order = orderRows[0];

    if (Array.isArray(tests) && tests.length > 0) {
      for (const t of tests) {
        await sql`
          INSERT INTO lab_test_order_items (
            order_id,
            test_name,
            price,
            test_id,
            notes,
            status
          ) VALUES (
            ${order.id},
            ${t.test_name || t.name || ""},
            ${t.price ? parseFloat(t.price) : null},
            ${t.test_id || null},
            ${t.notes || null},
            'pending'
          )
        `;
      }
    }

    // Send notifications in AWS RDS
    try {
      let labName = "the Laboratory";
      if (lab_id) {
        const labRes = await sql`SELECT lab_name FROM lab_details WHERE id = ${lab_id} LIMIT 1`;
        if (labRes.length > 0) labName = labRes[0].lab_name;
      }

      await sql`
        INSERT INTO notifications (user_id, title, message, type, metadata, created_at)
        VALUES (
          ${patient_id},
          'Lab Order Placed',
          ${'Your lab test order has been successfully placed with ' + labName + '. Estimated Total: ₹' + totalAmount + '.'},
          'lab_order',
          ${sql.json({ order_id: order.id, lab_id })},
          NOW()
        )
      `;

      if (lab_id) {
        const patRes = await sql`SELECT full_name FROM patient_details WHERE id = ${patient_id} LIMIT 1`;
        const patientName = patRes[0]?.full_name || "Patient";

        await sql`
          INSERT INTO notifications (user_id, title, message, type, metadata, created_at)
          VALUES (
            ${lab_id},
            'New Lab Order',
            ${'You have received a new lab test order from ' + patientName + '.'},
            'lab_order',
            ${sql.json({ order_id: order.id, patient_id })},
            NOW()
          )
        `;
      }
    } catch (notifErr) {
      console.warn("Notification insert error:", notifErr.message);
    }

    return success("Lab test order created", order, 201, { headers: corsHeaders });
  } catch (err) {
    console.error("Failed creating test order:", err);
    return failure("Failed creating test order", err.message, 500, { headers: corsHeaders });
  }
}
