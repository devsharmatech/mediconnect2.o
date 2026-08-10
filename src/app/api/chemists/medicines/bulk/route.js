import { supabase } from "@/lib/supabaseAdmin";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const chemist_id = body.chemist_id;
    const medicines = body.medicines;

    if (!chemist_id) return failure("chemist_id is required");
    if (!Array.isArray(medicines) || medicines.length === 0) {
      return failure("A non-empty medicines array is required");
    }

    // Map and validate each medicine
    const insertPayload = [];
    const errors = [];

    medicines.forEach((med, index) => {
      const name = med.name?.trim();
      if (!name) {
        errors.push(`Row ${index + 1}: Medicine Name is required.`);
        return;
      }

      insertPayload.push({
        chemist_id,
        name,
        brand: med.brand?.trim() || null,
        category: med.category?.trim() || null,
        strength: med.strength?.trim() || null,
        type: med.type?.trim() || null,
        description: med.description?.trim() || null,
      });
    });

    if (errors.length > 0) {
      return failure("Validation failed", errors.join(" "));
    }

    // Perform bulk insert
    const { data, error } = await supabase
      .from("chemist_medicines")
      .insert(insertPayload)
      .select();

    if (error) throw error;

    return success("Bulk medicines uploaded successfully", { count: data.length });
  } catch (err) {
    return failure("Failed to upload bulk medicines", err.message);
  }
}
