'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DifficultyLevel, LEVEL_NAMES, SKILL_CONFIG } from '@/lib/types';
import { getSkillProgress, updateSkillProgress, saveGameSession, saveStory } from '@/lib/db';
import { playCorrectSound } from '@/lib/audio';
import { speak, speakWord, speakStory, speakCelebration } from '@/lib/speech';
import Confetti from '@/components/Confetti';
import LevelUpSequence from '@/components/LevelUpSequence';
import BadgeDisplay from '@/components/BadgeDisplay';

interface WordTile {
  word: string;
  type: string;
}

interface SentenceData {
  target_sentence: string;
  word_bank: WordTile[];
  acceptable_alternatives: string[];
  hint: string;
}

interface StorySession {
  theme: string;
  scene_description: string;
  scene_emoji: string;
  sentences: SentenceData[];
}

const TYPE_COLORS: Record<string, string> = {
  noun: 'bg-blue-100 border-blue-300 text-blue-800',
  verb: 'bg-green-100 border-green-300 text-green-800',
  adjective: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  article: 'bg-gray-100 border-gray-300 text-gray-600',
};

// safeSpeakText replaced by centralized speech.ts imports

function isValidSession(data: unknown): data is StorySession {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.theme === 'string' &&
    typeof d.scene_description === 'string' &&
    Array.isArray(d.sentences) &&
    d.sentences.length > 0 &&
    d.sentences.every((s: unknown) => {
      if (!s || typeof s !== 'object') return false;
      const sent = s as Record<string, unknown>;
      return typeof sent.target_sentence === 'string' && Array.isArray(sent.word_bank);
    })
  );
}

