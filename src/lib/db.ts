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
  XpTransaction,
  DadMessage,
  WeeklyLetter,
  DadChallenge,
  WesTrophy,
} from './types';
import {
  AnimalCollectionLevelState,
  AnimalLevel,
  ZERO_BONUSES,
  xpToNext,
  defaultLevelState,
  awardXpToAnimal,
  LevelUpEvent,
  XpSource,
  calculateXp,
} from './animalLeveling';
import { ANIMALS } from '@/data/animals';

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

function getStartingLevel(skillArea: SkillArea): DifficultyLevel {
  // Pattern Detective starts at Level 2 — Wes is ready for multi-attribute patterns
  return skillArea === 'pattern_detective' ? 2 : 1;
}

export async function getSkillProgress(skillArea: SkillArea): Promise<SkillProgress> {
  const startLevel = getStartingLevel(skillArea);
  const defaults: SkillProgress = { ...DEFAULT_PROGRESS, skill_area: skillArea, current_level: startLevel };

  if (!isSupabaseConfigured()) {
    const all = getLocal<Record<string, SkillProgress>>('skill_progress', {});
    const stored = all[skillArea];
    if (!stored) return defaults;
    // Ensure pattern_detective never shows below its starting level
    if (skillArea === 'pattern_detective' && stored.current_level < startLevel) {
      stored.current_level = startLevel as DifficultyLevel;
    }
    return stored;
  }

  const { data, error } = await supabase
    .from('skill_progress')
    .select('*')
    .eq('skill_area', skillArea)
    .single();

  if (error || !data) return defaults;
  // Ensure pattern_detective never shows below starting level
  if (skillArea === 'pattern_detective' && (data as SkillProgress).current_level < startLevel) {
    (data as SkillProgress).current_level = startLevel as DifficultyLevel;
  }
  return data as SkillProgress;
}

export const ALL_SKILLS: SkillArea[] = ['word_wizard', 'pattern_detective', 'memory_master', 'math_explorer', 'confidence_coach', 'story_builder'];

