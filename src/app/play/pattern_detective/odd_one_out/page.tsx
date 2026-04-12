'use client';

import GameShell from '@/components/GameShell';
import { GameQuestion, DifficultyLevel } from '@/lib/types';

function OddOneOutQuestion(question: GameQuestion, onAnswer: (a: string) => void, _level: DifficultyLevel) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg text-center">
      <h2 className="text-2xl font-extrabold text-navy mb-4">Which Is Different? 👀</h2>
      {question.objects && question.objects.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {question.objects.map((obj, i) => (
            <span key={i} className="bg-green-50 text-navy px-3 py-2 rounded-xl font-bold text-lg">
              {obj}
            </span>
          ))}
        </div>
      )}
      <p className="text-lg text-gray-600 mb-6">{question.question}</p>
      <div className="grid grid-cols-2 gap-4">
        {question.choices.map(choice => (
          <button
            key={choice}
            onClick={() => onAnswer(choice)}
            onTouchEnd={(e) => e.currentTarget.blur()}
            className="game-btn bg-green-50 hover:bg-grass text-navy hover:text-white border-2 border-green-200 hover:border-grass px-4 py-5 focus:outline-none"
          >
            {choice}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function OddOneOutPage() {
  return (
    <GameShell
      skillArea="pattern_detective"
      subGame="odd_one_out"
      renderQuestion={OddOneOutQuestion}
    />
  );
}
