'use client';

import { useEffect, useState } from 'react';
import { Animal, AnimalRarity, RARITY_COLORS } from '@/data/animals';
import { LevelUpEvent } from '@/lib/animalLeveling';
import { speak, speakCelebration } from '@/lib/speech';

interface Props {
  animal: Animal;
  events: LevelUpEvent[];
  onComplete: () => void;
}

const RARITY_BORDER: Record<AnimalRarity, string> = {
  common: 'border-green-500',
  rare: 'border-blue-500',
  epic: 'border-purple-500',
  legendary: 'border-yellow-400',
};

const STAT_LABEL: Record<string, string> = {
  strength: 'Its strength just went up!',
  speed: "It's getting faster!",
  defense: 'Its defense is tougher now!',
};

export default function AnimalLevelUpSequence({ animal, events, onComplete }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (events.length === 0) {
      onComplete();
      return;
    }
    const event = events[step];
    const isMax = event.newLevel >= 5;
    if (isMax) {
      speakCelebration(`INCREDIBLE, Wes! ${animal.name} has reached MAXIMUM POWER! It is now an unstoppable champion!`);
    } else {
      speak(`${animal.name} leveled up to Level ${event.newLevel}! It's getting stronger, Wes!`, { rate: 0.9, pitch: 1.1 });
      setTimeout(() => speak(STAT_LABEL[event.statBoosted] || 'A stat just went up!', { rate: 0.9 }), 1800);
    }
    const advance = setTimeout(() => {
      if (step + 1 < events.length) {
        setStep(s => s + 1);
      } else {
        onComplete();
      }
    }, isMax ? 4500 : 3500);
    return () => clearTimeout(advance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (events.length === 0) return null;
  const event = events[step];
  const isMax = event.newLevel >= 5;
  const newStrength = animal.strength + event.bonuses.strength;
  const newSpeed = animal.speed + event.bonuses.speed;
  const newDefense = animal.defense + event.bonuses.defense;
  const newPower = animal.powerLevel + event.bonuses.powerLevel;

  return (
    <div className="fixed inset-0 z-50 bg-gray-950/95 flex items-center justify-center p-6">
      <div className={`w-[300px] rounded-2xl border-4 ${RARITY_BORDER[animal.rarity]} bg-gradient-to-b from-[#1a1a2e] to-[#16213e] p-4 shadow-2xl ${
        isMax ? 'shadow-yellow-400/50 animate-pulse' : 'shadow-yellow-400/30'
      }`} style={{ animation: 'levelGlow 1.6s ease-in-out infinite alternate' }}>
        <p className="font-retro text-[10px] text-yellow-400 text-center mb-2">
          {isMax ? 'MAXIMUM POWER!' : 'LEVEL UP!'}
        </p>
        <div className="flex items-center justify-center bg-black/30 rounded-xl py-6 mb-3">
          <span className="text-7xl">{animal.emoji}</span>
        </div>
        <h2 className="text-lg font-extrabold text-center mb-1" style={{ color: RARITY_COLORS[animal.rarity] }}>{animal.name}</h2>
        <p className="text-center text-2xl font-extrabold text-yellow-400 mb-3">
          Lv.{event.newLevel}{isMax ? ' ⭐ MAX' : ''}
        </p>
        <div className="grid grid-cols-3 gap-1 text-center text-xs mb-2">
          <div className="bg-black/30 rounded p-1">
            <p className="text-[9px] text-gray-400">💪 STR</p>
            <p className={`font-bold ${event.statBoosted === 'strength' ? 'text-yellow-300' : 'text-gray-200'}`}>{newStrength.toFixed(1)}</p>
          </div>
          <div className="bg-black/30 rounded p-1">
            <p className="text-[9px] text-gray-400">⚡ SPD</p>
            <p className={`font-bold ${event.statBoosted === 'speed' ? 'text-yellow-300' : 'text-gray-200'}`}>{newSpeed.toFixed(1)}</p>
          </div>
          <div className="bg-black/30 rounded p-1">
            <p className="text-[9px] text-gray-400">🛡️ DEF</p>
            <p className={`font-bold ${event.statBoosted === 'defense' ? 'text-yellow-300' : 'text-gray-200'}`}>{newDefense.toFixed(1)}</p>
          </div>
        </div>
        <p className="text-center text-[11px] text-yellow-300 font-bold">{STAT_LABEL[event.statBoosted]}</p>
        <p className="text-center text-[10px] text-gray-400 mt-2">PWR {newPower}</p>
        {isMax && <p className="text-center text-yellow-400 text-xs font-bold mt-2">CHAMPION ⭐</p>}
      </div>
      <style jsx>{`
        @keyframes levelGlow {
          from { box-shadow: 0 0 24px rgba(255,215,0,0.35); }
          to { box-shadow: 0 0 48px rgba(255,215,0,0.7); }
        }
      `}</style>
    </div>
  );
}
