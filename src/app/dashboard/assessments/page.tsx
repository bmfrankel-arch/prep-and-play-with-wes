'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAssessments } from '@/lib/db';
import { Assessment, SKILL_CONFIG, SkillArea, getPerformanceStars } from '@/lib/types';

export default function AssessmentHistoryPage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAssessments().then(a => {
      setAssessments(a);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-xl font-bold text-navy">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push('/dashboard')} className="text-navy font-bold">← Dashboard</button>
          <h1 className="text-2xl font-extrabold text-navy">Assessment History</h1>
          <div />
        </div>

        {assessments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-5xl mb-4">📝</p>
            <p className="text-gray-500">No assessments completed yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assessments.map((a, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl p-4 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-navy">
                      {a.assessment_type === 'weekly' ? 'Weekly Assessment' : SKILL_CONFIG[a.skill_area as SkillArea]?.label || 'Assessment'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {a.completed_at ? new Date(a.completed_at).toLocaleDateString() : ''}
                      {' | Level '}{a.current_level_at_time}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-navy">{a.score}/{a.total_questions}</p>
                    <p className="text-sm">{a.performance_band} {getPerformanceStars(a.performance_band)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex gap-3 no-print">
          <button
            onClick={() => window.print()}
            className="bg-navy text-white font-bold px-6 py-3 rounded-xl"
          >
            Download All Reports
          </button>
          <button
            onClick={() => router.push('/assessment?type=weekly')}
            className="bg-grass text-white font-bold px-6 py-3 rounded-xl"
          >
            Start Weekly Assessment
          </button>
        </div>
      </div>
    </div>
  );
}
