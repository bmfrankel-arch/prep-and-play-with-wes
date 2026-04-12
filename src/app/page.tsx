'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SkillArea, SkillProgress, DifficultyLevel, LEVEL_NAMES } from '@/lib/types';
import { getAllSkillProgress, getStreak, getParentSettings } from '@/lib/db';
import BadgeDisplay from '@/components/BadgeDisplay';

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

  const hasWordOfDayUnlock = progress.some(
    p => p.skill_area === 'word_wizard' && p.unlocks_earned.includes('Word of the Day')
  );
  const hasStarStudent = progress.some(
    p => p.skill_area === 'confidence_coach' && p.unlocks_earned.includes('Star Student')
  );
  const isUltimateChampion = progress.length >= 6 && progress.every(p => p.current_level >= 3);

  useEffect(() => {
    (async () => {
      const [p, s] = await Promise.all([getAllSkillProgress(), getStreak()]);
      setProgress(p);
      setStreak(s);
      setLoading(false);

      // Check scheduled assessment
      const settings = getParentSettings();
      if (settings.scheduled_assessment_day) {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        if (today === settings.scheduled_assessment_day) {
          setShowWeeklyPrompt(true);
        }
      }
    })();
  }, []);

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

  return (
    <div className="p-6 pb-8">
      <div className="max-w-md mx-auto">
        {/* Greeting */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-extrabold text-navy mb-1">Hi Wes! 👋</h1>
          <p className="text-lg text-gray-500">Ready to learn something awesome?</p>
        </div>

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
        {wordOfDay && (
          <div className="bg-gradient-to-br from-coral/10 to-sunshine/10 border-2 border-coral/20 rounded-2xl p-4 mb-6">
            <p className="text-xs font-bold text-coral mb-1">📚 WORD OF THE DAY</p>
            <p className="text-2xl font-extrabold text-navy">{wordOfDay.word}</p>
            <p className="text-sm text-gray-600 mt-1">{wordOfDay.definition}</p>
            <p className="text-xs text-gray-400 italic mt-1">&ldquo;{wordOfDay.example_sentence}&rdquo;</p>
          </div>
        )}

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

        {/* Links */}
        <div className="text-center space-y-2">
          <button
            onClick={() => router.push('/animals')}
            className="text-sm text-gray-400 hover:text-coral font-bold block mx-auto"
          >
            My Animals 🦁
          </button>
          <button
            onClick={() => router.push('/stories')}
            className="text-sm text-gray-400 hover:text-coral font-bold block mx-auto"
          >
            My Stories 📚
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-400 hover:text-navy font-bold block mx-auto"
          >
            Parent Dashboard →
          </button>
        </div>
      </div>
    </div>
  );
}
