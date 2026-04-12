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

export async function getAllSkillProgress(): Promise<SkillProgress[]> {
  const skills: SkillArea[] = ['word_wizard', 'pattern_detective', 'memory_master', 'math_explorer', 'confidence_coach'];

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
