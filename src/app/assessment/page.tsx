'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SkillArea, AssessmentQuestion, getPerformanceBand, getPerformanceStars, SKILL_CONFIG, DifficultyLevel } from '@/lib/types';
import { saveAssessment, getAllSkillProgress, getParentSettings, saveAnimalUnlock, getAnimalCollection } from '@/lib/db';
import { selectAnimal } from '@/lib/animalSelection';
import { Animal } from '@/data/animals';
import AnimalUnlockSequence from '@/components/AnimalUnlockSequence';

const IMAGE_PHRASES = /\b(picture|image|diagram|shown below|count the objects|look at the|in the drawing|in the figure)\b/i;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function filterBadQuestions<T extends { question: string }>(questions: T[]): T[] {
  return questions.filter(q => !IMAGE_PHRASES.test(q.question));
}

function AssessmentContent() {
  const router = useRouter();
  const params = useSearchParams();
  const skillParam = params.get('skill') as SkillArea | null;
  const levelParam = parseInt(params.get('level') || '1') as DifficultyLevel;
  const isWeekly = params.get('type') === 'weekly';

  const [phase, setPhase] = useState<'pin' | 'loading' | 'question' | 'pause' | 'animal_unlock' | 'results'>('loading');
  const [unlockedAnimal, setUnlockedAnimal] = useState<Animal | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AssessmentQuestion[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const settings = getParentSettings();

  const fetchQuestions = useCallback(async () => {
    setPhase('loading');
    try {
      const allProgress = await getAllSkillProgress();
      const skillLevels: Record<string, number> = {};
      allProgress.forEach(p => { skillLevels[p.skill_area] = p.current_level; });

      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillArea: skillParam,
          level: levelParam,
          type: isWeekly ? 'weekly' : 'standard',
          skillLevels,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      const raw = (data.questions || []) as AssessmentQuestion[];
      const cleaned = filterBadQuestions(raw);
      setQuestions(cleaned);
      setPhase('question');
    } catch {
      setError('Could not load assessment.');
    }
  }, [skillParam, levelParam, isWeekly]);

  useEffect(() => {
    if (settings.require_pin) {
      setPhase('pin');
    } else {
      fetchQuestions();
    }
  }, [settings.require_pin, fetchQuestions]);

  const handlePinSubmit = () => {
    if (pinInput === settings.parent_pin) {
      fetchQuestions();
    } else {
      setPinInput('');
    }
  };

  const handleAnswer = (answer: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(answer);
    const q = questions[currentIndex];
    const record: AssessmentQuestion = {
      question: q.question,
      choices: q.choices,
      wes_answer: answer,
      correct_answer: q.correct_answer,
      is_correct: answer === q.correct_answer,
      skill_area: (q as unknown as { skill_area: SkillArea }).skill_area || skillParam || 'word_wizard',
    };
    const newAnswers = [...answers, record];
    setAnswers(newAnswers);

    setPhase('pause');
    setTimeout(() => {
      setSelectedAnswer(null); // Reset BEFORE rendering next question
      if (currentIndex + 1 >= questions.length) {
        finishAssessment(newAnswers);
      } else {
        setCurrentIndex(i => i + 1);
        setPhase('question');
      }
    }, 1000);
  };

  const finishAssessment = async (finalAnswers: AssessmentQuestion[]) => {
    const score = finalAnswers.filter(a => a.is_correct).length;
    const total = finalAnswers.length;
    const band = getPerformanceBand(score, total);

    await saveAssessment({
      assessment_type: isWeekly ? 'weekly' : 'standard',
      skill_area: isWeekly ? null : skillParam,
      score,
      total_questions: total,
      performance_band: band,
      questions_detail: finalAnswers,
      current_level_at_time: levelParam,
    });

    // Animal unlock — select based on score
    try {
      const collection = await getAnimalCollection();
      const animal = selectAnimal(score, total, collection);
      if (animal) {
        setUnlockedAnimal(animal);
        await saveAnimalUnlock({
          animal_id: animal.id,
          rarity: animal.rarity,
          quiz_score_when_unlocked: score,
          quiz_type_when_unlocked: isWeekly ? 'weekly' : 'standard',
        });
        setPhase('animal_unlock');
        return;
      }
    } catch { /* continue to results */ }

    setPhase('results');
  };

  // PIN entry
  if (phase === 'pin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 assessment-mode">
        <div className="max-w-sm w-full text-center">
          <p className="text-5xl mb-4">🔒</p>
          <h2 className="text-2xl font-bold text-navy mb-4">Parent PIN Required</h2>
          <input type="password" maxLength={4} value={pinInput}
            onChange={e => setPinInput(e.target.value)}
            className="text-center text-3xl tracking-widest border-2 border-gray-300 rounded-xl p-3 w-40 mb-4"
            placeholder="••••" />
          <br />
          <button onClick={handlePinSubmit} className="bg-navy text-white font-bold px-8 py-3 rounded-xl">Start Assessment</button>
        </div>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center assessment-mode">
        <div className="text-center">
          <p className="text-5xl mb-4">📝</p>
          <p className="text-xl font-bold text-navy">Preparing assessment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 assessment-mode">
        <div className="text-center">
          <p className="text-5xl mb-4">😕</p>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={() => router.push('/')} className="bg-navy text-white px-6 py-3 rounded-xl font-bold">Home</button>
        </div>
      </div>
    );
  }

  // Animal unlock sequence
  if (phase === 'animal_unlock' && unlockedAnimal) {
    return (
      <AnimalUnlockSequence
        animal={unlockedAnimal}
        onComplete={() => setPhase('results')}
      />
    );
  }

  // Results — fully scrollable
  if (phase === 'results') {
    const score = answers.filter(a => a.is_correct).length;
    const total = answers.length;
    const band = getPerformanceBand(score, total);
    const stars = getPerformanceStars(band);

    const skillGroups: Record<string, AssessmentQuestion[]> = {};
    if (isWeekly) {
      answers.forEach(a => {
        if (!skillGroups[a.skill_area]) skillGroups[a.skill_area] = [];
        skillGroups[a.skill_area].push(a);
      });
    }

    return (
      <div className="min-h-screen overflow-y-auto assessment-mode">
        {/* Sticky home button */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b px-4 py-3 flex justify-between items-center no-print">
          <button onClick={() => router.push('/')} className="text-navy font-bold text-sm">🏠 Home</button>
          <span className="text-sm font-bold text-navy">Assessment Results</span>
          <button onClick={() => window.print()} className="text-navy font-bold text-sm">🖨️ Print</button>
        </div>

        <div className="max-w-2xl mx-auto p-4 pt-4">
          <div className="text-center mb-6">
            <p className="text-5xl mb-3">🎓</p>
            <h1 className="text-3xl font-bold text-navy mb-2">All done, Wes! Great job.</h1>
            <p className="text-2xl font-bold text-navy">{score} out of {total} correct</p>
            <p className="text-xl mt-2">{band} {stars}</p>
          </div>

          {isWeekly && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <h3 className="font-bold text-navy mb-2">Score by Skill Area:</h3>
              {Object.entries(skillGroups).map(([skill, qs]) => (
                <p key={skill} className="text-navy">
                  {SKILL_CONFIG[skill as SkillArea]?.label || skill}: {qs.filter(q => q.is_correct).length}/{qs.length}
                </p>
              ))}
            </div>
          )}

          <div className="space-y-3 mb-6">
            {answers.map((a, i) => (
              <div key={i} className={`p-4 rounded-xl border-2 ${a.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{a.is_correct ? '✅' : '❌'}</span>
                  <div className="flex-1">
                    <p className="font-bold text-navy text-sm">Q{i + 1}. {a.question}</p>
                    <p className="text-sm text-gray-600 mt-1">Your answer: <strong>{a.wes_answer}</strong></p>
                    {!a.is_correct && (
                      <p className="text-sm text-green-700 mt-1">Correct: <strong>{a.correct_answer}</strong></p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-center pb-8 no-print">
            <button onClick={() => window.print()} className="bg-navy text-white font-bold px-6 py-3 rounded-xl">Print Report</button>
            <button onClick={() => router.push('/')} className="bg-gray-200 text-navy font-bold px-6 py-3 rounded-xl">Back to Games</button>
          </div>
        </div>
      </div>
    );
  }

  // Question display
  const q = questions[currentIndex];
  if (!q) return null;

  return (
    <div className="min-h-screen assessment-mode">
      {/* Exit confirmation modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm text-center">
            <p className="text-lg font-bold text-navy mb-4">Are you sure you want to exit the quiz?</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => router.push('/')} className="bg-coral text-white font-bold px-6 py-3 rounded-xl">Yes, Exit</button>
              <button onClick={() => setShowExitConfirm(false)} className="bg-gray-200 text-navy font-bold px-6 py-3 rounded-xl">Continue Quiz</button>
            </div>
          </div>
        </div>
      )}

      {/* Header with question count and exit */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b px-4 py-3 flex justify-between items-center">
        <span className="text-sm font-bold text-navy">Quiz — Question {currentIndex + 1} of {questions.length}</span>
        <button onClick={() => setShowExitConfirm(true)} className="text-gray-400 hover:text-coral font-bold text-sm">✕ Exit</button>
      </div>

      <div className="p-6">
        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-navy transition-all duration-500 rounded-full"
              style={{ width: `${((currentIndex + (selectedAnswer ? 1 : 0)) / questions.length) * 100}%` }} />
          </div>
        </div>

        <div className="max-w-xl mx-auto">
          <p className="text-xl font-semibold text-navy text-center mb-8 leading-relaxed">{q.question}</p>

          <div className="space-y-3">
            {q.choices.map((choice, i) => {
              const letter = String.fromCharCode(65 + i);
              const isSelected = selectedAnswer === choice;
              return (
                <button
                  key={`${currentIndex}-${choice}`}
                  onClick={() => handleAnswer(choice)}
                  onTouchEnd={(e) => e.currentTarget.blur()}
                  disabled={!!selectedAnswer}
                  className={`assessment-choice w-full text-left flex items-center gap-4 focus:outline-none transition-colors ${
                    isSelected ? 'border-navy bg-navy text-white' : 'border-gray-200'
                  }`}
                >
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    isSelected ? 'bg-white text-navy' : 'bg-gray-100 text-navy'
                  }`}>{letter}</span>
                  <span className="flex-1">{choice}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AssessmentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center assessment-mode">
        <p className="text-xl font-bold text-navy">Loading...</p>
      </div>
    }>
      <AssessmentContent />
    </Suspense>
  );
}
