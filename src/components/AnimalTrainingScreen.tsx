'use client';

import { useEffect, useState } from 'react';
import { ANIMALS, Animal, AnimalRarity, RARITY_COLORS } from '@/data/animals';
import { AnimalUnlock } from '@/lib/types';
import { speak } from '@/lib/speech';
import { AnimalCollectionLevelState, xpToNext, AnimalLevel } from '@/lib/animalLeveling';
import { getLevelStateFor } from '@/lib/db';

interface Props {
  unlockedAnimals: AnimalUnlock[];
  xpEarned: number;
  onPick: (animalId: string) => void; // pass '__bonus_pool__' if all max
}

const RARITY_BORDER: Record<AnimalRarity, string> = {
  common: 'border-green-500',
  rare: 'border-blue-500',
  epic: 'border-purple-500',
  legendary: 'border-yellow-400',
};

function levelBadgeColor(level: AnimalLevel): string {
  if (level >= 5) return 'bg-yellow-400 text-navy';
  if (level >= 3) return 'bg-blue-500 text-white';
  return 'bg-gray-400 text-white';
}

interface AnimalCard {
  animal: Animal;
  state: AnimalCollectionLevelState;
}

export default function AnimalTrainingScreen({ unlockedAnimals, xpEarned, onPick }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const cards: AnimalCard[] = unlockedAnimals
    .map(u => {
      const animal = ANIMALS.find(a => a.id === u.animal_id);
      const state = getLevelStateFor(u);
      if (!animal || !state) return null;
      return { animal, state };
    })
    .filter((c): c is AnimalCard => c !== null);

  const allMax = cards.length > 0 && cards.every(c => c.state.is_max_level);
  const hasAnyAnimals = cards.length > 0;

  useEffect(() => {
    if (!hasAnyAnimals) {
      // No animals at all — nothing to train. Auto-skip via bonus pool.
      const t = setTimeout(() => onPick('__bonus_pool__'), 50);
      return () => clearTimeout(t);
    }
    if (allMax) {
      speak(`All your animals are champions! ${xpEarned} XP goes to your collection bonus!`, { rate: 0.9 });
    } else {
      speak(`You earned ${xpEarned} XP! Pick an animal to make stronger with your hard work!`, { rate: 0.9 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAnyAnimals, allMax, xpEarned]);

  const trainable = cards.filter(c => !c.state.is_max_level);

  const quickPick = () => {
    if (trainable.length === 0) {
      onPick('__bonus_pool__');
      return;
    }
    const sorted = [...trainable].sort((a, b) => {
      if (b.state.current_level !== a.state.current_level) return b.state.current_level - a.state.current_level;
      return b.state.current_xp - a.state.current_xp;
    });
    pick(sorted[0].animal.id);
  };

  const pick = (id: string) => {
    if (confirming) return;
    setPicked(id);
    setConfirming(true);
    const animal = cards.find(c => c.animal.id === id)?.animal;
    if (animal) speak(`${animal.name} is getting stronger!`, { rate: 0.9, pitch: 1.1 });
    setTimeout(() => onPick(id), 1100);
  };

  if (!hasAnyAnimals) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950/95 flex items-center justify-center p-6 text-white">
        <p className="text-lg">Earning your first animal...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 text-white overflow-y-auto">
      <div className="max-w-3xl mx-auto p-5 pb-10">
        <h1 className="font-retro text-base text-yellow-400 text-center mb-2">ANIMAL TRAINING 💪</h1>
        <p className="text-center text-2xl font-extrabold text-yellow-300 mb-1">+{xpEarned} XP earned!</p>
        <p className="text-center text-base text-gray-300 mb-5">
          {allMax
            ? 'All your animals are champions! XP goes to your collection bonus.'
            : 'Which animal gets to train, Wes?'}
        </p>

        {!allMax && (
          <div className="flex justify-center mb-4">
            <button
              onClick={quickPick}
              disabled={confirming}
              className="bg-yellow-500 text-navy font-bold px-5 py-2 rounded-xl text-sm active:scale-95 disabled:opacity-60">
              Train my strongest! ⚡
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {cards.map(({ animal, state }) => {
            const xpNext = state.is_max_level ? 0 : xpToNext(state.current_level);
            const xpPct = state.is_max_level ? 100 : Math.min(100, Math.round((state.current_xp / Math.max(1, xpNext)) * 100));
            const isPicked = picked === animal.id;
            const isMax = state.is_max_level;
            return (
              <button
                key={animal.id}
                disabled={confirming || isMax}
                onClick={() => pick(animal.id)}
                className={`text-left rounded-2xl border-2 ${RARITY_BORDER[animal.rarity]} bg-gray-900 p-3 transition-all ${
                  isPicked ? 'ring-4 ring-yellow-400 scale-105 shadow-lg shadow-yellow-400/40' : 'active:scale-95'
                } ${isMax ? 'opacity-70' : ''}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl">{animal.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate" style={{ color: RARITY_COLORS[animal.rarity] }}>{animal.name}</p>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${levelBadgeColor(state.current_level)}`}>
                      Lv.{state.current_level}{isMax ? ' ⭐' : ''}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-black/40 rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${xpPct}%` }} />
                </div>
                <p className="text-[10px] text-gray-400">
                  {isMax ? 'CHAMPION ⭐' : `${state.current_xp} / ${xpNext} XP`}
                </p>
                {!isMax && (
                  <div className={`mt-2 text-center text-xs font-bold rounded-lg py-1 ${
                    isPicked ? 'bg-yellow-400 text-navy' : 'bg-yellow-500/20 text-yellow-300'
                  }`}>
                    {isPicked ? 'TRAINING! 💪' : 'TRAIN! 💪'}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {allMax && (
          <div className="mt-6 text-center">
            <button
              onClick={() => onPick('__bonus_pool__')}
              className="bg-yellow-500 text-navy font-bold px-6 py-3 rounded-xl active:scale-95">
              Continue →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
