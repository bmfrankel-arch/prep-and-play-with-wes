'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSkillProgress, updateSkillProgress, saveGameSession } from '@/lib/db';
import { DifficultyLevel, LEVEL_NAMES, SKILL_CONFIG } from '@/lib/types';
import { playCorrectSound, playWrongSound } from '@/lib/audio';
import { speakSequence, speak, speakQuestion } from '@/lib/speech';
import Confetti from '@/components/Confetti';
import LevelUpSequence from '@/components/LevelUpSequence';

interface MemoryQuestion {
  words_to_remember: string[];
  all_choices: string[];
  display_time: number;
  require_order: boolean;
}

// Doubled display times per level
const DISPLAY_TIMES: Record<number, number> = { 1: 12, 2: 8, 3: 6 };
const WORD_PAUSE: Record<number, number> = { 1: 2000, 2: 1500, 3: 1000 };

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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
  const [timerSec, setTimerSec] = useState(0);
  const [timerTotal, setTimerTotal] = useState(12);
  const [displayWords, setDisplayWords] = useState<string[]>([]);
  const [fading, setFading] = useState(false);

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

  // Memorize phase — doubled timers, TTS with numbered words
  useEffect(() => {
    if (phase !== 'memorize' || !questions[currentIndex]) return;
    const q = questions[currentIndex];
    const totalSec = DISPLAY_TIMES[level] || 12;
    const pauseMs = WORD_PAUSE[level] || 2000;
    setTimerTotal(totalSec);
    setTimerSec(totalSec);
    setFading(false);

    // Randomize word display order each time
    setDisplayWords(shuffleArray(q.words_to_remember));

    // TTS: read each word with number
    const items = q.words_to_remember.flatMap((word, i) => [
      { text: `${i + 1}`, rate: 0.80, pitch: 1.05, pauseAfter: 300 },
      { text: word, rate: 0.70, pitch: 1.05, pauseAfter: pauseMs },
    ]);
    items.push({ text: "Now remember those words, Wes!", rate: 0.85, pitch: 1.05, pauseAfter: 0 });
    speakSequence(items);

    // Countdown timer
    let remaining = totalSec;
    const interval = setInterval(() => {
      remaining--;
      setTimerSec(remaining);
      if (remaining === 3) speak("Get ready...", { rate: 0.85, pitch: 1.0 });
      if (remaining <= 0) clearInterval(interval);
    }, 1000);

    // Transition to recall
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        setPhase('recall');
        speakQuestion("Which words were on the list? Tap all the ones you remember!");
      }, 500);
    }, totalSec * 1000);

    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [phase, currentIndex, questions, level]);

  const handleSelect = (word: string) => {
    if (phase !== 'recall') return;
    const q = questions[currentIndex];
    if (!q) return;
    if (selected.includes(word)) { setSelected(selected.filter(w => w !== word)); return; }
    const newSelected = [...selected, word];
    setSelected(newSelected);
    if (newSelected.length >= q.words_to_remember.length) checkAnswer(newSelected);
  };

  const checkAnswer = async (sel: string[]) => {
    const q = questions[currentIndex];
    const target = q.words_to_remember;
    const isCorrect = q.require_order
      ? sel.length === target.length && sel.every((w, i) => w === target[i])
      : sel.length === target.length && target.every(w => sel.includes(w));

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
    setTimeout(() => {
      setSelected([]);
      if (currentIndex + 1 >= questions.length) finishGame();
      else { setCurrentIndex(i => i + 1); setPhase('memorize'); }
    }, 2500);
  };

  const finishGame = async () => {
    await saveGameSession({ skill_area: 'memory_master', sub_game: 'remember_list', score, total_questions: questions.length, child_name: 'Wes' });
    setPhase('complete');
  };

  if (showLevelUp) {
    return <LevelUpSequence skillArea="memory_master" newLevel={newLevel} onComplete={() => {
      setShowLevelUp(false); setSelected([]);
      if (currentIndex + 1 >= questions.length) finishGame();
      else { setCurrentIndex(i => i + 1); setPhase('memorize'); }
    }} />;
  }

  if (phase === 'loading') return <div className="min-h-screen flex items-center justify-center"><div className="text-6xl animate-bounce">🧠</div></div>;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 text-center shadow-xl">
        <p className="text-5xl mb-4">😕</p><p className="text-gray-600 mb-6">{error}</p>
        <button onClick={() => fetchQuestions(level)} className="game-btn bg-grass text-white px-6">Try Again</button>
      </div>
    </div>
  );
  if (phase === 'complete') return (
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

  const q = questions[currentIndex];
  if (!q) return null;

  // Timer color
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

      <div className="max-w-md mx-auto">
        {phase === 'memorize' && (
          <div className={`bg-white rounded-3xl p-8 shadow-lg text-center transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}>
            <h2 className="text-2xl font-extrabold text-navy mb-6">Remember these words, Wes! 📝</h2>

            {/* Words in vertical column with numbers */}
            <div className="flex flex-col items-center gap-5 mb-8">
              {displayWords.map((word, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-lg text-gray-400 font-bold w-6 text-right">{i + 1}.</span>
                  <span className="bg-sunshine text-navy text-3xl font-extrabold px-6 py-3 rounded-2xl min-w-[160px] text-center">
                    {word}
                  </span>
                </div>
              ))}
            </div>

            {/* Countdown timer bar */}
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className={`${timerColor} h-3 rounded-full transition-all duration-1000`} style={{ width: `${timerPct}%` }} />
            </div>
            <p className="text-sm text-gray-400 mt-2">{timerSec}s</p>
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
              {(q.all_choices || []).filter(w => w).map(word => (
                <button key={word} onClick={() => handleSelect(word)}
                  onTouchEnd={e => e.currentTarget.blur()}
                  disabled={selected.includes(word)}
                  className={`game-btn border-2 px-4 py-4 focus:outline-none min-h-[72px] text-xl font-bold ${
                    selected.includes(word) ? 'bg-grass/20 border-grass text-grass' : 'bg-purple-50 border-purple-200 text-navy'
                  }`}>{word}</button>
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
            {!feedbackCorrect && <p className="text-lg text-gray-600">The words were: <strong>{q.words_to_remember.join(', ')}</strong></p>}
          </div>
        )}
      </div>
    </div>
  );
}