export async function getAllSkillProgress(): Promise<SkillProgress[]> {
  const skills = ALL_SKILLS;

  if (!isSupabaseConfigured()) {
    const all = getLocal<Record<string, SkillProgress>>('skill_progress', {});
    return skills.map(s => {
      const stored = all[s] || { ...DEFAULT_PROGRESS, skill_area: s, current_level: getStartingLevel(s) };
      if (s === 'pattern_detective' && stored.current_level < 2) stored.current_level = 2 as DifficultyLevel;
      return stored;
    });
  }

  const { data } = await supabase.from('skill_progress').select('*');
  const existing = (data || []) as SkillProgress[];
  return skills.map(s => {
    const found = existing.find(e => e.skill_area === s) || { ...DEFAULT_PROGRESS, skill_area: s, current_level: getStartingLevel(s) };
    if (s === 'pattern_detective' && found.current_level < 2) found.current_level = 2 as DifficultyLevel;
    return found;
  });
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
  // Initialize XP/leveling fields for any new unlock so battle/leveling code
  // never sees undefined state.
  const withDefaults: AnimalUnlock = {
    ...unlock,
    current_level: unlock.current_level ?? 1,
    current_xp: unlock.current_xp ?? 0,
    xp_to_next_level: unlock.xp_to_next_level ?? 100,
    level_bonuses: unlock.level_bonuses ?? { strength: 0, speed: 0, defense: 0, powerLevel: 0 },
    total_xp_earned: unlock.total_xp_earned ?? 0,
    is_max_level: unlock.is_max_level ?? false,
  };
  const record = { ...withDefaults, unlocked_at: new Date().toISOString() };

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

export async function saveBattle(battle: BattleRecord): Promise<string | null> {
  const record = { ...battle, battled_at: new Date().toISOString() };
  if (!isSupabaseConfigured()) {
    const battles = getLocal<BattleRecord[]>('battles', []);
    const id = crypto.randomUUID();
    battles.unshift({ ...record, id });
    setLocal('battles', battles);
    return id;
  }
  const { data, error } = await supabase.from('battles').insert(record).select('id').single();
  if (error) return null;
  return (data as { id: string } | null)?.id ?? null;
}

export async function updateBattleMeta(
  id: string,
  patch: Partial<Pick<BattleRecord, 'battle_reaction' | 'deciding_factor' | 'modifier_types' | 'wes_agreed_with_result' | 'battle_explanation'>>,
): Promise<void> {
  if (!id) return;
  if (!isSupabaseConfigured()) {
    const battles = getLocal<BattleRecord[]>('battles', []);
    const idx = battles.findIndex(b => b.id === id);
    if (idx >= 0) {
      battles[idx] = { ...battles[idx], ...patch };
      setLocal('battles', battles);
    }
    return;
  }
  await supabase.from('battles').update(patch).eq('id', id);
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

// ── Animal XP / Leveling ──

function ensureLevelDefaults(unlock: AnimalUnlock): AnimalCollectionLevelState {
  return {
    animal_id: unlock.animal_id,
    current_level: ((unlock.current_level ?? 1) as AnimalLevel),
    current_xp: unlock.current_xp ?? 0,
    xp_to_next_level: unlock.xp_to_next_level ?? xpToNext((unlock.current_level ?? 1) as AnimalLevel),
    level_bonuses: unlock.level_bonuses ?? { ...ZERO_BONUSES },
    total_xp_earned: unlock.total_xp_earned ?? 0,
    is_max_level: unlock.is_max_level ?? false,
  };
}

export function getLevelStateFor(unlock: AnimalUnlock | undefined): AnimalCollectionLevelState | null {
  if (!unlock) return null;
  return ensureLevelDefaults(unlock);
}

export async function getLevelStates(): Promise<Record<string, AnimalCollectionLevelState>> {
  const collection = await getAnimalCollection();
  const out: Record<string, AnimalCollectionLevelState> = {};
  collection.forEach(c => { out[c.animal_id] = ensureLevelDefaults(c); });
  return out;
}

async function persistLevelState(state: AnimalCollectionLevelState): Promise<void> {
  // Local mirror — always update
  const local = getLocal<AnimalUnlock[]>('animal_collection', []);
  const idx = local.findIndex(a => a.animal_id === state.animal_id);
  if (idx >= 0) {
    local[idx] = {
      ...local[idx],
      current_level: state.current_level,
      current_xp: state.current_xp,
      xp_to_next_level: state.xp_to_next_level,
      level_bonuses: state.level_bonuses,
      total_xp_earned: state.total_xp_earned,
      is_max_level: state.is_max_level,
    };
    setLocal('animal_collection', local);
  }

  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.from('animal_collection').update({
      current_level: state.current_level,
      current_xp: state.current_xp,
      xp_to_next_level: state.xp_to_next_level,
      level_bonuses: state.level_bonuses,
      total_xp_earned: state.total_xp_earned,
      is_max_level: state.is_max_level,
    }).eq('animal_id', state.animal_id);
    if (error) {
      // Local mirror is authoritative for leveling state; the next successful
      // session write will reconcile remote.
      console.error('Persist level state failed:', error.message);
    }
  } catch (err) {
    console.error('Level state persist error:', err);
  }
}

export async function recordXpTransaction(tx: XpTransaction): Promise<void> {
  const record = { ...tx, awarded_at: new Date().toISOString() };
  const local = getLocal<XpTransaction[]>('xp_transactions', []);
  local.unshift({ ...record, id: crypto.randomUUID() });
  setLocal('xp_transactions', local.slice(0, 200));

  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.from('xp_transactions').insert(record);
    if (error) queueOfflineSync('xp_transactions', record);
  } catch {
    queueOfflineSync('xp_transactions', record);
  }
}

export async function getXpTransactions(limit: number = 50): Promise<XpTransaction[]> {
  if (!isSupabaseConfigured()) {
    return getLocal<XpTransaction[]>('xp_transactions', []).slice(0, limit);
  }
  try {
    const { data } = await supabase.from('xp_transactions')
      .select('*')
      .order('awarded_at', { ascending: false })
      .limit(limit);
    return (data || []) as XpTransaction[];
  } catch {
    return getLocal<XpTransaction[]>('xp_transactions', []).slice(0, limit);
  }
}

// XP bonus pool for when all animals are at max level.
export function getBonusXp(): number {
  return getLocal<number>('xp_bonus_pool', 0);
}

