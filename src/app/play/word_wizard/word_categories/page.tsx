'use client';

import GameShell from '@/components/GameShell';
import { GameQuestion, DifficultyLevel } from '@/lib/types';

function CategoryQuestion(question: GameQuestion, onAnswer: (a: string) => void, _level: DifficultyLevel) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg text-center">
      <h2 className="text-2xl font-extrabold text-navy mb-4">Which Doesn&apos;t Belong? 🔤</h2>
      <p className="text-lg text-gray-500 mb-6">Tap the word that doesn&apos;t fit with the others!</p>
      <div className="grid grid-cols-2 gap-4">
        {question.choices.map(choice => (
          <button
            key={choice}
            onClick={() => onAnswer(choice)}
            className="game-btn bg-purple-100 hover:bg-purple-500 text-navy hover:text-white border-2 border-purple-200 hover:border-purple-500 px-4 py-5"
          >
            {choice}
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
