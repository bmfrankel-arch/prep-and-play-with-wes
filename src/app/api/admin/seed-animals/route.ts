import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SEED_ANIMALS = [
  {
    animal_id: 'polar_bear',
    rarity: 'legendary',
    quiz_score_when_unlocked: 10,
    quiz_type_when_unlocked: 'manual_credit',
  },
  {
    animal_id: 'red_panda',
    rarity: 'rare',
    quiz_score_when_unlocked: 7,
    quiz_type_when_unlocked: 'manual_credit',
  },
  {
    animal_id: 'saltwater_crocodile',
    rarity: 'legendary',
    quiz_score_when_unlocked: 10,
    quiz_type_when_unlocked: 'manual_credit',
  },
  {
    animal_id: 'giant_panda',
    rarity: 'common',
    quiz_score_when_unlocked: 5,
    quiz_type_when_unlocked: 'manual_credit',
  },
];

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabase = createClient(url, key);
  const inserted: string[] = [];
  const already_existed: string[] = [];
  const errors: string[] = [];

  for (const animal of SEED_ANIMALS) {
    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from('animal_collection')
        .select('id')
        .eq('animal_id', animal.animal_id)
        .maybeSingle();

      if (existing) {
        console.log(`Animal already exists: ${animal.animal_id}`);
        already_existed.push(animal.animal_id);
        continue;
      }

      // Insert
      const { error } = await supabase
        .from('animal_collection')
        .insert({
          ...animal,
          unlocked_at: new Date().toISOString(),
        });

      if (error) {
        console.error(`Failed to insert ${animal.animal_id}:`, error.message);
        errors.push(`${animal.animal_id}: ${error.message}`);
      } else {
        console.log(`Inserted animal: ${animal.animal_id}`);
        inserted.push(animal.animal_id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Error seeding ${animal.animal_id}:`, msg);
      errors.push(`${animal.animal_id}: ${msg}`);
    }
  }

  return NextResponse.json({ inserted, already_existed, errors });
}

// Also allow GET for convenience
export async function GET() {
  return POST();
}
