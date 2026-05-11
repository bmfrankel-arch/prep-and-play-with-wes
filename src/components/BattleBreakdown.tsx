'use client';

import { useEffect, useRef, useState } from 'react';
import { Animal } from '@/data/animals';
import { speak, stopSpeaking } from '@/lib/speech';

export interface BattleScienceFact {
  emoji: string;
  label: string;
  explanation: string;
  expanded: string;
}

export interface BattleBreakdownData {
  deciding_factor: string;
  battle_science: BattleScienceFact[];
  did_you_know: string;
  could_loser_win: string;
  modifier_note: string | null;
  terrain_note: string | null;
  tts_summary: string;
  tts_summary_short: string;
}

interface Props {
  open: boolean;
  winner: Animal;
  loser: Animal;
  winnerLevel: number;
  context?: 'battle' | 'tournament';
  data: BattleBreakdownData | null;
  loading?: boolean;
  onReact: (reaction: 'wow' | 'cool') => void;
}

export default function BattleBreakdown({
  open, winner, loser, winnerLevel, context = 'battle', data, loading, onReact,
}: Props) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [showMore, setShowMore] = useState(false);
  const ttsStarted = useRef(false);

  useEffect(() => {
    if (!open || !data) return;
    if (ttsStarted.current) return;
    ttsStarted.current = true;
    const text = context === 'tournament' ? data.tts_summary_short : data.tts_summary;
    const t = setTimeout(() => speak(text, { rate: 0.82, pitch: 1.05 }), 1000);
    return () => clearTimeout(t);
  }, [open, data, context]);

  useEffect(() => {
    if (!open) {
      ttsStarted.current = false;
      setExpanded({});
      setShowMore(false);
    }
    return () => {
      // Stop any ongoing TTS when component unmounts or closes.
      if (!open) stopSpeaking();
    };
  }, [open]);

  if (!open) return null;

  const toggleExpand = (idx: number, fact: BattleScienceFact) => {
    setExpanded(prev => {
      const next = { ...prev, [idx]: !prev[idx] };
      if (next[idx]) speak(fact.expanded, { rate: 0.82, pitch: 1.05 });
      return next;
    });
  };

  const replayTts = () => {
    if (!data) return;
    stopSpeaking();
    const text = context === 'tournament' ? data.tts_summary_short : data.tts_summary;
    setTimeout(() => speak(text, { rate: 0.82, pitch: 1.05 }), 100);
  };

  const handleTellMore = () => {
    setShowMore(true);
    speak(winner.funFact, { rate: 0.82, pitch: 1.05 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 animate-fade-in" role="dialog" aria-modal="true">
      <div
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl shadow-2xl animate-slide-up"
        style={{ background: 'linear-gradient(180deg, #0b1733 0%, #0a0f24 100%)' }}
      >
        {/* SECTION 1 — Winner header */}
        <div className="text-center px-6 pt-8 pb-6 border-b border-yellow-500/20">
          <p className="text-7xl mb-3 drop-shadow-[0_0_24px_rgba(250,204,21,0.55)]">{winner.emoji}</p>
          <h2 className="font-retro text-base text-yellow-400 leading-snug">{winner.name.toUpperCase()} WINS THIS BATTLE!</h2>
          <p className="mt-3 inline-block text-[10px] font-bold px-3 py-1 rounded-full bg-yellow-400 text-navy">
            Lv.{winnerLevel}{winnerLevel >= 5 ? ' ⭐' : ''}
          </p>
        </div>

        {/* Loading state */}
        {loading && !data && (
          <div className="px-6 py-12 text-center">
            <div className="text-4xl animate-pulse mb-3">📖</div>
            <p className="text-yellow-300 text-sm">Reading the Battle Breakdown...</p>
          </div>
        )}

        {data && (
          <div className="px-5 pt-5 pb-6 text-white space-y-5">
            {/* SECTION 2 — Deciding Factor */}
            <div>
              <p className="text-[11px] font-retro text-yellow-400 mb-2 tracking-wider">THE DECIDING FACTOR</p>
              <p className="text-base leading-snug">{data.deciding_factor}</p>
            </div>

            {/* SECTION 3 — Battle Science */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-retro text-yellow-400 tracking-wider">BATTLE SCIENCE</p>
                <button
                  onClick={replayTts}
                  className="text-yellow-300 hover:text-yellow-200 text-base"
                  aria-label="Replay narration"
                >
                  🔊
                </button>
              </div>
              <div className="space-y-2">
                {data.battle_science.map((fact, i) => {
                  const isOpen = expanded[i];
                  return (
                    <button
                      key={i}
                      onClick={() => toggleExpand(i, fact)}
                      className="w-full text-left bg-navy/60 hover:bg-navy/80 active:scale-[0.99] transition rounded-xl p-3 border border-yellow-500/20"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-2xl flex-shrink-0">{fact.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-yellow-300 text-sm">{fact.label}</p>
                          <p className="text-sm text-gray-200 mt-0.5">{fact.explanation}</p>
                          {isOpen && (
                            <p className="text-xs text-gray-300 mt-2 italic border-l-2 border-yellow-400/50 pl-2">
                              {fact.expanded}
                            </p>
                          )}
                          {!isOpen && <p className="text-[10px] text-gray-500 mt-1">tap for more 👆</p>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION 4 — Did You Know */}
            <div className="bg-yellow-400/10 border border-yellow-500/40 rounded-xl p-4">
              <p className="text-[11px] font-retro text-yellow-400 mb-1 tracking-wider">DID YOU KNOW?</p>
              <p className="text-sm">{data.did_you_know}</p>
              {!showMore ? (
                <button
                  onClick={handleTellMore}
                  className="mt-3 inline-block bg-yellow-400 text-navy font-bold text-xs px-3 py-1.5 rounded-lg active:scale-95"
                >
                  Tell me more! 🔍
                </button>
              ) : (
                <p className="text-xs text-gray-200 italic mt-3 border-l-2 border-yellow-400/50 pl-2">
                  {winner.funFact}
                </p>
              )}
            </div>

            {/* SECTION 5 — Could the Loser Win */}
            <div>
              <p className="text-[11px] font-retro text-yellow-400 mb-2 tracking-wider">COULD {loser.name.toUpperCase()} EVER WIN?</p>
              <p className="text-sm text-gray-200 leading-snug">{data.could_loser_win}</p>
            </div>

            {/* SECTION 6 — Modifier note */}
            {data.modifier_note && (
              <div className="bg-purple-900/30 border border-purple-400/30 rounded-xl p-3">
                <p className="text-xs text-purple-200">{data.modifier_note}</p>
              </div>
            )}
            {data.terrain_note && (
              <div className="bg-blue-900/30 border border-blue-400/30 rounded-xl p-3">
                <p className="text-xs text-blue-200">🌊 {data.terrain_note}</p>
              </div>
            )}

            {/* SECTION 7 — Reactions */}
            <div className="pt-2">
              <p className="text-center text-[11px] font-retro text-yellow-400 mb-3 tracking-wider">WHAT DID YOU THINK?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onReact('wow')}
                  className="bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold py-4 rounded-xl text-lg transition"
                >
                  WOW! 🤯
                </button>
                <button
                  onClick={() => onReact('cool')}
                  className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-4 rounded-xl text-lg transition"
                >
                  Cool! 😎
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
