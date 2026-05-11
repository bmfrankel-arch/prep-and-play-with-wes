'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SkillArea, SkillProgress, SKILL_CONFIG, DifficultyLevel, LEVEL_NAMES } from '@/lib/types';
import {
  getAllSkillProgress, getGameSessions, getStreak, updateSkillProgress, getSkillProgress, lockDashboard,
  getAnimalCollection, getBattleStats, getXpTransactions, getBonusXp, getBattles,
  getDadMessages, sendDadMessage,
  getWeeklyLetters, sendWeeklyLetter,
  getActiveChallenge, getLatestChallenge, createChallenge, deactivateActiveChallenge,
  getStories,
} from '@/lib/db';
import {
  AnimalUnlock, BattleStats, XpTransaction, BattleRecord,
  DadMessage, WeeklyLetter, DadChallenge, ChallengeType,
} from '@/lib/types';
import { CHALLENGE_OPTIONS, captureBaseline } from '@/lib/challenge';
import { ANIMALS } from '@/data/animals';
import BadgeDisplay from '@/components/BadgeDisplay';

type Tab = 'progress' | 'assessments' | 'lessons' | 'settings';

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('progress');
  const [progress, setProgress] = useState<SkillProgress[]>([]);
  const [sessions, setSessions] = useState<{ skill_area: string; played_at?: string; score: number; total_questions: number }[]>([]);
  const [streak, setStreak] = useState(0);
  const [animalCol, setAnimalCol] = useState<AnimalUnlock[]>([]);
  const [battleSt, setBattleSt] = useState<BattleStats | null>(null);
  const [xpTxs, setXpTxs] = useState<XpTransaction[]>([]);
  const [bonusXp, setBonusXp] = useState(0);
  const [battles, setBattles] = useState<BattleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Dad's workshop
  const [dadMessages, setDadMessages] = useState<DadMessage[]>([]);
  const [dadMessageDraft, setDadMessageDraft] = useState('');
  const [weeklyLetters, setWeeklyLetters] = useState<WeeklyLetter[]>([]);
  const [letterDraft, setLetterDraft] = useState('');
  const [activeChallenge, setActiveChallenge] = useState<DadChallenge | null>(null);
  const [challengeType, setChallengeType] = useState<ChallengeType>('unlock_animals');
  const [challengeTarget, setChallengeTarget] = useState<number>(3);
  const [customChallengeText, setCustomChallengeText] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [p, s, st, ac, txs, bs, dm, wl, ach] = await Promise.all([
      getAllSkillProgress(),
      getGameSessions(7),
      getStreak(),
      getAnimalCollection(),
      getXpTransactions(200),
      getBattles(50),
      getDadMessages(10),
      getWeeklyLetters(10),
      getActiveChallenge(),
    ]);
    setProgress(p);
    setSessions(s);
    setStreak(st);
    setAnimalCol(ac);
    setBattleSt(getBattleStats());
    setXpTxs(txs);
    setBonusXp(getBonusXp());
    setBattles(bs);
    setDadMessages(dm);
    setWeeklyLetters(wl);
    setActiveChallenge(ach);
    // If no active challenge, also show the most recent past one for context.
    if (!ach) {
      const latest = await getLatestChallenge();
      if (latest) setActiveChallenge(latest);
    }
    setLoading(false);
  };

  const handleSendDadMessage = async () => {
    if (!dadMessageDraft.trim()) return;
    await sendDadMessage(dadMessageDraft.trim());
    setDadMessageDraft('');
    const dm = await getDadMessages(10);
    setDadMessages(dm);
  };

  const handleSendWeeklyLetter = async () => {
    const text = letterDraft.trim();
    if (!text) return;
    await sendWeeklyLetter(text.slice(0, 500));
    setLetterDraft('');
    const wl = await getWeeklyLetters(10);
    setWeeklyLetters(wl);
  };

  const handleSetChallenge = async () => {
    const opt = CHALLENGE_OPTIONS.find(o => o.type === challengeType);
    if (!opt) return;
    const target = opt.withTarget ? challengeTarget : null;
    const description = challengeType === 'custom'
      ? (customChallengeText.trim() || 'A special challenge from Dad!')
      : opt.describe(target);
    const [collection, allBattles, sessionsAll, stories] = await Promise.all([
      getAnimalCollection(), getBattles(500), getGameSessions(365), getStories(),
    ]);
    const baseline = captureBaseline({
      collection, battles: allBattles, sessions: sessionsAll, stories, stats: getBattleStats(),
    });
    await createChallenge({
      challenge_type: challengeType,
      challenge_description: description,
      target_value: target,
      current_progress: 0,
      baseline_snapshot: baseline,
      is_active: true,
      is_completed: false,
    });
    setCustomChallengeText('');
    const ach = await getActiveChallenge();
    setActiveChallenge(ach);
  };

  const handleRemoveChallenge = async () => {
    await deactivateActiveChallenge();
    setActiveChallenge(null);
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
          <h2 className="text-xl font-bold text-navy mb-4">Look How Far Wes Has Come 🌟</h2>
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

            {/* Animal Collection */}
            <div className="bg-white border rounded-2xl p-4">
              <h3 className="font-bold text-navy mb-3">🦁 Animal Collection</h3>
              <p className="text-sm text-gray-600 mb-2">
                {animalCol.length} of {ANIMALS.length} animals unlocked ({Math.round((animalCol.length / ANIMALS.length) * 100)}%)
              </p>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full" style={{ width: `${(animalCol.length / ANIMALS.length) * 100}%` }} />
              </div>
              <div className="flex gap-3 text-xs">
                <span className="text-yellow-500 font-bold">🟡 {animalCol.filter(a => a.rarity === 'legendary').length} Legendary</span>
                <span className="text-purple-500 font-bold">🟣 {animalCol.filter(a => a.rarity === 'epic').length} Epic</span>
                <span className="text-blue-500 font-bold">🔵 {animalCol.filter(a => a.rarity === 'rare').length} Rare</span>
                <span className="text-green-500 font-bold">🟢 {animalCol.filter(a => a.rarity === 'common').length} Common</span>
              </div>
              {animalCol.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  Latest: {ANIMALS.find(a => a.id === animalCol[0]?.animal_id)?.name || 'Unknown'} — {animalCol[0]?.unlocked_at ? new Date(animalCol[0].unlocked_at).toLocaleDateString() : ''}
                </p>
              )}
            </div>

            {/* Animal Training */}
            {(() => {
              const weekAgo = Date.now() - 7 * 86400000;
              const weekTxs = xpTxs.filter(t => t.awarded_at && new Date(t.awarded_at).getTime() >= weekAgo);
              const weeklyXp = weekTxs.reduce((sum, t) => sum + (t.xp_amount || 0), 0);
              const bySource: Record<string, number> = {};
              weekTxs.forEach(t => { bySource[t.source] = (bySource[t.source] || 0) + (t.xp_amount || 0); });
              const byAnimal: Record<string, number> = {};
              xpTxs.forEach(t => { byAnimal[t.animal_id] = (byAnimal[t.animal_id] || 0) + (t.xp_amount || 0); });
              const mostTrainedId = Object.entries(byAnimal).sort((a, b) => b[1] - a[1])[0]?.[0];
              const mostTrained = mostTrainedId ? ANIMALS.find(a => a.id === mostTrainedId) : null;
              const maxCount = animalCol.filter(a => a.is_max_level).length;
              const leaderboard = [...animalCol]
                .sort((a, b) => {
                  const aLvl = a.current_level ?? 1, bLvl = b.current_level ?? 1;
                  if (aLvl !== bLvl) return bLvl - aLvl;
                  return (b.total_xp_earned ?? 0) - (a.total_xp_earned ?? 0);
                })
                .slice(0, 5);
              return (
                <div className="bg-white border rounded-2xl p-4">
                  <h3 className="font-bold text-navy mb-3">💪 Animal Training</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <p>Total XP this week: <strong>{weeklyXp}</strong></p>
                    <p>Animals at MAX (Lv.5): <strong>{maxCount}</strong></p>
                    <p>Most trained: <strong>{mostTrained ? `${mostTrained.emoji} ${mostTrained.name}` : '—'}</strong></p>
                    <p>Bonus XP pool: <strong>{bonusXp}</strong></p>
                  </div>
                  {Object.keys(bySource).length > 0 && (
                    <div className="mb-4">
                      <p className="font-bold text-navy text-sm mb-2">XP by source (last 7 days):</p>
                      {Object.entries(bySource).sort((a, b) => b[1] - a[1]).map(([src, xp]) => {
                        const pct = weeklyXp > 0 ? Math.round((xp / weeklyXp) * 100) : 0;
                        return (
                          <div key={src} className="flex items-center gap-3 mb-1">
                            <span className="text-xs w-32 truncate">{src.replace(/_/g, ' ')}</span>
                            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-bold w-10 text-right">{xp}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="font-bold text-navy text-sm mb-2">Top 5 by level:</p>
                  {leaderboard.length === 0 && <p className="text-sm text-gray-400">No animals yet — keep playing!</p>}
                  {leaderboard.map((a, i) => {
                    const animal = ANIMALS.find(x => x.id === a.animal_id);
                    if (!animal) return null;
                    const lvl = a.current_level ?? 1;
                    const isMax = a.is_max_level ?? false;
                    return (
                      <div key={a.animal_id} className="flex items-center gap-2 text-sm py-1 border-b last:border-0">
                        <span className="text-gray-400 w-5">{i + 1}.</span>
                        <span className="text-xl">{animal.emoji}</span>
                        <span className="flex-1 font-bold text-navy truncate">{animal.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isMax ? 'bg-yellow-400 text-navy' : lvl >= 3 ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'
                        }`}>Lv.{lvl}{isMax ? ' ⭐' : ''}</span>
                        <span className="text-xs text-gray-500 w-16 text-right">{a.total_xp_earned ?? 0} XP</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Battle Stats */}
            {battleSt && battleSt.total_battles > 0 && (
              <div className="bg-white border rounded-2xl p-4">
                <h3 className="font-bold text-navy mb-3">⚔️ Battle Arena Stats</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <p>Total battles: <strong>{battleSt.total_battles}</strong></p>
                  <p>Accuracy: <strong>{Math.round((battleSt.total_wins_predicted / battleSt.total_battles) * 100)}%</strong></p>
                  <p>Current streak: <strong>🔥 {battleSt.current_streak}</strong></p>
                  <p>Best streak: <strong>🏆 {battleSt.best_streak}</strong></p>
                </div>
              </div>
            )}

            {/* Battle Learning */}
            {battles.length > 0 && (() => {
              const recent = battles.slice(0, 10);
              const animalById = (id: string) => ANIMALS.find(a => a.id === id);
              // Biggest upset — winner with lowest powerLevel relative to loser
              let upset: { battle: BattleRecord; gap: number } | null = null;
              for (const b of battles) {
                if (!b.winner_animal_id || b.is_tie) continue;
                const winnerId = b.winner_animal_id;
                const winner = animalById(winnerId);
                const loserId = winnerId === b.wes_animal_id ? b.opponent_animal_id : b.wes_animal_id;
                const loser = animalById(loserId);
                if (!winner || !loser) continue;
                const gap = loser.powerLevel - winner.powerLevel;
                if (gap > 0 && (!upset || gap > upset.gap)) {
                  upset = { battle: b, gap };
                }
              }
              // Favourite fighter — most-selected by Wes
              const wesCounts: Record<string, number> = {};
              battles.forEach(b => { wesCounts[b.wes_animal_id] = (wesCounts[b.wes_animal_id] || 0) + 1; });
              const favEntry = Object.entries(wesCounts).sort((a, b) => b[1] - a[1])[0];
              const favourite = favEntry ? animalById(favEntry[0]) : null;
              // WOW vs Cool counts this week
              const weekAgo = Date.now() - 7 * 86400000;
              const weekBattles = battles.filter(b => b.battled_at && new Date(b.battled_at).getTime() >= weekAgo);
              const wowCount = weekBattles.filter(b => b.battle_reaction === 'wow').length;
              const coolCount = weekBattles.filter(b => b.battle_reaction === 'cool').length;
              // Win rate by terrain (where Wes's animal won)
              const terrainStats: Record<string, { wins: number; total: number }> = {};
              battles.forEach(b => {
                if (!b.terrain) return;
                terrainStats[b.terrain] = terrainStats[b.terrain] || { wins: 0, total: 0 };
                terrainStats[b.terrain].total++;
                if (b.winner_animal_id === b.wes_animal_id) terrainStats[b.terrain].wins++;
              });
              // Most common deciding factor type
              const modCounts: Record<string, number> = {};
              battles.forEach(b => {
                (b.modifier_types || []).forEach(t => { modCounts[t] = (modCounts[t] || 0) + 1; });
              });
              const topMod = Object.entries(modCounts).sort((a, b) => b[1] - a[1])[0];
              return (
                <div className="bg-white border rounded-2xl p-4">
                  <h3 className="font-bold text-navy mb-3">📚 Battle Learning</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4">
                    {favourite && <p>Favourite fighter: <strong>{favourite.emoji} {favourite.name}</strong></p>}
                    <p>This week: <strong>🤯 {wowCount} WOW</strong> · <strong>😎 {coolCount} Cool</strong></p>
                    {upset && (() => {
                      const w = animalById(upset.battle.winner_animal_id!);
                      const lid = upset.battle.winner_animal_id === upset.battle.wes_animal_id ? upset.battle.opponent_animal_id : upset.battle.wes_animal_id;
                      const l = animalById(lid);
                      return <p className="md:col-span-2">Biggest upset: <strong>{w?.emoji} {w?.name}</strong> over <strong>{l?.emoji} {l?.name}</strong> (PWR gap {upset.gap})</p>;
                    })()}
                    {topMod && <p>Most common deciding factor: <strong>{topMod[0].replace(/_/g, ' ')}</strong> ({topMod[1]}×)</p>}
                  </div>
                  <p className="font-bold text-navy text-sm mb-2">Win rate by terrain:</p>
                  <div className="mb-4 space-y-1">
                    {Object.entries(terrainStats).map(([terrain, ts]) => {
                      const rate = ts.total > 0 ? Math.round((ts.wins / ts.total) * 100) : 0;
                      return (
                        <div key={terrain} className="flex items-center gap-3">
                          <span className="text-xs w-24 capitalize">{terrain}</span>
                          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${rate}%` }} />
                          </div>
                          <span className="text-xs font-bold w-16 text-right">{rate}% ({ts.wins}/{ts.total})</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="font-bold text-navy text-sm mb-2">Recent battles (last 10):</p>
                  <div className="space-y-1">
                    {recent.map((b, i) => {
                      const winner = b.winner_animal_id ? animalById(b.winner_animal_id) : null;
                      const loserId = b.winner_animal_id === b.wes_animal_id ? b.opponent_animal_id : b.wes_animal_id;
                      const loser = animalById(loserId);
                      return (
                        <div key={b.id || i} className="text-xs border-b pb-1 last:border-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{winner?.emoji}{winner?.name || 'Tie'}</span>
                            <span className="text-gray-400">vs</span>
                            <span className="text-gray-500">{loser?.emoji}{loser?.name}</span>
                            <span className="text-gray-400">·</span>
                            <span className="text-gray-500 capitalize">{b.terrain}</span>
                            {b.battle_reaction && (
                              <span className="ml-auto text-[10px] font-bold">
                                {b.battle_reaction === 'wow' ? '🤯' : '😎'}
                              </span>
                            )}
                          </div>
                          {b.deciding_factor && (
                            <p className="text-[11px] text-gray-500 italic mt-0.5">{b.deciding_factor}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ── Dad's Workshop sections ── */}

            {/* Messages to Wes */}
            <div className="bg-white border rounded-2xl p-4">
              <h3 className="font-bold text-navy mb-3">📬 Messages to Wes</h3>
              <textarea
                value={dadMessageDraft}
                onChange={e => setDadMessageDraft(e.target.value)}
                placeholder="Write a message to Wes..."
                className="w-full border border-gray-200 rounded-xl p-3 text-sm min-h-[80px] mb-2"
                maxLength={400}
              />
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] text-gray-400">{dadMessageDraft.length}/400</span>
                <button
                  onClick={handleSendDadMessage}
                  disabled={!dadMessageDraft.trim()}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-xl text-sm active:scale-95"
                >
                  Send to Wes 📬
                </button>
              </div>
              {dadMessages.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-1">Past messages</p>
                  <div className="space-y-1 max-h-44 overflow-y-auto">
                    {dadMessages.map(m => (
                      <div key={m.id} className="text-xs border-b pb-1 last:border-0">
                        <p className="text-gray-700 italic">{m.message_text.slice(0, 100)}{m.message_text.length > 100 ? '…' : ''}</p>
                        <p className="text-[10px] text-gray-400">
                          {m.created_at ? new Date(m.created_at).toLocaleDateString() : ''}
                          {m.seen_by_wes ? ' · Seen ✓' : ' · Unread'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Weekly Letter */}
            <div className="bg-white border rounded-2xl p-4">
              <h3 className="font-bold text-navy mb-3">📜 Weekly Letter to Wes</h3>
              <textarea
                value={letterDraft}
                onChange={e => setLetterDraft(e.target.value)}
                placeholder="Write your letter to Wes this week..."
                className="w-full border border-gray-200 rounded-xl p-3 text-sm min-h-[120px] mb-2 font-handwriting"
                style={{ fontSize: '1.25rem', lineHeight: 1.3 }}
                maxLength={500}
              />
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] text-gray-400">{letterDraft.length}/500</span>
                <button
                  onClick={handleSendWeeklyLetter}
                  disabled={!letterDraft.trim()}
                  className="bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-xl text-sm active:scale-95"
                >
                  Send to Wes 📬
                </button>
              </div>
              {weeklyLetters.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-1">Past letters</p>
                  <div className="space-y-1 max-h-44 overflow-y-auto">
                    {weeklyLetters.map(l => (
                      <div key={l.id} className="text-xs border-b pb-1 last:border-0">
                        <p className="text-gray-700 italic">{l.letter_text.slice(0, 100)}{l.letter_text.length > 100 ? '…' : ''}</p>
                        <p className="text-[10px] text-gray-400">
                          {l.created_at ? new Date(l.created_at).toLocaleDateString() : ''}
                          {l.read_by_wes ? ' · Read ✓' : ' · Unread'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Set Wes a Challenge */}
            <div className="bg-white border rounded-2xl p-4">
              <h3 className="font-bold text-navy mb-3">💪 Set Wes a Challenge</h3>
              {activeChallenge && activeChallenge.is_active && !activeChallenge.is_completed && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 text-sm">
                  <p className="font-bold text-amber-900">Currently active:</p>
                  <p className="text-amber-900">{activeChallenge.challenge_description}</p>
                  <button onClick={handleRemoveChallenge} className="mt-2 text-xs text-red-600 font-bold underline">
                    Remove Challenge
                  </button>
                </div>
              )}
              {activeChallenge && activeChallenge.is_completed && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3 text-sm">
                  <p className="font-bold text-green-800">Last challenge complete! ✓</p>
                  <p className="text-green-800">{activeChallenge.challenge_description}</p>
                </div>
              )}
              <label className="block text-xs font-bold text-gray-600 mb-1">Type</label>
              <select
                value={challengeType}
                onChange={e => setChallengeType(e.target.value as ChallengeType)}
                className="w-full border border-gray-200 rounded-xl p-2 text-sm mb-2"
              >
                {CHALLENGE_OPTIONS.map(o => (
                  <option key={o.type} value={o.type}>{o.label}</option>
                ))}
              </select>
              {(() => {
                const opt = CHALLENGE_OPTIONS.find(o => o.type === challengeType);
                if (!opt) return null;
                if (opt.withTarget) {
                  return (
                    <div className="mb-2">
                      <label className="block text-xs font-bold text-gray-600 mb-1">Target</label>
                      <input
                        type="number"
                        min={opt.minTarget ?? 1}
                        max={opt.maxTarget ?? 10}
                        value={challengeTarget}
                        onChange={e => setChallengeTarget(Math.max(opt.minTarget ?? 1, Math.min(opt.maxTarget ?? 10, parseInt(e.target.value || '1', 10))))}
                        className="w-24 border border-gray-200 rounded-xl p-2 text-sm"
                      />
                    </div>
                  );
                }
                if (challengeType === 'custom') {
                  return (
                    <div className="mb-2">
                      <label className="block text-xs font-bold text-gray-600 mb-1">Custom challenge text</label>
                      <input
                        value={customChallengeText}
                        onChange={e => setCustomChallengeText(e.target.value)}
                        placeholder="Describe the challenge…"
                        className="w-full border border-gray-200 rounded-xl p-2 text-sm"
                        maxLength={120}
                      />
                    </div>
                  );
                }
                return null;
              })()}
              <p className="text-xs text-gray-500 italic mb-2">
                Preview: {(() => {
                  const opt = CHALLENGE_OPTIONS.find(o => o.type === challengeType);
                  if (!opt) return '';
                  if (challengeType === 'custom') return customChallengeText || 'A special challenge from Dad!';
                  return opt.describe(opt.withTarget ? challengeTarget : null);
                })()}
              </p>
              <button onClick={handleSetChallenge} className="bg-amber-500 hover:bg-amber-400 text-white font-bold px-4 py-2 rounded-xl text-sm active:scale-95">
                Set This Challenge! 💪
              </button>
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
