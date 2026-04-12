'use client';

import GameShell from '@/components/GameShell';
import NumberLine from '@/components/NumberLine';
import { GameQuestion, DifficultyLevel } from '@/lib/types';

function CountingQuestion(question: GameQuestion, onAnswer: (a: string) => void, level: DifficultyLevel) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg text-center">
      <h2 className="text-2xl font-extrabold text-navy mb-4">Counting Adventure! 🧮</h2>
      {question.emoji_visual && level <= 2 && (
        <div className="text-3xl mb-4 bg-sunshine/10 rounded-2xl p-4">
          {question.emoji_visual}
        </div>
      )}
      <p className="text-xl text-gray-700 mb-6 leading-relaxed">{question.question}</p>
      <div className="grid grid-cols-2 gap-4 mb-4">
        {question.choices.map(choice => (
          <button
            key={choice}
            onClick={() => onAnswer(choice)}
            onTouchEnd={(e) => e.currentTarget.blur()}
            className="game-btn bg-sunshine/20 hover:bg-sunshine text-navy border-2 border-sunshine/40 hover:border-sunshine text-3xl font-extrabold px-4 py-6 focus:outline-none"
          >
            {choice}
          </button>
        ))}
      </div>
      {level <= 2 && <NumberLine max={level === 1 ? 20 : 50} />}
    </div>
  );
}

export default function CountingAdventuresPage() {
  return (
    <GameShell
      skillArea="math_explorer"
      subGame="counting_adventures"
      renderQuestion={CountingQuestion}
    />
  );
}