export async function addBonusXp(amount: number): Promise<void> {
  const next = getBonusXp() + amount;
  setLocal('xp_bonus_pool', next);
  if (!isSupabaseConfigured()) return;
  try {
    const { data } = await supabase.from('xp_bonus_pool').select('id, total_bonus_xp').limit(1).single();
    if (data) {
      await supabase.from('xp_bonus_pool').update({
        total_bonus_xp: (data.total_bonus_xp || 0) + amount,
        updated_at: new Date().toISOString(),
      }).eq('id', data.id);
    } else {
      await supabase.from('xp_bonus_pool').insert({ total_bonus_xp: amount });
    }
  } catch (err) {
    console.error('addBonusXp error:', err);
  }
}

export interface AwardXpResult {
  newState: AnimalCollectionLevelState | null;
  events: LevelUpEvent[];
  toBonusPool: boolean;
}

export async function awardXpAndPersist(
  animalId: string,
  source: XpSource,
  xp: number,
  score: number,
  total: number,
): Promise<AwardXpResult> {
  if (xp <= 0) return { newState: null, events: [], toBonusPool: false };

  // Bonus pool path
  if (animalId === '__bonus_pool__') {
    await addBonusXp(xp);
    await recordXpTransaction({
      animal_id: '__bonus_pool__',
      xp_amount: xp,
      source,
      session_score: score,
      session_total: total,
    });
    return { newState: null, events: [], toBonusPool: true };
  }

  const animal = ANIMALS.find(a => a.id === animalId);
  if (!animal) return { newState: null, events: [], toBonusPool: false };

  const collection = await getAnimalCollection();
  const existing = collection.find(c => c.animal_id === animalId);
  const baseState = existing ? ensureLevelDefaults(existing) : defaultLevelState(animalId);

  const { newState, events } = awardXpToAnimal(animal, baseState, xp);
  await persistLevelState(newState);
  await recordXpTransaction({
    animal_id: animalId,
    xp_amount: xp,
    source,
    session_score: score,
    session_total: total,
  });

  return { newState, events, toBonusPool: false };
}

export { calculateXp };

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

// ── Dad's Workshop / Personal layer ─────────────────────────────────────

const SEEDED_DAD_MESSAGE = "Hi Wes! I built this whole app just for you. Every game, every animal, every quiz — I made it because I believe in how smart and brave and curious you are. There are 100 animals to collect, battles to win, and so much to learn. I can't wait to see you grow. Love always, Dad 🦁";
const SEEDED_WEEKLY_LETTER = "Wes — I have been thinking about you all week and I am so proud of how hard you are working. Every day you are getting smarter and braver and more incredible. Keep going — I am watching and I am cheering for you every single day. Love always, Dad 🦁";

function ensureSeed<T extends { id?: string }>(key: string, seed: T): T[] {
  const list = getLocal<T[]>(key, []);
  if (list.length === 0) {
    const seeded = { ...seed, id: crypto.randomUUID() };
    setLocal(key, [seeded]);
    return [seeded];
  }
  return list;
}

// ── dad_messages ──

export async function getLatestDadMessage(): Promise<DadMessage | null> {
  if (!isSupabaseConfigured()) {
    const list = ensureSeed<DadMessage>('dad_messages', {
      message_text: SEEDED_DAD_MESSAGE,
      created_at: new Date().toISOString(),
      seen_by_wes: false,
    });
    const sorted = [...list].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return sorted[0] || null;
  }
  try {
    const { data } = await supabase.from('dad_messages').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();
    return (data as DadMessage | null) || null;
  } catch {
    return null;
  }
}

export async function markDadMessageSeen(id: string): Promise<void> {
  if (!id) return;
  if (!isSupabaseConfigured()) {
    const list = getLocal<DadMessage[]>('dad_messages', []);
    const idx = list.findIndex(m => m.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], seen_by_wes: true, seen_at: new Date().toISOString() };
      setLocal('dad_messages', list);
    }
    return;
  }
  try {
    await supabase.from('dad_messages').update({ seen_by_wes: true, seen_at: new Date().toISOString() }).eq('id', id);
  } catch (err) {
    console.error('markDadMessageSeen error:', err);
  }
}

export async function sendDadMessage(text: string): Promise<DadMessage | null> {
  const record: DadMessage = {
    message_text: text,
    created_at: new Date().toISOString(),
    seen_by_wes: false,
  };
  if (!isSupabaseConfigured()) {
    const list = getLocal<DadMessage[]>('dad_messages', []);
    const inserted = { ...record, id: crypto.randomUUID() };
    list.unshift(inserted);
    setLocal('dad_messages', list);
    return inserted;
  }
  try {
    const { data } = await supabase.from('dad_messages').insert(record).select('*').single();
    return (data as DadMessage | null) || null;
  } catch {
    return null;
  }
}

