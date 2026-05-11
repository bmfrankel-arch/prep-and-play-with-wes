'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SkillArea, SkillProgress, DifficultyLevel, LEVEL_NAMES, AnimalUnlock, DadMessage, WeeklyLetter, DadChallenge } from '@/lib/types';
import {
  getAllSkillProgress, getStreak, getParentSettings, getAnimalCollection, syncOfflineQueue,
  getLatestDadMessage, markDadMessageSeen,
  getLatestWeeklyLetter, markWeeklyLetterRead,
  getActiveChallenge, updateChallenge,
  getBattles, getGameSessions, getStories, getBattleStats,
  getTrophies,
} from '@/lib/db';
import { speak, shouldGreet } from '@/lib/speech';
import BadgeDisplay from '@/components/BadgeDisplay';
import WordOfDayCard, { autoPlayWordOfDay } from '@/components/WordOfDayCard';
import DedicationScreen from '@/components/DedicationScreen';
import DadMessageScreen from '@/components/DadMessageScreen';
import AnimalFactOfDay from '@/components/AnimalFactOfDay';
import ChallengeCard from '@/components/ChallengeCard';
import ChallengeCompletionOverlay from '@/components/ChallengeCompletionOverlay';
import { ANIMALS } from '@/data/animals';
import { deriveChallengeProgress } from '@/lib/challenge';
import { displayName } from '@/lib/champion';

interface WordOfDay {
  word: string;
  definition: string;
  example_sentence: string;
  syllable_breakdown: string;
  fun_fact: string;
}

const GAME_MODES: { skill: SkillArea; label: string; emoji: string; desc: string; colors: string }[] = [
  { skill: 'word_wizard', label: 'Word Wizard', emoji: '📖', desc: 'Words & Vocabulary', colors: 'from-coral to-pink-400' },
  { skill: 'pattern_detective', label: 'Pattern Detective', emoji: '🔍', desc: 'Patterns & Logic', colors: 'from-grass to-emerald-400' },
  { skill: 'memory_master', label: 'Memory Master', emoji: '🧠', desc: 'Memory & Recall', colors: 'from-purple-500 to-violet-400' },
  { skill: 'math_explorer', label: 'Math Explorer', emoji: '🔢', desc: 'Numbers & Math', colors: 'from-sunshine to-amber-400' },
  { skill: 'confidence_coach', label: 'Confidence Coach', emoji: '🎤', desc: 'Social Skills', colors: 'from-navy to-blue-500' },
  { skill: 'story_builder', label: 'Story Builder', emoji: '📝', desc: 'Build Sentences!', colors: 'from-orange-500 to-red-400' },
];

