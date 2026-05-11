-- Prep & Play with Wes — Supabase Schema
-- Run this SQL in your Supabase project's SQL Editor

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Game Sessions
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  skill_area TEXT NOT NULL,
  sub_game TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  child_name TEXT NOT NULL DEFAULT 'Wes'
);

-- Skill Progress
CREATE TABLE IF NOT EXISTS skill_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  skill_area TEXT UNIQUE NOT NULL,
  current_level INTEGER NOT NULL DEFAULT 1,
  consecutive_correct INTEGER NOT NULL DEFAULT 0,
  consecutive_wrong INTEGER NOT NULL DEFAULT 0,
  last_played TIMESTAMPTZ,
  unlocks_earned TEXT[] NOT NULL DEFAULT '{}'
);

-- Lesson Plans
CREATE TABLE IF NOT EXISTS lesson_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  focus_areas TEXT[] NOT NULL,
  plan_content JSONB NOT NULL
);

-- Word Collection
CREATE TABLE IF NOT EXISTS word_collection (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  word TEXT NOT NULL,
  definition TEXT,
  example_sentence TEXT,
  syllable_breakdown TEXT,
  mastered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assessments
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_type TEXT NOT NULL DEFAULT 'standard',
  skill_area TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  performance_band TEXT,
  questions_detail JSONB,
  current_level_at_time INTEGER NOT NULL DEFAULT 1,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Weekly Assessments
CREATE TABLE IF NOT EXISTS weekly_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scores_by_skill JSONB,
  total_score INTEGER NOT NULL DEFAULT 0,
  performance_band TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stories
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme TEXT NOT NULL,
  sentences TEXT[] NOT NULL DEFAULT '{}',
  word_banks_used JSONB,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  parent_rating BOOLEAN,
  grammar_stamps_earned INTEGER DEFAULT 0,
  word_expert_badge BOOLEAN DEFAULT FALSE,
  grammar_breakdown JSONB
);

-- Weekly Reports
CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  report_data JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Animal Collection
CREATE TABLE IF NOT EXISTS animal_collection (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id TEXT NOT NULL,
  rarity TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quiz_score_when_unlocked INTEGER NOT NULL DEFAULT 0,
  quiz_type_when_unlocked TEXT NOT NULL DEFAULT 'standard'
);

-- Battles
CREATE TABLE IF NOT EXISTS battles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wes_animal_id TEXT NOT NULL,
  opponent_animal_id TEXT NOT NULL,
  terrain TEXT NOT NULL,
  wes_animal_score INTEGER NOT NULL,
  opponent_score INTEGER NOT NULL,
  winner_animal_id TEXT,
  is_tie BOOLEAN NOT NULL DEFAULT FALSE,
  wes_prediction TEXT NOT NULL,
  wes_predicted_correctly BOOLEAN NOT NULL DEFAULT FALSE,
  battle_explanation TEXT,
  wes_agreed_with_result BOOLEAN,
  battled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Battle Breakdown educational metadata (added with the Battle Breakdown panel)
ALTER TABLE battles
  ADD COLUMN IF NOT EXISTS battle_reaction TEXT, -- 'wow' | 'cool' | null
  ADD COLUMN IF NOT EXISTS deciding_factor TEXT,
  ADD COLUMN IF NOT EXISTS modifier_types TEXT[];

-- ── Dad's Workshop / Personal layer (Phase 1) ───────────────────────────
-- Adds champion names + favourites on the existing animal collection.
ALTER TABLE animal_collection
  ADD COLUMN IF NOT EXISTS champion_name TEXT,
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- Dad's one-off messages shown to Wes on the home screen.
CREATE TABLE IF NOT EXISTS dad_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  seen_by_wes BOOLEAN NOT NULL DEFAULT FALSE,
  seen_at TIMESTAMPTZ
);

-- Weekly letters from Dad (warm, longer-form).
CREATE TABLE IF NOT EXISTS weekly_letters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  letter_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_by_wes BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ
);

-- Active challenge from Dad (one at a time).
CREATE TABLE IF NOT EXISTS dad_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_type TEXT NOT NULL,
  challenge_description TEXT NOT NULL,
  target_value INT,
  current_progress INT NOT NULL DEFAULT 0,
  baseline_snapshot JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  celebrated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Trophy Room — per-trophy achievement state.
