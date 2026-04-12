'use client';

import { useState, useEffect } from 'react';
import { Animal, AnimalRarity, RARITY_COLORS, RARITY_LABELS } from '@/data/animals';
import { speakAnimal, speakCelebration } from '@/lib/speech';
import Confetti from './Confetti';

interface AnimalUnlockSequenceProps {
  animal: Animal;
  onComplete: () => void;
  saveStatus?: 'saved' | 'failed' | null;
}

function Stars({ count }: { count: number }) {
  return (
    <span>
      {'★'.repeat(count)}{'☆'.repeat(5 - count)}
    </span>
  );
}

const RARITY_BG: Record<AnimalRarity, string> = {
  common: 'border-green-500',
  rare: 'border-blue-500',
  epic: 'border-purple-500',
  legendary: 'border-yellow-400',
};

const RARITY_TEXT_COLOR: Record<AnimalRarity, string> = {
  common: 'text-green-500',
  rare: 'text-blue-500',
  epic: 'text-purple-500',
  legendary: 'text-yellow-400',
};

export default function AnimalUnlockSequence({ animal, onComplete, saveStatus }: AnimalUnlockSequenceProps) {
  const [phase, setPhase] = useState<'dark' | 'title' | 'card_back' | 'card_front' | 'done'>('dark');
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('title'), 600),
      setTimeout(() => setPhase('card_back'), 2000),
      setTimeout(() => setPhase('card_front'), 3200),
      setTimeout(() => {
        setShowConfetti(true);
        speakAnimal(animal.ttsText);
      }, 3800),
      setTimeout(() => {
        // Rarity announcement
        const rarityMsg: Record<AnimalRarity, string> = {
          legendary: 'A LEGENDARY animal! Incredible, Wes!',
          epic: 'An EPIC animal! Brilliant!',
          rare: 'A RARE animal! Well done!',
          common: 'A new animal for your collection!',
        };
        speakCelebration(rarityMsg[animal.rarity]);
        setPhase('done');
      }, 5500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [animal.ttsText, animal.rarity]);

  const rarityColor = RARITY_COLORS[animal.rarity];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: phase === 'dark' ? 'transparent' : 'rgba(0,0,0,0.92)', transition: 'background-color 500ms' }}>

      {showConfetti && <Confetti duration={4000} />}

      {/* Gold particle burst */}
      {(phase === 'title' || phase === 'card_back') && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 30 }, (_, i) => (
            <div key={i} className="absolute rounded-full"
              style={{
                width: 6, height: 6, backgroundColor: '#FFD700',
                left: '50%', top: '50%', opacity: 0,
                animation: `goldBurst 1.5s ease-out ${i * 0.05}s forwards`,
              }} />
          ))}
        </div>
      )}

      {/* Title */}
      {phase !== 'dark' && (
        <div className="absolute top-16 text-center animate-fade-in z-10">
          <h1 className="font-retro text-lg md:text-2xl leading-relaxed"
            style={{ color: '#FFD700', textShadow: '0 0 20px rgba(255,215,0,0.6)' }}>
            NEW ANIMAL UNLOCKED!
          </h1>
        </div>
      )}

      {/* Card */}
      <div className="relative" style={{ perspective: '1000px' }}>
        <div style={{
          width: 300, minHeight: 420,
          transition: 'transform 600ms ease-in-out',
          transformStyle: 'preserve-3d',
          transform: phase === 'card_front' || phase === 'done' ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}>
          {/* Card Back */}
          <div className="absolute inset-0 rounded-2xl border-4 border-yellow-500 overflow-hidden"
            style={{ backfaceVisibility: 'hidden', background: 'linear-gradient(135deg, #1B2A4A, #0f1a30)' }}>
            <div className="h-full flex flex-col items-center justify-center p-4">
              <p className="font-retro text-xs text-yellow-500 mb-6">WHO WOULD WIN?</p>
              <div className="text-8xl mb-4" style={{ color: '#FFD700' }}>?</div>
              <div className="w-20 h-1 bg-yellow-500 rounded-full" />
            </div>
          </div>

          {/* Card Front */}
          <div className={`absolute inset-0 rounded-2xl border-4 ${RARITY_BG[animal.rarity]} overflow-hidden`}
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'linear-gradient(180deg, #1a1a2e, #16213e)',
              boxShadow: animal.rarity === 'legendary'
                ? `0 0 30px ${rarityColor}66, inset 0 0 30px ${rarityColor}22`
                : undefined,
            }}>
            <div className="p-3 flex flex-col h-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-900 to-red-700 rounded-lg px-3 py-1.5 mb-2">
                <p className="font-retro text-[8px] text-white text-center tracking-wider">WHO WOULD WIN?</p>
              </div>

              {/* Name + rarity badge */}
              <div className="flex items-center justify-between mb-1">
                <h2 className={`text-lg font-extrabold ${RARITY_TEXT_COLOR[animal.rarity]}`}>{animal.name}</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: rarityColor + '33', color: rarityColor }}>
                  {RARITY_LABELS[animal.rarity]}
                </span>
              </div>

              {/* Emoji */}
              <div className="flex-1 flex items-center justify-center bg-black/30 rounded-xl my-1">
                <span className="text-8xl">{animal.emoji}</span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-1 text-center mb-1">
                <div className="bg-black/30 rounded-lg p-1">
                  <p className="text-[10px] text-gray-400">💪 STR</p>
                  <p className="text-yellow-400 text-xs"><Stars count={animal.strength} /></p>
                </div>
                <div className="bg-black/30 rounded-lg p-1">
                  <p className="text-[10px] text-gray-400">⚡ SPD</p>
                  <p className="text-yellow-400 text-xs"><Stars count={animal.speed} /></p>
                </div>
                <div className="bg-black/30 rounded-lg p-1">
                  <p className="text-[10px] text-gray-400">🛡️ DEF</p>
                  <p className="text-yellow-400 text-xs"><Stars count={animal.defense} /></p>
                </div>
              </div>

              {/* Superpower */}
              <div className="border rounded-lg p-2 mb-1" style={{ borderColor: rarityColor + '66' }}>
                <p className="text-[9px] font-bold text-gray-500 mb-0.5">SUPERPOWER:</p>
                <p className="text-xs font-bold" style={{ color: '#FFD700' }}>{animal.superpower}</p>
              </div>

              {/* Fun Fact */}
              <div className="bg-white/5 rounded-lg p-2 mb-1">
                <p className="text-[9px] font-bold text-gray-500 mb-0.5">WILD FACT:</p>
                <p className="text-[11px] text-gray-300">{animal.funFact}</p>
              </div>

              {/* Power Level bar */}
              <div className="flex items-center gap-2">
                <p className="text-[9px] text-gray-500 font-bold whitespace-nowrap">PWR {animal.powerLevel}</p>
                <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${animal.powerLevel}%`,
                    backgroundColor: rarityColor,
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      {phase === 'done' && (
        <div className="absolute bottom-12 flex flex-col gap-3 items-center animate-fade-in z-10">
          {saveStatus === 'saved' && <p className="text-green-400 text-xs font-bold">✓ Saved to your collection!</p>}
          {saveStatus === 'failed' && <p className="text-yellow-400 text-xs font-bold">⚠️ Saved locally — will sync when online</p>}
          <button onClick={onComplete}
            className="bg-gradient-to-r from-yellow-500 to-amber-500 text-navy font-bold text-lg px-8 py-4 rounded-2xl active:scale-95 transition-transform shadow-lg">
            Add to My Collection! 🦁
          </button>
          <button onClick={onComplete}
            className="text-gray-400 font-bold text-sm hover:text-white">
            See My Quiz Results →
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes goldBurst {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(${`var(--tx, 0px)`}, ${`var(--ty, 0px)`}) scale(0); }
        }
      `}</style>
      <style>{`
        ${Array.from({ length: 30 }, (_, i) => {
          const angle = (i / 30) * Math.PI * 2;
          const dist = 80 + Math.random() * 120;
          return `.absolute:nth-child(${i + 1}) { --tx: ${Math.cos(angle) * dist}px; --ty: ${Math.sin(angle) * dist}px; }`;
        }).join('\n')}
      `}</style>
    </div>
  );
}
