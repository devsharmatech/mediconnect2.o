import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const { chemist_id, page = 1, pageSize = 10, search = "", status = "" } = await req.json();

    if (!chemist_id) {
      return failure("chemist_id required", null, 400, {
        headers: corsHeaders,
      });
    }

    // Calculate offset for pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Try this query structure - adjust table names based on your actual schema
    let query = supabase
      .from("medicine_orders")
      .select(
        `
        *,
        medicine_order_items(*),
        patient:patient_id (
          *,
          patient_details(*)
        ),
        prescription:prescription_id(*)
      `,
        { count: 'exact' }
      )
      .eq("chemist_id", chemist_id)
      .order("created_at", { ascending: false });

    // Apply search filter if provided
    if (search) {
      query = query.or(`unid.ilike.%${search}%`);
    }

    // Apply status filter if provided
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    // Execute the query
    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error("Supabase query error:", error);
      throw error;
    }

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

    // Transform patient data structure with DPDP compliance & address gating
    const transformedData = data.map(order => {
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

      const rawDetails = order.patient?.patient_details && order.patient.patient_details.length > 0 
        ? order.patient.patient_details[0] 
        : (order.patient?.patient_details || {});

      const sanitizedPatient = order.patient ? {
        ...order.patient,
        ...rawDetails,
        phone_number: isPaymentVerified ? order.patient.phone_number : maskPhone(order.patient.phone_number),
        address: isPaymentVerified ? rawDetails.address : maskAddress(rawDetails.address),
        email: isPaymentVerified ? rawDetails.email : null,
        blood_group: null // Redacted per DPDP minimum disclosure
      } : null;

      // Redact clinical diagnosis, lab tests, vitals, AI notes from prescription object
      const sanitizedPrescription = order.prescription ? {
        id: order.prescription.id,
        doctor_id: order.prescription.doctor_id,
        created_at: order.prescription.created_at,
        signed_at: order.prescription.signed_at,
        medicines: order.prescription.medicines,
        lab_tests: [],
        investigations: [],
        vital_signs: null,
        diagnosis: null,
        ai_analysis: null
      } : null;

      return {
        ...order,
        sla_status: order.sla_status || "ON_TRACK",
        patient: sanitizedPatient,
        prescription: sanitizedPrescription
      };
    });

    // Calculate pagination metadata
    const totalItems = count;
    const totalPages = Math.ceil(totalItems / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const responseData = {
      orders: transformedData,
      pagination: {
        currentPage: page,
        pageSize: pageSize,
        totalItems: totalItems,
        totalPages: totalPages,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
      }
    };

    return success("Chemist orders fetched successfully", responseData, 200, {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Error in fetching orders:", err);
    return failure("Error fetching orders", err.message, 500, {
      headers: corsHeaders,
    });
  }
}