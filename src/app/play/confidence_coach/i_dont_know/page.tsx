'use client';

import GameShell from '@/components/GameShell';
import { GameQuestion, DifficultyLevel } from '@/lib/types';

function IDontKnowQuestion(question: GameQuestion, onAnswer: (a: string) => void, _level: DifficultyLevel, selected?: string | null) {
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
            onTouchEnd={(e) => e.currentTarget.blur()}
            className={selected === choice
              ? 'game-btn w-full border-3 border-navy bg-blue-50 text-navy scale-105 px-4 py-4 text-lg focus:outline-none relative'
              : `game-btn w-full border-2 px-4 py-4 text-lg focus:outline-none ${
                choice.includes("I don't know")
                  ? 'bg-gold/10 hover:bg-gold/20 border-gold/30 text-navy font-extrabold'
                  : 'bg-gray-50/10 hover:bg-gray-50/20 border-gray-200/30 text-navy'
              }`}
          >
            {choice}
            {selected === choice && <span className="absolute top-1 right-2 text-navy text-sm">✓</span>}
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
