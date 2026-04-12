'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SkillArea, SkillProgress, SKILL_CONFIG, DifficultyLevel, LEVEL_NAMES } from '@/lib/types';
import { getAllSkillProgress, getGameSessions, getStreak, updateSkillProgress, getSkillProgress, lockDashboard } from '@/lib/db';
import BadgeDisplay from '@/components/BadgeDisplay';

type Tab = 'progress' | 'assessments' | 'lessons' | 'settings';

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('progress');
  const [progress, setProgress] = useState<SkillProgress[]>([]);
  const [sessions, setSessions] = useState<{ skill_area: string; played_at?: string; score: number; total_questions: number }[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [p, s, st] = await Promise.all([
      getAllSkillProgress(),
      getGameSessions(7),
      getStreak(),
    ]);
    setProgress(p);
    setSessions(s);
    setStreak(st);
    setLoading(false);
  };

  const isUltimateChampion = progress.every(p => p.current_level >= 3);

  const handleResetLevel = async (skill: SkillArea) => {
    const p = await getSkillProgress(skill);
    await updateSkillProgress({ ...p, current_level: 1, consecutive_correct: 0, consecutive_wrong: 0 });
    loadData();
  };

  const handleBoostLevel = async (skill: SkillArea) => {
    const p = await getSkillProgress(skill);
    if (p.current_level < 2) {
      const unlocks = [...p.unlocks_earned];
      const un = SKILL_CONFIG[skill].unlocks[2]?.name;
      if (un && !unlocks.includes(un)) unlocks.push(un);
      await updateSkillProgress({ ...p, current_level: 2, consecutive_correct: 0, consecutive_wrong: 0, unlocks_earned: unlocks });
    }
    loadData();
  };

  // Count sessions per skill this week
  const skillCounts: Record<string, number> = {};
  sessions.forEach(s => {
    skillCounts[s.skill_area] = (skillCounts[s.skill_area] || 0) + 1;
  });

  // Activity by day
  const dayActivity: Record<string, Set<string>> = {};
  sessions.forEach(s => {
    const day = new Date(s.played_at!).toLocaleDateString('en-US', { weekday: 'short' });
    if (!dayActivity[day]) dayActivity[day] = new Set();
    dayActivity[day].add(s.skill_area);
  });

  // All unlocks
  const allUnlocks = progress.flatMap(p =>
    p.unlocks_earned.map(u => ({ skill: p.skill_area, unlock: u }))
  );

  const needsPractice = (['word_wizard', 'pattern_detective', 'memory_master', 'math_explorer', 'confidence_coach', 'story_builder'] as SkillArea[])
    .filter(s => (skillCounts[s] || 0) < 3);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-xl font-bold text-navy">Loading dashboard...</p></div>;
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push('/')} className="text-navy font-bold">← Home</button>
          <h1 className="text-2xl font-extrabold text-navy">Parent Dashboard</h1>
          <button onClick={() => { lockDashboard(); router.push('/'); }} className="text-sm text-gray-400 hover:text-coral font-bold">🔒 Lock</button>
        </div>

        {/* Wes header */}
        <div className="bg-navy/5 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-navy mb-4">Wes&apos;s Progress</h2>
          <div className="flex gap-3 justify-center mb-4 flex-wrap">
            {progress.map(p => (
              <BadgeDisplay
                key={p.skill_area}
                skillArea={p.skill_area as SkillArea}
                level={p.current_level as DifficultyLevel}
                size="md"
                showLabel
              />
            ))}
          </div>
          <div className="flex gap-4 justify-center text-sm">
            <span className="font-bold text-coral">🔥 {streak} day streak</span>
            {isUltimateChampion && (
              <button onClick={() => router.push('/champion')} className="font-bold text-gold">
                🏆 Ultimate Champion!
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: 'progress' as const, label: 'Progress', route: '' },
            { id: 'assessments' as const, label: 'Assessments', route: '/dashboard/assessments' },
            { id: 'lessons' as const, label: 'Lesson Plans', route: '/dashboard/lesson-plans' },
            { id: 'weekly-report' as const, label: 'Weekly Report', route: '/dashboard/weekly-report' },
            { id: 'word-bank' as const, label: 'Word Bank', route: '/dashboard/word-bank' },
            { id: 'settings' as const, label: 'Settings', route: '/dashboard/settings' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.route) router.push(tab.route);
                else setActiveTab('progress');
              }}
              className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap ${
                activeTab === tab.id ? 'bg-navy text-white' : 'bg-gray-100 text-navy'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            {/* Last 7 days */}
            <div className="bg-white border rounded-2xl p-4">
              <h3 className="font-bold text-navy mb-3">Last 7 Days</h3>
              <div className="grid grid-cols-7 gap-2 text-center">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => {
                  const skills = dayActivity[day];
                  return (
                    <div key={day}>
                      <p className="text-xs text-gray-400 mb-1">{day}</p>
                      <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-xs font-bold ${
                        skills ? 'bg-grass text-white' : 'bg-gray-100 text-gray-300'
                      }`}>
                        {skills ? skills.size : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sessions by skill */}
            <div className="bg-white border rounded-2xl p-4">
              <h3 className="font-bold text-navy mb-3">Sessions This Week</h3>
              {(['word_wizard', 'pattern_detective', 'memory_master', 'math_explorer', 'confidence_coach'] as SkillArea[]).map(skill => {
                const count = skillCounts[skill] || 0;
                const config = SKILL_CONFIG[skill];
                return (
                  <div key={skill} className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-bold w-36">{config.label}</span>
                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${config.bgColor}`}
                        style={{ width: `${Math.min((count / 10) * 100, 100)}%`, opacity: 0.7 }}
                      />
                    </div>
                    <span className="text-sm font-bold w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>

            {/* Needs practice */}
            {needsPractice.length > 0 && (
              <div className="bg-coral/10 border border-coral/20 rounded-2xl p-4">
                <h3 className="font-bold text-coral mb-2">📚 Needs More Practice</h3>
                <p className="text-sm text-gray-600">
                  These areas have fewer than 3 sessions this week:{' '}
                  {needsPractice.map(s => SKILL_CONFIG[s].label).join(', ')}
                </p>
              </div>
            )}

            {/* Difficulty controls */}
            <div className="bg-white border rounded-2xl p-4">
              <h3 className="font-bold text-navy mb-3">Difficulty Controls</h3>
              {progress.map(p => (
                <div key={p.skill_area} className="flex items-center gap-3 mb-3 pb-3 border-b last:border-0">
                  <div className="flex-1">
                    <p className="font-bold text-sm text-navy">{SKILL_CONFIG[p.skill_area as SkillArea].label}</p>
                    <p className="text-xs text-gray-500">
                      Level {p.current_level} — {LEVEL_NAMES[p.current_level as DifficultyLevel]} |
                      {p.consecutive_correct} correct in a row
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {'★'.repeat(p.current_level)}{'☆'.repeat(3 - p.current_level)}
                  </div>
                  <button onClick={() => handleResetLevel(p.skill_area as SkillArea)} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    Reset L1
                  </button>
                  {p.current_level < 2 && (
                    <button onClick={() => handleBoostLevel(p.skill_area as SkillArea)} className="text-xs bg-grass/20 text-grass px-2 py-1 rounded">
                      Boost L2
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Unlocks */}
            <div className="bg-white border rounded-2xl p-4">
              <h3 className="font-bold text-navy mb-3">🏆 Unlock Inventory</h3>
              {allUnlocks.length === 0 ? (
                <p className="text-sm text-gray-400">No unlocks yet — keep playing!</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {allUnlocks.map((u, i) => (
                    <div key={i} className="bg-gold/10 rounded-xl p-3 border border-gold/20">
                      <p className="font-bold text-sm text-navy">{u.unlock}</p>
                      <p className="text-xs text-gray-500">{SKILL_CONFIG[u.skill as SkillArea].label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => router.push('/assessment?type=weekly')}
                className="bg-navy text-white font-bold px-6 py-3 rounded-xl"
              >
                Start Weekly Assessment
              </button>
              <button
                onClick={() => router.push('/words')}
                className="bg-coral text-white font-bold px-6 py-3 rounded-xl"
              >
                Word Collection
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
