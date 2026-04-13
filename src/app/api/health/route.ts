import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const checks: Record<string, unknown> = {
    anthropic_key_set: !!process.env.ANTHROPIC_API_KEY,
    anthropic_key_prefix: process.env.ANTHROPIC_API_KEY?.substring(0, 7) ?? 'missing',
    supabase_url_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_key_set: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    parent_pin_set: !!process.env.PARENT_PIN,
    node_env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  };

  // Check Supabase table accessibility
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const supabase = createClient(url, key);
    try {
      const { error } = await supabase.from('animal_collection').select('id').limit(1);
      checks.animal_collection_accessible = !error;
      checks.animal_collection_error = error?.message ?? null;
    } catch (e) {
      checks.animal_collection_accessible = false;
      checks.animal_collection_error = e instanceof Error ? e.message : 'Unknown';
    }
  } else {
    checks.animal_collection_accessible = false;
    checks.animal_collection_error = 'Supabase not configured';
  }

  return NextResponse.json(checks);
}
