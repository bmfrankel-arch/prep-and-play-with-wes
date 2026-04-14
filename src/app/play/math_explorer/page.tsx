'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSkillProgress } from '@/lib/db';
import { LEVEL_NAMES, DifficultyLevel } from '@/lib/types';
import { prefetchQuestions } from '@/lib/prefetch';
import BadgeDisplay from '@/components/BadgeDisplay';

const subGames = [
  { id: 'counting_adventures', name: 'Counting Adventures', icon: '🧮', desc: 'Fun word problems!' },
  { id: 'more_or_less', name: 'More or Less', icon: '⚖️', desc: 'Compare numbers!' },
  { id: 'algebra_puzzles', name: 'Algebra Puzzles', icon: '__=?', desc: 'Find the missing number!' },
  { id: 'addition_tables', name: 'Addition Tables', icon: '➕', desc: 'Practice adding!' },
  { id: 'subtraction_tables', name: 'Subtraction Tables', icon: '➖', desc: 'Practice subtracting!' },
];

export default function MathExplorerPage() {
  const router = useRouter();
  const [level, setLevel] = useState<DifficultyLevel>(1);

  useEffect(() => {
    getSkillProgress('math_explorer').then(p => {
      const lvl = p.current_level as DifficultyLevel;
      setLevel(lvl);
      prefetchQuestions('math_explorer', 'counting_adventures', lvl);
      prefetchQuestions('math_explorer', 'more_or_less', lvl);
      prefetchQuestions('math_explorer', 'algebra_puzzles', lvl);
    });
  }, []);

  return (
    <div className="min-h-screen p-6">
      <button onClick={() => router.push('/')} className="text-navy font-bold text-lg mb-6 block">← Home</button>
      <div className="text-center mb-8">
        <BadgeDisplay skillArea="math_explorer" level={level} size="lg" />
        <h1 className="text-3xl font-extrabold text-navy mt-4">Math Explorer</h1>
        <p className="text-lg text-gray-500">{LEVEL_NAMES[level]} — Level {level}</p>
      </div>
      <div className="max-w-md mx-auto space-y-4">
        {subGames.map(sg => (
          <button
            key={sg.id}
            onClick={() => router.push(`/play/math_explorer/${sg.id}`)}
            className="w-full bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all active:scale-98 flex items-center gap-4 text-left"
          >
            <span className={`${sg.icon.length <= 2 ? 'text-4xl' : 'text-2xl font-extrabold text-navy bg-sunshine/30 px-3 py-1 rounded-xl'}`}>{sg.icon}</span>
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
