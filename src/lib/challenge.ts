// ── Challenge from Dad — progress derivation ──
// We compute the current progress from existing app data + a baseline
// snapshot captured when the challenge was created. This avoids the
// need to instrument every game-completion event.

import {
  AnimalUnlock, BattleRecord, BattleStats, ChallengeBaselineSnapshot,
  ChallengeType, DadChallenge, GameSession, Story,
} from '@/lib/types';

export interface ChallengeOption {
  type: ChallengeType;
  label: string;
  withTarget: boolean;
  defaultTarget?: number;
  minTarget?: number;
  maxTarget?: number;
  describe: (target: number | null) => string;
}

export const CHALLENGE_OPTIONS: ChallengeOption[] = [
  { type: 'unlock_animals', label: 'Unlock animals', withTarget: true, defaultTarget: 3, minTarget: 1, maxTarget: 5,
    describe: t => `Unlock ${t} animal${t === 1 ? '' : 's'} this week!` },
  { type: 'perfect_quiz', label: 'Perfect quiz score', withTarget: false,
    describe: () => 'Get a perfect score on any quiz!' },
  { type: 'complete_stories', label: 'Complete stories', withTarget: true, defaultTarget: 2, minTarget: 1, maxTarget: 5,
    describe: t => `Complete ${t} stor${t === 1 ? 'y' : 'ies'} in Story Builder!` },
  { type: 'win_battles', label: 'Win battles', withTarget: true, defaultTarget: 5, minTarget: 1, maxTarget: 10,
    describe: t => `Win ${t} battle${t === 1 ? '' : 's'}!` },
  { type: 'practice_confidence', label: 'Practice Confidence Coach', withTarget: true, defaultTarget: 3, minTarget: 1, maxTarget: 7,
    describe: t => `Practice Confidence Coach ${t} time${t === 1 ? '' : 's'}!` },
  { type: 'outstanding_confidence', label: 'Outstanding in Confidence Coach', withTarget: false,
    describe: () => 'Achieve Outstanding in Confidence Coach!' },
  { type: 'level_up_animal', label: 'Level up any animal', withTarget: false,
    describe: () => 'Level up any animal!' },
  { type: 'addition_subtraction_sessions', label: 'Math worksheet sessions', withTarget: true, defaultTarget: 3, minTarget: 1, maxTarget: 7,
    describe: t => `Complete ${t} addition or subtraction sessions!` },
  { type: 'beat_high_score', label: 'Beat your high score', withTarget: false,
    describe: () => 'Beat your high score on any quiz!' },
  { type: 'custom', label: 'Custom challenge', withTarget: false,
    describe: () => 'A special challenge from Dad!' },
];

export function captureBaseline(input: {
  collection: AnimalUnlock[];
  battles: BattleRecord[];
  sessions: GameSession[];
  stories: Story[];
  stats: BattleStats | null;
}): ChallengeBaselineSnapshot {
  const { collection, battles, sessions, stories, stats } = input;
  return {
    animal_count: collection.length,
    stories_count: stories.length,
    battles_won: battles.filter(b => b.winner_animal_id === b.wes_animal_id).length,
    confidence_sessions: sessions.filter(s => s.skill_area === 'confidence_coach').length,
    worksheets_count: sessions.filter(s => s.sub_game === 'addition_tables' || s.sub_game === 'subtraction_tables').length,
    max_level_count: collection.filter(c => c.is_max_level).length,
    best_streak: stats?.best_streak ?? 0,
  };
}

export interface ChallengeProgress {
  current: number;
  target: number | null;
  isComplete: boolean;
  pct: number;
  label: string;
}

export function deriveChallengeProgress(
  challenge: DadChallenge,
  input: {
    collection: AnimalUnlock[];
    battles: BattleRecord[];
    sessions: GameSession[];
    stories: Story[];
    stats: BattleStats | null;
  },
): ChallengeProgress {
  const baseline = challenge.baseline_snapshot || {};
  const target = challenge.target_value;
  let current = 0;

  switch (challenge.challenge_type) {
    case 'unlock_animals':
      current = Math.max(0, input.collection.length - (baseline.animal_count ?? 0));
      break;
    case 'complete_stories':
      current = Math.max(0, input.stories.length - (baseline.stories_count ?? 0));
      break;
    case 'win_battles': {
      const wins = input.battles.filter(b => b.winner_animal_id === b.wes_animal_id).length;
      current = Math.max(0, wins - (baseline.battles_won ?? 0));
      break;
    }
    case 'practice_confidence': {
      const n = input.sessions.filter(s => s.skill_area === 'confidence_coach').length;
      current = Math.max(0, n - (baseline.confidence_sessions ?? 0));
      break;
    }
    case 'addition_subtraction_sessions': {
      const n = input.sessions.filter(s => s.sub_game === 'addition_tables' || s.sub_game === 'subtraction_tables').length;
      current = Math.max(0, n - (baseline.worksheets_count ?? 0));
      break;
    }
    case 'perfect_quiz': {
      // Sessions since the challenge started with score == total (>=5 questions)
      const since = challenge.created_at ? new Date(challenge.created_at).getTime() : 0;
      const hit = input.sessions.some(s => new Date(s.played_at || 0).getTime() >= since && s.total_questions >= 5 && s.score === s.total_questions);
      current = hit ? 1 : 0;
      break;
    }
    case 'outstanding_confidence': {
      const since = challenge.created_at ? new Date(challenge.created_at).getTime() : 0;
      const hit = input.sessions.some(s => s.skill_area === 'confidence_coach' && new Date(s.played_at || 0).getTime() >= since && s.total_questions >= 3 && s.score === s.total_questions);
      current = hit ? 1 : 0;
      break;
    }
    case 'level_up_animal': {
      // Any animal at max level not in baseline OR any sub-level advance — best proxy.
      const newMax = input.collection.filter(c => c.is_max_level).length - (baseline.max_level_count ?? 0);
      current = newMax > 0 ? 1 : 0;
      break;
    }
    case 'beat_high_score': {
      // Couldn't track historical highs reliably — treat as binary on any perfect.
      const since = challenge.created_at ? new Date(challenge.created_at).getTime() : 0;
      const hit = input.sessions.some(s => new Date(s.played_at || 0).getTime() >= since && s.total_questions >= 5 && s.score === s.total_questions);
      current = hit ? 1 : 0;
      break;
    }
    case 'custom':
    default:
      current = 0;
  }

  const t = target ?? 1;
  const isComplete = current >= t;
  const pct = Math.min(100, Math.round((current / Math.max(1, t)) * 100));
  const label = target ? `${current} of ${target}` : (isComplete ? 'Complete!' : 'In progress');
  return { current, target, isComplete, pct, label };
}
