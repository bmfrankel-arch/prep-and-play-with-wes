'use client';

import GameShell from '@/components/GameShell';
import NumberLine from '@/components/NumberLine';
import { GameQuestion, DifficultyLevel } from '@/lib/types';

// Render equation with blank box for __ (double underscore)
function StyledEquation({ text }: { text: string }) {
  // Split on __ or standalone x/y/n (backwards compatibility)
  const parts = text.split(/(__|\b[xyn]\b)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part === '__' || part === 'x' || part === 'y' || part === 'n') {
          return (
            <span key={i}
              className="inline-flex items-center justify-center border-3 border-dashed border-navy rounded-lg mx-1 text-3xl min-w-[60px] min-h-[50px] text-navy font-extrabold"
              style={{ borderWidth: '3px', borderStyle: 'dashed' }}>
              ?
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function AlgebraQuestion(question: GameQuestion, onAnswer: (a: string) => void, level: DifficultyLevel, selected?: string | null) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg text-center">
      <h2 className="text-2xl font-extrabold text-navy mb-4">Find the Missing Number!</h2>
      <div className="bg-sunshine/10 rounded-2xl p-6 mb-6">
        <p className="text-4xl font-extrabold text-navy tracking-wide leading-relaxed">
          <StyledEquation text={question.question} />
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        {question.choices.map(choice => (
          <button key={choice} onClick={() => onAnswer(choice)} onTouchEnd={e => e.currentTarget.blur()}
            className={selected === choice
              ? 'game-btn border-3 border-navy bg-blue-50 text-navy scale-105 text-3xl font-extrabold px-4 py-6 focus:outline-none relative'
              : 'game-btn bg-gold/10 text-navy border-2 border-gold/30 text-3xl font-extrabold px-4 py-6 focus:outline-none'}>
            {choice}
            {selected === choice && <span className="absolute top-1 right-2 text-navy text-sm">✓</span>}
          </button>
        ))}
      </div>
      {level <= 2 && <NumberLine max={20} />}
    </div>
  );
}

export default function AlgebraPuzzlesPage() {
  return <GameShell skillArea="math_explorer" subGame="algebra_puzzles" renderQuestion={AlgebraQuestion} />;
}