export async function getDadMessages(limit: number = 20): Promise<DadMessage[]> {
  if (!isSupabaseConfigured()) {
    return getLocal<DadMessage[]>('dad_messages', []).slice(0, limit);
  }
  try {
    const { data } = await supabase.from('dad_messages').select('*').order('created_at', { ascending: false }).limit(limit);
    return (data || []) as DadMessage[];
  } catch {
    return [];
  }
}

// ── weekly_letters ──

export async function getLatestWeeklyLetter(): Promise<WeeklyLetter | null> {
  if (!isSupabaseConfigured()) {
    const list = ensureSeed<WeeklyLetter>('weekly_letters', {
      letter_text: SEEDED_WEEKLY_LETTER,
      created_at: new Date().toISOString(),
      read_by_wes: false,
    });
    const sorted = [...list].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return sorted[0] || null;
  }
  try {
    const { data } = await supabase.from('weekly_letters').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();
    return (data as WeeklyLetter | null) || null;
  } catch {
    return null;
  }
}

export async function markWeeklyLetterRead(id: string): Promise<void> {
  if (!id) return;
  if (!isSupabaseConfigured()) {
    const list = getLocal<WeeklyLetter[]>('weekly_letters', []);
    const idx = list.findIndex(m => m.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], read_by_wes: true, read_at: new Date().toISOString() };
      setLocal('weekly_letters', list);
    }
    return;
  }
  try {
    await supabase.from('weekly_letters').update({ read_by_wes: true, read_at: new Date().toISOString() }).eq('id', id);
  } catch (err) {
    console.error('markWeeklyLetterRead error:', err);
  }
}

export async function sendWeeklyLetter(text: string): Promise<WeeklyLetter | null> {
  const record: WeeklyLetter = {
    letter_text: text,
    created_at: new Date().toISOString(),
    read_by_wes: false,
  };
  if (!isSupabaseConfigured()) {
    const list = getLocal<WeeklyLetter[]>('weekly_letters', []);
    const inserted = { ...record, id: crypto.randomUUID() };
    list.unshift(inserted);
    setLocal('weekly_letters', list);
    return inserted;
  }
  try {
    const { data } = await supabase.from('weekly_letters').insert(record).select('*').single();
    return (data as WeeklyLetter | null) || null;
  } catch {
    return null;
  }
}

export async function getWeeklyLetters(limit: number = 20): Promise<WeeklyLetter[]> {
  if (!isSupabaseConfigured()) {
    return getLocal<WeeklyLetter[]>('weekly_letters', []).slice(0, limit);
  }
  try {
    const { data } = await supabase.from('weekly_letters').select('*').order('created_at', { ascending: false }).limit(limit);
    return (data || []) as WeeklyLetter[];
  } catch {
    return [];
  }
}

// ── dad_challenges ──

export async function getActiveChallenge(): Promise<DadChallenge | null> {
  if (!isSupabaseConfigured()) {
    const list = getLocal<DadChallenge[]>('dad_challenges', []);
    return list.find(c => c.is_active && !c.is_completed) || null;
  }
  try {
    const { data } = await supabase.from('dad_challenges').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle();
    return (data as DadChallenge | null) || null;
  } catch {
    return null;
  }
}

export async function getLatestChallenge(): Promise<DadChallenge | null> {
  if (!isSupabaseConfigured()) {
    const list = getLocal<DadChallenge[]>('dad_challenges', []);
    return list[0] || null;
  }
  try {
    const { data } = await supabase.from('dad_challenges').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();
    return (data as DadChallenge | null) || null;
  } catch {
    return null;
  }
}

export async function createChallenge(c: DadChallenge): Promise<DadChallenge | null> {
  // Deactivate any existing active challenge first.
  await deactivateActiveChallenge();
  const record: DadChallenge = {
    ...c,
    created_at: new Date().toISOString(),
    is_active: true,
    is_completed: false,
    celebrated: false,
    current_progress: 0,
  };
  if (!isSupabaseConfigured()) {
    const list = getLocal<DadChallenge[]>('dad_challenges', []);
    const inserted = { ...record, id: crypto.randomUUID() };
    list.unshift(inserted);
    setLocal('dad_challenges', list);
    return inserted;
  }
  try {
    const { data } = await supabase.from('dad_challenges').insert(record).select('*').single();
    return (data as DadChallenge | null) || null;
  } catch {
    return null;
  }
}

