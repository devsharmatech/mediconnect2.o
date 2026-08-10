import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');

    if (!user_id) {
      return failure("Missing user_id", null, 400);
    }

    const { data: dbOrders, error } = await supabase
      .from('medicine_orders')
      .select('*')
      .eq('patient_id', user_id)
      .order('created_at', { ascending: false });
      
    if (error) throw error;

    const formattedOrders = (dbOrders || []).map(o => ({
      id: o.id,
      date: new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: o.status || 'Pending',
      items: 'Medicine Order',
      price: `₹${o.total_amount || 0}`,
      itemCount: 1
    }));

    return success("Orders fetched successfully", formattedOrders, 200);
  } catch (error) {
    console.error("Pharmacy Orders Fetch Error:", error);
    return failure("Internal Server Error", error.message, 500);
  }
}
