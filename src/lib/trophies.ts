// ── Wes's Trophy Room — definitions + detection ──
// Trophies are derived from existing data (animal_collection, battles,
// game_sessions, etc) on Trophy Room load. We persist `wes_trophies` rows
// the first time a trophy is earned so the achieved date is preserved.

import { ANIMALS } from '@/data/animals';
import { AnimalUnlock, BattleRecord, BattleStats, GameSession, Story } from '@/lib/types';

export type TrophyCategory = 'firsts' | 'collection' | 'battle' | 'academic' | 'streak' | 'special';

export interface TrophyDef {
  id: string;
  emoji: string;
  name: string;
  description: string;
  category: TrophyCategory;
  rare?: boolean;
}

export const TROPHIES: TrophyDef[] = [
  // Firsts
  { id: 'first_animal', emoji: '🦁', name: 'First Animal', description: 'The very first animal Wes ever unlocked.', category: 'firsts' },
  { id: 'first_quiz', emoji: '🏆', name: 'First Quiz', description: 'Completed his very first quiz.', category: 'firsts' },
  { id: 'first_story', emoji: '🌟', name: 'First Story', description: 'Wrote his first story in Story Builder.', category: 'firsts' },
  { id: 'first_level_up', emoji: '⭐', name: 'First Level Up', description: 'Leveled up any skill for the first time.', category: 'firsts' },
  { id: 'first_battle_win', emoji: '⚔️', name: 'First Battle', description: 'Won his first animal battle.', category: 'firsts' },
  { id: 'first_brave_moment', emoji: '🎤', name: 'First Brave Moment', description: 'Got Outstanding in Confidence Coach.', category: 'firsts' },

  // Collection
  { id: 'collection_10', emoji: '🐾', name: 'Animal Explorer', description: 'Unlocked 10 animals.', category: 'collection' },
  { id: 'collection_25', emoji: '🌿', name: 'Animal Adventurer', description: 'Unlocked 25 animals.', category: 'collection' },
  { id: 'collection_50', emoji: '🔥', name: 'Animal Champion', description: 'Unlocked 50 animals.', category: 'collection' },
  { id: 'collection_100', emoji: '👑', name: 'Animal Master', description: 'Unlocked all 100 animals.', category: 'collection', rare: true },
  { id: 'first_champion', emoji: '💪', name: 'First Champion', description: 'Leveled any animal to Level 5.', category: 'collection', rare: true },

  // Battle
  { id: 'first_tournament_win', emoji: '⚔️', name: 'First Tournament Win', description: 'Won his first tournament.', category: 'battle', rare: true },
  { id: 'perfect_predictor', emoji: '🎯', name: 'Perfect Predictor', description: '5 correct battle predictions in a row.', category: 'battle' },
  { id: 'battle_veteran', emoji: '🏅', name: 'Battle Veteran', description: 'Completed 50 battles total.', category: 'battle' },
  { id: 'giant_killer', emoji: '😮', name: 'Giant Killer', description: 'Beat an animal with a higher power level.', category: 'battle', rare: true },

  // Academic
  { id: 'perfect_score', emoji: '📚', name: 'Perfect Score', description: 'Got 10/10 on any quiz.', category: 'academic' },
  { id: 'memory_champion', emoji: '🧠', name: 'Memory Champion', description: 'Perfect score on Memory Master.', category: 'academic' },
  { id: 'math_star', emoji: '🔢', name: 'Math Star', description: 'Perfect score on Math Explorer.', category: 'academic' },
  { id: 'word_wizard_trophy', emoji: '📖', name: 'Word Wizard', description: 'Perfect score on Word Wizard.', category: 'academic' },
  { id: 'pattern_master', emoji: '🔍', name: 'Pattern Master', description: 'Perfect score on Pattern Detective.', category: 'academic' },

  // Streaks
  { id: 'streak_3', emoji: '🔥', name: '3 Day Streak', description: 'Used the app 3 days in a row.', category: 'streak' },
  { id: 'streak_7', emoji: '🔥🔥', name: '7 Day Streak', description: 'Used the app 7 days in a row.', category: 'streak' },
  { id: 'streak_30', emoji: '🔥🔥🔥', name: '30 Day Streak', description: 'Used the app 30 days in a row.', category: 'streak', rare: true },

  // Special
  { id: 'brave_voice', emoji: '🎤', name: 'Brave Voice', description: "Got Outstanding in Confidence Coach with 'excellent' volume.", category: 'special' },
  { id: 'outstanding', emoji: '🌟', name: 'Outstanding!', description: 'First Outstanding Confidence Coach response.', category: 'special' },
  { id: 'story_writer', emoji: '📝', name: 'Story Writer', description: 'Completed 5 stories in Story Builder.', category: 'special' },
  { id: 'tournament_champion', emoji: '🦁', name: 'Tournament Champion', description: 'Won his first tournament.', category: 'special', rare: true },
];

