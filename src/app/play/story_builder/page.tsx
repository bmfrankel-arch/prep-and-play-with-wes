'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DifficultyLevel, LEVEL_NAMES, SKILL_CONFIG } from '@/lib/types';
import { getSkillProgress, updateSkillProgress, saveGameSession, saveStory, getAnimalCollection, saveAnimalUnlock } from '@/lib/db';
import { playCorrectSound } from '@/lib/audio';
import { speak, speakWord, speakStory, speakCelebration } from '@/lib/speech';
import { selectAnimal } from '@/lib/animalSelection';
import { Animal } from '@/data/animals';
import { calculateXp } from '@/lib/animalLeveling';
import Confetti from '@/components/Confetti';
import LevelUpSequence from '@/components/LevelUpSequence';
import AnimalUnlockSequence from '@/components/AnimalUnlockSequence';
import BadgeDisplay from '@/components/BadgeDisplay';
import PostSessionFlow from '@/components/PostSessionFlow';

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

// Border-only colors for building phase (subtle hint)
const TYPE_COLORS: Record<string, string> = {
  noun: 'bg-white border-blue-400 text-blue-800',
  verb: 'bg-white border-green-400 text-green-800',
  adjective: 'bg-white border-yellow-400 text-yellow-800',
  adverb: 'bg-white border-orange-400 text-orange-800',
  article: 'bg-white border-gray-300 text-gray-600',
  preposition: 'bg-white border-purple-400 text-purple-800',
  conjunction: 'bg-white border-pink-400 text-pink-800',
};

// Solid colors for Word Detective phase
const TYPE_SOLID: Record<string, string> = {
  noun: 'bg-blue-500 text-white',
  verb: 'bg-green-500 text-white',
  adjective: 'bg-yellow-500 text-navy',
  adverb: 'bg-orange-500 text-white',
  article: 'bg-gray-400 text-white',
  preposition: 'bg-purple-500 text-white',
  conjunction: 'bg-pink-500 text-white',
};

const TYPE_LABELS: Record<string, string> = {
  noun: 'NOUN', verb: 'VERB', adjective: 'ADJECTIVE', adverb: 'ADVERB',
  article: 'ARTICLE', preposition: 'PREPOSITION', conjunction: 'CONJUNCTION',
};

