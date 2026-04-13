import { supabase, isSupabaseConfigured } from './supabase';
import {
  GameSession,
  SkillProgress,
  SkillArea,
  DifficultyLevel,
  Assessment,
  WordEntry,
  LessonPlan,
  ParentSettings,
  DEFAULT_SETTINGS,
  Story,
  WeeklyReport,
  AnimalUnlock,
  BattleRecord,
  BattleStats,
  Tournament,
} from './types';

// ── Local fallback storage for when Supabase is not configured ──

function getLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(`ppw_${key}`);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`ppw_${key}`, JSON.stringify(value));
}

// ── Skill Progress ──

const DEFAULT_PROGRESS: SkillProgress = {
  skill_area: 'word_wizard',
  current_level: 1 as DifficultyLevel,
  consecutive_correct: 0,
  consecutive_wrong: 0,
  unlocks_earned: [],
};

export async function getSkillProgress(skillArea: SkillArea): Promise<SkillProgress> {
  if (!isSupabaseConfigured()) {
    const all = getLocal<Record<string, SkillProgress>>('skill_progress', {});
    return all[skillArea] || { ...DEFAULT_PROGRESS, skill_area: skillArea };
  }

  const { data, error } = await supabase
    .from('skill_progress')
    .select('*')
    .eq('skill_area', skillArea)
    .single();

  if (error || !data) {
    return { ...DEFAULT_PROGRESS, skill_area: skillArea };
  }
  return data as SkillProgress;
}

export const ALL_SKILLS: SkillArea[] = ['word_wizard', 'pattern_detective', 'memory_master', 'math_explorer', 'confidence_coach', 'story_builder'];

export async function getAllSkillProgress(): Promise<SkillProgress[]> {
  const skills = ALL_SKILLS;

  if (!isSupabaseConfigured()) {
    const all = getLocal<Record<string, SkillProgress>>('skill_progress', {});
    return skills.map(s => all[s] || { ...DEFAULT_PROGRESS, skill_area: s });
  }

  const { data } = await supabase.from('skill_progress').select('*');
  const existing = (data || []) as SkillProgress[];
  return skills.map(s => existing.find(e => e.skill_area === s) || { ...DEFAULT_PROGRESS, skill_area: s });
}

export async function updateSkillProgress(progress: SkillProgress): Promise<void> {
  const updated = { ...progress, last_played: new Date().toISOString() };

  if (!isSupabaseConfigured()) {
    const all = getLocal<Record<string, SkillProgress>>('skill_progress', {});
    all[progress.skill_area] = updated;
    setLocal('skill_progress', all);
    return;
  }

  const { data: existing } = await supabase
    .from('skill_progress')
    .select('id')
    .eq('skill_area', progress.skill_area)
    .single();

  if (existing) {
    await supabase.from('skill_progress').update(updated).eq('skill_area', progress.skill_area);
  } else {
    await supabase.from('skill_progress').insert(updated);
  }
}

// ── Game Sessions ──

export async function saveGameSession(session: GameSession): Promise<void> {
  const record = { ...session, played_at: new Date().toISOString() };

  if (!isSupabaseConfigured()) {
    const sessions = getLocal<GameSession[]>('game_sessions', []);
    sessions.push({ ...record, id: crypto.randomUUID() });
    setLocal('game_sessions', sessions);
    return;
  }

  await supabase.from('game_sessions').insert(record);
}

export async function getGameSessions(days: number = 7): Promise<GameSession[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  if (!isSupabaseConfigured()) {
    const sessions = getLocal<GameSession[]>('game_sessions', []);
    return sessions.filter(s => new Date(s.played_at!) >= since);
  }

  const { data } = await supabase
    .from('game_sessions')
    .select('*')
    .gte('played_at', since.toISOString())
    .order('played_at', { ascending: false });

  return (data || []) as GameSession[];
}

export async function getAllGameSessions(): Promise<GameSession[]> {
  if (!isSupabaseConfigured()) {
    return getLocal<GameSession[]>('game_sessions', []);
  }

  const { data } = await supabase
    .from('game_sessions')
    .select('*')
    .order('played_at', { ascending: false });

  return (data || []) as GameSession[];
}

// ── Assessments ──

export async function saveAssessment(assessment: Assessment): Promise<void> {
  const record = { ...assessment, completed_at: new Date().toISOString() };

  if (!isSupabaseConfigured()) {
    const assessments = getLocal<Assessment[]>('assessments', []);
    assessments.push({ ...record, id: crypto.randomUUID() });
    setLocal('assessments', assessments);
    return;
  }

  await supabase.from('assessments').insert(record);
}

