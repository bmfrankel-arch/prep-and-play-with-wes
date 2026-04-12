'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SkillArea, SubGame, SKILL_CONFIG, DifficultyLevel, LEVEL_NAMES, GameQuestion } from '@/lib/types';
import { getSkillProgress, updateSkillProgress, saveGameSession, saveWord, getParentSettings } from '@/lib/db';
import { playCorrectSound, playWrongSound } from '@/lib/audio';
import { speak, stopSpeaking } from '@/lib/speech';
import Confetti from './Confetti';
import LevelUpSequence from './LevelUpSequence';
import PronunciationChallenge from './PronunciationChallenge';

interface GameShellProps {
  skillArea: SkillArea;
  subGame: SubGame;
  totalQuestions?: number;
  renderQuestion: (
    question: GameQuestion,
    onAnswer: (answer: string) => void,
    level: DifficultyLevel,
  ) => React.ReactNode;
  isParentGuided?: boolean;
}

export default function GameShell({
  skillArea,
  subGame,
  totalQuestions = 5,
  renderQuestion,
  isParentGuided: _isParentGuided = false,
}: GameShellProps) {
  const router = useRouter();
  const config = SKILL_CONFIG[skillArea];

  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState<DifficultyLevel>(1);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [consecutiveWrong, setConsecutiveWrong] = useState(0);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState<DifficultyLevel>(2);
  const [showPronunciation, setShowPronunciation] = useState(false);
  const [currentCorrectAnswer, setCurrentCorrectAnswer] = useState('');
  const [gameComplete, setGameComplete] = useState(false);
  const [settings, setSettings] = useState(getParentSettings());
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async (lvl: DifficultyLevel) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillArea,
          subGame,
          level: lvl,
          count: totalQuestions,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }
      setQuestions(data.questions || []);
    } catch {
      setError('Could not load questions. Check your API key and try again.');
    }
    setLoading(false);
  }, [skillArea, subGame, totalQuestions]);

  useEffect(() => {
    (async () => {
      const progress = await getSkillProgress(skillArea);
      const lvl = progress.current_level as DifficultyLevel;
      setLevel(lvl);
      setConsecutiveCorrect(progress.consecutive_correct);
      setConsecutiveWrong(progress.consecutive_wrong);
      setSettings(getParentSettings());
      await fetchQuestions(lvl);
    })();
  }, [skillArea, fetchQuestions]);

  // Failsafe: clear feedback toast after 2s no matter what
  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 2000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  // Auto-read question aloud
  useEffect(() => {
    const autoRead = settings.auto_read_questions !== false; // default true
    if (!loading && questions[currentIndex] && autoRead) {
      const q = questions[currentIndex];
      // Use tts_reading if available (e.g. algebra equations), otherwise fall back
      const text = q.tts_reading || (q.clues ? q.clues.join('. ') : q.story || q.scenario || q.question || '');
      if (text) {
        const timer = setTimeout(() => speak(text), 500);
        return () => { clearTimeout(timer); stopSpeaking(); };
      }
    }
  }, [currentIndex, loading, questions, settings.auto_read_questions]);

  const handleAnswer = async (answer: string) => {
    const question = questions[currentIndex];
    if (!question) return;

    const isCorrect = answer === question.correct_answer;

    if (isCorrect) {
      playCorrectSound();
      setScore(s => s + 1);
      setShowConfetti(true);
      setFeedback('correct');
      setCurrentCorrectAnswer(question.correct_answer);
      setTimeout(() => setShowConfetti(false), 2000);

      const newConsCorrect = consecutiveCorrect + 1;
      setConsecutiveCorrect(newConsCorrect);
      setConsecutiveWrong(0);

      // Check for level up
      if (newConsCorrect >= 3 && level < 3) {
        const nextLevel = (level + 1) as DifficultyLevel;
        setNewLevel(nextLevel);

        // Check pronunciation for Word Wizard
        if (skillArea === 'word_wizard' && settings.pronunciation_mode && question.syllable_breakdown) {
          setShowPronunciation(true);
          return; // Don't advance yet — pronunciation challenge will handle it
        }

        // Update progress
        const progress = await getSkillProgress(skillArea);
        const unlocks = [...progress.unlocks_earned];
        const unlockName = config.unlocks[nextLevel]?.name;
        if (unlockName && !unlocks.includes(unlockName)) unlocks.push(unlockName);
        await updateSkillProgress({
          ...progress,
          current_level: nextLevel,
          consecutive_correct: 0,
          consecutive_wrong: 0,
          unlocks_earned: unlocks,
        });
        setLevel(nextLevel);
        setConsecutiveCorrect(0);

        // Show level up
        setTimeout(() => {
          setFeedback(null);
          setShowLevelUp(true);
        }, 1500);
        return;
      }

      // Check pronunciation for Word Wizard (no level up)
      if (skillArea === 'word_wizard' && settings.pronunciation_mode && question.syllable_breakdown) {
        setShowPronunciation(true);
        return;
      }

      // Update progress
      await updateSkillProgress({
        ...(await getSkillProgress(skillArea)),
        consecutive_correct: newConsCorrect,
        consecutive_wrong: 0,
      });
    } else {
      playWrongSound();
      setFeedback('wrong');

      const newConsWrong = consecutiveWrong + 1;
      setConsecutiveWrong(newConsWrong);
      setConsecutiveCorrect(0);

      // Check for level down
      if (newConsWrong >= 2 && level > 1) {
        const prevLevel = (level - 1) as DifficultyLevel;
        setLevel(prevLevel);
        await updateSkillProgress({
          ...(await getSkillProgress(skillArea)),
          current_level: prevLevel,
          consecutive_correct: 0,
          consecutive_wrong: 0,
        });
        setConsecutiveWrong(0);
      } else {
        await updateSkillProgress({
          ...(await getSkillProgress(skillArea)),
          consecutive_correct: 0,
          consecutive_wrong: newConsWrong,
        });
      }
    }

    // Advance after feedback delay — 1.5s max
    setTimeout(() => {
      setFeedback(null);
      advanceQuestion();
    }, 1500);
  };

  const advanceQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      finishGame();
    } else {
      setCurrentIndex(i => i + 1);
    }
  };

  const handlePronunciationComplete = async (_success: boolean) => {
    setShowPronunciation(false);

    // Save word to collection
    const question = questions[currentIndex];
    if (question) {
      await saveWord({
        word: question.correct_answer,
        definition: question.definition || '',
        example_sentence: question.example_sentence || '',
        syllable_breakdown: question.syllable_breakdown || '',
      });
    }

    if (showLevelUp) return; // Level up will handle advancing

    // Check if we should show level up now
    if (consecutiveCorrect >= 3 && level < 3) {
      const nextLevel = (level + 1) as DifficultyLevel;
      const progress = await getSkillProgress(skillArea);
      const unlocks = [...progress.unlocks_earned];
      const unlockName = config.unlocks[nextLevel]?.name;
      if (unlockName && !unlocks.includes(unlockName)) unlocks.push(unlockName);
      await updateSkillProgress({
        ...progress,
        current_level: nextLevel,
        consecutive_correct: 0,
        consecutive_wrong: 0,
        unlocks_earned: unlocks,
      });
      setLevel(nextLevel);
      setConsecutiveCorrect(0);
      setNewLevel(nextLevel);
      setFeedback(null);
      setShowLevelUp(true);
      return;
    }

    setFeedback(null);
    advanceQuestion();
  };

  const handleLevelUpComplete = () => {
    setShowLevelUp(false);
    advanceQuestion();
  };

  const finishGame = async () => {
    await saveGameSession({
      skill_area: skillArea,
      sub_game: subGame,
      score,
      total_questions: questions.length,
      child_name: 'Wes',
    });
    setGameComplete(true);
  };

  if (showLevelUp) {
    return <LevelUpSequence skillArea={skillArea} newLevel={newLevel} onComplete={handleLevelUpComplete} />;
  }

  if (showPronunciation && questions[currentIndex]) {
    const q = questions[currentIndex];
    return (
      <PronunciationChallenge
        word={q.correct_answer}
        syllableBreakdown={q.syllable_breakdown || q.correct_answer}
        definition={q.definition || ''}
        exampleSentence={q.example_sentence || ''}
        microphoneMode={settings.microphone_mode}
        showSyllableHint={settings.show_syllable_hint}
        onComplete={handlePronunciationComplete}
      />
    );
  }

  if (gameComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Confetti duration={4000} />
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl">
          <p className="text-6xl mb-4">🌟</p>
          <h2 className="text-3xl font-extrabold text-navy mb-2">Nice work, Wes!</h2>
          <p className="text-xl text-gray-600 mb-4">
            You got {score} out of {questions.length} correct!
          </p>
          <div className="flex justify-center gap-2 mb-6">
            {Array.from({ length: questions.length }, (_, i) => (
              <span key={i} className={`text-2xl ${i < score ? 'star-filled' : 'star-empty'}`}>★</span>
            ))}
          </div>
          <div className="text-lg mb-6">
            <span className="inline-block px-4 py-2 rounded-full bg-navy/10 font-bold">
              Level: {LEVEL_NAMES[level]} {config.badges[level]}
            </span>
          </div>

          {settings.show_assessment_prompt && (
            <div className="mb-6 p-4 bg-sunshine/20 rounded-2xl">
              <p className="text-lg font-bold text-navy mb-3">Ready for your quiz?</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => router.push(`/assessment?skill=${skillArea}&level=${level}`)}
                  className="bg-navy text-white font-bold px-6 py-3 rounded-xl"
                >
                  Let&apos;s Do It! ✏️
                </button>
                <button
                  onClick={() => {}}
                  className="bg-gray-200 text-gray-600 font-bold px-6 py-3 rounded-xl"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setCurrentIndex(0);
                setScore(0);
                setGameComplete(false);
                fetchQuestions(level);
              }}
              className="game-btn bg-grass text-white px-6"
            >
              Play Again!
            </button>
            <button
              onClick={() => router.push('/')}
              className="game-btn bg-navy text-white px-6"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-bounce-slow mb-4">{config.badges[level]}</div>
          <p className="text-2xl font-bold text-navy">Loading questions...</p>
          <p className="text-gray-500 mt-2">{config.label}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl">
          <p className="text-5xl mb-4">😕</p>
          <h2 className="text-2xl font-bold text-navy mb-4">Oops!</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => fetchQuestions(level)} className="game-btn bg-grass text-white px-6">
              Try Again
            </button>
            <button onClick={() => router.push('/')} className="game-btn bg-navy text-white px-6">
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentIndex];
  if (!question) return null;

  return (
    <div className="min-h-screen p-4 md:p-6">
      {showConfetti && <Confetti duration={2000} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push(`/play/${skillArea}`)}
          className="text-navy font-bold text-lg hover:text-coral transition-colors"
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.badges[level]}</span>
          <span className="text-sm font-bold text-navy">{LEVEL_NAMES[level]}</span>
        </div>
      </div>

      {/* Star progress */}
      <div className="flex justify-center gap-2 mb-6">
        {Array.from({ length: totalQuestions }, (_, i) => (
          <span key={i} className={`text-2xl ${i < currentIndex + (feedback === 'correct' ? 1 : 0) ? (i < score + (feedback === 'correct' ? 1 : 0) ? 'star-filled' : 'star-empty') : 'star-empty'}`}>
            {i < currentIndex ? (i < score ? '★' : '☆') : '☆'}
          </span>
        ))}
      </div>

      {/* Speaker button */}
      <div className="flex justify-center mb-3">
        <button
          onClick={() => {
            const q = questions[currentIndex];
            if (!q) return;
            const text = q.tts_reading || (q.clues ? q.clues.join('. ') : q.story || q.scenario || q.question || '');
            if (text) speak(text);
          }}
          className="text-4xl active:scale-90 transition-transform"
          aria-label="Read aloud"
        >
          🔊
        </button>
      </div>

      {/* Question */}
      <div className="max-w-2xl mx-auto">
        {renderQuestion(question, handleAnswer, level)}
      </div>

      {/* Feedback toast — bottom of screen, 1.5s max */}
      {feedback && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-fade-in">
          <div className={`text-center px-8 py-5 rounded-3xl shadow-2xl ${
            feedback === 'correct' ? 'bg-grass/95' : 'bg-white/95 border border-gray-200'
          }`}>
            {feedback === 'correct' ? (
              <p className="text-2xl font-extrabold text-white">🎉 Great job, Wes!</p>
            ) : (
              <>
                <p className="text-xl font-bold text-navy">💪 Good try!</p>
                <p className="text-base text-gray-600">
                  Answer: <strong className="text-coral">{currentCorrectAnswer || questions[currentIndex]?.correct_answer}</strong>
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
