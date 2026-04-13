'use client';

import { GameQuestion } from './types';

// Session-level cache shared with GameShell
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _w = typeof window !== 'undefined' ? (window as any) : {};
if (!_w.__ppw_cache) _w.__ppw_cache = {};

export function setCached(skill: string, sub: string, level: number, questions: GameQuestion[]): void {
  _w.__ppw_cache[`${skill}_${sub}_${level}`] = questions;
}

export function getCached(skill: string, sub: string, level: number): GameQuestion[] | null {
  return _w.__ppw_cache[`${skill}_${sub}_${level}`] || null;
}

export async function prefetchQuestions(skill: string, sub: string, level: number, count: number = 5): Promise<void> {
  const key = `${skill}_${sub}_${level}`;
  if (_w.__ppw_cache[key]?.length) return; // Already cached

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillArea: skill, subGame: sub, level, count }),
    });
    const data = await res.json();
    if (data.questions?.length) {
      _w.__ppw_cache[key] = data.questions;
    }
  } catch {
    // Prefetch failure is not critical
  }
}
