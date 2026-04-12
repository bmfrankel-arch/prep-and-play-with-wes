'use client';

import GameShell from '@/components/GameShell';
import { GameQuestion, DifficultyLevel } from '@/lib/types';

function ShapeQuestion(question: GameQuestion, onAnswer: (a: string) => void, _level: DifficultyLevel, selected?: string | null) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg text-center">
      <h2 className="text-2xl font-extrabold text-navy mb-4">What Comes Next? 🔍</h2>
      <div className="bg-grass/10 rounded-2xl p-6 mb-6">
        <p className="text-4xl tracking-widest">
          {question.emoji_pattern || question.question}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {question.choices.map(choice => (
          <button
            key={choice}
            onClick={() => onAnswer(choice)}
            onTouchEnd={(e) => e.currentTarget.blur()}
            className={selected === choice
              ? 'game-btn border-3 border-navy bg-blue-50 text-navy scale-105 text-4xl px-4 py-6 focus:outline-none relative'
              : 'game-btn bg-grass/10 hover:bg-grass/20 text-4xl border-2 border-grass/30 px-4 py-6 focus:outline-none'}
          >
            {choice}
            {selected === choice && <span className="absolute top-1 right-2 text-navy text-sm">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ShapeSequencesPage() {
  return (
    <GameShell
      skillArea="pattern_detective"
      subGame="shape_sequences"
      renderQuestion={ShapeQuestion}
    />
  );
}
