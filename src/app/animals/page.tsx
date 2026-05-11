'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAnimalCollection, setAnimalFavorite } from '@/lib/db';
import { AnimalUnlock } from '@/lib/types';
import { ANIMALS, Animal, AnimalRarity, RARITY_COLORS, RARITY_LABELS, RARITY_ORDER } from '@/data/animals';
import { speak } from '@/lib/speech';
import Confetti from '@/components/Confetti';
import { displayName } from '@/lib/champion';

type SortMode = 'rarity' | 'date' | 'name' | 'level';

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

  // Milestone — tiered for the 100-animal collection
  const milestone =
    unlocked >= 100 ? 'ULTIMATE ANIMAL MASTER! 🏆🏆' :
    unlocked >= 75  ? 'Champion! 🏆' :
    unlocked >= 50  ? 'Halfway There! 🌟' :
    unlocked >= 25  ? 'Adventurer! ⚔️' :
    unlocked >= 10  ? 'Explorer! 🌿' :
    '';

  // Sort animals
  const sorted = [...ANIMALS];
  if (sort === 'rarity') {
    sorted.sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));
  } else if (sort === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === 'level') {
    sorted.sort((a, b) => {
      const aU = collection.find(c => c.animal_id === a.id);
      const bU = collection.find(c => c.animal_id === b.id);
      if (aU && !bU) return -1;
      if (!aU && bU) return 1;
      const aLvl = aU?.current_level ?? 0;
      const bLvl = bU?.current_level ?? 0;
      if (aLvl !== bLvl) return bLvl - aLvl;
      return (bU?.current_xp ?? 0) - (aU?.current_xp ?? 0);
    });
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

  const levelBadgeColor = (level: number): string => {
    if (level >= 5) return 'bg-yellow-400 text-navy';
    if (level >= 3) return 'bg-blue-500 text-white';
    return 'bg-gray-500 text-white';
  };

  const openCard = (animal: Animal) => {
    const entry = collection.find(c => c.animal_id === animal.id);
    setSelected(animal);
    setSelectedDate(entry?.unlocked_at ? new Date(entry.unlocked_at).toLocaleDateString() : '');
    speak(animal.funFact, { rate: 0.85, pitch: 1.05 });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-6xl animate-bounce">🦁</div></div>;

  return (
    <div className="min-h-screen p-4 pb-8">
      {unlocked >= 100 && <Confetti duration={6000} />}

      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.push('/')} className="text-navy font-bold">← Home</button>
          <h1 className="text-xl font-extrabold text-navy">Wes&apos;s Animals — His Forever 🦁</h1>
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
          {[{ id: 'rarity' as SortMode, label: 'By Rarity' }, { id: 'date' as SortMode, label: 'By Date' }, { id: 'name' as SortMode, label: 'By Name' }, { id: 'level' as SortMode, label: 'By Level' }].map(s => (
            <button key={s.id} onClick={() => setSort(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${sort === s.id ? 'bg-navy text-white' : 'bg-gray-100 text-navy'}`}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Wes's Favorites row */}
        {(() => {
          const favs = collection.filter(c => c.is_favorite);
          if (favs.length === 0) {
            return (
              <div className="bg-pink-50 border-2 border-pink-200 rounded-2xl p-3 mb-4 text-center text-pink-700 text-xs font-bold">
                Tap the ❤️ on any animal to save your favorites here!
              </div>
            );
          }
          return (
            <div className="mb-4">
              <p className="font-bold text-pink-700 text-sm mb-2">Wes&apos;s Favorites ❤️</p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {favs.map(u => {
                  const a = ANIMALS.find(x => x.id === u.animal_id);
                  if (!a) return null;
                  const d = displayName(a.name, u);
                  return (
                    <button
                      key={u.animal_id}
                      onClick={() => openCard(a)}
                      className={`flex-shrink-0 rounded-xl border-2 px-3 py-2 bg-white shadow-sm active:scale-95 ${RARITY_BORDER[a.rarity]}`}
                    >
                      <div className="text-2xl text-center">{a.emoji}</div>
                      <div className={`text-[10px] font-bold mt-0.5 max-w-[70px] truncate ${d.isChampion ? 'text-yellow-600' : 'text-navy'}`}>
                        {d.isChampion ? `👑 ${d.text}` : d.text}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Grid */}
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
          {sorted.map(animal => {
            const isUnlocked = unlockedIds.has(animal.id);
            const u = collection.find(c => c.animal_id === animal.id);
            const lvl = u?.current_level ?? 1;
            const xpCur = u?.current_xp ?? 0;
            const xpNext = u?.xp_to_next_level ?? 100;
            const isMax = u?.is_max_level ?? false;
            const xpPct = isMax ? 100 : Math.min(100, Math.round((xpCur / Math.max(1, xpNext)) * 100));
            const d = isUnlocked ? displayName(animal.name, u) : { text: animal.name, isChampion: false };
            const toggleFav = async (e: React.MouseEvent) => {
              e.stopPropagation();
              if (!u) return;
              const next = !(u.is_favorite ?? false);
              await setAnimalFavorite(animal.id, next);
              // Optimistic local update
              setCollection(prev => prev.map(c => c.animal_id === animal.id ? { ...c, is_favorite: next } : c));
            };
            return (
              <div key={animal.id} className="relative">
                <button onClick={() => isUnlocked ? openCard(animal) : undefined}
                  disabled={!isUnlocked}
                  className={`relative w-full rounded-xl border-2 p-2 text-center transition-all ${RARITY_BORDER[animal.rarity]} ${
                    isUnlocked ? 'bg-white shadow-md active:scale-95' : 'bg-gray-800 opacity-60'
                  }`}>
                  {isUnlocked && (
                    <span className={`absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${levelBadgeColor(lvl)}`}>
                      Lv.{lvl}{isMax ? ' ⭐' : ''}
                    </span>
                  )}
                  <span className={`text-4xl block mb-1 ${!isUnlocked ? 'grayscale opacity-30' : ''}`}>
                    {isUnlocked ? animal.emoji : '❓'}
                  </span>
                  <p className={`text-xs font-bold truncate ${isUnlocked ? (d.isChampion ? 'text-yellow-600' : 'text-navy') : 'text-gray-500'}`}>
                    {isUnlocked ? (d.isChampion ? `👑 ${d.text}` : d.text) : '???'}
                  </p>
                  {isUnlocked && (
                    <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400" style={{ width: `${xpPct}%` }} />
                    </div>
                  )}
                </button>
                {isUnlocked && (
                  <button
                    onClick={toggleFav}
                    aria-label={u?.is_favorite ? 'Remove favourite' : 'Add favourite'}
                    className="absolute top-1 right-1 text-lg active:scale-90 z-10"
                  >
                    {u?.is_favorite ? '❤️' : '🤍'}
                  </button>
                )}
              </div>
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
              {(() => {
                const u = collection.find(c => c.animal_id === selected.id);
                const d = displayName(selected.name, u);
                return (
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-extrabold" style={{ color: d.isChampion ? '#EAB308' : RARITY_COLORS[selected.rarity] }}>
                      {d.isChampion ? `👑 ${d.text}` : d.text}
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: RARITY_COLORS[selected.rarity] + '33', color: RARITY_COLORS[selected.rarity] }}>
                      {RARITY_LABELS[selected.rarity]}
                    </span>
                  </div>
                );
              })()}
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
              {(() => {
                const u = collection.find(c => c.animal_id === selected.id);
                if (!u) return null;
                const lvl = u.current_level ?? 1;
                const xpCur = u.current_xp ?? 0;
                const xpNext = u.xp_to_next_level ?? 100;
                const isMax = u.is_max_level ?? false;
                const pct = isMax ? 100 : Math.min(100, Math.round((xpCur / Math.max(1, xpNext)) * 100));
                return (
                  <div className="bg-black/30 rounded-lg p-2 mb-2">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className={`font-bold px-1.5 py-0.5 rounded ${levelBadgeColor(lvl)}`}>
                        Lv.{lvl}{isMax ? ' ⭐ MAX' : ''}
                      </span>
                      <span className="text-gray-300">{isMax ? 'CHAMPION ⭐' : `${xpCur} / ${xpNext} XP`}</span>
                    </div>
                    <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })()}
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
