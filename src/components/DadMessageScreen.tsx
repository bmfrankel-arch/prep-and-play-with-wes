'use client';

import { useEffect } from 'react';
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
  useEffect(() => {
    if (!open) return;
    if (autoTts) {
      const t = window.setTimeout(() => speak(text, { rate: 0.78, pitch: 1.0 }), 600);
      return () => { clearTimeout(t); stopSpeaking(); };
    }
    return () => stopSpeaking();
  }, [open, text, autoTts]);

  if (!open) return null;

  const handleDismiss = () => {
    stopSpeaking();
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto" role="dialog" aria-modal="true">
      <div
        className="min-h-full flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(180deg, #fef9c3 0%, #fde68a 60%, #fcd34d 100%)' }}
      >
        <div className="w-full max-w-xl text-center">
          <div className="text-6xl mb-3">📬</div>
          <h2 className="font-handwriting text-amber-900 mb-6" style={{ fontWeight: 700, fontSize: '2.75rem' }}>
            {title}
          </h2>
          <div
            className="bg-white/70 border-2 border-amber-300 rounded-2xl px-6 py-8 shadow-lg mb-8"
            style={{ background: 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)' }}
          >
            <p
              className="font-handwriting text-amber-900 whitespace-pre-line text-2xl md:text-3xl leading-snug"
              style={{ fontWeight: 500 }}
            >
              {text}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="bg-amber-900 hover:bg-amber-800 text-amber-50 font-bold px-10 py-4 rounded-2xl text-lg shadow-xl active:scale-95"
          >
            {dismissLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
