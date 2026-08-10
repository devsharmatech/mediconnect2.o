import { corsHeaders } from "@/lib/cors";

export const success = (message, data = null, status = 200, nextAction = "CONTINUE") => {
  const payload = data || {};
  const execution_id = payload.execution_id || null;
  const state_version = payload.state_version || null;
  const event_sequence = payload.event_sequence || null;
  const actualData = (payload.execution_id || payload.state_version) ? (payload.data || {}) : payload;

  return new Response(
    JSON.stringify({
      success: true, // Preserved for backward compatibility
      status: status === 202 ? "WAITING" : "SUCCESS",
      message,
      next_action: nextAction,
      execution_id,
      state_version,
      event_sequence,
      data: actualData,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders(),
      },
    }
  );
};

export const waiting = (message, data = null, status = 202, nextAction = "POLL_OR_WAIT") => {
  const payload = data || {};
  const execution_id = payload.execution_id || null;
  const state_version = payload.state_version || null;
  const event_sequence = payload.event_sequence || null;
  const actualData = (payload.execution_id || payload.state_version) ? (payload.data || {}) : payload;

  return new Response(
    JSON.stringify({
      success: true,
      status: "WAITING",
      message,
      next_action: nextAction,
      execution_id,
      state_version,
      event_sequence,
      data: actualData,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders(),
      },
    }
  );
};

export const failure = (message, error = null, status = 400, nextAction = "RETRY_OR_ABORT") => {
  const payload = error || {};
  const execution_id = payload.execution_id || null;

  return new Response(
    JSON.stringify({
      success: false, // Preserved for backward compatibility
      status: "FAILURE",
      message,
      next_action: nextAction,
      execution_id,
      error: error && error.message ? error.message : error,
      data: error ? { error } : {},
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders(),
      },
    }
  );
};
