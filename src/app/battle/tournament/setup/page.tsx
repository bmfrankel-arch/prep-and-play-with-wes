'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ANIMALS, Animal, AnimalRarity } from '@/data/animals';
import { getAnimalCollection, saveTournament, getCurrentTournament } from '@/lib/db';
import { Tournament, TournamentMatch } from '@/lib/types';
import { speak } from '@/lib/speech';
import { randomTerrain } from '@/lib/battleEngine';

const RB: Record<AnimalRarity, string> = { common: 'border-green-500', rare: 'border-blue-500', epic: 'border-purple-500', legendary: 'border-yellow-400' };

export default function TournamentSetupPage() {
  const router = useRouter();
  const [unlockedAnimals, setUnlockedAnimals] = useState<Animal[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Check for existing tournament
      const existing = getCurrentTournament();
      if (existing && !existing.completed_at) {
        router.push('/battle/tournament/bracket');
        return;
      }
      const col = await getAnimalCollection();
      const ids = new Set(col.map(c => c.animal_id));
      setUnlockedAnimals(ANIMALS.filter(a => ids.has(a.id)));
      setLoading(false);
      speak("Pick your 8 best fighters for the tournament!", { rate: 0.9, pitch: 1.05 });
    })();
  }, [router]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else if (next.size < 8) next.add(id);
    setSelected(next);
  };

  const randomPick = () => {
    const shuffled = [...unlockedAnimals].sort(() => Math.random() - 0.5);
    setSelected(new Set(shuffled.slice(0, 8).map(a => a.id)));
  };

  const startTournament = () => {
    if (selected.size !== 8) return;
    const participants = Array.from(selected);

    // Create bracket: 7 matches (4 QF + 2 SF + 1 Final)
    const matches: TournamentMatch[] = [];
    // Quarter finals
    for (let i = 0; i < 4; i++) {
      matches.push({
        round: 1, match_index: i,
        animal1_id: participants[i * 2], animal2_id: participants[i * 2 + 1],
        winner_id: null, terrain: randomTerrain(),
        score1: 0, score2: 0, wes_prediction: null, wes_correct: null,
      });
    }
    // Semi finals (placeholders)
    for (let i = 0; i < 2; i++) {
      matches.push({
        round: 2, match_index: i,
        animal1_id: '', animal2_id: '',
        winner_id: null, terrain: randomTerrain(),
        score1: 0, score2: 0, wes_prediction: null, wes_correct: null,
      });
    }
    // Final
    matches.push({
      round: 3, match_index: 0,
      animal1_id: '', animal2_id: '',
      winner_id: null, terrain: randomTerrain(),
      score1: 0, score2: 0, wes_prediction: null, wes_correct: null,
    });

    const tournament: Tournament = {
      id: crypto.randomUUID(),
      participants,
      bracket_state: matches,
      current_match: 0,
      current_round: 1,
      champion_animal_id: null,
      total_correct_predictions: 0,
      started_at: new Date().toISOString(),
      completed_at: null,
    };

    saveTournament(tournament);
    router.push('/battle/tournament/bracket');
  };

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="text-6xl animate-bounce">🏆</div></div>;

  if (unlockedAnimals.length < 8) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-5xl mb-4">🏆</p>
          <h2 className="font-retro text-sm text-yellow-400 mb-4">TOURNAMENT</h2>
          <p className="text-gray-400 mb-6">You need at least 8 animals! ({unlockedAnimals.length}/8)</p>
          <button onClick={() => router.push('/')} className="bg-yellow-500 text-navy font-bold px-6 py-3 rounded-xl">Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-8">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.push('/battle')} className="text-gray-400 font-bold text-sm">← Arena</button>
          <h1 className="font-retro text-sm text-yellow-400">TOURNAMENT SETUP 🏆</h1>
          <div />
        </div>

        <p className="text-center text-gray-400 mb-2">Pick 8 fighters: <strong className="text-yellow-400">{selected.size}</strong> / 8</p>
        <div className="w-full h-2 bg-gray-800 rounded-full mb-4 overflow-hidden">
          <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${(selected.size / 8) * 100}%` }} />
        </div>

        <div className="grid grid-cols-4 gap-2 mb-6">
          {unlockedAnimals.map(a => {
            const isSel = selected.has(a.id);
            return (
              <button key={a.id} onClick={() => toggle(a.id)} onTouchEnd={e => e.currentTarget.blur()}
                className={`rounded-xl border-2 p-2 text-center transition-all focus:outline-none ${RB[a.rarity]} ${
                  isSel ? 'ring-2 ring-yellow-400 bg-yellow-900/30 scale-105' : 'bg-gray-900 active:scale-95'
                }`}>
                <span className="text-2xl block">{a.emoji}</span>
                <p className="text-[9px] font-bold truncate">{a.name}</p>
                {isSel && <span className="text-yellow-400 text-[10px] font-bold">✓</span>}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3 justify-center">
          <button onClick={randomPick} className="bg-gray-800 text-white font-bold px-6 py-3 rounded-xl active:scale-95">Random 🎲</button>
          {selected.size === 8 && (
            <button onClick={startTournament} className="bg-yellow-500 text-navy font-bold px-8 py-3 rounded-xl text-lg active:scale-95 animate-pulse">
              START TOURNAMENT! ⚔️
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
