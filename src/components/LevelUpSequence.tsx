'use client';

import { useState, useEffect } from 'react';
import { SkillArea, SKILL_CONFIG, DifficultyLevel, LEVEL_NAMES } from '@/lib/types';
import { playLevelUpFanfare } from '@/lib/audio';
import Confetti from './Confetti';

interface LevelUpSequenceProps {
  skillArea: SkillArea;
  newLevel: DifficultyLevel;
  onComplete: () => void;
}

type Phase = 'flash' | 'dark' | 'text' | 'badge' | 'bar' | 'unlock' | 'continue';

export default function LevelUpSequence({ skillArea, newLevel, onComplete }: LevelUpSequenceProps) {
  const [phase, setPhase] = useState<Phase>('flash');
  const config = SKILL_CONFIG[skillArea];
  const oldLevel = (newLevel - 1) as DifficultyLevel;
  const unlock = config.unlocks[newLevel];

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('dark'), 500),
      setTimeout(() => setPhase('text'), 1000),
      setTimeout(() => {
        setPhase('badge');
        playLevelUpFanfare();
      }, 2000),
      setTimeout(() => setPhase('bar'), 3500),
      setTimeout(() => setPhase('unlock'), 5000),
      setTimeout(() => setPhase('continue'), 6500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Flash phase */}
      {phase === 'flash' && (
        <div className="absolute inset-0 level-up-flash bg-white" />
      )}

      {/* Dark overlay */}
      {phase !== 'flash' && (
        <div className="absolute inset-0 bg-black/90 transition-opacity duration-500" />
      )}

      {/* Content */}
      <div className="relative z-10 text-center px-8">
        {/* Level up text */}
        {phase !== 'flash' && (
          <div className="animate-slide-up mb-8">
            <h1 className="font-retro text-2xl md:text-4xl text-gold mb-4 leading-relaxed">
              WES leveled up!
            </h1>
            <p className="text-white text-xl font-nunito font-bold">
              {config.label}
            </p>
          </div>
        )}

        {/* Badge evolution */}
        {(phase === 'badge' || phase === 'bar' || phase === 'unlock' || phase === 'continue') && (
          <div className="flex items-center justify-center gap-6 mb-8 animate-scale-in">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl ${
              oldLevel === 1 ? 'badge-glow-gray' : 'badge-glow-blue'
            } bg-gray-800 opacity-50`}>
              {config.badges[oldLevel]}
            </div>
            <span className="text-gold text-4xl font-bold animate-pulse">→</span>
            <div className={`w-28 h-28 rounded-full flex items-center justify-center text-5xl ${
              newLevel === 2 ? 'badge-glow-blue' : 'badge-glow-gold'
            } bg-gray-800 animate-badge-evolve`}>
              {config.badges[newLevel]}
            </div>
          </div>
        )}

        {/* XP Bar */}
        {(phase === 'bar' || phase === 'unlock' || phase === 'continue') && (
          <div className="w-72 md:w-96 mx-auto mb-8 animate-fade-in">
            <div className="flex justify-between text-sm text-gray-400 mb-1 font-nunito">
              <span>Level {oldLevel} — {LEVEL_NAMES[oldLevel]}</span>
              <span>Level {newLevel} — {LEVEL_NAMES[newLevel]}</span>
            </div>
            <div className="h-6 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="xp-bar"
                style={{ width: '100%', transition: 'width 1.5s ease-out' }}
              />
            </div>
          </div>
        )}

        {/* Unlock reveal */}
        {(phase === 'unlock' || phase === 'continue') && unlock && (
          <div className="animate-starburst mb-8">
            <div className="bg-gradient-to-r from-gold/20 to-sunshine/20 border-2 border-gold rounded-2xl p-6 max-w-md mx-auto">
              <p className="font-retro text-sm text-gold mb-3">NEW FEATURE UNLOCKED!</p>
              <p className="text-white text-2xl font-bold mb-2">{unlock.name}</p>
              <p className="text-gray-300 text-base">{unlock.description}</p>
            </div>
          </div>
        )}

        {/* Continue button */}
        {phase === 'continue' && (
          <button
            onClick={onComplete}
            className="animate-bounce-slow mt-4 bg-gold hover:bg-gold-dark text-navy font-bold text-xl px-10 py-4 rounded-2xl transition-all active:scale-95"
          >
            Keep Going, Wes! ▶
          </button>
        )}
      </div>

      {/* Confetti */}
      {phase === 'badge' && <Confetti duration={5000} />}
    </div>
  );
}