export default function HomePage() {
  const router = useRouter();
  const [progress, setProgress] = useState<SkillProgress[]>([]);
  const [streak, setStreak] = useState(0);
  const [wordOfDay, setWordOfDay] = useState<WordOfDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWeeklyPrompt, setShowWeeklyPrompt] = useState(false);
  const [animalCount, setAnimalCount] = useState(0);
  const [animalCollection, setAnimalCollection] = useState<AnimalUnlock[]>([]);
  const [trophyCount, setTrophyCount] = useState(0);

  // Phase 1 personal layer
  const [showDedication, setShowDedication] = useState(false);
  const [dadMessage, setDadMessage] = useState<DadMessage | null>(null);
  const [showDadMessage, setShowDadMessage] = useState(false);
  const [weeklyLetter, setWeeklyLetter] = useState<WeeklyLetter | null>(null);
  const [showWeeklyLetter, setShowWeeklyLetter] = useState(false);
  const [challenge, setChallenge] = useState<DadChallenge | null>(null);
  const [challengeProgress, setChallengeProgress] = useState<ReturnType<typeof deriveChallengeProgress> | null>(null);
  const [challengeJustCompleted, setChallengeJustCompleted] = useState(false);
  const [extendedGreetingShown, setExtendedGreetingShown] = useState(false);

  const hasWordOfDayUnlock = progress.some(
    p => p.skill_area === 'word_wizard' && p.unlocks_earned.includes('Word of the Day')
  );
  const hasStarStudent = progress.some(
    p => p.skill_area === 'confidence_coach' && p.unlocks_earned.includes('Star Student')
  );
  const isUltimateChampion = progress.length >= 6 && progress.every(p => p.current_level >= 3);

  useEffect(() => {
    (async () => {
      // First-launch dedication
      if (typeof window !== 'undefined') {
        const seen = localStorage.getItem('ppw_dedication_seen');
        if (!seen) setShowDedication(true);
      }

      const [p, s, ac, msg, letter, ch, trophies] = await Promise.all([
        getAllSkillProgress(),
        getStreak(),
        getAnimalCollection(),
        getLatestDadMessage(),
        getLatestWeeklyLetter(),
        getActiveChallenge(),
        getTrophies(),
      ]);
      setProgress(p);
      setStreak(s);
      setAnimalCount(ac.length);
      setAnimalCollection(ac);
      setTrophyCount(trophies.filter(t => t.is_achieved).length);

      if (msg && !msg.seen_by_wes) setDadMessage(msg);
      if (letter && !letter.read_by_wes) setWeeklyLetter(letter);
      setChallenge(ch);

      setLoading(false);

      syncOfflineQueue();

      const settings = getParentSettings();
      if (settings.scheduled_assessment_day) {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        if (today === settings.scheduled_assessment_day) {
          setShowWeeklyPrompt(true);
        }
      }
    })();
  }, []);

  // Live-derive challenge progress when challenge exists
  useEffect(() => {
    if (!challenge || challenge.is_completed) {
      setChallengeProgress(null);
      return;
    }
    (async () => {
      const [collection, battles, sessions, stories] = await Promise.all([
        getAnimalCollection(), getBattles(200), getGameSessions(60), getStories(),
      ]);
      const stats = getBattleStats();
      const progress = deriveChallengeProgress(challenge, { collection, battles, sessions, stories, stats });
      setChallengeProgress(progress);
      if (progress.isComplete && !challenge.celebrated && challenge.id) {
        setChallengeJustCompleted(true);
        await updateChallenge(challenge.id, { is_completed: true, celebrated: true, completed_at: new Date().toISOString() });
      }
    })();
  }, [challenge]);

  useEffect(() => {
    if (hasWordOfDayUnlock) {
      fetch('/api/word-of-day')
        .then(r => r.json())
        .then(data => {
          if (data.word) setWordOfDay(data);
        })
        .catch(() => {});
    }
  }, [hasWordOfDayUnlock]);

  // British greeting + Word of Day auto-play — once per session / once per day
  useEffect(() => {
    if (!loading && shouldGreet() && !showDedication) {
      const greeted = sessionStorage.getItem('ppw_greeted');
      if (!greeted) {
        sessionStorage.setItem('ppw_greeted', '1');
        // Extended greeting once per day
        const today = new Date().toDateString();
        const lastExt = localStorage.getItem('ppw_extended_greeting_date');
        const showExtended = lastExt !== today;
        if (showExtended) {
          localStorage.setItem('ppw_extended_greeting_date', today);
          setExtendedGreetingShown(true);
        }
        setTimeout(async () => {
          speak(
            showExtended
              ? "Hello Wes! Dad's been thinking about you. What shall we practise today?"
              : 'Hello Wes! What shall we practise today?',
            { rate: 0.9, pitch: 1.1 },
          );
          if (wordOfDay) {
            const lastWotd = localStorage.getItem('ppw_last_wotd_play');
            if (lastWotd !== today) {
              localStorage.setItem('ppw_last_wotd_play', today);
              setTimeout(() => autoPlayWordOfDay(wordOfDay), 4000);
            }
          }
        }, 1000);
      }
    }
  }, [loading, wordOfDay, showDedication]);

  const handleDedicationDone = () => {
    if (typeof window !== 'undefined') localStorage.setItem('ppw_dedication_seen', 'true');
    setShowDedication(false);
  };

  const handleDadMessageOpen = () => setShowDadMessage(true);
  const handleDadMessageDismiss = async () => {
    setShowDadMessage(false);
    if (dadMessage?.id) {
      await markDadMessageSeen(dadMessage.id);
      setDadMessage(null);
    }
  };

  const handleLetterOpen = () => setShowWeeklyLetter(true);
  const handleLetterDismiss = async () => {
    setShowWeeklyLetter(false);
    if (weeklyLetter?.id) {
      await markWeeklyLetterRead(weeklyLetter.id);
      setWeeklyLetter(null);
    }
  };

  // Closest-to-leveling animal — preserves existing card
  const closestAnimalCard = useMemo(() => {
    const trainable = animalCollection.filter(c => !(c.is_max_level ?? false));
    if (trainable.length === 0) return null;
    const closest = [...trainable].sort((a, b) => {
      const aGap = (a.xp_to_next_level ?? 100) - (a.current_xp ?? 0);
      const bGap = (b.xp_to_next_level ?? 100) - (b.current_xp ?? 0);
      return aGap - bGap;
    })[0];
    const animal = ANIMALS.find(a => a.id === closest.animal_id);
    if (!animal) return null;
    const gap = Math.max(0, (closest.xp_to_next_level ?? 100) - (closest.current_xp ?? 0));
    const d = displayName(animal.name, closest);
    return (
      <button
        onClick={() => router.push('/animals')}
        className="w-full mb-4 bg-yellow-400/15 border border-yellow-400/40 rounded-2xl px-4 py-3 text-left active:scale-95 transition-transform"
      >
        <p className="text-sm font-bold text-navy">
          💪 {animal.emoji} {d.isChampion ? `👑 ${d.text}` : d.text} is Level {closest.current_level ?? 1} — {gap} XP to next level!
        </p>
      </button>
    );
  }, [animalCollection, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4 animate-bounce">🎮</p>
          <p className="text-2xl font-extrabold text-navy">Prep & Play</p>
        </div>
      </div>
    );
  }

  if (showDedication) {
    return <DedicationScreen onDismiss={handleDedicationDone} />;
  }

  if (showDadMessage && dadMessage) {
    return (
      <DadMessageScreen
        open
        text={dadMessage.message_text}
        title="A Message from Dad"
        dismissLabel="Let's Play! ▶"
        onDismiss={handleDadMessageDismiss}
      />
    );
  }

  if (showWeeklyLetter && weeklyLetter) {
    return (
      <DadMessageScreen
        open
        text={weeklyLetter.letter_text}
        title="From Dad, with love 💛"
        dismissLabel="Thanks Dad! 🤗"
        onDismiss={handleLetterDismiss}
      />
    );
  }

  return (
    <div className="p-6 pb-8">
      <ChallengeCompletionOverlay
        open={challengeJustCompleted}
        description={challenge?.challenge_description || ''}
        onDismiss={() => setChallengeJustCompleted(false)}
      />
      <div className="max-w-md mx-auto">
        {/* Greeting */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-extrabold text-navy mb-1">
            Hi Wes!{extendedGreetingShown ? " Dad's been thinking about you." : ''} 👋
          </h1>
          <p className="text-lg text-gray-500">Ready to learn something awesome?</p>
        </div>

        {/* Dad's message card */}
        {dadMessage && (
          <button
            onClick={handleDadMessageOpen}
            className="w-full mb-4 bg-gradient-to-r from-amber-300 to-yellow-400 rounded-2xl p-4 text-left text-amber-900 shadow-lg active:scale-95 animate-pulse"
            style={{ animationDuration: '2.4s' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔧</span>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider">Dad&apos;s Workshop</p>
                <p className="font-bold text-base">Dad was up late building something new for you!</p>
              </div>
              <span className="text-sm font-bold">Open 📬</span>
            </div>
          </button>
        )}

        {/* Weekly letter card */}
        {weeklyLetter && (
          <button
            onClick={handleLetterOpen}
            className="w-full mb-4 rounded-2xl p-4 text-left text-amber-900 shadow-md border-2 border-amber-300 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">📬</span>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider">Letter from Dad</p>
                <p className="font-handwriting text-xl leading-tight line-clamp-2" style={{ fontWeight: 500 }}>
                  {weeklyLetter.letter_text.slice(0, 70)}{weeklyLetter.letter_text.length > 70 ? '…' : ''}
                </p>
              </div>
              <span className="text-sm font-bold">Read it! ▶</span>
            </div>
          </button>
        )}

        {/* Challenge from Dad */}
        {challenge && !challenge.is_completed && challengeProgress && (
          <ChallengeCard challenge={challenge} progress={challengeProgress} />
        )}

        {/* Star Student badge */}
        {hasStarStudent && (
          <div className="text-center mb-4">
            <span className="inline-block bg-gold/20 text-gold-dark border-2 border-gold rounded-full px-4 py-1 font-bold text-sm">
              ⭐ Star Student: Wes
            </span>
          </div>
        )}

        {/* Ultimate Champion */}
        {isUltimateChampion && (
          <button
            onClick={() => router.push('/champion')}
            className="w-full mb-4 bg-gradient-to-r from-gold to-amber-500 text-navy rounded-2xl p-4 text-center font-extrabold text-lg shadow-lg"
          >
            🏆 ULTIMATE CHAMPION 🏆
          </button>
        )}

        {/* Streak */}
        {streak > 0 && (
          <div className="text-center mb-4">
            <span className="inline-block bg-coral/10 text-coral font-bold text-lg px-4 py-2 rounded-full">
              🔥 {streak} day streak!
            </span>
          </div>
        )}

        {/* Closest-to-leveling animal */}
        {closestAnimalCard}

        {/* Weekly assessment prompt */}
        {showWeeklyPrompt && (
          <div className="bg-navy/5 border-2 border-navy/20 rounded-2xl p-4 mb-4 text-center">
            <p className="font-bold text-navy mb-2">📋 Weekly Assessment Day!</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => router.push('/assessment?type=weekly')}
                className="bg-navy text-white font-bold px-4 py-2 rounded-xl text-sm"
              >
                Start Now
              </button>
              <button
                onClick={() => setShowWeeklyPrompt(false)}
                className="bg-gray-200 text-gray-600 font-bold px-4 py-2 rounded-xl text-sm"
              >
                Later
              </button>
            </div>
          </div>
        )}

        {/* Word of the Day */}
        {wordOfDay && <WordOfDayCard data={wordOfDay} />}

        {/* Animal Fact of the Day */}
        <AnimalFactOfDay collection={animalCollection} />

        {/* Game mode buttons */}
        <div className="space-y-3 mb-6">
          {GAME_MODES.map(mode => {
            const p = progress.find(pr => pr.skill_area === mode.skill);
            const lvl = (p?.current_level || 1) as DifficultyLevel;
            return (
              <button
                key={mode.skill}
                onClick={() => router.push(`/play/${mode.skill}`)}
                className={`w-full bg-gradient-to-r ${mode.colors} rounded-2xl p-5 text-left text-white shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-4`}
              >
                <BadgeDisplay skillArea={mode.skill} level={lvl} size="sm" />
                <div className="flex-1">
                  <h3 className="text-xl font-extrabold">{mode.label}</h3>
                  <p className="text-sm opacity-80">{mode.desc}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-70">{LEVEL_NAMES[lvl]}</p>
                  <p className="text-3xl">{mode.emoji}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Current badges row */}
        <div className="flex justify-center gap-3 mb-6">
          {progress.map(p => (
            <BadgeDisplay
              key={p.skill_area}
              skillArea={p.skill_area as SkillArea}
              level={p.current_level as DifficultyLevel}
              size="sm"
            />
          ))}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button onClick={() => router.push('/animals')}
            className="bg-navy/5 border border-navy/10 rounded-xl py-2 text-sm font-bold text-navy active:scale-95">
            Wes&apos;s Animals 🦁
          </button>
          <button onClick={() => router.push('/trophies')}
            className="bg-yellow-400/15 border border-yellow-400/30 rounded-xl py-2 text-sm font-bold text-yellow-700 active:scale-95">
            Trophy Room 🏆
          </button>
          {animalCount >= 2 && (
            <button onClick={() => router.push('/battle')}
              className="bg-red-500/10 border border-red-500/20 rounded-xl py-2 text-sm font-bold text-red-600 active:scale-95">
              Battle Arena ⚔️
            </button>
          )}
          <button onClick={() => router.push('/stories')}
            className="bg-coral/10 border border-coral/20 rounded-xl py-2 text-sm font-bold text-coral active:scale-95">
            Wes&apos;s Stories 📚
          </button>
        </div>
        <p className="text-center text-xs text-yellow-700 font-bold mb-4">{trophyCount} trophies earned!</p>
        {animalCount >= 10 && (
          <div className="text-center mb-2">
            <button onClick={() => router.push('/battle/tournament/setup')} className="text-sm text-yellow-500 hover:text-yellow-400 font-bold">
              TOURNAMENT! 🏆
            </button>
          </div>
        )}
        {animalCount >= 2 && animalCount < 10 && (
          <p className="text-xs text-gray-400 text-center">Unlock {10 - animalCount} more for Tournament!</p>
        )}

        <div className="text-center mt-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-xs text-gray-400 hover:text-navy font-bold"
          >
            Parent Dashboard →
          </button>
        </div>
      </div>
    </div>
  );
}