interface GrammarWord {
  word: string;
  type: string;
  child_explanation: string;
  why_here: string;
}

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
  const [showAnimalUnlock, setShowAnimalUnlock] = useState(false);
  const [unlockedAnimal, setUnlockedAnimal] = useState<Animal | null>(null);
  const [animalSaveStatus, setAnimalSaveStatus] = useState<'saved' | 'failed' | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState<DifficultyLevel>(2);
  const [consCorrect, setConsCorrect] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [failCount, setFailCount] = useState(0);
  const [showWordDetective, setShowWordDetective] = useState(false);
  const [grammarBreakdown, setGrammarBreakdown] = useState<GrammarWord[]>([]);
  const [activeTileIndex, setActiveTileIndex] = useState<number | null>(null);
  const [tappedCount, setTappedCount] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [grammarStamps, setGrammarStamps] = useState(0);
  const [sentenceSummary, setSentenceSummary] = useState('');
  const [showFlow, setShowFlow] = useState(false);

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
    // Transition to Word Detective phase after celebrating
    setTimeout(() => {
      setFeedback(null);
      // Show Word Detective if we have grammar data from the API response
      setShowWordDetective(true);
      setActiveTileIndex(null);
      setTappedCount(0);
      setTimeout(() => speak("Brilliant sentence, Wes! Now let's be Word Detectives and find out what each word does!", { rate: 0.85, pitch: 1.1 }), 500);
    }, 1500);
  };

  const advanceFromWordDetective = () => {
    setShowWordDetective(false);
    if (tappedCount >= 3) setGrammarStamps(g => g + 1);
    setPlacedWords([]);
    const totalSentences = session?.sentences?.length ?? 3;
    if (sentenceIndex + 1 >= totalSentences) {
      finishStory(completedSentences);
    } else {
      setSentenceIndex(i => i + 1);
    }
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
          level,
        }),
      });
      const data = await res.json();

      if (data.valid) {
        // Capture grammar breakdown for Word Detective
        if (data.grammar_breakdown?.length) {
          setGrammarBreakdown(data.grammar_breakdown);
          setSentenceSummary(data.sentence_summary || '');
        } else {
          // Fallback: use word bank types
          setGrammarBreakdown(placedWords.map(w => ({
            word: w.word, type: w.type || 'article',
            child_explanation: `${w.word} is a ${(w.type || 'helper').toUpperCase()} word in our sentence!`,
            why_here: `${w.word} goes here to help our sentence make sense!`,
          })));
        }
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
    setTimeout(() => setShowFlow(true), 1500);

    // Trigger animal unlock after story completion
    try {
      const collection = await getAnimalCollection();
      // Rarity based on Story Builder level
      const score = level === 3 ? 9 : level === 2 ? 7 : 4; // Maps to Epic/Rare or Common/Rare tiers
      const animal = selectAnimal(score, 10, collection);
      if (animal) {
        setUnlockedAnimal(animal);
        const { saved } = await saveAnimalUnlock({
          animal_id: animal.id,
          rarity: animal.rarity,
          quiz_score_when_unlocked: level,
          quiz_type_when_unlocked: 'story_builder',
        });
        setAnimalSaveStatus(saved ? 'saved' : 'failed');
      }
    } catch { /* continue */ }
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

  // Word Detective phase — grammar exploration
  if (showWordDetective && grammarBreakdown.length > 0) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-extrabold text-navy text-center mb-4">Word Detective! 🔍</h2>

          {/* Color-coded sentence tiles */}
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {grammarBreakdown.map((gw, i) => (
              <button key={i}
                onClick={() => {
                  setActiveTileIndex(activeTileIndex === i ? null : i);
                  setTappedCount(c => c + 1);
                  speak(gw.child_explanation, { rate: 0.80, pitch: 1.05 });
                }}
                className={`rounded-xl px-4 py-3 border-2 transition-all active:scale-95 flex flex-col items-center min-w-[70px] ${TYPE_SOLID[gw.type] || TYPE_SOLID.article} ${activeTileIndex === i ? 'scale-110 ring-2 ring-navy' : ''}`}
                style={{ animationDelay: `${i * 300}ms` }}>
                <span className="text-2xl font-extrabold">{gw.word}</span>
                <span className="text-[10px] font-bold opacity-80 mt-1">{TYPE_LABELS[gw.type] || gw.type.toUpperCase()}</span>
              </button>
            ))}
          </div>

          {/* Speech bubble for active tile */}
          {activeTileIndex !== null && grammarBreakdown[activeTileIndex] && (
            <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-navy/20 mb-4 animate-fade-in">
              <p className="text-lg font-bold text-navy mb-2">{grammarBreakdown[activeTileIndex].child_explanation}</p>
              <button onClick={() => {
                speak(grammarBreakdown[activeTileIndex].why_here, { rate: 0.80, pitch: 1.05 });
              }} className="text-sm text-coral font-bold hover:text-navy">Why here? 🤔</button>
            </div>
          )}

          {/* Color legend */}
          <div className="flex flex-wrap gap-2 justify-center text-[10px] mb-4">
            <span className="px-2 py-1 rounded bg-blue-500 text-white">Things</span>
            <span className="px-2 py-1 rounded bg-green-500 text-white">Actions</span>
            <span className="px-2 py-1 rounded bg-yellow-500 text-navy">Describing</span>
            <span className="px-2 py-1 rounded bg-gray-400 text-white">Helpers</span>
          </div>

          {/* Sentence summary */}
          {sentenceSummary && (
            <div className="bg-sunshine/10 rounded-xl p-3 text-center mb-4">
              <p className="text-sm text-navy">{sentenceSummary}</p>
            </div>
          )}

          {/* Grammar stamp indicator */}
          {tappedCount >= 3 && (
            <p className="text-center text-grass font-bold text-sm mb-2 animate-fade-in">Grammar Detective! 🔍 — stamp earned!</p>
          )}

          {/* Next button — always visible */}
          <button onClick={advanceFromWordDetective}
            className="w-full min-h-[72px] bg-grass text-white font-bold text-xl rounded-2xl active:scale-95 transition-all">
            Next Sentence →
          </button>

          <p className="text-center text-xs text-gray-400 mt-2">Tap each word to learn what it does!</p>
        </div>
      </div>
    );
  }

  // Animal unlock after story completion
  if (showAnimalUnlock && unlockedAnimal) {
    return (
      <AnimalUnlockSequence
        animal={unlockedAnimal}
        onComplete={() => { setShowAnimalUnlock(false); }}
        saveStatus={animalSaveStatus}
      />
    );
  }

  if (storyComplete) {
    const total = session?.sentences?.length || 3;
    const xpEarned = calculateXp('story_builder', completedSentences.length, total);
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Confetti duration={5000} />
        {showFlow && (
          <PostSessionFlow
            active={showFlow}
            xpEarned={xpEarned}
            xpSource="story_builder"
            score={completedSentences.length}
            total={total}
            attemptUnlock={false}
            onComplete={() => setShowFlow(false)}
          />
        )}
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
            {unlockedAnimal && !showAnimalUnlock && (
              <button onClick={() => { speakCelebration("Brilliant story, Wes! You've earned a new animal!"); setTimeout(() => setShowAnimalUnlock(true), 2000); }} className="game-btn bg-gold text-navy px-6 animate-pulse">
                See Your New Animal! 🦁
              </button>
            )}
            <button onClick={() => speakStory(completedSentences.join('. ') + '.')} className="game-btn bg-coral text-white px-6">🔊 Read Aloud</button>
            <button onClick={() => router.push('/stories')} className="game-btn bg-navy text-white px-6">My Stories</button>
            <button onClick={() => { setSentenceIndex(0); setCompletedSentences([]); setStoryComplete(false); setUnlockedAnimal(null); setAnimalSaveStatus(null); fetchSession(level); }} className="game-btn bg-grass text-white px-6">New Story!</button>
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
