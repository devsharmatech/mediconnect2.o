import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Guard: prevent "Invalid supabaseUrl" crash when env vars are missing in production.
// The server-side path uses DeferredQueryBuilder → AWS RDS, so realSupabase is
// only needed for browser-side queries (while Supabase project is still active).
let realSupabase = null;
if (supabaseUrl && supabaseAnonKey) {
  try {
    realSupabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (e) {
    console.warn('[supabaseClient] Supabase client init failed:', e.message);
  }
}

let compatPromise = null;
if (typeof window === 'undefined') {
  compatPromise = import('./supabaseCompatibility.js');
}

class DeferredQueryBuilder {
  constructor(tableName, action = 'select', args = []) {
    this.tableName = tableName;
    this.chain = [{ method: action, args }];
  }
  select(...args) { this.chain.push({ method: 'select', args }); return this; }
  insert(...args) { this.chain.push({ method: 'insert', args }); return this; }
  update(...args) { this.chain.push({ method: 'update', args }); return this; }
  delete(...args) { this.chain.push({ method: 'delete', args }); return this; }
  upsert(...args) { this.chain.push({ method: 'upsert', args }); return this; }
  eq(...args) { this.chain.push({ method: 'eq', args }); return this; }
  neq(...args) { this.chain.push({ method: 'neq', args }); return this; }
  gt(...args) { this.chain.push({ method: 'gt', args }); return this; }
  gte(...args) { this.chain.push({ method: 'gte', args }); return this; }
  lt(...args) { this.chain.push({ method: 'lt', args }); return this; }
  lte(...args) { this.chain.push({ method: 'lte', args }); return this; }
  like(...args) { this.chain.push({ method: 'like', args }); return this; }
  ilike(...args) { this.chain.push({ method: 'ilike', args }); return this; }
  is(...args) { this.chain.push({ method: 'is', args }); return this; }
  in(...args) { this.chain.push({ method: 'in', args }); return this; }
  or(...args) { this.chain.push({ method: 'or', args }); return this; }
  order(...args) { this.chain.push({ method: 'order', args }); return this; }
  limit(...args) { this.chain.push({ method: 'limit', args }); return this; }
  range(...args) { this.chain.push({ method: 'range', args }); return this; }
  single(...args) { this.chain.push({ method: 'single', args }); return this; }
  maybeSingle(...args) { this.chain.push({ method: 'maybeSingle', args }); return this; }
  
  async then(onfulfilled, onrejected) {
    try {
      const compat = await compatPromise;
      let builder = new compat.SupabasePostgresQueryBuilder(this.tableName, compat.sql);
      for (const call of this.chain) {
        builder = builder[call.method](...call.args);
      }
      return builder.execute().then(onfulfilled, onrejected);
    } catch (err) {
      if (onrejected) return onrejected(err);
      throw err;
    }
  }
}

class DeferredRpcBuilder {
  constructor(funcName, params) {
    this.funcName = funcName;
    this.params = params;
    this.chain = [];
  }
  single(...args) { this.chain.push({ method: 'single', args }); return this; }
  maybeSingle(...args) { this.chain.push({ method: 'maybeSingle', args }); return this; }
  
  async then(onfulfilled, onrejected) {
    try {
      const compat = await compatPromise;
      let builder = new compat.SupabasePostgresRpcBuilder(this.funcName, this.params, compat.sql);
      for (const call of this.chain) {
        builder = builder[call.method](...call.args);
      }
      return builder.execute().then(onfulfilled, onrejected);
    } catch (err) {
      if (onrejected) return onrejected(err);
      throw err;
    }
  }
}

export const supabase = {
  get storage() {
    if (!realSupabase) throw new Error('[supabaseClient] Supabase Storage unavailable. Use AWS S3 instead.');
    return realSupabase.storage;
  },
  from(tableName) {
    if (typeof window === 'undefined') {
      return new DeferredQueryBuilder(tableName);
    }
    // Browser-side: route through compatibility layer if realSupabase is unavailable
    if (!realSupabase) {
      return new DeferredQueryBuilder(tableName);
    }
    return realSupabase.from(tableName);
  },
  rpc(funcName, params) {
    if (typeof window === 'undefined') {
      return new DeferredRpcBuilder(funcName, params);
    }
    // Browser-side: route through compatibility layer if realSupabase is unavailable
    if (!realSupabase) {
      return new DeferredRpcBuilder(funcName, params);
    }
    return realSupabase.rpc(funcName, params);
  }
};


