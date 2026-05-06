// ── Animal XP / Leveling System ──
// XP earned from sessions accumulates on a Wes-chosen animal, leveling it up
// to a max of Level 5. Leveled stats apply on top of base stats in battle.

import { Animal, AnimalRarity } from '@/data/animals';

export type AnimalLevel = 1 | 2 | 3 | 4 | 5;

export interface LevelBonuses {
  strength: number;
  speed: number;
  defense: number;
  powerLevel: number;
}

export const ZERO_BONUSES: LevelBonuses = {
  strength: 0, speed: 0, defense: 0, powerLevel: 0,
};

export interface LeveledStats {
  strength: number;
  speed: number;
  defense: number;
  powerLevel: number;
  level: AnimalLevel;
}

export type XpSource =
  | 'addition_tables' | 'subtraction_tables'
  | 'counting_adventures' | 'more_or_less' | 'algebra_puzzles'
  | 'standard_quiz' | 'weekly_quiz'
  | 'word_wizard' | 'pattern_detective' | 'memory_master'
  | 'confidence_coach' | 'story_builder';

// XP required to advance FROM the current level TO the next.
// Reaching Level 5 is max; XP at Level 5 is stored as overflow.
export const XP_PER_LEVEL: Record<AnimalLevel, number> = {
  1: 100,
  2: 200,
  3: 400,
  4: 800,
  5: 0, // max
};

export function xpToNext(level: AnimalLevel): number {
  return XP_PER_LEVEL[level] || 0;
}

// ── XP Awards ──
// Score-based, tuned per session type per the spec.

function band(score: number, total: number, scale: [number, number, number, number, number]): number {
  if (total <= 0) return scale[4];
  const ratio = score / total;
  if (ratio >= 1.0) return scale[0];
  if (ratio >= 0.8) return scale[1];
  if (ratio >= 0.6) return scale[2];
  if (ratio >= 0.4) return scale[3];
  return scale[4];
}

export function calculateXp(source: XpSource, score: number, total: number): number {
  switch (source) {
    case 'addition_tables':
    case 'subtraction_tables':
      return band(score, total, [50, 35, 20, 10, 5]);
    case 'counting_adventures':
      return band(score, total, [30, 20, 20, 10, 5]);
    case 'standard_quiz':
      return band(score, total, [60, 45, 30, 15, 5]);
    case 'weekly_quiz':
      return band(score, total, [120, 90, 60, 30, 10]);
    case 'more_or_less':
    case 'algebra_puzzles':
    case 'word_wizard':
    case 'pattern_detective':
    case 'memory_master':
    case 'confidence_coach':
    case 'story_builder':
      return band(score, total, [40, 28, 18, 8, 3]);
    default:
      return band(score, total, [40, 28, 18, 8, 3]);
  }
}

// ── Level-up application ──
// Returns the new bonuses + which stat went up most prominently.

export type StatName = 'strength' | 'speed' | 'defense';

export function rarityIncrement(rarity: AnimalRarity): { stat: number; power: number; mode: 'random' | 'strongest' } {
  switch (rarity) {
    case 'legendary': return { stat: 1.0, power: 5, mode: 'strongest' };
    case 'epic':      return { stat: 0.7, power: 3, mode: 'random' };
    case 'rare':      return { stat: 0.5, power: 2, mode: 'random' };
    case 'common':
    default:          return { stat: 0.3, power: 1, mode: 'random' };
  }
}

function strongestStat(animal: Animal): StatName {
  const entries: { stat: StatName; value: number }[] = [
    { stat: 'strength', value: animal.strength },
    { stat: 'speed',    value: animal.speed },
    { stat: 'defense',  value: animal.defense },
  ];
  entries.sort((a, b) => b.value - a.value);
  return entries[0].stat;
}

export function applyLevelUp(
  animal: Animal,
  currentBonuses: LevelBonuses,
): { bonuses: LevelBonuses; statBoosted: StatName } {
  const inc = rarityIncrement(animal.rarity);
  const stat: StatName =
    inc.mode === 'strongest'
      ? strongestStat(animal)
      : (['strength', 'speed', 'defense'] as StatName[])[Math.floor(Math.random() * 3)];

  return {
    bonuses: {
      ...currentBonuses,
      [stat]: Math.round((currentBonuses[stat] + inc.stat) * 10) / 10,
      powerLevel: currentBonuses.powerLevel + inc.power,
    },
    statBoosted: stat,
  };
}

// ── Apply earned XP to an animal record ──
// Returns the new animal_collection state plus any level-up events to display.

export interface AnimalCollectionLevelState {
  animal_id: string;
  current_level: AnimalLevel;
  current_xp: number;
  xp_to_next_level: number;
  level_bonuses: LevelBonuses;
  total_xp_earned: number;
  is_max_level: boolean;
}

export interface LevelUpEvent {
  newLevel: AnimalLevel;
  statBoosted: StatName;
  bonuses: LevelBonuses;
}

export function awardXpToAnimal(
  animal: Animal,
  state: AnimalCollectionLevelState,
  xp: number,
): { newState: AnimalCollectionLevelState; events: LevelUpEvent[] } {
  const events: LevelUpEvent[] = [];
  let level = state.current_level;
  let xpInLevel = state.current_xp + xp;
  let bonuses = { ...state.level_bonuses };

  while (level < 5 && xpInLevel >= xpToNext(level)) {
    xpInLevel -= xpToNext(level);
    level = (level + 1) as AnimalLevel;
    const result = applyLevelUp(animal, bonuses);
    bonuses = result.bonuses;
    events.push({ newLevel: level, statBoosted: result.statBoosted, bonuses });
  }

  const isMax = level >= 5;
  if (isMax) xpInLevel = 0; // overflow not tracked at max

  return {
    newState: {
      animal_id: state.animal_id,
      current_level: level,
      current_xp: xpInLevel,
      xp_to_next_level: isMax ? 0 : xpToNext(level),
      level_bonuses: bonuses,
      total_xp_earned: state.total_xp_earned + xp,
      is_max_level: isMax,
    },
    events,
  };
}

// ── Compute leveled stats for battle ──

export function getLeveledStatsFor(animal: Animal, state: AnimalCollectionLevelState | null | undefined): LeveledStats {
  const bonuses = state?.level_bonuses || ZERO_BONUSES;
  return {
    strength: animal.strength + bonuses.strength,
    speed: animal.speed + bonuses.speed,
    defense: animal.defense + bonuses.defense,
    powerLevel: animal.powerLevel + bonuses.powerLevel,
    level: state?.current_level || 1,
  };
}

export function defaultLevelState(animalId: string): AnimalCollectionLevelState {
  return {
    animal_id: animalId,
    current_level: 1,
    current_xp: 0,
    xp_to_next_level: xpToNext(1),
    level_bonuses: { ...ZERO_BONUSES },
    total_xp_earned: 0,
    is_max_level: false,
  };
}
