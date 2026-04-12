'use client';

import GameShell from '@/components/GameShell';
import { GameQuestion, DifficultyLevel } from '@/lib/types';

function StoryQuestion(question: GameQuestion, onAnswer: (a: string) => void, _level: DifficultyLevel) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg text-center">
      <h2 className="text-2xl font-extrabold text-navy mb-4">Finish the Story! 📚</h2>
      <div className="bg-sunshine/10 rounded-2xl p-5 mb-6">
        <p className="text-xl text-gray-700 leading-relaxed">
          {question.story || question.question}
        </p>
      </div>
      <p className="text-lg font-bold text-gray-500 mb-4">What happens next?</p>
      <div className="space-y-3">
        {question.choices.map(choice => (
          <button
            key={choice}
            onClick={() => onAnswer(choice)}
            className="game-btn w-full bg-grass/10 hover:bg-grass text-navy hover:text-white border-2 border-grass/30 hover:border-grass px-4 py-4 text-xl"
          >
            {choice}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function StoryFinishPage() {
  return (
    <GameShell
      skillArea="word_wizard"
      subGame="story_finish"
      renderQuestion={StoryQuestion}
    />
  );
}
