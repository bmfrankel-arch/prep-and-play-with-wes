'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSkillProgress, updateSkillProgress, saveGameSession } from '@/lib/db';
import { DifficultyLevel, LEVEL_NAMES, SKILL_CONFIG } from '@/lib/types';
import { playCorrectSound } from '@/lib/audio';
import { speakQuestion, speakCelebration } from '@/lib/speech';
import Confetti from '@/components/Confetti';
import LevelUpSequence from '@/components/LevelUpSequence';

interface Scenario {
  scenario: string;
  suggested_answer: string;
  explanation: string;
}

export default function MeetGreetPage() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'scenario' | 'model' | 'complete'>('loading');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState<DifficultyLevel>(1);
  const [consCorrect, setConsCorrect] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState<DifficultyLevel>(2);
  const [showModel, setShowModel] = useState(false);

  const fetchScenarios = useCallback(async (lvl: DifficultyLevel) => {
    setPhase('loading');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillArea: 'confidence_coach', subGame: 'meet_greet', level: lvl, count: 5 }),
      });
      const data = await res.json();
      setScenarios(data.questions || []);
      setPhase('scenario');
    } catch {
      setPhase('loading');
    }
  }, []);

  useEffect(() => {
    (async () => {
      const progress = await getSkillProgress('confidence_coach');
      setLevel(progress.current_level as DifficultyLevel);
      setConsCorrect(progress.consecutive_correct);
      await fetchScenarios(progress.current_level as DifficultyLevel);
    })();
  }, [fetchScenarios]);

  // Auto-read scenario when it changes
  useEffect(() => {
    if (phase === 'scenario' && scenarios[currentIndex]) {
      setTimeout(() => speakQuestion(scenarios[currentIndex].scenario), 500);
    }
  }, [phase, currentIndex, scenarios]);

  const handleResponse = async (great: boolean) => {
    if (great) {
      playCorrectSound();
      speakCelebration("Brilliant, Wes! You're brilliant at meeting new people!");
      setScore(s => s + 1);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);

      const newCC = consCorrect + 1;
      setConsCorrect(newCC);

      if (newCC >= 3 && level < 3) {
        const next = (level + 1) as DifficultyLevel;
        const progress = await getSkillProgress('confidence_coach');
        const unlocks = [...progress.unlocks_earned];
        const un = SKILL_CONFIG.confidence_coach.unlocks[next]?.name;
        if (un && !unlocks.includes(un)) unlocks.push(un);
        await updateSkillProgress({ ...progress, current_level: next, consecutive_correct: 0, consecutive_wrong: 0, unlocks_earned: unlocks });
        setLevel(next); setConsCorrect(0); setNewLevel(next);
        setTimeout(() => setShowLevelUp(true), 1000);
        return;
      }
      await updateSkillProgress({ ...(await getSkillProgress('confidence_coach')), consecutive_correct: newCC, consecutive_wrong: 0 });
    }

    advance();
  };

  const advance = () => {
    setShowModel(false);
    if (currentIndex + 1 >= scenarios.length) finishGame();
    else { setCurrentIndex(i => i + 1); setPhase('scenario'); }
  };

  const finishGame = async () => {
    await saveGameSession({ skill_area: 'confidence_coach', sub_game: 'meet_greet', score, total_questions: scenarios.length, child_name: 'Wes' });
    setPhase('complete');
  };

  if (showLevelUp) return <LevelUpSequence skillArea="confidence_coach" newLevel={newLevel} onComplete={() => { setShowLevelUp(false); advance(); }} />;

  if (phase === 'loading') return <div className="min-h-screen flex items-center justify-center"><div className="text-6xl animate-bounce">🎤</div></div>;

  if (phase === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Confetti duration={4000} />
        <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-xl">
          <p className="text-6xl mb-4">🌟</p>
          <h2 className="text-3xl font-extrabold text-navy mb-2">Great practice, Wes!</h2>
          <p className="text-xl text-gray-600 mb-6">You practiced {score} great responses!</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setCurrentIndex(0); setScore(0); fetchScenarios(level); }} className="game-btn bg-grass text-white px-6">More Practice!</button>
            <button onClick={() => router.push('/')} className="game-btn bg-navy text-white px-6">Home</button>
          </div>
        </div>
      </div>
    );
  }

  const s = scenarios[currentIndex];
  if (!s) return null;

  return (
    <div className="min-h-screen p-4 md:p-6">
      {showConfetti && <Confetti duration={2000} />}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.push('/play/confidence_coach')} className="text-navy font-bold text-lg">← Back</button>
        <span className="text-sm font-bold text-navy">{LEVEL_NAMES[level]} 🎤</span>
      </div>

      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-3xl p-6 shadow-lg text-center">
          <h2 className="text-2xl font-extrabold text-navy mb-4">Meet & Greet! 👋</h2>
          <div className="bg-blue-50 rounded-2xl p-5 mb-6">
            <p className="text-xl text-gray-700">{s.scenario}</p>
          </div>

          {level === 1 || showModel ? (
            <div className="bg-grass/10 rounded-2xl p-4 mb-6 border-2 border-grass/30">
              <p className="text-sm font-bold text-grass mb-2">Great answer example:</p>
              <p className="text-lg text-navy font-bold">&ldquo;{s.suggested_answer.replace(/\[child'?s? ?name\]/gi, 'Wes').replace(/\[name\]/gi, 'Wes')}&rdquo;</p>
            </div>
          ) : null}

          {level >= 2 && !showModel && (
            <button onClick={() => setShowModel(true)} className="text-grass font-bold mb-4 block mx-auto">
              Show example answer →
            </button>
          )}

          <p className="text-gray-500 mb-4">Encourage Wes to say his answer out loud!</p>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => handleResponse(true)}
              className="game-btn bg-grass text-white px-8 py-5 text-xl"
            >
              👍 Great job!
            </button>
            <button
              onClick={() => handleResponse(false)}
              className="game-btn bg-sunshine text-navy px-8 py-5 text-xl"
            >
              🔄 Try again
            </button>
          </div>

          {s.explanation && (
            <p className="text-sm text-gray-400 mt-4 italic">Parent tip: {s.explanation}</p>
          )}
        </div>
      </div>
    </div>
  );
}
