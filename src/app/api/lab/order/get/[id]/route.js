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

    // Fetch patient info with DPDP privacy safeguards
    let patient = null;
    if (order.patient_id) {
      const u = await sql`SELECT id, phone_number, profile_picture, role FROM users WHERE id = ${order.patient_id} LIMIT 1`;
      const pd = await sql`SELECT * FROM patient_details WHERE id = ${order.patient_id} LIMIT 1`;
      if (u.length > 0) {
        const rawPhone = u[0].phone_number || pd[0]?.phone || "";
        const rawEmail = pd[0]?.email || "";

        // Masking according to DPDP Act 2023 for laboratory view
        const maskPhone = (num) => {
          if (!num) return "—";
          const s = String(num).trim();
          if (s.length < 7) return s;
          const start = s.slice(0, 4);
          const end = s.slice(-3);
          return `${start}${"*".repeat(Math.max(3, s.length - 7))}${end}`;
        };

        const maskEmail = (em) => {
          if (!em || !em.includes("@")) return "—";
          const [name, domain] = em.split("@");
          return `${name[0]}${"*".repeat(Math.max(3, name.length - 1))}@${domain}`;
        };

        let maskedEmergencyContact = null;
        if (pd[0]?.emergency_contact) {
          try {
            const ec = typeof pd[0].emergency_contact === "string" 
              ? JSON.parse(pd[0].emergency_contact) 
              : pd[0].emergency_contact;
            if (ec && typeof ec === "object") {
              const ecName = ec.name || "";
              const ecPhone = ec.phone ? maskPhone(ec.phone) : "";
              maskedEmergencyContact = ecName && ecPhone ? `${ecName} (${ecPhone})` : ecName || ecPhone || "—";
            } else {
              maskedEmergencyContact = String(pd[0].emergency_contact);
            }
          } catch {
            maskedEmergencyContact = String(pd[0].emergency_contact);
          }
        }

        patient = {
          ...u[0],
          raw_phone: rawPhone,
          phone_number: maskPhone(rawPhone),
          details: pd[0] ? {
            ...pd[0],
            raw_phone: rawPhone,
            raw_email: rawEmail,
            email: maskEmail(rawEmail),
            phone: maskPhone(rawPhone),
            emergency_contact: maskedEmergencyContact,
          } : null,
          dpdp_compliant: true,
        };
      }
    }

    // Fetch prescription ONLY if order has a genuinely attached prescription_id
    let prescription = null;
    const targetPrescId = order.prescription_id;

    if (targetPrescId) {
      const prescRows = await sql`
        SELECT id, unid, lab_tests, investigations, created_at, doctor_id, appointment_id, file_url, status
        FROM prescriptions
        WHERE id = ${targetPrescId}
        LIMIT 1
      `;
      if (prescRows.length > 0) {
        const rawPresc = prescRows[0];
        let doctor = null;
        let appointment = null;

        if (rawPresc.doctor_id) {
          const doc = await sql`
            SELECT full_name, specialization, qualification, clinic_name, clinic_address, signature_url
            FROM doctor_details
            WHERE id = ${rawPresc.doctor_id}
            LIMIT 1
          `;
          doctor = doc[0] || null;
        }

        if (rawPresc.appointment_id) {
          const appt = await sql`
            SELECT id, appointment_date, appointment_time, status
            FROM appointments
            WHERE id = ${rawPresc.appointment_id}
            LIMIT 1
          `;
          appointment = appt[0] || null;
        }

        // Format lab tests cleanly
        let parsedLabTests = [];
        if (Array.isArray(rawPresc.lab_tests)) {
          parsedLabTests = rawPresc.lab_tests;
        } else if (typeof rawPresc.lab_tests === "string") {
          try {
            parsedLabTests = JSON.parse(rawPresc.lab_tests);
          } catch {
            parsedLabTests = [rawPresc.lab_tests];
          }
        }

        // Diagnostic Laboratory View (DPDP Act 2023 Compliant)
        // Strictly includes: Doctor basic info, Patient clinical demographics, and Prescribed Lab Tests only.
        // OMITTED: Medicines, dosages, provisional diagnoses, warning signs.
        prescription = {
          id: rawPresc.id,
          unid: rawPresc.unid,
          created_at: rawPresc.created_at,
          status: rawPresc.status,
          file_url: rawPresc.file_url || null,
          prescription_file_url: rawPresc.file_url || null,
          is_uploaded: Boolean(rawPresc.file_url),
          is_digital: Boolean(!rawPresc.file_url && (rawPresc.doctor_id || rawPresc.appointment_id || parsedLabTests.length > 0)),
          lab_tests: parsedLabTests,
          investigations: rawPresc.investigations || null,
          doctor,
          appointment,
        };
      }
    }

    // Fetch order items
    const items = await sql`
      SELECT * FROM lab_test_order_items WHERE order_id = ${cleanId}
    `;

    const itemsSubtotal = items.reduce((sum, item) => sum + parseFloat(item.price || 0), 0);
    const totalOrderAmount = parseFloat(order.total_amount || itemsSubtotal);
    const collectionFee = (order.visit_type === "home_collection" || totalOrderAmount > itemsSubtotal)
      ? Math.max(0, totalOrderAmount - itemsSubtotal)
      : 0;

    return new Response(
      JSON.stringify({
        status: true,
        message: "Order details fetched",
        data: {
          ...order,
          patient,
          prescription,
          items,
          pricing_breakdown: {
            items_subtotal: itemsSubtotal,
            collection_fee: collectionFee,
            total_amount: totalOrderAmount,
          },
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
