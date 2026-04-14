'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSkillProgress, updateSkillProgress, saveGameSession } from '@/lib/db';
import { DifficultyLevel, LEVEL_NAMES, SKILL_CONFIG } from '@/lib/types';
import { playCorrectSound } from '@/lib/audio';
import Confetti from '@/components/Confetti';
import LevelUpSequence from '@/components/LevelUpSequence';
import SpokenResponse from '@/components/SpokenResponse';

interface Scenario {
  scenario: string;
  suggested_answer: string;
  explanation: string;
}

export default function MeetGreetPage() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'speaking' | 'complete'>('loading');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState<DifficultyLevel>(1);
  const [consCorrect, setConsCorrect] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState<DifficultyLevel>(2);

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
      setPhase('speaking');
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

  const handleSpokenComplete = async (result: { quality: string }) => {
    const great = result.quality === 'excellent' || result.quality === 'outstanding';
    if (great) {
      playCorrectSound();
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
        setTimeout(() => setShowLevelUp(true), 500);
        return;
      }
      await updateSkillProgress({ ...(await getSkillProgress('confidence_coach')), consecutive_correct: newCC, consecutive_wrong: 0 });
    }

    // Advance
    if (currentIndex + 1 >= scenarios.length) finishGame();
    else { setCurrentIndex(i => i + 1); }
  };

  const finishGame = async () => {
    await saveGameSession({ skill_area: 'confidence_coach', sub_game: 'meet_greet', score, total_questions: scenarios.length, child_name: 'Wes' });
    setPhase('complete');
  };

  if (showLevelUp) return <LevelUpSequence skillArea="confidence_coach" newLevel={newLevel} onComplete={() => {
    setShowLevelUp(false);
    if (currentIndex + 1 >= scenarios.length) finishGame();
    else setCurrentIndex(i => i + 1);
  }} />;

  if (phase === 'loading') return <div className="min-h-screen flex items-center justify-center"><div className="text-6xl animate-bounce">🎤</div></div>;

  if (phase === 'complete') return (
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

  const s = scenarios[currentIndex];
  if (!s) return null;

  return (
    <div className="min-h-screen p-4 md:p-6">
      {showConfetti && <Confetti duration={2000} />}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.push('/play/confidence_coach')} className="text-navy font-bold text-lg">← Back</button>
        <span className="text-sm font-bold text-navy">{LEVEL_NAMES[level]} 🎤</span>
      </div>

      <div className="flex justify-center gap-2 mb-4">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={`text-2xl ${i < score ? 'star-filled' : 'star-empty'}`}>★</span>
        ))}
      </div>

      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-3xl p-6 shadow-lg">
          <h2 className="text-2xl font-extrabold text-navy mb-4 text-center">Meet & Greet! 👋</h2>
          <SpokenResponse
            key={currentIndex}
            scenario={s.scenario}
            modelAnswer={s.suggested_answer?.replace(/\[child'?s? ?name\]/gi, 'Wes').replace(/\[name\]/gi, 'Wes')}
            showModelBefore={level === 1}
            showCoaching={level <= 2}
            level={level}
            onComplete={handleSpokenComplete}
          />
        </div>
      </div>
    </div>
  );
}
