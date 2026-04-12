export type SkillArea = 'word_wizard' | 'pattern_detective' | 'memory_master' | 'math_explorer' | 'confidence_coach' | 'story_builder';

export type SubGame =
  | 'riddles' | 'story_finish' | 'word_categories'
  | 'shape_sequences' | 'size_color_sorting' | 'odd_one_out'
  | 'remember_list' | 'order_recall' | 'story_details'
  | 'counting_adventures' | 'more_or_less' | 'algebra_puzzles'
  | 'meet_greet' | 'what_would_you_do' | 'i_dont_know'
  | 'story_builder';

export type DifficultyLevel = 1 | 2 | 3;
export type LevelName = 'Explorer' | 'Adventurer' | 'Champion';

export const LEVEL_NAMES: Record<DifficultyLevel, LevelName> = {
  1: 'Explorer',
  2: 'Adventurer',
  3: 'Champion',
};

export type PerformanceBand = 'Outstanding' | 'Excellent' | 'Good Work' | 'Keep Practicing' | 'Let\'s Review Together';

export interface GameSession {
  id?: string;
  skill_area: SkillArea;
  sub_game: SubGame;
  score: number;
  total_questions: number;
  played_at?: string;
  child_name: string;
}

export interface SkillProgress {
  id?: string;
  skill_area: SkillArea;
  current_level: DifficultyLevel;
  consecutive_correct: number;
  consecutive_wrong: number;
  last_played?: string;
  unlocks_earned: string[];
}

export interface LessonPlan {
  id?: string;
  generated_at?: string;
  focus_areas: SkillArea[];
  plan_content: DayPlan[];
}

export interface DayPlan {
  day: string;
  activity: string;
  instructions: string;
  quick_tips: string;
  materials: string;
}

export interface WordEntry {
  id?: string;
  word: string;
  definition: string;
  example_sentence: string;
  syllable_breakdown: string;
  mastered_at?: string;
}

export interface Assessment {
  id?: string;
  assessment_type: 'standard' | 'weekly';
  skill_area: SkillArea | null;
  score: number;
  total_questions: number;
  performance_band: PerformanceBand;
  questions_detail: AssessmentQuestion[];
  current_level_at_time: number;
  completed_at?: string;
}

export interface AssessmentQuestion {
  question: string;
  choices: string[];
  wes_answer: string;
  correct_answer: string;
  is_correct: boolean;
  skill_area: SkillArea;
}

export interface WeeklyAssessment {
  id?: string;
  scores_by_skill: Record<SkillArea, number>;
  total_score: number;
  performance_band: PerformanceBand;
  completed_at?: string;
}

export interface GameQuestion {
  question: string;
  clues?: string[];
  story?: string;
  choices: string[];
  correct_answer: string;
  explanation?: string;
  syllable_breakdown?: string;
  definition?: string;
  example_sentence?: string;
  follow_up?: string;
  emoji_pattern?: string;
  objects?: string[];
  sequence?: string[];
  words_to_remember?: string[];
  scenario?: string;
  suggested_answer?: string;
  emoji_visual?: string;
  questions?: { question: string; choices: string[]; correct_answer: string }[];
  all_choices?: string[];
  display_time?: number;
  require_order?: boolean;
  tts_reading?: string;
}

export interface Story {
  id?: string;
  theme: string;
  sentences: string[];
  word_banks_used: unknown;
  completed_at?: string;
  parent_rating?: boolean | null;
}

export interface WeeklyReport {
  id?: string;
  week_start: string;
  week_end: string;
  report_data: unknown;
  generated_at?: string;
}

export interface ParentSettings {
  pronunciation_mode: boolean;
  microphone_mode: boolean;
  show_syllable_hint: boolean;
  show_assessment_prompt: boolean;
  require_pin: boolean;
  parent_pin: string;
  scheduled_assessment_day: string | null;
  auto_read_questions: boolean;
}

