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
  parent_rating BOOLEAN
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
