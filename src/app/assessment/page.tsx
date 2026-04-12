'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SkillArea, AssessmentQuestion, getPerformanceBand, getPerformanceStars, SKILL_CONFIG, DifficultyLevel } from '@/lib/types';
import { saveAssessment, getAllSkillProgress, getParentSettings } from '@/lib/db';

function AssessmentContent() {
  const router = useRouter();
  const params = useSearchParams();
  const skillParam = params.get('skill') as SkillArea | null;
  const levelParam = parseInt(params.get('level') || '1') as DifficultyLevel;
  const isWeekly = params.get('type') === 'weekly';

  const [phase, setPhase] = useState<'pin' | 'loading' | 'question' | 'pause' | 'results'>('loading');
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AssessmentQuestion[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState<string | null>(null);

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
      setQuestions(data.questions || []);
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
      if (currentIndex + 1 >= questions.length) {
        finishAssessment(newAnswers);
      } else {
        setCurrentIndex(i => i + 1);
        setSelectedAnswer(null);
        setPhase('question');
      }
    }, 1000);
  };

  const finishAssessment = async (finalAnswers: AssessmentQuestion[]) => {
    const score = finalAnswers.filter(a => a.is_correct).length;
    const total = finalAnswers.length;
    const band = getPerformanceBand(score, total);

    if (isWeekly) {
      const scoresBySkill: Record<string, number> = {};
      finalAnswers.forEach(a => {
        scoresBySkill[a.skill_area] = (scoresBySkill[a.skill_area] || 0) + (a.is_correct ? 1 : 0);
      });
      await saveAssessment({
        assessment_type: 'weekly',
        skill_area: null,
        score,
        total_questions: total,
        performance_band: band,
        questions_detail: finalAnswers,
        current_level_at_time: levelParam,
      });
    } else {
      await saveAssessment({
        assessment_type: 'standard',
        skill_area: skillParam,
        score,
        total_questions: total,
        performance_band: band,
        questions_detail: finalAnswers,
        current_level_at_time: levelParam,
      });
    }
    setPhase('results');
  };

  // PIN entry
  if (phase === 'pin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 assessment-mode">
        <div className="max-w-sm w-full text-center">
          <p className="text-5xl mb-4">🔒</p>
          <h2 className="text-2xl font-bold text-navy mb-4">Parent PIN Required</h2>
          <input
            type="password"
            maxLength={4}
            value={pinInput}
            onChange={e => setPinInput(e.target.value)}
            className="text-center text-3xl tracking-widest border-2 border-gray-300 rounded-xl p-3 w-40 mb-4"
            placeholder="••••"
          />
          <br />
          <button onClick={handlePinSubmit} className="bg-navy text-white font-bold px-8 py-3 rounded-xl">
            Start Assessment
          </button>
        </div>
      </div>
    );
  }

  // Loading
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

  // Results
  if (phase === 'results') {
    const score = answers.filter(a => a.is_correct).length;
    const total = answers.length;
    const band = getPerformanceBand(score, total);
    const stars = getPerformanceStars(band);

    // For weekly, group by skill
    const skillGroups: Record<string, AssessmentQuestion[]> = {};
    if (isWeekly) {
      answers.forEach(a => {
        if (!skillGroups[a.skill_area]) skillGroups[a.skill_area] = [];
        skillGroups[a.skill_area].push(a);
      });
    }

    return (
      <div className="min-h-screen p-6 assessment-mode">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-5xl mb-3">🎓</p>
            <h1 className="text-3xl font-bold text-navy mb-2">All done, Wes! Great job.</h1>
            <p className="text-2xl font-bold text-navy">{score} out of {total} correct</p>
            <p className="text-xl mt-2">{band} {stars}</p>
          </div>

          {isWeekly && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <h3 className="font-bold text-navy mb-2">Score by Skill Area:</h3>
              {Object.entries(skillGroups).map(([skill, qs]) => (
                <p key={skill} className="text-navy">
                  {SKILL_CONFIG[skill as SkillArea]?.label || skill}: {qs.filter(q => q.is_correct).length}/{qs.length}
                </p>
              ))}
            </div>
          )}

          <div className="space-y-3 mb-8">
            {answers.map((a, i) => (
              <div key={i} className={`p-4 rounded-xl border-2 ${a.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{a.is_correct ? '✅' : '❌'}</span>
                  <div className="flex-1">
                    <p className="font-bold text-navy text-sm">Q{i + 1}. {a.question}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Your answer: <strong>{a.wes_answer}</strong>
                    </p>
                    {!a.is_correct && (
                      <p className="text-sm text-green-700 mt-1">
                        Correct answer: <strong>{a.correct_answer}</strong>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-center no-print">
            <button onClick={() => window.print()} className="bg-navy text-white font-bold px-6 py-3 rounded-xl">
              Print This Report
            </button>
            <button onClick={() => router.push('/')} className="bg-gray-200 text-navy font-bold px-6 py-3 rounded-xl">
              Back to Games
            </button>
          </div>

          {/* Print-only header */}
          <div className="hidden print-only">
            <h1 className="text-2xl font-bold mb-2">Prep & Play with Wes — Practice Assessment Report</h1>
            <p>Date: {new Date().toLocaleDateString()}</p>
            <p>Skill Area: {isWeekly ? 'Weekly Cross-Skill' : SKILL_CONFIG[skillParam as SkillArea]?.label}</p>
            <p>Difficulty Level: {levelParam}</p>
            <p>Score: {score}/{total} — {band}</p>
            <hr className="my-4" />
            <div className="mt-8 border-t pt-4">
              <h3 className="font-bold">Parent Notes:</h3>
              <div className="h-32 border border-gray-300 rounded mt-2" />
            </div>
            <p className="text-xs mt-4 text-gray-400">
              This is a practice assessment designed to build familiarity with standardized testing formats.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Question display
  const q = questions[currentIndex];
  if (!q) return null;

  return (
    <div className="min-h-screen p-6 assessment-mode">
      {/* Progress bar */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-navy transition-all duration-500 rounded-full"
            style={{ width: `${((currentIndex + (selectedAnswer ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
        <p className="text-sm text-gray-400 text-right mt-1">
          Question {currentIndex + 1} of {questions.length}
        </p>
      </div>

      <div className="max-w-xl mx-auto">
        <p className="text-xl font-semibold text-navy text-center mb-8 leading-relaxed">
          {q.question}
        </p>

        <div className="space-y-3">
          {q.choices.map((choice, i) => {
            const letter = String.fromCharCode(65 + i);
            const isSelected = selectedAnswer === choice;
            return (
              <button
                key={choice}
                onClick={() => handleAnswer(choice)}
                disabled={!!selectedAnswer}
                className={`assessment-choice w-full text-left flex items-center gap-4 ${
                  isSelected ? 'border-navy bg-navy text-white' : ''
                }`}
              >
                <span className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  isSelected ? 'bg-white text-navy' : 'bg-gray-100 text-navy'
                }`}>
                  {letter}
                </span>
                <span className="flex-1">{choice}</span>
              </button>
            );
          })}
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
