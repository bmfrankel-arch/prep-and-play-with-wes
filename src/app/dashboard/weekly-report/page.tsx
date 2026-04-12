'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SkillArea, SKILL_CONFIG, DifficultyLevel, LEVEL_NAMES, getPerformanceStars } from '@/lib/types';
import { getAllSkillProgress, getGameSessions, getStreak, getAssessments, getWordCollection, getStories, saveWeeklyReport, getWeeklyReports } from '@/lib/db';
import { ALL_SKILLS } from '@/lib/db';

interface ReportData {
  dateRange: string;
  weekStart: string;
  weekEnd: string;
  totalSessions: number;
  activeDays: number;
  streak: number;
  skillSnapshot: { skill: SkillArea; sessions: number; level: number; avgScore: number; change: string }[];
  assessments: { date: string; skill: string; score: string; band: string }[];
  newWords: string[];
  totalWords: number;
  storiesWritten: number;
  totalStories: number;
  unlocks: string[];
  needsAttention: string[];
}

export default function WeeklyReportPage() {
  const router = useRouter();
  const [report, setReport] = useState<ReportData | null>(null);
  const [pastReports, setPastReports] = useState<{ id: string; dateRange: string; data: ReportData }[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewingPast, setViewingPast] = useState<ReportData | null>(null);

  useEffect(() => {
    getWeeklyReports().then(reports => {
      setPastReports(reports.map(r => ({
        id: r.id || '',
        dateRange: `${r.week_start} — ${r.week_end}`,
        data: r.report_data as ReportData,
      })));
    });
  }, []);

  const generateReport = async () => {
    setLoading(true);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const [progress, sessions, streak, assessments, words, stories] = await Promise.all([
      getAllSkillProgress(),
      getGameSessions(7),
      getStreak(),
      getAssessments(),
      getWordCollection(),
      getStories(),
    ]);

    const weekAssessments = assessments.filter(a => a.completed_at && new Date(a.completed_at) >= weekStart);
    const weekWords = words.filter(w => w.mastered_at && new Date(w.mastered_at) >= weekStart);
    const weekStories = stories.filter(s => s.completed_at && new Date(s.completed_at) >= weekStart);

    const activeDays = new Set(sessions.map(s => new Date(s.played_at!).toDateString())).size;

    const skillSnapshot = ALL_SKILLS.map(skill => {
      const skillSessions = sessions.filter(s => s.skill_area === skill);
      const p = progress.find(p => p.skill_area === skill);
      const avgScore = skillSessions.length > 0
        ? Math.round(skillSessions.reduce((sum, s) => sum + (s.score / s.total_questions) * 100, 0) / skillSessions.length)
        : 0;
      return {
        skill,
        sessions: skillSessions.length,
        level: p?.current_level || 1,
        avgScore,
        change: '➡️', // Would need historical comparison
      };
    });

    const needsAttention = skillSnapshot.filter(s => s.sessions === 0).map(s => SKILL_CONFIG[s.skill].label);

    const reportData: ReportData = {
      dateRange: `${weekStart.toLocaleDateString()} — ${now.toLocaleDateString()}`,
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: now.toISOString().split('T')[0],
      totalSessions: sessions.length,
      activeDays,
      streak,
      skillSnapshot,
      assessments: weekAssessments.map(a => ({
        date: a.completed_at ? new Date(a.completed_at).toLocaleDateString() : '',
        skill: a.assessment_type === 'weekly' ? 'Weekly' : SKILL_CONFIG[a.skill_area as SkillArea]?.label || '',
        score: `${a.score}/${a.total_questions}`,
        band: a.performance_band,
      })),
      newWords: weekWords.map(w => w.word),
      totalWords: words.length,
      storiesWritten: weekStories.length,
      totalStories: stories.length,
      unlocks: progress.flatMap(p => p.unlocks_earned),
      needsAttention,
    };

    setReport(reportData);
    await saveWeeklyReport({
      week_start: reportData.weekStart,
      week_end: reportData.weekEnd,
      report_data: reportData,
    });
    setLoading(false);
  };

  const displayReport = viewingPast || report;

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push('/dashboard')} className="text-navy font-bold">← Dashboard</button>
          <h1 className="text-2xl font-extrabold text-navy">Weekly Report</h1>
          <div />
        </div>

        {!displayReport ? (
          <div className="text-center py-12">
            <p className="text-5xl mb-4">📊</p>
            <button
              onClick={generateReport}
              disabled={loading}
              className="bg-navy text-white font-bold px-8 py-4 rounded-xl text-lg disabled:opacity-50"
            >
              {loading ? 'Generating...' : "Generate This Week's Report"}
            </button>

            {pastReports.length > 0 && (
              <div className="mt-8">
                <h3 className="font-bold text-navy mb-3">Past Reports</h3>
                <div className="space-y-2">
                  {pastReports.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => setViewingPast(r.data)}
                      className="w-full bg-gray-50 rounded-xl p-3 text-left hover:bg-gray-100"
                    >
                      <p className="font-bold text-navy text-sm">{r.dateRange}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {viewingPast && (
              <button onClick={() => setViewingPast(null)} className="text-sm text-coral font-bold mb-4 block">
                ← Back to reports
              </button>
            )}

            {/* 1. Header */}
            <div className="bg-navy/5 rounded-2xl p-5 mb-6 text-center">
              <h2 className="text-xl font-bold text-navy mb-1">Wes&apos;s Week in Review</h2>
              <p className="text-sm text-gray-500">{displayReport.dateRange}</p>
              <p className="text-lg mt-2">Wes played <strong>{displayReport.totalSessions}</strong> sessions across <strong>{displayReport.activeDays}</strong> days</p>
              {displayReport.streak > 0 && <p className="text-coral font-bold mt-1">🔥 {displayReport.streak} day streak!</p>}
            </div>

            {/* 2. Skill Snapshot */}
            <div className="bg-white border rounded-2xl p-4 mb-6">
              <h3 className="font-bold text-navy mb-3">Skill Snapshot</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="pb-2">Skill</th>
                      <th className="pb-2">Sessions</th>
                      <th className="pb-2">Level</th>
                      <th className="pb-2">Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayReport.skillSnapshot.map(s => (
                      <tr key={s.skill} className={`border-t ${s.sessions === 0 ? 'bg-red-50' : s.sessions < 3 ? 'bg-yellow-50' : 'bg-green-50'}`}>
                        <td className="py-2 font-bold">{SKILL_CONFIG[s.skill]?.label}</td>
                        <td className="py-2">{s.sessions}</td>
                        <td className="py-2">{LEVEL_NAMES[s.level as DifficultyLevel]} {s.change}</td>
                        <td className="py-2">{s.avgScore}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Assessments */}
            {displayReport.assessments.length > 0 && (
              <div className="bg-white border rounded-2xl p-4 mb-6">
                <h3 className="font-bold text-navy mb-3">Assessments This Week</h3>
                {displayReport.assessments.map((a, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm">{a.date} — {a.skill}</span>
                    <span className="font-bold text-sm">{a.score} {getPerformanceStars(a.band as Parameters<typeof getPerformanceStars>[0])}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 4. Vocabulary */}
            <div className="bg-white border rounded-2xl p-4 mb-6">
              <h3 className="font-bold text-navy mb-2">Vocabulary Progress</h3>
              <p className="text-sm text-gray-600">New words this week: <strong>{displayReport.newWords.length}</strong></p>
              {displayReport.newWords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {displayReport.newWords.map(w => (
                    <span key={w} className="bg-coral/10 text-coral text-xs px-2 py-1 rounded-full font-bold">{w}</span>
                  ))}
                </div>
              )}
              <p className="text-sm text-gray-500 mt-2">Total collection: {displayReport.totalWords} words</p>
            </div>

            {/* 5. Stories */}
            <div className="bg-white border rounded-2xl p-4 mb-6">
              <h3 className="font-bold text-navy mb-2">Stories Written</h3>
              <p className="text-sm text-gray-600">This week: <strong>{displayReport.storiesWritten}</strong> | All time: <strong>{displayReport.totalStories}</strong></p>
            </div>

            {/* 7. Needs Attention */}
            {displayReport.needsAttention.length > 0 && (
              <div className="bg-coral/10 border border-coral/20 rounded-2xl p-4 mb-6">
                <h3 className="font-bold text-coral mb-2">⚠️ Needs Attention</h3>
                <p className="text-sm text-gray-700">
                  No sessions this week: {displayReport.needsAttention.join(', ')}
                </p>
              </div>
            )}

            {/* Print */}
            <div className="flex gap-3 no-print">
              <button onClick={() => window.print()} className="bg-navy text-white font-bold px-6 py-3 rounded-xl">
                Print This Report
              </button>
              {!viewingPast && (
                <button onClick={() => { setReport(null); }} className="bg-gray-200 text-navy font-bold px-6 py-3 rounded-xl">
                  Generate New
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
