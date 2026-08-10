/**
 * API: Doctor Favorites (PDF Part 5-6)
 * 
 * GET  /api/doctors/favorites?doctor_id=xxx — Get favorite medicines
 * POST /api/doctors/favorites — Add/update a favorite
 * 
 * Shows doctor's most-used medicines as 1-tap chips in consultation UI.
 */

import { success, failure } from "@/lib/response";
import { supabase } from "@/lib/supabaseAdmin";

/**
 * GET — Get doctor's favorite medicines (top 10 by usage_count)
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const doctor_id = searchParams.get("doctor_id");

        if (!doctor_id) return failure("doctor_id is required");

        const { data: favorites, error } = await supabase
            .from("doctor_favorites")
            .select("*")
            .eq("doctor_id", doctor_id)
            .order("usage_count", { ascending: false })
            .limit(10);

        if (error) throw error;

        return success("Doctor favorites retrieved", {
            favorites: favorites || [],
            count: favorites?.length || 0,
        });

    } catch (err) {
        console.error("GET /api/doctors/favorites error:", err);
        return failure("Internal server error", err.message, 500);
    }
}

/**
 * POST — Add or increment a favorite medicine
 * Body: { doctor_id, medicine_name }
 */
export async function POST(req) {
    try {
        const body = await req.json();
        const { doctor_id, medicine_name } = body;

        if (!doctor_id || !medicine_name) {
            return failure("doctor_id and medicine_name are required");
        }

        // Check if already exists
        const { data: existing } = await supabase
            .from("doctor_favorites")
            .select("*")
            .eq("doctor_id", doctor_id)
            .ilike("medicine_name", medicine_name)
            .single();

        if (existing) {
            // Increment usage count
            const { data, error } = await supabase
                .from("doctor_favorites")
                .update({ usage_count: (existing.usage_count || 0) + 1 })
                .eq("id", existing.id)
                .select()
                .single();

            if (error) throw error;
            return success("Favorite updated", data);
        } else {
            // Insert new favorite
            const { data, error } = await supabase
                .from("doctor_favorites")
                .insert({
                    doctor_id,
                    medicine_name,
                    usage_count: 1,
                })
                .select()
                .single();

            if (error) throw error;
            return success("Favorite added", data);
        }

    } catch (err) {
        console.error("POST /api/doctors/favorites error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
