import { NextResponse } from 'next/server';

export async function GET() {
  const checks = {
    anthropic_key_set: !!process.env.ANTHROPIC_API_KEY,
    anthropic_key_prefix: process.env.ANTHROPIC_API_KEY?.substring(0, 7) ?? 'missing',
    supabase_url_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_key_set: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    parent_pin_set: !!process.env.PARENT_PIN,
    node_env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(checks);
}
