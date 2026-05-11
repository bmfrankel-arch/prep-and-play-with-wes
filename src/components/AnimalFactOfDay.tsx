'use client';

import { useEffect, useState } from 'react';
import { ANIMALS, Animal, RARITY_COLORS, AnimalRarity } from '@/data/animals';
import { AnimalUnlock } from '@/lib/types';
import { speak } from '@/lib/speech';
import { displayName } from '@/lib/champion';

const RARITY_BORDER: Record<AnimalRarity, string> = {
  common: 'border-green-500', rare: 'border-blue-500', epic: 'border-purple-500', legendary: 'border-yellow-400',
};

interface Props {
  collection: AnimalUnlock[];
}

const STORAGE_DATE_KEY = 'ppw_animal_fact_date';
const STORAGE_LAST_ID_KEY = 'ppw_animal_fact_last_id';

function pickAnimalForToday(collection: AnimalUnlock[]): { animal: Animal; unlock: AnimalUnlock } | null {
  if (collection.length === 0) return null;
  if (typeof window === 'undefined') return null;

  const today = new Date().toDateString();
  const lastDate = localStorage.getItem(STORAGE_DATE_KEY);
  const lastId = localStorage.getItem(STORAGE_LAST_ID_KEY);

  if (lastDate === today && lastId) {
    const u = collection.find(c => c.animal_id === lastId);
    const a = u ? ANIMALS.find(x => x.id === u.animal_id) : null;
    if (u && a) return { animal: a, unlock: u };
  }

  // Prefer animals unlocked in the last 7 days
  const weekAgo = Date.now() - 7 * 86400000;
  const recent = collection.filter(c => c.unlocked_at && new Date(c.unlocked_at).getTime() >= weekAgo);
  let pool = recent.length > 0 ? recent : collection;
  // Avoid yesterday's pick
  if (lastId && pool.length > 1) pool = pool.filter(c => c.animal_id !== lastId);

  const choice = pool[Math.floor(Math.random() * pool.length)];
  const a = ANIMALS.find(x => x.id === choice.animal_id);
  if (!a) return null;

  localStorage.setItem(STORAGE_DATE_KEY, today);
  localStorage.setItem(STORAGE_LAST_ID_KEY, choice.animal_id);
  return { animal: a, unlock: choice };
}

export default function AnimalFactOfDay({ collection }: Props) {
  const [pick, setPick] = useState<{ animal: Animal; unlock: AnimalUnlock } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPick(pickAnimalForToday(collection));
    setHydrated(true);
  }, [collection]);

  if (!hydrated) return null;

  // Locked state — no animals yet
  if (collection.length === 0) {
    return (
      <div className="bg-gray-100 border-2 border-gray-200 rounded-2xl p-4 mb-4 text-center">
        <p className="text-3xl mb-1 grayscale opacity-40">🦁</p>
        <p className="font-bold text-navy text-sm">Wes&apos;s Animal Fact of the Day 🦁</p>
        <p className="text-xs text-gray-500 mt-1">Complete a quiz to unlock your first animal and unlock this feature!</p>
      </div>
    );
  }

  if (!pick) return null;
  const { animal, unlock } = pick;
  const d = displayName(animal.name, unlock);
  const ttsText = `${d.isChampion ? d.text : animal.name} — ${animal.funFact}`;

  return (
    <div className={`bg-white border-2 ${RARITY_BORDER[animal.rarity]} rounded-2xl p-4 mb-4 shadow-md`}>
      <div className="flex items-center justify-between mb-2">
        <p className="font-bold text-navy text-sm">Wes&apos;s Animal Fact of the Day 🦁</p>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: RARITY_COLORS[animal.rarity] + '33', color: RARITY_COLORS[animal.rarity] }}
        >
          {animal.rarity}
        </span>
      </div>
      <div className="text-center mb-2">
        <span className="text-6xl">{animal.emoji}</span>
        <p className={`font-extrabold text-base mt-1 ${d.isChampion ? 'text-yellow-600' : 'text-navy'}`}>
          {d.isChampion ? `👑 ${d.text}` : d.text}
        </p>
      </div>
      <p className="text-sm text-gray-700 italic text-center mb-3">{animal.funFact}</p>
      <button
        onClick={() => speak(ttsText, { rate: 0.85, pitch: 1.05 })}
        className="w-full bg-yellow-400 text-navy font-bold py-2 rounded-xl text-sm active:scale-95"
      >
        Hear it! 🔊
      </button>
    </div>
  );
}
