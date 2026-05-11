'use client';

import { useEffect, useState } from 'react';
import { Animal, AnimalRarity, RARITY_COLORS } from '@/data/animals';
import { speak, stopSpeaking } from '@/lib/speech';
import { setChampionName } from '@/lib/db';

const RARITY_BORDER: Record<AnimalRarity, string> = {
  common: 'border-green-500', rare: 'border-blue-500', epic: 'border-purple-500', legendary: 'border-yellow-400',
};

interface Props {
  animal: Animal;
  onDone: (championName: string | null) => void;
}

export default function ChampionNamingScreen({ animal, onDone }: Props) {
  const [value, setValue] = useState(animal.name.slice(0, 15));

  useEffect(() => {
    const t = window.setTimeout(() => speak(
      `Your ${animal.name} is a champion now! Would you like to give it a special name? You can call it anything you want!`,
      { rate: 0.85, pitch: 1.05 },
    ), 600);
    return () => { clearTimeout(t); stopSpeaking(); };
  }, [animal.name]);

  const confirm = async () => {
    const name = value.trim().slice(0, 15);
    const final = name && name.toLowerCase() !== animal.name.toLowerCase() ? name : null;
    if (final) await setChampionName(animal.id, final);
    stopSpeaking();
    onDone(final);
  };

  const skip = async () => {
    stopSpeaking();
    onDone(null);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-gray-950/95 flex items-center justify-center p-6">
      <div className={`w-full max-w-sm rounded-2xl border-4 ${RARITY_BORDER[animal.rarity]} bg-gradient-to-b from-[#1a1a2e] to-[#16213e] p-5 shadow-2xl`}>
        <p className="font-retro text-[10px] text-yellow-400 text-center mb-2">CHAMPION NAMING</p>
        <div className="flex items-center justify-center bg-black/30 rounded-xl py-5 mb-4">
          <span className="text-7xl">{animal.emoji}</span>
        </div>
        <h2 className="text-lg font-extrabold text-center mb-2" style={{ color: RARITY_COLORS[animal.rarity] }}>
          Your {animal.name} is now a CHAMPION! 👑
        </h2>
        <p className="text-center text-sm text-gray-300 mb-4">
          Champions deserve a special name. What will you call your champion?
        </p>
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value.slice(0, 15))}
          maxLength={15}
          autoFocus
          className="w-full bg-white text-navy text-xl font-bold text-center rounded-xl px-4 py-3 mb-1 outline-none focus:ring-4 focus:ring-yellow-300"
          placeholder={animal.name}
        />
        <p className="text-[10px] text-gray-500 text-center mb-4">{value.length}/15 characters</p>
        <button
          onClick={confirm}
          className="w-full bg-yellow-500 hover:bg-yellow-400 text-navy font-bold py-3 rounded-xl text-lg active:scale-95 mb-2"
        >
          That&apos;s its name! ✓
        </button>
        <button
          onClick={skip}
          className="w-full bg-gray-700 text-gray-200 font-bold py-2 rounded-xl text-sm active:scale-95"
        >
          Keep {animal.name}
        </button>
      </div>
    </div>
  );
}