export async function getAssessments(): Promise<Assessment[]> {
  if (!isSupabaseConfigured()) {
    return getLocal<Assessment[]>('assessments', []);
  }

  const { data } = await supabase
    .from('assessments')
    .select('*')
    .order('completed_at', { ascending: false });

  return (data || []) as Assessment[];
}

// ── Word Collection ──

export async function saveWord(word: WordEntry): Promise<void> {
  const record = { ...word, mastered_at: new Date().toISOString() };

  if (!isSupabaseConfigured()) {
    const words = getLocal<WordEntry[]>('word_collection', []);
    if (!words.find(w => w.word.toLowerCase() === word.word.toLowerCase())) {
      words.push({ ...record, id: crypto.randomUUID() });
      setLocal('word_collection', words);
    }
    return;
  }

  const { data: existing } = await supabase
    .from('word_collection')
    .select('id')
    .ilike('word', word.word)
    .single();

  if (!existing) {
    await supabase.from('word_collection').insert(record);
  }
}

export async function getWordCollection(): Promise<WordEntry[]> {
  if (!isSupabaseConfigured()) {
    return getLocal<WordEntry[]>('word_collection', []);
  }

  const { data } = await supabase
    .from('word_collection')
    .select('*')
    .order('mastered_at', { ascending: false });

  return (data || []) as WordEntry[];
}

// ── Lesson Plans ──

export async function saveLessonPlan(plan: LessonPlan): Promise<void> {
  const record = { ...plan, generated_at: new Date().toISOString() };

  if (!isSupabaseConfigured()) {
    const plans = getLocal<LessonPlan[]>('lesson_plans', []);
    plans.push({ ...record, id: crypto.randomUUID() });
    setLocal('lesson_plans', plans);
    return;
  }

  await supabase.from('lesson_plans').insert(record);
}

// ── Streak ──

