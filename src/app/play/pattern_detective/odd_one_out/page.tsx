'use client';

import GameShell from '@/components/GameShell';
import { GameQuestion, DifficultyLevel } from '@/lib/types';

// Comprehensive emoji map — guaranteed to render on iOS and Chrome
const EMOJI_MAP: Record<string, string> = {
  // Fruits
  apple: '🍎', banana: '🍌', orange: '🍊', grape: '🍇', grapes: '🍇',
  strawberry: '🍓', watermelon: '🍉', lemon: '🍋', peach: '🍑',
  pear: '🍐', cherry: '🍒', tomato: '🍅', mango: '🥭', kiwi: '🥝',
  blueberry: '🫐', pineapple: '🍍', coconut: '🥥',
  // Vegetables
  carrot: '🥕', broccoli: '🥦', corn: '🌽', potato: '🥔',
  // Animals
  dog: '🐶', cat: '🐱', rabbit: '🐰', bear: '🐻', fox: '🦊',
  tiger: '🐯', lion: '🦁', cow: '🐮', pig: '🐷', chicken: '🐔',
  duck: '🦆', frog: '🐸', fish: '🐟', butterfly: '🦋', bee: '🐝',
  bird: '🐦', elephant: '🐘', horse: '🐴', monkey: '🐒', mouse: '🐭',
  snake: '🐍', turtle: '🐢', whale: '🐋', dolphin: '🐬', octopus: '🐙',
  // Vehicles
  car: '🚗', bus: '🚌', train: '🚂', plane: '✈️', boat: '⛵',
  bicycle: '🚲', truck: '🚛', rocket: '🚀', helicopter: '🚁',
  // Nature
  tree: '🌳', flower: '🌸', sun: '☀️', moon: '🌙', star: '⭐',
  cloud: '☁️', rainbow: '🌈', fire: '🔥', snowflake: '❄️', snow: '❄️',
  rain: '🌧️', leaf: '🍃', rose: '🌹', mushroom: '🍄', water: '💧',
  // Objects
  house: '🏠', book: '📚', shoe: '👟', hat: '🎩', cup: '☕',
  ball: '⚽', balloon: '🎈', pencil: '✏️', scissors: '✂️', crown: '👑',
  shirt: '👕', key: '🔑', phone: '📱', clock: '🕐', chair: '🪑',
  // Food
  cake: '🎂', candy: '🍬', cookie: '🍪', pizza: '🍕', bread: '🍞',
  // Shapes
  heart: '❤️', circle: '🔴', red: '🔴', blue: '🔵', green: '🟢',
  yellow: '🟡', purple: '🟣',
};

function getEmoji(name: string): string {
  const lower = name.toLowerCase();
  // Exact match first
  if (EMOJI_MAP[lower]) return EMOJI_MAP[lower];
  // Partial match
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (lower.includes(key)) return emoji;
  }
  return '❓';
}

function OddOneOutQuestion(question: GameQuestion, onAnswer: (a: string) => void, _level: DifficultyLevel, selected?: string | null) {
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
          <button key={choice} onClick={() => onAnswer(choice)} onTouchEnd={e => e.currentTarget.blur()}
            className={selected === choice
              ? 'game-btn border-3 border-navy bg-blue-50 text-navy scale-105 px-4 py-5 focus:outline-none flex flex-col items-center gap-1 relative'
              : 'game-btn bg-green-50/50 text-navy border-2 border-green-200/30 px-4 py-5 focus:outline-none flex flex-col items-center gap-1'}>
            <span className="text-4xl">{getEmoji(choice)}</span>
            <span className="text-base">{choice}</span>
            {selected === choice && <span className="absolute top-1 right-2 text-navy text-sm">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function OddOneOutPage() {
  return <GameShell skillArea="pattern_detective" subGame="odd_one_out" renderQuestion={OddOneOutQuestion} />;
}
