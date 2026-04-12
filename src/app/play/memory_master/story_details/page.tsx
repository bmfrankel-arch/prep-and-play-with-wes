'use client';

import GameShell from '@/components/GameShell';
import { GameQuestion, DifficultyLevel } from '@/lib/types';

function StoryDetailQuestion(question: GameQuestion, onAnswer: (a: string) => void, _level: DifficultyLevel, selected?: string | null) {
  // For story details, the API returns a story and questions within.
  // We display the story and the first available question.
  const storyText = question.story || question.question;
  const subQ = question.questions?.[0] || question;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg text-center">
      <h2 className="text-2xl font-extrabold text-navy mb-4">Story Time! 📖</h2>
      <div className="bg-purple-50 rounded-2xl p-5 mb-6">
        <p className="text-xl text-gray-700 leading-relaxed">{storyText}</p>
      </div>
      <p className="text-xl font-bold text-navy mb-4">
        {(subQ as { question?: string }).question || question.question}
      </p>
      <div className="space-y-3">
        {((subQ as { choices?: string[] }).choices || question.choices || []).map((choice: string) => (
          <button
            key={choice}
            onClick={() => onAnswer(choice)}
            onTouchEnd={(e) => e.currentTarget.blur()}
            className={selected === choice
              ? 'game-btn w-full border-3 border-navy bg-blue-50 text-navy scale-105 px-4 py-4 text-xl focus:outline-none relative'
              : 'game-btn w-full bg-purple-100/10 hover:bg-purple-100/20 text-navy border-2 border-purple-200/30 px-4 py-4 text-xl focus:outline-none'}
          >
            {choice}
            {selected === choice && <span className="absolute top-1 right-2 text-navy text-sm">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function StoryDetailsPage() {
  return (
    <GameShell
      skillArea="memory_master"
      subGame="story_details"
      renderQuestion={StoryDetailQuestion}
    />
  );
}
