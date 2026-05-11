'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { speak, speakCelebration } from '@/lib/speech';
import { playCorrectSound, playWrongSound } from '@/lib/audio';
import { saveGameSession } from '@/lib/db';
import { calculateXp } from '@/lib/animalLeveling';
import PostSessionFlow from '@/components/PostSessionFlow';

const TOTAL = 10;

interface Problem {
  a: number;
  b: number;
  answer: number;
  display: string;
  tts: string;
}

function generateProblems(): Problem[] {
  const problems: Problem[] = [];
  const used = new Set<string>();
  while (problems.length < TOTAL) {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    const answer = a + b;
    if (answer > 18) continue;
    const key = `${a}+${b}`;
    if (used.has(key)) continue;
    used.add(key);
    problems.push({
      a,
      b,
      answer,
      display: `${a} + ${b} = ___`,
      tts: `What is ${a} plus ${b}?`,
    });
  }
  return problems;
}

const CORRECT_PHRASES = ['Well done Wes!', 'Correct!', 'Brilliant!'];
let correctIdx = 0;
function nextCorrectPhrase(): string {
  const phrase = CORRECT_PHRASES[correctIdx % CORRECT_PHRASES.length];
  correctIdx++;
  return phrase;
}

type Status = 'idle' | 'correct' | 'wrong' | 'reveal';

