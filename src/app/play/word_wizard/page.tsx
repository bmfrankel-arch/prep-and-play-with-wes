'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSkillProgress } from '@/lib/db';
import { LEVEL_NAMES, DifficultyLevel } from '@/lib/types';
import BadgeDisplay from '@/components/BadgeDisplay';

const subGames = [
  { id: 'riddles', name: '"What Am I?" Riddles', emoji: '🤔', desc: 'Guess from clues!' },
  { id: 'story_finish', name: 'Story Finish', emoji: '📚', desc: 'Pick the best ending!' },
  { id: 'word_categories', name: 'Word Categories', emoji: '🔤', desc: 'Find the odd one out!' },
];

export default function WordWizardPage() {
  const router = useRouter();
  const [level, setLevel] = useState<DifficultyLevel>(1);

  useEffect(() => {
    getSkillProgress('word_wizard').then(p => setLevel(p.current_level as DifficultyLevel));
  }, []);

  return (
    <div className="min-h-screen p-6">
      <button onClick={() => router.push('/')} className="text-navy font-bold text-lg mb-6 block">
        ← Home
      </button>

      <div className="text-center mb-8">
        <BadgeDisplay skillArea="word_wizard" level={level} size="lg" />
        <h1 className="text-3xl font-extrabold text-navy mt-4">Word Wizard</h1>
        <p className="text-lg text-gray-500">{LEVEL_NAMES[level]} — Level {level}</p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {subGames.map(sg => (
          <button
            key={sg.id}
            onClick={() => router.push(`/play/word_wizard/${sg.id}`)}
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
