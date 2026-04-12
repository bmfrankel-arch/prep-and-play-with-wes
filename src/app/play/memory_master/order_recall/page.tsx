'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSkillProgress, updateSkillProgress, saveGameSession } from '@/lib/db';
import { DifficultyLevel, LEVEL_NAMES, SKILL_CONFIG } from '@/lib/types';
import { playCorrectSound, playWrongSound } from '@/lib/audio';
import { speakWords } from '@/lib/speech';
import Confetti from '@/components/Confetti';
import LevelUpSequence from '@/components/LevelUpSequence';

interface OrderQuestion {
  sequence: string[];
  display_time: number;
}

export default function OrderRecallPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<OrderQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'show' | 'recall' | 'feedback' | 'complete'>('loading');
  const [tapped, setTapped] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState<DifficultyLevel>(1);
  const [consCorrect, setConsCorrect] = useState(0);
  const [consWrong, setConsWrong] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState<DifficultyLevel>(2);
  const [feedbackOk, setFeedbackOk] = useState(false);

  const fetchQuestions = useCallback(async (lvl: DifficultyLevel) => {
    setPhase('loading');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillArea: 'memory_master', subGame: 'order_recall', level: lvl, count: 5 }),
      });
      const data = await res.json();
      setQuestions(data.questions || []);
      setPhase('show');
    } catch {
      setPhase('loading');
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
    if (phase !== 'show' || !questions[currentIndex]) return;
    const q = questions[currentIndex];
    const displaySec = Math.max(q.display_time || 5, 3);

    // Read items aloud in order
    speakWords(q.sequence, 800);

    const timer = setTimeout(() => setPhase('recall'), displaySec * 1000);
    return () => clearTimeout(timer);
  }, [phase, currentIndex, questions]);

  const handleTap = async (item: string) => {
    if (phase !== 'recall') return;
    const q = questions[currentIndex];
    const newTapped = [...tapped, item];
    setTapped(newTapped);

    if (newTapped.length >= q.sequence.length) {
      const isCorrect = newTapped.every((t, i) => t === q.sequence[i]);
      setFeedbackOk(isCorrect);
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

      setTimeout(() => advance(), 2500);
    }
  };

  const advance = () => {
    setTapped([]);
    if (currentIndex + 1 >= questions.length) finishGame();
    else { setCurrentIndex(i => i + 1); setPhase('show'); }
  };

  const finishGame = async () => {
    await saveGameSession({ skill_area: 'memory_master', sub_game: 'order_recall', score, total_questions: questions.length, child_name: 'Wes' });
    setPhase('complete');
  };

  if (showLevelUp) {
    return <LevelUpSequence skillArea="memory_master" newLevel={newLevel} onComplete={() => { setShowLevelUp(false); advance(); }} />;
  }

  if (phase === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-6xl animate-bounce">🧠</div></div>;
  }

  if (phase === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Confetti duration={4000} />
        <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-xl">
          <p className="text-6xl mb-4">🌟</p>
          <h2 className="text-3xl font-extrabold text-navy mb-2">Nice work, Wes!</h2>
          <p className="text-xl text-gray-600 mb-6">{score} out of {questions.length}!</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setCurrentIndex(0); setScore(0); setTapped([]); fetchQuestions(level); }} className="game-btn bg-grass text-white px-6">Play Again!</button>
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

      <div className="max-w-lg mx-auto">
        {phase === 'show' && (
          <div className="bg-white rounded-3xl p-8 shadow-lg text-center">
            <h2 className="text-2xl font-extrabold text-navy mb-6">Remember the order! 🔢</h2>
            <div className="flex flex-wrap gap-3 justify-center">
              {q.sequence.map((item, i) => (
                <div key={i} className="bg-sunshine text-navy text-xl font-bold px-5 py-3 rounded-2xl flex items-center gap-2">
                  <span className="text-sm text-coral font-bold">{i + 1}.</span> {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === 'recall' && (
          <div className="bg-white rounded-3xl p-6 shadow-lg text-center">
            <h2 className="text-2xl font-extrabold text-navy mb-2">Tap them in order!</h2>
            {tapped.length > 0 && (
              <div className="flex gap-2 justify-center mb-4 flex-wrap">
                {tapped.map((t, i) => (
                  <span key={i} className="bg-grass text-white px-3 py-1 rounded-xl font-bold">{i + 1}. {t}</span>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mt-4">
              {[...q.sequence].sort(() => Math.random() - 0.5).map(item => (
                <button
                  key={item}
                  onClick={() => handleTap(item)}
                  onTouchEnd={(e) => e.currentTarget.blur()}
                  disabled={tapped.includes(item)}
                  className={`game-btn border-2 px-4 py-4 focus:outline-none ${tapped.includes(item) ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-purple-50 border-purple-200 hover:bg-purple-500 hover:text-white text-navy'}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === 'feedback' && (
          <div className="bg-white rounded-3xl p-8 shadow-lg text-center">
            <p className="text-5xl mb-4">{feedbackOk ? '🎉' : '💪'}</p>
            <h2 className={`text-3xl font-extrabold ${feedbackOk ? 'text-grass' : 'text-navy'}`}>
              {feedbackOk ? 'Perfect order!' : 'Good try!'}
            </h2>
            {!feedbackOk && (
              <p className="text-lg text-gray-600 mt-2">The order was: {q.sequence.join(' → ')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