export const TROPHY_CATEGORIES: { id: TrophyCategory; label: string }[] = [
  { id: 'firsts', label: 'Personal Firsts' },
  { id: 'collection', label: 'Collection' },
  { id: 'battle', label: 'Battle' },
  { id: 'academic', label: 'Academic' },
  { id: 'streak', label: 'Streaks' },
  { id: 'special', label: 'Special Moments' },
];

export interface DerivedTrophyState {
  /** trophy_id -> { isAchieved, detail (optional), date (when known live from data) } */
  state: Record<string, { isAchieved: boolean; detail?: string; achievedAt?: string }>;
}

interface DeriveInputs {
  collection: AnimalUnlock[];
  battles: BattleRecord[];
  stats: BattleStats | null;
  sessions: GameSession[];
  stories: Story[];
  currentStreak: number;
  bestStreak?: number;
}

export function deriveTrophyState(input: DeriveInputs): DerivedTrophyState {
  const { collection, battles, stats, sessions, stories, currentStreak, bestStreak } = input;
  const out: DerivedTrophyState = { state: {} };

  // First animal
  const firstAnimal = [...collection].sort((a, b) => new Date(a.unlocked_at || 0).getTime() - new Date(b.unlocked_at || 0).getTime())[0];
  if (firstAnimal) {
    const animal = ANIMALS.find(a => a.id === firstAnimal.animal_id);
    out.state['first_animal'] = {
      isAchieved: true,
      achievedAt: firstAnimal.unlocked_at,
      detail: animal ? `${animal.emoji} ${animal.name}` : firstAnimal.animal_id,
    };
  }

  // Collection milestones
  const n = collection.length;
  if (n >= 10) out.state['collection_10'] = { isAchieved: true, detail: `${n} unlocked` };
  if (n >= 25) out.state['collection_25'] = { isAchieved: true, detail: `${n} unlocked` };
  if (n >= 50) out.state['collection_50'] = { isAchieved: true, detail: `${n} unlocked` };
  if (n >= 100) out.state['collection_100'] = { isAchieved: true, detail: 'All 100 unlocked!' };

  // First champion (any animal at level 5)
  const firstChamp = collection.find(c => c.is_max_level);
  if (firstChamp) {
    const a = ANIMALS.find(x => x.id === firstChamp.animal_id);
    const name = firstChamp.champion_name || a?.name || firstChamp.animal_id;
    out.state['first_champion'] = { isAchieved: true, detail: a ? `${a.emoji} ${name}` : name };
  }

  // First quiz — any session
  if (sessions.length > 0) {
    out.state['first_quiz'] = { isAchieved: true, achievedAt: sessions[sessions.length - 1].played_at };
  }

  // First story
  if (stories.length > 0) {
    out.state['first_story'] = { isAchieved: true, achievedAt: stories[stories.length - 1].completed_at };
  }
  // Story writer — 5 completed
  if (stories.length >= 5) {
    out.state['story_writer'] = { isAchieved: true, detail: `${stories.length} stories` };
  }

  // Perfect score (any 10/10 across sessions). Most sessions are <10 questions
  // — interpret "10/10" as 100% with at least 5 questions answered.
  const perfectSession = sessions.find(s => s.total_questions >= 5 && s.score === s.total_questions);
  if (perfectSession) {
    out.state['perfect_score'] = {
      isAchieved: true,
      detail: `${perfectSession.skill_area.replace(/_/g, ' ')} (${perfectSession.score}/${perfectSession.total_questions})`,
      achievedAt: perfectSession.played_at,
    };
  }
  // Per-skill perfect score
  const skillTrophy: Record<string, string> = {
    word_wizard: 'word_wizard_trophy',
    pattern_detective: 'pattern_master',
    memory_master: 'memory_champion',
    math_explorer: 'math_star',
  };
  Object.entries(skillTrophy).forEach(([skill, trophyId]) => {
    const hit = sessions.find(s => s.skill_area === skill && s.total_questions >= 4 && s.score === s.total_questions);
    if (hit) out.state[trophyId] = { isAchieved: true, achievedAt: hit.played_at };
  });

  // Battle trophies
  const wesWins = battles.filter(b => b.winner_animal_id === b.wes_animal_id);
  if (wesWins.length > 0) {
    out.state['first_battle_win'] = { isAchieved: true, achievedAt: wesWins[wesWins.length - 1].battled_at };
  }
  if (battles.length >= 50) {
    out.state['battle_veteran'] = { isAchieved: true, detail: `${battles.length} battles` };
  }
  if ((stats?.best_streak ?? bestStreak ?? 0) >= 5) {
    out.state['perfect_predictor'] = { isAchieved: true, detail: `Best streak: ${stats?.best_streak ?? bestStreak}` };
  }
  // Giant killer — wes_animal won with lower powerLevel than opponent
  const upset = wesWins.find(b => {
    const wA = ANIMALS.find(a => a.id === b.wes_animal_id);
    const oA = ANIMALS.find(a => a.id === b.opponent_animal_id);
    return wA && oA && wA.powerLevel < oA.powerLevel;
  });
  if (upset) {
    const w = ANIMALS.find(a => a.id === upset.wes_animal_id);
    const o = ANIMALS.find(a => a.id === upset.opponent_animal_id);
    out.state['giant_killer'] = {
      isAchieved: true,
      detail: w && o ? `${w.emoji} ${w.name} beat ${o.emoji} ${o.name}!` : undefined,
      achievedAt: upset.battled_at,
    };
  }

  // Streaks
  const effStreak = Math.max(currentStreak, bestStreak ?? 0);
  if (effStreak >= 3) out.state['streak_3'] = { isAchieved: true, detail: `${effStreak} day streak` };
  if (effStreak >= 7) out.state['streak_7'] = { isAchieved: true, detail: `${effStreak} day streak` };
  if (effStreak >= 30) out.state['streak_30'] = { isAchieved: true, detail: `${effStreak} day streak` };

  // Outstanding moments — perfect Confidence Coach session
  const ccOutstanding = sessions.find(s => s.skill_area === 'confidence_coach' && s.total_questions >= 3 && s.score === s.total_questions);
  if (ccOutstanding) {
    out.state['outstanding'] = { isAchieved: true, achievedAt: ccOutstanding.played_at };
    out.state['first_brave_moment'] = { isAchieved: true, achievedAt: ccOutstanding.played_at };
  }

  // First level up — any skill above level 1 ever
  // Use sessions for inference: any session played at level >= 2 implies a prior level up.
  // No direct flag exists; conservative — derive from stories/sessions count instead.
  if (sessions.length >= 10) {
    out.state['first_level_up'] = { isAchieved: true };
  }

  return out;
}

export const DAD_TROPHY_NOTE = "Wes — I built this app just for you. Every game, every animal, every quiz — made with love. These trophies are yours forever. I am so proud of everything you do. Love always, Dad 🦁";
