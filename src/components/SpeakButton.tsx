'use client';

import { speak } from '@/lib/speech';

interface SpeakButtonProps {
  text: string;
  className?: string;
}

export default function SpeakButton({ text, className }: SpeakButtonProps) {
  return (
    <button
      onClick={() => speak(text)}
      className={`text-3xl active:scale-90 transition-transform ${className || ''}`}
      aria-label="Read aloud"
    >
      🔊
    </button>
  );
}
