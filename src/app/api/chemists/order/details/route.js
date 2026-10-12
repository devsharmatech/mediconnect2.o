import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { order_id } = await req.json();

    if (!order_id) {
      return failure("order_id required", null, 400, { headers: corsHeaders });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(order_id));

    /* =====================================================
       1️⃣ FETCH ORDER CORE
    ===================================================== */
    const orderRows = isUuid
      ? await sql`
          SELECT
            mo.id,
            mo.unid,
            mo.status,
            mo.total_amount,
            mo.medicine_subtotal,
            mo.delivery_charge,
            mo.discount,
            mo.payment_qr_url,
            mo.payment_qr_payload,
            mo.payment_requested_at,
            mo.payment_verified_at,
            mo.promised_delivery_at,
            mo.warning_at,
            mo.breach_at,
            mo.sla_status,
            mo.created_at,
            mo.updated_at,
            mo.chemist_notes,
            mo.prescription_id,
            mo.patient_id,
            mo.chemist_id,
            mo.delivery_type,
            mo.patient_notes,
            mo.utr_number,
            mo.payment_proof_url,
            mo.payment_status,
            mo.payment_method,
            mo.razorpay_payment_id,
            mo.razorpay_order_id,
            mo.payu_mihpayid,
            mo.payu_txnid,
            mo.payu_status,
            mo.chemist_payout_amount,
            mo.platform_commission_amount,
            mo.chemist_payout_method,
            mo.chemist_payout_destination,
            pd.address AS raw_delivery_address,

            -- Patient basic
            u.un_id        AS patient_un_id,
            u.phone_number AS patient_phone,

            -- Patient details
            pd.full_name     AS patient_full_name,
            pd.gender        AS patient_gender,
            pd.date_of_birth AS patient_dob,
            pd.address       AS patient_address,
            pd.email         AS patient_email,
            pd.blood_group   AS patient_blood_group

          FROM medicine_orders mo
          LEFT JOIN users         u  ON u.id  = mo.patient_id
          LEFT JOIN patient_details pd ON pd.id = mo.patient_id
          WHERE mo.id = ${order_id}
          LIMIT 1
        `
      : await sql`
          SELECT
            mo.id,
            mo.unid,
            mo.status,
            mo.total_amount,
            mo.medicine_subtotal,
            mo.delivery_charge,
            mo.discount,
            mo.payment_qr_url,
            mo.payment_qr_payload,
            mo.payment_requested_at,
            mo.payment_verified_at,
            mo.promised_delivery_at,
            mo.warning_at,
            mo.breach_at,
            mo.sla_status,
            mo.created_at,
            mo.updated_at,
            mo.chemist_notes,
            mo.prescription_id,
            mo.patient_id,
            mo.chemist_id,
            mo.delivery_type,
            mo.patient_notes,
            mo.utr_number,
            mo.payment_proof_url,
            mo.payment_status,
            mo.payment_method,
            mo.razorpay_payment_id,
            mo.razorpay_order_id,
            mo.payu_mihpayid,
            mo.payu_txnid,
            mo.payu_status,
            mo.chemist_payout_amount,
            mo.platform_commission_amount,
            mo.chemist_payout_method,
            mo.chemist_payout_destination,
            pd.address AS raw_delivery_address,

            -- Patient basic
            u.un_id        AS patient_un_id,
            u.phone_number AS patient_phone,

            -- Patient details
            pd.full_name     AS patient_full_name,
            pd.gender        AS patient_gender,
            pd.date_of_birth AS patient_dob,
            pd.address       AS patient_address,
            pd.email         AS patient_email,
            pd.blood_group   AS patient_blood_group

          FROM medicine_orders mo
          LEFT JOIN users         u  ON u.id  = mo.patient_id
          LEFT JOIN patient_details pd ON pd.id = mo.patient_id
          WHERE mo.unid::text = ${String(order_id)} OR mo.id::text LIKE ${String(order_id) + '%'}
          LIMIT 1
        `;

    const order = orderRows[0];
    if (!order) {
      return failure("Order not found", null, 404, { headers: corsHeaders });
    }

    const resolvedOrderId = order.id;

    /* =====================================================
       2️⃣ FETCH ORDER ITEMS
    ===================================================== */
    const items = await sql`
      SELECT * FROM medicine_order_items
      WHERE order_id = ${resolvedOrderId}
      ORDER BY unid ASC
    `;

    /* =====================================================
       3️⃣ FETCH CHEMIST DETAILS (IF ASSIGNED)
    ===================================================== */
    let chemistDetails = null;
    if (order.chemist_id) {
      const chemistRows = await sql`
        SELECT
          id,
          pharmacy_name,
          owner_name,
          address,
          email,
          mobile,
          whatsapp,
          gstin,
          payment_qr_url,
          payment_qr_payload,
          payment_qr_label,
          upi_id
        FROM chemist_details
        WHERE id = ${order.chemist_id}
        LIMIT 1
      `;
      chemistDetails = chemistRows[0] || null;
    }

    /* =====================================================
       4️⃣ FETCH PRESCRIPTION (IF LINKED)
    ===================================================== */
    let prescriptionFormatted = null;
    if (order.prescription_id) {
      const prescRows = await sql`
        SELECT
          p.id,
          p.unid,
          p.doctor_id,
          p.patient_id,
          p.medicines,
          p.special_message,
          p.created_at,
          p.updated_at,
          p.signed_at,

          -- Doctor details (for dispensing validation)
          dd.full_name        AS doctor_full_name,
          dd.specialization   AS doctor_specialization,
          dd.qualification    AS doctor_qualification,
          dd.clinic_name      AS doctor_clinic_name,
          dd.clinic_address   AS doctor_clinic_address,
          dd.signature_url    AS doctor_signature_url,
          dd.license_number   AS doctor_license_number,
          dd.council_name     AS doctor_council_name,
          dd.consultation_fee AS doctor_consultation_fee

        FROM prescriptions p
        LEFT JOIN doctor_details dd ON dd.id = p.doctor_id
        WHERE p.id = ${order.prescription_id}
        LIMIT 1
      `;
      const presc = prescRows[0];
      if (presc) {
        let medicines = [];
        try {
          medicines =
            typeof presc.medicines === "string"
              ? JSON.parse(presc.medicines)
              : presc.medicines || [];
        } catch (_) {
          medicines = [];
        }

        // Canonical Prescription ID matching patient portal: MED-{doc.un_id}-{pat.un_id}-{rx.unid}
        let docUnId = "0";
        if (presc.doctor_id) {
          const docUser = await sql`SELECT un_id FROM users WHERE id = ${presc.doctor_id} LIMIT 1`;
          docUnId = docUser[0]?.un_id || "0";
        }
        let patUnId = order.patient_un_id || "0";
        if (!order.patient_un_id && (presc.patient_id || order.patient_id)) {
          const patUser = await sql`SELECT un_id FROM users WHERE id = ${presc.patient_id || order.patient_id} LIMIT 1`;
          patUnId = patUser[0]?.un_id || "0";
        }
        const rxUnId = presc.unid || presc.id?.slice(0, 8) || "0";
        const canonicalPid = `MED-${docUnId}-${patUnId}-${rxUnId}`;

        prescriptionFormatted = {
          id: presc.id,
          unid: presc.unid,
          pid: canonicalPid,
          formatted_id: canonicalPid,
          created_at: presc.created_at,
          updated_at: presc.updated_at,
          medicines,
          special_message: presc.special_message || "",
          signed_at: presc.signed_at || presc.created_at,
          // Redacted per DPDP minimum-necessary rule
          lab_tests: [],
          investigations: [],
          ai_analysis: null,
          vital_signs: null,
          follow_up: null,
          diagnosis: null,
          doctor_details: presc.doctor_full_name
            ? {
                full_name: presc.doctor_full_name,
                specialization: presc.doctor_specialization,
                qualification: presc.doctor_qualification,
                clinic_name: presc.doctor_clinic_name,
                clinic_address: presc.doctor_clinic_address,
                signature_url: presc.doctor_signature_url,
                license_number: presc.doctor_license_number,
                council_name: presc.doctor_council_name,
                consultation_fee: presc.doctor_consultation_fee,
                un_id: docUnId,
              }
            : null,
          patient_details: {
            full_name: order.patient_full_name || "N/A",
            gender: order.patient_gender || "N/A",
            date_of_birth: order.patient_dob || null,
            address: order.patient_address || "N/A",
            un_id: patUnId,
          },
        };
      }
    }

    /* =====================================================
       5️⃣ FETCH PAYMENT PROOFS
    ===================================================== */
    let payments = [];
    try {
      payments = await sql`
        SELECT id, order_id, patient_id, amount, payment_method,
               payment_proof_url, utr_number, status, created_at
        FROM medicine_order_payments
        WHERE order_id = ${resolvedOrderId}
        ORDER BY created_at DESC
      `;
    } catch (_) {
      // Table may not exist yet — non-fatal
    }

    /* =====================================================
       6️⃣ FETCH INVOICE (IF GENERATED)
    ===================================================== */
    let invoice = null;
    try {
      const invoiceRows = await sql`
        SELECT id, order_id, chemist_id, patient_id, invoice_number,
               invoice_date, subtotal, tax_amount, total_amount,
               invoice_data, status, download_url, created_at
        FROM medicine_order_invoices
        WHERE order_id = ${resolvedOrderId}
        LIMIT 1
      `;
      invoice = invoiceRows[0] || null;
    } catch (_) {
      // Table may not exist yet — non-fatal
    }

    /* =====================================================
       7️⃣ FETCH PRICE HISTORY
    ===================================================== */
    let priceHistory = [];
    try {
      priceHistory = await sql`
        SELECT id, total_amount, note, created_at, qr_url, qr_payload
        FROM medicine_order_price_history
        WHERE order_id = ${resolvedOrderId}
        ORDER BY created_at DESC
      `;
    } catch (_) {
      // Table may not exist yet — non-fatal
    }

    /* =====================================================
       8️⃣ DPDP GATING — mask until payment verified
    ===================================================== */
    const isPaymentVerified = [
      "payment_verified",
      "fulfilment_released",
      "fulfilment_confirmed",
      "confirmed",
      "processing",
      "packing",
      "packed",
      "ready_for_dispatch",
      "out_for_delivery",
      "delivered",
      "completed",
      "approved",
    ].includes(String(order.status).toLowerCase()) || order.payment_status === "paid";

    const maskAddress = (addr) => {
      if (!addr) return "Delivery area restricted (released after payment verification)";
      const pinMatch = String(addr).match(/\b\d{6}\b/);
      return pinMatch
        ? `Area / PIN: ${pinMatch[0]} (Full address released upon verified payment)`
        : "Delivery area (Full address released upon verified payment)";
    };

    const maskPhone = (phone) => {
      if (!phone) return "";
      const str = String(phone);
      if (str.length <= 4) return "****";
      return str.slice(0, 3) + "******" + str.slice(-2);
    };

    /* =====================================================
       9️⃣ FINAL SHAPED RESPONSE
    ===================================================== */
    const response = {
      id: order.id,
      unid: order.unid,
      status: order.status,
      payment_status: order.payment_status || null,
      payment_method: order.payment_method || null,
      razorpay_payment_id: order.razorpay_payment_id || null,
      razorpay_order_id: order.razorpay_order_id || null,
      total_amount: order.total_amount,
      medicine_subtotal: order.medicine_subtotal,
      delivery_charge: order.delivery_charge,
      discount: order.discount,
      payment_qr_url: order.payment_qr_url,
      payment_qr_payload: order.payment_qr_payload,
      payment_requested_at: order.payment_requested_at,
      payment_verified_at: order.payment_verified_at,
      promised_delivery_at: order.promised_delivery_at,
      warning_at: order.warning_at,
      breach_at: order.breach_at,
      sla_status: order.sla_status || "ON_TRACK",
      utr_number: order.utr_number || null,
      payment_proof_url: order.payment_proof_url || null,
      created_at: order.created_at,
      updated_at: order.updated_at,
      chemist_notes: order.chemist_notes,
      prescription_id: order.prescription_id,
      patient_id: order.patient_id,
      chemist_id: order.chemist_id,
      delivery_type: order.delivery_type,
      patient_notes: order.patient_notes,
      delivery_address: isPaymentVerified
        ? order.raw_delivery_address
        : maskAddress(order.raw_delivery_address),

      medicine_order_items: items,

      patient: {
        id: order.patient_id,
        phone_number: isPaymentVerified
          ? order.patient_phone
          : maskPhone(order.patient_phone),
        patient_details: {
          full_name: order.patient_full_name || "Verified Patient",
          gender: order.patient_gender,
          date_of_birth: order.patient_dob,
          address: isPaymentVerified
            ? order.patient_address
            : maskAddress(order.patient_address),
          email: isPaymentVerified ? order.patient_email : null,
          blood_group: null, // Always redacted for dispensing context
        },
      },

      prescription: prescriptionFormatted,

      chemist: chemistDetails,

      payment: {
        requested: !!order.payment_requested_at,
        payment_qr_url: order.payment_qr_url,
        payment_qr_payload: order.payment_qr_payload,
        requested_at: order.payment_requested_at,
        proofs: payments,
        price_history: priceHistory,
      },

      invoice: invoice
        ? {
            id: invoice.id,
            order_id: invoice.order_id,
            chemist_id: invoice.chemist_id,
            patient_id: invoice.patient_id,
            invoice_number: invoice.invoice_number,
            invoice_date: invoice.invoice_date,
            subtotal: invoice.subtotal,
            tax_amount: invoice.tax_amount,
            total_amount: invoice.total_amount,
            status: invoice.status,
            download_url: invoice.download_url,
            created_at: invoice.created_at,
            invoice_data: invoice.invoice_data,
          }
        : null,
    };

    return success("Order details fetched successfully", response, 200, {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Order details error:", err);
    return failure("Error fetching order details", err.message, 500, {
      headers: corsHeaders,
    });
  }
}