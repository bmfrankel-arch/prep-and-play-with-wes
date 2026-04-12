'use client';

import GameShell from '@/components/GameShell';
import NumberLine from '@/components/NumberLine';
import { GameQuestion, DifficultyLevel } from '@/lib/types';

function AlgebraQuestion(question: GameQuestion, onAnswer: (a: string) => void, level: DifficultyLevel) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg text-center">
      <h2 className="text-2xl font-extrabold text-navy mb-4">Find the Missing Number! ⭐</h2>
      <div className="bg-sunshine/10 rounded-2xl p-6 mb-6">
        <p className="text-4xl font-extrabold text-navy tracking-wide">
          {question.question}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        {question.choices.map(choice => (
          <button
            key={choice}
            onClick={() => onAnswer(choice)}
            className="game-btn bg-gold/20 hover:bg-gold text-navy border-2 border-gold/40 hover:border-gold text-3xl font-extrabold px-4 py-6"
          >
            {choice}
          </button>
        ))}
      </div>
      {level <= 2 && <NumberLine max={level === 1 ? 20 : 50} />}
    </div>
  );
}

export default function AlgebraPuzzlesPage() {
  return (
    <GameShell
      skillArea="math_explorer"
      subGame="algebra_puzzles"
      renderQuestion={AlgebraQuestion}
    />
  );
}
