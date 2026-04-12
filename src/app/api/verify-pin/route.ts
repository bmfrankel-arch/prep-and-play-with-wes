import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  const correctPin = process.env.PARENT_PIN || '1234';
  return NextResponse.json({ valid: pin === correctPin });
}
