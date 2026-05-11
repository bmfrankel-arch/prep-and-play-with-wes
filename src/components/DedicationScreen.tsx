'use client';

import { useEffect, useState } from 'react';
import { speak, stopSpeaking } from '@/lib/speech';

interface Props {
  onDismiss: () => void;
}

const DEDICATION_FULL = `Every game. Every animal. Every quiz.\nMade with love, for the most curious, brave, and brilliant boy I know.\n\nI can't wait to watch you grow.\n\nLove always,\nDad 🦁`;

const TTS_LINE = "For Wes. Dad built this just for you. Every game. Every animal. Every quiz. Made with love, for the most curious, brave, and brilliant boy I know. I can't wait to watch you grow. Love always, Dad.";

export default function DedicationScreen({ onDismiss }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setStep(1), 600));   // "For Wes."
    timers.push(window.setTimeout(() => setStep(2), 3000));  // + "Dad built this just for you."
    timers.push(window.setTimeout(() => setStep(3), 6000));  // + full dedication
    timers.push(window.setTimeout(() => {
      speak(TTS_LINE, { rate: 0.75, pitch: 1.0 });
    }, 6500));
    timers.push(window.setTimeout(() => setStep(4), 26000)); // show button after TTS settles
    return () => {
      timers.forEach(t => clearTimeout(t));
      stopSpeaking();
    };
  }, []);

  const handleDismiss = () => {
    stopSpeaking();
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 30%, #fef9c3 0%, #fde68a 35%, #f59e0b 90%)',
        }}
      />
      {/* Animated star field */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 22 }).map((_, i) => (
          <span
            key={i}
            className="absolute text-yellow-200/80"
            style={{
              left: `${(i * 47) % 100}%`,
              top: `-2rem`,
              fontSize: `${0.8 + ((i * 7) % 4) * 0.3}rem`,
              animation: `dedicationFall ${10 + (i % 5) * 2}s linear ${(i % 7)}s infinite`,
              opacity: 0.7,
            }}
          >
            ✦
          </span>
        ))}
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-xl">
          <p className="text-6xl mb-6 animate-bounce-slow">🦁</p>

          {step >= 1 && (
            <p
              className="font-handwriting text-amber-900 text-6xl mb-6 animate-fade-in"
              style={{ fontWeight: 700 }}
            >
              For Wes.
            </p>
          )}

          {step >= 2 && (
            <p
              className="font-handwriting text-amber-800 text-4xl mb-8 animate-fade-in"
              style={{ fontWeight: 500 }}
            >
              Dad built this just for you.
            </p>
          )}

          {step >= 3 && (
            <p
              className="font-handwriting text-amber-900 text-2xl md:text-3xl whitespace-pre-line leading-snug animate-fade-in mb-10"
              style={{ fontWeight: 500 }}
            >
              {DEDICATION_FULL}
            </p>
          )}

          {step >= 4 && (
            <button
              onClick={handleDismiss}
              className="bg-amber-900 hover:bg-amber-800 text-amber-50 font-bold px-10 py-4 rounded-2xl text-xl shadow-xl active:scale-95 animate-fade-in"
            >
              Let&apos;s Play! ▶
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes dedicationFall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 0;
          }
          10% { opacity: 0.7; }
          90% { opacity: 0.7; }
          100% {
            transform: translateY(110vh) rotate(360deg);
            opacity: 0;
          }
        }
        @keyframes bounceSlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        .animate-bounce-slow {
          animation: bounceSlow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export const DEDICATION_TEXT = DEDICATION_FULL;