export default function AdditionTablesPage() {
  const router = useRouter();
  const [problems, setProblems] = useState<Problem[]>(() => generateProblems());
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const [wrongCount, setWrongCount] = useState(0);
  const [status, setStatus] = useState<Status>('idle');
  const [shake, setShake] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [showFlow, setShowFlow] = useState(false);

  const current = problems[idx];

  // Speak the first problem on mount.
  useEffect(() => {
    const t = setTimeout(() => speak(problems[0].tts, { rate: 0.9 }), 350);
    return () => clearTimeout(t);
  }, [problems]);

  const finishSession = useCallback(async (finalScore: number) => {
    setDone(true);
    if (finalScore === TOTAL) {
      speakCelebration(`${finalScore} OUT OF ${TOTAL}, WES! Dad is going to be SO proud when he hears about this!`);
    } else {
      speakCelebration(`Brilliant work, Wes! You got ${finalScore} out of ${TOTAL}. Dad built this just so you could have moments like this.`);
    }
    await saveGameSession({
      skill_area: 'math_explorer',
      sub_game: 'addition_tables',
      score: finalScore,
      total_questions: TOTAL,
      child_name: 'Wes',
    });
    setTimeout(() => setShowFlow(true), 1100);
  }, []);

  const advance = useCallback((wasCorrect: boolean) => {
    const newScore = wasCorrect ? score + 1 : score;
    setScore(newScore);
    setTyped('');
    setWrongCount(0);
    setStatus('idle');
    if (idx + 1 >= TOTAL) {
      finishSession(newScore);
    } else {
      const nextIdx = idx + 1;
      setIdx(nextIdx);
      setTimeout(() => speak(problems[nextIdx].tts, { rate: 0.9 }), 250);
    }
  }, [idx, score, problems, finishSession]);

  const submit = useCallback(() => {
    if (status !== 'idle') return;
    if (typed === '') return;
    const value = parseInt(typed, 10);
    if (isNaN(value)) return;

    if (value === current.answer) {
      playCorrectSound();
      setStatus('correct');
      speak(nextCorrectPhrase(), { rate: 0.95, pitch: 1.1 });
      setTimeout(() => advance(true), 1000);
    } else {
      playWrongSound();
      const next = wrongCount + 1;
      setWrongCount(next);
      setStatus('wrong');
      setShake(true);
      setTimeout(() => setShake(false), 350);
      setTimeout(() => setTyped(''), 380);
      if (next >= 2) {
        // Reveal answer briefly, then move on.
        setStatus('reveal');
        speak(`The answer is ${current.answer}`, { rate: 0.9 });
        setTimeout(() => advance(false), 1800);
      } else {
        speak('Try again!', { rate: 0.9 });
        setTimeout(() => setStatus('idle'), 500);
      }
    }
  }, [typed, status, current, wrongCount, advance]);

  const tap = useCallback((key: string) => {
    if (status === 'correct' || status === 'reveal') return;
    if (key === '←') {
      setTyped(t => t.slice(0, -1));
      return;
    }
    if (key === '✓') {
      submit();
      return;
    }
    setTyped(t => (t.length >= 2 ? t : t + key));
  }, [status, submit]);

  const xp = useMemo(() => calculateXp('addition_tables', score, TOTAL), [score]);

  if (showFlow) {
    return (
      <PostSessionFlow
        active={showFlow}
        xpEarned={xp}
        xpSource="addition_tables"
        score={score}
        total={TOTAL}
        attemptUnlock={true}
        onComplete={() => setShowFlow(false)}
      />
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-xl">
          <p className="text-6xl mb-3">⭐</p>
          <h2 className="text-3xl font-extrabold text-navy mb-3">All done, Wes!</h2>
          <p className="text-2xl text-gray-700 mb-6">You got {score} out of {TOTAL}!</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => {
                setProblems(generateProblems());
                setIdx(0);
                setTyped('');
                setWrongCount(0);
                setStatus('idle');
                setScore(0);
                setDone(false);
              }}
              className="game-btn bg-grass text-white px-6"
            >
              Play Again
            </button>
            <button
              onClick={() => router.push('/play/math_explorer')}
              className="game-btn bg-navy text-white px-6"
            >
              Back to Math
            </button>
          </div>
        </div>
      </div>
    );
  }

  const submitActive = typed.length > 0 && status === 'idle';

  const boxBorder =
    status === 'correct' ? 'border-grass bg-green-50' :
    status === 'wrong' ? 'border-red-500 bg-red-50' :
    status === 'reveal' ? 'border-amber-400 bg-amber-50' :
    'border-navy bg-white';

  const boxText =
    status === 'correct' ? <span className="text-grass">{current.answer}</span> :
    status === 'reveal' ? <span className="text-amber-600">{current.answer}</span> :
    <span className="text-navy">{typed}</span>;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Top bar */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <button
          onClick={() => router.push('/play/math_explorer')}
          className="text-navy font-bold text-sm"
        >
          ← Back
        </button>
        <p className="text-xs text-gray-500">Problem {idx + 1} of {TOTAL}</p>
        <button
          onClick={() => speak(current.tts, { rate: 0.9 })}
          aria-label="Read aloud"
          className="min-w-[44px] min-h-[44px] text-2xl active:scale-110 transition-transform"
        >
          🔊
        </button>
      </div>

      {/* Equation */}
      <div className="flex-1 flex items-center justify-center px-4 py-6 select-none">
        <div
          className={`text-[64px] md:text-[88px] font-extrabold text-navy leading-none flex items-center gap-4 ${shake ? 'animate-shake' : ''}`}
        >
          <span>{current.a}</span>
          <span>+</span>
          <span>{current.b}</span>
          <span>=</span>
          <span
            className={`inline-flex items-center justify-center rounded-2xl border-[3px] border-dashed ${boxBorder}`}
            style={{ minWidth: 120, minHeight: 90, padding: '0 12px' }}
          >
            {boxText}
          </span>
        </div>
      </div>

      {/* Number keypad */}
      <div className="bg-[#F5F5F5] px-3 pt-3 pb-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
          {['1','2','3','4','5','6','7','8','9'].map(d => (
            <button
              key={d}
              onClick={() => tap(d)}
              disabled={status === 'correct' || status === 'reveal'}
              className="bg-white text-navy text-3xl font-extrabold rounded-2xl shadow active:scale-90 active:bg-gray-100 transition-transform disabled:opacity-50"
              style={{ minHeight: 80 }}
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => tap('←')}
            disabled={status === 'correct' || status === 'reveal'}
            className="bg-white text-navy text-3xl font-extrabold rounded-2xl shadow active:scale-90 active:bg-gray-100 transition-transform disabled:opacity-50"
            style={{ minHeight: 80 }}
          >
            ←
          </button>
          <button
            onClick={() => tap('0')}
            disabled={status === 'correct' || status === 'reveal'}
            className="bg-white text-navy text-3xl font-extrabold rounded-2xl shadow active:scale-90 active:bg-gray-100 transition-transform disabled:opacity-50"
            style={{ minHeight: 80 }}
          >
            0
          </button>
          <button
            onClick={() => tap('✓')}
            disabled={!submitActive}
            className={`text-3xl font-extrabold rounded-2xl shadow transition-transform active:scale-90 ${
              submitActive ? 'bg-grass text-white' : 'bg-gray-300 text-gray-500'
            }`}
            style={{ minHeight: 80 }}
          >
            ✓
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake { animation: shake 0.32s ease-in-out; }
      `}</style>
    </div>
  );
}
