'use client';

import GameShell from '@/components/GameShell';
import { GameQuestion, DifficultyLevel } from '@/lib/types';

function StoryDetailQuestion(question: GameQuestion, onAnswer: (a: string) => void, _level: DifficultyLevel) {
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
            className="game-btn w-full bg-purple-100 hover:bg-purple-500 text-navy hover:text-white border-2 border-purple-200 hover:border-purple-500 px-4 py-4 text-xl"
          >
            {choice}
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
