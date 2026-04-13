'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAllSkillProgress, saveLessonPlan } from '@/lib/db';
import { SkillArea, SKILL_CONFIG, DifficultyLevel, LEVEL_NAMES, DayPlan, SkillProgress } from '@/lib/types';

const ALL_SKILLS: SkillArea[] = ['word_wizard', 'pattern_detective', 'memory_master', 'math_explorer', 'confidence_coach', 'story_builder'];

export default function LessonPlansPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<SkillProgress[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<Set<SkillArea>>(new Set(ALL_SKILLS));
  const [plan, setPlan] = useState<DayPlan[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    getAllSkillProgress().then(p => {
      setProgress(p);
      setDataLoading(false);
    });
  }, []);

  const toggleArea = (area: SkillArea) => {
    const next = new Set(selectedAreas);
    if (next.has(area)) next.delete(area);
    else next.add(area);
    setSelectedAreas(next);
  };

  const generatePlan = async () => {
    setLoading(true);
    const levels: Record<string, number> = {};
    progress.forEach(p => { levels[p.skill_area] = p.current_level; });

    try {
      const res = await fetch('/api/lesson-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          focusAreas: Array.from(selectedAreas),
          levels,
        }),
      });
      const data = await res.json();
      const generated = data.plan || [];
      setPlan(generated);

      await saveLessonPlan({
        focus_areas: Array.from(selectedAreas),
        plan_content: generated,
      });
    } catch {
      // Error handling
    }
    setLoading(false);
  };

  if (dataLoading) return <div className="min-h-screen flex items-center justify-center"><p className="text-xl font-bold text-navy">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push('/dashboard')} className="text-navy font-bold">← Dashboard</button>
          <h1 className="text-2xl font-extrabold text-navy">Lesson Plans</h1>
          <div />
        </div>

        {!plan ? (
          <div>
            {/* Level summary */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-6">
              <h3 className="font-bold text-navy mb-2">Current Levels</h3>
              {progress.map(p => (
                <p key={p.skill_area} className="text-sm text-gray-600">
                  {SKILL_CONFIG[p.skill_area as SkillArea].label}: Level {p.current_level} — {LEVEL_NAMES[p.current_level as DifficultyLevel]}
                </p>
              ))}
            </div>

            {/* Select areas */}
            <h3 className="font-bold text-navy mb-3">Focus Areas for This Week</h3>
            <div className="space-y-2 mb-6">
              {ALL_SKILLS.map(skill => (
                <label key={skill} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedAreas.has(skill)}
                    onChange={() => toggleArea(skill)}
                    className="w-5 h-5 rounded"
                  />
                  <span className="font-semibold text-navy">{SKILL_CONFIG[skill].label}</span>
                </label>
              ))}
            </div>

            <button
              onClick={generatePlan}
              disabled={loading || selectedAreas.size === 0}
              className="w-full bg-navy text-white font-bold py-4 rounded-xl text-lg disabled:opacity-50"
            >
              {loading ? 'Generating Plan...' : "Generate This Week's Plan"}
            </button>
          </div>
        ) : (
          <div>
            {/* Print header */}
            <div className="mb-6 print:mb-4">
              <h2 className="text-xl font-bold text-navy">Wes&apos;s Weekly Plan</h2>
              <p className="text-sm text-gray-500">Generated: {new Date().toLocaleDateString()}</p>
              <p className="text-sm text-gray-500">
                Focus: {Array.from(selectedAreas).map(s => SKILL_CONFIG[s].label).join(', ')}
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {progress.map(p => (
                  <span key={p.skill_area} className="text-xs bg-navy/10 text-navy px-2 py-1 rounded-lg">
                    {SKILL_CONFIG[p.skill_area as SkillArea].label}: L{p.current_level}
                  </span>
                ))}
              </div>
            </div>

            {plan.map((day, i) => (
              <div key={i} className={`mb-6 bg-gray-50 rounded-2xl p-5 ${i > 0 ? 'print-break' : ''}`}>
                <h3 className="text-lg font-bold text-navy mb-1">{day.day}</h3>
                <h4 className="text-coral font-bold mb-3">{day.activity}</h4>
                <div className="mb-3">
                  <p className="text-sm text-gray-700 whitespace-pre-line">{day.instructions}</p>
                </div>
                <div className="bg-sunshine/10 rounded-xl p-3 mb-2">
                  <p className="text-sm font-bold text-navy mb-1">Quick Tips for Today:</p>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{day.quick_tips}</p>
                </div>
                <p className="text-xs text-gray-400">Materials: {day.materials}</p>
              </div>
            ))}

            <div className="flex gap-3 no-print">
              <button onClick={() => window.print()} className="bg-navy text-white font-bold px-6 py-3 rounded-xl">
                Print Plan
              </button>
              <button onClick={() => setPlan(null)} className="bg-gray-200 text-navy font-bold px-6 py-3 rounded-xl">
                Generate New Plan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
