import { createClient } from '@supabase/supabase-js'
import OpenAI from "openai";
import sql from './db.js';
import { SupabasePostgresQueryBuilder, SupabasePostgresRpcBuilder } from './supabaseCompatibility.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Guard: prevent crash when Supabase env vars are missing in production.
// from() and rpc() route to AWS RDS — realSupabase is only used for storage.
let realSupabase = null;
if (supabaseUrl && supabaseServiceRoleKey) {
  try {
    realSupabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  } catch (e) {
    console.warn('[supabaseAdmin] Supabase client init failed (storage unavailable):', e.message);
  }
}

export const supabase = {
  get storage() {
    if (!realSupabase) {
      throw new Error('[supabaseAdmin] Supabase Storage unavailable: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured. Use AWS S3 instead.');
    }
    return realSupabase.storage;
  },
  from(tableName) {
    return new SupabasePostgresQueryBuilder(tableName, sql);
  },
  rpc(funcName, params) {
    return new SupabasePostgresRpcBuilder(funcName, params, sql);
  }
};

export { sql };

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
