'use client';

import { useEffect, useState } from 'react';
import { speak, stopSpeaking } from '@/lib/speech';

interface Props {
  open: boolean;
  text: string;
  title?: string;
  /** Label shown on dismiss button */
  dismissLabel?: string;
  /** Read aloud automatically on open */
  autoTts?: boolean;
  onDismiss: () => void;
}

export default function DadMessageScreen({
  open, text, title = 'A Message from Dad', dismissLabel = "Let's Play! ▶", autoTts = true, onDismiss,
}: Props) {
  const [ttsActive, setTtsActive] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (autoTts) {
      const t = window.setTimeout(() => {
        setTtsActive(true);
        speak(text, {
          rate: 0.78,
          pitch: 1.0,
          onEnd: () => setTtsActive(false),
        });
      }, 600);
      return () => { clearTimeout(t); stopSpeaking(); setTtsActive(false); };
    }
    return () => stopSpeaking();
  }, [open, text, autoTts]);

  if (!open) return null;

  const handleDismiss = () => {
    stopSpeaking();
    onDismiss();
  };

  const handleSkipTts = () => {
    stopSpeaking();
    setTtsActive(false);
  };

  const handleReplayTts = () => {
    stopSpeaking();
    setTtsActive(true);
    speak(text, { rate: 0.78, pitch: 1.0, onEnd: () => setTtsActive(false) });
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col"
      role="dialog"
      aria-modal="true"
      style={{ background: 'linear-gradient(180deg, #fef9c3 0%, #fde68a 60%, #fcd34d 100%)' }}
    >
      {/* Floating Close button — pinned to top-right, clears iOS status bar */}
      <button
        onClick={handleDismiss}
        aria-label="Close"
        className="absolute z-10 w-14 h-14 rounded-full bg-amber-900 text-amber-50 text-3xl font-extrabold flex items-center justify-center shadow-2xl active:scale-90 ring-4 ring-amber-50"
        style={{
          top: 'max(env(safe-area-inset-top, 0px), 1rem)',
          right: 'max(env(safe-area-inset-right, 0px), 1rem)',
        }}
      >
        ✕
      </button>

      {/* Top bar — title only (X is now absolute) */}
      <div
        className="flex items-center px-4 pb-2 flex-shrink-0"
        style={{ paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 1rem) + 4.5rem)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-3xl">📬</span>
          <h2 className="font-handwriting text-amber-900" style={{ fontWeight: 700, fontSize: '1.75rem' }}>
            {title}
          </h2>
        </div>
      </div>

      {/* Message body — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="max-w-xl mx-auto">
          <div
            className="bg-white/70 border-2 border-amber-300 rounded-2xl px-6 py-6 shadow-lg"
            style={{ background: 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)' }}
          >
            <p
              className="font-handwriting text-amber-900 whitespace-pre-line text-2xl md:text-3xl leading-snug"
              style={{ fontWeight: 500 }}
            >
              {text}
            </p>
          </div>
        </div>
      </div>

      {/* Pinned action bar — always visible, safe-area aware */}
      <div
        className="flex-shrink-0 px-4 pt-2 flex items-center justify-center gap-3 border-t-2 border-amber-300/40 bg-amber-100/40 backdrop-blur-sm"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1rem)' }}
      >
        {ttsActive ? (
          <button
            onClick={handleSkipTts}
            className="bg-amber-200 text-amber-900 font-bold px-4 py-3 rounded-2xl text-sm active:scale-95"
            aria-label="Skip reading"
          >
            Skip 🔇
          </button>
        ) : (
          <button
            onClick={handleReplayTts}
            className="bg-amber-200 text-amber-900 font-bold px-4 py-3 rounded-2xl text-sm active:scale-95"
            aria-label="Read again"
          >
            Read 🔊
          </button>
        )}
        <button
          onClick={handleDismiss}
          className="bg-amber-900 hover:bg-amber-800 text-amber-50 font-bold px-8 py-4 rounded-2xl text-lg shadow-xl active:scale-95 flex-1 max-w-xs"
        >
          {dismissLabel}
        </button>
      </div>
    </div>
  );
}