CREATE TABLE IF NOT EXISTS wes_trophies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trophy_id TEXT NOT NULL UNIQUE,
  achieved_at TIMESTAMPTZ,
  achievement_detail TEXT,
  is_achieved BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE dad_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE dad_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE wes_trophies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow all on dad_messages"
  ON dad_messages FOR ALL TO anon
  USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Policy exists, skipping.';
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow all on weekly_letters"
  ON weekly_letters FOR ALL TO anon
  USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Policy exists, skipping.';
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow all on dad_challenges"
  ON dad_challenges FOR ALL TO anon
  USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Policy exists, skipping.';
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow all on wes_trophies"
  ON wes_trophies FOR ALL TO anon
  USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Policy exists, skipping.';
END $$;

-- Seed the first message from Dad (idempotent — only inserts if no rows yet).
INSERT INTO dad_messages (message_text)
SELECT 'Hi Wes! I built this whole app just for you. Every game, every animal, every quiz — I made it because I believe in how smart and brave and curious you are. There are 100 animals to collect, battles to win, and so much to learn. I can''t wait to see you grow. Love always, Dad 🦁'
WHERE NOT EXISTS (SELECT 1 FROM dad_messages);

-- Seed the first weekly letter from Dad (idempotent).
INSERT INTO weekly_letters (letter_text)
SELECT 'Wes — I have been thinking about you all week and I am so proud of how hard you are working. Every day you are getting smarter and braver and more incredible. Keep going — I am watching and I am cheering for you every single day. Love always, Dad 🦁'
WHERE NOT EXISTS (SELECT 1 FROM weekly_letters);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_played_at ON game_sessions(played_at);
CREATE INDEX IF NOT EXISTS idx_game_sessions_skill_area ON game_sessions(skill_area);
CREATE INDEX IF NOT EXISTS idx_assessments_completed_at ON assessments(completed_at);
CREATE INDEX IF NOT EXISTS idx_word_collection_word ON word_collection(word);

-- Row Level Security (allow all for anon key — single-family app)
-- Safe to run multiple times — drops existing policies before recreating

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_collection ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_collection ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for game_sessions" ON game_sessions;
CREATE POLICY "Allow all for game_sessions" ON game_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for skill_progress" ON skill_progress;
CREATE POLICY "Allow all for skill_progress" ON skill_progress FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for lesson_plans" ON lesson_plans;
CREATE POLICY "Allow all for lesson_plans" ON lesson_plans FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for word_collection" ON word_collection;
CREATE POLICY "Allow all for word_collection" ON word_collection FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for assessments" ON assessments;
CREATE POLICY "Allow all for assessments" ON assessments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for weekly_assessments" ON weekly_assessments;
CREATE POLICY "Allow all for weekly_assessments" ON weekly_assessments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for stories" ON stories;
CREATE POLICY "Allow all for stories" ON stories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for weekly_reports" ON weekly_reports;
CREATE POLICY "Allow all for weekly_reports" ON weekly_reports FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for animal_collection" ON animal_collection;
CREATE POLICY "Allow all for animal_collection" ON animal_collection FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for battles" ON battles;
CREATE POLICY "Allow all for battles" ON battles FOR ALL USING (true) WITH CHECK (true);

-- ── Animal Leveling / XP System ─────────────────────────────────────────
-- Adds per-animal level + XP tracking on top of existing animal_collection.
-- All ALTERs are idempotent.

ALTER TABLE animal_collection
  ADD COLUMN IF NOT EXISTS current_level INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS current_xp INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_to_next_level INT DEFAULT 100,
  ADD COLUMN IF NOT EXISTS level_bonuses JSONB DEFAULT
    '{"strength": 0, "speed": 0, "defense": 0, "powerLevel": 0}'::jsonb,
  ADD COLUMN IF NOT EXISTS total_xp_earned INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_max_level BOOLEAN DEFAULT FALSE;

-- XP transaction log (append-only history of XP awards).
CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id TEXT NOT NULL,
  xp_amount INT NOT NULL,
  source TEXT NOT NULL,
  session_score INT,
  session_total INT,
  awarded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_animal ON xp_transactions(animal_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_awarded_at ON xp_transactions(awarded_at);

-- Single-row XP overflow pool used when every animal is at max level.
CREATE TABLE IF NOT EXISTS xp_bonus_pool (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  total_bonus_xp INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_bonus_pool ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow all on xp_transactions"
  ON xp_transactions FOR ALL TO anon
  USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Policy exists, skipping.';
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow all on xp_bonus_pool"
  ON xp_bonus_pool FOR ALL TO anon
  USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Policy exists, skipping.';
END $$;
