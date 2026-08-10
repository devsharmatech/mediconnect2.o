"use client";

import { useEffect } from "react";

/**
 * SessionStateTracker: Real-time user session status synchronization.
 * Updates the user's active page/screen state in user_session_state.
 */
export default function SessionStateTracker({
  userId,
  careEpisodeId = null,
  consultationId = null,
  currentScreen,
  channel = "WEB"
}) {
  useEffect(() => {
    if (!userId || !currentScreen) return;

    const syncSession = async () => {
      try {
        await fetch("/api/session/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            care_episode_id: careEpisodeId,
            consultation_id: consultationId,
            current_screen: currentScreen,
            channel
          })
        });
      } catch (err) {
        console.error("SessionStateTracker synchronization failed:", err);
      }
    };

    // Trigger initial sync
    syncSession();

    // Set heartbeat interval (every 30 seconds) to maintain active session
    const intervalId = setInterval(syncSession, 30000);

    return () => clearInterval(intervalId);
  }, [userId, careEpisodeId, consultationId, currentScreen, channel]);

  return null;
}
