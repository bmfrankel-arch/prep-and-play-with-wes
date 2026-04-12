'use client';

import GameShell from '@/components/GameShell';
import { GameQuestion, DifficultyLevel } from '@/lib/types';

function RiddleQuestion(question: GameQuestion, onAnswer: (a: string) => void, _level: DifficultyLevel) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg text-center">
      <h2 className="text-2xl font-extrabold text-navy mb-6">What Am I? 🤔</h2>
      <div className="space-y-3 mb-8">
        {(question.clues || [question.question]).map((clue, i) => (
          <p key={i} className="text-xl text-gray-700 bg-sunshine/20 rounded-xl p-3">
            💡 {clue}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {question.choices.map(choice => (
          <button
            key={choice}
            onClick={() => onAnswer(choice)}
            className="game-btn bg-coral/10 hover:bg-coral text-navy hover:text-white border-2 border-coral/30 hover:border-coral px-4 py-5"
          >
            {choice}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RiddlesPage() {
  return (
    <GameShell
      skillArea="word_wizard"
      subGame="riddles"
      renderQuestion={RiddleQuestion}
    />
  );
}
