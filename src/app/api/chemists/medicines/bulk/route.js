import sql from "@/lib/db";
import { success, failure } from "@/lib/response";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return new Response("OK", { headers: corsHeaders });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req) {
  try {
    const body = await req.json();
    const chemist_id = body.chemist_id;
    const medicines = body.medicines;

    if (!chemist_id || !UUID_REGEX.test(chemist_id)) {
      return failure("Valid chemist_id is required", null, 400, { headers: corsHeaders });
    }
    if (!Array.isArray(medicines) || medicines.length === 0) {
      return failure("A non-empty medicines array is required", null, 400, { headers: corsHeaders });
    }

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
      return failure("Validation failed", errors.join(" "), 400, { headers: corsHeaders });
    }

    const inserted = await sql`
      INSERT INTO chemist_medicines ${sql(insertPayload, 'chemist_id', 'name', 'brand', 'category', 'strength', 'type', 'description')}
      RETURNING id
    `;

    return success("Bulk medicines uploaded successfully", { count: inserted.length }, 200, { headers: corsHeaders });
  } catch (err) {
    console.error("Bulk medicines error:", err);
    return failure("Failed to upload bulk medicines", err.message, 500, { headers: corsHeaders });
  }
}
