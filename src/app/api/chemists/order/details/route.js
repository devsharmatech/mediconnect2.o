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
        delivery_charge,
        payment_qr_url,
        payment_qr_payload,
        payment_requested_at,
        created_at,
        updated_at,
        chemist_notes,
        prescription_id,
        patient_id,
        chemist_id,
        delivery_type,
        patient_notes,

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
       5️⃣ TRANSFORM PRESCRIPTION DATA FOR HTML TEMPLATE
    ===================================================== */
    let prescriptionFormatted = null;
    if (order.prescription) {
      // Parse JSON strings if needed
      let medicines = [];
      let lab_tests = [];
      let investigations = [];
      let ai_analysis = null;

      try {
        medicines = typeof order.prescription.medicines === 'string' 
          ? JSON.parse(order.prescription.medicines) 
          : order.prescription.medicines || [];
      } catch (e) {
        console.error("Error parsing medicines:", e);
        medicines = [];
      }

      try {
        lab_tests = typeof order.prescription.lab_tests === 'string'
          ? JSON.parse(order.prescription.lab_tests)
          : order.prescription.lab_tests || [];
      } catch (e) {
        console.error("Error parsing lab_tests:", e);
        lab_tests = [];
      }

      try {
        investigations = typeof order.prescription.investigations === 'string'
          ? JSON.parse(order.prescription.investigations)
          : order.prescription.investigations || [];
      } catch (e) {
        console.error("Error parsing investigations:", e);
        investigations = [];
      }

      try {
        ai_analysis = typeof order.prescription.ai_analysis === 'string'
          ? JSON.parse(order.prescription.ai_analysis)
          : order.prescription.ai_analysis;
      } catch (e) {
        console.error("Error parsing ai_analysis:", e);
        ai_analysis = null;
      }

      prescriptionFormatted = {
        id: order.prescription.id,
        pid: order.prescription.pid || order.prescription.id?.slice(0, 8) || 'N/A',
        created_at: order.prescription.created_at,
        updated_at: order.prescription.updated_at,
        medicines: medicines,
        lab_tests: lab_tests,
        investigations: investigations,
        special_message: order.prescription.special_message,
        ai_analysis: ai_analysis,
        signed_at: order.prescription.signed_at,
        vital_signs: order.prescription.vital_signs,
        follow_up: order.prescription.follow_up,
        diagnosis: order.prescription.diagnosis,
        
        // Doctor details - flatten for template
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
        
        // Patient details
        patient_details: patientWithDetails?.patient_details ? {
          full_name: patientWithDetails.patient_details.full_name,
          gender: patientWithDetails.patient_details.gender,
          date_of_birth: patientWithDetails.patient_details.date_of_birth,
          address: patientWithDetails.patient_details.address,
          email: patientWithDetails.patient_details.email,
          blood_group: patientWithDetails.patient_details.blood_group
        } : null,
        
        // Appointment details
        appointments: order.prescription.appointment ? {
          id: order.prescription.appointment.id,
          appointment_date: order.prescription.appointment.appointment_date,
          appointment_time: order.prescription.appointment.appointment_time,
          status: order.prescription.appointment.status,
          disease_info: order.prescription.appointment.disease_info,
          created_at: order.prescription.appointment.created_at
        } : null
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
      delivery_charge: order.delivery_charge,
      payment_qr_url: order.payment_qr_url,
      payment_qr_payload: order.payment_qr_payload,
      payment_requested_at: order.payment_requested_at,
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
        phone_number: patientWithDetails?.phone_number,
        patient_details: patientWithDetails?.patient_details
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