'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAllSkillProgress } from '@/lib/db';
import { SkillArea, SkillProgress, SKILL_CONFIG, DifficultyLevel } from '@/lib/types';
import BadgeDisplay from '@/components/BadgeDisplay';
import Confetti from '@/components/Confetti';

export default function ChampionPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<SkillProgress[]>([]);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    getAllSkillProgress().then(p => setProgress(p));
    const timer = setTimeout(() => setShowConfetti(false), 10000);
    return () => clearTimeout(timer);
  }, []);

  const isChampion = progress.length === 5 && progress.every(p => p.current_level >= 3);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-navy to-blue-900">
      {showConfetti && <Confetti duration={10000} />}

      <div className="text-center">
        {/* Spinning trophy */}
        <div className="text-8xl mb-6 animate-spin-slow inline-block">🏆</div>

        <h1 className="font-retro text-2xl md:text-4xl text-gold mb-4 leading-relaxed animate-pulse-glow inline-block px-4 py-2">
          {isChampion ? 'WES IS THE ULTIMATE CHAMPION!' : 'CHAMPION HALL'}
        </h1>

        {isChampion && (
          <p className="text-xl text-white/80 mb-8">You are ready for anything, Wes!</p>
        )}

        {/* All champion badges */}
        <div className="flex gap-4 justify-center mb-8 flex-wrap">
          {progress.map(p => (
            <div key={p.skill_area} className="flex flex-col items-center gap-2">
              <BadgeDisplay
                skillArea={p.skill_area as SkillArea}
                level={Math.min(p.current_level, 3) as DifficultyLevel}
                size="lg"
              />
              <p className="text-white text-sm font-bold">
                {SKILL_CONFIG[p.skill_area as SkillArea].label}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push('/')}
          className="bg-gold hover:bg-gold-dark text-navy font-bold text-xl px-10 py-4 rounded-2xl transition-all active:scale-95"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
