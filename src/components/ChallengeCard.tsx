'use client';

import { useEffect, useRef } from 'react';
import { DadChallenge } from '@/lib/types';
import { ChallengeProgress } from '@/lib/challenge';
import { speak } from '@/lib/speech';

interface Props {
  challenge: DadChallenge;
  progress: ChallengeProgress;
}

export default function ChallengeCard({ challenge, progress }: Props) {
  const spoken = useRef(false);

  useEffect(() => {
    if (spoken.current) return;
    if (typeof window === 'undefined') return;
    const today = new Date().toDateString();
    const last = localStorage.getItem('ppw_challenge_tts_date');
    if (last === today) return;
    localStorage.setItem('ppw_challenge_tts_date', today);
    spoken.current = true;
    const t = setTimeout(() => speak(`Dad has set you a challenge! ${challenge.challenge_description} You can do it, Wes!`, { rate: 0.85, pitch: 1.05 }), 2500);
    return () => clearTimeout(t);
  }, [challenge.challenge_description]);

  if (progress.isComplete && !challenge.is_completed) {
    // Visual is owned by ChallengeCompletionOverlay — leave card hidden until next reset.
  }

  return (
    <div className="rounded-2xl border-2 border-yellow-400 p-4 mb-4 shadow-lg" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="font-bold text-amber-900 text-sm">🏆 Challenge from Dad!</p>
        {progress.isComplete && <span className="text-xs font-bold text-green-700">Complete ✓</span>}
      </div>
      <p className="text-amber-900 text-lg font-bold mb-3 leading-tight">{challenge.challenge_description}</p>
      <div className="h-3 bg-amber-200 rounded-full overflow-hidden mb-1">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all"
          style={{ width: `${progress.pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-amber-800 font-bold">
        <span>{progress.label}</span>
        <span>{progress.pct}%</span>
      </div>
      {!progress.isComplete && (
        <p className="text-xs text-amber-700 italic text-center mt-2">You can do it, Wes!</p>
      )}
    </div>
  );
}
