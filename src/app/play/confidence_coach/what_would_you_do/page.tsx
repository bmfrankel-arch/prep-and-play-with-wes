'use client';

import GameShell from '@/components/GameShell';
import { GameQuestion, DifficultyLevel } from '@/lib/types';

function WhatWouldYouDoQuestion(question: GameQuestion, onAnswer: (a: string) => void, _level: DifficultyLevel) {
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
            className="game-btn w-full bg-navy/5 hover:bg-navy text-navy hover:text-white border-2 border-navy/20 hover:border-navy px-4 py-4 text-lg"
          >
            {choice}
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
