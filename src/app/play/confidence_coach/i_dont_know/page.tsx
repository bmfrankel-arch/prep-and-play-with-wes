'use client';

import GameShell from '@/components/GameShell';
import { GameQuestion, DifficultyLevel } from '@/lib/types';

function IDontKnowQuestion(question: GameQuestion, onAnswer: (a: string) => void, _level: DifficultyLevel) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg text-center">
      <h2 className="text-2xl font-extrabold text-navy mb-4">Tricky Question! 💡</h2>
      <div className="bg-sunshine/10 rounded-2xl p-5 mb-6">
        <p className="text-xl text-gray-700">{question.question}</p>
      </div>
      <p className="text-sm text-gray-500 mb-4">Remember: It&apos;s always great to say &ldquo;I don&apos;t know, but I&apos;ll try!&rdquo;</p>
      <div className="space-y-3">
        {question.choices.map(choice => (
          <button
            key={choice}
            onClick={() => onAnswer(choice)}
            className={`game-btn w-full border-2 px-4 py-4 text-lg ${
              choice.includes("I don't know")
                ? 'bg-gold/20 hover:bg-gold border-gold/40 hover:border-gold text-navy font-extrabold'
                : 'bg-gray-50 hover:bg-navy/10 border-gray-200 hover:border-navy/30 text-navy'
            }`}
          >
            {choice}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function IDontKnowPage() {
  return (
    <GameShell
      skillArea="confidence_coach"
      subGame="i_dont_know"
      renderQuestion={IDontKnowQuestion}
      isParentGuided
    />
  );
}
