import { EventEmitter } from 'events';

const globalForEmitter = globalThis;

if (!globalForEmitter.__broadcastEmitter) {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(1000); // Allow high concurrent real-time connections
  globalForEmitter.__broadcastEmitter = emitter;
}

export const broadcastEmitter = globalForEmitter.__broadcastEmitter;
export default broadcastEmitter;
