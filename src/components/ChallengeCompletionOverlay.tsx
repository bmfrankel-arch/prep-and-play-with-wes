'use client';

import { useEffect } from 'react';
import Confetti from './Confetti';
import { speak, stopSpeaking } from '@/lib/speech';

interface Props {
  open: boolean;
  description: string;
  onDismiss: () => void;
}

export default function ChallengeCompletionOverlay({ open, description, onDismiss }: Props) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => speak("YOU DID IT, WES! Dad's challenge is complete! He is going to be so proud of you!", { rate: 0.85, pitch: 1.15 }), 600);
    const auto = setTimeout(onDismiss, 11000);
    return () => { clearTimeout(t); clearTimeout(auto); stopSpeaking(); };
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true">
      <Confetti duration={10000} />
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        style={{ background: 'radial-gradient(circle at 50% 30%, #fef9c3 0%, #fbbf24 60%, #b45309 100%)' }}
      >
        <p className="text-7xl mb-4 animate-bounce">🏆</p>
        <h1 className="font-retro text-2xl text-amber-100 leading-snug mb-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
          CHALLENGE COMPLETE, WES!
        </h1>
        <p className="font-handwriting text-amber-50 text-3xl mb-6" style={{ fontWeight: 700 }}>
          {description}
        </p>
        <p className="text-amber-100 text-sm italic mb-8">Dad is going to be so proud of you.</p>
        <button
          onClick={onDismiss}
          className="bg-amber-900 hover:bg-amber-800 text-amber-50 font-bold px-8 py-3 rounded-2xl text-lg active:scale-95"
        >
          Thanks Dad! 🤗
        </button>
      </div>
    </div>
  );
}
