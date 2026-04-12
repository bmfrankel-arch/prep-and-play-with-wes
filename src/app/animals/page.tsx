'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAnimalCollection } from '@/lib/db';
import { AnimalUnlock } from '@/lib/types';
import { ANIMALS, Animal, AnimalRarity, RARITY_COLORS, RARITY_LABELS, RARITY_ORDER } from '@/data/animals';
import Confetti from '@/components/Confetti';

type SortMode = 'rarity' | 'date' | 'name';

const RARITY_BORDER: Record<AnimalRarity, string> = {
  common: 'border-green-500', rare: 'border-blue-500', epic: 'border-purple-500', legendary: 'border-yellow-400',
};

function Stars({ count }: { count: number }) {
  return <span className="text-yellow-400 text-xs">{'★'.repeat(count)}{'☆'.repeat(5 - count)}</span>;
}

export default function AnimalsPage() {
  const router = useRouter();
  const [collection, setCollection] = useState<AnimalUnlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>('rarity');
  const [selected, setSelected] = useState<Animal | null>(null);
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    getAnimalCollection().then(c => { setCollection(c); setLoading(false); });
  }, []);

  const unlockedIds = new Set(collection.map(c => c.animal_id));
  const total = ANIMALS.length;
  const unlocked = unlockedIds.size;
  const pct = Math.round((unlocked / total) * 100);

  // Milestone
  const milestone = unlocked >= 50 ? 'ULTIMATE ANIMAL MASTER! 🏆' : unlocked >= 25 ? 'Adventurer! ⚔️' : unlocked >= 10 ? 'Explorer! 🌿' : '';

  // Sort animals
  const sorted = [...ANIMALS];
  if (sort === 'rarity') {
    sorted.sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));
  } else if (sort === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    // By date — unlocked first sorted by date desc, then locked
    sorted.sort((a, b) => {
      const aU = collection.find(c => c.animal_id === a.id);
      const bU = collection.find(c => c.animal_id === b.id);
      if (aU && !bU) return -1;
      if (!aU && bU) return 1;
      if (aU && bU) return new Date(bU.unlocked_at || 0).getTime() - new Date(aU.unlocked_at || 0).getTime();
      return 0;
    });
  }

  const openCard = (animal: Animal) => {
    const entry = collection.find(c => c.animal_id === animal.id);
    setSelected(animal);
    setSelectedDate(entry?.unlocked_at ? new Date(entry.unlocked_at).toLocaleDateString() : '');
    // TTS
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const u = new SpeechSynthesisUtterance(animal.funFact);
        u.lang = 'en-US'; u.rate = 0.85; u.pitch = 1.1;
        window.speechSynthesis.speak(u);
      } catch { /* ok */ }
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-6xl animate-bounce">🦁</div></div>;

  return (
    <div className="min-h-screen p-4 pb-8">
      {unlocked >= 50 && <Confetti duration={6000} />}

      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.push('/')} className="text-navy font-bold">← Home</button>
          <h1 className="text-xl font-extrabold text-navy">Wes&apos;s Animals 🦁</h1>
          <div />
        </div>

        {/* Stats */}
        <div className="text-center mb-4">
          <p className="text-lg font-bold text-navy">{unlocked} of {total} animals unlocked!</p>
          {milestone && <p className="text-sm font-bold text-gold-dark mt-1">{milestone}</p>}
          <div className="w-full h-3 bg-gray-200 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Sort */}
        <div className="flex gap-2 mb-4 justify-center">
          {[{ id: 'rarity' as SortMode, label: 'By Rarity' }, { id: 'date' as SortMode, label: 'By Date' }, { id: 'name' as SortMode, label: 'By Name' }].map(s => (
            <button key={s.id} onClick={() => setSort(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${sort === s.id ? 'bg-navy text-white' : 'bg-gray-100 text-navy'}`}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
          {sorted.map(animal => {
            const isUnlocked = unlockedIds.has(animal.id);
            return (
              <button key={animal.id} onClick={() => isUnlocked ? openCard(animal) : undefined}
                disabled={!isUnlocked}
                className={`rounded-xl border-2 p-2 text-center transition-all ${RARITY_BORDER[animal.rarity]} ${
                  isUnlocked ? 'bg-white shadow-md active:scale-95' : 'bg-gray-800 opacity-60'
                }`}>
                <span className={`text-4xl block mb-1 ${!isUnlocked ? 'grayscale opacity-30' : ''}`}>
                  {isUnlocked ? animal.emoji : '❓'}
                </span>
                <p className={`text-xs font-bold truncate ${isUnlocked ? 'text-navy' : 'text-gray-500'}`}>
                  {isUnlocked ? animal.name : '???'}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Full card modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className={`w-[300px] rounded-2xl border-4 ${RARITY_BORDER[selected.rarity]} overflow-hidden`}
            onClick={e => e.stopPropagation()}
            style={{ background: 'linear-gradient(180deg, #1a1a2e, #16213e)' }}>
            <div className="p-3 flex flex-col">
              <div className="bg-gradient-to-r from-red-900 to-red-700 rounded-lg px-3 py-1.5 mb-2">
                <p className="font-retro text-[8px] text-white text-center tracking-wider">WHO WOULD WIN?</p>
              </div>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-extrabold" style={{ color: RARITY_COLORS[selected.rarity] }}>{selected.name}</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: RARITY_COLORS[selected.rarity] + '33', color: RARITY_COLORS[selected.rarity] }}>
                  {RARITY_LABELS[selected.rarity]}
                </span>
              </div>
              <div className="flex items-center justify-center bg-black/30 rounded-xl py-6 my-1">
                <span className="text-8xl">{selected.emoji}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-center mb-1">
                <div className="bg-black/30 rounded-lg p-1"><p className="text-[10px] text-gray-400">💪 STR</p><Stars count={selected.strength} /></div>
                <div className="bg-black/30 rounded-lg p-1"><p className="text-[10px] text-gray-400">⚡ SPD</p><Stars count={selected.speed} /></div>
                <div className="bg-black/30 rounded-lg p-1"><p className="text-[10px] text-gray-400">🛡️ DEF</p><Stars count={selected.defense} /></div>
              </div>
              <div className="border rounded-lg p-2 mb-1" style={{ borderColor: RARITY_COLORS[selected.rarity] + '66' }}>
                <p className="text-[9px] font-bold text-gray-500 mb-0.5">SUPERPOWER:</p>
                <p className="text-xs font-bold text-yellow-400">{selected.superpower}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2 mb-1">
                <p className="text-[9px] font-bold text-gray-500 mb-0.5">WILD FACT:</p>
                <p className="text-[11px] text-gray-300">{selected.funFact}</p>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[9px] text-gray-500 font-bold">PWR {selected.powerLevel}</p>
                <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${selected.powerLevel}%`, backgroundColor: RARITY_COLORS[selected.rarity] }} />
                </div>
              </div>
              {selectedDate && <p className="text-[10px] text-gray-500 text-center">Unlocked {selectedDate}</p>}
              <button onClick={() => setSelected(null)}
                className="mt-2 bg-white/10 text-white font-bold py-2 rounded-xl text-sm active:scale-95">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
