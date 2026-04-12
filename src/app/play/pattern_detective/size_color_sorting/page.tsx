'use client';

import GameShell from '@/components/GameShell';
import { GameQuestion, DifficultyLevel } from '@/lib/types';

const COLOR_MAP: Record<string, string> = {
  red: 'bg-red-500', blue: 'bg-blue-500', yellow: 'bg-yellow-400',
  green: 'bg-green-500', purple: 'bg-purple-500', orange: 'bg-orange-500',
  pink: 'bg-pink-400', black: 'bg-gray-800', white: 'bg-white border-2 border-gray-300',
};

function renderShape(desc: string, idx: number) {
  const lower = desc.toLowerCase();
  const isBig = lower.includes('big') || lower.includes('large');
  const size = isBig ? 'w-16 h-16' : 'w-10 h-10';
  const color = Object.keys(COLOR_MAP).find(c => lower.includes(c));
  const bg = color ? COLOR_MAP[color] : 'bg-gray-400';
  const isSquare = lower.includes('square') || lower.includes('block');
  const shape = isSquare ? 'rounded-md' : 'rounded-full';

  return (
    <div key={idx} className="flex flex-col items-center gap-1">
      <div className={`${size} ${bg} ${shape}`} />
      <span className="text-xs text-gray-500">{desc}</span>
    </div>
  );
}

function SortingQuestion(question: GameQuestion, onAnswer: (a: string) => void, _level: DifficultyLevel, selected?: string | null) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg text-center">
      <h2 className="text-2xl font-extrabold text-navy mb-4">Size & Color Sorting 📏🎨</h2>
      {question.objects && question.objects.length > 0 && (
        <div className="flex flex-wrap gap-4 justify-center mb-4">
          {question.objects.map((obj, i) => renderShape(obj, i))}
        </div>
      )}
      <p className="text-xl text-gray-700 mb-6">{question.question}</p>
      <div className="grid grid-cols-2 gap-4">
        {question.choices.map(choice => (
          <button
            key={choice}
            onClick={() => onAnswer(choice)}
            onTouchEnd={(e) => e.currentTarget.blur()}
            className={selected === choice
              ? 'game-btn border-3 border-navy bg-blue-50 text-navy scale-105 px-4 py-5 focus:outline-none relative'
              : 'game-btn bg-blue-50/10 hover:bg-blue-50/20 text-navy border-2 border-blue-200/30 px-4 py-5 focus:outline-none'}
          >
            {choice}
            {selected === choice && <span className="absolute top-1 right-2 text-navy text-sm">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SizeColorSortingPage() {
  return (
    <GameShell
      skillArea="pattern_detective"
      subGame="size_color_sorting"
      renderQuestion={SortingQuestion}
    />
  );
}
