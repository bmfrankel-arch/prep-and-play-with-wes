'use client';

import { useState } from 'react';
import { speak, stopSpeaking } from '@/lib/speech';

interface SpeakButtonProps {
  text: string;
  className?: string;
  rate?: number;
  pitch?: number;
}

export default function SpeakButton({ text, className, rate, pitch }: SpeakButtonProps) {
  const [speaking, setSpeaking] = useState(false);

  const handleClick = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speak(text, {
      rate,
      pitch,
      onEnd: () => setSpeaking(false),
    });
  };

  return (
    <button
      onClick={handleClick}
      className={`min-w-[52px] min-h-[52px] text-3xl transition-transform active:scale-125 focus:outline-none ${
        speaking ? 'animate-pulse' : ''
      } ${className || ''}`}
      aria-label="Read aloud"
    >
      🔊
    </button>
  );
}
