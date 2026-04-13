'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSkillProgress } from '@/lib/db';
import { LEVEL_NAMES, DifficultyLevel } from '@/lib/types';
import { prefetchQuestions } from '@/lib/prefetch';
import BadgeDisplay from '@/components/BadgeDisplay';

const subGames = [
  { id: 'meet_greet', name: 'Meet & Greet Practice', emoji: '👋', desc: 'Practice introductions!' },
  { id: 'what_would_you_do', name: 'What Would You Do?', emoji: '🤔', desc: 'Pick the best choice!' },
  { id: 'i_dont_know', name: "I Don't Know Practice", emoji: '💡', desc: "It's okay not to know!" },
];

export default function ConfidenceCoachPage() {
  const router = useRouter();
  const [level, setLevel] = useState<DifficultyLevel>(1);

  useEffect(() => {
    getSkillProgress('confidence_coach').then(p => {
      const lvl = p.current_level as DifficultyLevel;
      setLevel(lvl);
      prefetchQuestions('confidence_coach', 'meet_greet', lvl);
      prefetchQuestions('confidence_coach', 'what_would_you_do', lvl);
      prefetchQuestions('confidence_coach', 'i_dont_know', lvl);
    });
  }, []);

  return (
    <div className="min-h-screen p-6">
      <button onClick={() => router.push('/')} className="text-navy font-bold text-lg mb-6 block">← Home</button>
      <div className="text-center mb-8">
        <BadgeDisplay skillArea="confidence_coach" level={level} size="lg" />
        <h1 className="text-3xl font-extrabold text-navy mt-4">Confidence Coach</h1>
        <p className="text-lg text-gray-500">{LEVEL_NAMES[level]} — Level {level}</p>
        <p className="text-sm text-coral mt-2 font-bold">Parent-guided mode</p>
      </div>
      <div className="max-w-md mx-auto space-y-4">
        {subGames.map(sg => (
          <button
            key={sg.id}
            onClick={() => router.push(`/play/confidence_coach/${sg.id}`)}
            className="w-full bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all active:scale-98 flex items-center gap-4 text-left"
          >
            <span className="text-4xl">{sg.emoji}</span>
            <div>
              <h3 className="text-xl font-bold text-navy">{sg.name}</h3>
              <p className="text-gray-500">{sg.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
