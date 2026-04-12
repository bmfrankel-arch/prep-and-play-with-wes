import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();
    const correctPin = process.env.PARENT_PIN;

    if (!correctPin) {
      console.warn('WARNING: PARENT_PIN not set. Using default 1234.');
    }

    const expected = (correctPin || '1234').toString().trim();
    const entered = (pin || '').toString().trim();
    const isCorrect = entered === expected;

    return NextResponse.json({ valid: isCorrect });
  } catch {
    return NextResponse.json({ valid: false, error: 'Invalid request' }, { status: 400 });
  }
}
