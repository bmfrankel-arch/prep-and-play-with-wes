'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SkillArea, SubGame, SKILL_CONFIG, DifficultyLevel, LEVEL_NAMES, GameQuestion } from '@/lib/types';
import { getSkillProgress, updateSkillProgress, saveGameSession, saveWord, getParentSettings } from '@/lib/db';
import { playCorrectSound, playWrongSound } from '@/lib/audio';
import { speakQuestion, speakChoices, speak, stopSpeaking, shouldAutoRead, shouldReadChoices } from '@/lib/speech';
import { getFallbackQuestions } from '@/data/fallbacks';
import { generateFallbackWorkShown, WorkShown } from '@/lib/mathExplainer';
import Confetti from './Confetti';
import LevelUpSequence from './LevelUpSequence';
import PronunciationChallenge from './PronunciationChallenge';
import PostSessionFlow from './PostSessionFlow';
import { calculateXp, XpSource } from '@/lib/animalLeveling';

// Check prefetch cache (window-level shared with prefetch.ts)
function getPrefetchedQuestions(skill: string, sub: string, lvl: number): GameQuestion[] | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cache = (window as any).__ppw_cache;
  if (!cache) return null;
  const key = `${skill}_${sub}_${lvl}`;
  const cached = cache[key];
  if (cached?.length) {
    delete cache[key]; // consume once
    return cached;
  }
  return null;
}

