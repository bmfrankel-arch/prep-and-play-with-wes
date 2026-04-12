'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DifficultyLevel, LEVEL_NAMES, SKILL_CONFIG } from '@/lib/types';
import { getSkillProgress, updateSkillProgress, saveGameSession, saveStory } from '@/lib/db';
import { speak } from '@/lib/speech';
import { playCorrectSound } from '@/lib/audio';
import Confetti from '@/components/Confetti';
import LevelUpSequence from '@/components/LevelUpSequence';
import BadgeDisplay from '@/components/BadgeDisplay';

interface WordTile {
  word: string;
  type: 'noun' | 'verb' | 'adjective' | 'article';
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

  const fetchSession = useCallback(async (lvl: DifficultyLevel) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillArea: 'story_builder', subGame: 'story_builder', level: lvl, count: 1 }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setLoading(false); return; }
      setSession(data.story);
    } catch {
      setError('Could not load story. Check your connection.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const progress = await getSkillProgress('story_builder');
      const lvl = progress.current_level as DifficultyLevel;
      setLevel(lvl);
      setConsCorrect(progress.consecutive_correct);
      await fetchSession(lvl);
    })();
  }, [fetchSession]);

  useEffect(() => {
    if (session && !loading) {
      speak(session.scene_description);
    }
  }, [session, loading]);

  const currentSentence = session?.sentences[sentenceIndex];
  const availableWords = currentSentence?.word_bank.filter(
    w => !placedWords.find(p => p.word === w.word && p.type === w.type)
  ) || [];

  const placeWord = (tile: WordTile) => {
    setPlacedWords([...placedWords, tile]);
    if (level === 1) speak(tile.word);
  };

  const removeWord = (index: number) => {
    setPlacedWords(placedWords.filter((_, i) => i !== index));
  };

  const clearAll = () => setPlacedWords([]);

  const submitSentence = async () => {
    if (!currentSentence || placedWords.length === 0) return;
    setValidating(true);
    const sentence = placedWords.map(w => w.word).join(' ');

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
        playCorrectSound();
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        speak(`Wes said: ${sentence}!`);
        setFeedback({ valid: true, text: data.feedback });

        const newCompleted = [...completedSentences, sentence];
        setCompletedSentences(newCompleted);

        // Track progress
        const newCC = consCorrect + 1;
        setConsCorrect(newCC);

        if (newCC >= 3 && level < 3) {
          const next = (level + 1) as DifficultyLevel;
          const progress = await getSkillProgress('story_builder');
          const unlocks = [...progress.unlocks_earned];
          const un = SKILL_CONFIG.story_builder.unlocks[next]?.name;
          if (un && !unlocks.includes(un)) unlocks.push(un);
          await updateSkillProgress({ ...progress, current_level: next, consecutive_correct: 0, consecutive_wrong: 0, unlocks_earned: unlocks });
          setLevel(next); setConsCorrect(0); setNewLevel(next);
          setTimeout(() => setShowLevelUp(true), 2000);
          setValidating(false);
          return;
        }
        await updateSkillProgress({ ...(await getSkillProgress('story_builder')), consecutive_correct: newCC, consecutive_wrong: 0 });

        setTimeout(() => {
          setFeedback(null);
          setPlacedWords([]);
          if (sentenceIndex + 1 >= (session?.sentences.length || 3)) {
            finishStory(newCompleted);
          } else {
            setSentenceIndex(i => i + 1);
          }
        }, 3000);
      } else {
        speak(data.feedback || currentSentence.hint);
        setFeedback({ valid: false, text: data.feedback || currentSentence.hint });
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch {
      setFeedback({ valid: false, text: 'Try rearranging the words!' });
      setTimeout(() => setFeedback(null), 3000);
    }
    setValidating(false);
  };

  const finishStory = async (sentences: string[]) => {
    setStoryComplete(true);
    await saveGameSession({ skill_area: 'story_builder', sub_game: 'story_builder', score: sentences.length, total_questions: 3, child_name: 'Wes' });
    await saveStory({ theme: session?.theme || '', sentences, word_banks_used: session?.sentences.map(s => s.word_bank) });
    setTimeout(() => {
      const fullStory = sentences.join('. ') + '.';
      speak(`Here is Wes's story. ${fullStory}`);
    }, 1000);
  };

  if (showLevelUp) {
    return <LevelUpSequence skillArea="story_builder" newLevel={newLevel} onComplete={() => {
      setShowLevelUp(false);
      setPlacedWords([]);
      if (sentenceIndex + 1 >= (session?.sentences.length || 3)) {
        finishStory(completedSentences);
      } else {
        setSentenceIndex(i => i + 1);
      }
    }} />;
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-6xl animate-bounce">📝</div></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 text-center shadow-xl">
          <p className="text-5xl mb-4">😕</p>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={() => fetchSession(level)} className="game-btn bg-grass text-white px-6">Try Again</button>
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
          <div className="text-4xl mb-4">{session?.scene_emoji}</div>
          <p className="text-sm font-bold text-coral mb-4">{session?.theme}</p>
          <div className="bg-sunshine/10 rounded-2xl p-4 mb-6 text-left">
            {completedSentences.map((s, i) => (
              <p key={i} className="text-lg text-navy mb-2">{s}.</p>
            ))}
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => speak(completedSentences.join('. ') + '.')} className="game-btn bg-coral text-white px-6">🔊 Read Aloud</button>
            <button onClick={() => router.push('/stories')} className="game-btn bg-navy text-white px-6">My Stories</button>
            <button onClick={() => { setSentenceIndex(0); setCompletedSentences([]); setStoryComplete(false); fetchSession(level); }} className="game-btn bg-grass text-white px-6">New Story!</button>
            <button onClick={() => router.push('/')} className="game-btn bg-gray-200 text-navy px-6">Home</button>
          </div>
        </div>
      </div>
    );
  }

  if (!session || !currentSentence) return null;

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
        <p className="text-4xl mb-2">{session.scene_emoji}</p>
        <p className="text-lg font-bold text-navy">{session.theme}</p>
        <p className="text-sm text-gray-500">Sentence {sentenceIndex + 1} of {session.sentences.length}</p>
      </div>

      {/* Speaker */}
      <div className="flex justify-center mb-3">
        <button onClick={() => speak(session.scene_description)} className="text-3xl active:scale-90">🔊</button>
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
              key={i}
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
              key={i}
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
