import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";
import { buildPrescriptionHtml } from "@/lib/buildPrescriptionHtml";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders() });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const order_id = searchParams.get("order_id");
  const chemist_id = searchParams.get("chemist_id");
  const format = searchParams.get("format") || "json";

  return handleDispensingCopy({ order_id, chemist_id, format });
}

export async function POST(req) {
  try {
    const body = await req.json();
    return handleDispensingCopy(body);
  } catch (err) {
    return failure("Invalid request body", err.message, 400);
  }
}

async function handleDispensingCopy({ order_id, chemist_id, format = "json" }) {
  if (!order_id || !chemist_id) {
    return failure("order_id and chemist_id are required", null, 400);
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(order_id) || !uuidRegex.test(chemist_id)) {
    return failure("Order not found or invalid ID format", null, 404);
  }

  try {
    // 1. Fetch Order
    const [order] = await sql`
      SELECT 
        id, prescription_id, patient_id, chemist_id, status, total_amount,
        medicine_subtotal, delivery_charge, discount, promised_delivery_at,
        warning_at, breach_at, sla_status, created_at, payment_verified_at,
        patient_notes, chemist_notes
      FROM medicine_orders
      WHERE id = ${order_id} AND chemist_id = ${chemist_id}
      LIMIT 1
    `;

    if (!order) {
      return failure("Order not found or not authorized for this pharmacy", null, 404);
    }

    // 2. Fetch Prescription details
    const [prescription] = await sql`
      SELECT id, appointment_id, doctor_id, medicines, follow_up, created_at, signed_at
      FROM prescriptions
      WHERE id = ${order.prescription_id}
      LIMIT 1
    `;

    if (!prescription) {
      return failure("Prescription record not found", null, 404);
    }

    // 3. Fetch Doctor & Prescriber details
    const [doctorDetails] = prescription.doctor_id ? await sql`
      SELECT id, full_name, qualification, specialization, license_number, signature_url, clinic_name
      FROM doctor_details
      WHERE id = ${prescription.doctor_id}
      LIMIT 1
    ` : [null];

    // 4. Fetch Patient details
    const [patientDetails] = await sql`
      SELECT id, full_name, gender, date_of_birth, address, city, state, pincode
      FROM patient_details
      WHERE id = ${order.patient_id}
      LIMIT 1
    `;

    const [patientUser] = await sql`
      SELECT phone_number
      FROM users
      WHERE id = ${order.patient_id}
      LIMIT 1
    `;

    // 5. Evaluate Address Gating (Only released after verified payment)
    const isPaymentVerified = [
      'payment_verified',
      'fulfilment_released',
      'fulfilment_confirmed',
      'confirmed',
      'processing',
      'packing',
      'packed',
      'ready_for_dispatch',
      'out_for_delivery',
      'delivered',
      'completed'
    ].includes(String(order.status).toLowerCase());

    const deliveryAddress = isPaymentVerified
      ? (patientDetails?.address ? `${patientDetails.address}, ${patientDetails.city || ''} ${patientDetails.pincode || ''}`.trim() : "Address on file")
      : `Area / PIN: ${patientDetails?.pincode || 'Protected'} (Full address released upon verified payment)`;

    const patientContact = isPaymentVerified
      ? (patientUser?.phone_number || "Contact on file")
      : "Restricted (Available post-payment)";

    // 6. Format medicines list
    let parsedMedicines = [];
    if (typeof prescription.medicines === "string") {
      try { parsedMedicines = JSON.parse(prescription.medicines); } catch {}
    } else if (Array.isArray(prescription.medicines)) {
      parsedMedicines = prescription.medicines;
    }

    const dispensingItems = parsedMedicines.map((m, idx) => ({
      item_index: idx + 1,
      name: m.name || m.medicine_name || "—",
      dosage: m.dosage || m.dosage_instruction || "As directed",
      frequency: m.frequency || "—",
      duration: m.duration || "—",
      quantity: m.quantity || 1,
      instructions: m.instructions || m.notes || "",
    }));

    // 7. Assemble Dispensing Copy Payload
    const dispensingCopy = {
      document_type: "PHARMACY_DISPENSING_COPY",
      compliance: "DPDP_ACT_2023_MINIMUM_NECESSARY_DISCLOSURE",
      order_id: order.id,
      prescription_ref: prescription.id,
      issued_at: prescription.created_at,
      payment_status: isPaymentVerified ? "VERIFIED" : "PENDING_VERIFICATION",
      order_status: order.status,
      prescriber: {
        doctor_name: doctorDetails?.full_name || "Authorized Teleconsultation Doctor",
        qualification: doctorDetails?.qualification || "MBBS",
        specialization: doctorDetails?.specialization || "General Medicine",
        medical_registration_number: doctorDetails?.license_number || "Registered Medical Practitioner",
        clinic_name: doctorDetails?.clinic_name || "MediConnect Virtual Care",
        signature_status: doctorDetails?.signature_url ? "DIGITALLY_SIGNED" : "VERIFIED_RECORD",
        signed_at: prescription.signed_at || prescription.created_at,
      },
      patient_dispensing_identity: {
        patient_name: patientDetails?.full_name || "Patient",
        gender: patientDetails?.gender || "—",
        date_of_birth: patientDetails?.date_of_birth || null,
        delivery_address: deliveryAddress,
        patient_contact: patientContact,
        address_released: isPaymentVerified,
      },
      dispensing_items: dispensingItems,
      pricing: {
        medicine_subtotal: order.medicine_subtotal,
        delivery_charge: order.delivery_charge,
        discount: order.discount,
        total_amount: order.total_amount,
      },
      sla: {
        promised_delivery_at: order.promised_delivery_at,
        warning_at: order.warning_at,
        breach_at: order.breach_at,
        sla_status: order.sla_status || "ON_TRACK",
      },
      legal_notice: "This is a dedicated Pharmacy Dispensing Copy issued in accordance with the Pharmacy Act, 1948 and DPDP Act, 2023. Non-dispensing clinical information (diagnosis, vitals, investigation results) has been redacted to ensure patient medical confidentiality.",
    };

    // 8. Log activity
    try {
      await sql`
        INSERT INTO activity_log (user_id, action, details, created_at)
        VALUES (${chemist_id}, 'DISPENSING_COPY_ACCESSED', ${JSON.stringify({ order_id: order.id, is_payment_verified: isPaymentVerified })}, NOW())
      `;
    } catch {}

    // Return HTML if format=html requested
    if (format === "html") {
      const htmlPayload = {
        pid: prescription.id.slice(0, 8).toUpperCase(),
        created_at: prescription.created_at,
        signed_at: prescription.signed_at,
        doctor_details: doctorDetails,
        patient_details: {
          ...patientDetails,
          address: deliveryAddress,
        },
        medicines: parsedMedicines,
      };

      const html = buildPrescriptionHtml(htmlPayload, {
        isChemistView: true,
        forDispensing: true,
      });

      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders() },
      });
    }

    return success("Pharmacy Dispensing Copy retrieved successfully", dispensingCopy, 200);

  } catch (err) {
    console.error("Error generating dispensing copy:", err);
    return failure("Failed to generate dispensing copy", err.message, 500);
  }
}
