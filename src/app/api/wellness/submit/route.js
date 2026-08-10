import { success, failure } from "@/lib/response";
import { submitWellnessData } from "@/lib/layer1/wellnessService";

/**
 * POST /api/wellness/submit
 * Submits wellness data (manual or device)
 */
export async function POST(req) {
    try {
        const body = await req.json();
        
        const result = await submitWellnessData(body);

        if (!result.success) {
            return failure(result.error, null, 400);
        }

        return success("Wellness data accepted for processing", {
            log_id: result.data.log_id,
            status: "SUCCESS",
            next_action: "DISPLAY_TRENDS"
        });

    } catch (err) {
        console.error("POST /api/wellness/submit error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