export const DEFAULT_SETTINGS: ParentSettings = {
  pronunciation_mode: true,
  microphone_mode: true,
  show_syllable_hint: false,
  show_assessment_prompt: true,
  require_pin: false,
  parent_pin: '0000',
  scheduled_assessment_day: null,
  auto_read_questions: true,
};

export const SKILL_CONFIG: Record<SkillArea, {
  label: string;
  color: string;
  bgColor: string;
  badges: Record<DifficultyLevel, string>;
  unlocks: Record<number, { name: string; description: string }>;
}> = {
  word_wizard: {
    label: 'Word Wizard',
    color: 'text-coral',
    bgColor: 'bg-coral',
    badges: {
      1: '📖',
      2: '📖✨',
      3: '🧙📖⭐',
    },
    unlocks: {
      2: { name: 'Word of the Day', description: 'A bonus rare vocabulary word shown on the home screen each time Wes opens the app' },
      3: { name: "Wes's Word Collection", description: 'A personal dictionary page showing every word Wes has ever mastered' },
    },
  },
  pattern_detective: {
    label: 'Pattern Detective',
    color: 'text-grass',
    bgColor: 'bg-grass',
    badges: {
      1: '🔍',
      2: '🔍🔷',
      3: '🔍🔷💎',
    },
    unlocks: {
      2: { name: 'Create a Pattern', description: 'Wes builds his own emoji pattern and challenges a parent to solve it' },
      3: { name: 'Pattern Hall of Fame', description: 'A gallery of the 10 hardest patterns Wes has ever solved' },
    },
  },
  memory_master: {
    label: 'Memory Master',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500',
    badges: {
      1: '🧠',
      2: '🧠⚡',
      3: '🧠⚡🏆',
    },
    unlocks: {
      2: { name: 'Lightning Round', description: 'A 60-second timed mode where Wes answers as many memory questions as possible' },
      3: { name: 'Memory Trophy Case', description: 'Shows all-time best Lightning Round score and top 3 performances' },
    },
  },
  math_explorer: {
    label: 'Math Explorer',
    color: 'text-sunshine-dark',
    bgColor: 'bg-sunshine',
    badges: {
      1: '🔢',
      2: '🔢🌟',
      3: '🔢🌟👑',
    },
    unlocks: {
      2: { name: 'Number Line Tool', description: 'A permanent interactive number line (0-100) available during any Math Explorer game' },
      3: { name: "Wes's Math Records", description: 'Shows highest correct streak, hardest problem ever solved, and Math Champion banner' },
    },
  },
  confidence_coach: {
    label: 'Confidence Coach',
    color: 'text-navy',
    bgColor: 'bg-navy',
    badges: {
      1: '🎤',
      2: '🎤🌈',
      3: '🎤🌈⭐',
    },
    unlocks: {
      2: { name: 'My Scripts', description: "Saves Wes's best spoken answers so he can review them before school visits" },
      3: { name: 'Star Student', description: 'A permanent gold star badge displayed on the home screen and dashboard forever' },
    },
  },
  story_builder: {
    label: 'Story Builder',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500',
    badges: {
      1: '📝',
      2: '📝🌟',
      3: '📝🌟🎭',
    },
    unlocks: {
      2: { name: 'Story Themes', description: 'Wes can pick his own theme from a list of 10 options' },
      3: { name: 'My Stories Hall of Fame', description: 'His 3 best-rated stories displayed permanently on a special page' },
    },
  },
};

export function getPerformanceBand(score: number, total: number): PerformanceBand {
  const ratio = score / total;
  if (ratio === 1) return 'Outstanding';
  if (ratio >= 0.8) return 'Excellent';
  if (ratio >= 0.6) return 'Good Work';
  if (ratio >= 0.4) return 'Keep Practicing';
  return "Let's Review Together";
}

export function getPerformanceStars(band: PerformanceBand): string {
  switch (band) {
    case 'Outstanding': return '⭐⭐⭐';
    case 'Excellent': return '⭐⭐';
    case 'Good Work': return '⭐';
    case 'Keep Practicing': return '📚';
    default: return '📚';
  }
}
