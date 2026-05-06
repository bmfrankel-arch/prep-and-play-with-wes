'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSkillProgress, updateSkillProgress, saveGameSession } from '@/lib/db';
import { DifficultyLevel, LEVEL_NAMES, SKILL_CONFIG } from '@/lib/types';
import { playCorrectSound, playWrongSound } from '@/lib/audio';
import { speakSequence, speak, speakQuestion, speakChoices } from '@/lib/speech';
import { calculateXp } from '@/lib/animalLeveling';
import Confetti from '@/components/Confetti';
import LevelUpSequence from '@/components/LevelUpSequence';
import PostSessionFlow from '@/components/PostSessionFlow';

interface StoryQuestion {
  question: string;
  choices: string[];
  correct_answer: string;
}

interface StoryData {
  story: string;
  questions: StoryQuestion[];
}

const DISPLAY_TIMES: Record<number, number> = { 1: 15, 2: 12, 3: 10 };

export default function StoryDetailsPage() {
  const router = useRouter();
  const [stories, setStories] = useState<StoryData[]>([]);
  const [storyIndex, setStoryIndex] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'story' | 'question' | 'feedback' | 'complete'>('loading');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [level, setLevel] = useState<DifficultyLevel>(1);
  const [consCorrect, setConsCorrect] = useState(0);
  const [consWrong, setConsWrong] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState<DifficultyLevel>(2);
  const [error, setError] = useState<string | null>(null);
  const [timerSec, setTimerSec] = useState(0);
  const [timerTotal, setTimerTotal] = useState(15);
  const [fading, setFading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedbackCorrect, setFeedbackCorrect] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [showFlow, setShowFlow] = useState(false);

  const fetchStories = useCallback(async (lvl: DifficultyLevel) => {
    setPhase('loading');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillArea: 'memory_master', subGame: 'story_details', level: lvl, count: 3 }),
      });
      const data = await res.json();
      if (data.error || !data.questions?.length) {
        setError(data.error || 'Could not load stories.');
        return;
      }
      // Normalize: API returns story as string, split into sentences
      const normalized = data.questions.map((s: StoryData) => ({
        ...s,
        story: typeof s.story === 'string' ? s.story : String(s.story || ''),
        questions: (s.questions || []).map((q: StoryQuestion) => ({
          question: q.question || '',
          choices: q.choices || [],
          correct_answer: q.correct_answer || (q.choices?.[0] || ''),
        })),
      }));
      setStories(normalized);
      setPhase('story');
    } catch {
      setError('Could not load stories.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      const progress = await getSkillProgress('memory_master');
      const lvl = progress.current_level as DifficultyLevel;
      setLevel(lvl);
      setConsCorrect(progress.consecutive_correct);
      setConsWrong(progress.consecutive_wrong);
      await fetchStories(lvl);
    })();
  }, [fetchStories]);

  // Story phase: TTS reads story, then timer starts
  useEffect(() => {
    if (phase !== 'story' || !stories[storyIndex]) return;
    const s = stories[storyIndex];
    const storyText = s.story;
    // Split into sentences for TTS pacing
    const sentences = storyText.split(/[.!?]+/).filter(t => t.trim().length > 0);

    setTimerStarted(false);
    setFading(false);
    const totalSec = DISPLAY_TIMES[level] || 15;
    setTimerTotal(totalSec);
    setTimerSec(totalSec);

    // Read story aloud
    const items = sentences.map(sent => ({
      text: sent.trim(),
      rate: 0.80,
      pitch: 1.05,
      pauseAfter: 800,
    }));

    speakSequence(items).then(() => {
      // TTS finished — NOW start the countdown
      setTimerStarted(true);
    });
  }, [phase, storyIndex, stories, level]);

  // Countdown timer (only runs after TTS completes)
  useEffect(() => {
    if (!timerStarted || phase !== 'story') return;
    const totalSec = DISPLAY_TIMES[level] || 15;
    let remaining = totalSec;
    setTimerSec(totalSec);

    const interval = setInterval(() => {
      remaining--;
      setTimerSec(remaining);
      if (remaining === 3) speak("Get ready...", { rate: 0.85, pitch: 1.0 });
      if (remaining <= 0) {
        clearInterval(interval);
        setFading(true);
        setTimeout(() => {
          setQuestionIndex(0);
          setPhase('question');
          // Read first question
          const q = stories[storyIndex]?.questions?.[0];
          if (q) speakQuestion(q.question, () => speakChoices(q.choices));
        }, 500);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timerStarted, phase, level, storyIndex, stories]);

  const handleSelect = (choice: string) => {
    if (phase !== 'question') return;
    setSelected(prev => prev === choice ? null : choice);
  };

  const handleSubmit = async () => {
    if (!selected || phase !== 'question') return;
    const s = stories[storyIndex];
    const q = s?.questions?.[questionIndex];
    if (!q) return;

    const isCorrect = selected === q.correct_answer;
    setFeedbackCorrect(isCorrect);
    setPhase('feedback');
    setTotalAnswered(t => t + 1);

    if (isCorrect) {
      playCorrectSound();
      setScore(sc => sc + 1);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
      const newCC = consCorrect + 1;
      setConsCorrect(newCC);
      setConsWrong(0);

      if (newCC >= 3 && level < 3) {
        const next = (level + 1) as DifficultyLevel;
        const progress = await getSkillProgress('memory_master');
        const unlocks = [...progress.unlocks_earned];
        const un = SKILL_CONFIG.memory_master.unlocks[next]?.name;
        if (un && !unlocks.includes(un)) unlocks.push(un);
        await updateSkillProgress({ ...progress, current_level: next, consecutive_correct: 0, consecutive_wrong: 0, unlocks_earned: unlocks });
        setLevel(next); setConsCorrect(0); setNewLevel(next);
        setTimeout(() => setShowLevelUp(true), 1500);
        return;
      }
      await updateSkillProgress({ ...(await getSkillProgress('memory_master')), consecutive_correct: newCC, consecutive_wrong: 0 });
    } else {
      playWrongSound();
      const newCW = consWrong + 1;
      setConsWrong(newCW); setConsCorrect(0);
      if (newCW >= 2 && level > 1) {
        const prev = (level - 1) as DifficultyLevel;
        setLevel(prev);
        await updateSkillProgress({ ...(await getSkillProgress('memory_master')), current_level: prev, consecutive_correct: 0, consecutive_wrong: 0 });
        setConsWrong(0);
      } else {
        await updateSkillProgress({ ...(await getSkillProgress('memory_master')), consecutive_correct: 0, consecutive_wrong: newCW });
      }
    }

    // Advance to next question or next story
    setTimeout(() => {
      setSelected(null);
      if (questionIndex + 1 < (s?.questions?.length || 2)) {
        setQuestionIndex(qi => qi + 1);
        setPhase('question');
        const nextQ = s?.questions?.[questionIndex + 1];
        if (nextQ) setTimeout(() => speakQuestion(nextQ.question, () => speakChoices(nextQ.choices)), 300);
      } else if (storyIndex + 1 < stories.length) {
        setStoryIndex(si => si + 1);
        setQuestionIndex(0);
        setPhase('story');
      } else {
        finishGame();
      }
    }, 1500);
  };

  const finishGame = async () => {
    await saveGameSession({ skill_area: 'memory_master', sub_game: 'story_details', score, total_questions: totalAnswered + 1, child_name: 'Wes' });
    setPhase('complete');
    setTimeout(() => setShowFlow(true), 700);
  };

  if (showLevelUp) {
    return <LevelUpSequence skillArea="memory_master" newLevel={newLevel} onComplete={() => {
      setShowLevelUp(false);
      setSelected(null);
      if (storyIndex + 1 < stories.length) { setStoryIndex(si => si + 1); setQuestionIndex(0); setPhase('story'); }
      else finishGame();
    }} />;
  }

  if (phase === 'loading') return <div className="min-h-screen flex items-center justify-center"><div className="text-6xl animate-bounce">🧠</div></div>;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 text-center shadow-xl">
        <p className="text-5xl mb-4">😕</p><p className="text-gray-600 mb-6">{error}</p>
        <button onClick={() => fetchStories(level)} className="game-btn bg-grass text-white px-6">Try Again</button>
      </div>
    </div>
  );
  if (phase === 'complete') {
    const total = (totalAnswered || 1);
    const xpEarned = calculateXp('memory_master', score, total);
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Confetti duration={4000} />
        {showFlow && (
          <PostSessionFlow
            active={showFlow}
            xpEarned={xpEarned}
            xpSource="memory_master"
            score={score}
            total={total}
            attemptUnlock={false}
            onComplete={() => setShowFlow(false)}
          />
        )}
        <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-xl">
          <p className="text-6xl mb-4">🌟</p>
          <h2 className="text-3xl font-extrabold text-navy mb-2">Nice work, Wes!</h2>
          <p className="text-xl text-gray-600 mb-6">You got {score} correct!</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setStoryIndex(0); setScore(0); setTotalAnswered(0); setShowFlow(false); fetchStories(level); }} className="game-btn bg-grass text-white px-6">Play Again!</button>
            <button onClick={() => router.push('/')} className="game-btn bg-navy text-white px-6">Home</button>
          </div>
        </div>
      </div>
    );
  }

  const currentStory = stories[storyIndex];
  if (!currentStory) return null;

  const timerColor = timerSec <= 1 ? 'bg-red-500' : timerSec <= 3 ? 'bg-orange-400' : 'bg-coral';
  const timerPct = timerTotal > 0 ? (timerSec / timerTotal) * 100 : 0;

  return (
    <div className="min-h-screen p-4 md:p-6">
      {showConfetti && <Confetti duration={2000} />}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.push('/play/memory_master')} className="text-navy font-bold text-lg">← Back</button>
        <span className="text-sm font-bold text-navy">{LEVEL_NAMES[level]} 🧠</span>
      </div>

      {/* Star progress */}
      <div className="flex justify-center gap-2 mb-4">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={`text-2xl ${i < score ? 'star-filled' : 'star-empty'}`}>★</span>
        ))}
      </div>

      {/* Speaker button */}
      <div className="flex justify-center mb-3">
        <button onClick={() => {
          if (phase === 'story') {
            const sentences = currentStory.story.split(/[.!?]+/).filter(t => t.trim());
            speakSequence(sentences.map(s => ({ text: s.trim(), rate: 0.80, pauseAfter: 800 })));
          } else if (phase === 'question') {
            const q = currentStory.questions?.[questionIndex];
            if (q) speakQuestion(q.question, () => speakChoices(q.choices));
          }
        }} className="min-w-[52px] min-h-[52px] text-4xl active:scale-125 transition-transform focus:outline-none">🔊</button>
      </div>

      <div className="max-w-lg mx-auto">
        {/* STORY PHASE */}
        {phase === 'story' && (
          <div className={`bg-white rounded-3xl p-8 shadow-lg text-center transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}>
            <h2 className="text-2xl font-extrabold text-navy mb-6">Listen carefully, Wes! 👂</h2>
            <div className="bg-purple-50 rounded-2xl p-6 mb-6">
              {currentStory.story.split(/(?<=[.!?])\s+/).filter(s => s.trim()).map((sentence, i) => (
                <p key={i} className="text-xl font-bold text-navy mb-4 leading-relaxed text-center">{sentence}</p>
              ))}
            </div>
            {timerStarted && (
              <>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className={`${timerColor} h-3 rounded-full transition-all duration-1000`} style={{ width: `${timerPct}%` }} />
                </div>
                <p className="text-sm text-gray-400 mt-2">{timerSec}s</p>
              </>
            )}
            {!timerStarted && <p className="text-sm text-gray-400">Reading aloud...</p>}
          </div>
        )}

        {/* QUESTION PHASE */}
        {phase === 'question' && currentStory.questions?.[questionIndex] && (
          <div className="bg-white rounded-3xl p-6 shadow-lg text-center">
            <h2 className="text-lg font-bold text-gray-400 mb-2">Question {questionIndex + 1} of {currentStory.questions.length}</h2>
            <p className="text-2xl font-extrabold text-navy mb-6">{currentStory.questions[questionIndex].question}</p>
            <div className="space-y-3 mb-6">
              {currentStory.questions[questionIndex].choices.map((choice) => (
                <button key={choice} onClick={() => handleSelect(choice)} onTouchEnd={e => e.currentTarget.blur()}
                  className={selected === choice
                    ? 'game-btn w-full border-3 border-navy bg-blue-50 text-navy scale-105 px-4 py-4 text-xl focus:outline-none relative'
                    : 'game-btn w-full bg-purple-50 text-navy border-2 border-purple-200/50 px-4 py-4 text-xl focus:outline-none'}>
                  {choice}
                </button>
              ))}
            </div>
            {/* Submit button */}
            <button onClick={handleSubmit} disabled={!selected}
              className={`w-full min-h-[72px] rounded-2xl font-bold text-xl transition-all focus:outline-none ${
                selected ? 'bg-grass text-white shadow-lg animate-pulse' : 'bg-gray-200 text-gray-400'
              }`}>
              {selected ? 'Submit! ✓' : 'Pick an answer first!'}
            </button>
          </div>
        )}

        {/* FEEDBACK PHASE */}
        {phase === 'feedback' && (
          <div className="bg-white rounded-3xl p-8 shadow-lg text-center">
            <p className="text-5xl mb-4">{feedbackCorrect ? '🎉' : '💪'}</p>
            <h2 className={`text-3xl font-extrabold ${feedbackCorrect ? 'text-grass' : 'text-navy'}`}>
              {feedbackCorrect ? 'Great memory, Wes!' : 'Good try!'}
            </h2>
            {!feedbackCorrect && currentStory.questions?.[questionIndex] && (
              <p className="text-lg text-gray-600 mt-2">The answer was: <strong className="text-coral">{currentStory.questions[questionIndex].correct_answer}</strong></p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