export async function getStreak(): Promise<number> {
  const sessions = await getAllGameSessions();
  if (sessions.length === 0) return 0;

  const dates = Array.from(new Set(sessions.map(s => new Date(s.played_at!).toDateString()))).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  if (dates[0] !== today && dates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff = new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime();
    if (diff <= 86400000 * 1.5) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ── Parent Settings ──

export function getParentSettings(): ParentSettings {
  return getLocal<ParentSettings>('parent_settings', DEFAULT_SETTINGS);
}

export function saveParentSettings(settings: ParentSettings): void {
  setLocal('parent_settings', settings);
}

// ── Dashboard PIN Session ──

export function isDashboardUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  const exp = localStorage.getItem('ppw_dashboard_session');
  if (!exp) return false;
  return Date.now() < parseInt(exp);
}

export function unlockDashboard(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ppw_dashboard_session', String(Date.now() + 24 * 60 * 60 * 1000));
}

export function lockDashboard(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('ppw_dashboard_session');
}

// ── Stories ──

export async function saveStory(story: Story): Promise<void> {
  const record = { ...story, completed_at: new Date().toISOString() };
  if (!isSupabaseConfigured()) {
    const stories = getLocal<Story[]>('stories', []);
    stories.push({ ...record, id: crypto.randomUUID() });
    setLocal('stories', stories);
    return;
  }
  await supabase.from('stories').insert(record);
}

export async function getStories(): Promise<Story[]> {
  if (!isSupabaseConfigured()) {
    return getLocal<Story[]>('stories', []);
  }
  const { data } = await supabase.from('stories').select('*').order('completed_at', { ascending: false });
  return (data || []) as Story[];
}

export async function rateStory(id: string, rating: boolean): Promise<void> {
  if (!isSupabaseConfigured()) {
    const stories = getLocal<Story[]>('stories', []);
    const s = stories.find(s => s.id === id);
    if (s) s.parent_rating = rating;
    setLocal('stories', stories);
    return;
  }
  await supabase.from('stories').update({ parent_rating: rating }).eq('id', id);
}

// ── Weekly Reports ──

export async function saveWeeklyReport(report: WeeklyReport): Promise<void> {
  const record = { ...report, generated_at: new Date().toISOString() };
  if (!isSupabaseConfigured()) {
    const reports = getLocal<WeeklyReport[]>('weekly_reports', []);
    reports.push({ ...record, id: crypto.randomUUID() });
    setLocal('weekly_reports', reports);
    return;
  }
  await supabase.from('weekly_reports').insert(record);
}

export async function getWeeklyReports(): Promise<WeeklyReport[]> {
  if (!isSupabaseConfigured()) {
    return getLocal<WeeklyReport[]>('weekly_reports', []);
  }
  const { data } = await supabase.from('weekly_reports').select('*').order('generated_at', { ascending: false });
  return (data || []) as WeeklyReport[];
}

// ── Animal Collection ──

export async function saveAnimalUnlock(unlock: AnimalUnlock): Promise<{ saved: boolean }> {
  const record = { ...unlock, unlocked_at: new Date().toISOString() };

  // Always save locally first as backup
  const col = getLocal<AnimalUnlock[]>('animal_collection', []);
  if (!col.find(a => a.animal_id === unlock.animal_id)) {
    col.push({ ...record, id: crypto.randomUUID() });
    setLocal('animal_collection', col);
  }

  if (!isSupabaseConfigured()) return { saved: true };

  try {
    const { data: existing } = await supabase.from('animal_collection').select('id').eq('animal_id', unlock.animal_id).single();
    if (!existing) {
      const { error } = await supabase.from('animal_collection').insert(record);
      if (error) {
        console.error('Failed to save animal unlock:', error);
        // Queue for retry
        queueOfflineSync('animal_collection', record);
        return { saved: false };
      }
    }
    return { saved: true };
  } catch (err) {
    console.error('Animal unlock save error:', err);
    queueOfflineSync('animal_collection', record);
    return { saved: false };
  }
}

// Offline sync queue
function queueOfflineSync(table: string, record: unknown): void {
  const queue = getLocal<{ table: string; record: unknown }[]>('offline_sync_queue', []);
  queue.push({ table, record });
  setLocal('offline_sync_queue', queue);
}

export async function syncOfflineQueue(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const queue = getLocal<{ table: string; record: unknown }[]>('offline_sync_queue', []);
  if (queue.length === 0) return;

  const remaining: typeof queue = [];
  for (const item of queue) {
    try {
      const { error } = await supabase.from(item.table).insert(item.record as Record<string, unknown>);
      if (error) remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }
  setLocal('offline_sync_queue', remaining);
}

export async function getAnimalCollection(): Promise<AnimalUnlock[]> {
  const local = getLocal<AnimalUnlock[]>('animal_collection', []);

  if (!isSupabaseConfigured()) return local;

  try {
    const { data, error } = await supabase.from('animal_collection').select('*').order('unlocked_at', { ascending: false });
    if (error) {
      console.error('Failed to load animal collection from Supabase:', error.message);
      return local; // Fall back to local
    }
    const remote = (data || []) as AnimalUnlock[];

    // Merge: Supabase is authoritative but include any local-only animals
    const remoteIds = new Set(remote.map(a => a.animal_id));
    const localOnly = local.filter(a => !remoteIds.has(a.animal_id));
    return [...remote, ...localOnly];
  } catch (err) {
    console.error('Animal collection fetch error:', err);
    return local;
  }
}

// ── Battles ──

export async function saveBattle(battle: BattleRecord): Promise<void> {
  const record = { ...battle, battled_at: new Date().toISOString() };
  if (!isSupabaseConfigured()) {
    const battles = getLocal<BattleRecord[]>('battles', []);
    battles.unshift({ ...record, id: crypto.randomUUID() });
    setLocal('battles', battles);
    return;
  }
  await supabase.from('battles').insert(record);
}

export async function getBattles(limit: number = 20): Promise<BattleRecord[]> {
  if (!isSupabaseConfigured()) {
    return getLocal<BattleRecord[]>('battles', []).slice(0, limit);
  }
  const { data } = await supabase.from('battles').select('*').order('battled_at', { ascending: false }).limit(limit);
  return (data || []) as BattleRecord[];
}

export function getBattleStats(): BattleStats {
  return getLocal<BattleStats>('battle_stats', {
    total_battles: 0, total_wins_predicted: 0, current_streak: 0,
    best_streak: 0, favorite_animal_id: '', most_winning_animal_id: '',
  });
}

export function saveBattleStats(stats: BattleStats): void {
  setLocal('battle_stats', stats);
}

// ── Tournaments ──

export function saveTournament(t: Tournament): void {
  setLocal('current_tournament', t);
  // Also save to history when complete
  if (t.completed_at) {
    const history = getLocal<Tournament[]>('tournament_history', []);
    history.unshift(t);
    setLocal('tournament_history', history);
    setLocal('current_tournament', null);
  }
}

export function getCurrentTournament(): Tournament | null {
  return getLocal<Tournament | null>('current_tournament', null);
}

export function getTournamentHistory(): Tournament[] {
  return getLocal<Tournament[]>('tournament_history', []);
}
