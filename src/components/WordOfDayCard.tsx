'use client';

import { useState } from 'react';
import { speak, speakSequence, stopSpeaking } from '@/lib/speech';

interface WordOfDayData {
  word: string;
  definition: string;
  example_sentence: string;
  syllable_breakdown: string;
  fun_fact?: string;
  category?: string;
}

interface WordOfDayCardProps {
  data: WordOfDayData;
}

export default function WordOfDayCard({ data }: WordOfDayCardProps) {
  const [playing, setPlaying] = useState<string | null>(null);

  const disabled = !!playing;

  const hearWord = async () => {
    if (disabled) { stopSpeaking(); setPlaying(null); return; }
    setPlaying('word');
    await speakSequence([
      { text: data.word, rate: 0.70, pitch: 1.05, pauseAfter: 1000 },
      { text: data.word, rate: 0.70, pitch: 1.05 },
    ]);
    setPlaying(null);
  };

  const hearSentence = async () => {
    if (disabled) { stopSpeaking(); setPlaying(null); return; }
    setPlaying('sentence');
    await speakSequence([
      { text: data.example_sentence, rate: 0.80, pitch: 1.05, pauseAfter: 800 },
      { text: `The word is... ${data.word}.`, rate: 0.75, pitch: 1.05 },
    ]);
    setPlaying(null);
  };

  const hearBoth = async () => {
    if (disabled) { stopSpeaking(); setPlaying(null); return; }
    setPlaying('both');
    await speakSequence([
      { text: `Today's word is... ${data.word}.`, rate: 0.75, pitch: 1.05, pauseAfter: 1000 },
      { text: data.word, rate: 0.70, pitch: 1.05, pauseAfter: 300 },
      { text: data.word, rate: 0.70, pitch: 1.05, pauseAfter: 1500 },
      { text: 'Now listen for it in a sentence.', rate: 0.85, pitch: 1.05, pauseAfter: 500 },
      { text: data.example_sentence, rate: 0.80, pitch: 1.05, pauseAfter: 1000 },
      { text: `The word is... ${data.word}. Brilliant!`, rate: 0.80, pitch: 1.1 },
    ]);
    setPlaying(null);
  };

  return (
    <div className="bg-gradient-to-br from-coral/10 to-sunshine/10 border-2 border-coral/20 rounded-2xl p-5 mb-6">
      <p className="text-xs font-bold text-coral mb-2">⭐ WORD OF THE DAY</p>
      <p className="text-3xl font-extrabold text-navy mb-1">{data.word}</p>
      <p className="text-sm text-coral font-bold mb-2">{data.syllable_breakdown}</p>
      <p className="text-sm text-gray-600 mb-1">{data.definition}</p>
      <p className="text-xs text-gray-400 italic mb-4">&ldquo;{data.example_sentence}&rdquo;</p>

      {/* Audio buttons */}
      <div className="space-y-2">
        <button onClick={hearWord}
          className={`w-full min-h-[56px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all ${
            playing === 'word' ? 'bg-navy text-white animate-pulse' : 'bg-navy/90 text-white hover:bg-navy'
          }`}>
          {playing === 'word' ? '🔊 Playing...' : 'Hear the Word 🔊'}
        </button>
        <button onClick={hearSentence}
          className={`w-full min-h-[56px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all ${
            playing === 'sentence' ? 'bg-navy/80 text-white animate-pulse' : 'bg-navy/70 text-white hover:bg-navy/80'
          }`}>
          {playing === 'sentence' ? '🔊 Playing...' : 'Hear it in a Sentence 🔊'}
        </button>
        <button onClick={hearBoth}
          className={`w-full min-h-[56px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all ${
            playing === 'both' ? 'bg-gold text-navy animate-pulse' : 'bg-gold/90 text-navy hover:bg-gold'
          }`}>
          {playing === 'both' ? '🔊 Playing...' : 'Hear Both! 🔊'}
        </button>
      </div>

      {/* Pronunciation practice */}
      <div className="mt-3 text-center">
        <button onClick={() => speak(`Now you say it! Say ${data.word}!`, { rate: 0.85, pitch: 1.1 })}
          className="text-sm text-coral font-bold hover:text-navy">
          Now You Say It! 🎤
        </button>
      </div>
    </div>
  );
}

// Auto-play the "Hear Both" sequence — call once per day
export async function autoPlayWordOfDay(data: { word: string; example_sentence: string }): Promise<void> {
  await speakSequence([
    { text: `Today's word is... ${data.word}.`, rate: 0.75, pitch: 1.05, pauseAfter: 1000 },
    { text: data.word, rate: 0.70, pitch: 1.05, pauseAfter: 300 },
    { text: data.word, rate: 0.70, pitch: 1.05, pauseAfter: 1500 },
    { text: 'Now listen for it in a sentence.', rate: 0.85, pitch: 1.05, pauseAfter: 500 },
    { text: data.example_sentence, rate: 0.80, pitch: 1.05, pauseAfter: 1000 },
    { text: `The word is... ${data.word}. Brilliant!`, rate: 0.80, pitch: 1.1 },
  ]);
}
