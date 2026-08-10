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

    // Transform patient data structure for easier access
    const transformedData = data.map(order => ({
      ...order,
      patient: order.patient ? {
        ...order.patient,
        // Flatten patient_details if it exists
        ...(order.patient.patient_details && order.patient.patient_details.length > 0 
          ? order.patient.patient_details[0] 
          : {})
      } : null
    }));

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