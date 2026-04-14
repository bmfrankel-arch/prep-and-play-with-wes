'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DifficultyLevel, LEVEL_NAMES } from '@/lib/types';
import { getSkillProgress, saveGameSession, getAnimalCollection, saveAnimalUnlock } from '@/lib/db';
import { generateAdditionWorksheet, WorksheetProblem } from '@/lib/worksheetGenerator';
import { speak, speakCelebration } from '@/lib/speech';
import { playCorrectSound } from '@/lib/audio';
import { selectAnimal } from '@/lib/animalSelection';
import { Animal } from '@/data/animals';
import Confetti from '@/components/Confetti';
import AnimalUnlockSequence from '@/components/AnimalUnlockSequence';

export default function AdditionTablesPage() {
  const router = useRouter();
  const [level, setLevel] = useState<DifficultyLevel>(1);
  const [problems, setProblems] = useState<WorksheetProblem[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, boolean | null>>({});
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [allDone, setAllDone] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showAnimal, setShowAnimal] = useState(false);
  const [unlockedAnimal, setUnlockedAnimal] = useState<Animal | null>(null);
  const [animalSave, setAnimalSave] = useState<'saved' | 'failed' | null>(null);

  useEffect(() => {
    getSkillProgress('math_explorer').then(p => {
      const lvl = p.current_level as DifficultyLevel;
      setLevel(lvl);
      const count = lvl === 1 ? 12 : lvl === 2 ? 15 : 18;
      setProblems(generateAdditionWorksheet(lvl, count));
      speak("Here's your addition worksheet, Wes! Fill in all the blanks. Tap a box to type your answer!", { rate: 0.85 });
    });
  }, []);

  const handleKeyTap = (digit: string) => {
    if (activeIdx === null) return;
    const current = answers[activeIdx] || '';
    if (digit === '⌫') {
      setAnswers({ ...answers, [activeIdx]: current.slice(0, -1) });
    } else {
      const next = current + digit;
      if (next.length <= 3) setAnswers({ ...answers, [activeIdx]: next });
    }
  };

  const submitAnswer = (idx: number) => {
    const p = problems[idx];
    const entered = parseInt(answers[idx] || '');
    if (isNaN(entered)) return;

    if (entered === p.answer) {
      playCorrectSound();
      setResults({ ...results, [idx]: true });
      setActiveIdx(null);

      // Check if all done
      const newResults = { ...results, [idx]: true };
      const allCorrect = problems.every((_, i) => newResults[i] === true);
      if (allCorrect) {
        setTimeout(() => completeWorksheet(), 500);
      }
    } else {
      setResults({ ...results, [idx]: false });
      speak("Almost! Try again, Wes!", { rate: 0.85 });
      setTimeout(() => {
        setAnswers({ ...answers, [idx]: '' });
        setResults({ ...results, [idx]: null });
      }, 1500);
    }
  };

  const completeWorksheet = async () => {
    setAllDone(true);
    setShowConfetti(true);
    speakCelebration("You completed the worksheet, Wes! Amazing work!");
    await saveGameSession({ skill_area: 'math_explorer', sub_game: 'addition_tables', score: problems.length, total_questions: problems.length, child_name: 'Wes' });

    // Animal unlock
    try {
      const collection = await getAnimalCollection();
      const score = level === 3 ? 9 : level === 2 ? 7 : 4;
      const animal = selectAnimal(score, 10, collection);
      if (animal) {
        setUnlockedAnimal(animal);
        const { saved } = await saveAnimalUnlock({ animal_id: animal.id, rarity: animal.rarity, quiz_score_when_unlocked: level, quiz_type_when_unlocked: 'addition_tables' });
        setAnimalSave(saved ? 'saved' : 'failed');
      }
    } catch { /* continue */ }
  };

  if (showAnimal && unlockedAnimal) {
    return <AnimalUnlockSequence animal={unlockedAnimal} onComplete={() => { setShowAnimal(false); }} saveStatus={animalSave} />;
  }

  if (allDone) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Confetti duration={5000} />
        <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-xl">
          <p className="text-6xl mb-4">🌟</p>
          <h2 className="text-3xl font-extrabold text-navy mb-2">All correct!</h2>
          <p className="text-lg text-gray-600 mb-6">You completed all {problems.length} problems!</p>
          {unlockedAnimal && !showAnimal && (
            <button onClick={() => { speakCelebration("You finished the whole worksheet, Wes! You've earned a new animal!"); setTimeout(() => setShowAnimal(true), 2000); }}
              className="game-btn bg-gold text-navy px-6 mb-3 animate-pulse w-full">See Your New Animal! 🦁</button>
          )}
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setAllDone(false); setAnswers({}); setResults({}); setShowConfetti(false); setProblems(generateAdditionWorksheet(level, problems.length)); speak("Here's a new worksheet!"); }}
              className="game-btn bg-grass text-white px-6">Try Another! 🔄</button>
            <button onClick={() => router.push('/play/math_explorer')} className="game-btn bg-navy text-white px-6">Back to Math</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-48">
      {showConfetti && <Confetti duration={3000} />}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.push('/play/math_explorer')} className="text-navy font-bold">← Back</button>
        <h1 className="text-xl font-extrabold text-navy">Addition Practice ➕</h1>
        <span className="text-sm text-gray-400">{LEVEL_NAMES[level]}</span>
      </div>
      <p className="text-center text-gray-500 text-sm mb-4">Fill in the blanks, Wes!</p>

      {/* Problem grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-lg mx-auto mb-6">
        {problems.map((p, i) => {
          const isCorrect = results[i] === true;
          const isWrong = results[i] === false;
          const isActive = activeIdx === i;
          const parts = p.display.split('__');

          return (
            <button key={i}
              onClick={() => { if (!isCorrect) { setActiveIdx(i); speak(p.tts, { rate: 0.85 }); } }}
              className={`rounded-xl p-3 text-center border-2 transition-all min-h-[60px] ${
                isCorrect ? 'bg-green-50 border-green-400' :
                isWrong ? 'bg-red-50 border-red-300' :
                isActive ? 'bg-blue-50 border-navy ring-2 ring-navy' :
                'bg-white border-gray-200'
              }`}>
              <p className="text-xl font-extrabold text-navy">
                {parts[0]}
                <span className={`inline-block min-w-[40px] mx-1 border-b-2 ${isCorrect ? 'border-green-500 text-green-600' : 'border-dashed border-navy'} text-2xl font-extrabold`}>
                  {isCorrect ? p.answer : (answers[i] || '')}
                </span>
                {parts[1] || ''}
              </p>
              {isCorrect && <span className="text-green-500 text-sm">✓</span>}
            </button>
          );
        })}
      </div>

      {/* Number keypad — fixed at bottom */}
      {activeIdx !== null && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t-2 border-navy/20 p-4 shadow-2xl">
          <div className="max-w-sm mx-auto">
            <p className="text-center text-sm text-gray-500 mb-2">{problems[activeIdx]?.display.replace('__', '?')}</p>
            <div className="grid grid-cols-5 gap-2 mb-3">
              {['1','2','3','4','5','6','7','8','9','0'].map(d => (
                <button key={d} onClick={() => handleKeyTap(d)}
                  className="h-14 rounded-xl bg-navy/5 text-navy text-2xl font-bold active:scale-95 active:bg-navy/20">{d}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleKeyTap('⌫')} className="flex-1 h-12 rounded-xl bg-gray-200 text-gray-600 font-bold active:scale-95">⌫</button>
              <button onClick={() => submitAnswer(activeIdx)}
                className="flex-1 h-12 rounded-xl bg-grass text-white font-bold active:scale-95">Done ✓</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
