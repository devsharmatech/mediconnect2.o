/**
 * LAYER-111: Persistent Event Emitter Backbone
 * 
 * Replaces pure in-process RAM listener arrays with a durable database-backed
 * event outbox insertion adapter. Enforces robust orchestration guarantees across
 * serverless instance reloads.
 */

import { insertOutboxEvent } from "./eventOutbox";

const listeners = new Map();

/**
 * Subscribe to an event locally
 * @param {string} event_name
 * @param {Function} callback - receives (payload) 
 * @returns {Function} unsubscribe function
 */
export function on(event_name, callback) {
    if (!listeners.has(event_name)) {
        listeners.set(event_name, []);
    }
    listeners.get(event_name).push(callback);

    return () => {
        const cbs = listeners.get(event_name) || [];
        const idx = cbs.indexOf(callback);
        if (idx >= 0) cbs.splice(idx, 1);
    };
}

/**
 * Emit an event synchronously locally AND durably via the event outbox schema.
 * @param {string} event_name
 * @param {object} payload
 */
export function emit(event_name, payload = {}) {
    // 1. Trigger local subscribers if configured
    const cbs = listeners.get(event_name) || [];
    for (const cb of cbs) {
        try {
            Promise.resolve(cb(payload)).catch((err) => {
                console.error(`[EventEmitter] Error in ${event_name} listener:`, err);
            });
        } catch (err) {
            console.error(`[EventEmitter] Sync error in ${event_name} listener:`, err);
        }
    }

    // 2. Persist to Layer-111 Outbox durably if context exists
    if (payload.consultation_id && payload.care_episode_id) {
        insertOutboxEvent({
            event_type: event_name,
            consultation_id: payload.consultation_id,
            care_episode_id: payload.care_episode_id,
            consultation_type: payload.consultation_mode || "STANDARD_EMIT",
            payload
        }).catch(err => {
            console.error(`[EventEmitter Backbone] Failed outbox bridging record for ${event_name}:`, err.message);
        });
    } else {
        if (process.env.NODE_ENV === "development") {
            console.log(`[EventEmitter] Local-only event broadcasted without required episode IDs: ${event_name}`);
        }
    }
}

export function removeAllListeners() {
    listeners.clear();
}

export function getRegisteredEvents() {
    return Array.from(listeners.keys());
}
