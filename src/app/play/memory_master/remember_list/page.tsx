'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSkillProgress, updateSkillProgress, saveGameSession } from '@/lib/db';
import { DifficultyLevel, LEVEL_NAMES, SKILL_CONFIG } from '@/lib/types';
import { playCorrectSound, playWrongSound } from '@/lib/audio';
import { speakWords } from '@/lib/speech';
import Confetti from '@/components/Confetti';
import LevelUpSequence from '@/components/LevelUpSequence';

interface MemoryQuestion {
  words_to_remember: string[];
  all_choices: string[];
  display_time: number;
  require_order: boolean;
}

export default function RememberListPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<MemoryQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'memorize' | 'recall' | 'feedback' | 'complete'>('loading');
  const [selected, setSelected] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState<DifficultyLevel>(1);
  const [consCorrect, setConsCorrect] = useState(0);
  const [consWrong, setConsWrong] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState<DifficultyLevel>(2);
  const [feedbackCorrect, setFeedbackCorrect] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async (lvl: DifficultyLevel) => {
    setPhase('loading');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillArea: 'memory_master', subGame: 'remember_list', level: lvl, count: 5 }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setQuestions(data.questions || []);
      setPhase('memorize');
    } catch {
      setError('Could not load questions.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      const progress = await getSkillProgress('memory_master');
      const lvl = progress.current_level as DifficultyLevel;
      setLevel(lvl);
      setConsCorrect(progress.consecutive_correct);
      setConsWrong(progress.consecutive_wrong);
      await fetchQuestions(lvl);
    })();
  }, [fetchQuestions]);

  useEffect(() => {
    if (phase !== 'memorize' || !questions[currentIndex]) return;
    const q = questions[currentIndex];
    const displaySec = Math.max(q.display_time || 6, 3); // minimum 3s, default 6s

    // Read words aloud during memorize
    speakWords(q.words_to_remember, 800);

    const timer = setTimeout(() => {
      setPhase('recall');
    }, displaySec * 1000);
    return () => clearTimeout(timer);
  }, [phase, currentIndex, questions]);

  const handleSelect = (word: string) => {
    if (phase !== 'recall') return;
    const q = questions[currentIndex];
    if (!q) return;

    if (selected.includes(word)) {
      setSelected(selected.filter(w => w !== word));
      return;
    }

    const newSelected = [...selected, word];
    setSelected(newSelected);

    if (newSelected.length >= q.words_to_remember.length) {
      checkAnswer(newSelected);
    }
  };

  const checkAnswer = async (sel: string[]) => {
    const q = questions[currentIndex];
    const target = q.words_to_remember;
    let isCorrect: boolean;

    if (q.require_order) {
      isCorrect = sel.length === target.length && sel.every((w, i) => w === target[i]);
    } else {
      isCorrect = sel.length === target.length && target.every(w => sel.includes(w));
    }

    setFeedbackCorrect(isCorrect);
    setPhase('feedback');

    if (isCorrect) {
      playCorrectSound();
      setScore(s => s + 1);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);

      const newCC = consCorrect + 1;
      setConsCorrect(newCC);
      setConsWrong(0);

      if (newCC >= 3 && level < 3) {
        const next = (level + 1) as DifficultyLevel;
        const progress = await getSkillProgress('memory_master');
        const unlocks = [...progress.unlocks_earned];
        const unlockName = SKILL_CONFIG.memory_master.unlocks[next]?.name;
        if (unlockName && !unlocks.includes(unlockName)) unlocks.push(unlockName);
        await updateSkillProgress({ ...progress, current_level: next, consecutive_correct: 0, consecutive_wrong: 0, unlocks_earned: unlocks });
        setLevel(next);
        setConsCorrect(0);
        setNewLevel(next);
        setTimeout(() => { setPhase('feedback'); setShowLevelUp(true); }, 1500);
        return;
      }
      await updateSkillProgress({ ...(await getSkillProgress('memory_master')), consecutive_correct: newCC, consecutive_wrong: 0 });
    } else {
      playWrongSound();
      const newCW = consWrong + 1;
      setConsWrong(newCW);
      setConsCorrect(0);

      if (newCW >= 2 && level > 1) {
        const prev = (level - 1) as DifficultyLevel;
        setLevel(prev);
        await updateSkillProgress({ ...(await getSkillProgress('memory_master')), current_level: prev, consecutive_correct: 0, consecutive_wrong: 0 });
        setConsWrong(0);
      } else {
        await updateSkillProgress({ ...(await getSkillProgress('memory_master')), consecutive_correct: 0, consecutive_wrong: newCW });
      }
    }

    setTimeout(() => {
      setSelected([]);
      if (currentIndex + 1 >= questions.length) {
        finishGame();
      } else {
        setCurrentIndex(i => i + 1);
        setPhase('memorize');
      }
    }, 2500);
  };

  const finishGame = async () => {
    await saveGameSession({ skill_area: 'memory_master', sub_game: 'remember_list', score, total_questions: questions.length, child_name: 'Wes' });
    setPhase('complete');
  };

  if (showLevelUp) {
    return <LevelUpSequence skillArea="memory_master" newLevel={newLevel} onComplete={() => {
      setShowLevelUp(false);
      setSelected([]);
      if (currentIndex + 1 >= questions.length) finishGame();
      else { setCurrentIndex(i => i + 1); setPhase('memorize'); }
    }} />;
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-bounce mb-4">🧠</div>
          <p className="text-2xl font-bold text-navy">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 text-center shadow-xl">
          <p className="text-5xl mb-4">😕</p>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={() => fetchQuestions(level)} className="game-btn bg-grass text-white px-6">Try Again</button>
        </div>
      </div>
    );
  }

  if (phase === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Confetti duration={4000} />
        <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-xl">
          <p className="text-6xl mb-4">🌟</p>
          <h2 className="text-3xl font-extrabold text-navy mb-2">Nice work, Wes!</h2>
          <p className="text-xl text-gray-600 mb-6">You got {score} out of {questions.length}!</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setCurrentIndex(0); setScore(0); fetchQuestions(level); }} className="game-btn bg-grass text-white px-6">Play Again!</button>
            <button onClick={() => router.push('/')} className="game-btn bg-navy text-white px-6">Home</button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[currentIndex];
  if (!q) return null;

  return (
    <div className="min-h-screen p-4 md:p-6">
      {showConfetti && <Confetti duration={2000} />}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.push('/play/memory_master')} className="text-navy font-bold text-lg">← Back</button>
        <span className="text-sm font-bold text-navy">{LEVEL_NAMES[level]} 🧠</span>
      </div>

      <div className="flex justify-center gap-2 mb-6">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={`text-2xl ${i < score ? 'star-filled' : 'star-empty'}`}>★</span>
        ))}
      </div>

      <div className="max-w-lg mx-auto">
        {phase === 'memorize' && (
          <div className="bg-white rounded-3xl p-8 shadow-lg text-center">
            <h2 className="text-2xl font-extrabold text-navy mb-4">Remember these words! 📝</h2>
            <div className="flex flex-wrap gap-3 justify-center mb-6">
              {q.words_to_remember.map((word, i) => (
                <span key={i} className="bg-sunshine text-navy text-2xl font-bold px-5 py-3 rounded-2xl">
                  {word}
                </span>
              ))}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
              <div className="bg-coral h-3 rounded-full" style={{ animation: `shrinkBar ${Math.max(q.display_time || 6, 3)}s linear forwards` }} />
            </div>
            <style jsx>{`@keyframes shrinkBar { from { width: 100%; } to { width: 0%; } }`}</style>
          </div>
        )}

        {phase === 'recall' && (
          <div className="bg-white rounded-3xl p-6 shadow-lg text-center">
            <h2 className="text-2xl font-extrabold text-navy mb-2">Which words were on the list?</h2>
            <p className="text-gray-500 mb-4">Tap {q.words_to_remember.length} words{q.require_order ? ' in order' : ''}!</p>
            {selected.length > 0 && (
              <div className="flex gap-2 justify-center mb-4 flex-wrap">
                {selected.map((w, i) => (
                  <span key={i} className="bg-grass text-white px-3 py-1 rounded-xl font-bold">{w}</span>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {q.all_choices.map(word => (
                <button
                  key={word}
                  onClick={() => handleSelect(word)}
                  onTouchEnd={(e) => e.currentTarget.blur()}
                  disabled={selected.includes(word)}
                  className={`game-btn border-2 px-4 py-4 focus:outline-none ${
                    selected.includes(word)
                      ? 'bg-grass/20 border-grass text-grass'
                      : 'bg-purple-50 border-purple-200 hover:bg-purple-500 hover:text-white text-navy'
                  }`}
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === 'feedback' && (
          <div className="bg-white rounded-3xl p-8 shadow-lg text-center">
            <p className="text-5xl mb-4">{feedbackCorrect ? '🎉' : '💪'}</p>
            <h2 className={`text-3xl font-extrabold mb-4 ${feedbackCorrect ? 'text-grass' : 'text-navy'}`}>
              {feedbackCorrect ? 'Great job, Wes!' : 'Good try!'}
            </h2>
            {!feedbackCorrect && (
              <p className="text-lg text-gray-600">The words were: <strong>{q.words_to_remember.join(', ')}</strong></p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