export async function updateChallenge(id: string, patch: Partial<DadChallenge>): Promise<void> {
  if (!id) return;
  if (!isSupabaseConfigured()) {
    const list = getLocal<DadChallenge[]>('dad_challenges', []);
    const idx = list.findIndex(c => c.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...patch };
      setLocal('dad_challenges', list);
    }
    return;
  }
  try {
    await supabase.from('dad_challenges').update(patch).eq('id', id);
  } catch (err) {
    console.error('updateChallenge error:', err);
  }
}

export async function deactivateActiveChallenge(): Promise<void> {
  if (!isSupabaseConfigured()) {
    const list = getLocal<DadChallenge[]>('dad_challenges', []);
    let dirty = false;
    list.forEach(c => { if (c.is_active) { c.is_active = false; dirty = true; } });
    if (dirty) setLocal('dad_challenges', list);
    return;
  }
  try {
    await supabase.from('dad_challenges').update({ is_active: false }).eq('is_active', true);
  } catch (err) {
    console.error('deactivateActiveChallenge error:', err);
  }
}

// ── wes_trophies ──

export async function getTrophies(): Promise<WesTrophy[]> {
  if (!isSupabaseConfigured()) {
    return getLocal<WesTrophy[]>('wes_trophies', []);
  }
  try {
    const { data } = await supabase.from('wes_trophies').select('*');
    return (data || []) as WesTrophy[];
  } catch {
    return [];
  }
}

export async function setTrophyAchieved(trophyId: string, detail?: string): Promise<void> {
  if (!trophyId) return;
  const achieved_at = new Date().toISOString();
  if (!isSupabaseConfigured()) {
    const list = getLocal<WesTrophy[]>('wes_trophies', []);
    const idx = list.findIndex(t => t.trophy_id === trophyId);
    if (idx >= 0) {
      if (list[idx].is_achieved) return;
      list[idx] = { ...list[idx], is_achieved: true, achieved_at, achievement_detail: detail || list[idx].achievement_detail };
    } else {
      list.push({ trophy_id: trophyId, is_achieved: true, achieved_at, achievement_detail: detail || null, id: crypto.randomUUID() });
    }
    setLocal('wes_trophies', list);
    return;
  }
  try {
    // Upsert by trophy_id
    const { data } = await supabase.from('wes_trophies').select('id, is_achieved').eq('trophy_id', trophyId).maybeSingle();
    if (data?.id) {
      if (data.is_achieved) return;
      await supabase.from('wes_trophies').update({ is_achieved: true, achieved_at, achievement_detail: detail }).eq('id', data.id);
    } else {
      await supabase.from('wes_trophies').insert({ trophy_id: trophyId, is_achieved: true, achieved_at, achievement_detail: detail });
    }
  } catch (err) {
    console.error('setTrophyAchieved error:', err);
  }
}

// ── Animal favourites + champion names (on animal_collection) ──

export async function setAnimalFavorite(animalId: string, isFavorite: boolean): Promise<void> {
  // Always update local mirror.
  const local = getLocal<AnimalUnlock[]>('animal_collection', []);
  const idx = local.findIndex(c => c.animal_id === animalId);
  if (idx >= 0) {
    local[idx] = { ...local[idx], is_favorite: isFavorite };
    setLocal('animal_collection', local);
  }
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from('animal_collection').update({ is_favorite: isFavorite }).eq('animal_id', animalId);
  } catch (err) {
    console.error('setAnimalFavorite error:', err);
  }
}

export async function setChampionName(animalId: string, name: string | null): Promise<void> {
  const trimmed = name ? name.trim().slice(0, 15) : null;
  const local = getLocal<AnimalUnlock[]>('animal_collection', []);
  const idx = local.findIndex(c => c.animal_id === animalId);
  if (idx >= 0) {
    local[idx] = { ...local[idx], champion_name: trimmed };
    setLocal('animal_collection', local);
  }
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from('animal_collection').update({ champion_name: trimmed }).eq('animal_id', animalId);
  } catch (err) {
    console.error('setChampionName error:', err);
  }
}
