import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req) {
  try {
    const { data: docs } = await supabase.from('doctor_details').select('specialization');
    const uniqueSpecs = [...new Set(docs?.map(d => d.specialization).filter(Boolean))].slice(0, 8);
    
    // We mock lab tests if lab_tests table doesn't exist yet, else query it.
    let popular_tests = [];
    const { data: labTests, error } = await supabase.from('lab_tests').select('*').limit(3);
    if (!error && labTests?.length > 0) {
      popular_tests = labTests;
    } else {
      popular_tests = [{ name: "Full Body Health Checkup", price: 1499, original_price: 2999 }];
    }

    const { count: doctorsCount } = await supabase
      .from('doctor_details')
      .select('id', { count: 'exact', head: true })
      .eq('onboarding_status', 'approved');

    return success("Search metadata fetched", { 
      specialties: uniqueSpecs, 
      popular_tests,
      online_doctors_count: doctorsCount || 0
    }, 200);
  } catch (error) {
    console.error("Search Metadata API Error:", error);
    return failure("Internal Server Error", error.message, 500);
  }
}
