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

function SortingQuestion(question: GameQuestion, onAnswer: (a: string) => void, _level: DifficultyLevel) {
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
            className="game-btn bg-blue-50 hover:bg-grass text-navy hover:text-white border-2 border-blue-200 hover:border-grass px-4 py-5 focus:outline-none"
          >
            {choice}
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
