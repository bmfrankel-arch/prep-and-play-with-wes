'use client';

import GameShell from '@/components/GameShell';
import { GameQuestion, DifficultyLevel } from '@/lib/types';

function CategoryQuestion(question: GameQuestion, onAnswer: (a: string) => void, _level: DifficultyLevel, selected?: string | null) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg text-center">
      <h2 className="text-2xl font-extrabold text-navy mb-4">Which Doesn&apos;t Belong? 🔤</h2>
      <p className="text-lg text-gray-500 mb-6">Tap the word that doesn&apos;t fit with the others!</p>
      <div className="grid grid-cols-2 gap-4">
        {question.choices.map(choice => (
          <button
            key={choice}
            onClick={() => onAnswer(choice)}
            onTouchEnd={(e) => e.currentTarget.blur()}
            className={selected === choice
              ? 'game-btn border-3 border-navy bg-blue-50 text-navy scale-105 px-4 py-5 focus:outline-none relative'
              : 'game-btn bg-purple-100/10 hover:bg-purple-100/20 text-navy border-2 border-purple-200/30 px-4 py-5 focus:outline-none'}
          >
            {choice}
            {selected === choice && <span className="absolute top-1 right-2 text-navy text-sm">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function WordCategoriesPage() {
  return (
    <GameShell
      skillArea="word_wizard"
      subGame="word_categories"
      renderQuestion={CategoryQuestion}
    />
  );
}
