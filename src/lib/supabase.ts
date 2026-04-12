import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Lazy-init: only create the client when Supabase is actually configured
let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

// For backwards compatibility — returns a client or throws if not configured
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase();
    if (!client) {
      // Return a no-op for unconfigured Supabase so build doesn't crash
      return () => ({ data: null, error: { message: 'Supabase not configured' } });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (client as any)[prop];
  },
});

export function isSupabaseConfigured(): boolean {
  return supabaseUrl.length > 0 && supabaseAnonKey.length > 0;
}