export default function StoryBuilderPage() {
  const router = useRouter();
  const [level, setLevel] = useState<DifficultyLevel>(1);
  const [session, setSession] = useState<StorySession | null>(null);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [placedWords, setPlacedWords] = useState<WordTile[]>([]);
  const [completedSentences, setCompletedSentences] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [feedback, setFeedback] = useState<{ valid: boolean; text: string } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [storyComplete, setStoryComplete] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState<DifficultyLevel>(2);
  const [consCorrect, setConsCorrect] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [failCount, setFailCount] = useState(0);

  const fetchSession = useCallback(async (lvl: DifficultyLevel) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillArea: 'story_builder', subGame: 'story_builder', level: lvl, count: 1 }),
      });
      if (!res.ok) {
        setError('Could not load story. Please try again.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      const story = data.story;
      if (!isValidSession(story)) {
        setError('Got an unexpected response. Tap Try Again!');
        setLoading(false);
        return;
      }

      // Normalize word_bank entries — ensure each has word and type
      story.sentences = story.sentences.map((s: SentenceData) => ({
        ...s,
        word_bank: Array.isArray(s.word_bank)
          ? s.word_bank.map((w: unknown) => {
              if (typeof w === 'string') return { word: w, type: 'article' };
              const wt = w as Record<string, unknown>;
              return { word: String(wt.word || ''), type: String(wt.type || 'article') };
            })
          : [],
        acceptable_alternatives: Array.isArray(s.acceptable_alternatives) ? s.acceptable_alternatives : [],
        hint: s.hint || 'Try a different order!',
      }));

      setSession(story);
    } catch {
      setError('Could not load story. Check your connection.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const progress = await getSkillProgress('story_builder');
        const lvl = progress.current_level as DifficultyLevel;
        setLevel(lvl);
        setConsCorrect(progress.consecutive_correct);
        await fetchSession(lvl);
      } catch {
        setError('Something went wrong loading the game.');
        setLoading(false);
      }
    })();
  }, [fetchSession]);

  // Auto-read scene description when session loads
  useEffect(() => {
    if (session && !loading) {
      speak(session.scene_description);
    }
  }, [session, loading]);

  const currentSentence = session?.sentences?.[sentenceIndex] ?? null;
  const wordBank = currentSentence?.word_bank ?? [];
  const availableWords = wordBank.filter(
    w => !placedWords.find(p => p.word === w.word && p.type === w.type)
  );

  const placeWord = (tile: WordTile) => {
    setPlacedWords(prev => [...prev, tile]);
    if (level === 1) speakWord(tile.word);
  };

  const removeWord = (index: number) => {
    setPlacedWords(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => setPlacedWords([]);

  const acceptSentence = (sentence: string) => {
    playCorrectSound();
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
    speakCelebration(`Wes said: ${sentence}!`);
    setFeedback({ valid: true, text: 'Great sentence, Wes! 🌟' });
    setFailCount(0);

    const newCompleted = [...completedSentences, sentence];
    setCompletedSentences(newCompleted);

    const newCC = consCorrect + 1;
    setConsCorrect(newCC);

    // Level up check
    if (newCC >= 3 && level < 3) {
      const next = (level + 1) as DifficultyLevel;
      (async () => {
        try {
          const progress = await getSkillProgress('story_builder');
          const unlocks = [...progress.unlocks_earned];
          const un = SKILL_CONFIG.story_builder.unlocks[next]?.name;
          if (un && !unlocks.includes(un)) unlocks.push(un);
          await updateSkillProgress({ ...progress, current_level: next, consecutive_correct: 0, consecutive_wrong: 0, unlocks_earned: unlocks });
        } catch { /* continue */ }
      })();
      setLevel(next);
      setConsCorrect(0);
      setNewLevel(next);
      setValidating(false);
      setTimeout(() => setShowLevelUp(true), 1500);
      return;
    }

    (async () => {
      try {
        await updateSkillProgress({ ...(await getSkillProgress('story_builder')), consecutive_correct: newCC, consecutive_wrong: 0 });
      } catch { /* continue */ }
    })();

    setValidating(false);
    setTimeout(() => {
      setFeedback(null);
      setPlacedWords([]);
      const totalSentences = session?.sentences?.length ?? 3;
      if (sentenceIndex + 1 >= totalSentences) {
        finishStory(newCompleted);
      } else {
        setSentenceIndex(i => i + 1);
      }
    }, 1500);
  };

  const submitSentence = async () => {
    if (!currentSentence || placedWords.length === 0) return;
    setValidating(true);
    const sentence = placedWords.map(w => w.word).join(' ');

    // After 2 API failures, accept anyway — never block progress
    const newFailCount = failCount + 1;

    try {
      const res = await fetch('/api/validate-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence,
          wordBank: currentSentence.word_bank,
          targetSentence: currentSentence.target_sentence,
          acceptableAlternatives: currentSentence.acceptable_alternatives,
        }),
      });
      const data = await res.json();

      if (data.valid) {
        acceptSentence(sentence);
        return;
      } else {
        // Invalid sentence — show hint but don't reset words
        const hint = data.feedback || currentSentence.hint || 'Try a different order!';
        speak(hint);
        setFeedback({ valid: false, text: hint });
        setFailCount(newFailCount);
        setValidating(false);
        setTimeout(() => setFeedback(null), 3000);

        // After 2 consecutive failures, accept anyway
        if (newFailCount >= 2) {
          setTimeout(() => { acceptSentence(sentence); }, 1500);
        }
      }
    } catch (err) {
      console.error('Validate sentence error:', err);
      setFailCount(newFailCount);
      // After 2 API failures, accept the sentence
      if (newFailCount >= 2) {
        acceptSentence(sentence);
      } else {
        setFeedback({ valid: false, text: 'Hmm, let me check again...' });
        setValidating(false);
        setTimeout(() => setFeedback(null), 2000);
      }
    }
  };

  const finishStory = async (sentences: string[]) => {
    setStoryComplete(true);
    try {
      await saveGameSession({ skill_area: 'story_builder', sub_game: 'story_builder', score: sentences.length, total_questions: 3, child_name: 'Wes' });
      await saveStory({ theme: session?.theme || '', sentences, word_banks_used: session?.sentences?.map(s => s.word_bank) ?? [] });
    } catch { /* continue */ }
    setTimeout(() => {
      speakStory(`Here is Wes's story. ${sentences.join('. ')}.`);
    }, 1000);
  };

  if (showLevelUp) {
    return (
      <LevelUpSequence
        skillArea="story_builder"
        newLevel={newLevel}
        onComplete={() => {
          setShowLevelUp(false);
          setPlacedWords([]);
          const totalSentences = session?.sentences?.length ?? 3;
          if (sentenceIndex + 1 >= totalSentences) {
            finishStory(completedSentences);
          } else {
            setSentenceIndex(i => i + 1);
          }
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-bounce mb-4">📝</div>
          <p className="text-2xl font-bold text-navy">Creating your story...</p>
          <p className="text-gray-500 mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl">
          <p className="text-5xl mb-4">😕</p>
          <h2 className="text-2xl font-bold text-navy mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => fetchSession(level)} className="game-btn bg-grass text-white px-6">Try Again</button>
            <button onClick={() => router.push('/')} className="game-btn bg-navy text-white px-6">Home</button>
          </div>
        </div>
      </div>
    );
  }

  if (storyComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Confetti duration={5000} />
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl">
          <p className="text-6xl mb-4">🌟</p>
          <h2 className="text-3xl font-extrabold text-navy mb-2">Wes wrote a story!</h2>
          <div className="text-4xl mb-4">{session?.scene_emoji || '📝'}</div>
          <p className="text-sm font-bold text-coral mb-4">{session?.theme || ''}</p>
          <div className="bg-sunshine/10 rounded-2xl p-4 mb-6 text-left">
            {completedSentences.map((s, i) => (
              <p key={i} className="text-lg text-navy mb-2">{s}.</p>
            ))}
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => speakStory(completedSentences.join('. ') + '.')} className="game-btn bg-coral text-white px-6">🔊 Read Aloud</button>
            <button onClick={() => router.push('/stories')} className="game-btn bg-navy text-white px-6">My Stories</button>
            <button onClick={() => { setSentenceIndex(0); setCompletedSentences([]); setStoryComplete(false); fetchSession(level); }} className="game-btn bg-grass text-white px-6">New Story!</button>
            <button onClick={() => router.push('/')} className="game-btn bg-gray-200 text-navy px-6">Home</button>
          </div>
        </div>
      </div>
    );
  }

  if (!session || !currentSentence) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl">
          <p className="text-5xl mb-4">😕</p>
          <h2 className="text-2xl font-bold text-navy mb-2">No story loaded</h2>
          <div className="flex gap-3 justify-center">
            <button onClick={() => fetchSession(level)} className="game-btn bg-grass text-white px-6">Try Again</button>
            <button onClick={() => router.push('/')} className="game-btn bg-navy text-white px-6">Home</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      {showConfetti && <Confetti duration={3000} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.push('/')} className="text-navy font-bold text-lg">← Home</button>
        <div className="flex items-center gap-2">
          <BadgeDisplay skillArea="story_builder" level={level} size="sm" />
          <span className="text-sm font-bold text-navy">{LEVEL_NAMES[level]}</span>
        </div>
      </div>

      {/* Theme */}
      <div className="text-center mb-4">
        <p className="text-4xl mb-2">{session.scene_emoji || '📝'}</p>
        <p className="text-lg font-bold text-navy">{session.theme}</p>
        <p className="text-sm text-gray-500">Sentence {sentenceIndex + 1} of {session.sentences.length}</p>
      </div>

      {/* Speaker */}
      <div className="flex justify-center mb-3">
        <button onClick={() => speak(session.scene_description)} className="text-3xl active:scale-90 transition-transform">🔊</button>
      </div>

      {/* Completed sentences */}
      {completedSentences.length > 0 && (
        <div className="bg-green-50 rounded-xl p-3 mb-4 max-w-lg mx-auto">
          {completedSentences.map((s, i) => (
            <p key={i} className="text-sm text-green-800 font-bold">{s}.</p>
          ))}
        </div>
      )}

      {/* Sentence slots */}
      <div className="max-w-lg mx-auto mb-6">
        <div className="min-h-[80px] bg-white border-2 border-dashed border-navy/30 rounded-2xl p-4 flex flex-wrap gap-2 items-center justify-center">
          {placedWords.length === 0 && (
            <p className="text-gray-300 text-lg">Tap words to build your sentence!</p>
          )}
          {placedWords.map((w, i) => (
            <button
              key={`placed-${i}`}
              onClick={() => removeWord(i)}
              className="bg-green-50 border-2 border-green-300 text-green-800 px-4 py-2 rounded-xl font-bold text-lg active:scale-95 transition-transform"
            >
              {w.word}
            </button>
          ))}
        </div>
      </div>

      {/* Word bank */}
      <div className="max-w-lg mx-auto mb-6">
        <div className="flex flex-wrap gap-2 justify-center">
          {availableWords.map((w, i) => (
            <button
              key={`bank-${i}-${w.word}`}
              onClick={() => placeWord(w)}
              className={`px-5 py-3 rounded-xl font-bold text-lg border-2 active:scale-95 transition-transform min-h-[52px] ${TYPE_COLORS[w.type] || TYPE_COLORS.article}`}
            >
              {w.word}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        <button onClick={clearAll} className="bg-gray-200 text-gray-600 font-bold px-6 py-3 rounded-xl">Clear</button>
        <button
          onClick={submitSentence}
          disabled={placedWords.length === 0 || validating}
          className="bg-grass text-white font-bold px-8 py-3 rounded-xl disabled:opacity-50 text-lg"
        >
          {validating ? 'Checking...' : "That's my sentence! ✓"}
        </button>
      </div>

      {/* Feedback overlay */}
      {feedback && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 pointer-events-none">
          <div className={`text-center p-8 rounded-3xl animate-scale-in ${feedback.valid ? 'bg-grass/95' : 'bg-white/95'}`}>
            <p className="text-5xl mb-2">{feedback.valid ? '🎉' : '💡'}</p>
            <p className={`text-2xl font-bold ${feedback.valid ? 'text-white' : 'text-navy'}`}>{feedback.text}</p>
          </div>
        </div>
      )}
    </div>
  );
}
