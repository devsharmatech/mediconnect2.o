/**
 * API: Doctor Favorites (PDF Part 5-6)
 * 
 * GET  /api/doctors/favorites?doctor_id=xxx — Get favorite medicines
 * POST /api/doctors/favorites — Add/update a favorite
 * 
 * Shows doctor's most-used medicines as 1-tap chips in consultation UI.
 */

import { success, failure } from "@/lib/response";
import sql from "@/lib/db";

const safeUuid = (val) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val) ? val : null);

/**
 * GET — Get doctor's favorite medicines (top 10 by usage_count)
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const doctor_id = searchParams.get("doctor_id");
        const cleanDocId = safeUuid(doctor_id);

        if (!cleanDocId) {
            return failure("Valid doctor_id is required", null, 400);
        }

        const favorites = await sql`
            SELECT *
            FROM doctor_favorites
            WHERE doctor_id = ${cleanDocId}
            ORDER BY usage_count DESC
            LIMIT 10
        `;

        if (favorites.length > 0) {
            return success("Doctor favorites retrieved", {
                favorites,
                count: favorites.length,
            });
        }

        // Helpful fallback: if doctor has no custom favorites yet, suggest top common clinical medicines
        const defaultMeds = await sql`
            SELECT generic_name as medicine_name, 1 as usage_count
            FROM cr_medicine_master
            WHERE active_status = 'true'
            LIMIT 8
        `;

        return success("Doctor favorites retrieved", {
            favorites: defaultMeds,
            count: defaultMeds.length,
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
        const cleanDocId = safeUuid(doctor_id);

        if (!cleanDocId || !medicine_name) {
            return failure("Valid doctor_id and medicine_name are required", null, 400);
        }

        const trimmedName = medicine_name.trim();

        // Check if already exists in RDS
        const existing = await sql`
            SELECT *
            FROM doctor_favorites
            WHERE doctor_id = ${cleanDocId}
              AND LOWER(medicine_name) = ${trimmedName.toLowerCase()}
            LIMIT 1
        `;

        if (existing.length > 0) {
            const updated = await sql`
                UPDATE doctor_favorites
                SET usage_count = COALESCE(usage_count, 0) + 1,
                    updated_at = NOW()
                WHERE id = ${existing[0].id}
                RETURNING *
            `;
            return success("Favorite updated", updated[0]);
        } else {
            const inserted = await sql`
                INSERT INTO doctor_favorites (doctor_id, medicine_name, usage_count, created_at, updated_at)
                VALUES (${cleanDocId}, ${trimmedName}, 1, NOW(), NOW())
                RETURNING *
            `;
            return success("Favorite added", inserted[0]);
        }

    } catch (err) {
        console.error("POST /api/doctors/favorites error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