interface GameShellProps {
  skillArea: SkillArea;
  subGame: SubGame;
  totalQuestions?: number;
  renderQuestion: (
    question: GameQuestion,
    onAnswer: (answer: string) => void,
    level: DifficultyLevel,
    selectedAnswer?: string | null,
    feedback?: 'correct' | 'wrong' | null,
    correctAnswer?: string,
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
  const [gameComplete, setGameComplete] = useState(false);
  const [settings, setSettings] = useState(getParentSettings());
  const [error, setError] = useState<string | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showMathWork, setShowMathWork] = useState(false);
  const [currentWorkShown, setCurrentWorkShown] = useState<WorkShown | null>(null);
  const [workButtonReady, setWorkButtonReady] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanationText, setExplanationText] = useState('');
  const [explanationReady, setExplanationReady] = useState(false);
  const [questionHistory, setQuestionHistory] = useState<string[]>([]);
  const [showPostFlow, setShowPostFlow] = useState(false);

  const fetchQuestions = useCallback(async (lvl: DifficultyLevel, history: string[] = []) => {
    setLoading(true);
    setError(null);
    setIsFallback(false);

    // Check prefetch cache first (skip cache if we have history — we want fresh questions)
    if (history.length === 0) {
      const cached = getPrefetchedQuestions(skillArea, subGame, lvl);
      if (cached) {
        setQuestions(cached);
        setLoading(false);
        return;
      }
    }

    // Try API with timeout and auto-retry
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skillArea, subGame, level: lvl, count: totalQuestions, previousQuestions: history }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const data = await res.json();
        if (data.questions?.length) {
          setQuestions(data.questions);
          if (data.is_fallback) setIsFallback(true);
          setLoading(false);
          return;
        }
        if (data.error && attempt === 0) {
          // Retry once after 1s
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
      } catch (err) {
        console.error(`Fetch attempt ${attempt + 1} failed:`, err);
        if (attempt === 0) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
      }
    }

    // Both attempts failed — use fallback
    const fallback = getFallbackQuestions(skillArea, subGame, lvl) as GameQuestion[] | null;
    if (fallback?.length) {
      setQuestions(fallback);
      setIsFallback(true);
      setLoading(false);
      return;
    }

    setError('Could not load questions. Tap Try Again or check your connection.');
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

  // 15s loading failsafe — never show spinner forever
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      if (loading) {
        const fb = getFallbackQuestions(skillArea, subGame, level) as GameQuestion[] | null;
        if (fb?.length) { setQuestions(fb); setIsFallback(true); setLoading(false); }
        else { setError('Taking too long. Please try again.'); setLoading(false); }
      }
    }, 15000);
    return () => clearTimeout(t);
  }, [loading, skillArea, subGame, level]);

  // Failsafe: ensure feedback can't get stuck — but NOT while a panel is up,
  // since red/green highlighting and panel headers depend on `feedback` remaining set.
  useEffect(() => {
    if (feedback && !showMathWork && !showExplanation) {
      const t = setTimeout(() => setFeedback(null), 15000);
      return () => clearTimeout(t);
    }
  }, [feedback, showMathWork, showExplanation]);

  // Auto-read question aloud (British accent via centralized TTS)
  // Math Explorer: read question only, never read answer choices (child should calculate independently)
  const isMathExplorer = skillArea === 'math_explorer';

  useEffect(() => {
    if (!loading && questions[currentIndex] && shouldAutoRead()) {
      const q = questions[currentIndex];
      const text = q.tts_reading || (q.clues ? q.clues.join('. ') : q.story || q.scenario || q.question || '');
      if (text) {
        const timer = setTimeout(() => {
          speakQuestion(text, () => {
            // Read choices for non-math modules only
            if (!isMathExplorer && shouldReadChoices() && q.choices?.length) {
              speakChoices(q.choices);
            }
          });
        }, 500);
        return () => { clearTimeout(timer); stopSpeaking(); };
      }
    }
  }, [currentIndex, loading, questions, isMathExplorer]);

  const handleSelect = (answer: string) => {
    if (locked || feedback) return;
    setSelectedChoice(prev => prev === answer ? null : answer);
  };

  const handleSubmit = () => {
    if (!selectedChoice || locked) return;
    setLocked(true);
    handleAnswer(selectedChoice);
  };

  const handleAnswer = async (answer: string) => {
    const question = questions[currentIndex];
    if (!question) return;

    const isCorrect = answer === question.correct_answer;

    if (isCorrect) {
      playCorrectSound();
      setScore(s => s + 1);
      setShowConfetti(true);
      setFeedback('correct');
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

    // Show explanation panel for Math Explorer and Pattern Detective in regular game mode
    const isPatternDetective = skillArea === 'pattern_detective';
    const isWordWizard = skillArea === 'word_wizard';
    const isWWYD = skillArea === 'confidence_coach' && subGame === 'what_would_you_do';
    const shouldShowWork = (isMathExplorer && settings.show_math_work !== false) || isPatternDetective;
    // Word Wizard and Confidence Coach WWYD: explanation panel on WRONG answers only
    const shouldShowWrongPanel = !isCorrect && (isWordWizard || isWWYD);

    if (shouldShowWork) {
      // Keep red/green visible for a full 2s, then slide explanation panel
      setTimeout(() => {
        const q = questions[currentIndex];
        // Use tts_explanation for pattern detective, work_shown for math
        const work = q?.work_shown || {
          steps: q?.explanation ? [q.explanation] : ['The answer is ' + (q?.correct_answer || '')],
          tts: (q as unknown as Record<string, string>)?.tts_explanation || q?.explanation || `The answer is ${q?.correct_answer}`,
        };
        if (isMathExplorer && !q?.work_shown) {
          const fallback = generateFallbackWorkShown(q?.question || '', q?.correct_answer || '');
          setCurrentWorkShown(fallback);
        } else {
          setCurrentWorkShown(work);
        }
        setShowMathWork(true);
        setWorkButtonReady(false);
        // Pattern Detective: prepend correct/wrong header to TTS
        if (isPatternDetective) {
          const header = isCorrect
            ? 'Brilliant! And here is why that is right! '
            : `Not quite — but here is the secret rule! The correct answer was ${q?.correct_answer}. `;
          setTimeout(() => speak(header + work.tts, { rate: 0.80, pitch: 1.05, onEnd: () => setWorkButtonReady(true) }), 500);
        } else {
          setTimeout(() => speak(work.tts, { rate: 0.80, pitch: 1.05, onEnd: () => setWorkButtonReady(true) }), 500);
        }
        setTimeout(() => setWorkButtonReady(true), 10000);
      }, 2000);
    } else if (shouldShowWrongPanel) {
      const q = questions[currentIndex];
      const fallback = isWordWizard
        ? `The correct answer was ${q?.correct_answer}!`
        : `The best response was "${q?.correct_answer}"!`;
      const prefix = isWordWizard
        ? (subGame === 'word_categories'
            ? `The odd one out was ${q?.correct_answer}! `
            : subGame === 'riddles'
              ? `The answer was ${q?.correct_answer}! `
              : `The best ending was "${q?.correct_answer}"! `)
        : `A great response would be to "${q?.correct_answer}"! `;
      const explanation = q?.wrong_answer_explanation ? prefix + q.wrong_answer_explanation : fallback;
      setTimeout(() => {
        setExplanationText(explanation);
        setShowExplanation(true);
        setExplanationReady(false);
        setTimeout(() => speak(explanation, { rate: 0.80, pitch: 1.05, onEnd: () => setExplanationReady(true) }), 300);
        setTimeout(() => setExplanationReady(true), 5000);
      }, 2000);
    } else {
      // Correct answer path — existing 1.5s toast then advance
      // Wrong answer without a panel (e.g. I Don't Know) — also hold 2s so feedback shows
      const holdMs = isCorrect ? 1500 : 2000;
      setTimeout(() => {
        setFeedback(null);
        advanceQuestion();
      }, holdMs);
    }
  };

  const advanceQuestion = () => {
    const prev = questions[currentIndex];
    if (prev) {
      const key = prev.question || prev.story || prev.scenario || (prev.clues || []).join(' ');
      if (key) setQuestionHistory(h => [...h, key]);
    }
    setSelectedChoice(null);
    setLocked(false);
    setFeedback(null);
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
    // Kick off XP training + animal unlock flow shortly after the results card renders.
    setTimeout(() => setShowPostFlow(true), 600);
  };

  // Map skill+subgame to XP source key.
  const xpSourceFor = (s: string, sub: string): XpSource => {
    if (sub === 'counting_adventures') return 'counting_adventures';
    if (sub === 'more_or_less') return 'more_or_less';
    if (sub === 'algebra_puzzles') return 'algebra_puzzles';
    return s as XpSource;
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
    const xpSrc = xpSourceFor(skillArea, subGame);
    const xpEarned = calculateXp(xpSrc, score, questions.length || 1);
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Confetti duration={4000} />
        {showPostFlow && (
          <PostSessionFlow
            active={showPostFlow}
            xpEarned={xpEarned}
            xpSource={xpSrc}
            score={score}
            total={questions.length || 1}
            attemptUnlock={false}
            onComplete={() => setShowPostFlow(false)}
          />
        )}
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
                // Clear ALL question-related state on replay so we don't see the same question
                const history = [...questionHistory];
                setQuestions([]);
                setCurrentIndex(0);
                setScore(0);
                setGameComplete(false);
                setSelectedChoice(null);
                setLocked(false);
                setFeedback(null);
                setShowMathWork(false);
                setCurrentWorkShown(null);
                setShowExplanation(false);
                setExplanationText('');
                setShowPostFlow(false);
                fetchQuestions(level, history);
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
    const loadingPhrases = ['Getting your question ready...', 'Almost there, Wes...', 'One moment...'];
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-7xl mb-4" style={{ animation: 'bounce 1.5s ease-in-out infinite' }}>{config.badges[level]}</div>
          <p className="text-2xl font-bold text-navy mb-1">{config.label}</p>
          <p className="text-gray-400 text-sm animate-pulse">{loadingPhrases[Math.floor(Date.now() / 2000) % loadingPhrases.length]}</p>
        </div>
      </div>
    );
  }

  if (error) {
    // TTS error announcement
    if (retryCount === 0) speak("Oops! Something went wrong. Let's try again, Wes!");
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl">
          <p className="text-5xl mb-4">{config.badges[level]}</p>
          <h2 className="text-2xl font-bold text-navy mb-2">Oops! Something went wrong.</h2>
          <p className="text-gray-500 mb-2">Let&apos;s try again, Wes!</p>
          <p className="text-gray-400 text-xs mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setRetryCount(r => r + 1); fetchQuestions(level); }} className="game-btn bg-grass text-white px-6">
              Try Again! 🔄
            </button>
            <button onClick={() => router.push('/')} className="game-btn bg-navy text-white px-6">
              🏠 Home
            </button>
          </div>
          {retryCount >= 3 && <p className="text-xs text-gray-400 mt-4">Having trouble connecting. Please check your internet.</p>}
        </div>
      </div>
    );
  }

  const question = questions[currentIndex];
  if (!question) return null;

  return (
    <div className="min-h-screen p-4 md:p-6">
      {showConfetti && <Confetti duration={2000} />}
      {isFallback && <div className="fixed top-2 left-2 z-40 text-[10px] text-gray-300 bg-white/80 px-2 py-1 rounded-full">📚 Practice mode</div>}

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

      {/* Star progress — fills immediately on submission (feedback set) not on advance */}
      <div className="flex justify-center gap-2 mb-6">
        {Array.from({ length: totalQuestions }, (_, i) => {
          const answered = i < currentIndex + (feedback ? 1 : 0);
          const correct = i < score + (feedback === 'correct' ? 1 : 0);
          return (
            <span key={i} className={`text-2xl transition-all ${answered && correct ? 'star-filled' : 'star-empty'}`}>
              {answered ? (correct ? '★' : '☆') : '☆'}
            </span>
          );
        })}
      </div>

      {/* Speaker button */}
      <div className="flex justify-center mb-3">
        <button
          onClick={() => {
            const q = questions[currentIndex];
            if (!q) return;
            const text = q.tts_reading || (q.clues ? q.clues.join('. ') : q.story || q.scenario || q.question || '');
            if (text) speakQuestion(text, () => {
              // Skip choices for Math Explorer
              if (!isMathExplorer && q.choices?.length) speakChoices(q.choices);
            });
          }}
          className="min-w-[52px] min-h-[52px] text-4xl active:scale-125 transition-transform focus:outline-none"
          aria-label="Read aloud"
        >
          🔊
        </button>
      </div>

      {/* Question — pass handleSelect so tapping selects, not submits */}
      <div className="max-w-2xl mx-auto pb-24">
        {renderQuestion(question, handleSelect, level, selectedChoice, feedback, question.correct_answer)}
      </div>

      {/* Submit button — fixed at bottom */}
      {!feedback && (
        <div className="fixed bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-white via-white to-transparent">
          <button
            onClick={handleSubmit}
            disabled={!selectedChoice || locked}
            onTouchEnd={e => e.currentTarget.blur()}
            className={`w-full min-h-[72px] rounded-2xl font-bold text-xl transition-all focus:outline-none ${
              selectedChoice && !locked
                ? 'bg-grass text-white shadow-lg shadow-grass/30 animate-pulse'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            {selectedChoice ? 'Submit! ✓' : 'Pick an answer first!'}
          </button>
        </div>
      )}

      {/* Feedback toast — hidden once a panel slides up to take over */}
      {feedback && !showMathWork && !showExplanation && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-fade-in">
          <div className={`text-center px-8 py-5 rounded-3xl shadow-2xl ${
            feedback === 'correct' ? 'bg-grass/95' : 'bg-white/95 border border-gray-200'
          }`}>
            {feedback === 'correct' ? (
              <p className="text-2xl font-extrabold text-white">🎉 Great job, Wes!</p>
            ) : (
              <p className="text-xl font-bold text-navy">💪 Good try!</p>
            )}
          </div>
        </div>
      )}

      {/* Wrong-answer explanation panel — Word Wizard + Confidence Coach WWYD */}
      {showExplanation && (
        <div className="fixed inset-x-0 bottom-0 z-40 animate-slide-up">
          <div className="bg-[#FFF8E7] border-t-2 border-navy rounded-t-3xl p-6 shadow-2xl max-h-[60vh] overflow-y-auto">
            <p className="text-xl font-extrabold text-amber-600 mb-3 text-center">Not quite, Wes! 🤔</p>
            <p className="text-[22px] font-bold text-navy leading-relaxed text-center mb-5">{explanationText}</p>
            <div className="flex gap-3">
              <button onClick={() => speak(explanationText, { rate: 0.80, pitch: 1.05 })}
                className="min-w-[52px] min-h-[52px] text-3xl active:scale-125 transition-transform focus:outline-none">
                🔊
              </button>
              <button
                onClick={() => { stopSpeaking(); setShowExplanation(false); setExplanationText(''); advanceQuestion(); }}
                disabled={!explanationReady}
                className={`flex-1 min-h-[72px] rounded-2xl font-bold text-xl transition-all focus:outline-none ${
                  explanationReady ? 'bg-grass text-white shadow-lg' : 'bg-gray-200 text-gray-400'
                }`}>
                Next Question →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Math "Show Your Work" / Pattern rule panel */}
      {showMathWork && currentWorkShown && (
        <div className="fixed inset-x-0 bottom-0 z-40 animate-slide-up">
          <div className="bg-[#FFF8E7] border-t-2 border-navy rounded-t-3xl p-6 shadow-2xl max-h-[70vh] overflow-y-auto">
            {/* Pattern Detective: correct/wrong header */}
            {skillArea === 'pattern_detective' && (
              feedback === 'correct'
                ? <p className="text-xl font-extrabold text-grass mb-2 text-center">Brilliant! ✓</p>
                : <p className="text-xl font-extrabold text-amber-600 mb-2 text-center">Not quite, Wes! 🤔</p>
            )}
            <h3 className="text-lg font-extrabold text-navy mb-4 text-center">
              {isMathExplorer ? "Here's how we work it out! 🧮" : "Here's the rule! 🔍"}
            </h3>
            {/* Pattern Detective wrong: explicitly state the correct answer */}
            {skillArea === 'pattern_detective' && selectedChoice && questions[currentIndex] && selectedChoice !== questions[currentIndex].correct_answer && (
              <p className="text-lg font-bold text-navy bg-white/60 rounded-xl p-3 mb-4 text-center">
                The correct answer was <span className="text-grass">{questions[currentIndex].correct_answer}</span>!
              </p>
            )}

            {/* Steps */}
            <div className="space-y-3 mb-4">
              {currentWorkShown.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-xl font-bold text-navy pt-0.5">{step}</p>
                </div>
              ))}
            </div>

            {/* Equation display */}
            {currentWorkShown.equation_display && (
              <div className="bg-white rounded-2xl p-4 text-center mb-4 border-2 border-navy/20">
                <p className="text-3xl font-extrabold text-navy tracking-wide">
                  {currentWorkShown.equation_display}
                </p>
              </div>
            )}

            {/* Speaker + Next button */}
            <div className="flex gap-3">
              <button onClick={() => speak(currentWorkShown.tts, { rate: 0.80, pitch: 1.05 })}
                className="min-w-[52px] min-h-[52px] text-3xl active:scale-125 transition-transform focus:outline-none">
                🔊
              </button>
              <button
                onClick={() => { stopSpeaking(); setShowMathWork(false); setCurrentWorkShown(null); advanceQuestion(); }}
                disabled={!workButtonReady}
                className={`flex-1 min-h-[72px] rounded-2xl font-bold text-xl transition-all focus:outline-none ${
                  workButtonReady ? 'bg-grass text-white shadow-lg' : 'bg-gray-200 text-gray-400'
                }`}>
                Next Question →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
