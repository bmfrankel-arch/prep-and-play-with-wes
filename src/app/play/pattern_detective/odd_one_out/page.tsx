'use client';

import GameShell from '@/components/GameShell';
import { GameQuestion, DifficultyLevel } from '@/lib/types';

const EMOJI_MAP: Record<string, string> = {
  apple: '🍎', banana: '🍌', orange: '🍊', grape: '🍇', strawberry: '🍓',
  ball: '⚽', car: '🚗', truck: '🚛', bus: '🚌', bicycle: '🚲',
  dog: '🐶', cat: '🐱', fish: '🐟', bird: '🐦', rabbit: '🐰',
  sun: '☀️', moon: '🌙', star: '⭐', cloud: '☁️', rain: '🌧️',
  flower: '🌸', tree: '🌳', leaf: '🍃', rose: '🌹', mushroom: '🍄',
  house: '🏠', book: '📚', shoe: '👟', hat: '🎩', cup: '☕',
  chair: '🪑', heart: '❤️', snow: '❄️', fire: '🔥', water: '💧',
  pencil: '✏️', scissors: '✂️', clock: '🕐', phone: '📱', key: '🔑',
  bear: '🐻', lion: '🦁', elephant: '🐘', horse: '🐴', cow: '🐄',
  cake: '🎂', candy: '🍬', cookie: '🍪', pizza: '🍕', bread: '🍞',
};

function getEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (lower.includes(key)) return emoji;
  }
  return '❓';
}

function OddOneOutQuestion(question: GameQuestion, onAnswer: (a: string) => void, _level: DifficultyLevel) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg text-center">
      <h2 className="text-2xl font-extrabold text-navy mb-4">Which Is Different? 👀</h2>
      {question.objects && question.objects.length > 0 && (
        <div className="flex flex-wrap gap-4 justify-center mb-4">
          {question.objects.map((obj, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-5xl">{getEmoji(obj)}</span>
              <span className="text-xs text-gray-500">{obj}</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-lg text-gray-600 mb-6">{question.question}</p>
      <div className="grid grid-cols-2 gap-4">
        {question.choices.map(choice => (
          <button
            key={choice}
            onClick={() => onAnswer(choice)}
            onTouchEnd={(e) => e.currentTarget.blur()}
            className="game-btn bg-green-50 hover:bg-grass text-navy hover:text-white border-2 border-green-200 hover:border-grass px-4 py-5 focus:outline-none flex flex-col items-center gap-1"
          >
            <span className="text-4xl">{getEmoji(choice)}</span>
            <span className="text-base">{choice}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function OddOneOutPage() {
  return (
    <GameShell
      skillArea="pattern_detective"
      subGame="odd_one_out"
      renderQuestion={OddOneOutQuestion}
    />
  );
}
