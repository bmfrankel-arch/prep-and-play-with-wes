# Prep & Play with Wes

A kindergarten skill-building web app designed to help a 5-year-old boy named Wes prepare for Dallas private school admissions — specifically St. Mark's School of Texas and Greenhill School. Wes will be applying for 1st grade entry.

The app is encouraging, warm, and fun for a child while giving parents useful progress data, printable lesson plans, and standardized assessment practice.

---

## What This App Does

Prep & Play with Wes has **five game modes**, each powered by Claude AI so every session has fresh, never-repeated questions:

1. **Word Wizard** — Vocabulary, riddles, story endings, and word categories. Includes a pronunciation challenge mode where Wes says words out loud.
2. **Pattern Detective** — Shape sequences, size/color sorting, and visual odd-one-out exercises.
3. **Memory Master** — List memorization, sequence recall, and story comprehension.
4. **Math Explorer** — Word problems, number comparisons, and algebra puzzles with missing numbers (up to 100).
5. **Confidence Coach** — Parent-guided social scenarios that prepare Wes for the one-on-one CATS testing session and campus observation day.

### Key Features

- **Adaptive Difficulty** — Three levels (Explorer, Adventurer, Champion) that adjust based on performance
- **Pokemon-Style Level Ups** — Dramatic full-screen celebrations with sound effects when Wes advances
- **Pronunciation Mode** — Web Speech API or parent-confirmed pronunciation challenges in Word Wizard
- **Standardized Assessment Mode** — Calm, distraction-free practice tests that mimic real admissions testing
- **Weekly Assessments** — Scheduled cross-skill evaluations with printable reports
- **Printable Lesson Plans** — AI-generated 5-day plans using household items
- **Parent Dashboard** — Progress tracking, difficulty controls, streak counter, and unlock inventory
- **Word Collection** — Every mastered word saved with definitions and example sentences

---

## Getting Started

### 1. Create a Free Supabase Account

