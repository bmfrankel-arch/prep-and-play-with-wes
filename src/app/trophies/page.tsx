'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAnimalCollection,
  getBattles,
  getBattleStats,
  getGameSessions,
  getStories,
  getStreak,
  getTrophies,
  setTrophyAchieved,
} from '@/lib/db';
import {
  AnimalUnlock,
  BattleRecord,
  BattleStats,
  GameSession,
  Story,
  WesTrophy,
} from '@/lib/types';
import {
  DAD_TROPHY_NOTE,
  TROPHIES,
  TROPHY_CATEGORIES,
  TrophyCategory,
  deriveTrophyState,
} from '@/lib/trophies';
import { speak, stopSpeaking } from '@/lib/speech';

interface MergedTrophy {
  def: typeof TROPHIES[number];
  isAchieved: boolean;
  detail?: string;
  achievedAt?: string;
}

export default function TrophiesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [trophies, setTrophies] = useState<MergedTrophy[]>([]);
  const ttsPlayed = useRef(false);

  useEffect(() => {
    (async () => {
      const [collection, battles, stats, sessions, stories, streak, persisted]: [
        AnimalUnlock[], BattleRecord[], BattleStats, GameSession[], Story[], number, WesTrophy[],
      ] = await Promise.all([
        getAnimalCollection(),
        getBattles(200),
        Promise.resolve(getBattleStats()),
        getGameSessions(180),
        getStories(),
        getStreak(),
        getTrophies(),
      ]);

      const derived = deriveTrophyState({
        collection, battles, stats, sessions, stories,
        currentStreak: streak,
        bestStreak: stats.best_streak,
      });

      // Persist any newly-achieved trophies (fire and forget).
      const persistedMap: Record<string, WesTrophy> = {};
      persisted.forEach(t => { persistedMap[t.trophy_id] = t; });
      const merged: MergedTrophy[] = TROPHIES.map(def => {
        const d = derived.state[def.id];
        const p = persistedMap[def.id];
        const isAchieved = !!(d?.isAchieved || p?.is_achieved);
        const detail = d?.detail || p?.achievement_detail || undefined;
        const achievedAt = p?.achieved_at || d?.achievedAt;
        if (isAchieved && !p?.is_achieved) {
          // Newly observed — persist asynchronously.
          setTrophyAchieved(def.id, detail);
        }
        return { def, isAchieved, detail, achievedAt };
      });

      setTrophies(merged);
      setLoading(false);
    })();
  }, []);

  // TTS for Dad's note — once per day max.
  useEffect(() => {
    if (loading || ttsPlayed.current) return;
    ttsPlayed.current = true;
    const today = new Date().toDateString();
    const last = typeof window !== 'undefined' ? localStorage.getItem('ppw_trophy_dad_note_date') : null;
    if (last !== today) {
      if (typeof window !== 'undefined') localStorage.setItem('ppw_trophy_dad_note_date', today);
      setTimeout(() => speak(DAD_TROPHY_NOTE, { rate: 0.8, pitch: 1.0 }), 600);
    }
    return () => stopSpeaking();
  }, [loading]);

  const byCategory = useMemo(() => {
    const groups: Record<TrophyCategory, MergedTrophy[]> = {
      firsts: [], collection: [], battle: [], academic: [], streak: [], special: [],
    };
    trophies.forEach(t => groups[t.def.category].push(t));
    return groups;
  }, [trophies]);

  const earnedCount = trophies.filter(t => t.isAchieved).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-6xl animate-bounce">🏆</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-16">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.push('/')} className="text-gray-400 font-bold text-sm">← Home</button>
          <h1 className="font-retro text-sm text-yellow-400">TROPHY ROOM 🏆</h1>
          <div />
        </div>

        <p className="text-center text-gray-400 text-xs mb-4 italic">Every achievement. Every milestone. All yours.</p>

        <p className="text-center text-yellow-300 text-xs mb-6 font-bold">
          {earnedCount} of {TROPHIES.length} trophies earned
        </p>

        {/* Dad's permanent note */}
        <div
          className="rounded-2xl p-5 mb-6 border-2 border-amber-400 shadow-xl"
          style={{ background: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)' }}
        >
          <p className="font-handwriting text-amber-900 text-2xl mb-2 text-center" style={{ fontWeight: 700 }}>
            A note from Dad
          </p>
          <p className="font-handwriting text-amber-900 text-lg leading-snug text-center" style={{ fontWeight: 500 }}>
            {DAD_TROPHY_NOTE}
          </p>
        </div>

        {/* Trophy groups */}
        {TROPHY_CATEGORIES.map(cat => {
          const items = byCategory[cat.id];
          if (!items || items.length === 0) return null;
          return (
            <div key={cat.id} className="mb-6">
              <p className="text-[11px] font-retro text-yellow-400 mb-2 tracking-wider">{cat.label.toUpperCase()}</p>
              <div className="space-y-2">
                {items.map(t => (
                  <div
                    key={t.def.id}
                    className={`rounded-xl p-3 border flex items-start gap-3 ${
                      t.isAchieved
                        ? t.def.rare
                          ? 'bg-yellow-400/10 border-yellow-400 shadow-[0_0_18px_rgba(250,204,21,0.35)]'
                          : 'bg-gray-900 border-yellow-500/40'
                        : 'bg-gray-900/60 border-gray-700'
                    }`}
                  >
                    <div className="text-4xl">{t.isAchieved ? t.def.emoji : '🔒'}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${t.isAchieved ? 'text-yellow-300' : 'text-gray-400'}`}>
                        {t.def.name}
                      </p>
                      {t.isAchieved ? (
                        <>
                          <p className="text-xs text-gray-300">{t.def.description}</p>
                          {t.detail && <p className="text-[11px] text-gray-400 italic mt-0.5">{t.detail}</p>}
                          {t.achievedAt && (
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {new Date(t.achievedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-gray-500">???</p>
                          <p className="text-[10px] text-gray-600 mt-0.5">Keep playing to unlock this one!</p>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="text-center mt-8">
          <button onClick={() => router.push('/')} className="bg-yellow-500 text-navy font-bold px-6 py-3 rounded-xl active:scale-95">
            Back to Home 🏠
          </button>
        </div>
      </div>
    </div>
  );
}
