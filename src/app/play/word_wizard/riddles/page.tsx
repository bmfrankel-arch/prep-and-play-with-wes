'use client';

import GameShell from '@/components/GameShell';
import { GameQuestion, DifficultyLevel } from '@/lib/types';

function choiceCls(choice: string, selected?: string | null): string {
  if (selected === choice) return 'game-btn border-3 border-navy bg-blue-50 text-navy scale-105 px-4 py-5 focus:outline-none relative';
  return 'game-btn bg-coral/10 hover:bg-coral/20 text-navy border-2 border-coral/30 px-4 py-5 focus:outline-none';
}

function RiddleQuestion(question: GameQuestion, onAnswer: (a: string) => void, _level: DifficultyLevel, selected?: string | null) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg text-center">
      <h2 className="text-2xl font-extrabold text-navy mb-6">What Am I? 🤔</h2>
      <div className="space-y-3 mb-8">
        {(question.clues || [question.question]).map((clue, i) => (
          <p key={i} className="text-xl text-gray-700 bg-sunshine/20 rounded-xl p-3">💡 {clue}</p>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {question.choices.map(choice => (
          <button key={choice} onClick={() => onAnswer(choice)} onTouchEnd={e => e.currentTarget.blur()} className={choiceCls(choice, selected)}>
            {selected === choice && <span className="absolute top-1 right-2 text-navy text-sm">✓</span>}
            {choice}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RiddlesPage() {
  return <GameShell skillArea="word_wizard" subGame="riddles" renderQuestion={RiddleQuestion} />;
}
