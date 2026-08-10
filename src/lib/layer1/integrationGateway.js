/**
 * LAYER-1: Integration Gateway
 * 
 * Central proxy for ALL external API calls.
 * No module may call external APIs directly.
 * 
 * Logs: request, response, errors, retry attempts.
 * 
 * Supported integrations:
 * - ABDM (Ayushman Bharat Digital Mission)
 * - Lab APIs
 * - SMS gateway
 * - Payment gateway (Razorpay)
 * - Future: insurance, ambulance
 */

import { supabase } from "@/lib/supabaseAdmin";

/**
 * Execute an external API call through the gateway
 * @param {string} service_name - abdm | lab | sms | payment | insurance | ambulance
 * @param {object} payload
 * @param {string} payload.url - target URL
 * @param {string} payload.method - GET | POST | PUT | PATCH | DELETE
 * @param {object} [payload.headers] - request headers
 * @param {object} [payload.body] - request body
 * @param {number} [payload.timeout] - timeout in ms (default 10000)
 * @param {number} [payload.retries] - number of retries (default 0)
 * @returns {object} { success, data, status, error }
 */
export async function execute(service_name, payload) {
    const startTime = Date.now();
    let attempt = 0;
    const maxRetries = payload.retries || 0;
    let lastError = null;

    while (attempt <= maxRetries) {
        attempt++;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), payload.timeout || 10000);

            const response = await fetch(payload.url, {
                method: payload.method || "GET",
                headers: {
                    "Content-Type": "application/json",
                    ...(payload.headers || {}),
                },
                body: payload.body ? JSON.stringify(payload.body) : undefined,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const data = await response.json().catch(() => null);
            const duration = Date.now() - startTime;

            // Log successful call
            await logGatewayCall({
                service_name,
                url: payload.url,
                method: payload.method || "GET",
                request_body: payload.body,
                response_status: response.status,
                response_body: data,
                duration_ms: duration,
                attempt,
                success: response.ok,
            });

            if (!response.ok) {
                lastError = `HTTP ${response.status}: ${JSON.stringify(data)}`;
                if (attempt <= maxRetries) continue; // retry
                return { success: false, status: response.status, data, error: lastError };
            }

            return { success: true, status: response.status, data };
        } catch (err) {
            const duration = Date.now() - startTime;
            lastError = err.message;

            // Log failed call
            await logGatewayCall({
                service_name,
                url: payload.url,
                method: payload.method || "GET",
                request_body: payload.body,
                response_status: null,
                response_body: null,
                duration_ms: duration,
                attempt,
                success: false,
                error: err.message,
            });

            if (attempt <= maxRetries) continue; // retry
        }
    }

    return { success: false, error: lastError || "Unknown gateway error" };
}

/**
 * Log a gateway call to the activity_log for observability
 */
async function logGatewayCall({
    service_name,
    url,
    method,
    request_body,
    response_status,
    response_body,
    duration_ms,
    attempt,
    success,
    error = null,
}) {
    try {
        await supabase
            .from("activity_log")
            .insert({
                module_type: "integration",
                action_type: success ? "api_success" : "api_error",
                description: `${method} ${service_name}: ${url} [${response_status || "ERR"}] ${duration_ms}ms (attempt ${attempt})`,
                metadata: {
                    service_name,
                    url,
                    method,
                    request_summary: request_body ? Object.keys(request_body) : null,
                    response_status,
                    response_preview: response_body
                        ? JSON.stringify(response_body).substring(0, 500)
                        : null,
                    duration_ms,
                    attempt,
                    error,
                },
            });
    } catch (logErr) {
        console.error("Gateway log error:", logErr);
    }
}