1. Go to [supabase.com](https://supabase.com) and click "Start your project"
2. Sign up with your GitHub account or email
3. Click "New Project" — pick any name (e.g., "prep-and-play")
4. Choose a strong database password (save it somewhere safe)
5. Select a region close to you (e.g., "East US")
6. Click "Create new project" and wait about 2 minutes

### 2. Set Up the Database

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click "New query"
3. Open the file `supabase-schema.sql` from this project
4. Copy the entire contents and paste it into the SQL Editor
5. Click **Run** — you should see "Success" for each table
6. Click **Table Editor** in the sidebar to verify all 6 tables were created:
   - `game_sessions`
   - `skill_progress`
   - `lesson_plans`
   - `word_collection`
   - `assessments`
   - `weekly_assessments`

### 3. Get Your Environment Variables

You need 3 values:

| Variable | Where to Find It |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon` `public` key |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys → Create Key |

Create a file called `.env.local` in the project root with these values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
ANTHROPIC_API_KEY=sk-ant-...your-api-key
```

**Note:** The app works without Supabase configured — it will use your browser's local storage instead. But for data persistence across devices, set up Supabase.

### 4. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Works great on iPad Safari, Chrome, and Edge.

### 5. Deploy to Vercel

1. Push this project to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click "Import Project" and select your repository
4. In the Environment Variables section, add all 3 variables from step 3
5. Click "Deploy" — Vercel will build and deploy automatically

Your app will be live at a `.vercel.app` URL within 2-3 minutes.

---

## How to Use Each Game Mode

### Word Wizard
Best for building vocabulary and verbal reasoning. Three activities:
- **"What Am I?" Riddles** — Read the clues aloud to Wes, then let him tap his answer
- **Story Finish** — Read the story beginning together, discuss the endings, let Wes pick
- **Word Categories** — Read the words aloud and ask Wes which doesn't belong

After a correct answer, the **pronunciation challenge** appears (if enabled). Wes says the word into the microphone or a parent confirms he said it correctly.

### Pattern Detective
Great for logical thinking. Show Wes the pattern and let him figure out what comes next. Start with simple two-color patterns at Level 1.

### Memory Master
Builds working memory — crucial for testing. The "Remember the List" game shows words briefly, then hides them. Start with just 3 words and work up.

### Math Explorer
Covers numbers up to 100, all four operations, and missing number puzzles. A visual number line appears at Levels 1 and 2 as a helper tool.

### Confidence Coach
**This mode is parent-guided.** Sit with Wes and read each scenario together. The goal is to build comfort with:
- Introducing himself to adults he's never met
- Answering open-ended social questions
- Saying "I don't know, but I'll try!" without anxiety

---

## Tips for Confidence Coach Sessions

This is the most important mode for admissions preparation. Here's how to run effective sessions:

1. **Set the scene** — "Let's pretend we're visiting a new school today"
2. **Read the scenario** — Use a warm, encouraging tone
3. **Let Wes answer first** — At Level 2+, he won't see the model answer until after he tries
4. **Practice eye contact** — Encourage Wes to look at you when he speaks
5. **Celebrate effort** — Tap "Great job!" for any genuine attempt
6. **Practice "I don't know"** — The "I Don't Know Practice" game specifically trains this. Reinforce that saying "I don't know, but I'll try!" is a GREAT answer
7. **Keep sessions short** — 10-15 minutes max. Stop while it's still fun.

---

## How Difficulty & Level Ups Work

Each skill area has its own independent level (1-3):

| Level | Name | Trigger to Advance | Trigger to Drop |
|-------|------|-------------------|----------------|
| 1 | Explorer | 3 correct in a row | Cannot drop below |
| 2 | Adventurer | 3 correct in a row | 2 wrong in a row |
| 3 | Champion | Maximum level | 2 wrong in a row |

When Wes levels up, a full-screen **Pokemon-style celebration** plays:
- Screen flashes white
- "WES leveled up!" appears in retro game font
- His skill badge evolves with animation
- An XP bar fills up
- A new feature unlock is revealed
- Victory fanfare plays

Parents can manually adjust levels from the Dashboard → Difficulty Controls.

---

## Pronunciation Mode

After every correct answer in Word Wizard, Wes gets a pronunciation challenge:

1. The word appears in large text
2. Wes taps the microphone button and says the word
3. If recognized correctly → confetti + "Perfect, Wes!"
4. If not recognized → syllable breakdown shown, try again
5. After 2 attempts → point awarded anyway with encouragement

### When to Use Parent Confirms Mode

Switch to **Parent Confirms Mode** in Settings when:
- You're on an airplane or in a quiet environment
- The microphone isn't picking up Wes's voice well
- Wes is getting frustrated with speech recognition
- You're using a device without microphone access

In this mode, the parent listens and taps a checkmark or X instead of using the microphone.

---

## Assessment Mode

### Standard Assessment (10 questions)
After completing any game session, Wes is offered a practice assessment. The assessment uses:
- Calm white interface with no animations or sound effects
- Formal, test-appropriate language
- No feedback between questions
- Clean A/B/C/D answer format

Results show a score, performance band, and detailed question-by-question breakdown.

### Weekly Assessment (20 questions)
A comprehensive cross-skill assessment with 4 questions from each skill area. Schedule it from Settings → Scheduled Weekly Assessment Day.

### Reading Assessment Reports
- **Outstanding (10/10)** — Wes has mastered this material
- **Excellent (8-9/10)** — Strong performance, ready to level up
- **Good Work (6-7/10)** — Solid understanding, keep practicing
- **Keep Practicing (4-5/10)** — This area needs more attention
- **Let's Review Together (0-3/10)** — Consider dropping the difficulty level

All reports are printable — click "Print This Report" for a clean black-and-white version.

### Setting Up Weekly Assessments

1. Go to Parent Dashboard → Settings
2. Find "Scheduled Weekly Assessment Day"
3. Select a day (e.g., Sunday)
4. On that day, when Wes opens the app, he'll be prompted to take the weekly assessment
5. You can also start one manually from the Dashboard at any time

---

## Tech Stack

- **Next.js 14** with App Router
- **Supabase** for database (with localStorage fallback)
- **Anthropic API** (Claude Sonnet) for AI-generated questions
- **Tailwind CSS** for styling
- **Web Speech API** for pronunciation recognition
- **Web Audio API** for level-up fanfare sounds
- **Google Fonts**: Press Start 2P (retro game UI) + Nunito (everything else)

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Home screen
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles
│   ├── api/
│   │   ├── generate/route.ts       # Question generation API
│   │   ├── assessment/route.ts     # Assessment generation API
│   │   ├── lesson-plan/route.ts    # Lesson plan generation API
│   │   └── word-of-day/route.ts    # Word of the Day API
│   ├── play/
│   │   ├── word_wizard/            # Word Wizard + 3 sub-games
│   │   ├── pattern_detective/      # Pattern Detective + 3 sub-games
│   │   ├── memory_master/          # Memory Master + 3 sub-games
│   │   ├── math_explorer/          # Math Explorer + 3 sub-games
│   │   └── confidence_coach/       # Confidence Coach + 3 sub-games
│   ├── assessment/                 # Assessment mode
│   ├── dashboard/                  # Parent dashboard
│   │   ├── settings/               # Parent settings
│   │   ├── assessments/            # Assessment history
│   │   └── lesson-plans/           # Lesson plan generator
│   ├── words/                      # Word collection
│   └── champion/                   # Ultimate Champion screen
├── components/
│   ├── BadgeDisplay.tsx            # Skill badge component
│   ├── Confetti.tsx                # Confetti celebration
│   ├── GameShell.tsx               # Core game logic wrapper
│   ├── LevelUpSequence.tsx         # Pokemon-style level up
│   ├── NumberLine.tsx              # Interactive number line
│   └── PronunciationChallenge.tsx  # Speech recognition challenge
└── lib/
    ├── audio.ts                    # Web Audio API sounds
    ├── db.ts                       # Database operations
    ├── supabase.ts                 # Supabase client
    └── types.ts                    # TypeScript types & constants
```
