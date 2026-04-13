'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSkillProgress } from '@/lib/db';
import { LEVEL_NAMES, DifficultyLevel } from '@/lib/types';
import { prefetchQuestions } from '@/lib/prefetch';
import BadgeDisplay from '@/components/BadgeDisplay';

const subGames = [
  { id: 'shape_sequences', name: 'Shape Sequences', emoji: '🔴🔵', desc: 'What comes next?' },
  { id: 'size_color_sorting', name: 'Size & Color Sorting', emoji: '📏🎨', desc: 'Find the rule!' },
  { id: 'odd_one_out', name: 'Odd One Out', emoji: '👀', desc: 'Which is different?' },
];

export default function PatternDetectivePage() {
  const router = useRouter();
  const [level, setLevel] = useState<DifficultyLevel>(1);

  useEffect(() => {
    getSkillProgress('pattern_detective').then(p => {
      const lvl = p.current_level as DifficultyLevel;
      setLevel(lvl);
      prefetchQuestions('pattern_detective', 'shape_sequences', lvl);
      prefetchQuestions('pattern_detective', 'size_color_sorting', lvl);
      prefetchQuestions('pattern_detective', 'odd_one_out', lvl);
    });
  }, []);

  return (
    <div className="min-h-screen p-6">
      <button onClick={() => router.push('/')} className="text-navy font-bold text-lg mb-6 block">
        ← Home
      </button>
      <div className="text-center mb-8">
        <BadgeDisplay skillArea="pattern_detective" level={level} size="lg" />
        <h1 className="text-3xl font-extrabold text-navy mt-4">Pattern Detective</h1>
        <p className="text-lg text-gray-500">{LEVEL_NAMES[level]} — Level {level}</p>
      </div>
      <div className="max-w-md mx-auto space-y-4">
        {subGames.map(sg => (
          <button
            key={sg.id}
            onClick={() => router.push(`/play/pattern_detective/${sg.id}`)}
            className="w-full bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all active:scale-98 flex items-center gap-4 text-left"
          >
            <span className="text-3xl">{sg.emoji}</span>
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
