'use client';

import GameShell from '@/components/GameShell';
import { GameQuestion, DifficultyLevel } from '@/lib/types';

function WhatWouldYouDoQuestion(question: GameQuestion, onAnswer: (a: string) => void, _level: DifficultyLevel, selected?: string | null) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg text-center">
      <h2 className="text-2xl font-extrabold text-navy mb-4">What Would You Do? 🤔</h2>
      <div className="bg-blue-50 rounded-2xl p-5 mb-6">
        <p className="text-xl text-gray-700">{question.scenario || question.question}</p>
      </div>
      <div className="space-y-3">
        {question.choices.map(choice => (
          <button
            key={choice}
            onClick={() => onAnswer(choice)}
            onTouchEnd={(e) => e.currentTarget.blur()}
            className={selected === choice
              ? 'game-btn w-full border-3 border-navy bg-blue-50 text-navy scale-105 px-4 py-4 text-lg focus:outline-none relative'
              : 'game-btn w-full bg-navy/10 hover:bg-navy/20 text-navy border-2 border-navy/30 px-4 py-4 text-lg focus:outline-none'}
          >
            {choice}
            {selected === choice && <span className="absolute top-1 right-2 text-navy text-sm">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function WhatWouldYouDoPage() {
  return (
    <GameShell
      skillArea="confidence_coach"
      subGame="what_would_you_do"
      renderQuestion={WhatWouldYouDoQuestion}
      isParentGuided
    />
  );
}
