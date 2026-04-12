'use client';

import GameShell from '@/components/GameShell';
import { GameQuestion, DifficultyLevel } from '@/lib/types';

function SortingQuestion(question: GameQuestion, onAnswer: (a: string) => void, _level: DifficultyLevel) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg text-center">
      <h2 className="text-2xl font-extrabold text-navy mb-4">Size & Color Sorting 📏🎨</h2>
      {question.objects && question.objects.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {question.objects.map((obj, i) => (
            <span key={i} className="bg-blue-50 text-navy px-3 py-2 rounded-xl font-bold text-lg">
              {obj}
            </span>
          ))}
        </div>
      )}
      <p className="text-xl text-gray-700 mb-6">{question.question}</p>
      <div className="grid grid-cols-2 gap-4">
        {question.choices.map(choice => (
          <button
            key={choice}
            onClick={() => onAnswer(choice)}
            className="game-btn bg-blue-50 hover:bg-grass text-navy hover:text-white border-2 border-blue-200 hover:border-grass px-4 py-5"
          >
            {choice}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SizeColorSortingPage() {
  return (
    <GameShell
      skillArea="pattern_detective"
      subGame="size_color_sorting"
      renderQuestion={SortingQuestion}
    />
  );
}
