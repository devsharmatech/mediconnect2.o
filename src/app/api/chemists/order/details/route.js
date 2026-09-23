import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { order_id } = await req.json();

    if (!order_id) {
      return failure("order_id required", null, 400, {
        headers: corsHeaders,
      });
    }

    /* =====================================================
       1️⃣ FETCH ORDER + ALL RELATIONS
    ===================================================== */
    const { data: order, error } = await supabase
      .from("medicine_orders")
      .select(`
        id,
        unid,
        status,
        total_amount,
        medicine_subtotal,
        delivery_charge,
        discount,
        payment_qr_url,
        payment_qr_payload,
        payment_requested_at,
        payment_verified_at,
        promised_delivery_at,
        warning_at,
        breach_at,
        sla_status,
        created_at,
        updated_at,
        chemist_notes,
        prescription_id,
        patient_id,
        chemist_id,
        delivery_type,
        patient_notes,
        utr_number,

        medicine_order_items(*),

        patient:patient_id(
          id,
          phone_number,
          patient_details(
            full_name,
            gender,
            date_of_birth,
            address,
            email,
            blood_group
          )
        ),

        prescription:prescription_id(
          id,
          medicines,
          lab_tests,
          investigations,
          special_message,
          created_at,
          ai_analysis,
          updated_at,
          pid,
          doctor_id,
          patient_id,
          appointment_id,
          signed_at,
          vital_signs,
          follow_up,
          diagnosis,
          
          doctor:doctor_id(
            full_name,
            specialization,
            qualification,
            clinic_name,
            clinic_address,
            signature_url,
            license_number,
            consultation_fee
          ),

          appointment:appointment_id(
            id,
            appointment_date,
            appointment_time,
            status,
            disease_info,
            created_at
          )
        )
      `)
      .eq("id", order_id)
      .single();

    if (error || !order) {
      console.error("Order fetch error:", error);
      return failure("Order not found", error, 404, {
        headers: corsHeaders,
      });
    }

    /* =====================================================
       2️⃣ FETCH PAYMENT PROOFS (PATIENT UPLOADS)
    ===================================================== */
    const { data: payments } = await supabase
      .from("medicine_order_payments")
      .select(`
        id,
        order_id,
        patient_id,
        amount,
        payment_method,
        payment_proof_url,
        utr_number,
        status,
        created_at
      `)
      .eq("order_id", order_id)
      .order("created_at", { ascending: false });

    /* =====================================================
       3️⃣ FETCH INVOICE (IF GENERATED)
    ===================================================== */
    const { data: invoice } = await supabase
      .from("medicine_order_invoices")
      .select(`
        id,
        order_id,
        chemist_id,
        patient_id,
        invoice_number,
        invoice_date,
        subtotal,
        tax_amount,
        total_amount,
        invoice_data,
        status,
        download_url,
        created_at
      `)
      .eq("order_id", order_id)
      .maybeSingle();

    /* =====================================================
       4️⃣ MANUALLY FETCH PATIENT DETAILS IF NOT AVAILABLE
    ===================================================== */
    let patientWithDetails = order.patient;
    if (order.patient_id && (!order.patient?.patient_details || Object.keys(order.patient?.patient_details || {}).length === 0)) {
      const { data: patientDetails } = await supabase
        .from("patient_details")
        .select(`
          full_name,
          gender,
          date_of_birth,
          address,
          email,
          blood_group
        `)
        .eq("id", order.patient_id)
        .maybeSingle();
      
      if (patientDetails) {
        patientWithDetails = {
          ...order.patient,
          patient_details: patientDetails
        };
      }
    }

    /* =====================================================
       4.5 DPDP COMPLIANCE & FULFILMENT RELEASE GATING
       (Page 5 & 8 of V3 Master Specification)
    ===================================================== */
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

    const maskAddress = (addr) => {
      if (!addr) return "Delivery Area Restricted (Released after payment verification)";
      if (typeof addr === "string") {
        const pinMatch = addr.match(/\b\d{6}\b/);
        return pinMatch 
          ? `Area / PIN: ${pinMatch[0]} (Full address released upon verified payment)`
          : "Delivery Area (Full address released upon verified payment)";
      }
      if (typeof addr === "object") {
        const area = addr.area || addr.city || addr.district || "";
        const pincode = addr.pincode || addr.postal_code || "";
        return `Area: ${area} ${pincode ? `(${pincode})` : ""} (Full address released upon verified payment)`;
      }
      return "Delivery Area (Full address released upon verified payment)";
    };

    const maskPhone = (phone) => {
      if (!phone) return "";
      const str = String(phone);
      if (str.length <= 4) return "****";
      return str.slice(0, 3) + "******" + str.slice(-2);
    };

    /* =====================================================
       5️⃣ TRANSFORM PRESCRIPTION DATA FOR DISPENSING COPY
       (Clinical diagnosis/history redacted per V3 spec)
    ===================================================== */
    let prescriptionFormatted = null;
    if (order.prescription) {
      let medicines = [];
      try {
        medicines = typeof order.prescription.medicines === 'string' 
          ? JSON.parse(order.prescription.medicines) 
          : order.prescription.medicines || [];
      } catch (e) {
        console.error("Error parsing medicines:", e);
        medicines = [];
      }

      prescriptionFormatted = {
        id: order.prescription.id,
        pid: order.prescription.pid || order.prescription.id?.slice(0, 8) || 'N/A',
        created_at: order.prescription.created_at,
        updated_at: order.prescription.updated_at,
        medicines: medicines,
        lab_tests: [], // Redacted: Minimum-necessary dispensing rule (V3 DPDP)
        investigations: [], // Redacted: Minimum-necessary dispensing rule (V3 DPDP)
        special_message: order.prescription.special_message || "",
        ai_analysis: null, // Redacted: Minimum-necessary dispensing rule (V3 DPDP)
        signed_at: order.prescription.signed_at,
        vital_signs: null, // Redacted: Minimum-necessary dispensing rule (V3 DPDP)
        follow_up: null,
        diagnosis: null, // Redacted: Minimum-necessary dispensing rule (V3 DPDP)
        
        // Doctor details - required for dispensing legal validation
        doctor_details: order.prescription.doctor ? {
          full_name: order.prescription.doctor.full_name,
          specialization: order.prescription.doctor.specialization,
          qualification: order.prescription.doctor.qualification,
          clinic_name: order.prescription.doctor.clinic_name,
          clinic_address: order.prescription.doctor.clinic_address,
          signature_url: order.prescription.doctor.signature_url,
          license_number: order.prescription.doctor.license_number,
          consultation_fee: order.prescription.doctor.consultation_fee
        } : null,
        
        // Patient details - gated and sanitized
        patient_details: patientWithDetails?.patient_details ? {
          full_name: patientWithDetails.patient_details.full_name,
          gender: patientWithDetails.patient_details.gender,
          date_of_birth: patientWithDetails.patient_details.date_of_birth,
          address: isPaymentVerified
            ? patientWithDetails.patient_details.address
            : maskAddress(patientWithDetails.patient_details.address),
          email: isPaymentVerified ? patientWithDetails.patient_details.email : null,
          blood_group: null
        } : null,
        
        // Appointments - clinical context redacted
        appointments: null
      };
    }

    /* =====================================================
       6️⃣ FETCH CHEMIST DETAILS (IF ASSIGNED)
    ===================================================== */
    let chemistDetails = null;
    if (order.chemist_id) {
      const { data: chemist } = await supabase
        .from("chemist_details")
        .select(`
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
          payment_qr_label
        `)
        .eq("id", order.chemist_id)
        .maybeSingle();
      
      chemistDetails = chemist;
    }

    /* =====================================================
       7️⃣ FETCH PRICE HISTORY
    ===================================================== */
    const { data: priceHistory } = await supabase
      .from("medicine_order_price_history")
      .select(`
        id,
        total_amount,
        note,
        created_at,
        qr_url,
        qr_payload
      `)
      .eq("order_id", order_id)
      .order("created_at", { ascending: false });

    /* =====================================================
       8️⃣ FINAL SHAPED RESPONSE
    ===================================================== */
    const response = {
      id: order.id,
      unid: order.unid,
      status: order.status,
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
      created_at: order.created_at,
      updated_at: order.updated_at,
      chemist_notes: order.chemist_notes,
      prescription_id: order.prescription_id,
      patient_id: order.patient_id,
      chemist_id: order.chemist_id,
      delivery_type: order.delivery_type,
      patient_notes: order.patient_notes,
      
      medicine_order_items: order.medicine_order_items || [],
      
      patient: {
        id: patientWithDetails?.id || order.patient_id,
        phone_number: isPaymentVerified
          ? patientWithDetails?.phone_number
          : maskPhone(patientWithDetails?.phone_number),
        patient_details: patientWithDetails?.patient_details ? {
          full_name: patientWithDetails.patient_details.full_name,
          gender: patientWithDetails.patient_details.gender,
          date_of_birth: patientWithDetails.patient_details.date_of_birth,
          address: isPaymentVerified
            ? patientWithDetails.patient_details.address
            : maskAddress(patientWithDetails.patient_details.address),
          email: isPaymentVerified ? patientWithDetails.patient_details.email : null,
        } : null
      },
      
      prescription: prescriptionFormatted,
      
      chemist: chemistDetails,
      
      payment: {
        requested: !!order.payment_requested_at,
        payment_qr_url: order.payment_qr_url,
        payment_qr_payload: order.payment_qr_payload,
        requested_at: order.payment_requested_at,
        proofs: payments || [],
        price_history: priceHistory || []
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
            invoice_data: invoice.invoice_data
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