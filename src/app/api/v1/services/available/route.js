import { success } from "@/lib/response";

/**
 * GET /api/v1/services/available
 * Unified Service Entry Point
 * All UI services must originate from this endpoint's response.
 */
export async function GET() {
    return success("Available services fetched", {
        services: [
            "consultation",
            "lab",
            "pharmacy",
            "home_visit"
        ]
    });
}
