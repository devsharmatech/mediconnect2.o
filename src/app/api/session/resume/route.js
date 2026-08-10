import { success, failure } from "@/lib/response";
import { getActiveSession, updateSessionState } from "@/lib/layer1/userSessionService";

/**
 * GET /api/session/resume
 * Retrieves active session for a user.
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const user_id = searchParams.get("user_id");

        if (!user_id) {
            return failure("user_id is required", null, 400);
        }

        const result = await getActiveSession(user_id);

        if (!result.success || !result.data) {
            return success("No active session", {
                has_active_session: false,
                next_action: "HOME"
            });
        }

        const session = result.data;
        return success("Active session found", {
            has_active_session: true,
            session_id: session.id,
            care_episode_id: session.care_episode_id,
            consultation_id: session.consultation_id,
            last_screen: session.last_screen,
            next_action: "RESUME_SESSION"
        });

    } catch (err) {
        console.error("GET /api/session/resume error:", err);
        return failure("Internal server error", err.message, 500);
    }
}

/**
 * POST /api/session/resume
 * Updates the active session state
 */
export async function POST(req) {
    try {
        const body = await req.json();
        const { user_id, care_episode_id, consultation_id, current_screen } = body;

        if (!user_id || !current_screen) {
            return failure("user_id and current_screen are required", null, 400);
        }

        const result = await updateSessionState({
            user_id,
            care_episode_id,
            consultation_id,
            last_screen: current_screen
        });

        if (!result.success) {
            throw new Error(result.error);
        }

        return success("Session state updated", { 
            session_id: result.data.id,
            status: "SUCCESS",
            next_action: "NONE"
        });

    } catch (err) {
        console.error("POST /api/session/resume error:", err);
        return failure("Internal server error", err.message, 500);
    }
}
