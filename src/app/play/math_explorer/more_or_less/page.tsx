'use client';

import GameShell from '@/components/GameShell';
import NumberLine from '@/components/NumberLine';
import { GameQuestion, DifficultyLevel } from '@/lib/types';

function MoreLessQuestion(question: GameQuestion, onAnswer: (a: string) => void, level: DifficultyLevel) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg text-center">
      <h2 className="text-2xl font-extrabold text-navy mb-4">More or Less? ⚖️</h2>
      <p className="text-xl text-gray-700 mb-6 leading-relaxed">{question.question}</p>
      <div className="grid grid-cols-2 gap-4 mb-4">
        {question.choices.map(choice => (
          <button
            key={choice}
            onClick={() => onAnswer(choice)}
            className="game-btn bg-blue-50 hover:bg-navy text-navy hover:text-white border-2 border-blue-200 hover:border-navy text-2xl font-extrabold px-4 py-5"
          >
            {choice}
          </button>
        ))}
      </div>
      {level <= 2 && <NumberLine max={100} />}
    </div>
  );
}

export default function MoreOrLessPage() {
  return (
    <GameShell
      skillArea="math_explorer"
      subGame="more_or_less"
      renderQuestion={MoreLessQuestion}
    />
  );
}
