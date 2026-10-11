/**
 * LAYER-111: Idempotency Service (AWS RDS PostgreSQL)
 * 
 * Ensures exactly-once execution of critical write operations via AWS RDS PostgreSQL functions.
 * 100% Direct AWS RDS PostgreSQL.
 */

import sql from "@/lib/db";

/**
 * Ensures exactly-once execution of critical write operations.
 */
export async function acquireIdempotencyLock(idempotencyKey, apiPath, careEpisodeId = null) {
  if (!idempotencyKey) {
    return { error: "idempotency_key is required" };
  }

  try {
    const rows = await sql`
      SELECT * FROM acquire_idempotency_lock(
        ${idempotencyKey},
        ${apiPath},
        ${careEpisodeId}
      )
    `;

    const row = rows[0];
    if (!row) {
      return { error: "Failed to acquire lock. No response from database." };
    }

    // is_new = false means duplicate
    if (!row.is_new) {
      if (row.status === "PROCESSING") {
        return { isLocked: true, isDuplicate: true, error: "Concurrent request processing." };
      }
      return {
        isLocked: false,
        isDuplicate: true,
        responseBody: row.response_body,
        responseStatus: row.response_status
      };
    }

    return { isLocked: true, isDuplicate: false };

  } catch (err) {
    console.error("[idempotencyService] acquireIdempotencyLock error:", err);
    return { error: err.message };
  }
}

/**
 * Releases the lock and stores the final response payload.
 */
export async function releaseIdempotencyLock(idempotencyKey, responseBody, responseStatus = 200, status = "COMPLETED") {
  try {
    await sql`
      SELECT * FROM release_idempotency_lock(
        ${idempotencyKey},
        ${JSON.stringify(responseBody)}::jsonb,
        ${responseStatus},
        ${status}
      )
    `;
  } catch (err) {
    console.error("[idempotencyService] releaseIdempotencyLock failed:", err.message);
  }
}
